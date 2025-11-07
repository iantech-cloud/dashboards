import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: secret
    });
    
    if (!token) {
      return NextResponse.json({ 
        authenticated: false,
        user: null
      }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: token.sub,
        email: token.email,
        name: token.name,
        requires2FA: token.requires2FA || false,
        is_verified: token.is_verified || false,
        activation_paid_at: token.activation_paid_at || null,
        is_approved: token.is_approved || false,
        approval_status: token.approval_status || 'pending',
        role: token.role || 'user',
        dashboardRoute: token.dashboardRoute || '/dashboard',
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Authentication check failed'
    }, { status: 500 });
  }
}
