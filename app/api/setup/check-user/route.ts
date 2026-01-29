import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    // Check auth user
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email === email);

    // Check users table
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Check user_institutions
    let userInstitutions = null;
    if (dbUser) {
      const { data: ui } = await supabase
        .from('user_institutions')
        .select('*, institution:institutions(*)')
        .eq('user_id', dbUser.id);
      userInstitutions = ui;
    }

    return NextResponse.json({
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        email_confirmed: authUser.email_confirmed_at !== null,
        created_at: authUser.created_at,
      } : null,
      dbUser: dbUser || null,
      dbError: dbError?.message || null,
      userInstitutions,
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
