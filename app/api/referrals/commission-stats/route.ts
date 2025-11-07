// app/api/referrals/commission-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase, Profile, Transaction } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const currentUser = await Profile.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all direct referrals (level 0) sorted by date
    const directReferralTransactions = await Transaction.find({
      user_id: currentUser._id,
      type: 'REFERRAL',
      'metadata.level': 0
    }).sort({ created_at: 1 }).lean();

    // Separate first 2 and subsequent
    const first2 = directReferralTransactions.slice(0, 2);
    const subsequent = directReferralTransactions.slice(2);

    const first2Earnings = first2.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const subsequentEarnings = subsequent.reduce((sum, tx) => sum + tx.amount_cents, 0);

    // Get level 1 commissions
    const level1Transactions = await Transaction.find({
      user_id: currentUser._id,
      type: 'REFERRAL',
      'metadata.level': 1
    }).lean();

    const level1Earnings = level1Transactions.reduce((sum, tx) => sum + tx.amount_cents, 0);

    // Calculate total
    const totalEarnings = first2Earnings + subsequentEarnings + level1Earnings;

    const stats = {
      directReferrals: {
        totalEarnings: first2Earnings + subsequentEarnings,
        count: directReferralTransactions.length,
        first2Count: first2.length,
        first2Earnings: first2Earnings,
        subsequentCount: subsequent.length,
        subsequentEarnings: subsequentEarnings
      },
      level1: {
        totalEarnings: level1Earnings,
        count: level1Transactions.length
      },
      total: totalEarnings
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
