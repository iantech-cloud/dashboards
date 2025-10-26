// actions/withdrawals.ts
'use server';

import { connectToDatabase } from '@/lib/mongoose';
import { 
  Withdrawal, 
  Profile, 
  Transaction, 
  AdminAuditLog,
  MpesaTransaction,
  FailedTransaction 
} from '@/lib/models';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';

// ===========================
// TYPES & INTERFACES
// ===========================

interface WithdrawalFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

interface WithdrawalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  totalAmountCents: number;
  averageAmountCents: number;
}

interface WithdrawalResponse {
  success: boolean;
  message: string;
  withdrawal?: any;
  error?: string;
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Get current admin user
 */
async function getCurrentAdmin() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized - No user ID');
  }

  await connectToDatabase();
  const profile = await Profile.findById(userId).select('role email username');
  
  if (!profile || !['admin', 'support'].includes(profile.role)) {
    throw new Error('Unauthorized - Admin access required');
  }

  return profile;
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  actorId: string,
  action: string,
  targetId: string,
  changes: any,
  metadata?: any
) {
  try {
    await AdminAuditLog.create({
      actor_id: actorId,
      action,
      target_type: 'withdrawal',
      target_id: targetId,
      resource_type: 'withdrawal',
      resource_id: targetId,
      action_type: 'update',
      changes,
      metadata: metadata || {},
      processing_time_ms: 0
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Validate M-Pesa number format
 */
function isValidMpesaNumber(phone: string): boolean {
  // Remove any spaces or special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check if it's a valid Kenyan number format
  // Should be: 254... (12 digits) or 0... (10 digits) or 7.../1... (9 digits)
  const patterns = [
    /^254[71]\d{8}$/,  // 254712345678
    /^0[71]\d{8}$/,    // 0712345678
    /^[71]\d{8}$/      // 712345678
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Format M-Pesa number to standard format (254...)
 */
function formatMpesaNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('254')) {
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    return '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    return '254' + cleaned;
  }
  
  return cleaned;
}

// ===========================
// MAIN WITHDRAWAL FUNCTIONS
// ===========================

/**
 * Get all withdrawals with filters and pagination
 */
export async function getWithdrawals(
  filters: WithdrawalFilters = {},
  page: number = 1,
  limit: number = 20
) {
  try {
    await getCurrentAdmin();
    await connectToDatabase();

    const query: any = {};

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.userId) {
      query.user_id = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      query.created_at = {};
      if (filters.startDate) {
        query.created_at.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.created_at.$lte = filters.endDate;
      }
    }

    if (filters.minAmount || filters.maxAmount) {
      query.amount_cents = {};
      if (filters.minAmount) {
        query.amount_cents.$gte = filters.minAmount * 100;
      }
      if (filters.maxAmount) {
        query.amount_cents.$lte = filters.maxAmount * 100;
      }
    }

    // Search by M-Pesa number or transaction code
    if (filters.search) {
      query.$or = [
        { mpesa_number: { $regex: filters.search, $options: 'i' } },
        { transaction_code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

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

    // Format withdrawals for frontend
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
      userWasActive: w.user_was_active,
      userBalanceBefore: w.user_balance_before,
      userBalanceAfter: w.user_balance_after,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      metadata: w.metadata || {}
    }));

    return {
      success: true,
      withdrawals: formattedWithdrawals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error: any) {
    console.error('Error fetching withdrawals:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch withdrawals',
      withdrawals: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 0 }
    };
  }
}

/**
 * Get withdrawal statistics
 */
export async function getWithdrawalStats(): Promise<WithdrawalStats> {
  try {
    await getCurrentAdmin();
    await connectToDatabase();

    const stats = await Withdrawal.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount_cents' }
        }
      }
    ]);

    const result: WithdrawalStats = {
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

    return result;
  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      totalAmountCents: 0,
      averageAmountCents: 0
    };
  }
}

/**
 * Get single withdrawal details
 */
