// SEDU-ES PDF parser (Secretaria de Educação do Espírito Santo)
// Deterministic regex-based parser for "Relatório de Alunos por Turma" PDFs.
// Translated from the Python script that successfully parsed 449 students.

import type { ParseResult, ParsedClass, ParsedStudent } from './types';

// Map SEDU-ES shift codes to system shift values
const SHIFT_MAP: Record<string, string> = {
  V: 'vespertino',
  M: 'matutino',
  N: 'noturno',
  I: 'integral',
};

// Determine education level from grade number and suffix
function getEducationLevel(grade: number, suffix: string): string {
  if (suffix === 'EM') return 'medio';
  // EF = Ensino Fundamental
  if (grade >= 1 && grade <= 5) return 'fundamental_i';
  if (grade >= 6 && grade <= 9) return 'fundamental_ii';
  return 'fundamental_i';
}

// Build system class name from parsed data (e.g. "1º V01")
function buildClassName(grade: number, section: string): string {
  return `${grade}º ${section}`;
}

/**
 * Parse SEDU-ES "Relatório de Alunos por Turma" PDF text.
 *
 * The PDF format has:
 * - Turma headers like "Turma: 1ºV01-EF" or "Turma: 6ºM01-EF"
 * - Student records: 5-7 digit ID, optional INEP (10+ digits), full name in ALL CAPS, birth date DD/MM/YYYY
 * - Names can span multiple lines
 * - INEP codes can overflow between lines
 *
 * @param pages Array of page text strings from extractTextFromPdf
 */
