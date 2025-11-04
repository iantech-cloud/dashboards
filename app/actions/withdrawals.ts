// actions/withdrawals.ts
'use server';

import { revalidatePath } from 'next/cache';
import { 
  connectToDatabase, 
  Profile, 
  Withdrawal, 
  Transaction, 
  AdminAuditLog
} from '../lib/models';
import { auth } from '@/auth';

// ===========================
// TYPES & INTERFACES
// ===========================

interface WithdrawalFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
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

interface PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message: string;
}

interface BulkApprovalResponse {
  success: boolean;
  message: string;
  approved: number;
  failed: number;
  errorMessage?: string[];
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Get current admin user with proper authorization check
 */
async function getCurrentAdmin() {
  const session = await auth();
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized - No session');
  }

  await connectToDatabase();
  const adminUser = await Profile.findOne({ email: session.user.email });
  
  if (!adminUser) {
    throw new Error('Unauthorized - User not found');
  }

  if (!['admin', 'support'].includes(adminUser.role)) {
    throw new Error('Unauthorized - Admin or support access required');
  }

  return adminUser;
}

/**
 * Create audit log entry for withdrawal actions
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
      target_type: 'Withdrawal',
      target_id: targetId,
      resource_type: 'withdrawal',
      resource_id: targetId,
      action_type: action.toLowerCase().replace(/_/g, '-'),
      changes,
      metadata: metadata || {},
      ip_address: 'server-action',
      user_agent: 'server-action',
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
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
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
  filters?: WithdrawalFilters
): Promise<PaginatedResponse<any>> {
  try {
    console.log('[getWithdrawals] Starting with filters:', filters);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {};

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    // User ID filter
    if (filters?.userId) {
      query.user_id = filters.userId;
    }

    // Search filter (M-Pesa number, transaction code, username, or email)
    if (filters?.search) {
      query.$or = [
        { mpesa_number: { $regex: filters.search, $options: 'i' } },
        { transaction_code: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (filters?.startDate || filters?.endDate) {
      query.created_at = {};
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setUTCHours(0, 0, 0, 0);
        query.created_at.$gte = startDate;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setUTCHours(23, 59, 59, 999);
        query.created_at.$lte = endDate;
      }
    }

    // Amount range filter
    if (filters?.minAmount || filters?.maxAmount) {
      query.amount_cents = {};
      if (filters.minAmount) {
        query.amount_cents.$gte = filters.minAmount * 100;
      }
      if (filters.maxAmount) {
        query.amount_cents.$lte = filters.maxAmount * 100;
      }
    }

    console.log('[getWithdrawals] Query:', JSON.stringify(query));

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

    console.log(`[getWithdrawals] Found ${withdrawals.length} withdrawals, total: ${total}`);

    // Format withdrawals for frontend
    const formattedWithdrawals = withdrawals.map((w: any) => ({
      _id: w._id.toString(),
      userId: w.user_id?._id?.toString() || w.user_id?.toString(),
      user: {
        id: w.user_id?._id?.toString() || w.user_id?.toString(),
        username: w.user_id?.username || 'Unknown',
        email: w.user_id?.email || 'Unknown',
        phone: w.user_id?.phone_number || 'Unknown',
        balance: w.user_id?.balance_cents || 0
      },
      amount: w.amount_cents / 100,
      amountCents: w.amount_cents,
      status: w.status,
      mpesaNumber: w.mpesa_number,
      transactionCode: w.transaction_code,
      mpesaReceiptNumber: w.mpesa_receipt_number,
      approvedBy: w.approved_by ? {
        id: w.approved_by._id?.toString(),
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
      data: formattedWithdrawals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      message: 'Withdrawals fetched successfully'
    };

  } catch (error: any) {
    console.error('[getWithdrawals] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch withdrawals'
    };
  }
}

/**
 * Get withdrawal statistics
 */
export async function getWithdrawalStats(): Promise<{
  success: boolean;
  data?: WithdrawalStats;
  message: string;
}> {
  try {
    console.log('[getWithdrawalStats] Starting...');
    
    const adminUser = await getCurrentAdmin();
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

    console.log('[getWithdrawalStats] Raw stats:', stats);

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

    console.log('[getWithdrawalStats] Final result:', result);

    return {
      success: true,
      data: result,
      message: 'Stats fetched successfully'
    };

  } catch (error: any) {
    console.error('[getWithdrawalStats] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch withdrawal stats'
    };
  }
}

/**
 * Get single withdrawal details
 */
