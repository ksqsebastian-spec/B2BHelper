/**
 * Qwen LLM-Anbieter-Implementierung.
 * Verwendet eine OpenAI-kompatible API (DashScope).
 */

import type { GenerateOptions, LLMResponse } from '@/types';
import type { LLMProviderInterface } from './provider';

/** Qwen/DashScope API-Basis-URL (OpenAI-kompatibel) */
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

/** Antwort-Struktur (OpenAI-kompatibel) */
interface QwenResponse {
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

/** Fehler-Struktur (OpenAI-kompatibel) */
interface QwenError {
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

/** Qwen Anbieter-Implementierung */
export class QwenProvider implements LLMProviderInterface {
  readonly name = 'Qwen';

  async generate(prompt: string, options: GenerateOptions): Promise<LLMResponse> {
    const response = await fetch(QWEN_API_URL, {
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
      const errorData = (await response.json()) as QwenError;
      const errorMessage = errorData.error?.message ?? 'Unbekannter Fehler';

      if (response.status === 401) {
        throw new Error('API_KEY_INVALID');
      }
      if (response.status === 429) {
        throw new Error('API_RATE_LIMIT');
      }

      throw new Error(`Qwen API-Fehler: ${errorMessage}`);
    }

    const data = (await response.json()) as QwenResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Textantwort von der Qwen API erhalten.');
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
      const response = await fetch(QWEN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
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
