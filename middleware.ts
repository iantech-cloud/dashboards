// middleware.ts - IMPROVED VERSION
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    console.log('Middleware - Path:', pathname, 'Token:', {
      is_verified: token?.is_verified,
      activation_paid_at: token?.activation_paid_at,
      is_approved: token?.is_approved,
      approval_status: token?.approval_status,
      role: token?.role
    });

    if (!token) {
      console.log('Middleware - No token, redirecting to login');
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Helper function to determine where user should be based on their status
    const getUserRequiredPath = () => {
      // Check email verification first
      if (!token.is_verified) {
        return '/auth/confirm';
      }
      
      // Then check activation payment
      if (!token.activation_paid_at) {
        return '/auth/activate';
      }
      
      // Then check approval status
      if (!token.is_approved || token.approval_status !== 'approved') {
        return '/auth/pending-approval';
      }
      
      // Check if account is active
      if (!token.is_active || token.status !== 'active') {
        return '/auth/login?error=Inactive';
      }
      
      // All conditions met - determine dashboard based on role
      return token.role === 'admin' || token.role === 'super_admin' ? '/admin' : '/dashboard';
    };

    const requiredPath = getUserRequiredPath();

    // ===== PREVENT SKIPPING STEPS =====
    
    // If user tries to access activation page but hasn't verified email
    if (pathname === '/auth/activate' && !token.is_verified) {
      console.log('Middleware - Activation attempted without verification, redirecting to confirm');
      return NextResponse.redirect(new URL('/auth/confirm', req.url));
    }

    // If user tries to access pending-approval but hasn't completed previous steps
    if (pathname === '/auth/pending-approval') {
      if (!token.is_verified) {
        console.log('Middleware - Pending approval attempted without verification, redirecting to confirm');
        return NextResponse.redirect(new URL('/auth/confirm', req.url));
      }
      if (!token.activation_paid_at) {
        console.log('Middleware - Pending approval attempted without activation, redirecting to activate');
        return NextResponse.redirect(new URL('/auth/activate', req.url));
      }
    }

    // ===== PREVENT ACCESSING COMPLETED STEPS =====
    
    // If user tries to access verify-email but is already verified
    if (pathname === '/auth/confirm' && token.is_verified) {
      console.log('Middleware - Already verified, redirecting to next step');
      // Move them to the next appropriate step
      if (!token.activation_paid_at) {
        return NextResponse.redirect(new URL('/auth/activate', req.url));
      }
      if (!token.is_approved || token.approval_status !== 'approved') {
        return NextResponse.redirect(new URL('/auth/pending-approval', req.url));
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If user tries to access activate but has already paid
    if (pathname === '/auth/activate' && token.activation_paid_at) {
      console.log('Middleware - Already activated, redirecting to next step');
      // Move them to the next appropriate step
      if (!token.is_approved || token.approval_status !== 'approved') {
        return NextResponse.redirect(new URL('/auth/pending-approval', req.url));
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If user tries to access pending-approval but is already approved
    if (pathname === '/auth/pending-approval' && token.is_approved && token.approval_status === 'approved') {
      console.log('Middleware - Already approved, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // ===== PROTECT DASHBOARD AND ADMIN ROUTES =====
    
    // If user tries to access dashboard but hasn't completed all steps
    if (pathname.startsWith('/dashboard') && requiredPath !== '/dashboard' && !requiredPath.startsWith('/admin')) {
      console.log('Middleware - Dashboard access attempted, redirecting to:', requiredPath);
      return NextResponse.redirect(new URL(requiredPath, req.url));
    }

    // If user tries to access admin but hasn't completed all steps
    if (pathname.startsWith('/admin') && requiredPath !== '/admin' && requiredPath !== '/dashboard') {
      console.log('Middleware - Admin access attempted, redirecting to:', requiredPath);
      return NextResponse.redirect(new URL(requiredPath, req.url));
    }

    // ===== ROLE-BASED ACCESS CONTROL =====
    
    // Only admins and super_admins can access admin routes
    if (pathname.startsWith('/admin') && token.role !== 'admin' && token.role !== 'super_admin') {
      console.log('Middleware - Non-admin tried to access admin route, redirecting to unauthorized');
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Only support can access support routes
    if (pathname.startsWith('/support') && token.role !== 'support') {
      console.log('Middleware - Non-support tried to access support route, redirecting to unauthorized');
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    console.log('Middleware - Access granted to:', pathname);
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/support/:path*',
    '/auth/activate',
    '/auth/pending-approval',
    '/auth/confirm' // Added to protect verification page
  ],
};
