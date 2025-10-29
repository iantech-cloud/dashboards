// app/api/admin/spin/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase, Profile, SpinSettings, AdminAuditLog } from '@/app/lib/models';

export async function POST(request: NextRequest) {
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

    const { activate } = await request.json();

    let spinSettings = await SpinSettings.findOne({});
    
    if (!spinSettings) {
      spinSettings = new SpinSettings({
        is_active: activate,
        activation_mode: 'manual',
        last_activated_by: adminUser._id.toString(),
        last_activated_at: new Date()
      });
    } else {
      spinSettings.is_active = activate;
      spinSettings.activation_mode = 'manual';
      spinSettings.last_activated_by = adminUser._id.toString();
      spinSettings.last_activated_at = new Date();
    }

    await spinSettings.save();

    // Log audit
    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: activate ? 'ACTIVATE_SPIN_WHEEL' : 'DEACTIVATE_SPIN_WHEEL',
      target_type: 'SpinSettings',
      target_id: spinSettings._id.toString(),
      resource_type: 'spin_settings',
      resource_id: spinSettings._id.toString(),
      action_type: activate ? 'spin_wheel_activated' : 'spin_wheel_deactivated',
      changes: { is_active: activate, activation_mode: 'manual' }
    });

    return NextResponse.json({
      success: true,
      message: activate ? 'Spin wheel activated' : 'Spin wheel deactivated'
    });
  } catch (error) {
    console.error('Toggle error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