export async function getWithdrawalById(withdrawalId: string) {
  try {
    await getCurrentAdmin();
    await connectToDatabase();

    const withdrawal = await Withdrawal.findById(withdrawalId)
      .populate('user_id', 'username email phone_number balance_cents total_withdrawals_cents')
      .populate('approved_by', 'username email')
      .lean();

    if (!withdrawal) {
      return {
        success: false,
        error: 'Withdrawal not found'
      };
    }

    // Get related transactions
    const transactions = await Transaction.find({
      user_id: withdrawal.user_id,
      type: 'WITHDRAWAL',
      created_at: {
        $gte: new Date(withdrawal.created_at.getTime() - 60000), // 1 minute before
        $lte: new Date(withdrawal.created_at.getTime() + 60000)  // 1 minute after
      }
    }).lean();

    return {
      success: true,
      withdrawal: {
        ...withdrawal,
        _id: withdrawal._id.toString(),
        relatedTransactions: transactions
      }
    };
  } catch (error: any) {
    console.error('Error fetching withdrawal:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch withdrawal'
    };
  }
}

/**
 * Approve a withdrawal request
 */
export async function approveWithdrawal(
  withdrawalId: string,
  notes?: string
): Promise<WithdrawalResponse> {
  try {
    const admin = await getCurrentAdmin();
    await connectToDatabase();

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal not found'
      };
    }

    if (withdrawal.status !== 'pending') {
      return {
        success: false,
        message: `Cannot approve withdrawal with status: ${withdrawal.status}`
      };
    }

    // Get user profile
    const user = await Profile.findById(withdrawal.user_id);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Validate M-Pesa number
    if (!isValidMpesaNumber(withdrawal.mpesa_number)) {
      return {
        success: false,
        message: 'Invalid M-Pesa number format'
      };
    }

    // Update withdrawal status
    withdrawal.status = 'approved';
    withdrawal.approved_by = admin._id;
    withdrawal.approved_at = new Date();
    withdrawal.processing_notes = notes || 'Approved by admin';
    await withdrawal.save();

    // Create audit log
    await createAuditLog(
      admin._id,
      'APPROVE_WITHDRAWAL',
      withdrawalId,
      {
        status: 'approved',
        approved_by: admin._id,
        notes
      },
      {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents,
        mpesa_number: withdrawal.mpesa_number
      }
    );

    revalidatePath('/admin/withdrawals');

    return {
      success: true,
      message: 'Withdrawal approved successfully',
      withdrawal: withdrawal.toObject()
    };
  } catch (error: any) {
    console.error('Error approving withdrawal:', error);
    return {
      success: false,
      message: 'Failed to approve withdrawal',
      error: error.message
    };
  }
}

/**
 * Reject a withdrawal request
 */
export async function rejectWithdrawal(
  withdrawalId: string,
  reason: string
): Promise<WithdrawalResponse> {
  try {
    const admin = await getCurrentAdmin();
    await connectToDatabase();

    if (!reason || reason.trim().length < 10) {
      return {
        success: false,
        message: 'Rejection reason must be at least 10 characters'
      };
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal not found'
      };
    }

    if (withdrawal.status !== 'pending') {
      return {
        success: false,
        message: `Cannot reject withdrawal with status: ${withdrawal.status}`
      };
    }

    // Get user to refund balance
    const user = await Profile.findById(withdrawal.user_id);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const balanceBefore = user.balance_cents;

    // Refund the amount to user's balance
    user.balance_cents += withdrawal.amount_cents;
    await user.save();

    // Update withdrawal
    withdrawal.status = 'rejected';
    withdrawal.approved_by = admin._id;
    withdrawal.approved_at = new Date();
    withdrawal.failure_reason = reason;
    withdrawal.user_balance_before = balanceBefore;
    withdrawal.user_balance_after = user.balance_cents;
    await withdrawal.save();

    // Create refund transaction
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
      admin_processed_by: admin._id,
      admin_processed_at: new Date(),
      metadata: {
        withdrawal_id: withdrawalId,
        rejection_reason: reason,
        refunded: true
      }
    });

    // Create audit log
    await createAuditLog(
      admin._id,
      'REJECT_WITHDRAWAL',
      withdrawalId,
      {
        status: 'rejected',
        reason,
        refund_amount_cents: withdrawal.amount_cents
      },
      {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents
      }
    );

    revalidatePath('/admin/withdrawals');

    return {
      success: true,
      message: 'Withdrawal rejected and amount refunded to user',
      withdrawal: withdrawal.toObject()
    };
  } catch (error: any) {
    console.error('Error rejecting withdrawal:', error);
    return {
      success: false,
      message: 'Failed to reject withdrawal',
      error: error.message
    };
  }
}

