import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase } from '@/app/lib/mongoose';
import { UserSession } from '@/app/lib/models/UserSession';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.id) {
      console.log('User logging out:', session.user.email);
      
      // Deactivate all sessions for this user
      await connectToDatabase();
      await UserSession.updateMany(
        { user_id: session.user.id, is_active: true },
        { is_active: false }
      );
    }
    
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
