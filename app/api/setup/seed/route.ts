import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ============================================
// COLEGIO ESTADUAL PROFESSOR CARLOS DRUMMOND DE ANDRADE
// Belo Horizonte, MG - Inicio das aulas: 5 de Janeiro de 2026
// ============================================

// Usuarios de teste - Master + 2 Admins + 4 Professores
const TEST_USERS = [
  { email: 'davialmeida1996@gmail.com', password: 'Focus@123', full_name: 'Davi Almeida (Master)', is_master: true, role: 'master' as const },
  { email: 'admin1@drummond.edu.br', password: 'Focus@123', full_name: 'Maria Helena Santos', is_master: false, role: 'admin' as const },
  { email: 'admin2@drummond.edu.br', password: 'Focus@123', full_name: 'Roberto Oliveira Costa', is_master: false, role: 'admin' as const },
  { email: 'prof.ana@drummond.edu.br', password: 'Focus@123', full_name: 'Ana Paula Ferreira', is_master: false, role: 'professor' as const },
  { email: 'prof.carlos@drummond.edu.br', password: 'Focus@123', full_name: 'Carlos Eduardo Lima', is_master: false, role: 'professor' as const },
  { email: 'prof.fernanda@drummond.edu.br', password: 'Focus@123', full_name: 'Fernanda Rodrigues', is_master: false, role: 'professor' as const },
  { email: 'prof.jose@drummond.edu.br', password: 'Focus@123', full_name: 'Jose Ricardo Almeida', is_master: false, role: 'professor' as const },
];

// Dados da instituicao
const INSTITUTION_DATA = {
  name: 'Colegio Estadual Professor Carlos Drummond de Andrade',
  slug: 'cepcdandrade',
  full_address: 'Av. Amazonas, 5855 - Nova Suica, Belo Horizonte - MG, 30421-170',
  street: 'Av. Amazonas',
  number: '5855',
  neighborhood: 'Nova Suica',
  city: 'Belo Horizonte',
  state: 'MG', // char(2) in database
  state_code: 'MG',
  postal_code: '30421-170',
  country: 'Brasil',
  latitude: -19.9116,
  longitude: -43.9969,
  is_active: true,
};

// Turmas - 4 Ensino Fundamental + 2 Ensino Medio
const CLASSES_DATA = [
  { name: '8o Ano A - Matutino', education_level: 'fundamental' as const, grade: '8', section: 'A', shift: 'Matutino', year: 2026, student_count: 20 },
  { name: '8o Ano B - Vespertino', education_level: 'fundamental' as const, grade: '8', section: 'B', shift: 'Vespertino', year: 2026, student_count: 19 },
  { name: '9o Ano A - Matutino', education_level: 'fundamental' as const, grade: '9', section: 'A', shift: 'Matutino', year: 2026, student_count: 21 },
  { name: '9o Ano B - Matutino', education_level: 'fundamental' as const, grade: '9', section: 'B', shift: 'Matutino', year: 2026, student_count: 18 },
  { name: '1a Serie A - Matutino', education_level: 'medio' as const, grade: '1', section: 'A', shift: 'Matutino', year: 2026, student_count: 22 },
  { name: '1a Serie B - Vespertino', education_level: 'medio' as const, grade: '1', section: 'B', shift: 'Vespertino', year: 2026, student_count: 20 },
];

