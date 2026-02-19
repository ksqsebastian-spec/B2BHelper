import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Konfigurierte API-Provider abrufen
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('api_configurations')
    .select('id, provider, is_default, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at');

  if (error) {
    return NextResponse.json({ error: 'Provider konnten nicht geladen werden' }, { status: 500 });
  }

  // API-Keys maskieren – nur letzte 4 Zeichen zeigen
  return NextResponse.json(data ?? []);
}

// API-Key hinzufügen oder aktualisieren
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { provider, apiKey, isDefault } = await request.json() as {
    provider: string;
    apiKey: string;
    isDefault?: boolean;
  };

  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'Provider und API-Key sind erforderlich' }, { status: 400 });
  }

  // Erlaubte Provider prüfen
  const validProviders = ['anthropic', 'openai', 'qwen', 'custom'];
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: 'Ungültiger Provider' }, { status: 400 });
  }

  try {
    // API-Key verschlüsseln
    const { encrypt } = await import('@/lib/crypto/encryption');
    const encryptedKey = encrypt(apiKey);

    // Prüfen ob bereits ein Key für diesen Provider existiert
    const { data: existing } = await supabase
      .from('api_configurations')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();

    if (existing) {
      // Aktualisieren
      const { data, error } = await supabase
        .from('api_configurations')
        .update({
          api_key_encrypted: encryptedKey,
          is_default: isDefault ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id, provider, is_default, created_at, updated_at')
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Neu erstellen
      const { data, error } = await supabase
        .from('api_configurations')
        .insert({
          user_id: user.id,
          provider,
          api_key_encrypted: encryptedKey,
          is_default: isDefault ?? false,
        })
        .select('id, provider, is_default, created_at, updated_at')
        .single();

      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }
  } catch (err) {
    console.error('Fehler beim Speichern des API-Keys:', err);
    return NextResponse.json(
      { error: 'API-Key konnte nicht gespeichert werden' },
      { status: 500 }
    );
  }
}
