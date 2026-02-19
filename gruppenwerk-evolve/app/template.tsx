'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/layout/auth-guard';
import { Header } from '@/components/layout/header';

// Oeffentliche Routen, die keinen Auth-Schutz benoetigen
const PUBLIC_ROUTES = ['/login', '/auth'] as const;

/**
 * App-Template: Umschliesst authentifizierte Routen mit AuthGuard und Header.
 * Oeffentliche Routen (Login, Auth-Callback) werden direkt gerendert.
 */
export default function AppTemplate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  const pathname = usePathname();

  // Pruefen, ob die aktuelle Route oeffentlich ist
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Oeffentliche Routen ohne Auth-Schutz rendern
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Geschuetzte Routen mit AuthGuard und Header umschliessen
  return (
    <AuthGuard>
      <Header />
      <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
    </AuthGuard>
  );
}
