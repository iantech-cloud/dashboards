// app/actions/referrals.ts
'use server';

import { connectToDatabase, Profile, Referral, Transaction } from '../lib/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import type { Session } from 'next-auth';
import type { Types } from 'mongoose';

interface ReferredUserData {
  _id: Types.ObjectId;
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
  _id: Types.ObjectId;
  referrer_id: Types.ObjectId;
  referred_id: ReferredUserData;
  created_at: Date;
}

interface TransactionDocument {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  type: string;
  amount_cents: number;
  metadata?: {
    referredUser?: string;
    level?: number;
  };
}

export async function getReferrals(filters?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ 
  success: boolean; 
  data?: any[]; 
  pagination?: any;
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const currentUser = await Profile.findOne({ email: session.user.email });

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

    const userReferrals = await Referral.find(query)
      .populate('referred_id', 'username email status created_at level rank total_earnings_cents balance_cents tasks_completed')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await Referral.countDocuments(query);

    // Get referral earnings from transactions
    const referralTransactions = await Transaction.find({
      user_id: currentUser._id,
      type: 'REFERRAL'
    }).lean();

    // Transform data for frontend
    const transformedReferrals = (userReferrals as unknown as ReferralDocument[]).map(ref => {
      const referredUser = ref.referred_id;
      const earnings = (referralTransactions as unknown as TransactionDocument[])
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
    return { success: false, message: 'Failed to fetch referrals' };
  }
}

export async function getReferralCommissionStats(): Promise<{ 
  success: boolean; 
  data?: any;
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const currentUser = await Profile.findOne({ email: session.user.email });

    if (!currentUser) {
      return { success: false, message: 'User not found' };
    }

    // Get commission statistics by level
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

    // Format the stats
    const stats = {
      directReferrals: commissionStats.find(stat => stat._id === 0) || { totalEarnings: 0, count: 0 },
      level1: commissionStats.find(stat => stat._id === 1) || { totalEarnings: 0, count: 0 },
      level2: commissionStats.find(stat => stat._id === 2) || { totalEarnings: 0, count: 0 },
      level3: commissionStats.find(stat => stat._id === 3) || { totalEarnings: 0, count: 0 },
      total: totalCommissions[0]?.total || 0
    };

    return {
      success: true,
      data: stats,
      message: 'Commission stats fetched successfully'
    };

  } catch (error) {
    console.error('Get commission stats error:', error);
    return { success: false, message: 'Failed to fetch commission statistics' };
  }
}