/**
 * Complete a withdrawal (after M-Pesa processing)
 */
export async function completeWithdrawal(
  withdrawalId: string,
  transactionCode: string,
  mpesaReceiptNumber?: string
): Promise<WithdrawalResponse> {
  try {
    const admin = await getCurrentAdmin();
    await connectToDatabase();

    if (!transactionCode || transactionCode.trim().length === 0) {
      return {
        success: false,
        message: 'Transaction code is required'
      };
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal not found'
      };
    }

    if (withdrawal.status !== 'approved') {
      return {
        success: false,
        message: `Cannot complete withdrawal with status: ${withdrawal.status}. It must be approved first.`
      };
    }

    // Check for duplicate transaction code
    const existingWithdrawal = await Withdrawal.findOne({
      transaction_code: transactionCode,
      _id: { $ne: withdrawalId }
    });

    if (existingWithdrawal) {
      return {
        success: false,
        message: 'This transaction code has already been used'
      };
    }

    // Update withdrawal
    withdrawal.status = 'completed';
    withdrawal.transaction_code = transactionCode;
    withdrawal.mpesa_receipt_number = mpesaReceiptNumber || transactionCode;
    withdrawal.processed_at = new Date();
    await withdrawal.save();

    // Update user stats
    const user = await Profile.findById(withdrawal.user_id);
    if (user) {
      user.total_withdrawals_cents += withdrawal.amount_cents;
      user.last_withdrawal_at = new Date();
      await user.save();
    }

    // Create completion transaction record
    await Transaction.create({
      user_id: withdrawal.user_id,
      amount_cents: withdrawal.amount_cents,
      type: 'WITHDRAWAL',
      description: `Withdrawal completed - ${transactionCode}`,
      status: 'completed',
      transaction_code: transactionCode,
      source: 'dashboard',
      admin_processed: true,
      admin_processed_by: admin._id,
      admin_processed_at: new Date(),
      metadata: {
        withdrawal_id: withdrawalId,
        mpesa_receipt: mpesaReceiptNumber,
        completed_by: admin._id
      }
    });

    // Create audit log
    await createAuditLog(
      admin._id,
      'COMPLETE_WITHDRAWAL',
      withdrawalId,
      {
        status: 'completed',
        transaction_code: transactionCode,
        mpesa_receipt_number: mpesaReceiptNumber
      },
      {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents
      }
    );

    revalidatePath('/admin/withdrawals');

    return {
      success: true,
      message: 'Withdrawal completed successfully',
      withdrawal: withdrawal.toObject()
    };
  } catch (error: any) {
    console.error('Error completing withdrawal:', error);
    return {
      success: false,
      message: 'Failed to complete withdrawal',
      error: error.message
    };
  }
}

/**
 * Reverse a completed withdrawal
 */
