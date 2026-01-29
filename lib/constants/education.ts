export type EducationStage = 'infantil' | 'fundamental_i' | 'fundamental_ii' | 'medio' | 'custom';

export interface EducationYear {
  code: string;
  label: string;
  order: number;
}

export interface EducationLevel {
  label: string;
  allowClassSection: boolean;
  years: EducationYear[];
}

export const EDUCATION_LEVELS: Record<EducationStage, EducationLevel> = {
  infantil: {
    label: 'Educação Infantil',
    allowClassSection: false,
    years: [
      { code: 'creche', label: 'Creche', order: 1 },
      { code: 'pre', label: 'Pré-escola', order: 2 }
    ]
  },
  fundamental_i: {
    label: 'Ensino Fundamental I',
    allowClassSection: true,
    years: [
      { code: '1', label: '1º ano', order: 1 },
      { code: '2', label: '2º ano', order: 2 },
      { code: '3', label: '3º ano', order: 3 },
      { code: '4', label: '4º ano', order: 4 },
      { code: '5', label: '5º ano', order: 5 }
    ]
  },
  fundamental_ii: {
    label: 'Ensino Fundamental II',
    allowClassSection: true,
    years: [
      { code: '6', label: '6º ano', order: 1 },
      { code: '7', label: '7º ano', order: 2 },
      { code: '8', label: '8º ano', order: 3 },
      { code: '9', label: '9º ano', order: 4 }
    ]
  },
  medio: {
    label: 'Ensino Médio',
    allowClassSection: true,
    years: [
      { code: '1', label: '1ª série', order: 1 },
      { code: '2', label: '2ª série', order: 2 },
      { code: '3', label: '3ª série', order: 3 },
      { code: '4', label: '4ª série', order: 4 }
    ]
  },
  custom: {
    label: 'Outro',
    allowClassSection: true,
    years: []
  }
};

export const SHIFTS = [
  { value: 'matutino', label: 'Matutino' },
  { value: 'vespertino', label: 'Vespertino' },
  { value: 'noturno', label: 'Noturno' },
  { value: 'integral', label: 'Integral' }
] as const;

export type ShiftType = typeof SHIFTS[number]['value'];

export function canHaveSection(stage: EducationStage): boolean {
  return stage === 'fundamental_i' || stage === 'fundamental_ii' || stage === 'medio' || stage === 'custom';
}

export function buildClassLabel(
  stage: EducationStage,
  yearCode: string,
  section?: string,
  _shift?: string // Mantido para compatibilidade, mas não usado no nome
): string {
  if (section && !canHaveSection(stage)) {
    throw new Error('Esta etapa não permite divisão por turma (A, B, C)');
  }

  // Educação Infantil: manter label completo (Creche, Pré-escola)
  if (stage === 'infantil') {
    const yearData = EDUCATION_LEVELS[stage].years.find(y => y.code === yearCode);
    const label = yearData?.label || yearCode;
    return section ? `${label} ${section}` : label;
  }

  // Custom: usar código diretamente
  if (stage === 'custom') {
    return section ? `${yearCode} ${section}` : yearCode;
  }

  // Fundamental e Médio: formato simplificado
  // Fundamental: "1" → "1º"
  // Médio: "1" → "1ª"
  const ordinal = stage === 'medio' ? `${yearCode}ª` : `${yearCode}º`;
  return section ? `${ordinal} ${section}` : ordinal;
}