export function parseSeduEsPdf(pages: string[]): ParseResult {
  const warnings: string[] = [];
  const classesMap = new Map<string, ParsedClass>();

  // Join all pages into lines for processing
  const allText = pages.join('\n');
  const lines = allText.split('\n');

  let currentTurma: string | null = null;
  let currentGrade = 0;
  let currentSection = '';
  let currentShift = '';
  let currentEducationLevel = '';

  // Accumulator for multi-line student name parsing
  let pendingStudentId = '';
  let pendingNameParts: string[] = [];

  const flushPendingStudent = () => {
    if (!pendingStudentId || !currentTurma) return;

    const fullName = pendingNameParts.join(' ').trim();
    if (!fullName) {
      pendingStudentId = '';
      pendingNameParts = [];
      return;
    }

    // Clean up name: remove trailing numbers, extra spaces
    const cleanName = fullName
      .replace(/\s+/g, ' ')
      .replace(/\s*\d{2}\/\d{2}\/\d{4}.*$/, '') // Remove date and anything after
      .trim();

    if (cleanName) {
      if (!classesMap.has(currentTurma)) {
        classesMap.set(currentTurma, {
          turmaRaw: currentTurma,
          grade: String(currentGrade),
          section: currentSection,
          shift: currentShift,
          educationLevel: currentEducationLevel,
          name: buildClassName(currentGrade, currentSection),
          students: [],
        });
      }

      classesMap.get(currentTurma)!.students.push({
        name: cleanName,
        registration: pendingStudentId,
      });
    }

    pendingStudentId = '';
    pendingNameParts = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for turma header: "Turma: 1ºV01-EF" or "Turma: 6ºM01-EF"
    const turmaMatch = line.match(/Turma:\s*(\d+)[ºª°]?\s*([VMNI]\d+)\s*[-–]\s*(EF|EM)/i);
    if (turmaMatch) {
      // Flush any pending student before switching turma
      flushPendingStudent();

      const grade = parseInt(turmaMatch[1], 10);
      const sectionCode = turmaMatch[2].toUpperCase(); // e.g. "V01", "M02"
      const suffix = turmaMatch[3].toUpperCase(); // "EF" or "EM"
      const shiftLetter = sectionCode[0]; // V, M, N, I

      currentGrade = grade;
      currentSection = sectionCode;
      currentShift = SHIFT_MAP[shiftLetter] || 'matutino';
      currentEducationLevel = getEducationLevel(grade, suffix);
      currentTurma = `${grade}${sectionCode}-${suffix}`;

      // Initialize class entry if not exists
      if (!classesMap.has(currentTurma)) {
        classesMap.set(currentTurma, {
          turmaRaw: currentTurma,
          grade: String(grade),
          section: sectionCode,
          shift: currentShift,
          educationLevel: currentEducationLevel,
          name: buildClassName(grade, sectionCode),
          students: [],
        });
      }
      continue;
    }

    if (!currentTurma) continue;

    // Check for student ID at start of line (5-7 digit number)
    const studentIdMatch = line.match(/^(\d{5,7})\s+/);
    if (studentIdMatch) {
      // Flush previous student
      flushPendingStudent();

      pendingStudentId = studentIdMatch[1];
      let rest = line.substring(studentIdMatch[0].length);

      // Skip INEP code if present (10+ digits)
      const inepMatch = rest.match(/^(\d{10,})\s*/);
      if (inepMatch) {
        rest = rest.substring(inepMatch[0].length);
      }

      // Check if rest contains a date (DD/MM/YYYY) - means name is complete on this line
      const dateMatch = rest.match(/^(.*?)\s+(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        pendingNameParts = [dateMatch[1].trim()];
        flushPendingStudent();
      } else {
        // Name might continue on next line(s)
        pendingNameParts = [rest.trim()];
      }
      continue;
    }

    // If we have a pending student, this line might be a continuation
    if (pendingStudentId) {
      const trimmed = line.trim();

      // Check if this is a new turma header or another student ID
      if (/^Turma:/i.test(trimmed) || /^\d{5,7}\s+/.test(trimmed)) {
        // This line starts something new - flush current and reprocess
        flushPendingStudent();
        i--; // Reprocess this line
        continue;
      }

      // Skip known headers/footers
      if (
        /^(Relatório|Página|Total|Data|Matrícula|Nº|Nome|Nasc)/i.test(trimmed) ||
        /^ESCOLA|^SECRETARIA|^GOVERNO/i.test(trimmed) ||
        trimmed === '' ||
        /^\d+$/.test(trimmed) // Just page numbers
      ) {
        continue;
      }

      // Check if this line has an INEP code that overflowed from previous line
      const inepOverflow = trimmed.match(/^(\d{10,})\s*(.*)/);
      if (inepOverflow) {
        // Skip the INEP, keep the rest as name part
        const restAfterInep = inepOverflow[2].trim();
        if (restAfterInep) {
          const dateInRest = restAfterInep.match(/^(.*?)\s+(\d{2}\/\d{2}\/\d{4})/);
          if (dateInRest) {
            pendingNameParts.push(dateInRest[1].trim());
            flushPendingStudent();
          } else {
            pendingNameParts.push(restAfterInep);
          }
        }
        continue;
      }

      // Check if line contains a date (end of name)
      const dateInLine = trimmed.match(/^(.*?)\s+(\d{2}\/\d{2}\/\d{4})/);
      if (dateInLine) {
        if (dateInLine[1].trim()) {
          pendingNameParts.push(dateInLine[1].trim());
        }
        flushPendingStudent();
        continue;
      }

      // Otherwise, accumulate as name part (multi-line name)
      if (trimmed && /[A-Z]/.test(trimmed)) {
        pendingNameParts.push(trimmed);
      }
    }
  }

  // Flush last pending student
  flushPendingStudent();

  // Convert map to sorted array
  const classes = Array.from(classesMap.values()).sort((a, b) => {
    const gradeA = parseInt(a.grade);
    const gradeB = parseInt(b.grade);
    if (gradeA !== gradeB) return gradeA - gradeB;
    return a.section.localeCompare(b.section);
  });

  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

  if (classes.length === 0) {
    warnings.push('Nenhuma turma encontrada no PDF. Verifique se o formato é SEDU-ES.');
  }

  return {
    classes,
    totalStudents,
    format: 'sedu-es',
    warnings,
  };
}
