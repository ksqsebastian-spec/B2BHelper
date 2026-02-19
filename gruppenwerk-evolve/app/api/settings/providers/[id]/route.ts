import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// API-Key entfernen
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from('api_configurations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'API-Key konnte nicht gelöscht werden' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
