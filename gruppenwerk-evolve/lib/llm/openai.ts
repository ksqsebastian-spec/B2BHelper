/**
 * OpenAI LLM-Anbieter-Implementierung.
 * Verwendet die OpenAI Chat Completions API ueber fetch.
 */

import type { GenerateOptions, LLMResponse } from '@/types';
import type { LLMProviderInterface } from './provider';

/** OpenAI API-Basis-URL */
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/** Antwort-Struktur der OpenAI Chat Completions API */
interface OpenAIResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Fehler-Struktur der OpenAI API */
interface OpenAIError {
  error: {
    message: string;
    type: string;
    code: string | null;
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

/** OpenAI Anbieter-Implementierung */
export class OpenAIProvider implements LLMProviderInterface {
  readonly name = 'OpenAI (GPT)';

  async generate(prompt: string, options: GenerateOptions): Promise<LLMResponse> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
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
      const errorData = (await response.json()) as OpenAIError;
      const errorMessage = errorData.error?.message ?? 'Unbekannter Fehler';

      if (response.status === 401) {
        throw new Error('API_KEY_INVALID');
      }
      if (response.status === 429) {
        throw new Error('API_RATE_LIMIT');
      }

      throw new Error(`OpenAI API-Fehler: ${errorMessage}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Textantwort von der OpenAI API erhalten.');
    }

    const { subject, body } = parseEmailResponse(content);

    return {
      subject,
      body,
      tokensUsed: data.usage.total_tokens,
    };
  }

  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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