export async function getWithdrawalById(
  withdrawalId: string
): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> {
  try {
    console.log('[getWithdrawalById] Starting for:', withdrawalId);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const withdrawal = await Withdrawal.findById(withdrawalId)
      .populate('user_id', 'username email phone_number balance_cents total_withdrawals_cents')
      .populate('approved_by', 'username email')
      .lean();

    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal not found'
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
      data: {
        ...withdrawal,
        _id: withdrawal._id.toString(),
        relatedTransactions: transactions
      },
      message: 'Withdrawal details fetched successfully'
    };

  } catch (error: any) {
    console.error('[getWithdrawalById] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch withdrawal details'
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
    console.log('[approveWithdrawal] Starting for:', withdrawalId);
    
    const adminUser = await getCurrentAdmin();
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

    // Get user profile to validate
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
    withdrawal.approved_by = adminUser._id;
    withdrawal.approved_at = new Date();
    withdrawal.processing_notes = notes || 'Approved by admin';
    await withdrawal.save();

    // Create audit log
    await createAuditLog(
      adminUser._id.toString(),
      'APPROVE_WITHDRAWAL',
      withdrawalId,
      {
        status: 'approved',
        approved_by: adminUser._id,
        notes
      },
      {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents,
        mpesa_number: withdrawal.mpesa_number
      }
    );

    revalidatePath('/admin/withdrawals');

    console.log('[approveWithdrawal] Success');

    return {
      success: true,
      message: 'Withdrawal approved successfully',
      withdrawal: withdrawal.toObject()
    };

  } catch (error: any) {
    console.error('[approveWithdrawal] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to approve withdrawal'
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
    console.log('[rejectWithdrawal] Starting for:', withdrawalId);
    
    const adminUser = await getCurrentAdmin();
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
    withdrawal.approved_by = adminUser._id;
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
      admin_processed_by: adminUser._id,
      admin_processed_at: new Date(),
      metadata: {
        withdrawal_id: withdrawalId,
        rejection_reason: reason,
        refunded: true
      }
    });

    // Create audit log
    await createAuditLog(
      adminUser._id.toString(),
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

    console.log('[rejectWithdrawal] Success');

    return {
      success: true,
      message: 'Withdrawal rejected and amount refunded to user',
      withdrawal: withdrawal.toObject()
    };

  } catch (error: any) {
    console.error('[rejectWithdrawal] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to reject withdrawal'
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
    console.log('[completeWithdrawal] Starting for:', withdrawalId);
    
    const adminUser = await getCurrentAdmin();
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
      admin_processed_by: adminUser._id,
      admin_processed_at: new Date(),
      metadata: {
        withdrawal_id: withdrawalId,
        mpesa_receipt: mpesaReceiptNumber,
        completed_by: adminUser._id
      }
    });

    // Create audit log
    await createAuditLog(
      adminUser._id.toString(),
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

    console.log('[completeWithdrawal] Success');

    return {
      success: true,
      message: 'Withdrawal completed successfully',
      withdrawal: withdrawal.toObject()
    };

  } catch (error: any) {
    console.error('[completeWithdrawal] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to complete withdrawal'
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
    console.log('[reverseWithdrawal] Starting for:', withdrawalId);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    // Only admin (not support) can reverse withdrawals
    if (adminUser.role !== 'admin') {
      return {
        success: false,
        message: 'Only admins can reverse withdrawals'
      };
    }

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
      reversed_by: adminUser._id,
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
      admin_processed_by: adminUser._id,
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
      adminUser._id.toString(),
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

    console.log('[reverseWithdrawal] Success');

    return {
      success: true,
      message: 'Withdrawal reversed successfully and amount refunded',
      withdrawal: withdrawal.toObject()
    };

  } catch (error: any) {
    console.error('[reverseWithdrawal] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to reverse withdrawal'
    };
  }
}

/**
 * Bulk approve withdrawals
 */
export async function bulkApproveWithdrawals(
  withdrawalIds: string[],
  notes?: string
): Promise<BulkApprovalResponse> {
  try {
    console.log('[bulkApproveWithdrawals] Starting for', withdrawalIds.length, 'withdrawals');
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    let approved = 0;
    let failed = 0;
    const errorMessages: string[] = [];

    // Process withdrawals sequentially to avoid race conditions
    for (const id of withdrawalIds) {
      try {
        const withdrawal = await Withdrawal.findById(id);
        
        if (!withdrawal) {
          errorMessage.push(`Withdrawal ${id} not found`);
          failed++;
          continue;
        }

        if (withdrawal.status !== 'pending') {
          errorMessage.push(`Withdrawal ${id} has status: ${withdrawal.status}`);
          failed++;
          continue;
        }

        // Validate M-Pesa number
        if (!isValidMpesaNumber(withdrawal.mpesa_number)) {
          errorMessage.push(`Withdrawal ${id} has invalid M-Pesa number`);
          failed++;
          continue;
        }

        // Update withdrawal
        withdrawal.status = 'approved';
        withdrawal.approved_by = adminUser._id;
        withdrawal.approved_at = new Date();
        withdrawal.processing_notes = notes || 'Bulk approved by admin';
        await withdrawal.save();

        // Log individual approval
        await createAuditLog(
          adminUser._id.toString(),
          'APPROVE_WITHDRAWAL',
          id,
          {
            status: 'approved',
            approved_by: adminUser._id,
            notes
          },
          {
            user_id: withdrawal.user_id,
            amount_cents: withdrawal.amount_cents,
            mpesa_number: withdrawal.mpesa_number,
            bulk_operation: true
          }
        );

        approved++;
      } catch (error: any) {
        console.error(`Error processing withdrawal ${id}:`, error);
        errorMessage.push(`Failed to process withdrawal ${id}: ${error.message}`);
        failed++;
      }
    }

    revalidatePath('/admin/withdrawals');

    console.log('[bulkApproveWithdrawals] Completed:', { approved, failed });

    return {
      success: failed === 0,
      message: `Processed ${withdrawalIds.length} withdrawals: ${approved} approved, ${failed} failed`,
      approved,
      failed,
      errorMessage: errorMessage.length > 0 ? errorMessage : undefined
    };

  } catch (error: any) {
    console.error('[bulkApproveWithdrawals] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to bulk approve withdrawals',
      approved: 0,
      failed: withdrawalIds.length,
      errorMessage: ['System error during bulk operation']
    };
  }
}

/**
 * Get user withdrawal history
 */
export async function getUserWithdrawals(
  userId: string,
  filters?: { page?: number; limit?: number; status?: string }
): Promise<PaginatedResponse<any>> {
  try {
    console.log('[getUserWithdrawals] Starting for user:', userId);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

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

    const formattedWithdrawals = withdrawals.map((w: any) => ({
      _id: w._id.toString(),
      amount: w.amount_cents / 100,
      amountCents: w.amount_cents,
      status: w.status,
      mpesaNumber: w.mpesa_number,
      transactionCode: w.transaction_code,
      mpesaReceiptNumber: w.mpesa_receipt_number,
      approvedBy: w.approved_by ? {
        id: w.approved_by._id?.toString(),
        username: w.approved_by.username,
        email: w.approved_by.email
      } : null,
      approvedAt: w.approved_at,
      processedAt: w.processed_at,
      processingNotes: w.processing_notes,
      failureReason: w.failure_reason,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      metadata: w.metadata || {}
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

  } catch (error: any) {
    console.error('[getUserWithdrawals] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch user withdrawals'
    };
  }
}

/**
 * Update withdrawal processing notes
 */
export async function updateWithdrawalNotes(
  withdrawalId: string,
  notes: string
): Promise<WithdrawalResponse> {
  try {
    console.log('[updateWithdrawalNotes] Starting for:', withdrawalId);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal not found'
      };
    }

    const previousNotes = withdrawal.processing_notes;
    withdrawal.processing_notes = notes;
    await withdrawal.save();

    // Create audit log
    await createAuditLog(
      adminUser._id.toString(),
      'UPDATE_WITHDRAWAL_NOTES',
      withdrawalId,
      {
        processing_notes: {
          from: previousNotes,
          to: notes
        }
      },
      {
        user_id: withdrawal.user_id,
        amount_cents: withdrawal.amount_cents
      }
    );

    revalidatePath('/admin/withdrawals');

    console.log('[updateWithdrawalNotes] Success');

    return {
      success: true,
      message: 'Withdrawal notes updated successfully',
      withdrawal: withdrawal.toObject()
    };

  } catch (error: any) {
    console.error('[updateWithdrawalNotes] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update withdrawal notes'
    };
  }
}

/**
 * Export withdrawals to CSV format
 */
export async function exportWithdrawals(
  filters?: WithdrawalFilters
): Promise<{
  success: boolean;
  data?: any[];
  message: string;
}> {
  try {
    console.log('[exportWithdrawals] Starting with filters:', filters);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const query: any = {};
    
    // Apply same filters as getWithdrawals
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    
    if (filters?.userId) {
      query.user_id = filters.userId;
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.created_at = {};
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setUTCHours(0, 0, 0, 0);
        query.created_at.$gte = startDate;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setUTCHours(23, 59, 59, 999);
        query.created_at.$lte = endDate;
      }
    }

    if (filters?.minAmount || filters?.maxAmount) {
      query.amount_cents = {};
      if (filters.minAmount) {
        query.amount_cents.$gte = filters.minAmount * 100;
      }
      if (filters.maxAmount) {
        query.amount_cents.$lte = filters.maxAmount * 100;
      }
    }

    const withdrawals = await Withdrawal.find(query)
      .populate('user_id', 'username email phone_number')
      .populate('approved_by', 'username email')
      .sort({ created_at: -1 })
      .lean();

    console.log(`[exportWithdrawals] Exporting ${withdrawals.length} withdrawals`);

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
      mpesa_receipt: w.mpesa_receipt_number || 'N/A',
      approved_by: w.approved_by?.username || 'N/A',
      approved_at: w.approved_at ? new Date(w.approved_at).toISOString() : 'N/A',
      processed_at: w.processed_at ? new Date(w.processed_at).toISOString() : 'N/A',
      created_at: new Date(w.created_at).toISOString(),
      failure_reason: w.failure_reason || 'N/A',
      processing_notes: w.processing_notes || 'N/A'
    }));

    return {
      success: true,
      data: csvData,
      message: 'Withdrawals exported successfully'
    };

  } catch (error: any) {
    console.error('[exportWithdrawals] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to export withdrawals',
      data: []
    };
  }
}

