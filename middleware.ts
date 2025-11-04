// middleware.ts
// Place this file in the root of your project (same level as app/)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🛡️ MIDDLEWARE:', pathname);

  // Get token using edge-compatible method
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth/login',
    '/auth/sign-up',
    '/auth/verify-request',
    '/auth/confirm',
  ];

  // Auth flow routes (require authentication but not full activation)
  const authFlowRoutes = [
    '/auth/complete-profile',
    '/auth/activate',
    '/auth/pending-approval',
  ];

  // Protected routes (require full authentication and activation)
  const protectedRoutes = [
    '/dashboard',
    '/admin',
    '/support',
    '/profile',
    '/settings',
    '/content',
    '/spin',
    '/wallet',
    '/withdraw',
    '/deposit',
    '/referrals',
    '/transactions',
    '/notifications',
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthFlowRoute = authFlowRoutes.some(route => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If no token and trying to access protected or auth flow route
  if (!token && (isProtectedRoute || isAuthFlowRoute)) {
    console.log('❌ No token, redirecting to login');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // If no token, allow access to public routes
  if (!token) {
    console.log('✅ No token, allowing public route access');
    return NextResponse.next();
  }

  // Extract user data from token
  const user = {
    email: token.email as string,
    is_verified: token.is_verified as boolean,
    is_active: token.is_active as boolean,
    activation_paid_at: token.activation_paid_at as Date | undefined,
    is_approved: token.is_approved as boolean,
    approval_status: token.approval_status as string,
    role: token.role as string,
  };
  
  console.log('👤 User state:', {
    email: user.email,
    is_verified: user.is_verified,
    is_active: user.is_active,
    activation_paid_at: user.activation_paid_at ? 'Yes' : 'No',
    is_approved: user.is_approved,
    approval_status: user.approval_status,
    pathname,
  });

  // ==================== USER STATE CHECKS ====================

  // STATE 1: Email not verified
  if (!user.is_verified) {
    // Allow access to verify-request and confirm pages
    if (pathname.startsWith('/auth/verify-request') || pathname.startsWith('/auth/confirm')) {
      console.log('✅ Allowing access to email verification pages');
      return NextResponse.next();
    }
    
    // Redirect to email confirmation
    console.log('❌ Email not verified → /auth/confirm');
    return NextResponse.redirect(new URL('/auth/confirm', request.url));
  }

  // STATE 2: Email verified but not activated (no payment)
  if (!user.activation_paid_at) {
    // Allow access to activation pages
    if (pathname.startsWith('/auth/activate') || pathname.startsWith('/auth/complete-profile')) {
      console.log('✅ Allowing access to activation pages');
      return NextResponse.next();
    }
    
    // Redirect to activation
    console.log('❌ Not activated → /auth/activate');
    return NextResponse.redirect(new URL('/auth/activate', request.url));
  }

  // STATE 3: Activated but not approved
  if (!user.is_approved || user.approval_status !== 'approved') {
    // Allow access to pending approval page
    if (pathname.startsWith('/auth/pending-approval')) {
      console.log('✅ Allowing access to pending approval page');
      return NextResponse.next();
    }
    
    // Redirect to pending approval
    console.log('❌ Not approved → /auth/pending-approval');
    return NextResponse.redirect(new URL('/auth/pending-approval', request.url));
  }

  // STATE 4: Check if account is active
  if (!user.is_active || user.approval_status !== 'approved') {
    // This shouldn't happen if approved, but safety check
    if (pathname.startsWith('/auth/pending-approval')) {
      console.log('✅ Allowing access to pending approval page (inactive)');
      return NextResponse.next();
    }
    
    console.log('❌ Account inactive → /auth/pending-approval');
    return NextResponse.redirect(new URL('/auth/pending-approval', request.url));
  }

  // ==================== ALL CHECKS PASSED ====================
  
  // Determine the correct dashboard based on role
  const dashboardRoute = user.role === 'admin' || user.role === 'super_admin' 
    ? '/admin' 
    : user.role === 'support'
    ? '/support'
    : '/dashboard';
  
  // If user is trying to access auth pages but is fully activated
  if (isAuthFlowRoute || (isPublicRoute && pathname !== '/auth/login' && pathname !== '/auth/sign-up')) {
    console.log('✅ Fully activated user on auth page → Redirecting to:', dashboardRoute);
    return NextResponse.redirect(new URL(dashboardRoute, request.url));
  }

  // Redirect admins away from /dashboard to /admin
  if ((user.role === 'admin' || user.role === 'super_admin') && pathname.startsWith('/dashboard')) {
    console.log('✅ Admin user trying to access /dashboard → Redirecting to /admin');
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Redirect regular users away from /admin to /dashboard
  if (user.role === 'user' && pathname.startsWith('/admin')) {
    console.log('✅ Regular user trying to access /admin → Redirecting to /dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect support users to their dashboard
  if (user.role === 'support' && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    console.log('✅ Support user → Redirecting to /support');
    return NextResponse.redirect(new URL('/support', request.url));
  }

  // Allow access to protected routes
  console.log('✅ All checks passed, allowing access to:', pathname);
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
