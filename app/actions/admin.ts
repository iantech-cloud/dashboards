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

// ===========================
// TYPES & INTERFACES
// ===========================

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

interface WithdrawalFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// ===========================
// ADMIN STATISTICS
// ===========================

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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
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
      Profile.countDocuments(),
      Profile.countDocuments({ approval_status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      Profile.countDocuments({ 
        approval_status: 'approved', 
        status: 'active',
        is_active: true 
      }),
      Transaction.countDocuments(),
      ActivationPayment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount_cents' } } }
      ]),
      Referral.countDocuments(),
      Profile.countDocuments({
        created_at: { $gte: startOfToday }
      }),
      SpinSettings.findOne({})
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

// ===========================
// WITHDRAWAL MANAGEMENT
// ===========================

export async function getWithdrawalsAdmin(filters?: WithdrawalFilters): Promise<{ 
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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!['admin', 'support'].includes(adminUser?.role)) {
      return { success: false, message: 'Admin access required' };
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};
    
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    
    if (filters?.search) {
      query.$or = [
        { mpesa_number: { $regex: filters.search, $options: 'i' } },
        { transaction_code: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.created_at = {};
      if (filters.startDate) {
        query.created_at.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.created_at.$lte = new Date(filters.endDate);
      }
    }

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .populate('user_id', 'username email phone_number balance_cents')
        .populate('approved_by', 'username email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(query)
    ]);

    const formattedWithdrawals = withdrawals.map((w: any) => ({
      _id: w._id.toString(),
      userId: w.user_id?._id || w.user_id,
      user: {
        id: w.user_id?._id,
        username: w.user_id?.username,
        email: w.user_id?.email,
        phone: w.user_id?.phone_number,
        balance: w.user_id?.balance_cents || 0
      },
      amount: w.amount_cents / 100,
      amountCents: w.amount_cents,
      status: w.status,
      mpesaNumber: w.mpesa_number,
      transactionCode: w.transaction_code,
      mpesaReceiptNumber: w.mpesa_receipt_number,
      approvedBy: w.approved_by ? {
        id: w.approved_by._id,
        username: w.approved_by.username,
        email: w.approved_by.email
      } : null,
      approvedAt: w.approved_at,
      processedAt: w.processed_at,
      processingNotes: w.processing_notes,
      failureReason: w.failure_reason,
      createdAt: w.created_at,
      updatedAt: w.updated_at
    }));

    return {
      success: true,
      data: formattedWithdrawals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      message: 'Withdrawals fetched successfully'
    };

  } catch (error) {
    console.error('Get withdrawals error:', error);
    return { success: false, message: 'Failed to fetch withdrawals' };
  }
}

export async function getWithdrawalStatsAdmin(): Promise<{ 
  success: boolean; 
  data?: any;
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!['admin', 'support'].includes(adminUser?.role)) {
      return { success: false, message: 'Admin access required' };
    }

    const stats = await Withdrawal.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount_cents' }
        }
      }
    ]);

    const result: any = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      totalAmountCents: 0,
      averageAmountCents: 0
    };

    stats.forEach((stat) => {
      result.total += stat.count;
      result.totalAmountCents += stat.totalAmount;
      
      if (stat._id === 'pending') result.pending = stat.count;
      if (stat._id === 'approved') result.approved = stat.count;
      if (stat._id === 'rejected') result.rejected = stat.count;
      if (stat._id === 'completed') result.completed = stat.count;
    });

    result.averageAmountCents = result.total > 0 
      ? Math.round(result.totalAmountCents / result.total) 
      : 0;

    return {
      success: true,
      data: result,
      message: 'Stats fetched successfully'
    };

  } catch (error) {
    console.error('Get withdrawal stats error:', error);
    return { success: false, message: 'Failed to fetch withdrawal stats' };
  }
}

export async function approveWithdrawalAdmin(
  withdrawalId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!['admin', 'support'].includes(adminUser?.role)) {
      return { success: false, message: 'Admin access required' };
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return { success: false, message: 'Withdrawal not found' };
    }

    if (withdrawal.status !== 'pending') {
      return { success: false, message: `Cannot approve withdrawal with status: ${withdrawal.status}` };
    }

    withdrawal.status = 'approved';
    withdrawal.approved_by = adminUser._id;
    withdrawal.approved_at = new Date();
    withdrawal.processing_notes = notes || 'Approved by admin';
    await withdrawal.save();

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'APPROVE_WITHDRAWAL',
      action_type: 'approve',
      target_type: 'Withdrawal',
      target_id: withdrawalId,
      resource_type: 'withdrawal',
      resource_id: withdrawalId,
      changes: {
        status: 'approved',
        approved_by: adminUser._id,
        notes
      },
      metadata: {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents,
        mpesa_number: withdrawal.mpesa_number
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/withdrawals');

    return { success: true, message: 'Withdrawal approved successfully' };

  } catch (error) {
    console.error('Approve withdrawal error:', error);
    return { success: false, message: 'Failed to approve withdrawal' };
  }
}

