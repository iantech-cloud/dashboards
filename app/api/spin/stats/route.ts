// app/api/spin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserSpinStats } from '@/app/actions/spin';
import { connectToDatabase, Profile } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Starting spin stats API call...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ Unauthorized - no session');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('👤 Session user:', session.user.email);
    
    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });
    if (!user) {
      console.log('❌ User not found in database');
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ User found:', {
      userId: user._id.toString(),
      username: user.username,
      available_spins: user.available_spins,
      email: user.email
    });

    const result = await getUserSpinStats(user._id.toString());
    
    console.log('📈 Spin stats result:', {
      success: result.success,
      availableSpins: result.data?.availableSpins,
      totalSpins: result.data?.totalSpins,
      totalWins: result.data?.totalWins
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ API Error in /api/spin/stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        data: {
          totalSpins: 0,
          totalWins: 0,
          winRate: 0,
          totalPrizeValue: 0,
          currentStreak: 0,
          bestStreak: 0,
          availableSpins: 0,
          totalSpinsUsed: 0
        }
      },
      { status: 500 }
    );
  }
}
