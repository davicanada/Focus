import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST - Apply password reset migration
export async function POST() {
  try {
    const supabase = createServiceClient();

    // Check if columns already exist by trying to select them
    const { error: checkError } = await supabase
      .from('users')
      .select('reset_token, reset_token_expires')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'Columns already exist',
      });
    }

    // Columns don't exist, we need to add them via raw SQL
    // Since we can't run DDL directly, we'll use the rpc function
    const { error: migrationError } = await supabase.rpc('execute_ai_query', {
      query_text: `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ
      `
    });

    if (migrationError) {
      console.error('Migration error:', migrationError);
      return NextResponse.json(
        { error: 'Failed to apply migration', details: migrationError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully',
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