export async function rejectWithdrawalAdmin(
  withdrawalId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, message: 'Rejection reason must be at least 10 characters' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!['admin', 'support'].includes(adminUser?.role)) {
      return { success: false, message: 'Admin access required' };
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return { success: false, message: 'Withdrawal not found' };
    }

    if (withdrawal.status !== 'pending') {
      return { success: false, message: `Cannot reject withdrawal with status: ${withdrawal.status}` };
    }

    const user = await Profile.findById(withdrawal.user_id);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const balanceBefore = user.balance_cents;
    user.balance_cents += withdrawal.amount_cents;
    await user.save();

    withdrawal.status = 'rejected';
    withdrawal.approved_by = adminUser._id;
    withdrawal.approved_at = new Date();
    withdrawal.failure_reason = reason;
    withdrawal.user_balance_before = balanceBefore;
    withdrawal.user_balance_after = user.balance_cents;
    await withdrawal.save();

    await Transaction.create({
      user_id: withdrawal.user_id,
      amount_cents: withdrawal.amount_cents,
      type: 'WITHDRAWAL',
      description: `Refund for rejected withdrawal - ${reason}`,
      status: 'completed',
      balance_before_cents: balanceBefore,
      balance_after_cents: user.balance_cents,
      source: 'dashboard',
      admin_processed: true,
      admin_processed_by: adminUser._id,
      admin_processed_at: new Date(),
      metadata: {
        withdrawal_id: withdrawalId,
        rejection_reason: reason,
        refunded: true
      }
    });

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'REJECT_WITHDRAWAL',
      action_type: 'reject',
      target_type: 'Withdrawal',
      target_id: withdrawalId,
      resource_type: 'withdrawal',
      resource_id: withdrawalId,
      changes: {
        status: 'rejected',
        reason,
        refund_amount_cents: withdrawal.amount_cents
      },
      metadata: {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/withdrawals');

    return { success: true, message: 'Withdrawal rejected and amount refunded to user' };

  } catch (error) {
    console.error('Reject withdrawal error:', error);
    return { success: false, message: 'Failed to reject withdrawal' };
  }
}

