import { createBrowserClient } from '@supabase/ssr';

// Erstellt den Supabase-Client für Browser-Komponenten
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton-Instanz für Client-Komponenten
export const supabase = createClient();
