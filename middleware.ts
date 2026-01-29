import { NextRequest, NextResponse } from 'next/server';

// Block setup and test endpoints in production
const BLOCKED_PATHS = ['/api/setup', '/api/test-email'];

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const path = request.nextUrl.pathname;
    if (BLOCKED_PATHS.some((blocked) => path.startsWith(blocked))) {
      return NextResponse.json(
        { error: 'This endpoint is disabled in production' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/setup/:path*', '/api/test-email'],
};