export async function completeWithdrawalAdmin(
  withdrawalId: string,
  transactionCode: string,
  mpesaReceiptNumber?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    if (!transactionCode || transactionCode.trim().length === 0) {
      return { success: false, message: 'Transaction code is required' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!['admin', 'support'].includes(adminUser?.role)) {
      return { success: false, message: 'Admin access required' };
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return { success: false, message: 'Withdrawal not found' };
    }

    if (withdrawal.status !== 'approved') {
      return { success: false, message: `Cannot complete withdrawal with status: ${withdrawal.status}. It must be approved first.` };
    }

    const existingWithdrawal = await Withdrawal.findOne({
      transaction_code: transactionCode,
      _id: { $ne: withdrawalId }
    });

    if (existingWithdrawal) {
      return { success: false, message: 'This transaction code has already been used' };
    }

    withdrawal.status = 'completed';
    withdrawal.transaction_code = transactionCode;
    withdrawal.mpesa_receipt_number = mpesaReceiptNumber || transactionCode;
    withdrawal.processed_at = new Date();
    await withdrawal.save();

    const user = await Profile.findById(withdrawal.user_id);
    if (user) {
      user.total_withdrawals_cents += withdrawal.amount_cents;
      user.last_withdrawal_at = new Date();
      await user.save();
    }

    await Transaction.create({
      user_id: withdrawal.user_id,
      amount_cents: withdrawal.amount_cents,
      type: 'WITHDRAWAL',
      description: `Withdrawal completed - ${transactionCode}`,
      status: 'completed',
      transaction_code: transactionCode,
      source: 'dashboard',
      admin_processed: true,
      admin_processed_by: adminUser._id,
      admin_processed_at: new Date(),
      metadata: {
        withdrawal_id: withdrawalId,
        mpesa_receipt: mpesaReceiptNumber,
        completed_by: adminUser._id
      }
    });

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'COMPLETE_WITHDRAWAL',
      action_type: 'update',
      target_type: 'Withdrawal',
      target_id: withdrawalId,
      resource_type: 'withdrawal',
      resource_id: withdrawalId,
      changes: {
        status: 'completed',
        transaction_code: transactionCode,
        mpesa_receipt_number: mpesaReceiptNumber
      },
      metadata: {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/withdrawals');

    return { success: true, message: 'Withdrawal completed successfully' };

  } catch (error) {
    console.error('Complete withdrawal error:', error);
    return { success: false, message: 'Failed to complete withdrawal' };
  }
}

export async function reverseWithdrawalAdmin(
  withdrawalId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, message: 'Reversal reason must be at least 10 characters' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return { success: false, message: 'Withdrawal not found' };
    }

    if (withdrawal.status !== 'completed') {
      return { success: false, message: 'Only completed withdrawals can be reversed' };
    }

    const user = await Profile.findById(withdrawal.user_id);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const balanceBefore = user.balance_cents;
    user.balance_cents += withdrawal.amount_cents;
    user.total_withdrawals_cents -= withdrawal.amount_cents;
    await user.save();

    withdrawal.status = 'rejected';
    withdrawal.failure_reason = `REVERSED: ${reason}`;
    withdrawal.user_balance_before = balanceBefore;
    withdrawal.user_balance_after = user.balance_cents;
    withdrawal.metadata = {
      ...withdrawal.metadata,
      reversed: true,
      reversed_at: new Date(),
      reversed_by: adminUser._id,
      reversal_reason: reason,
      original_transaction_code: withdrawal.transaction_code
    };
    await withdrawal.save();

    await Transaction.create({
      user_id: withdrawal.user_id,
      amount_cents: withdrawal.amount_cents,
      type: 'WITHDRAWAL',
      description: `Withdrawal reversal - ${reason}`,
      status: 'completed',
      balance_before_cents: balanceBefore,
      balance_after_cents: user.balance_cents,
      source: 'dashboard',
      admin_processed: true,
      admin_processed_by: adminUser._id,
      admin_processed_at: new Date(),
      metadata: {
        withdrawal_id: withdrawalId,
        reversal_reason: reason,
        original_transaction_code: withdrawal.transaction_code,
        reversed: true
      }
    });

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'REVERSE_WITHDRAWAL',
      action_type: 'update',
      target_type: 'Withdrawal',
      target_id: withdrawalId,
      resource_type: 'withdrawal',
      resource_id: withdrawalId,
      changes: {
        status: 'reversed',
        reason,
        refund_amount_cents: withdrawal.amount_cents
      },
      metadata: {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents,
        original_transaction_code: withdrawal.transaction_code
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/withdrawals');

    return { success: true, message: 'Withdrawal reversed successfully and amount refunded' };

  } catch (error) {
    console.error('Reverse withdrawal error:', error);
    return { success: false, message: 'Failed to reverse withdrawal' };
  }
}

export async function bulkApproveWithdrawalsAdmin(
  withdrawalIds: string[],
  notes?: string
): Promise<{ success: boolean; message: string; approved: number; failed: number; errors?: string[] }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { 
        success: false, 
        message: 'Unauthorized', 
        approved: 0, 
        failed: withdrawalIds.length 
      };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!['admin', 'support'].includes(adminUser?.role)) {
      return { 
        success: false, 
        message: 'Admin access required', 
        approved: 0, 
        failed: withdrawalIds.length 
      };
    }

    let approved = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process withdrawals sequentially to avoid race conditions
    for (const id of withdrawalIds) {
      try {
        const withdrawal = await Withdrawal.findById(id);
        
        if (!withdrawal) {
          errors.push(`Withdrawal ${id} not found`);
          failed++;
          continue;
        }

        if (withdrawal.status !== 'pending') {
          errors.push(`Withdrawal ${id} has status: ${withdrawal.status}`);
          failed++;
          continue;
        }

        // Update withdrawal directly for better performance
        withdrawal.status = 'approved';
        withdrawal.approved_by = adminUser._id;
        withdrawal.approved_at = new Date();
        withdrawal.processing_notes = notes || 'Bulk approved by admin';
        await withdrawal.save();

        // Log individual approval
        await AdminAuditLog.create({
          actor_id: adminUser._id.toString(),
          action: 'APPROVE_WITHDRAWAL',
          action_type: 'approve',
          target_type: 'Withdrawal',
          target_id: id,
          resource_type: 'withdrawal',
          resource_id: id,
          changes: {
            status: 'approved',
            approved_by: adminUser._id,
            notes
          },
          metadata: {
            user_id: withdrawal.user_id,
            amount_cents: withdrawal.amount_cents,
            mpesa_number: withdrawal.mpesa_number,
            bulk_operation: true
          },
          ip_address: 'server-action',
          user_agent: 'server-action'
        });

        approved++;
      } catch (error) {
        console.error(`Error processing withdrawal ${id}:`, error);
        errors.push(`Failed to process withdrawal ${id}`);
        failed++;
      }
    }

    revalidatePath('/admin/withdrawals');

    return {
      success: failed === 0,
      message: `Processed ${withdrawalIds.length} withdrawals: ${approved} approved, ${failed} failed`,
      approved,
      failed,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('Bulk approve error:', error);
    return {
      success: false,
      message: 'Failed to bulk approve withdrawals',
      approved: 0,
      failed: withdrawalIds.length,
      errors: ['System error during bulk operation']
    };
  }
}

