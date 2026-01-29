import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST - Clean up E2E test data
export async function POST() {
  try {
    const supabase = createServiceClient();
    const results: Record<string, number> = {};

    // 1. Find test users (emails like test.XXX@example.com)
    const { data: testUsers } = await supabase
      .from('users')
      .select('id, email')
      .like('email', 'test.%@example.com');

    const testUserIds = testUsers?.map(u => u.id) || [];
    results.testUsersFound = testUserIds.length;

    if (testUserIds.length > 0) {
      // 2. Delete from user_institutions first (foreign key)
      const { count: uiDeleted } = await supabase
        .from('user_institutions')
        .delete({ count: 'exact' })
        .in('user_id', testUserIds);
      results.userInstitutionsDeleted = uiDeleted || 0;

      // 3. Delete from users table
      const { count: usersDeleted } = await supabase
        .from('users')
        .delete({ count: 'exact' })
        .in('id', testUserIds);
      results.usersDeleted = usersDeleted || 0;

      // 4. Delete from Supabase Auth
      let authDeleted = 0;
      for (const userId of testUserIds) {
        try {
          await supabase.auth.admin.deleteUser(userId);
          authDeleted++;
        } catch (e) {
          // User might not exist in Auth
        }
      }
      results.authUsersDeleted = authDeleted;
    }

    // 5. Delete test access requests
    const { count: requestsDeleted } = await supabase
      .from('access_requests')
      .delete({ count: 'exact' })
      .like('email', 'test.%@example.com');
    results.accessRequestsDeleted = requestsDeleted || 0;

    // 6. Also clean up any other test patterns
    const { count: requestsDeleted2 } = await supabase
      .from('access_requests')
      .delete({ count: 'exact' })
      .or('full_name.ilike.%E2E%,full_name.ilike.%Teste%,email.ilike.%@example.com');
    results.additionalRequestsDeleted = requestsDeleted2 || 0;

    console.log('E2E cleanup results:', results);

    return NextResponse.json({
      success: true,
      message: 'E2E test data cleaned up successfully',
      results
    });
  } catch (error) {
    console.error('Error cleaning up E2E data:', error);
    return NextResponse.json(
      { error: 'Failed to clean up E2E data', details: String(error) },
      { status: 500 }
    );
  }
}