export async function reverseWithdrawal(
  withdrawalId: string,
  reason: string
): Promise<WithdrawalResponse> {
  try {
    const admin = await getCurrentAdmin();
    await connectToDatabase();

    if (!reason || reason.trim().length < 10) {
      return {
        success: false,
        message: 'Reversal reason must be at least 10 characters'
      };
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal not found'
      };
    }

    if (withdrawal.status !== 'completed') {
      return {
        success: false,
        message: 'Only completed withdrawals can be reversed'
      };
    }

    // Get user
    const user = await Profile.findById(withdrawal.user_id);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const balanceBefore = user.balance_cents;

    // Refund to user balance
    user.balance_cents += withdrawal.amount_cents;
    user.total_withdrawals_cents -= withdrawal.amount_cents;
    await user.save();

    // Update withdrawal to rejected with reversal info
    withdrawal.status = 'rejected';
    withdrawal.failure_reason = `REVERSED: ${reason}`;
    withdrawal.user_balance_before = balanceBefore;
    withdrawal.user_balance_after = user.balance_cents;
    withdrawal.metadata = {
      ...withdrawal.metadata,
      reversed: true,
      reversed_at: new Date(),
      reversed_by: admin._id,
      reversal_reason: reason,
      original_transaction_code: withdrawal.transaction_code
    };
    await withdrawal.save();

    // Create reversal transaction
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
      admin_processed_by: admin._id,
      admin_processed_at: new Date(),
      metadata: {
        withdrawal_id: withdrawalId,
        reversal_reason: reason,
        original_transaction_code: withdrawal.transaction_code,
        reversed: true
      }
    });

    // Create audit log
    await createAuditLog(
      admin._id,
      'REVERSE_WITHDRAWAL',
      withdrawalId,
      {
        status: 'reversed',
        reason,
        refund_amount_cents: withdrawal.amount_cents
      },
      {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents,
        original_transaction_code: withdrawal.transaction_code
      }
    );

    revalidatePath('/admin/withdrawals');

    return {
      success: true,
      message: 'Withdrawal reversed successfully and amount refunded',
      withdrawal: withdrawal.toObject()
    };
  } catch (error: any) {
    console.error('Error reversing withdrawal:', error);
    return {
      success: false,
      message: 'Failed to reverse withdrawal',
      error: error.message
    };
  }
}

/**
 * Bulk approve withdrawals
 */
export async function bulkApproveWithdrawals(
  withdrawalIds: string[],
  notes?: string
): Promise<{ success: boolean; message: string; approved: number; failed: number }> {
  try {
    const admin = await getCurrentAdmin();
    await connectToDatabase();

    let approved = 0;
    let failed = 0;

    for (const id of withdrawalIds) {
      const result = await approveWithdrawal(id, notes);
      if (result.success) {
        approved++;
      } else {
        failed++;
      }
    }

    revalidatePath('/admin/withdrawals');

    return {
      success: true,
      message: `Approved ${approved} withdrawals. ${failed} failed.`,
      approved,
      failed
    };
  } catch (error: any) {
    console.error('Error bulk approving withdrawals:', error);
    return {
      success: false,
      message: 'Failed to bulk approve withdrawals',
      approved: 0,
      failed: withdrawalIds.length
    };
  }
}

/**
 * Get user withdrawal history
 */
export async function getUserWithdrawals(userId: string, limit: number = 10) {
  try {
    await getCurrentAdmin();
    await connectToDatabase();

    const withdrawals = await Withdrawal.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    return {
      success: true,
      withdrawals
    };
  } catch (error: any) {
    console.error('Error fetching user withdrawals:', error);
    return {
      success: false,
      error: error.message,
      withdrawals: []
    };
  }
}

/**
 * Export withdrawals to CSV
 */
export async function exportWithdrawals(filters: WithdrawalFilters = {}) {
  try {
    await getCurrentAdmin();
    await connectToDatabase();

    const query: any = {};
    
    // Apply same filters as getWithdrawals
    if (filters.status) query.status = filters.status;
    if (filters.userId) query.user_id = filters.userId;
    if (filters.startDate || filters.endDate) {
      query.created_at = {};
      if (filters.startDate) query.created_at.$gte = filters.startDate;
      if (filters.endDate) query.created_at.$lte = filters.endDate;
    }

    const withdrawals = await Withdrawal.find(query)
      .populate('user_id', 'username email phone_number')
      .populate('approved_by', 'username email')
      .sort({ created_at: -1 })
      .lean();

    // Format for CSV
    const csvData = withdrawals.map((w: any) => ({
      id: w._id.toString(),
      user: w.user_id?.username || 'Unknown',
      email: w.user_id?.email || 'N/A',
      phone: w.user_id?.phone_number || 'N/A',
      amount: (w.amount_cents / 100).toFixed(2),
      mpesa_number: w.mpesa_number,
      status: w.status,
      transaction_code: w.transaction_code || 'N/A',
      approved_by: w.approved_by?.username || 'N/A',
      approved_at: w.approved_at || 'N/A',
      created_at: w.created_at,
      failure_reason: w.failure_reason || 'N/A'
    }));

    return {
      success: true,
      data: csvData
    };
  } catch (error: any) {
    console.error('Error exporting withdrawals:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}
