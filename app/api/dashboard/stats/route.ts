import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Obter estatísticas do dashboard para uma instituição
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get('institution_id');

    if (!institutionId) {
      return NextResponse.json({ error: 'institution_id é obrigatório' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Data para filtro do mês
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthISO = startOfMonth.toISOString();

    // Executar todas as queries em paralelo usando service client (bypassa RLS)
    const [
      studentsRes,
      classesRes,
      teachersRes,
      occurrencesRes,
      monthRes,
      graveRes,
      recentRes,
    ] = await Promise.all([
      // Students count
      supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .is('deleted_at', null),
      // Classes count
      supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .is('deleted_at', null),
      // Teachers count - usando service client para bypass de RLS
      supabase
        .from('user_institutions')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('role', 'professor')
        .eq('is_active', true),
      // Total occurrences (only active, not soft-deleted)
      supabase
        .from('occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .is('deleted_at', null),
      // This month occurrences (only active)
      supabase
        .from('occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .is('deleted_at', null)
        .gte('occurrence_date', startOfMonthISO),
      // Grave occurrences this month (only active)
      supabase
        .from('occurrences')
        .select(`
          *,
          occurrence_type:occurrence_types!inner(severity)
        `, { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .is('deleted_at', null)
        .eq('occurrence_types.severity', 'grave')
        .gte('occurrence_date', startOfMonthISO),
      // Recent occurrences - ordenar por occurrence_date (data do EVENTO) + created_at para desempate
      supabase
        .from('occurrences')
        .select(`
          *,
          student:students(full_name, class_id),
          occurrence_type:occurrence_types(category, severity),
          registered_by_user:users!occurrences_registered_by_fkey(full_name),
          class_at_occurrence:classes!occurrences_class_id_at_occurrence_fkey(name)
        `)
        .eq('institution_id', institutionId)
        .is('deleted_at', null)
        .order('occurrence_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Log para debug
    console.log('Dashboard stats for institution', institutionId, {
      students: studentsRes.count,
      classes: classesRes.count,
      teachers: teachersRes.count,
      occurrences: occurrencesRes.count,
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents: studentsRes.count || 0,
        totalClasses: classesRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalOccurrences: occurrencesRes.count || 0,
        occurrencesThisMonth: monthRes.count || 0,
        graveOccurrences: graveRes.count || 0,
      },
      recentOccurrences: recentRes.data || [],
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
