'use client';

import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Leads', href: '/leads' },
  { label: 'Generierung', href: '/generate' },
  { label: 'Review', href: '/review' },
  { label: 'Guardrails', href: '/guardrails' },
];

// Hauptnavigation der App
export function Header(): React.ReactNode {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-lg font-bold text-foreground"
          >
            GruppenwerkEvolve
          </button>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex md:items-center md:gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Rechte Seite */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className={cn(
              'rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              pathname.startsWith('/settings') && 'bg-primary/10 text-primary'
            )}
            title="Einstellungen"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Abmelden"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
