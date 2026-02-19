import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Feste interne E-Mail-Adresse (nie sichtbar im Frontend)
const AUTH_EMAIL = 'admin@gruppenwerk.local';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { password } = await request.json();
    const loginPassword = process.env.LOGIN_PASSWORD;

    if (!loginPassword) {
      return NextResponse.json(
        { error: 'LOGIN_PASSWORD ist nicht konfiguriert.' },
        { status: 500 }
      );
    }

    if (!password || password !== loginPassword) {
      return NextResponse.json(
        { error: 'Falsches Passwort.' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // 1. Zuerst versuchen sich anzumelden (User existiert evtl. schon)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password: loginPassword,
    });

    if (!signInError) {
      return NextResponse.json({ success: true });
    }

    // 2. User existiert nicht → ueber GoTrue REST API anlegen
    //    (gibt detailliertere Fehler als der JS-Client)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: AUTH_EMAIL,
        password: loginPassword,
        email_confirm: true,
      }),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error('GoTrue createUser Fehler:', createRes.status, errorBody);

      // Trotzdem signIn versuchen – evtl. wurde der User doch angelegt
      const { error: retryError } = await supabase.auth.signInWithPassword({
        email: AUTH_EMAIL,
        password: loginPassword,
      });

      if (retryError) {
        return NextResponse.json(
          {
            error: `Benutzer konnte nicht erstellt werden. Bitte SQL-Migration in Supabase ausfuehren. Details: ${errorBody}`,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 3. User wurde erstellt → jetzt anmelden
    const { error: finalSignInError } =
      await supabase.auth.signInWithPassword({
        email: AUTH_EMAIL,
        password: loginPassword,
      });

    if (finalSignInError) {
      return NextResponse.json(
        { error: `Supabase-Login nach Erstellung: ${finalSignInError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Login-Fehler:', message);
    return NextResponse.json(
      { error: `Server-Fehler: ${message}` },
      { status: 500 }
    );
  }
}
