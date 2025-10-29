// app/api/admin/spin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase, Profile, SpinSettings } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const spinSettings = await SpinSettings.findOne({}).lean();

    return NextResponse.json({
      success: true,
      data: {
        total_spins_today: spinSettings?.total_spins_today || 0,
        total_wins_today: spinSettings?.total_wins_today || 0,
        total_revenue_today_cents: spinSettings?.total_revenue_today_cents || 0,
        total_payouts_today_cents: spinSettings?.total_payouts_today_cents || 0,
        last_reset_date: spinSettings?.last_reset_date || new Date()
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
