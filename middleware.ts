import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Helper function to determine where user should be based on their status
    const getUserRequiredPath = () => {
      // Check the three conditions in order
      if (!token.is_verified) {
        return '/auth/verify-email';
      }
      
      if (!token.activation_paid_at) {
        return '/auth/activate';
      }
      
      if (!token.is_approved || token.approval_status !== 'approved') {
        return '/auth/pending-approval';
      }
      
      return '/dashboard'; // All conditions met
    };

    const requiredPath = getUserRequiredPath();

    // If user tries to access dashboard but hasn't completed all steps
    if (pathname.startsWith('/dashboard') && requiredPath !== '/dashboard') {
      return NextResponse.redirect(new URL(requiredPath, req.url));
    }

    // If user tries to access activation page but hasn't verified email
    if (pathname === '/auth/activate' && !token.is_verified) {
      return NextResponse.redirect(new URL('/auth/verify-email', req.url));
    }

    // If user tries to access pending-approval but hasn't completed previous steps
    if (pathname === '/auth/pending-approval') {
      if (!token.is_verified) {
        return NextResponse.redirect(new URL('/auth/verify-email', req.url));
      }
      if (!token.activation_paid_at) {
        return NextResponse.redirect(new URL('/auth/activate', req.url));
      }
    }

    // If user tries to access verify-email but is already verified
    if (pathname === '/auth/verify-email' && token.is_verified) {
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
      // Move them to the next appropriate step
      if (!token.is_approved || token.approval_status !== 'approved') {
        return NextResponse.redirect(new URL('/auth/pending-approval', req.url));
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If user tries to access pending-approval but is already approved
    if (pathname === '/auth/pending-approval' && token.is_approved && token.approval_status === 'approved') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Role-based access control for admin and support routes
    if (pathname.startsWith('/admin') && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    if (pathname.startsWith('/support') && token.role !== 'support') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

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
    '/auth/verify-email' // Added to prevent skipping steps
  ],
};
