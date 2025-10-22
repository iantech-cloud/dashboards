// app/actions/referrals.ts
'use server';

import { connectToDatabase, Profile, Referral, Transaction } from '../lib/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// Type definitions
interface ReferredUserData {
  _id: any;
  username?: string;
  email?: string;
  status?: string;
  created_at?: Date;
  level?: number;
  rank?: string;
  total_earnings_cents?: number;
  balance_cents?: number;
  tasks_completed?: number;
}

interface ReferralDocument {
  _id: any;
  referrer_id: any;
  referred_id: ReferredUserData;
  created_at: Date;
}

interface TransactionDocument {
  _id: any;
  user_id: any;
  type: string;
  amount_cents: number;
  metadata?: {
    referredUser?: string;
    level?: number;
  };
}

interface ReferralItem {
  id: string;
  name: string;
  email: string;
  joinDate?: Date;
  status: string;
  earnings: number;
  level: number;
  rank: string;
  tasksCompleted: number;
  totalEarnings: number;
}

interface ReferralsResponse {
  success: boolean;
  data?: ReferralItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message: string;
}

interface CommissionStats {
  directReferrals: { totalEarnings: number; count: number };
  level1: { totalEarnings: number; count: number };
  level2: { totalEarnings: number; count: number };
  level3: { totalEarnings: number; count: number };
  total: number;
}

interface CommissionStatsResponse {
  success: boolean;
  data?: CommissionStats;
  message: string;
}

// Session type guard
interface SessionWithUser {
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

function isValidSession(session: unknown): session is SessionWithUser {
  return (
    session !== null &&
    typeof session === 'object' &&
    'user' in session &&
    session.user !== null &&
    typeof session.user === 'object' &&
    'email' in session.user &&
    typeof session.user.email === 'string' &&
    session.user.email.length > 0
  );
}

export async function getReferrals(filters?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ReferralsResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const currentUser = await (Profile as any).findOne({ email: session.user.email });

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = { referrer_id: currentUser._id };
    if (filters?.status && filters.status !== 'all') {
      query['referred_id.status'] = filters.status;
    }

    const userReferrals = await (Referral as any).find(query)
      .populate('referred_id', 'username email status created_at level rank total_earnings_cents balance_cents tasks_completed')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await (Referral as any).countDocuments(query);

    // Get referral earnings from transactions
    const referralTransactions = await (Transaction as any).find({
      user_id: currentUser._id,
      type: 'REFERRAL'
    }).lean();

    // Transform data for frontend
    const transformedReferrals: ReferralItem[] = (userReferrals as ReferralDocument[]).map(ref => {
      const referredUser = ref.referred_id;
      const earnings = (referralTransactions as TransactionDocument[])
        .filter(tx => tx.metadata?.referredUser === referredUser?._id.toString())
        .reduce((sum, tx) => sum + tx.amount_cents, 0);

      return {
        id: ref._id.toString(),
        name: referredUser?.username || 'Unknown User',
        email: referredUser?.email || 'No email',
        joinDate: referredUser?.created_at,
        status: referredUser?.status || 'active',
        earnings: earnings / 100,
        level: referredUser?.level || 1,
        rank: referredUser?.rank || 'Bronze',
        tasksCompleted: referredUser?.tasks_completed || 0,
        totalEarnings: (referredUser?.total_earnings_cents || 0) / 100
      };
    });

    return {
      success: true,
      data: transformedReferrals,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      message: 'Referrals fetched successfully'
    };

  } catch (error) {
    console.error('Get referrals error:', error);
    return { 
      success: false, 
      message: 'Failed to fetch referrals' 
    };
  }
}

export async function getReferralCommissionStats(): Promise<CommissionStatsResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const currentUser = await (Profile as any).findOne({ email: session.user.email });

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    // Get commission statistics by level
    const commissionStats = await (Transaction as any).aggregate([
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

    const totalCommissions = await (Transaction as any).aggregate([
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

    // Format the stats
    const stats: CommissionStats = {
      directReferrals: commissionStats.find((stat: any) => stat._id === 0) || { totalEarnings: 0, count: 0 },
      level1: commissionStats.find((stat: any) => stat._id === 1) || { totalEarnings: 0, count: 0 },
      level2: commissionStats.find((stat: any) => stat._id === 2) || { totalEarnings: 0, count: 0 },
      level3: commissionStats.find((stat: any) => stat._id === 3) || { totalEarnings: 0, count: 0 },
      total: totalCommissions[0]?.total || 0
    };

    return {
      success: true,
      data: stats,
      message: 'Commission stats fetched successfully'
    };

  } catch (error) {
    console.error('Get commission stats error:', error);
    return { 
      success: false, 
      message: 'Failed to fetch commission statistics' 
    };
  }
}

// Additional function to get referral summary
export async function getReferralSummary(): Promise<{
  success: boolean;
  data?: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
  };
  message: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const currentUser = await (Profile as any).findOne({ email: session.user.email });

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    // Get total referrals count
    const totalReferrals = await (Referral as any).countDocuments({ 
      referrer_id: currentUser._id 
    });

    // Get active referrals count
    const activeReferrals = await (Referral as any).countDocuments({
      referrer_id: currentUser._id,
      'referred_id.status': 'active'
    });

    // Get total referral earnings
    const earningsResult = await (Transaction as any).aggregate([
      {
        $match: {
          user_id: currentUser._id,
          type: 'REFERRAL',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount_cents' }
        }
      }
    ]);

    // Get pending referral earnings
    const pendingEarningsResult = await (Transaction as any).aggregate([
      {
        $match: {
          user_id: currentUser._id,
          type: 'REFERRAL',
          status: 'pending'
        }
      },
      {
        $group: {
          _id: null,
          pendingEarnings: { $sum: '$amount_cents' }
        }
      }
    ]);

    const totalEarnings = earningsResult[0]?.totalEarnings || 0;
    const pendingEarnings = pendingEarningsResult[0]?.pendingEarnings || 0;

    return {
      success: true,
      data: {
        totalReferrals,
        activeReferrals,
        totalEarnings: totalEarnings / 100,
        pendingEarnings: pendingEarnings / 100
      },
      message: 'Referral summary fetched successfully'
    };

  } catch (error) {
    console.error('Get referral summary error:', error);
    return { 
      success: false, 
      message: 'Failed to fetch referral summary' 
    };
  }
}

// Function to get referral link and code
export async function getReferralInfo(): Promise<{
  success: boolean;
  data?: {
    referralCode: string;
    referralLink: string;
  };
  message: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const currentUser = await (Profile as any).findOne({ email: session.user.email });

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    // Generate referral code from user ID or use existing one
    const referralCode = currentUser.referral_code || currentUser._id.toString().slice(-8).toUpperCase();
    const referralLink = `${process.env.NEXTAUTH_URL}/auth/signup?ref=${referralCode}`;

    // Update user with referral code if not exists
    if (!currentUser.referral_code) {
      await (Profile as any).findByIdAndUpdate(currentUser._id, {
        referral_code: referralCode
      });
    }

    return {
      success: true,
      data: {
        referralCode,
        referralLink
      },
      message: 'Referral info fetched successfully'
    };

  } catch (error) {
    console.error('Get referral info error:', error);
    return { 
      success: false, 
      message: 'Failed to fetch referral information' 
    };
  }
}
