import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Einzelne E-Mail neu generieren
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { emailId } = await request.json() as { emailId: string };

  if (!emailId) {
    return NextResponse.json({ error: 'Keine E-Mail-ID angegeben' }, { status: 400 });
  }

  // Bestehende E-Mail mit Lead-Daten laden
  const { data: existingEmail, error: emailError } = await supabase
    .from('generated_emails')
    .select('*, leads(*)')
    .eq('id', emailId)
    .eq('user_id', user.id)
    .single();

  if (emailError || !existingEmail) {
    return NextResponse.json({ error: 'E-Mail nicht gefunden' }, { status: 404 });
  }

  const lead = existingEmail.leads;

  // API-Key laden
  const { data: apiConfig } = await supabase
    .from('api_configurations')
    .select('api_key_encrypted')
    .eq('user_id', user.id)
    .eq('provider', existingEmail.provider)
    .maybeSingle();

  if (!apiConfig?.api_key_encrypted) {
    return NextResponse.json(
      { error: 'Kein API-Key für diesen Provider konfiguriert' },
      { status: 400 }
    );
  }

  // Guardrails laden
  const { data: guardrails } = await supabase
    .from('guardrail_versions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!guardrails) {
    return NextResponse.json(
      { error: 'Keine aktiven Guardrails gefunden' },
      { status: 400 }
    );
  }

  try {
    const { decrypt } = await import('@/lib/crypto/encryption');
    const apiKey = decrypt(apiConfig.api_key_encrypted);

    // Prompt bauen
    const prompt = `${guardrails.content}

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

    // LLM aufrufen
    let content: string;
    let tokensUsed: number;

    if (existingEmail.provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: existingEmail.model,
          max_tokens: 500,
          temperature: existingEmail.temperature,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('API-Fehler');
      const data = await response.json();
      content = data.content?.[0]?.text ?? '';
      tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
    } else {
      let baseUrl = 'https://api.openai.com/v1';
      if (existingEmail.provider === 'qwen') {
        baseUrl = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: existingEmail.model,
          temperature: existingEmail.temperature,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error('API-Fehler');
      const data = await response.json();
      content = data.choices?.[0]?.message?.content ?? '';
      tokensUsed = data.usage?.total_tokens ?? 0;
    }

    // Antwort parsen
    const lines = content.trim().split('\n');
    let subject = '';
    let bodyStart = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('BETREFF:')) {
        subject = lines[i].trim().replace('BETREFF:', '').trim();
        bodyStart = lines[i + 1]?.trim() === '---' ? i + 2 : i + 1;
        break;
      }
    }

    const emailBody = lines.slice(bodyStart).join('\n').trim();
    if (!subject) {
      return NextResponse.json(
        { error: 'E-Mail konnte nicht generiert werden (Format-Fehler)' },
        { status: 500 }
      );
    }

    // E-Mail aktualisieren
    const { data: updated, error: updateError } = await supabase
      .from('generated_emails')
      .update({
        subject,
        body: emailBody,
        tokens_used: tokensUsed,
        guardrail_version_id: guardrails.id,
        status: 'generated',
        reviewed_at: null,
        exported_at: null,
      })
      .eq('id', emailId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Fehler bei Neu-Generierung:', err);
    return NextResponse.json(
      { error: 'E-Mail konnte nicht neu generiert werden' },
      { status: 500 }
    );
  }
}
