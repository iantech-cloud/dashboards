// app/api/referrals/commission-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, Transaction } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const currentUser = await Profile.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get commission statistics
    const commissionStats = await Transaction.aggregate([
      {
        $match: {
          user_id: currentUser._id,
          type: 'REFERRAL'
        }
      },
      {
        $group: {
          _id: '$metadata.level',
          totalEarnings: { $sum: '$amount_cents' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCommissions = await Transaction.aggregate([
      {
        $match: {
          user_id: currentUser._id,
          type: 'REFERRAL'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount_cents' }
        }
      }
    ]);

    const stats = {
      directReferrals: commissionStats.find(stat => stat._id === 0) || { totalEarnings: 0, count: 0 },
      level1: commissionStats.find(stat => stat._id === 1) || { totalEarnings: 0, count: 0 },
      level2: commissionStats.find(stat => stat._id === 2) || { totalEarnings: 0, count: 0 },
      level3: commissionStats.find(stat => stat._id === 3) || { totalEarnings: 0, count: 0 },
      total: totalCommissions[0]?.total || 0
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Commission stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
