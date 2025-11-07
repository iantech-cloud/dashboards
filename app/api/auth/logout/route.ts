// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { auth, signOut, handleServerLogout } from '@/auth';
import { connectToDatabase } from '@/app/lib/mongoose';
import { UserSession } from '@/app/lib/models/UserSession';

// Handle GET requests (common for logout)
export async function GET() {
  return handleLogout();
}

// Handle POST requests
export async function POST() {
  return handleLogout();
}

async function handleLogout() {
  try {
    const session = await auth();
    
    if (session?.user?.id) {
      console.log('🔐 User logging out:', session.user.email);
      
      // Deactivate all sessions for this user in UserSession collection
      await connectToDatabase();
      await UserSession.updateMany(
        { user_id: session.user.id, is_active: true },
        { 
          is_active: false, 
          logged_out_at: new Date(),
          updated_at: new Date()
        }
      );
    }
    
    // Use the enhanced server logout handler from auth.ts
    const result = await handleServerLogout();
    
    if (!result.success) {
      console.warn('Logout completed with warnings:', result.error);
    }
    
    // Create response with redirect to login
    const response = NextResponse.redirect(
      new URL('/auth/login?message=logged_out', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
    
    // Clear any additional cookies that might persist
    const cookiesToDelete = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url'
    ];
    
    cookiesToDelete.forEach(cookieName => {
      response.cookies.delete(cookieName);
    });
    
    // Add cache control headers to prevent caching of authenticated state
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    // Even if there's an error, force redirect to login with error parameter
    const response = NextResponse.redirect(
      new URL('/auth/login?error=logout_failed', process.env.NEXTAUTH_URL || 'http://localhost:3000')
    );
    
    // Clear all auth cookies on error as well
    const cookiesToDelete = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ];
    
    cookiesToDelete.forEach(cookieName => {
      response.cookies.delete(cookieName);
    });
    
    return response;
  }
}

// Optional: Add OPTIONS handler for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
