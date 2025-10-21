// app/api/admin/spin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, SpinSettings, AdminAuditLog } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
      data: spinSettings || {
        is_active: false,
        activation_mode: 'scheduled',
        scheduled_days: ['wednesday', 'friday'],
        start_time: '19:00',
        end_time: '22:00',
        timezone: 'Africa/Nairobi',
        spins_per_session: 3,
        spins_cost_per_spin: 5,
        cooldown_minutes: 1440,
        require_tasks_completion: true,
        probability_multipliers: {
          starter: 1.0,
          bronze: 1.0,
          silver: 1.1,
          gold: 1.2,
          diamond: 1.5
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const settings = await request.json();

    let spinSettings = await SpinSettings.findOne({});
    const oldSettings = spinSettings ? { ...spinSettings.toObject() } : null;
    
    if (!spinSettings) {
      spinSettings = new SpinSettings(settings);
    } else {
      Object.assign(spinSettings, settings);
    }

    spinSettings.last_updated_by = adminUser._id.toString();

    // Track changes
    if (oldSettings) {
      const changes: any = {};
      Object.keys(settings).forEach(key => {
        if (JSON.stringify(oldSettings[key]) !== JSON.stringify(settings[key])) {
          changes[key] = { from: oldSettings[key], to: settings[key] };
        }
      });

      if (Object.keys(changes).length > 0) {
        spinSettings.change_history.push({
          changed_by: adminUser._id.toString(),
          changed_at: new Date(),
          changes,
          version: spinSettings.version + 1
        });
        spinSettings.version += 1;
      }
    }

    await spinSettings.save();

    // Log audit
    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'UPDATE_SPIN_SETTINGS',
      target_type: 'SpinSettings',
      target_id: spinSettings._id.toString(),
      resource_type: 'spin_settings',
      resource_id: spinSettings._id.toString(),
      action_type: 'update',
      changes: settings,
      spin_related: {
        activation_mode: settings.activation_mode,
        scheduled_days: settings.scheduled_days
      }
    });

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
