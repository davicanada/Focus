'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AIChat } from '@/components/analytics/AIChat';
import { createClient } from '@/lib/supabase/client';
import { getFromStorage, removeFromStorage, ANALYTICS_COLORS, cn, getEducationLevelOrder } from '@/lib/utils';
import { AlertTriangle, BarChart2, AlertCircle, Users } from 'lucide-react';
import type { User, Institution } from '@/types';

// Dynamic import for ECharts to avoid SSR issues
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

// Props for the shared component
export interface AnalyticsDashboardProps {
  role: 'admin' | 'professor' | 'admin_viewer';
}

// Filter state type for cross-filtering (arrays for multi-select with Ctrl)
interface FilterState {
  categories: string[];
  severities: string[];
  months: string[];
  classIds: string[];
  studentIds: string[];
  educationLevels: string[];
  shifts: string[];
}

// KPI data type
interface KPIData {
  totalOccurrences: number;
  graveCount: number;
  gravePercentage: number;
  uniqueStudents: number;
  uniqueClasses: number;
  averagePerClass: number;
}

// Labels mapping
const severityLabels: Record<string, string> = {
  leve: 'Leve',
  media: 'Média',
  grave: 'Grave',
};

const severityKeysFromLabels: Record<string, string> = {
  Leve: 'leve',
  Média: 'media',
  Grave: 'grave',
};

// Education level labels
const educationLevelLabels: Record<string, string> = {
  infantil: 'Ed. Infantil',
  fundamental_i: 'Fund. I',
  fundamental_ii: 'Fund. II',
  medio: 'Ensino Medio',
};

const educationLevelKeysFromLabels: Record<string, string> = {
  'Ed. Infantil': 'infantil',
  'Fund. I': 'fundamental_i',
  'Fund. II': 'fundamental_ii',
  'Ensino Medio': 'medio',
};

// Shift labels
const shiftLabels: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  noturno: 'Noturno',
  integral: 'Integral',
  nao_informado: 'Nao Informado',
};

const shiftKeysFromLabels: Record<string, string> = {
  'Matutino': 'matutino',
  'Vespertino': 'vespertino',
  'Noturno': 'noturno',
  'Integral': 'integral',
  'Nao Informado': 'nao_informado',
};

// Analytics Card Component with dark blue header
interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

function AnalyticsCard({ title, subtitle, children, className }: AnalyticsCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden shadow-sm", className)}>
      <div className="px-4 py-2" style={{ backgroundColor: ANALYTICS_COLORS.headerBg }}>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && (
          <p className="text-xs text-white/70">{subtitle}</p>
        )}
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

