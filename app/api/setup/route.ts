import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Address columns for institutions table
const INSTITUTIONS_ADDRESS_COLUMNS = [
  'full_address',
  'street',
  'number',
  'neighborhood',
  'state_code',
  'postal_code',
  'country',
  'latitude',
  'longitude',
];

// Address columns for access_requests table
const ACCESS_REQUESTS_ADDRESS_COLUMNS = [
  'institution_full_address',
  'institution_street',
  'institution_number',
  'institution_neighborhood',
  'institution_state_code',
  'institution_postal_code',
  'institution_country',
  'institution_latitude',
  'institution_longitude',
];

// SQL for adding address columns to institutions
const ADD_INSTITUTIONS_ADDRESS_COLUMNS_SQL = `
  ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS full_address TEXT,
  ADD COLUMN IF NOT EXISTS street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state_code CHAR(2),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
`;

// SQL for updating state_code from state in institutions
const UPDATE_INSTITUTIONS_STATE_CODE_SQL = `
  UPDATE institutions
  SET state_code = state
  WHERE state_code IS NULL AND state IS NOT NULL;
`;

// SQL for adding address columns to access_requests
const ADD_ACCESS_REQUESTS_ADDRESS_COLUMNS_SQL = `
  ALTER TABLE access_requests
  ADD COLUMN IF NOT EXISTS institution_full_address TEXT,
  ADD COLUMN IF NOT EXISTS institution_street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS institution_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS institution_neighborhood VARCHAR(100),
  ADD COLUMN IF NOT EXISTS institution_state_code CHAR(2),
  ADD COLUMN IF NOT EXISTS institution_postal_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS institution_country VARCHAR(100) DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS institution_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS institution_longitude DECIMAL(11, 8);
`;

// SQL for updating institution_state_code from institution_state in access_requests
const UPDATE_ACCESS_REQUESTS_STATE_CODE_SQL = `
  UPDATE access_requests
  SET institution_state_code = institution_state
  WHERE institution_state_code IS NULL AND institution_state IS NOT NULL;
`;

