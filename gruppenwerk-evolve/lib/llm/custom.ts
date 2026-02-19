/**
 * Benutzerdefinierter LLM-Anbieter-Implementierung.
 * Verwendet einen generischen OpenAI-kompatiblen Endpunkt.
 */

import type { GenerateOptions, LLMResponse } from '@/types';
import type { LLMProviderInterface } from './provider';

/** Standard-Endpunkt fuer benutzerdefinierte Anbieter */
const DEFAULT_CUSTOM_ENDPOINT = 'http://localhost:11434/v1/chat/completions';

/** Antwort-Struktur (OpenAI-kompatibel) */
interface CustomProviderResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Fehler-Struktur (OpenAI-kompatibel) */
interface CustomProviderError {
  error?: {
    message: string;
    type?: string;
    code?: string | null;
  };
}

/**
 * Parst die LLM-Antwort und extrahiert Betreff und Text.
 * Erwartet das Format:
 * BETREFF: ...
 * ---
 * E-Mail-Text...
 */
function parseEmailResponse(text: string): { subject: string; body: string } {
  const separatorIndex = text.indexOf('---');

  if (separatorIndex === -1) {
    const lines = text.trim().split('\n');
    const firstLine = lines[0] ?? '';
    const subject = firstLine.replace(/^(BETREFF|SUBJECT|Betreff):\s*/i, '').trim();
    const body = lines.slice(1).join('\n').trim();
    return { subject: subject || 'Kein Betreff', body: body || text.trim() };
  }

  const subjectPart = text.substring(0, separatorIndex).trim();
  const bodyPart = text.substring(separatorIndex + 3).trim();

  const subject = subjectPart.replace(/^(BETREFF|SUBJECT|Betreff):\s*/i, '').trim();

  return {
    subject: subject || 'Kein Betreff',
    body: bodyPart || text.trim(),
  };
}

/**
 * Liest den benutzerdefinierten Endpunkt aus der Umgebungsvariable.
 * Faellt auf den Standard-Endpunkt zurueck.
 */
function getCustomEndpoint(): string {
  return process.env.CUSTOM_LLM_ENDPOINT ?? DEFAULT_CUSTOM_ENDPOINT;
}

/** Benutzerdefinierter Anbieter (OpenAI-kompatibler Endpunkt) */
export class CustomProvider implements LLMProviderInterface {
  readonly name = 'Benutzerdefiniert';

  async generate(prompt: string, options: GenerateOptions): Promise<LLMResponse> {
    const endpoint = getCustomEndpoint();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Unbekannter Fehler';

      try {
        const errorData = (await response.json()) as CustomProviderError;
        errorMessage = errorData.error?.message ?? errorMessage;
      } catch {
        // JSON-Parsing fehlgeschlagen, Standard-Fehlermeldung verwenden
      }

      if (response.status === 401) {
        throw new Error('API_KEY_INVALID');
      }
      if (response.status === 429) {
        throw new Error('API_RATE_LIMIT');
      }

      throw new Error(`Benutzerdefinierter Anbieter Fehler: ${errorMessage}`);
    }

    const data = (await response.json()) as CustomProviderResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Textantwort vom benutzerdefinierten Anbieter erhalten.');
    }

    const { subject, body } = parseEmailResponse(content);

    return {
      subject,
      body,
      tokensUsed: data.usage?.total_tokens,
    };
  }

  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const endpoint = getCustomEndpoint();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: 'test',
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'Antworte mit OK.',
            },
          ],
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
