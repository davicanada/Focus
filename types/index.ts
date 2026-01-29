// Tipos base do sistema Focus - Gestao Escolar

export type UserRole = 'master' | 'admin' | 'professor' | 'admin_viewer';

export type AccessRequestType = 'admin_new' | 'admin_existing' | 'professor' | 'admin_viewer';

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export type EducationLevel = 'infantil' | 'fundamental' | 'medio' | 'custom';

export type PeriodType = 'bimestre' | 'trimestre' | 'semestre';

export interface Institution {
  id: string;
  name: string;
  slug: string;
  // Address fields
  full_address?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  state_code?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_master: boolean;
  // Soft delete fields
  deleted_at?: string;
  deactivation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface UserInstitution {
  id: string;
  user_id: string;
  institution_id: string;
  role: UserRole;
  is_active: boolean;
  // Soft delete fields
  deleted_at?: string;
  created_at: string;
}

export interface Class {
  id: string;
  institution_id: string;
  school_year_id?: string; // Referência ao ano letivo
  name: string;
  education_level: EducationLevel;
  grade?: string;
  section?: string;
  shift?: string;
  year: number;
  is_active: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos opcionais
  school_year?: SchoolYear;
}

export interface Student {
  id: string;
  institution_id: string;
  class_id: string;
  full_name: string;
  enrollment_number?: string;
  birth_date?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  notes?: string;
  is_active: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos opcionais
  class?: Class;
}

export interface OccurrenceType {
  id: string;
  institution_id: string;
  category: string; // Tipo da ocorrencia (Atraso, Briga, etc.)
  severity: 'leve' | 'media' | 'grave';
  description?: string;
  is_active: boolean;
  deleted_at?: string; // Soft delete
  created_at: string;
  updated_at: string;
}

export interface Occurrence {
  id: string;
  institution_id: string;
  student_id: string;
  occurrence_type_id: string;
  registered_by: string;
  occurrence_date: string;
  description?: string;
  class_id_at_occurrence?: string; // Turma do aluno no momento da ocorrência (preserva histórico)
  // Soft delete fields
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos opcionais
  student?: Student;
  occurrence_type?: OccurrenceType;
  registered_by_user?: User;
  class_at_occurrence?: Class; // JOIN opcional com a turma histórica
}

export interface Quarter {
  id: string;
  institution_id: string;
  name: string;
  start_date: string;
  end_date: string;
  period_type?: PeriodType;
  period_number?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessRequest {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  request_type: AccessRequestType;
  institution_id?: string;
  // New institution fields (for admin_new requests)
  institution_name?: string;
  institution_full_address?: string;
  institution_street?: string;
  institution_number?: string;
  institution_neighborhood?: string;
  institution_city?: string;
  institution_state?: string;
  institution_state_code?: string;
  institution_postal_code?: string;
  institution_country?: string;
  institution_latitude?: number;
  institution_longitude?: number;
  message?: string;
  status: AccessRequestStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface SystemLog {
  id: string;
  user_id?: string;
  institution_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Tipos para sistema de alertas
export type AlertScopeType = 'student' | 'class' | 'institution';
export type AlertFilterType = 'occurrence_type' | 'severity' | 'any';
export type AlertNotifyTarget = 'self' | 'all_admins';

export interface AlertRule {
  id: string;
  institution_id: string;
  created_by: string;
  name: string;
  description?: string;

  // Escopo
  scope_type: AlertScopeType;
  scope_student_id?: string;
  scope_class_id?: string;

  // Filtro
  filter_type: AlertFilterType;
  filter_occurrence_type_id?: string;
  filter_severity?: 'leve' | 'media' | 'grave';

  // Threshold
  is_immediate: boolean; // Se true, alerta a cada ocorrencia
  threshold_count: number;
  threshold_period_days: number | null; // null para alertas imediatos

  // Notificacao
  notify_target: AlertNotifyTarget; // 'self' ou 'all_admins'

  // Status
  is_active: boolean;
  last_triggered_at?: string;
  trigger_count: number;

  created_at: string;
  updated_at: string;

  // Joins opcionais
  student?: Student;
  class?: Class;
  occurrence_type?: OccurrenceType;
  created_by_user?: User;
}

export interface AlertNotification {
  id: string;
  alert_rule_id: string;
  institution_id: string;
  triggered_by_occurrence_id?: string;
  triggered_at: string;
  rule_name: string;
  message: string;
  occurrence_count: number;
  is_read: boolean;
  read_at?: string;
  read_by?: string;
  created_at: string;

  // Joins opcionais
  alert_rule?: AlertRule;
  occurrence?: Occurrence;
}

export interface AlertRuleFormData {
  name: string;
  description?: string;
  scope_type: AlertScopeType;
  scope_student_id?: string;
  scope_class_id?: string;
  filter_type: AlertFilterType;
  filter_occurrence_type_id?: string;
  filter_severity?: 'leve' | 'media' | 'grave';
  is_immediate: boolean;
  threshold_count: number;
  threshold_period_days: number | null;
  notify_target: AlertNotifyTarget;
}

// Tipos para sistema de anos letivos
export type EnrollmentStatus = 'active' | 'transferred' | 'graduated' | 'dropped' | 'promoted';

export interface SchoolYear {
  id: string;
  institution_id: string;
  year: number;
  name?: string; // Ex: "Ano Letivo 2025"
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  is_archived: boolean;
  archived_at?: string;
  archived_by?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos opcionais
  institution?: Institution;
  archived_by_user?: User;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  school_year_id: string;
  institution_id: string;
  enrollment_date?: string;
  status: EnrollmentStatus;
  status_changed_at?: string;
  status_changed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos opcionais
  student?: Student;
  class?: Class;
  school_year?: SchoolYear;
  status_changed_by_user?: User;
}

export interface SchoolYearFormData {
  year: number;
  name?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
}

export interface StudentEnrollmentFormData {
  student_id: string;
  class_id: string;
  school_year_id: string;
  enrollment_date?: string;
  status: EnrollmentStatus;
  notes?: string;
}

// Tipos para formularios
export interface LoginFormData {
  email: string;
  password: string;
}

export interface AccessRequestFormData {
  email: string;
  full_name: string;
  phone?: string;
  request_type: AccessRequestType;
  institution_id?: string;
  // New institution fields (for admin_new requests)
  institution_name?: string;
  institution_full_address?: string;
  institution_street?: string;
  institution_number?: string;
  institution_neighborhood?: string;
  institution_city?: string;
  institution_state?: string;
  institution_state_code?: string;
  institution_postal_code?: string;
  institution_country?: string;
  institution_latitude?: number;
  institution_longitude?: number;
  message?: string;
}

export interface StudentFormData {
  full_name: string;
  class_id: string;
  enrollment_number?: string;
  birth_date?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  notes?: string;
}

export interface ClassFormData {
  name: string;
  education_level: EducationLevel;
  grade?: string;
  section?: string;
  shift?: string;
  year: number;
}

export interface OccurrenceFormData {
  student_ids: string[];
  occurrence_type_id: string;
  occurrence_date: string;
  description?: string;
}

export interface TeacherFormData {
  full_name: string;
  email: string;
}

// Tipos para contexto de autenticacao
export interface AuthContext {
  user: User | null;
  currentInstitution: Institution | null;
  currentRole: UserRole | null;
  userInstitutions: (UserInstitution & { institution: Institution })[];
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchInstitution: (institutionId: string) => void;
  switchRole: (role: UserRole) => void;
}

// Tipos para dashboard
export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  totalOccurrences: number;
  occurrencesThisMonth: number;
  occurrencesByCategory: Record<string, number>; // Agrupado por tipo de ocorrencia (Atraso, Briga, etc.)
  occurrencesBySeverity: {
    leve: number;
    media: number;
    grave: number;
  };
  recentOccurrences: Occurrence[];
  topStudentsWithOccurrences: {
    student: Student;
    count: number;
  }[];
}

// Niveis de ensino do sistema brasileiro
export const EDUCATION_LEVELS: Record<EducationLevel, { label: string; allowClassSection: boolean }> = {
  infantil: { label: 'Educacao Infantil', allowClassSection: false },
  fundamental: { label: 'Ensino Fundamental', allowClassSection: true },
  medio: { label: 'Ensino Medio', allowClassSection: true },
  custom: { label: 'Outro', allowClassSection: true }
};

// Severidades de ocorrencia
export const OCCURRENCE_SEVERITIES = {
  leve: { label: 'Leve', color: 'yellow' },
  media: { label: 'Media', color: 'orange' },
  grave: { label: 'Grave', color: 'red' }
} as const;

// Estados brasileiros
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;