// SQL for creating geolocation index
const CREATE_GEOLOCATION_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_institutions_location ON institutions(latitude, longitude);
`;

interface MigrationResult {
  tables: {
    institutions: boolean;
    access_requests: boolean;
    users: boolean;
    user_institutions: boolean;
    classes: boolean;
    students: boolean;
    occurrence_types: boolean;
    occurrences: boolean;
    quarters: boolean;
    system_logs: boolean;
  };
  addressColumns: {
    institutions: {
      existing: string[];
      missing: string[];
      added: boolean;
    };
    access_requests: {
      existing: string[];
      missing: string[];
      added: boolean;
    };
  };
  migrations: {
    institutionsAddressColumns: boolean;
    accessRequestsAddressColumns: boolean;
    geolocationIndex: boolean;
  };
  errors: string[];
}

async function checkTableExists(
  supabase: ReturnType<typeof createServiceClient>,
  tableName: string
): Promise<boolean> {
  try {
    // Try to query the table with a limit of 0 to check if it exists
    const { error } = await supabase.from(tableName).select('*').limit(0);
    return !error;
  } catch {
    return false;
  }
}

async function getTableColumns(
  supabase: ReturnType<typeof createServiceClient>,
  tableName: string
): Promise<string[]> {
  try {
    // Query the information_schema to get column names
    const { data, error } = await supabase.rpc('get_table_columns', {
      p_table_name: tableName,
    });

    if (error) {
      // Fallback: try to get columns by querying the table
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (sampleError || !sampleData || sampleData.length === 0) {
        // If we can't get a sample, try an empty query to get column info
        const { data: emptyData } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);

        if (emptyData) {
          return Object.keys(emptyData[0] || {});
        }
        return [];
      }

      return Object.keys(sampleData[0]);
    }

    return (data as { column_name: string }[]).map((col) => col.column_name);
  } catch {
    return [];
  }
}

async function runMigrationSQL(
  supabase: ReturnType<typeof createServiceClient>,
  sql: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If the RPC doesn't exist, we'll return a specific error
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return {
          success: false,
          error: 'A funcao exec_sql nao existe. Execute a migracao manualmente no Supabase SQL Editor.'
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export async function POST() {
  const result: MigrationResult = {
    tables: {
      institutions: false,
      access_requests: false,
      users: false,
      user_institutions: false,
      classes: false,
      students: false,
      occurrence_types: false,
      occurrences: false,
      quarters: false,
      system_logs: false,
    },
    addressColumns: {
      institutions: {
        existing: [],
        missing: [],
        added: false,
      },
      access_requests: {
        existing: [],
        missing: [],
        added: false,
      },
    },
    migrations: {
      institutionsAddressColumns: false,
      accessRequestsAddressColumns: false,
      geolocationIndex: false,
    },
    errors: [],
  };

  try {
    const supabase = createServiceClient();

    // Check which tables exist
    const tableNames = Object.keys(result.tables) as (keyof typeof result.tables)[];

    for (const tableName of tableNames) {
      result.tables[tableName] = await checkTableExists(supabase, tableName);
    }

    // Check address columns in institutions table
    if (result.tables.institutions) {
      const institutionsColumns = await getTableColumns(supabase, 'institutions');

      result.addressColumns.institutions.existing = INSTITUTIONS_ADDRESS_COLUMNS.filter(
        (col) => institutionsColumns.includes(col)
      );
      result.addressColumns.institutions.missing = INSTITUTIONS_ADDRESS_COLUMNS.filter(
        (col) => !institutionsColumns.includes(col)
      );

      // Run migration if there are missing columns
      if (result.addressColumns.institutions.missing.length > 0) {
        const migrationResult = await runMigrationSQL(supabase, ADD_INSTITUTIONS_ADDRESS_COLUMNS_SQL);

        if (migrationResult.success) {
          result.addressColumns.institutions.added = true;
          result.migrations.institutionsAddressColumns = true;

          // Update state_code from state
          await runMigrationSQL(supabase, UPDATE_INSTITUTIONS_STATE_CODE_SQL);
        } else if (migrationResult.error) {
          result.errors.push(`Institutions: ${migrationResult.error}`);
        }
      }
    }

    // Check address columns in access_requests table
    if (result.tables.access_requests) {
      const accessRequestsColumns = await getTableColumns(supabase, 'access_requests');

      result.addressColumns.access_requests.existing = ACCESS_REQUESTS_ADDRESS_COLUMNS.filter(
        (col) => accessRequestsColumns.includes(col)
      );
      result.addressColumns.access_requests.missing = ACCESS_REQUESTS_ADDRESS_COLUMNS.filter(
        (col) => !accessRequestsColumns.includes(col)
      );

      // Run migration if there are missing columns
      if (result.addressColumns.access_requests.missing.length > 0) {
        const migrationResult = await runMigrationSQL(supabase, ADD_ACCESS_REQUESTS_ADDRESS_COLUMNS_SQL);

        if (migrationResult.success) {
          result.addressColumns.access_requests.added = true;
          result.migrations.accessRequestsAddressColumns = true;

          // Update institution_state_code from institution_state
          await runMigrationSQL(supabase, UPDATE_ACCESS_REQUESTS_STATE_CODE_SQL);
        } else if (migrationResult.error) {
          result.errors.push(`Access Requests: ${migrationResult.error}`);
        }
      }
    }

    // Create geolocation index if institutions table exists and has coordinates
    if (result.tables.institutions) {
      const indexResult = await runMigrationSQL(supabase, CREATE_GEOLOCATION_INDEX_SQL);
      if (indexResult.success) {
        result.migrations.geolocationIndex = true;
      } else if (indexResult.error && !indexResult.error.includes('exec_sql')) {
        result.errors.push(`Geolocation Index: ${indexResult.error}`);
      }
    }

    // Determine overall status
    const allTablesExist = Object.values(result.tables).every((exists) => exists);
    const noMissingColumns =
      result.addressColumns.institutions.missing.length === 0 &&
      result.addressColumns.access_requests.missing.length === 0;

    return NextResponse.json({
      success: result.errors.length === 0,
      message: allTablesExist && noMissingColumns
        ? 'Database is up to date'
        : 'Database setup completed with some updates',
      result,
    });
  } catch (error) {
    console.error('Error in database setup:', error);
    result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');

    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao verificar/atualizar o banco de dados',
        result,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check database status without making changes
export async function GET() {
  try {
    const supabase = createServiceClient();

    const tables: Record<string, boolean> = {};
    const tableNames = [
      'institutions',
      'access_requests',
      'users',
      'user_institutions',
      'classes',
      'students',
      'occurrence_types',
      'occurrences',
      'quarters',
      'system_logs',
    ];

    for (const tableName of tableNames) {
      tables[tableName] = await checkTableExists(supabase, tableName);
    }

    // Check address columns
    const addressColumnsStatus: Record<string, { existing: string[]; missing: string[] }> = {};

    if (tables.institutions) {
      const cols = await getTableColumns(supabase, 'institutions');
      addressColumnsStatus.institutions = {
        existing: INSTITUTIONS_ADDRESS_COLUMNS.filter((col) => cols.includes(col)),
        missing: INSTITUTIONS_ADDRESS_COLUMNS.filter((col) => !cols.includes(col)),
      };
    }

    if (tables.access_requests) {
      const cols = await getTableColumns(supabase, 'access_requests');
      addressColumnsStatus.access_requests = {
        existing: ACCESS_REQUESTS_ADDRESS_COLUMNS.filter((col) => cols.includes(col)),
        missing: ACCESS_REQUESTS_ADDRESS_COLUMNS.filter((col) => !cols.includes(col)),
      };
    }

    const needsMigration =
      (addressColumnsStatus.institutions?.missing?.length || 0) > 0 ||
      (addressColumnsStatus.access_requests?.missing?.length || 0) > 0;

    return NextResponse.json({
      success: true,
      tables,
      addressColumns: addressColumnsStatus,
      needsMigration,
      message: needsMigration
        ? 'Database needs migration. Call POST /api/setup to run migrations.'
        : 'Database is up to date.',
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao verificar status do banco de dados',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