/**
 * Get withdrawal summary for a specific date range
 */
export async function getWithdrawalSummary(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  data?: {
    totalWithdrawals: number;
    totalAmount: number;
    averageAmount: number;
    byStatus: {
      pending: { count: number; amount: number };
      approved: { count: number; amount: number };
      completed: { count: number; amount: number };
      rejected: { count: number; amount: number };
    };
    byDay: Array<{ date: string; count: number; amount: number }>;
  };
  message: string;
}> {
  try {
    console.log('[getWithdrawalSummary] Starting...');
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const query: any = {};
    
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        query.created_at.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.created_at.$lte = end;
      }
    }

    // Get status breakdown
    const statusStats = await Withdrawal.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount_cents' }
        }
      }
    ]);

    // Get daily breakdown
    const dailyStats = await Withdrawal.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount_cents' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate totals
    let totalWithdrawals = 0;
    let totalAmount = 0;

    const byStatus = {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      completed: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 }
    };

    statusStats.forEach((stat) => {
      totalWithdrawals += stat.count;
      totalAmount += stat.totalAmount;
      
      if (stat._id in byStatus) {
        byStatus[stat._id as keyof typeof byStatus] = {
          count: stat.count,
          amount: stat.totalAmount / 100
        };
      }
    });

    const byDay = dailyStats.map((stat) => ({
      date: stat._id,
      count: stat.count,
      amount: stat.totalAmount / 100
    }));

    const averageAmount = totalWithdrawals > 0 
      ? totalAmount / totalWithdrawals / 100 
      : 0;

    return {
      success: true,
      data: {
        totalWithdrawals,
        totalAmount: totalAmount / 100,
        averageAmount,
        byStatus,
        byDay
      },
      message: 'Withdrawal summary fetched successfully'
    };

  } catch (error: any) {
    console.error('[getWithdrawalSummary] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch withdrawal summary'
    };
  }
}