export async function getUserWithdrawalsAdmin(
  userId: string,
  filters?: { page?: number; limit?: number; status?: string }
): Promise<{ 
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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!['admin', 'support'].includes(adminUser?.role)) {
      return { success: false, message: 'Admin access required' };
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { user_id: userId };
    
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .populate('approved_by', 'username email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(query)
    ]);

    const user = await Profile.findById(userId).select('username email phone_number balance_cents');

    const formattedWithdrawals = withdrawals.map((w: any) => ({
      _id: w._id.toString(),
      amount: w.amount_cents / 100,
      amountCents: w.amount_cents,
      status: w.status,
      mpesaNumber: w.mpesa_number,
      transactionCode: w.transaction_code,
      mpesaReceiptNumber: w.mpesa_receipt_number,
      approvedBy: w.approved_by ? {
        id: w.approved_by._id,
        username: w.approved_by.username,
        email: w.approved_by.email
      } : null,
      approvedAt: w.approved_at,
      processedAt: w.processed_at,
      processingNotes: w.processing_notes,
      failureReason: w.failure_reason,
      createdAt: w.created_at,
      updatedAt: w.updated_at
    }));

    return {
      success: true,
      data: formattedWithdrawals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      message: 'User withdrawals fetched successfully'
    };

  } catch (error) {
    console.error('Get user withdrawals error:', error);
    return { success: false, message: 'Failed to fetch user withdrawals' };
  }
}

export async function updateWithdrawalNotesAdmin(
  withdrawalId: string,
  notes: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (!['admin', 'support'].includes(adminUser?.role)) {
      return { success: false, message: 'Admin access required' };
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return { success: false, message: 'Withdrawal not found' };
    }

    const previousNotes = withdrawal.processing_notes;
    withdrawal.processing_notes = notes;
    await withdrawal.save();

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'UPDATE_WITHDRAWAL_NOTES',
      action_type: 'update',
      target_type: 'Withdrawal',
      target_id: withdrawalId,
      resource_type: 'withdrawal',
      resource_id: withdrawalId,
      changes: {
        processing_notes: {
          from: previousNotes,
          to: notes
        }
      },
      metadata: {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/withdrawals');

    return { success: true, message: 'Withdrawal notes updated successfully' };

  } catch (error) {
    console.error('Update withdrawal notes error:', error);
    return { success: false, message: 'Failed to update withdrawal notes' };
  }
}

