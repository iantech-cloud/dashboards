// app/actions/mpesa.ts
'use server';

import { connectToDatabase, MpesaChangeRequest, Profile } from '../lib/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// Type definitions
interface MpesaChangeRequestData {
  old_number?: string;
  new_number: string;
  reason: string;
}

interface MpesaChangeRequestResponse {
  success: boolean;
  data?: any;
  message: string;
}

interface MpesaChangeRequestsResponse {
  success: boolean;
  data?: any[];
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

export async function getMpesaChangeRequests(): Promise<MpesaChangeRequestsResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const user = await (Profile as any).findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Get M-Pesa change requests directly from database
    const requests = await (MpesaChangeRequest as any).find({ user_id: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      data: requests,
      message: 'M-Pesa change requests fetched successfully'
    };

  } catch (error) {
    console.error('Get M-Pesa change requests error:', error);
    return { 
      success: false, 
      message: 'Failed to fetch M-Pesa change requests' 
    };
  }
}

export async function createMpesaChangeRequest(requestData: MpesaChangeRequestData): Promise<MpesaChangeRequestResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const user = await (Profile as any).findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Validate required fields
    if (!requestData.new_number?.trim()) {
      return { success: false, message: 'New phone number is required' };
    }

    if (!requestData.reason?.trim()) {
      return { success: false, message: 'Reason for change is required' };
    }

    // Validate phone number format
    const phoneRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
    if (!phoneRegex.test(requestData.new_number)) {
      return { 
        success: false, 
        message: 'Invalid phone number format. Use 07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX' 
      };
    }

    // Format phone number to 254 format
    let formattedNewNumber = requestData.new_number;
    if (formattedNewNumber.startsWith('0') && formattedNewNumber.length === 10) {
      formattedNewNumber = `254${formattedNewNumber.substring(1)}`;
    } else if (formattedNewNumber.startsWith('+254')) {
      formattedNewNumber = formattedNewNumber.substring(1);
    }

    // Check for existing pending requests
    const existingPendingRequest = await (MpesaChangeRequest as any).findOne({
      user_id: user._id,
      approval_status: 'pending'
    });

    if (existingPendingRequest) {
      return { 
        success: false, 
        message: 'You already have a pending M-Pesa change request. Please wait for it to be processed.' 
      };
    }

    // Check if new number is already in use by another user
    const existingUserWithNumber = await (Profile as any).findOne({
      _id: { $ne: user._id },
      phone_number: formattedNewNumber
    });

    if (existingUserWithNumber) {
      return { 
        success: false, 
        message: 'This phone number is already registered to another user.' 
      };
    }

    const mpesaRequest = await (MpesaChangeRequest as any).create({
      user_id: user._id,
      old_number: requestData.old_number,
      new_number: formattedNewNumber,
      reason: requestData.reason.trim(),
      approval_status: 'pending',
      user_details: {
        username: user.username,
        email: user.email,
        current_phone: user.phone_number
      }
    });

    return {
      success: true,
      data: {
        _id: mpesaRequest._id.toString(),
        old_number: mpesaRequest.old_number,
        new_number: mpesaRequest.new_number,
        reason: mpesaRequest.reason,
        approval_status: mpesaRequest.approval_status,
        createdAt: mpesaRequest.createdAt,
        user_details: mpesaRequest.user_details
      },
      message: 'M-Pesa change request submitted successfully'
    };

  } catch (error) {
    console.error('Create M-Pesa change request error:', error);
    return { 
      success: false, 
      message: 'Failed to submit M-Pesa change request' 
    };
  }
}

// Additional function to get M-Pesa change request by ID
export async function getMpesaChangeRequestById(requestId: string): Promise<MpesaChangeRequestResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const user = await (Profile as any).findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const mpesaRequest = await (MpesaChangeRequest as any).findOne({
      _id: requestId,
      user_id: user._id
    }).lean();

    if (!mpesaRequest) {
      return { success: false, message: 'M-Pesa change request not found' };
    }

    return {
      success: true,
      data: mpesaRequest,
      message: 'M-Pesa change request fetched successfully'
    };

  } catch (error) {
    console.error('Get M-Pesa change request by ID error:', error);
    return { 
      success: false, 
      message: 'Failed to fetch M-Pesa change request' 
    };
  }
}

// Function to cancel pending M-Pesa change request
export async function cancelMpesaChangeRequest(requestId: string): Promise<MpesaChangeRequestResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isValidSession(session)) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const user = await (Profile as any).findOne({ email: session.user.email });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const mpesaRequest = await (MpesaChangeRequest as any).findOne({
      _id: requestId,
      user_id: user._id
    });

    if (!mpesaRequest) {
      return { success: false, message: 'M-Pesa change request not found' };
    }

    if (mpesaRequest.approval_status !== 'pending') {
      return { 
        success: false, 
        message: 'Only pending M-Pesa change requests can be cancelled' 
      };
    }

    // Update the request status to cancelled
    mpesaRequest.approval_status = 'cancelled';
    mpesaRequest.cancelled_at = new Date();
    await mpesaRequest.save();

    return {
      success: true,
      data: {
        _id: mpesaRequest._id.toString(),
        approval_status: mpesaRequest.approval_status,
        cancelled_at: mpesaRequest.cancelled_at
      },
      message: 'M-Pesa change request cancelled successfully'
    };

  } catch (error) {
    console.error('Cancel M-Pesa change request error:', error);
    return { 
      success: false, 
      message: 'Failed to cancel M-Pesa change request' 
    };
  }
}
