// app/api/activate/status/route.ts
// Sessionless endpoint — looks up activation status by verified email only.
// No NextAuth session required so newly verified users can access it before logging in.
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongoose';
import { Profile } from '@/app/lib/models';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    await connectToDatabase();

    const userProfile = await (Profile as any).findOne({ email: email.toLowerCase().trim() });

    if (!userProfile) {
      return NextResponse.json({ success: false, message: 'User profile not found' }, { status: 404 });
    }

    // Only allow access if email is verified — prevents bypassing verification
    if (!userProfile.is_verified) {
      return NextResponse.json({ success: false, message: 'Email not verified' }, { status: 403 });
    }

    const isActivationPaid =
      userProfile.approval_status !== 'pending' || userProfile.rank !== 'Unactivated';

    return NextResponse.json({
      success: true,
      data: {
        activation_paid: isActivationPaid,
        approval_status: userProfile.approval_status || 'pending',
        rank: userProfile.rank || 'Unactivated',
        is_active: userProfile.is_active || false,
        status: userProfile.status || 'inactive',
        username: userProfile.username,
        email: userProfile.email,
        is_approved: userProfile.is_approved || false,
      },
    });
  } catch (error) {
    console.error('Activate status error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
