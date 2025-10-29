// app/api/admin/mpesa-change-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Profile, MpesaChangeRequest, AdminAuditLog } from '@/app/lib/models';
import { auth } from '@/auth';

/**
 * GET - Fetch all M-Pesa change requests (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if user is admin
    const adminProfile = await Profile.findOne({ email: session.user.email });

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // Fetch all change requests with user details
    const requests = await MpesaChangeRequest.find()
      .sort({ createdAt: -1 })
      .lean();

    // Populate user details
    const requestsWithUserDetails = await Promise.all(
      requests.map(async (request) => {
        const user = await Profile.findById(request.user_id).select('username email');
        
        let approverName = null;
        if (request.approved_by) {
          const approver = await Profile.findById(request.approved_by).select('username');
          approverName = approver?.username || 'Unknown Admin';
        }

        return {
          ...request,
          _id: request._id.toString(),
          user_name: user?.username || 'Unknown User',
          user_email: user?.email || 'Unknown Email',
          approved_by_name: approverName,
        };
      })
    );

    return NextResponse.json(
      { 
        success: true,
        requests: requestsWithUserDetails,
        total: requestsWithUserDetails.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching M-Pesa change requests:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching requests.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Approve or reject M-Pesa change request (Admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { requestId, action, notes } = await request.json();

    // Validate input
    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required.' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject".' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !notes?.trim()) {
      return NextResponse.json(
        { error: 'Notes are required when rejecting a request.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user is admin
    const adminProfile = await Profile.findOne({ email: session.user.email });

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // Fetch the change request
    const changeRequest = await MpesaChangeRequest.findById(requestId);

    if (!changeRequest) {
      return NextResponse.json(
        { error: 'Change request not found.' },
        { status: 404 }
      );
    }

    // Check if request is already processed
    if (changeRequest.approval_status !== 'pending') {
      return NextResponse.json(
        { error: `This request has already been ${changeRequest.approval_status}.` },
        { status: 400 }
      );
    }

    // Fetch the user
    const userProfile = await Profile.findById(changeRequest.user_id);

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Store old values for audit
    const oldPhoneNumber = userProfile.phone_number;

    // Process the action
    if (action === 'approve') {
      // Check if new number is already in use by another user
      const existingUser = await Profile.findOne({
        phone_number: changeRequest.new_number,
        _id: { $ne: userProfile._id },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'This M-Pesa number is already registered to another account.' },
          { status: 400 }
        );
      }

      // Update user's phone number
      userProfile.phone_number = changeRequest.new_number;
      userProfile.preferred_mpesa_number = changeRequest.new_number;
      await userProfile.save();

      // Update change request
      changeRequest.approval_status = 'approved';
      changeRequest.approved_by = adminProfile._id;
      changeRequest.approval_at = new Date();
      changeRequest.approval_notes = notes?.trim() || 'Request approved';
      await changeRequest.save();

      // Create audit log
      await AdminAuditLog.create({
        actor_id: adminProfile._id,
        action: 'APPROVE_MPESA_CHANGE',
        target_type: 'mpesa_change_request',
        target_id: changeRequest._id.toString(),
        resource_type: 'user',
        resource_id: userProfile._id,
        action_type: 'approve',
        changes: {
          old_number: oldPhoneNumber,
          new_number: changeRequest.new_number,
          status: 'approved',
        },
        metadata: {
          admin_email: adminProfile.email,
          admin_username: adminProfile.username,
          user_email: userProfile.email,
          user_username: userProfile.username,
          approval_notes: changeRequest.approval_notes,
          timestamp: new Date().toISOString(),
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      console.log(`✅ M-Pesa change request approved: ${changeRequest._id} by admin ${adminProfile.username}`);

      return NextResponse.json(
        {
          success: true,
          message: 'M-Pesa number change request approved successfully.',
          newPhoneNumber: changeRequest.new_number,
        },
        { status: 200 }
      );
    } else if (action === 'reject') {
      // Update change request
      changeRequest.approval_status = 'rejected';
      changeRequest.approved_by = adminProfile._id;
      changeRequest.approval_at = new Date();
      changeRequest.approval_notes = notes.trim();
      await changeRequest.save();

      // Create audit log
      await AdminAuditLog.create({
        actor_id: adminProfile._id,
        action: 'REJECT_MPESA_CHANGE',
        target_type: 'mpesa_change_request',
        target_id: changeRequest._id.toString(),
        resource_type: 'user',
        resource_id: userProfile._id,
        action_type: 'reject',
        changes: {
          old_number: changeRequest.old_number,
          new_number: changeRequest.new_number,
          status: 'rejected',
        },
        metadata: {
          admin_email: adminProfile.email,
          admin_username: adminProfile.username,
          user_email: userProfile.email,
          user_username: userProfile.username,
          rejection_reason: changeRequest.approval_notes,
          timestamp: new Date().toISOString(),
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      console.log(`❌ M-Pesa change request rejected: ${changeRequest._id} by admin ${adminProfile.username}`);

      return NextResponse.json(
        {
          success: true,
          message: 'M-Pesa number change request rejected.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing M-Pesa change request:', error);
    
    // Log detailed error for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    return NextResponse.json(
      { error: 'An error occurred while processing the request. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a M-Pesa change request (Admin only - for cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user is admin
    const adminProfile = await Profile.findOne({ email: session.user.email });

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // Fetch the change request
    const changeRequest = await MpesaChangeRequest.findById(requestId);

    if (!changeRequest) {
      return NextResponse.json(
        { error: 'Change request not found.' },
        { status: 404 }
      );
    }

    // Only allow deletion of non-pending requests (already processed)
    if (changeRequest.approval_status === 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete pending requests. Please approve or reject first.' },
        { status: 400 }
      );
    }

    // Store info for audit log before deletion
    const requestInfo = {
      requestId: changeRequest._id.toString(),
      userId: changeRequest.user_id,
      oldNumber: changeRequest.old_number,
      newNumber: changeRequest.new_number,
      status: changeRequest.approval_status,
    };

    // Delete the request
    await MpesaChangeRequest.findByIdAndDelete(requestId);

    // Create audit log
    await AdminAuditLog.create({
      actor_id: adminProfile._id,
      action: 'DELETE_MPESA_CHANGE_REQUEST',
      target_type: 'mpesa_change_request',
      target_id: requestInfo.requestId,
      resource_type: 'user',
      resource_id: requestInfo.userId,
      action_type: 'delete',
      changes: requestInfo,
      metadata: {
        admin_email: adminProfile.email,
        admin_username: adminProfile.username,
        deletion_reason: 'Admin cleanup',
        timestamp: new Date().toISOString(),
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    console.log(`🗑️ M-Pesa change request deleted: ${requestInfo.requestId} by admin ${adminProfile.username}`);

    return NextResponse.json(
      {
        success: true,
        message: 'M-Pesa change request deleted successfully.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting M-Pesa change request:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    return NextResponse.json(
      { error: 'An error occurred while deleting the request. Please try again.' },
      { status: 500 }
    );
  }
}
