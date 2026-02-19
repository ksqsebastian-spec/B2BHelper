'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Schützt authentifizierte Bereiche der App
export function AuthGuard({ children }: AuthGuardProps): React.ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async (): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setIsLoading(false);
    };

    checkUser();

    // Auth-Änderungen überwachen
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.push('/login');
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <></>;
  }

  return <>{children}</>;
}
