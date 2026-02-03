'use client';

const ACTIVE_INSTITUTION_KEY = 'activeInstitutionId';
const ACTIVE_ROLE_KEY = 'activeInstitutionRole';

export function getActiveInstitutionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_INSTITUTION_KEY);
}

export function getActiveInstitutionRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_ROLE_KEY);
}

export function setActiveInstitution(institutionId: string, role: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_INSTITUTION_KEY, institutionId);
  localStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export function clearActiveInstitution(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_INSTITUTION_KEY);
  localStorage.removeItem(ACTIVE_ROLE_KEY);
}