// Nomes brasileiros para gerar alunos
const FIRST_NAMES = [
  'Lucas', 'Sofia', 'Gabriel', 'Isabella', 'Pedro', 'Valentina', 'Davi', 'Helena', 'Arthur',
  'Laura', 'Miguel', 'Manuela', 'Bernardo', 'Alice', 'Theo', 'Cecilia', 'Nicolas', 'Julia',
  'Enzo', 'Maria', 'Henrique', 'Beatriz', 'Rafael', 'Ana', 'Matheus', 'Clara', 'Gustavo',
  'Livia', 'Felipe', 'Isabela', 'Samuel', 'Larissa', 'Bruno', 'Giovanna', 'Vinicius', 'Mariana',
  'Daniel', 'Leticia', 'Caio', 'Fernanda', 'Leonardo', 'Amanda', 'Rodrigo', 'Bruna', 'Eduardo',
  'Camila', 'Fernando', 'Carolina', 'Thiago', 'Juliana', 'Ricardo', 'Patricia', 'Alexandre',
  'Adriana', 'Joao', 'Natalia', 'Marcelo', 'Renata', 'Andre', 'Vanessa', 'Paulo', 'Tatiana',
  'Fabio', 'Priscila', 'Luciano', 'Raquel', 'Diego', 'Monica', 'Leandro', 'Sabrina',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Nascimento', 'Barbosa',
  'Moreira', 'Araujo', 'Fernandes', 'Cardoso', 'Melo', 'Rocha', 'Dias', 'Monteiro',
  'Mendes', 'Barros', 'Freitas', 'Vieira', 'Nunes', 'Campos', 'Teixeira', 'Castro',
  'Ramos', 'Machado', 'Reis', 'Pinto', 'Correia', 'Lopes', 'Moura', 'Azevedo',
];

