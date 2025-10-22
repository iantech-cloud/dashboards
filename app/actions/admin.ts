// app/actions/admin.ts
'use server';

import { revalidatePath } from 'next/cache';
import { 
  connectToDatabase, 
  Profile, 
  Withdrawal, 
  Transaction, 
  ActivationPayment,
  Referral,
  AdminAuditLog,
  SpinSettings
} from '../lib/models';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import type { AuthOptions } from 'next-auth';

interface AdminStats {
  totalUsers: number;
  pendingApprovals: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  activeUsers: number;
  totalTransactions: number;
  totalReferrals: number;
  todayRegistrations: number;
  spinWheelActive: boolean;
  spinWheelMode: 'manual' | 'scheduled';
}

export async function getAdminStats(): Promise<{ 
  success: boolean; 
  data?: AdminStats; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));

    const [
      totalUsers,
      pendingApprovals,
      pendingWithdrawals,
      activeUsers,
      totalTransactions,
      totalRevenue,
      totalReferrals,
      todayRegistrations,
      spinSettings
    ] = await Promise.all([
      (Profile as any).countDocuments(),
      (Profile as any).countDocuments({ approval_status: 'pending' }),
      (Withdrawal as any).countDocuments({ status: 'pending' }),
      (Profile as any).countDocuments({ 
        approval_status: 'approved', 
        status: 'active',
        is_active: true 
      }),
      (Transaction as any).countDocuments(),
      (ActivationPayment as any).aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount_cents' } } }
      ]),
      (Referral as any).countDocuments(),
      (Profile as any).countDocuments({
        created_at: { $gte: startOfToday }
      }),
      (SpinSettings as any).findOne({})
    ]);

    const stats: AdminStats = {
      totalUsers,
      pendingApprovals,
      pendingWithdrawals,
      activeUsers,
      totalTransactions,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalReferrals,
      todayRegistrations,
      spinWheelActive: spinSettings?.is_active || false,
      spinWheelMode: spinSettings?.activation_mode || 'scheduled'
    };

    return { success: true, data: stats, message: 'Stats fetched successfully' };

  } catch (error) {
    console.error('Admin stats error:', error);
    return { success: false, message: 'Failed to fetch admin statistics' };
  }
}

// Spin Wheel Control Functions
export async function toggleSpinWheel(activate: boolean): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    let spinSettings = await (SpinSettings as any).findOne({});
    
    if (!spinSettings) {
      // Create default settings if they don't exist
      spinSettings = new (SpinSettings as any)({
        is_active: activate,
        activation_mode: activate ? 'manual' : 'scheduled',
        scheduled_days: ['wednesday', 'friday'],
        start_time: '19:00',
        end_time: '22:00',
        spins_per_session: 3,
        spins_cost_per_spin: 100, // cents
        last_activated_by: adminUser._id,
        last_activated_at: new Date()
      });
    } else {
      // Update existing settings
      spinSettings.is_active = activate;
      spinSettings.activation_mode = activate ? 'manual' : 'scheduled';
      spinSettings.last_activated_by = adminUser._id;
      spinSettings.last_activated_at = new Date();
    }

    await spinSettings.save();

    // Log admin action with correct fields
    await (AdminAuditLog as any).create({
      actor_id: adminUser._id.toString(),
      action: activate ? 'ACTIVATE_SPIN_WHEEL' : 'DEACTIVATE_SPIN_WHEEL',
      action_type: activate ? 'spin_wheel_activated' : 'spin_wheel_deactivated',
      target_type: 'SpinSettings',
      target_id: spinSettings._id.toString(),
      resource_type: 'spin_settings',
      resource_id: spinSettings._id.toString(),
      changes: { 
        is_active: activate,
        activation_mode: activate ? 'manual' : 'scheduled'
      },
      metadata: {
        previous_state: !activate,
        new_state: activate
      },
      ip_address: 'server-action',
      user_agent: 'server-action',
      spin_related: {
        activation_mode: activate ? 'manual' : 'scheduled'
      }
    });

    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return { 
      success: true, 
      message: activate 
        ? 'Spin wheel activated manually' 
        : 'Spin wheel deactivated. Will follow schedule.'
    };

  } catch (error) {
    console.error('Toggle spin wheel error:', error);
    return { 
      success: false, 
      message: 'Failed to update spin wheel settings' 
    };
  }
}

