// app/api/admin/approve-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, AdminAuditLog } from '@/app/lib/models';
import { CommissionService } from '@/app/lib/services/commissionService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await Profile.findOne({ email: session.user.email });
    if (adminUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();
    const { userId, approvalNotes } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update user approval status
    const user = await Profile.findByIdAndUpdate(
      userId,
      {
        approval_status: 'approved',
        is_approved: true,
        status: 'active',
        approval_by: adminUser._id,
        approval_at: new Date(),
        approval_notes: approvalNotes
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process referral commissions
    await CommissionService.processReferralCommissions(userId);

    // Log the approval action
    await AdminAuditLog.create({
      actor_id: adminUser._id,
      action: 'user_approval',
      target_type: 'Profile',
      target_id: userId,
      changes: { approval_status: 'approved', status: 'active' },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'User approved successfully and referral commissions processed',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status,
        approval_status: user.approval_status
      }
    });

  } catch (error) {
    console.error('User approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
