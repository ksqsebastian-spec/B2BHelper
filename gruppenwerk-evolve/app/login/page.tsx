'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// Innere Komponente die useSearchParams verwendet
function LoginForm(): React.ReactNode {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const authError = searchParams.get('error');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError('Anmeldung fehlgeschlagen. Bitte prüfe deine E-Mail-Adresse.');
        return;
      }

      setIsSent(true);
    } catch {
      setError('Ein unbekannter Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Fehlermeldung bei Auth-Callback-Fehler */}
      {authError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>Authentifizierung fehlgeschlagen. Bitte versuche es erneut.</p>
        </div>
      )}

      {/* Login-Formular */}
      <div className="rounded-lg border bg-card p-8 shadow-sm">
        {isSent ? (
          <div className="space-y-4 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="text-xl font-semibold">E-Mail gesendet</h2>
            <p className="text-muted-foreground">
              Wir haben dir einen Magic Link an{' '}
              <span className="font-medium text-foreground">{email}</span>{' '}
              gesendet. Klicke auf den Link, um dich anzumelden.
            </p>
            <button
              type="button"
              onClick={() => setIsSent(false)}
              className="text-sm text-primary hover:underline"
            >
              Andere E-Mail verwenden
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird gesendet...
                </span>
              ) : (
                'Magic Link senden'
              )}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

// Login-Seite mit Magic Link (Suspense-Boundary für useSearchParams)
export default function LoginPage(): React.ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & Titel */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            GruppenwerkEvolve
          </h1>
          <p className="mt-2 text-muted-foreground">
            Outbound-E-Mail-Workflow – automatisiert
          </p>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-muted-foreground">
          Nur autorisierte E-Mail-Adressen können sich anmelden.
        </p>
      </div>
    </div>
  );
}