/**
 * Get pending withdrawals count (for notifications/badges)
 */
export async function getPendingWithdrawalsCount(): Promise<{
  success: boolean;
  count?: number;
  message: string;
}> {
  try {
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const count = await Withdrawal.countDocuments({ status: 'pending' });

    return {
      success: true,
      count,
      message: 'Pending withdrawals count fetched successfully'
    };

  } catch (error: any) {
    console.error('[getPendingWithdrawalsCount] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch pending withdrawals count'
    };
  }
}

/**
 * Validate withdrawal request before processing
 */
export async function validateWithdrawal(
  withdrawalId: string
): Promise<{
  success: boolean;
  valid?: boolean;
  issues?: string[];
  message: string;
}> {
  try {
    console.log('[validateWithdrawal] Starting for:', withdrawalId);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const withdrawal = await Withdrawal.findById(withdrawalId)
      .populate('user_id');
    
    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal not found'
      };
    }

    const issues: string[] = [];

    // Check withdrawal status
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') {
      issues.push(`Withdrawal status is ${withdrawal.status}`);
    }

    // Check user exists
    if (!withdrawal.user_id) {
      issues.push('User not found');
    }

    // Validate M-Pesa number
    if (!isValidMpesaNumber(withdrawal.mpesa_number)) {
      issues.push('Invalid M-Pesa number format');
    }

    // Check amount
    if (withdrawal.amount_cents < 10000) { // Minimum 100 KES
      issues.push('Amount is below minimum withdrawal limit');
    }

    // Check if user has been banned or suspended
    if (withdrawal.user_id) {
      const user = withdrawal.user_id as any;
      if (user.status === 'banned') {
        issues.push('User is banned');
      }
      if (user.status === 'suspended') {
        issues.push('User is suspended');
      }
    }

    const valid = issues.length === 0;

    return {
      success: true,
      valid,
      issues: issues.length > 0 ? issues : undefined,
      message: valid 
        ? 'Withdrawal is valid' 
        : `Withdrawal has ${issues.length} validation issue(s)`
    };

  } catch (error: any) {
    console.error('[validateWithdrawal] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to validate withdrawal'
    };
  }
}

