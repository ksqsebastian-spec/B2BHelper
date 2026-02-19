/**
 * Anthropic/Claude LLM-Anbieter-Implementierung.
 * Verwendet die Anthropic Messages API ueber fetch.
 */

import type { GenerateOptions, LLMResponse } from '@/types';
import type { LLMProviderInterface } from './provider';

/** Anthropic API-Basis-URL */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/** Aktuelle API-Version */
const ANTHROPIC_API_VERSION = '2023-06-01';

/** Antwort-Struktur der Anthropic Messages API */
interface AnthropicResponse {
  id: string;
  type: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/** Fehler-Struktur der Anthropic API */
interface AnthropicError {
  type: string;
  error: {
    type: string;
    message: string;
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
    // Fallback: Erste Zeile als Betreff, Rest als Text
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

/** Anthropic/Claude Anbieter-Implementierung */
export class AnthropicProvider implements LLMProviderInterface {
  readonly name = 'Anthropic (Claude)';

  async generate(prompt: string, options: GenerateOptions): Promise<LLMResponse> {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
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
      const errorData = (await response.json()) as AnthropicError;
      const errorType = errorData.error?.type ?? 'unknown';
      const errorMessage = errorData.error?.message ?? 'Unbekannter Fehler';

      if (response.status === 401) {
        throw new Error('API_KEY_INVALID');
      }
      if (response.status === 429) {
        throw new Error('API_RATE_LIMIT');
      }

      throw new Error(`Anthropic API-Fehler (${errorType}): ${errorMessage}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const textContent = data.content.find((block) => block.type === 'text');

    if (!textContent) {
      throw new Error('Keine Textantwort von der Anthropic API erhalten.');
    }

    const { subject, body } = parseEmailResponse(textContent.text);

    return {
      subject,
      body,
      tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
    };
  }

  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
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
