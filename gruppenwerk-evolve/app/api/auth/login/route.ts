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

    // Supabase-Benutzer automatisch erstellen falls noetig
    const serviceClient = await createServiceClient();
    const { data: userList } = await serviceClient.auth.admin.listUsers();
    const userExists = userList?.users?.some(
      (u) => u.email === AUTH_EMAIL
    );

    if (!userExists) {
      // Erstmalige Anmeldung: Benutzer anlegen
      const { error: createError } =
        await serviceClient.auth.admin.createUser({
          email: AUTH_EMAIL,
          password: loginPassword,
          email_confirm: true,
        });

      if (createError) {
        console.error('Benutzer konnte nicht erstellt werden:', createError);
        return NextResponse.json(
          { error: 'Anmeldung fehlgeschlagen.' },
          { status: 500 }
        );
      }
    } else {
      // Passwort aktualisieren falls LOGIN_PASSWORD geaendert wurde
      const existingUser = userList?.users?.find(
        (u) => u.email === AUTH_EMAIL
      );
      if (existingUser) {
        await serviceClient.auth.admin.updateUserById(existingUser.id, {
          password: loginPassword,
        });
      }
    }

    // Supabase-Session erstellen (setzt Auth-Cookies)
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password: loginPassword,
    });

    if (signInError) {
      console.error('Supabase-Login fehlgeschlagen:', signInError);
      return NextResponse.json(
        { error: 'Anmeldung fehlgeschlagen.' },
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