/**
 * Get withdrawal processing timeline/history
 */
export async function getWithdrawalTimeline(
  withdrawalId: string
): Promise<{
  success: boolean;
  timeline?: Array<{
    action: string;
    timestamp: Date;
    actor?: { id: string; username: string; email: string };
    details?: any;
  }>;
  message: string;
}> {
  try {
    console.log('[getWithdrawalTimeline] Starting for:', withdrawalId);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const withdrawal = await Withdrawal.findById(withdrawalId)
      .populate('user_id', 'username email')
      .populate('approved_by', 'username email')
      .lean();
    
    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal not found'
      };
    }

    // Get audit logs for this withdrawal
    const auditLogs = await AdminAuditLog.find({
      resource_type: 'withdrawal',
      resource_id: withdrawalId
    })
      .populate('actor_id', 'username email')
      .sort({ created_at: 1 })
      .lean();

    const timeline: Array<any> = [];

    // Add creation event
    timeline.push({
      action: 'CREATED',
      timestamp: withdrawal.created_at,
      actor: withdrawal.user_id ? {
        id: (withdrawal.user_id as any)._id?.toString(),
        username: (withdrawal.user_id as any).username,
        email: (withdrawal.user_id as any).email
      } : undefined,
      details: {
        amount: withdrawal.amount_cents / 100,
        mpesa_number: withdrawal.mpesa_number
      }
    });

    // Add approval event
    if (withdrawal.approved_at) {
      timeline.push({
        action: withdrawal.status === 'rejected' ? 'REJECTED' : 'APPROVED',
        timestamp: withdrawal.approved_at,
        actor: withdrawal.approved_by ? {
          id: (withdrawal.approved_by as any)._id?.toString(),
          username: (withdrawal.approved_by as any).username,
          email: (withdrawal.approved_by as any).email
        } : undefined,
        details: {
          notes: withdrawal.processing_notes,
          reason: withdrawal.failure_reason
        }
      });
    }

    // Add completion event
    if (withdrawal.processed_at) {
      timeline.push({
        action: 'COMPLETED',
        timestamp: withdrawal.processed_at,
        details: {
          transaction_code: withdrawal.transaction_code,
          mpesa_receipt: withdrawal.mpesa_receipt_number
        }
      });
    }

    // Add audit log entries
    auditLogs.forEach((log: any) => {
      timeline.push({
        action: log.action,
        timestamp: log.created_at,
        actor: log.actor_id ? {
          id: log.actor_id._id?.toString(),
          username: log.actor_id.username,
          email: log.actor_id.email
        } : undefined,
        details: {
          changes: log.changes,
          metadata: log.metadata
        }
      });
    });

    // Sort by timestamp
    timeline.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      success: true,
      timeline,
      message: 'Withdrawal timeline fetched successfully'
    };

  } catch (error: any) {
    console.error('[getWithdrawalTimeline] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch withdrawal timeline'
    };
  }
}

/**
 * Bulk reject withdrawals
 */
