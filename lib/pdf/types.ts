// Types for PDF import feature

export interface ParsedStudent {
  name: string;
  registration: string; // ID INEP or enrollment number
}

export interface ParsedClass {
  turmaRaw: string; // Original turma string from PDF (e.g. "1V01-EF")
  grade: string; // Grade code (e.g. "1", "2", "9")
  section: string; // Section with zero-padding (e.g. "V01", "M02")
  shift: string; // "matutino" | "vespertino" | "noturno" | "integral"
  educationLevel: string; // "fundamental_i" | "fundamental_ii" | "medio" | "infantil"
  name: string; // Generated class name (e.g. "1º V01")
  students: ParsedStudent[];
}

export interface ParseResult {
  classes: ParsedClass[];
  totalStudents: number;
  format: 'sedu-es' | 'ai';
  warnings: string[];
}

export interface ImportRequest {
  classes: ParsedClass[];
  institutionId: string;
  schoolYearId?: string;
  year: number;
}

export interface ImportResult {
  classesCreated: number;
  classesExisting: number;
  studentsCreated: number;
  studentsDuplicate: number;
  errors: string[];
}
