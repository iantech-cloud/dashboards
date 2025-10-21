// app/actions/user.ts
'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase, Profile, Transaction } from '../lib/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function getUserProfile(): Promise<{ 
  success: boolean; 
  data?: any; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email }).lean();

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Transform user data
    const userData = {
      id: user._id.toString(),
      name: user.username,
      email: user.email,
      phone: user.phone_number,
      balance: user.balance_cents / 100,
      referralCode: user.referral_id,
      totalEarnings: user.total_earnings_cents / 100,
      tasksCompleted: user.tasks_completed,
      isVerified: user.is_verified,
      isActive: user.is_active,
      isApproved: user.is_approved,
      role: user.role,
      status: user.status,
      level: user.level,
      rank: user.rank,
      availableSpins: user.available_spins,
    };

    return { success: true, data: userData, message: 'Profile fetched successfully' };

  } catch (error) {
    console.error('Get user profile error:', error);
    return { success: false, message: 'Failed to fetch user profile' };
  }
}

export async function updateUserProfile(updates: {
  username?: string;
  phone_number?: string;
}): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    
    const user = await Profile.findOneAndUpdate(
      { email: session.user.email },
      { $set: updates },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    revalidatePath('/dashboard/profile');
    
    return { success: true, message: 'Profile updated successfully' };

  } catch (error) {
    console.error('Update user profile error:', error);
    return { success: false, message: 'Failed to update profile' };
  }
}