// ===========================
// SPIN WHEEL CONTROL
// ===========================

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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    let spinSettings = await SpinSettings.findOne({});
    
    if (!spinSettings) {
      // Create default settings if they don't exist
      spinSettings = new SpinSettings({
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
    await AdminAuditLog.create({
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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const spinSettings = await SpinSettings.findOne({});
    
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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    let spinSettings = await SpinSettings.findOne({});
    
    if (!spinSettings) {
      spinSettings = new SpinSettings({
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
    await AdminAuditLog.create({
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

// ===========================
// USER MANAGEMENT
// ===========================

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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
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

    const users = await Profile.find(query)
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Profile.countDocuments(query);

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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

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
      return { success: false, message: 'User not found' };
    }

    // Log the approval action with correct fields
    await AdminAuditLog.create({
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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const user = await Profile.findByIdAndUpdate(
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
    await AdminAuditLog.create({
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

export async function suspendUser(
  userId: string, 
  suspensionReason: string,
  durationDays?: number
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const user = await Profile.findByIdAndUpdate(
      userId,
      {
        status: 'suspended',
        is_active: false,
        suspension_reason: suspensionReason,
        suspended_at: new Date()
      },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'SUSPEND_USER',
      action_type: 'suspend',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: { 
        status: 'suspended',
        is_active: false
      },
      metadata: {
        suspension_reason: suspensionReason,
        duration_days: durationDays
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/users');

    return { success: true, message: 'User suspended successfully' };

  } catch (error) {
    console.error('Suspend user error:', error);
    return { success: false, message: 'Failed to suspend user' };
  }
}

export async function banUser(
  userId: string, 
  banReason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const user = await Profile.findByIdAndUpdate(
      userId,
      {
        status: 'banned',
        is_active: false,
        ban_reason: banReason,
        banned_at: new Date()
      },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'BAN_USER',
      action_type: 'ban',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: { 
        status: 'banned',
        is_active: false
      },
      metadata: {
        ban_reason: banReason
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/users');

    return { success: true, message: 'User banned successfully' };

  } catch (error) {
    console.error('Ban user error:', error);
    return { success: false, message: 'Failed to ban user' };
  }
}

export async function activateUser(userId: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const user = await Profile.findByIdAndUpdate(
      userId,
      {
        status: 'active',
        is_active: true,
        suspension_reason: null,
        suspended_at: null,
        ban_reason: null,
        banned_at: null
      },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'ACTIVATE_USER',
      action_type: 'activate',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: { 
        status: 'active',
        is_active: true
      },
      metadata: {},
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/users');

    return { success: true, message: 'User activated successfully' };

  } catch (error) {
    console.error('Activate user error:', error);
    return { success: false, message: 'Failed to activate user' };
  }
}

export async function updateUserBalance(
  userId: string,
  amount: number,
  reason: string,
  operation: 'add' | 'subtract'
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getServerSession(authOptions as AuthOptions);
    
    if (!session?.user?.email) {
      return { success: false, message: 'Unauthorized' };
    }

    await connectToDatabase();
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const user = await Profile.findById(userId);
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const balanceBefore = user.balance_cents;
    const amountCents = Math.abs(amount * 100);
    
    if (operation === 'add') {
      user.balance_cents += amountCents;
    } else {
      if (user.balance_cents < amountCents) {
        return { success: false, message: 'Insufficient balance' };
      }
      user.balance_cents -= amountCents;
    }

    await user.save();

    await Transaction.create({
      user_id: userId,
      amount_cents: amountCents,
      type: 'BONUS',
      description: `Admin adjustment: ${reason}`,
      status: 'completed',
      balance_before_cents: balanceBefore,
      balance_after_cents: user.balance_cents,
      source: 'dashboard',
      admin_processed: true,
      admin_processed_by: adminUser._id,
      admin_processed_at: new Date(),
      metadata: {
        operation,
        reason,
        admin_id: adminUser._id
      }
    });

    await AdminAuditLog.create({
      actor_id: adminUser._id.toString(),
      action: 'UPDATE_USER_BALANCE',
      action_type: 'update',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: { 
        balance_before: balanceBefore,
        balance_after: user.balance_cents,
        operation,
        amount: amountCents
      },
      metadata: {
        reason
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });

    revalidatePath('/admin/users');

    return { 
      success: true, 
      message: `Balance ${operation === 'add' ? 'added' : 'deducted'} successfully` 
    };

  } catch (error) {
    console.error('Update balance error:', error);
    return { success: false, message: 'Failed to update user balance' };
  }
}

// ===========================
// AUDIT LOGS
// ===========================

export async function getAuditLogs(filters?: {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
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
    const adminUser = await Profile.findOne({ email: session.user.email });
    
    if (adminUser?.role !== 'admin') {
      return { success: false, message: 'Admin access required' };
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const query: any = {};
    
    if (filters?.actorId) {
      query.actor_id = filters.actorId;
    }
    
    if (filters?.action) {
      query.action = filters.action;
    }
    
    if (filters?.resourceType) {
      query.resource_type = filters.resourceType;
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.created_at = {};
      if (filters.startDate) {
        query.created_at.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.created_at.$lte = new Date(filters.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(query)
        .populate('actor_id', 'username email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(query)
    ]);

    return {
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      message: 'Audit logs fetched successfully'
    };

  } catch (error) {
    console.error('Get audit logs error:', error);
    return { success: false, message: 'Failed to fetch audit logs' };
  }
}
