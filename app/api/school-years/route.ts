import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/school-years - Listar anos letivos da instituição
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar institution_id do usuário
    const { data: userInstitution } = await serviceClient
      .from('user_institutions')
      .select('institution_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!userInstitution) {
      return NextResponse.json(
        { error: 'Usuário não está vinculado a nenhuma instituição' },
        { status: 400 }
      );
    }

    // Buscar anos letivos
    const { data: schoolYears, error: yearsError } = await serviceClient
      .from('school_years')
      .select(`
        *,
        archived_by_user:users!school_years_archived_by_fkey(full_name)
      `)
      .eq('institution_id', userInstitution.institution_id)
      .order('year', { ascending: false });

    if (yearsError) {
      console.error('Erro ao buscar anos letivos:', yearsError);
      return NextResponse.json(
        { error: 'Erro ao buscar anos letivos' },
        { status: 500 }
      );
    }

    // Buscar estatísticas de cada ano
    const yearsWithStats = await Promise.all(
      (schoolYears || []).map(async (schoolYear) => {
        const [classesCount, studentsCount, occurrencesCount] = await Promise.all([
          serviceClient
            .from('classes')
            .select('id', { count: 'exact', head: true })
            .eq('school_year_id', schoolYear.id)
            .eq('is_active', true),
          serviceClient
            .from('student_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('school_year_id', schoolYear.id)
            .eq('status', 'active'),
          serviceClient
            .from('occurrences')
            .select('id', { count: 'exact', head: true })
            .gte('occurrence_date', `${schoolYear.year}-01-01`)
            .lte('occurrence_date', `${schoolYear.year}-12-31`)
            .eq('institution_id', userInstitution.institution_id)
        ]);

        return {
          ...schoolYear,
          stats: {
            classes: classesCount.count || 0,
            students: studentsCount.count || 0,
            occurrences: occurrencesCount.count || 0
          }
        };
      })
    );

    return NextResponse.json(yearsWithStats);

  } catch (error) {
    console.error('Erro ao buscar anos letivos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/school-years - Criar novo ano letivo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin ou master
    const { data: currentUser } = await serviceClient
      .from('users')
      .select('is_master')
      .eq('id', user.id)
      .single();

    const { data: userInstitution } = await serviceClient
      .from('user_institutions')
      .select('role, institution_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const isAdmin = userInstitution?.role === 'admin';
    const isMaster = currentUser?.is_master === true;

    if (!isAdmin && !isMaster) {
      return NextResponse.json(
        { error: 'Apenas administradores podem criar anos letivos' },
        { status: 403 }
      );
    }

    // Buscar dados do body
    const body = await request.json();
    const { year, name, start_date, end_date, is_current } = body;

    if (!year) {
      return NextResponse.json(
        { error: 'O ano é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já existe ano letivo para este ano
    const { data: existing } = await serviceClient
      .from('school_years')
      .select('id')
      .eq('institution_id', userInstitution?.institution_id)
      .eq('year', year)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Já existe um ano letivo para ${year}` },
        { status: 400 }
      );
    }

    // Criar ano letivo
    const { data: newYear, error: createError } = await serviceClient
      .from('school_years')
      .insert({
        institution_id: userInstitution?.institution_id,
        year,
        name: name || `Ano Letivo ${year}`,
        start_date: start_date || `${year}-02-01`,
        end_date: end_date || `${year}-12-15`,
        is_current: is_current || false
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar ano letivo:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar ano letivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Ano letivo ${year} criado com sucesso`,
      school_year: newYear
    });

  } catch (error) {
    console.error('Erro ao criar ano letivo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
