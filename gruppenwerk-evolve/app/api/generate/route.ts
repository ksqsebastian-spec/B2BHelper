import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Lead, GuardrailVersion } from '@/types';

// Prompt für die E-Mail-Generierung zusammenbauen
function buildPrompt(lead: Lead, guardrails: string): string {
  return `${guardrails}

---

Generiere eine personalisierte Outbound-E-Mail für folgenden Lead:

Firma: ${lead.company_name}
Branche: ${lead.industry ?? 'Nicht angegeben'}
Ansprechpartner: ${lead.contact_name ?? 'Nicht angegeben'}
Stadt: ${lead.company_city ?? 'Nicht angegeben'}
Mitarbeiter: ${lead.employees ?? 'Nicht angegeben'}
Beschreibung: ${lead.description ?? 'Nicht angegeben'}
Keywords: ${lead.keywords ?? 'Nicht angegeben'}

Antworte NUR mit der E-Mail im folgenden Format:

BETREFF: [Betreffzeile]
---
[E-Mail-Text]`;
}

// E-Mail-Antwort vom LLM parsen
function parseEmailResponse(response: string): { subject: string; body: string } {
  const lines = response.trim().split('\n');
  let subject = '';
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('BETREFF:')) {
      subject = line.replace('BETREFF:', '').trim();
      // Nächste Zeile mit --- überspringen
      if (lines[i + 1]?.trim() === '---') {
        bodyStart = i + 2;
      } else {
        bodyStart = i + 1;
      }
      break;
    }
  }

  const body = lines.slice(bodyStart).join('\n').trim();

  // Fallback wenn Format nicht erkannt
  if (!subject) {
    return {
      subject: lines[0]?.trim() ?? 'Kein Betreff',
      body: lines.slice(1).join('\n').trim() || response.trim(),
    };
  }

  return { subject, body };
}

// LLM-API aufrufen (Provider-abhängig)
async function callLLM(
  prompt: string,
  provider: string,
  model: string,
  temperature: number,
  maxTokens: number,
  apiKey: string
): Promise<{ content: string; tokensUsed: number }> {
  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API Fehler: ${response.status} – ${errorBody}`);
    }

    const data = await response.json();
    return {
      content: data.content?.[0]?.text ?? '',
      tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    };
  }

  // OpenAI, Qwen, Custom – alle OpenAI-kompatibel
  let baseUrl = 'https://api.openai.com/v1';
  if (provider === 'qwen') {
    baseUrl = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${provider} API Fehler: ${response.status} – ${errorBody}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

// Batch-Generierung mit Server-Sent Events
export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient();

  // Authentifizierung prüfen
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Nicht authentifiziert', { status: 401 });
  }

  const body = await request.json();
  const { leadIds, provider, model, temperature, maxTokens } = body as {
    leadIds: string[];
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };

  if (!leadIds?.length) {
    return new Response('Keine Leads ausgewählt', { status: 400 });
  }

  // API-Key für den Provider laden
  const { data: apiConfig } = await supabase
    .from('api_configurations')
    .select('api_key_encrypted')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .maybeSingle();

  if (!apiConfig?.api_key_encrypted) {
    return new Response('Kein API-Key für diesen Provider konfiguriert', { status: 400 });
  }

  // API-Key entschlüsseln
  let apiKey: string;
  try {
    const { decrypt } = await import('@/lib/crypto/encryption');
    apiKey = decrypt(apiConfig.api_key_encrypted);
  } catch {
    return new Response('API-Key konnte nicht entschlüsselt werden', { status: 500 });
  }

  // Aktive Guardrails laden
  const { data: guardrails } = await supabase
    .from('guardrail_versions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!guardrails) {
    return new Response('Keine aktiven Guardrails gefunden', { status: 400 });
  }

  // Leads laden
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .in('id', leadIds);

  if (!leads?.length) {
    return new Response('Keine Leads gefunden', { status: 400 });
  }

  // SSE-Stream erstellen
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let successful = 0;
      let failed = 0;

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i] as Lead;

        // Fortschritt senden
        sendEvent({
          type: 'progress',
          current: i + 1,
          total: leads.length,
          leadName: lead.company_name,
        });

        try {
          const startTime = Date.now();
          const prompt = buildPrompt(lead, guardrails.content);
          const llmResponse = await callLLM(
            prompt,
            provider,
            model,
            temperature,
            maxTokens,
            apiKey
          );

          const { subject, body: emailBody } = parseEmailResponse(llmResponse.content);
          const generationTime = Date.now() - startTime;

          // E-Mail in DB speichern
          const { data: savedEmail, error: saveError } = await supabase
            .from('generated_emails')
            .insert({
              lead_id: lead.id,
              user_id: user.id,
              batch_id: lead.batch_id,
              subject,
              body: emailBody,
              provider,
              model,
              guardrail_version_id: guardrails.id,
              temperature,
              tokens_used: llmResponse.tokensUsed,
              generation_time_ms: generationTime,
              status: 'generated',
            })
            .select()
            .single();

          if (saveError) throw saveError;

          // Lead als generiert markieren
          await supabase
            .from('leads')
            .update({ email_generated: true })
            .eq('id', lead.id);

          successful++;
          sendEvent({
            type: 'success',
            leadId: lead.id,
            emailId: savedEmail.id,
          });
        } catch (err) {
          failed++;
          sendEvent({
            type: 'error',
            leadId: lead.id,
            error: err instanceof Error ? err.message : 'Unbekannter Fehler',
          });
        }
      }

      // Abschluss senden
      sendEvent({
        type: 'complete',
        total: leads.length,
        successful,
        failed,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