export async function getSpinWheelStatus(): Promise<{ 
  success: boolean; 
  data?: {
    is_active: boolean;
    activation_mode: 'manual' | 'scheduled';
    scheduled_days: string[];
    start_time: string;
    end_time: string;
    last_activated_at?: Date;
    last_activated_by?: string;
  };
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const spinSettings = await (SpinSettings as any).findOne({});
    
    if (!spinSettings) {
      // Return default settings if none exist
      return {
        success: true,
        data: {
          is_active: false,
          activation_mode: 'scheduled',
          scheduled_days: ['wednesday', 'friday'],
          start_time: '19:00',
          end_time: '22:00'
        },
        message: 'Spin wheel status fetched successfully'
      };
    }

    return {
      success: true,
      data: {
        is_active: spinSettings.is_active,
        activation_mode: spinSettings.activation_mode,
        scheduled_days: spinSettings.scheduled_days,
        start_time: spinSettings.start_time,
        end_time: spinSettings.end_time,
        last_activated_at: spinSettings.last_activated_at,
        last_activated_by: spinSettings.last_activated_by?.toString()
      },
      message: 'Spin wheel status fetched successfully'
    };

  } catch (error) {
    console.error('Get spin wheel status error:', error);
    return { success: false, message: 'Failed to get spin wheel status' };
  }
}

export async function updateSpinSchedule(settings: {
  scheduled_days: string[];
  start_time: string;
  end_time: string;
}): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    let spinSettings = await (SpinSettings as any).findOne({});
    
    if (!spinSettings) {
      spinSettings = new (SpinSettings as any)({
        ...settings,
        is_active: false,
        activation_mode: 'scheduled',
        spins_per_session: 3,
        spins_cost_per_spin: 100
      });
    } else {
      spinSettings.scheduled_days = settings.scheduled_days;
      spinSettings.start_time = settings.start_time;
      spinSettings.end_time = settings.end_time;
    }

    spinSettings.last_activated_by = adminUser._id;
    spinSettings.last_activated_at = new Date();

    await spinSettings.save();

    // Log admin action with correct fields
    await (AdminAuditLog as any).create({
      actor_id: adminUser._id.toString(),
      action: 'UPDATE_SPIN_SCHEDULE',
      action_type: 'spin_settings_update',
      target_type: 'SpinSettings',
      target_id: spinSettings._id.toString(),
      resource_type: 'spin_settings',
      resource_id: spinSettings._id.toString(),
      changes: settings,
      metadata: {
        scheduled_days: settings.scheduled_days,
        time_range: `${settings.start_time} - ${settings.end_time}`
      },
      ip_address: 'server-action',
      user_agent: 'server-action',
      spin_related: {
        scheduled_days: settings.scheduled_days as any
      }
    });

    revalidatePath('/admin');

    return { success: true, message: 'Spin schedule updated successfully' };

  } catch (error) {
    console.error('Update spin schedule error:', error);
    return { success: false, message: 'Failed to update spin schedule' };
  }
}

export async function getAdminUsers(filters?: {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  search?: string;
}): Promise<{ 
  success: boolean; 
  data?: any[]; 
  pagination?: any;
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filters?.status && filters.status !== 'all') query.status = filters.status;
    if (filters?.role && filters.role !== 'all') query.role = filters.role;
    if (filters?.search) {
      query.$or = [
        { username: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone_number: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const users = await (Profile as any).find(query)
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await (Profile as any).countDocuments(query);

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: 'Users fetched successfully'
    };

  } catch (error) {
    console.error('Admin users error:', error);
    return { success: false, message: 'Failed to fetch users' };
  }
}

export async function approveUser(userId: string, approvalNotes?: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const user = await (Profile as any).findByIdAndUpdate(
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
      return { success: false, message: 'User not found' };
    }

    // Log the approval action with correct fields
    await (AdminAuditLog as any).create({
      actor_id: adminUser._id.toString(),
      action: 'APPROVE_USER',
      action_type: 'approve',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: { 
        approval_status: 'approved', 
        status: 'active',
        is_approved: true
      },
      metadata: {
        approval_notes: approvalNotes
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/approvals');
    revalidatePath('/admin/users');

    return { success: true, message: 'User approved successfully' };

  } catch (error) {
    console.error('Approve user error:', error);
    return { success: false, message: 'Failed to approve user' };
  }
}

export async function rejectUser(userId: string, rejectionReason: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await (Profile as any).findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const user = await (Profile as any).findByIdAndUpdate(
      userId,
      {
        approval_status: 'rejected',
        is_approved: false,
        status: 'inactive',
        approval_by: adminUser._id,
        approval_at: new Date(),
        approval_notes: rejectionReason
      },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Log the rejection action with correct fields
    await (AdminAuditLog as any).create({
      actor_id: adminUser._id.toString(),
      action: 'REJECT_USER',
      action_type: 'reject',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: { 
        approval_status: 'rejected', 
        status: 'inactive',
        is_approved: false
      },
      metadata: {
        rejection_reason: rejectionReason
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/approvals');
    revalidatePath('/admin/users');

    return { success: true, message: 'User rejected successfully' };

  } catch (error) {
    console.error('Reject user error:', error);
    return { success: false, message: 'Failed to reject user' };
  }
}
