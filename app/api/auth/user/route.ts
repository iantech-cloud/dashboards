// app/api/auth/user/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile } from '@/app/lib/models';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ user: null });
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email }).lean();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const transformedUser = {
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
      banReason: user.ban_reason,
      bannedAt: user.banned_at?.toISOString(),
      suspensionReason: user.suspension_reason,
      suspendedAt: user.suspended_at?.toISOString(),
      level: user.level,
      rank: user.rank,
      availableSpins: user.available_spins,
      lastWithdrawalDate: undefined,
    };

    return NextResponse.json({ user: transformedUser });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
