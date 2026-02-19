import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Feste E-Mail-Adresse fuer den internen Benutzer
const AUTH_EMAIL = 'admin@gruppenwerk.local';

// Login-Endpoint: Passwort validieren und Supabase-Session erstellen
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

    // Supabase-Benutzer automatisch erstellen oder aktualisieren
    const serviceClient = await createServiceClient();
    const { data: userList, error: listError } =
      await serviceClient.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        { error: `Supabase Admin-Fehler: ${listError.message}` },
        { status: 500 }
      );
    }

    const existingUser = userList?.users?.find(
      (u) => u.email === AUTH_EMAIL
    );

    if (!existingUser) {
      const { error: createError } =
        await serviceClient.auth.admin.createUser({
          email: AUTH_EMAIL,
          password: loginPassword,
          email_confirm: true,
        });

      if (createError) {
        return NextResponse.json(
          { error: `Benutzer erstellen fehlgeschlagen: ${createError.message}` },
          { status: 500 }
        );
      }
    } else {
      // Passwort synchron halten + sicherstellen dass E-Mail bestaetigt ist
      await serviceClient.auth.admin.updateUserById(existingUser.id, {
        password: loginPassword,
        email_confirm: true,
      });
    }

    // Supabase-Session erstellen (setzt Auth-Cookies)
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password: loginPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: `Supabase-Login: ${signInError.message}` },
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
