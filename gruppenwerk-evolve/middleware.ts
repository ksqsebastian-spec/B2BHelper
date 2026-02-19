import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js Middleware – prüft Auth-Status bei jedem Request
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Alle Routen außer statische Assets und API-Health
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
