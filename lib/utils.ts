import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Funcao para merge de classes Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper para parsear data como LOCAL (evita problema de timezone)
// Strings no formato "YYYY-MM-DD" do banco sao parseadas como UTC por new Date(),
// o que causa datas erradas ao exibir no fuso horario do Brasil (UTC-3).
// Esta funcao parseia como data local, mantendo o dia correto.
function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) {
    return date;
  }
  // String no formato "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS..."
  if (date.includes('T')) {
    // Se tem hora, usar new Date() normal (timestamp completo)
    return new Date(date);
  }
  // Data sem hora: parsear como local para evitar problema de timezone
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day); // month e 0-indexed
}

// Formatar data para exibicao (pt-BR) - sempre no timezone de Brasilia
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = parseLocalDate(date);
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    ...(options || {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  });
}

// Formatar data e hora para exibicao (pt-BR) - sempre no timezone de Brasilia
export function formatDateTime(date: string | Date): string {
  const d = parseLocalDate(date);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Formatar data para input HTML (YYYY-MM-DD)
export function formatDateForInput(date: string | Date): string {
  const d = parseLocalDate(date);
  // Usar metodos locais para evitar problema de timezone
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Verificar se data nao e no futuro
export function isNotFutureDate(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return d <= now;
}

// Gerar slug a partir de texto
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Capitalizar primeira letra de cada palavra
export function capitalize(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Truncar texto com ellipsis
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

// Formatar telefone brasileiro
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Aplicar mascara de telefone brasileiro enquanto digita
export function maskPhone(value: string): string {
  // Remove tudo que nao e digito
  const cleaned = value.replace(/\D/g, '');

  // Limita a 11 digitos (celular com DDD)
  const limited = cleaned.slice(0, 11);

  // Aplica a mascara progressivamente
  if (limited.length === 0) return '';
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  if (limited.length <= 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  // 11 digitos - celular
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

// Validar telefone brasileiro (aceita vazio pois e opcional)
export function isValidBrazilianPhone(phone: string): boolean {
  if (!phone || phone.trim() === '') return true; // Vazio e valido (campo opcional)

  const cleaned = phone.replace(/\D/g, '');

  // Deve ter 10 (fixo) ou 11 (celular) digitos
  if (cleaned.length !== 10 && cleaned.length !== 11) return false;

  // DDD valido (11-99)
  const ddd = parseInt(cleaned.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  // Se tem 11 digitos, o primeiro digito apos DDD deve ser 9 (celular)
  if (cleaned.length === 11 && cleaned[2] !== '9') return false;

  return true;
}

// Validar email com regex mais robusto
export function isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') return false;

  // Regex mais completo para validacao de email
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  return emailRegex.test(email.trim());
}

// Obter iniciais do nome
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .join('')
    .toUpperCase();
}

// Cores para graficos (Apache ECharts) - Paleta Harmonizada
export const CHART_COLORS = {
  // === CORES PRIMÁRIAS (Escala de Azul - identidade Focus) ===
  primary: '#2563eb',      // Blue 600 - vibrante e moderno
  primaryLight: '#3b82f6', // Blue 500
  primaryDark: '#1d4ed8',  // Blue 700

  // === CORES SEMÂNTICAS (Significado universal) ===
  success: '#22c55e',      // Green 500 - verde vibrante
  warning: '#eab308',      // Yellow 500 - amarelo puro
  danger: '#ef4444',       // Red 500

  // === NEUTROS ===
  gray: '#6b7280',         // Gray 500
  grayLight: '#9ca3af',    // Gray 400

  // === PALETA PARA CATEGORIAS (Cores Analogous - harmoniosas) ===
  palette: [
    '#2563eb', // Blue 600
    '#0891b2', // Cyan 600
    '#0d9488', // Teal 600
    '#059669', // Emerald 600
    '#65a30d', // Lime 600
    '#ca8a04', // Yellow 600
    '#ea580c', // Orange 600
    '#dc2626', // Red 600
  ],

  // === SEVERIDADE (Gradiente semântico) ===
  severity: {
    leve: '#22c55e',    // Green 500
    media: '#eab308',   // Yellow 500
    grave: '#ef4444',   // Red 500
  },

  // === NÍVEL DE ENSINO ===
  educationLevel: {
    infantil: '#a855f7',       // Purple 500
    fundamental_i: '#3b82f6',  // Blue 500
    fundamental_ii: '#2E5A8E', // Custom dark blue
    medio: '#14b8a6',          // Teal 500
  },

  // === TURNO ===
  shift: {
    matutino: '#3b82f6',   // Blue 500 - manhã/sol nascendo
    vespertino: '#f97316', // Orange 500 - tarde/pôr do sol
    noturno: '#8b5cf6',    // Violet 500 - noite/lua
    integral: '#10b981',   // Emerald 500 - dia todo
    nao_informado: '#6b7280', // Gray 500 - sem informação
  },
};

// Cores para Analytics - Design Compacto (tons de azul suave harmonizados com #153461)
export const ANALYTICS_COLORS = {
  // Header dos cards
  headerBg: '#153461',
  headerText: '#ffffff',

  // Barras dos gráficos - Escala de azul suave
  bars: {
    primary: '#4A90D9',
    secondary: '#7BB3E8',
    tertiary: '#A8D0F5',
    light: '#D4E8FA',
  },

  // Severidade suave
  severity: {
    grave: '#E57373',
    media: '#FFD54F',
    leve: '#81C784',
  },

  // Escala de azuis para donuts e categorias
  scale: [
    '#153461',
    '#1E4A7A',
    '#2E5A8E',
    '#4A90D9',
    '#7BB3E8',
    '#A8D0F5',
    '#D4E8FA',
  ],
};

// === ORDENAÇÃO E FORMATAÇÃO DE TURMAS ===

const EDUCATION_LEVEL_ORDER: Record<string, number> = {
  infantil: 0,
  fundamental_i: 1,
  fundamental_ii: 2,
  medio: 3,
};

const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  infantil: 'Educação Infantil',
  fundamental_i: 'Ensino Fundamental I',
  fundamental_ii: 'Ensino Fundamental II',
  medio: 'Ensino Médio',
};

const SHIFT_LABELS: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  noturno: 'Noturno',
  integral: 'Integral',
};

export function getEducationLevelOrder(level: string): number {
  return EDUCATION_LEVEL_ORDER[level] ?? 99;
}

export function formatClassFullName(name: string, educationLevel?: string, shift?: string): string {
  const levelLabel = EDUCATION_LEVEL_LABELS[educationLevel || ''] || educationLevel || '';
  const shiftLabel = SHIFT_LABELS[shift || ''] || shift || '';
  if (levelLabel && shiftLabel) return `${name} - ${levelLabel} - ${shiftLabel}`;
  if (levelLabel) return `${name} - ${levelLabel}`;
  return name;
}

export function sortClassesByLevel<T extends { education_level?: string; name: string }>(classes: T[]): T[] {
  return [...classes].sort((a, b) => {
    const levelDiff = getEducationLevelOrder(a.education_level || '') - getEducationLevelOrder(b.education_level || '');
    if (levelDiff !== 0) return levelDiff;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

// Delay helper para debounce
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Local storage helpers com try-catch
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Error saving to localStorage');
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    console.error('Error removing from localStorage');
  }
}

// Criar datetime ISO em horario de Brasilia (UTC-3)
// O sistema e para uso no Brasil, entao todas as datas sao interpretadas como horario de Brasilia
// independente de onde o usuario esteja acessando
// Brasil aboliu horario de verao em 2019, entao e sempre UTC-3
export function createBrazilDateTimeISO(dateStr: string, timeStr: string): string {
  // Formato: YYYY-MM-DDTHH:MM:00-03:00
  return `${dateStr}T${timeStr}:00-03:00`;
}

// === MODO ADMIN (Professor Mode) ===
export const ADMIN_MODE_KEY = 'focus_admin_mode';
export type AdminMode = 'admin' | 'professor';

export function getAdminMode(): AdminMode {
  return getFromStorage<AdminMode>(ADMIN_MODE_KEY, 'admin');
}

export function setAdminMode(mode: AdminMode): void {
  setToStorage(ADMIN_MODE_KEY, mode);
}

// Ano letivo atual (considerando que ano letivo comeca em fevereiro)
export function getCurrentAcademicYear(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  // Se for janeiro, ainda considera o ano anterior como ano letivo
  return month === 0 ? year - 1 : year;
}

// Gerar anos para select (ano atual + proximos 2 anos)
export function getAcademicYearOptions(): number[] {
  const current = getCurrentAcademicYear();
  return [current - 1, current, current + 1, current + 2];
}