export async function bulkRejectWithdrawals(
  withdrawalIds: string[],
  reason: string
): Promise<BulkApprovalResponse> {
  try {
    console.log('[bulkRejectWithdrawals] Starting for', withdrawalIds.length, 'withdrawals');
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    if (!reason || reason.trim().length < 10) {
      return {
        success: false,
        message: 'Rejection reason must be at least 10 characters',
        approved: 0,
        failed: withdrawalIds.length
      };
    }

    let rejected = 0;
    let failed = 0;
    const errorMessages: string[] = [];

    // Process withdrawals sequentially
    for (const id of withdrawalIds) {
      try {
        const result = await rejectWithdrawal(id, reason);
        
        if (result.success) {
          rejected++;
        } else {
          errorMessage.push(`${id}: ${result.message}`);
          failed++;
        }
      } catch (error: any) {
        console.error(`Error rejecting withdrawal ${id}:`, error);
        errorMessage.push(`Failed to reject withdrawal ${id}: ${error.message}`);
        failed++;
      }
    }

    revalidatePath('/admin/withdrawals');

    console.log('[bulkRejectWithdrawals] Completed:', { rejected, failed });

    return {
      success: failed === 0,
      message: `Processed ${withdrawalIds.length} withdrawals: ${rejected} rejected, ${failed} failed`,
      approved: rejected,
      failed,
      errorMessage: errorMessage.length > 0 ? errorMessage : undefined
    };

  } catch (error: any) {
    console.error('[bulkRejectWithdrawals] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to bulk reject withdrawals',
      approved: 0,
      failed: withdrawalIds.length,
      errorMessage: ['System error during bulk operation']
    };
  }
}

/**
 * Search withdrawals by various criteria
 */
export async function searchWithdrawals(
  searchTerm: string,
  searchType: 'all' | 'mpesa' | 'transaction_code' | 'user' = 'all'
): Promise<PaginatedResponse<any>> {
  try {
    console.log('[searchWithdrawals] Searching for:', searchTerm, 'Type:', searchType);
    
    const adminUser = await getCurrentAdmin();
    await connectToDatabase();

    const query: any = {};

    switch (searchType) {
      case 'mpesa':
        query.mpesa_number = { $regex: searchTerm, $options: 'i' };
        break;
      case 'transaction_code':
        query.transaction_code = { $regex: searchTerm, $options: 'i' };
        break;
      case 'user':
        // Search by user - need to find user first
        const users = await Profile.find({
          $or: [
            { username: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } }
          ]
        }).select('_id').lean();
        
        const userIds = users.map(u => u._id);
        query.user_id = { $in: userIds };
        break;
      case 'all':
      default:
        query.$or = [
          { mpesa_number: { $regex: searchTerm, $options: 'i' } },
          { transaction_code: { $regex: searchTerm, $options: 'i' } }
        ];
        break;
    }

    const withdrawals = await Withdrawal.find(query)
      .populate('user_id', 'username email phone_number balance_cents')
      .populate('approved_by', 'username email')
      .sort({ created_at: -1 })
      .limit(50) // Limit search results
      .lean();

    console.log(`[searchWithdrawals] Found ${withdrawals.length} results`);

    const formattedWithdrawals = withdrawals.map((w: any) => ({
      _id: w._id.toString(),
      userId: w.user_id?._id?.toString() || w.user_id?.toString(),
      user: {
        id: w.user_id?._id?.toString() || w.user_id?.toString(),
        username: w.user_id?.username || 'Unknown',
        email: w.user_id?.email || 'Unknown',
        phone: w.user_id?.phone_number || 'Unknown',
        balance: w.user_id?.balance_cents || 0
      },
      amount: w.amount_cents / 100,
      amountCents: w.amount_cents,
      status: w.status,
      mpesaNumber: w.mpesa_number,
      transactionCode: w.transaction_code,
      mpesaReceiptNumber: w.mpesa_receipt_number,
      approvedBy: w.approved_by ? {
        id: w.approved_by._id?.toString(),
        username: w.approved_by.username,
        email: w.approved_by.email
      } : null,
      approvedAt: w.approved_at,
      processedAt: w.processed_at,
      processingNotes: w.processing_notes,
      failureReason: w.failure_reason,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
      metadata: w.metadata || {}
    }));

    return {
      success: true,
      data: formattedWithdrawals,
      pagination: {
        total: formattedWithdrawals.length,
        page: 1,
        limit: 50,
        pages: 1
      },
      message: 'Search completed successfully'
    };

  } catch (error: any) {
    console.error('[searchWithdrawals] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to search withdrawals'
    };
  }
}
