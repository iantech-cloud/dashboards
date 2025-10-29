// middleware.ts - TEMPORARY DISABLED VERSION
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // TEMPORARILY DISABLE ALL MIDDLEWARE LOGIC
  console.log('Middleware - Skipping for now to debug session issue');
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Empty matcher to effectively disable middleware
  ]
};
