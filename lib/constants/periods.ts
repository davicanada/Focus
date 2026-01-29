import type { PeriodType } from '@/types';

export const PERIOD_TYPES: Record<PeriodType, { label: string; count: number }> = {
  bimestre: { label: 'Bimestre', count: 4 },
  trimestre: { label: 'Trimestre', count: 3 },
  semestre: { label: 'Semestre', count: 2 },
};

export function getPeriodName(type: PeriodType, number: number): string {
  return `${number}º ${PERIOD_TYPES[type].label}`;
}

export function getPeriodCount(type: PeriodType): number {
  return PERIOD_TYPES[type].count;
}
