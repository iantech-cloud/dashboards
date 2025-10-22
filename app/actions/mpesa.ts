// app/actions/mpesa.ts
'use server';

import { connectToDatabase, MpesaChangeRequest, Profile } from '../lib/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import type { Session } from 'next-auth';

export async function getMpesaChangeRequests(): Promise<{ 
  success: boolean; 
  data?: any[]; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Get M-Pesa change requests directly from database
    const requests = await MpesaChangeRequest.find({ user_id: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      data: requests,
      message: 'M-Pesa change requests fetched successfully'
    };

  } catch (error) {
    console.error('Get M-Pesa change requests error:', error);
    return { success: false, message: 'Failed to fetch M-Pesa change requests' };
  }
}

export async function createMpesaChangeRequest(requestData: {
  old_number?: string;
  new_number: string;
  reason: string;
}): Promise<{ 
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
    const user = await Profile.findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const mpesaRequest = await MpesaChangeRequest.create({
      user_id: user._id,
      old_number: requestData.old_number,
      new_number: requestData.new_number,
      reason: requestData.reason,
      approval_status: 'pending'
    });

    return {
      success: true,
      data: mpesaRequest,
      message: 'M-Pesa change request submitted successfully'
    };

  } catch (error) {
    console.error('Create M-Pesa change request error:', error);
    return { success: false, message: 'Failed to submit M-Pesa change request' };
  }
}