// Funcao para gerar alunos aleatorios
function generateStudents(classIndex: number, count: number, startEnrollment: number): Array<{ full_name: string; enrollment_number: string; class_index: number }> {
  const students = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let fullName = '';
    // Garantir nome unico
    do {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName1 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const lastName2 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      fullName = `${firstName} ${lastName1} ${lastName2}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    students.push({
      full_name: fullName,
      enrollment_number: `2026${String(startEnrollment + i).padStart(3, '0')}`,
      class_index: classIndex,
    });
  }
  return students;
}

// Gerar todos os alunos (120 total)
const STUDENTS_DATA: Array<{ full_name: string; enrollment_number: string; class_index: number }> = [];
let enrollmentCounter = 1;
CLASSES_DATA.forEach((classData, index) => {
  const students = generateStudents(index, classData.student_count, enrollmentCounter);
  STUDENTS_DATA.push(...students);
  enrollmentCounter += classData.student_count;
});

// Tipos de ocorrencia
const OCCURRENCE_TYPES_DATA = [
  { category: 'Atraso', severity: 'leve' as const, description: 'Chegada apos o horario de inicio da aula', notify_admin: false },
  { category: 'Conversa Durante Aula', severity: 'leve' as const, description: 'Conversa excessiva durante a explicacao', notify_admin: false },
  { category: 'Uso de Celular', severity: 'leve' as const, description: 'Uso de celular em horario nao permitido', notify_admin: false },
  { category: 'Falta de Material', severity: 'leve' as const, description: 'Aluno veio sem o material necessario para a aula', notify_admin: false },
  { category: 'Desrespeito ao Professor', severity: 'media' as const, description: 'Comportamento desrespeitoso com o professor', notify_admin: true },
  { category: 'Briga Verbal', severity: 'media' as const, description: 'Discussao ou briga verbal com colega', notify_admin: true },
  { category: 'Briga Fisica', severity: 'grave' as const, description: 'Envolvimento em conflito fisico', notify_admin: true },
  { category: 'Vandalismo', severity: 'grave' as const, description: 'Dano intencional ao patrimonio escolar', notify_admin: true },
];

// Bimestres 2026
const QUARTERS_DATA = [
  { name: '1o Bimestre 2026', start_date: '2026-01-05', end_date: '2026-03-27' },
  { name: '2o Bimestre 2026', start_date: '2026-04-06', end_date: '2026-06-26' },
  { name: '3o Bimestre 2026', start_date: '2026-07-13', end_date: '2026-09-25' },
  { name: '4o Bimestre 2026', start_date: '2026-10-05', end_date: '2026-12-18' },
];

// Gerar ocorrencias realistas para Janeiro de 2026 (5 a 24 de Janeiro = 14 dias uteis)
function generateOccurrences(
  studentIds: string[],
  typeIds: string[],
  professorIds: string[]
): Array<{ student_id: string; type_id: string; professor_id: string; date: string; description: string }> {
  const occurrences: Array<{ student_id: string; type_id: string; professor_id: string; date: string; description: string }> = [];

  // Dias uteis de Janeiro 2026 (5 a 24, excluindo fins de semana)
  const weekdays = [
    '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', // Seg-Sex
    '2026-01-12', '2026-01-13', '2026-01-14', '2026-01-15', '2026-01-16', // Seg-Sex
    '2026-01-19', '2026-01-20', '2026-01-21', '2026-01-22', '2026-01-23', '2026-01-24', // Seg-Sab (considerando sabado letivo)
  ];

  // Descricoes por tipo de ocorrencia
  const descriptions: { [key: number]: string[] } = {
    0: [ // Atraso
      'Chegou 10 minutos atrasado',
      'Chegou 15 minutos apos o inicio da aula',
      'Atraso de 20 minutos, alegou problema no transporte',
      'Chegou atrasado novamente',
      'Atraso na primeira aula',
    ],
    1: [ // Conversa Durante Aula
      'Conversando durante a explicacao',
      'Nao parou de conversar mesmo apos advertencia',
      'Conversa excessiva atrapalhando a aula',
      'Conversando com colega durante exercicio',
      'Disturbio por conversa paralela',
    ],
    2: [ // Uso de Celular
      'Usando celular durante a aula',
      'Celular tocou durante a explicacao',
      'Flagrado usando celular durante prova',
      'Usando fones de ouvido em sala',
      'Mexendo no celular escondido',
    ],
    3: [ // Falta de Material
      'Nao trouxe o livro didatico',
      'Esqueceu o caderno',
      'Veio sem material de matematica',
      'Sem caneta e lapis',
      'Esqueceu a calculadora para a prova',
    ],
    4: [ // Desrespeito ao Professor
      'Respondeu de forma grosseira ao professor',
      'Tom de voz inadequado com o docente',
      'Ignorou advertencia do professor',
      'Comentario desrespeitoso durante a aula',
      'Atitude debochada com o professor',
    ],
    5: [ // Briga Verbal
      'Discussao acalorada com colega',
      'Troca de ofensas verbais',
      'Briga verbal no intervalo',
      'Discussao que atrapalhou a aula',
      'Conflito verbal com colega de classe',
    ],
    6: [ // Briga Fisica
      'Envolvido em briga no patio',
      'Agressao fisica a colega',
      'Empurrou colega durante o intervalo',
      'Briga durante a aula de educacao fisica',
    ],
    7: [ // Vandalismo
      'Riscou a carteira',
      'Quebrou material escolar',
      'Pichou parede do banheiro',
      'Danificou equipamento do laboratorio',
    ],
  };

  // Distribuicao de ocorrencias por tipo (mais leves, menos graves)
  const typeDistribution = [
    { typeIndex: 0, count: 18 }, // Atraso - 18
    { typeIndex: 1, count: 15 }, // Conversa - 15
    { typeIndex: 2, count: 12 }, // Celular - 12
    { typeIndex: 3, count: 10 }, // Falta Material - 10
    { typeIndex: 4, count: 6 },  // Desrespeito - 6
    { typeIndex: 5, count: 5 },  // Briga Verbal - 5
    { typeIndex: 6, count: 2 },  // Briga Fisica - 2
    { typeIndex: 7, count: 2 },  // Vandalismo - 2
  ];

  const usedCombinations = new Set<string>();

  for (const dist of typeDistribution) {
    const typeId = typeIds[dist.typeIndex];
    if (!typeId) continue;

    for (let i = 0; i < dist.count; i++) {
      // Escolher aluno aleatorio
      let studentId = '';
      let date = '';
      let key = '';

      // Evitar mesma combinacao aluno+tipo+data
      let attempts = 0;
      do {
        studentId = studentIds[Math.floor(Math.random() * studentIds.length)];
        date = weekdays[Math.floor(Math.random() * weekdays.length)];
        key = `${studentId}-${dist.typeIndex}-${date}`;
        attempts++;
      } while (usedCombinations.has(key) && attempts < 100);

      if (attempts >= 100) continue;
      usedCombinations.add(key);

      // Escolher professor aleatorio
      const professorId = professorIds[Math.floor(Math.random() * professorIds.length)];

      // Escolher descricao aleatoria
      const typeDescriptions = descriptions[dist.typeIndex] || ['Ocorrencia registrada'];
      const description = typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];

      occurrences.push({
        student_id: studentId,
        type_id: typeId,
        professor_id: professorId,
        date,
        description,
      });
    }
  }

  return occurrences;
}

export async function POST() {
  const report: {
    users: { created: string[]; skipped: string[]; errors: string[] };
    institution: { created: string | null; skipped: string | null; error: string | null };
    user_institutions: { created: number; errors: string[] };
    classes: { created: string[]; errors: string[] };
    students: { created: number; errors: string[] };
    occurrence_types: { created: string[]; errors: string[] };
    quarters: { created: string[]; errors: string[] };
    occurrences: { created: number; errors: string[] };
  } = {
    users: { created: [], skipped: [], errors: [] },
    institution: { created: null, skipped: null, error: null },
    user_institutions: { created: 0, errors: [] },
    classes: { created: [], errors: [] },
    students: { created: 0, errors: [] },
    occurrence_types: { created: [], errors: [] },
    quarters: { created: [], errors: [] },
    occurrences: { created: 0, errors: [] },
  };

  try {
    const supabase = createServiceClient();
    const createdUserIds: { [email: string]: string } = {};
    let institutionId: string | null = null;
    const createdClassIds: string[] = [];
    const createdStudentIds: string[] = [];
    const createdOccurrenceTypeIds: string[] = [];
    const professorIds: string[] = [];

    // ============================================
    // 1. CRIAR USUARIOS DE AUTENTICACAO E NA TABELA USERS
    // ============================================
    for (const userData of TEST_USERS) {
      try {
        // Tentar criar usuario no Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
        });

        if (authError) {
          // Verificar se usuario ja existe
          if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
            // Buscar o usuario existente
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === userData.email);

            if (existingUser) {
              createdUserIds[userData.email] = existingUser.id;
              if (userData.role === 'professor') {
                professorIds.push(existingUser.id);
              }
              report.users.skipped.push(`${userData.email} (ja existe)`);

              // Verificar se o usuario existe na tabela users
              const { data: existingDbUser } = await supabase
                .from('users')
                .select('id')
                .eq('id', existingUser.id)
                .single();

              if (!existingDbUser) {
                // Criar registro na tabela users
                const { error: insertError } = await supabase.from('users').insert({
                  id: existingUser.id,
                  email: userData.email,
                  full_name: userData.full_name,
                  is_master: userData.is_master,
                  is_active: true,
                });

                if (insertError) {
                  report.users.errors.push(`Erro ao inserir ${userData.email} na tabela users: ${insertError.message}`);
                }
              }
            } else {
              report.users.errors.push(`${userData.email}: ${authError.message}`);
            }
            continue;
          }

          report.users.errors.push(`${userData.email}: ${authError.message}`);
          continue;
        }

        if (authData?.user) {
          createdUserIds[userData.email] = authData.user.id;
          if (userData.role === 'professor') {
            professorIds.push(authData.user.id);
          }

          // Criar registro na tabela users
          const { error: insertError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            is_master: userData.is_master,
            is_active: true,
          });

          if (insertError) {
            report.users.errors.push(`Erro ao inserir ${userData.email} na tabela users: ${insertError.message}`);
          } else {
            report.users.created.push(userData.email);
          }
        }
      } catch (err) {
        report.users.errors.push(`${userData.email}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
    }

    // ============================================
    // 2. CRIAR INSTITUICAO
    // ============================================
    try {
      // Verificar se instituicao ja existe
      const { data: existingInstitution } = await supabase
        .from('institutions')
        .select('id')
        .eq('slug', INSTITUTION_DATA.slug)
        .single();

      if (existingInstitution) {
        institutionId = existingInstitution.id;
        report.institution.skipped = `${INSTITUTION_DATA.name} (ja existe)`;
      } else {
        const { data: newInstitution, error: instError } = await supabase
          .from('institutions')
          .insert(INSTITUTION_DATA)
          .select('id')
          .single();

        if (instError) {
          report.institution.error = instError.message;
        } else if (newInstitution) {
          institutionId = newInstitution.id;
          report.institution.created = INSTITUTION_DATA.name;
        }
      }
    } catch (err) {
      report.institution.error = err instanceof Error ? err.message : 'Erro desconhecido';
    }

    // ============================================
    // 3. CRIAR VINCULOS USER_INSTITUTIONS
    // ============================================
    if (institutionId) {
      for (const userData of TEST_USERS) {
        const userId = createdUserIds[userData.email];
        if (!userId || userData.is_master) continue; // Master nao precisa de vinculo

        try {
          // Verificar se vinculo ja existe
          const { data: existingLink } = await supabase
            .from('user_institutions')
            .select('id')
            .eq('user_id', userId)
            .eq('institution_id', institutionId)
            .single();

          if (!existingLink) {
            const { error: linkError } = await supabase.from('user_institutions').insert({
              user_id: userId,
              institution_id: institutionId,
              role: userData.role,
              is_active: true,
            });

            if (linkError) {
              report.user_institutions.errors.push(`${userData.email}: ${linkError.message}`);
            } else {
              report.user_institutions.created++;
            }
          }
        } catch (err) {
          report.user_institutions.errors.push(`${userData.email}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }
    }

    // ============================================
    // 4. CRIAR TURMAS
    // ============================================
    if (institutionId) {
      for (const classData of CLASSES_DATA) {
        try {
          // Verificar se turma ja existe
          const { data: existingClass } = await supabase
            .from('classes')
            .select('id')
            .eq('institution_id', institutionId)
            .eq('name', classData.name)
            .eq('year', classData.year)
            .single();

          if (existingClass) {
            createdClassIds.push(existingClass.id);
          } else {
            const { data: newClass, error: classError } = await supabase
              .from('classes')
              .insert({
                institution_id: institutionId,
                name: classData.name,
                education_level: classData.education_level,
                grade: classData.grade,
                section: classData.section,
                shift: classData.shift,
                year: classData.year,
                is_active: true,
              })
              .select('id')
              .single();

            if (classError) {
              report.classes.errors.push(`${classData.name}: ${classError.message}`);
              createdClassIds.push(''); // placeholder para manter indices
            } else if (newClass) {
              createdClassIds.push(newClass.id);
              report.classes.created.push(classData.name);
            }
          }
        } catch (err) {
          report.classes.errors.push(`${classData.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
          createdClassIds.push(''); // placeholder
        }
      }
    }

    // ============================================
    // 5. CRIAR ALUNOS
    // ============================================
    if (institutionId && createdClassIds.length > 0) {
      for (const studentData of STUDENTS_DATA) {
        const classId = createdClassIds[studentData.class_index];
        if (!classId) continue;

        try {
          // Verificar se aluno ja existe
          const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('institution_id', institutionId)
            .eq('enrollment_number', studentData.enrollment_number)
            .single();

          if (existingStudent) {
            createdStudentIds.push(existingStudent.id);
          } else {
            const { data: newStudent, error: studentError } = await supabase
              .from('students')
              .insert({
                institution_id: institutionId,
                class_id: classId,
                full_name: studentData.full_name,
                enrollment_number: studentData.enrollment_number,
                is_active: true,
              })
              .select('id')
              .single();

            if (studentError) {
              report.students.errors.push(`${studentData.full_name}: ${studentError.message}`);
            } else if (newStudent) {
              createdStudentIds.push(newStudent.id);
              report.students.created++;
            }
          }
        } catch (err) {
          report.students.errors.push(`${studentData.full_name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }
    }

    // ============================================
    // 6. CRIAR TIPOS DE OCORRENCIA
    // ============================================
    if (institutionId) {
      for (const typeData of OCCURRENCE_TYPES_DATA) {
        try {
          // Verificar se tipo ja existe
          const { data: existingType } = await supabase
            .from('occurrence_types')
            .select('id')
            .eq('institution_id', institutionId)
            .eq('category', typeData.category)
            .single();

          if (existingType) {
            createdOccurrenceTypeIds.push(existingType.id);
          } else {
            const { data: newType, error: typeError } = await supabase
              .from('occurrence_types')
              .insert({
                institution_id: institutionId,
                ...typeData,
                is_active: true,
              })
              .select('id')
              .single();

            if (typeError) {
              report.occurrence_types.errors.push(`${typeData.category}: ${typeError.message}`);
              createdOccurrenceTypeIds.push(''); // placeholder
            } else if (newType) {
              createdOccurrenceTypeIds.push(newType.id);
              report.occurrence_types.created.push(typeData.category);
            }
          }
        } catch (err) {
          report.occurrence_types.errors.push(`${typeData.category}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
          createdOccurrenceTypeIds.push(''); // placeholder
        }
      }
    }

    // ============================================
    // 7. CRIAR BIMESTRES
    // ============================================
    if (institutionId) {
      for (const quarterData of QUARTERS_DATA) {
        try {
          // Verificar se bimestre ja existe
          const { data: existingQuarter } = await supabase
            .from('quarters')
            .select('id')
            .eq('institution_id', institutionId)
            .eq('name', quarterData.name)
            .single();

          if (!existingQuarter) {
            const { error: quarterError } = await supabase.from('quarters').insert({
              institution_id: institutionId,
              ...quarterData,
              is_active: true,
            });

            if (quarterError) {
              report.quarters.errors.push(`${quarterData.name}: ${quarterError.message}`);
            } else {
              report.quarters.created.push(quarterData.name);
            }
          }
        } catch (err) {
          report.quarters.errors.push(`${quarterData.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }
    }

    // ============================================
    // 8. CRIAR OCORRENCIAS
    // ============================================
    if (institutionId && createdStudentIds.length > 0 && createdOccurrenceTypeIds.length > 0 && professorIds.length > 0) {
      const occurrencesData = generateOccurrences(
        createdStudentIds,
        createdOccurrenceTypeIds,
        professorIds
      );

      for (const occData of occurrencesData) {
        try {
          const { error: occError } = await supabase.from('occurrences').insert({
            institution_id: institutionId,
            student_id: occData.student_id,
            occurrence_type_id: occData.type_id,
            registered_by: occData.professor_id,
            occurrence_date: occData.date,
            description: occData.description,
          });

          if (occError) {
            report.occurrences.errors.push(`Ocorrencia ${occData.date}: ${occError.message}`);
          } else {
            report.occurrences.created++;
          }
        } catch (err) {
          report.occurrences.errors.push(`Ocorrencia: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seed executado com sucesso!',
      summary: {
        institution: INSTITUTION_DATA.name,
        users: `${TEST_USERS.length} usuarios (1 master, 2 admins, 4 professores)`,
        classes: `${CLASSES_DATA.length} turmas`,
        students: `${STUDENTS_DATA.length} alunos`,
        occurrence_types: `${OCCURRENCE_TYPES_DATA.length} tipos`,
        occurrences: `${report.occurrences.created} ocorrencias`,
      },
      report,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Erro ao executar seed',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      report,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para executar o seed de dados de teste',
    description: 'Colegio Estadual Professor Carlos Drummond de Andrade - Belo Horizonte/MG',
    data: {
      users: TEST_USERS.map(u => ({ email: u.email, role: u.role, name: u.full_name })),
      institution: INSTITUTION_DATA.name,
      classes: CLASSES_DATA.map(c => ({ name: c.name, students: c.student_count })),
      total_students: STUDENTS_DATA.length,
      occurrence_types: OCCURRENCE_TYPES_DATA.map(t => ({ category: t.category, severity: t.severity })),
      quarters: QUARTERS_DATA.map(q => q.name),
    }
  });
}
