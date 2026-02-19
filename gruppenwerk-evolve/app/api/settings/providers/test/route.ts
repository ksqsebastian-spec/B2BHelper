import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// API-Verbindung testen
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { provider, apiKey } = await request.json() as {
    provider: string;
    apiKey: string;
  };

  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'Provider und API-Key sind erforderlich' }, { status: 400 });
  }

  try {
    if (provider === 'anthropic') {
      // Anthropic API testen
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { success: false, error: `API-Fehler: ${response.status}`, details: errorText },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, message: 'Verbindung erfolgreich' });
    }

    // OpenAI-kompatible APIs (OpenAI, Qwen, Custom)
    let baseUrl = 'https://api.openai.com/v1';
    let testModel = 'gpt-4o-mini';

    if (provider === 'qwen') {
      baseUrl = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
      testModel = 'qwen-turbo';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: testModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `API-Fehler: ${response.status}`, details: errorText },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Verbindung erfolgreich' });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Verbindungstest fehlgeschlagen',
      },
      { status: 500 }
    );
  }
}
