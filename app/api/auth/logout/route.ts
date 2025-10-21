// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (session) {
      console.log('User signed out via logout endpoint:', session.user?.email);
    }
    
    // Return a proper JSON response
    return NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