function KPICard({ title, value, subtitle, icon }: KPICardProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: '#153461' }}>
        {icon && <span className="text-white/80">{icon}</span>}
        <span className="text-xs font-medium text-white">{title}</span>
      </div>
      <div className="px-4 py-3 text-center">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ role }: AnalyticsDashboardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);

  // Cross-filter state (arrays for multi-select with Ctrl)
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    categories: [],
    severities: [],
    months: [],
    classIds: [],
    studentIds: [],
    educationLevels: [],
    shifts: [],
  });

  // KPI data state
  const [kpiData, setKpiData] = useState<KPIData>({
    totalOccurrences: 0,
    graveCount: 0,
    gravePercentage: 0,
    uniqueStudents: 0,
    uniqueClasses: 0,
    averagePerClass: 0,
  });

  // Chart data
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; severity: string }[]>([]);
  const [severityData, setSeverityData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [topStudents, setTopStudents] = useState<{ name: string; count: number; id?: string }[]>([]);
  const [classData, setClassData] = useState<{ name: string; count: number; educationLevel: string }[]>([]);
  const [educationLevelData, setEducationLevelData] = useState<{ name: string; value: number }[]>([]);
  const [shiftData, setShiftData] = useState<{ name: string; value: number }[]>([]);
  const [studentsWithoutOccurrences, setStudentsWithoutOccurrences] = useState<{ id: string; name: string; className: string }[]>([]);

  // Year filter state - anos dinamicos baseados nos dados
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [yearOptions, setYearOptions] = useState<number[]>([new Date().getFullYear()]);

  // Chart refs for event handling
  const categoryChartRef = useRef<any>(null);
  const severityChartRef = useRef<any>(null);
  const monthlyChartRef = useRef<any>(null);
  const topStudentsChartRef = useRef<any>(null);
  const classChartRef = useRef<any>(null);
  const educationLevelChartRef = useRef<any>(null);
  const shiftChartRef = useRef<any>(null);

  // Count active filters (sum of all array lengths)
  const activeFilterCount = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0);
  const hasActiveFilters = activeFilterCount > 0;

  // Carrega os anos que tem dados de ocorrencias
  const loadAvailableYears = useCallback(async (institutionId: string) => {
    const supabase = createClient();
    const currentYear = new Date().getFullYear();

    // Busca anos distintos que tem ocorrencias
    const { data } = await supabase
      .from('occurrences')
      .select('occurrence_date')
      .eq('institution_id', institutionId)
      .is('deleted_at', null);

    if (data && data.length > 0) {
      // Extrai anos unicos das ocorrencias
      const yearsSet = new Set<number>(
        data.map((o: { occurrence_date: string }) => new Date(o.occurrence_date).getFullYear())
      );
      const yearsWithData = Array.from(yearsSet).sort((a, b) => b - a); // Ordena decrescente (mais recente primeiro)

      // Garante que o ano atual sempre apareca (mesmo sem dados)
      if (!yearsWithData.includes(currentYear)) {
        yearsWithData.unshift(currentYear);
      }

      setYearOptions(yearsWithData);

      // Se o ano selecionado nao esta na lista, seleciona o mais recente
      if (!yearsWithData.includes(selectedYear)) {
        setSelectedYear(yearsWithData[0]);
      }
    } else {
      // Sem dados, mostra apenas o ano atual
      setYearOptions([currentYear]);
      setSelectedYear(currentYear);
    }
  }, [selectedYear]);

  useEffect(() => {
    const checkAuth = async () => {
      const storedRole = getFromStorage('currentRole', null);
      const user = getFromStorage<User | null>('currentUser', null);
      const institution = getFromStorage<Institution | null>('currentInstitution', null);

      if (storedRole !== role || !user || !institution) {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      setCurrentInstitution(institution);

      // Carrega anos disponiveis e dados em paralelo
      await Promise.all([
        loadAvailableYears(institution.id),
        loadChartData(institution.id, activeFilters, new Date().getFullYear())
      ]);

      setIsLoading(false);
    };

    checkAuth();
  }, [router, role, loadAvailableYears]);

  // Reload data when filters or year change
  useEffect(() => {
    if (currentInstitution && !isLoading) {
      loadChartData(currentInstitution.id, activeFilters, selectedYear);
    }
  }, [activeFilters, currentInstitution, isLoading, selectedYear]);

  const loadChartData = async (institutionId: string, filters: FilterState, year: number) => {
    try {
      const supabase = createClient();

      // Year boundaries for filtering
      const startOfYear = new Date(year, 0, 1).toISOString();
      const endOfYear = new Date(year, 11, 31, 23, 59, 59).toISOString();

      // Helper to check if a value matches filter (empty array = no filter)
      const matchesFilter = (value: string | undefined, filterArray: string[]): boolean => {
        if (filterArray.length === 0) return true;
        return filterArray.includes(value || '');
      };

      // Month name helpers for cross-filtering
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const getMonthName = (dateStr: string): string => monthNames[new Date(dateStr).getMonth()];

      // OPTIMIZED: Only 2 queries instead of 6
      // Query 1: All occurrences with complete relations for the year
      // Supabase PostgREST caps at 1000 rows per request, so we paginate
      const PAGE_SIZE = 1000;
      let allOccurrences: any[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data: batch } = await supabase
          .from('occurrences')
          .select(`
            id,
            occurrence_date,
            student_id,
            occurrence_type:occurrence_types(category, severity),
            student:students(
              id,
              full_name,
              class:classes(id, name, education_level, shift)
            )
          `)
          .eq('institution_id', institutionId)
          .is('deleted_at', null)
          .gte('occurrence_date', startOfYear)
          .lte('occurrence_date', endOfYear)
          .range(from, to);

        if (batch && batch.length > 0) {
          allOccurrences = allOccurrences.concat(batch);
          hasMore = batch.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
        page++;
      }

      // Query 2: All students (needed for "without occurrences" list)
      const { data: allStudentsData } = await supabase
        .from('students')
        .select('id, full_name, class:classes(name)')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .is('deleted_at', null);

      // Process all chart data from the single occurrences query

      // Category distribution - exclude category filter for this chart
      const categoryCount: Record<string, { count: number; severity: string }> = {};
      allOccurrences?.forEach((r: any) => {
        if (!matchesFilter(r.occurrence_type?.severity, filters.severities)) return;
        if (!matchesFilter(r.student?.class?.name, filters.classIds)) return;
        if (!matchesFilter(r.student?.full_name, filters.studentIds)) return;
        if (!matchesFilter(r.student?.class?.education_level, filters.educationLevels)) return;
        if (!matchesFilter(r.student?.class?.shift || 'nao_informado', filters.shifts)) return;
        if (!matchesFilter(getMonthName(r.occurrence_date), filters.months)) return;
        const cat = r.occurrence_type?.category || 'outro';
        const sev = r.occurrence_type?.severity || 'leve';
        if (!categoryCount[cat]) {
          categoryCount[cat] = { count: 0, severity: sev };
        }
        categoryCount[cat].count += 1;
      });

      setCategoryData(
        Object.entries(categoryCount).map(([key, data]) => ({
          name: key,
          value: data.count,
          severity: data.severity,
        }))
      );

      // Severity distribution - exclude severity filter for this chart
      const severityCount: Record<string, number> = {};
      allOccurrences?.forEach((r: any) => {
        if (!matchesFilter(r.occurrence_type?.category, filters.categories)) return;
        if (!matchesFilter(r.student?.class?.name, filters.classIds)) return;
        if (!matchesFilter(r.student?.full_name, filters.studentIds)) return;
        if (!matchesFilter(r.student?.class?.education_level, filters.educationLevels)) return;
        if (!matchesFilter(r.student?.class?.shift || 'nao_informado', filters.shifts)) return;
        if (!matchesFilter(getMonthName(r.occurrence_date), filters.months)) return;
        const sev = r.occurrence_type?.severity || 'leve';
        severityCount[sev] = (severityCount[sev] || 0) + 1;
      });

      setSeverityData(
        Object.entries(severityCount).map(([key, value]) => ({
          name: severityLabels[key] || key,
          value,
        }))
      );

      // Monthly trend (Jan-Dec of selected year) - exclude month filter for this chart
      const months: { month: string; count: number }[] = [];

      // Group by month
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const filteredCount = allOccurrences?.filter((r: any) => {
          const occDate = new Date(r.occurrence_date);
          if (occDate.getMonth() !== monthIndex) return false;
          if (!matchesFilter(r.occurrence_type?.category, filters.categories)) return false;
          if (!matchesFilter(r.occurrence_type?.severity, filters.severities)) return false;
          if (!matchesFilter(r.student?.class?.name, filters.classIds)) return false;
          if (!matchesFilter(r.student?.full_name, filters.studentIds)) return false;
          if (!matchesFilter(r.student?.class?.education_level, filters.educationLevels)) return false;
          if (!matchesFilter(r.student?.class?.shift || 'nao_informado', filters.shifts)) return false;
          return true;
        }).length || 0;

        months.push({
          month: monthNames[monthIndex],
          count: filteredCount,
        });
      }
      setMonthlyData(months);

      // Top students with occurrences
      const studentCount: Record<string, { name: string; count: number; id: string; className: string }> = {};
      allOccurrences?.forEach((r: any) => {
        if (!matchesFilter(r.occurrence_type?.category, filters.categories)) return;
        if (!matchesFilter(r.occurrence_type?.severity, filters.severities)) return;
        if (!matchesFilter(r.student?.class?.name, filters.classIds)) return;
        if (!matchesFilter(r.student?.class?.education_level, filters.educationLevels)) return;
        if (!matchesFilter(r.student?.class?.shift || 'nao_informado', filters.shifts)) return;
        if (!matchesFilter(getMonthName(r.occurrence_date), filters.months)) return;

        const id = r.student_id;
        const name = r.student?.full_name || 'Desconhecido';
        const className = r.student?.class?.name || 'Sem turma';
        if (!studentCount[id]) {
          studentCount[id] = { name, count: 0, id, className };
        }
        studentCount[id].count++;
      });

      setTopStudents(
        Object.values(studentCount)
          .sort((a, b) => b.count - a.count)
      );

      // Students WITHOUT occurrences (in the filtered period)
      const studentIdsWithOccurrences = new Set(Object.keys(studentCount));
      const withoutOccurrences = (allStudentsData || [])
        .filter((s: any) => !studentIdsWithOccurrences.has(s.id))
        .filter((s: any) => matchesFilter(s.class?.name, filters.classIds))
        .map((s: any) => ({
          id: s.id as string,
          name: s.full_name as string,
          className: (s.class?.name || 'Sem turma') as string,
        }))
        .sort((a: { id: string; name: string; className: string }, b: { id: string; name: string; className: string }) => a.name.localeCompare(b.name));

      setStudentsWithoutOccurrences(withoutOccurrences);

      // Occurrences by class - exclude classIds filter for this chart
      const classCount: Record<string, { count: number; educationLevel: string }> = {};
      allOccurrences?.forEach((r: any) => {
        if (!matchesFilter(r.occurrence_type?.category, filters.categories)) return;
        if (!matchesFilter(r.occurrence_type?.severity, filters.severities)) return;
        if (!matchesFilter(r.student?.full_name, filters.studentIds)) return;
        if (!matchesFilter(r.student?.class?.education_level, filters.educationLevels)) return;
        if (!matchesFilter(r.student?.class?.shift || 'nao_informado', filters.shifts)) return;
        if (!matchesFilter(getMonthName(r.occurrence_date), filters.months)) return;

        const className = r.student?.class?.name || 'Sem turma';
        const educationLevel = r.student?.class?.education_level || 'medio';
        if (!classCount[className]) {
          classCount[className] = { count: 0, educationLevel };
        }
        classCount[className].count += 1;
      });

      setClassData(
        Object.entries(classCount)
          .map(([name, { count, educationLevel }]) => ({ name, count, educationLevel }))
          .sort((a, b) => {
            const levelDiff = getEducationLevelOrder(a.educationLevel) - getEducationLevelOrder(b.educationLevel);
            if (levelDiff !== 0) return levelDiff;
            return a.name.localeCompare(b.name, 'pt-BR');
          })
      );

      // Education level distribution - exclude educationLevel filter for this chart
      const educationLevelCount: Record<string, number> = {};
      allOccurrences?.forEach((r: any) => {
        if (!matchesFilter(r.occurrence_type?.category, filters.categories)) return;
        if (!matchesFilter(r.occurrence_type?.severity, filters.severities)) return;
        if (!matchesFilter(r.student?.class?.name, filters.classIds)) return;
        if (!matchesFilter(r.student?.full_name, filters.studentIds)) return;
        if (!matchesFilter(r.student?.class?.shift || 'nao_informado', filters.shifts)) return;
        if (!matchesFilter(getMonthName(r.occurrence_date), filters.months)) return;

        const level = r.student?.class?.education_level || 'medio';
        educationLevelCount[level] = (educationLevelCount[level] || 0) + 1;
      });

      setEducationLevelData(
        Object.entries(educationLevelCount).map(([key, value]) => ({
          name: educationLevelLabels[key] || key,
          value,
        }))
      );

      // Shift distribution - exclude shift filter for this chart
      const shiftCount: Record<string, number> = {};
      allOccurrences?.forEach((r: any) => {
        if (!matchesFilter(r.occurrence_type?.category, filters.categories)) return;
        if (!matchesFilter(r.occurrence_type?.severity, filters.severities)) return;
        if (!matchesFilter(r.student?.class?.name, filters.classIds)) return;
        if (!matchesFilter(r.student?.full_name, filters.studentIds)) return;
        if (!matchesFilter(r.student?.class?.education_level, filters.educationLevels)) return;
        if (!matchesFilter(getMonthName(r.occurrence_date), filters.months)) return;

        const shift = r.student?.class?.shift || 'nao_informado';
        shiftCount[shift] = (shiftCount[shift] || 0) + 1;
      });

      setShiftData(
        Object.entries(shiftCount).map(([key, value]) => ({
          name: shiftLabels[key] || key,
          value,
        }))
      );

      // Calculate KPIs from filtered data
      // We need to apply ALL filters to get the filtered totals
      const kpiFilteredData = (allOccurrences || []).filter((r: any) => {
        if (!matchesFilter(r.occurrence_type?.category, filters.categories)) return false;
        if (!matchesFilter(r.occurrence_type?.severity, filters.severities)) return false;
        if (!matchesFilter(r.student?.class?.name, filters.classIds)) return false;
        if (!matchesFilter(r.student?.full_name, filters.studentIds)) return false;
        if (!matchesFilter(r.student?.class?.education_level, filters.educationLevels)) return false;
        if (!matchesFilter(r.student?.class?.shift || 'nao_informado', filters.shifts)) return false;
        if (!matchesFilter(getMonthName(r.occurrence_date), filters.months)) return false;
        return true;
      });

      const totalOccurrences = kpiFilteredData.length;
      const graveCount = kpiFilteredData.filter((r: any) => r.occurrence_type?.severity === 'grave').length;
      const gravePercentage = totalOccurrences > 0 ? (graveCount / totalOccurrences) * 100 : 0;

      const uniqueStudentIds = new Set(kpiFilteredData.map((r: any) => r.student_id));
      const uniqueClassNames = new Set(kpiFilteredData.map((r: any) => r.student?.class?.name).filter(Boolean));

      const uniqueStudents = uniqueStudentIds.size;
      const uniqueClasses = uniqueClassNames.size;
      const averagePerClass = uniqueClasses > 0 ? totalOccurrences / uniqueClasses : 0;

      setKpiData({
        totalOccurrences,
        graveCount,
        gravePercentage,
        uniqueStudents,
        uniqueClasses,
        averagePerClass,
      });

    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    removeFromStorage('currentRole');
    removeFromStorage('currentUser');
    removeFromStorage('currentInstitution');
    removeFromStorage('userInstitutions');
    router.push('/');
  };

  // Cross-filter handlers with Ctrl support for multi-select
  const handleFilterClick = useCallback((
    filterType: keyof FilterState,
    value: string,
    isCtrlPressed: boolean
  ) => {
    setActiveFilters(prev => {
      const currentArray = prev[filterType];
      const exists = currentArray.includes(value);

      if (isCtrlPressed) {
        return {
          ...prev,
          [filterType]: exists
            ? currentArray.filter(v => v !== value)
            : [...currentArray, value],
        };
      } else {
        const isSelectedAlone = currentArray.length === 1 && currentArray[0] === value;
        return {
          ...prev,
          [filterType]: isSelectedAlone ? [] : [value],
        };
      }
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({
      categories: [],
      severities: [],
      months: [],
      classIds: [],
      studentIds: [],
      educationLevels: [],
      shifts: [],
    });
  }, []);

  // Chart click handlers with Ctrl detection
  const handleCategoryClick = useCallback((params: any) => {
    if (params.name) {
      const isCtrl = params.event?.event?.ctrlKey || params.event?.event?.metaKey || false;
      handleFilterClick('categories', params.name, isCtrl);
    }
  }, [handleFilterClick]);

  const handleSeverityClick = useCallback((params: any) => {
    if (params.name) {
      const severityKey = severityKeysFromLabels[params.name] || params.name.toLowerCase();
      const isCtrl = params.event?.event?.ctrlKey || params.event?.event?.metaKey || false;
      handleFilterClick('severities', severityKey, isCtrl);
    }
  }, [handleFilterClick]);

  const handleMonthlyClick = useCallback((params: any) => {
    if (params.name) {
      const isCtrl = params.event?.event?.ctrlKey || params.event?.event?.metaKey || false;
      handleFilterClick('months', params.name, isCtrl);
    }
  }, [handleFilterClick]);

  const handleClassClick = useCallback((params: any) => {
    if (params.name) {
      const isCtrl = params.event?.event?.ctrlKey || params.event?.event?.metaKey || false;
      handleFilterClick('classIds', params.name, isCtrl);
    }
  }, [handleFilterClick]);

  const handleStudentClick = useCallback((params: any) => {
    if (params.name) {
      const isCtrl = params.event?.event?.ctrlKey || params.event?.event?.metaKey || false;
      handleFilterClick('studentIds', params.name, isCtrl);
    }
  }, [handleFilterClick]);

  const handleEducationLevelClick = useCallback((params: any) => {
    if (params.name) {
      const levelKey = educationLevelKeysFromLabels[params.name] || params.name;
      const isCtrl = params.event?.event?.ctrlKey || params.event?.event?.metaKey || false;
      handleFilterClick('educationLevels', levelKey, isCtrl);
    }
  }, [handleFilterClick]);

  const handleShiftClick = useCallback((params: any) => {
    if (params.name) {
      const shiftKey = shiftKeysFromLabels[params.name] || params.name;
      const isCtrl = params.event?.event?.ctrlKey || params.event?.event?.metaKey || false;
      handleFilterClick('shifts', shiftKey, isCtrl);
    }
  }, [handleFilterClick]);

  // Chart options with selection states (all fontSize: 12, lineHeight: 16)
  const categorySeverityColors: Record<string, string> = {
    leve: '#A8D0F5',
    media: '#2E5A8E',
    grave: '#153461',
  };
  const sortedCategoryData = [...categoryData].sort((a, b) => a.value - b.value);
  const categoryChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '12%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: sortedCategoryData.map(d => d.name),
      axisLabel: { width: 120, overflow: 'truncate', fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: sortedCategoryData.map((item) => {
        const isSelected = activeFilters.categories.includes(item.name);
        const hasActiveFilter = activeFilters.categories.length > 0;
        const baseColor = categorySeverityColors[item.severity] || '#4A90D9';
        return {
          value: item.value,
          itemStyle: {
            color: isSelected
              ? baseColor
              : hasActiveFilter
                ? `${baseColor}4D`
                : baseColor,
          },
        };
      }),
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        fontSize: 12,
      },
      barMaxWidth: 15,
    }],
  };

  const severityColors: Record<string, string> = {
    leve: '#A8D0F5',
    media: '#2E5A8E',
    grave: '#153461',
  };
  const severityChartOption = {
    tooltip: { trigger: 'item' },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: severityData.map(item => {
        const severityKey = severityKeysFromLabels[item.name] || item.name.toLowerCase();
        const isSelected = activeFilters.severities.includes(severityKey);
        const hasActiveFilter = activeFilters.severities.length > 0;
        return {
          ...item,
          selected: isSelected,
          itemStyle: {
            color: severityColors[severityKey] || '#4A90D9',
            opacity: hasActiveFilter && !isSelected ? 0.3 : 1,
          },
        };
      }),
      selectedMode: 'multiple',
      label: {
        show: true,
        formatter: (params: any) => `${params.name}\n${params.value} (${Math.round(params.percent)}%)`,
        position: 'outside',
        fontSize: 12,
        lineHeight: 16,
      },
      labelLine: { show: true, length: 10, length2: 5 },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    }],
  };

  const monthlyChartOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: monthlyData.map(d => d.month),
      axisLabel: { fontSize: 12 },
    },
    yAxis: { type: 'value', show: false },
    series: [{
      data: monthlyData.map(d => {
        const isSelected = activeFilters.months.includes(d.month);
        const hasActiveFilter = activeFilters.months.length > 0;
        return {
          value: d.count,
          itemStyle: {
            color: isSelected
              ? '#153461'
              : hasActiveFilter
                ? '#1534614D'
                : '#153461',
          },
        };
      }),
      type: 'bar',
      label: {
        show: true,
        position: 'top',
        formatter: '{c}',
        fontSize: 12,
      },
    }],
  };

  const topStudentsChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '15%', bottom: 5, top: 5, containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: topStudents.map(s => s.name).reverse(),
      axisLabel: { width: 150, overflow: 'truncate', fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: topStudents.map(s => {
        const isSelected = activeFilters.studentIds.includes(s.name);
        const hasActiveFilter = activeFilters.studentIds.length > 0;
        return {
          value: s.count,
          itemStyle: {
            color: isSelected
              ? '#4A90D9'
              : hasActiveFilter
                ? '#4A90D94D'
                : '#4A90D9',
          },
        };
      }).reverse(),
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        fontSize: 12,
      },
    }],
  };

  const classChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '3%', bottom: '20%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: classData.map(c => c.name),
      axisLabel: { fontSize: 12, rotate: 45, interval: 0 },
    },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'bar',
      data: (() => {
        const maxCount = classData.length > 0 ? Math.max(...classData.map(c => c.count)) : 0;
        const minCount = classData.length > 0 ? Math.min(...classData.map(c => c.count)) : 0;
        const hasActiveFilter = activeFilters.classIds.length > 0;

        return classData.map(c => {
          let color = '#4A90D9';
          if (classData.length > 1 && maxCount !== minCount) {
            if (c.count === maxCount) {
              color = '#153461';
            } else if (c.count === minCount) {
              color = '#A8D0F5';
            }
          }

          const isSelected = activeFilters.classIds.includes(c.name);
          return {
            value: c.count,
            itemStyle: {
              color: isSelected
                ? color
                : hasActiveFilter
                  ? `${color}4D`
                  : color,
            },
          };
        });
      })(),
      label: {
        show: true,
        position: 'top',
        formatter: '{c}',
        fontSize: 12,
      },
      barMaxWidth: 30,
    }],
  };

  const educationLevelColors: Record<string, string> = {
    medio: '#153461',
    fundamental_ii: '#2E5A8E',
    fundamental_i: '#4A90D9',
    fundamental: '#4A90D9',
    infantil: '#A8D0F5',
  };
  const educationLevelChartOption = {
    tooltip: { trigger: 'item' },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['30%', '55%'],
      center: ['50%', '50%'],
      data: educationLevelData.map((item) => {
        const levelKey = educationLevelKeysFromLabels[item.name] || item.name;
        const isSelected = activeFilters.educationLevels.includes(levelKey);
        const hasActiveFilter = activeFilters.educationLevels.length > 0;
        return {
          ...item,
          selected: isSelected,
          itemStyle: {
            color: educationLevelColors[levelKey] || '#4A90D9',
            opacity: hasActiveFilter && !isSelected ? 0.3 : 1,
          },
        };
      }),
      selectedMode: 'multiple',
      label: {
        show: true,
        formatter: (params: any) => `${params.name}\n${params.value} (${Math.round(params.percent)}%)`,
        position: 'outside',
        fontSize: 12,
        lineHeight: 16,
      },
      labelLine: { show: true, length: 6, length2: 4 },
      emphasis: {
        itemStyle: {
          shadowBlur: 5,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
      },
    }],
  };

  const shiftColors: Record<string, string> = {
    matutino: '#7BB3E8',
    vespertino: '#2E5A8E',
    noturno: '#153461',
    integral: '#D4E8FA',
    nao_informado: '#6b7280',
  };
  const shiftChartOption = {
    tooltip: { trigger: 'item' },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['30%', '55%'],
      center: ['50%', '50%'],
      data: shiftData.map((item) => {
        const shiftKey = shiftKeysFromLabels[item.name] || item.name;
        const isSelected = activeFilters.shifts.includes(shiftKey);
        const hasActiveFilter = activeFilters.shifts.length > 0;
        return {
          ...item,
          selected: isSelected,
          itemStyle: {
            color: shiftColors[shiftKey] || '#4A90D9',
            opacity: hasActiveFilter && !isSelected ? 0.3 : 1,
          },
        };
      }),
      selectedMode: 'multiple',
      label: {
        show: true,
        formatter: (params: any) => `${params.name}\n${params.value} (${Math.round(params.percent)}%)`,
        position: 'outside',
        fontSize: 12,
        lineHeight: 16,
      },
      labelLine: { show: true, length: 6, length2: 4 },
      emphasis: {
        itemStyle: {
          shadowBlur: 5,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
      },
    }],
  };

  // Chart event handlers setup
  const onCategoryChartReady = (chart: any) => {
    categoryChartRef.current = chart;
    chart.on('click', handleCategoryClick);
  };

  const onSeverityChartReady = (chart: any) => {
    severityChartRef.current = chart;
    chart.on('click', handleSeverityClick);
  };

  const onMonthlyChartReady = (chart: any) => {
    monthlyChartRef.current = chart;
    chart.on('click', handleMonthlyClick);
  };

  const onTopStudentsChartReady = (chart: any) => {
    topStudentsChartRef.current = chart;
    chart.on('click', handleStudentClick);
  };

  const onClassChartReady = (chart: any) => {
    classChartRef.current = chart;
    chart.on('click', handleClassClick);
  };

  const onEducationLevelChartReady = (chart: any) => {
    educationLevelChartRef.current = chart;
    chart.on('click', handleEducationLevelClick);
  };

  const onShiftChartReady = (chart: any) => {
    shiftChartRef.current = chart;
    chart.on('click', handleShiftClick);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <DashboardLayout
      userName={currentUser?.full_name || ''}
      userEmail={currentUser?.email || ''}
      currentRole={role}
      currentInstitution={currentInstitution || undefined}
      onSignOut={handleSignOut}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="text-xs text-muted-foreground">
              Ctrl+Clique para multi-selecao
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="year-filter" className="text-sm font-medium text-muted-foreground">
                Ano:
              </label>
              <select
                id="year-filter"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <span>{activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} ativo{activeFilterCount > 1 ? 's' : ''}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <KPICard
            title="Total Ocorrências"
            value={kpiData.totalOccurrences}
            subtitle={hasActiveFilters ? 'filtrado' : `em ${selectedYear}`}
            icon={<BarChart2 size={14} />}
          />
          <KPICard
            title="Média por Turma"
            value={kpiData.averagePerClass.toFixed(1)}
            subtitle={hasActiveFilters ? 'filtrado' : `em ${selectedYear}`}
            icon={<AlertCircle size={14} />}
          />
          <KPICard
            title="% Graves"
            value={`${kpiData.gravePercentage.toFixed(1)}%`}
            subtitle={hasActiveFilters ? 'filtrado' : `em ${selectedYear}`}
            icon={<AlertTriangle size={14} />}
          />
          <KPICard
            title="Alunos Afetados"
            value={kpiData.uniqueStudents}
            subtitle={hasActiveFilters ? 'filtrado' : `em ${selectedYear}`}
            icon={<Users size={14} />}
          />
        </div>

        {/* Row 1: Tendência Mensal + Distribuição por Categoria */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <AnalyticsCard
            title={`Tendência Mensal - ${selectedYear}`}
            subtitle="Ocorrências por mês (clique para filtrar)"
          >
            <ReactECharts
              option={monthlyChartOption}
              style={{ height: 200 }}
              onChartReady={onMonthlyChartReady}
            />
          </AnalyticsCard>

          <AnalyticsCard
            title="Distribuição por Categoria"
            subtitle="Por tipo (clique para filtrar)"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                {categoryData.length > 0 ? (
                  <ReactECharts
                    option={categoryChartOption}
                    style={{ height: Math.max(180, categoryData.length * 24) }}
                    onChartReady={onCategoryChartReady}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-xs">Sem dados</p>
                )}
              </div>
              <div>
                {severityData.length > 0 ? (
                  <ReactECharts
                    option={severityChartOption}
                    style={{ height: Math.max(180, categoryData.length * 24) }}
                    onChartReady={onSeverityChartReady}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-xs">Sem dados</p>
                )}
              </div>
            </div>
          </AnalyticsCard>
        </div>

        {/* Row 2: Donuts (Nível + Turno) + Ocorrências por Turma */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
            <div className="grid grid-cols-2">
              <div>
                <div className="px-3 py-1.5" style={{ backgroundColor: ANALYTICS_COLORS.headerBg }}>
                  <h3 className="text-xs font-semibold text-white">Por Nível de Ensino</h3>
                  <p className="text-[10px] text-white/70">Por nivel (clique para filtrar)</p>
                </div>
                <div className="p-2">
                  {educationLevelData.length > 0 ? (
                    <ReactECharts
                      option={educationLevelChartOption}
                      style={{ height: 160 }}
                      onChartReady={onEducationLevelChartReady}
                    />
                  ) : (
                    <p className="text-center text-muted-foreground py-4 text-xs">Sem dados</p>
                  )}
                </div>
              </div>
              <div className="border-l">
                <div className="px-3 py-1.5" style={{ backgroundColor: ANALYTICS_COLORS.headerBg }}>
                  <h3 className="text-xs font-semibold text-white">Por Turno</h3>
                  <p className="text-[10px] text-white/70">Por periodo (clique para filtrar)</p>
                </div>
                <div className="p-2">
                  {shiftData.length > 0 ? (
                    <ReactECharts
                      option={shiftChartOption}
                      style={{ height: 160 }}
                      onChartReady={onShiftChartReady}
                    />
                  ) : (
                    <p className="text-center text-muted-foreground py-4 text-xs">Sem dados</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <AnalyticsCard
            title="Ocorrências por Turma"
            subtitle="Máximo (escuro) / Mínimo (claro)"
          >
            {classData.length > 0 ? (
              <ReactECharts
                option={classChartOption}
                style={{ height: Math.max(180, classData.length * 22) }}
                onChartReady={onClassChartReady}
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </AnalyticsCard>
        </div>

        {/* Row 3: Alunos com Ocorrências + Alunos sem Ocorrências */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <AnalyticsCard
            title="Alunos com Ocorrências"
            subtitle={`${topStudents.length} alunos (clique para filtrar)`}
          >
            {topStudents.length > 0 ? (
              <div className="max-h-[200px] overflow-y-auto">
                <ReactECharts
                  option={topStudentsChartOption}
                  style={{ height: Math.max(180, topStudents.length * 22) }}
                  onChartReady={onTopStudentsChartReady}
                />
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </AnalyticsCard>

          <AnalyticsCard
            title="Alunos sem Ocorrências"
            subtitle={`${studentsWithoutOccurrences.length} aluno${studentsWithoutOccurrences.length !== 1 ? 's' : ''} sem registro${activeFilters.classIds.length > 0 ? ` (${activeFilters.classIds.join(', ')})` : ''}`}
          >
            {studentsWithoutOccurrences.length > 0 ? (
              <div className="max-h-[200px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left py-1.5 px-2 font-medium">Aluno</th>
                      <th className="text-left py-1.5 px-2 font-medium">Turma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsWithoutOccurrences.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-muted/50">
                        <td className="py-1.5 px-2">{s.name}</td>
                        <td className="py-1.5 px-2">{s.className}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Todos os alunos possuem ocorrencias no periodo selecionado
              </p>
            )}
          </AnalyticsCard>
        </div>

        {/* AI Analytics Chat */}
        {currentInstitution && (
          <AIChat institutionId={currentInstitution.id} />
        )}
      </div>
    </DashboardLayout>
  );
}
