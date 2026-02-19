import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Logout-Endpoint: Supabase-Session beenden
export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
