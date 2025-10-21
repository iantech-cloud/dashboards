// app/actions/user-management.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, Transaction, Referral, AdminAuditLog } from '../lib/models';
import { Types } from 'mongoose';

// Helper to check admin access
async function checkAdminAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw new Error('User not authenticated');
  }

  await connectToDatabase();
  const user = await Profile.findOne({ email: session.user.email });
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'admin') {
    throw new Error('Access Denied: Must be an Administrator');
  }

  return user;
}

// Helper to serialize data
function serializeDocument(doc: any) {
  if (!doc) return null;
  const serialized = JSON.parse(JSON.stringify(doc));
  
  if (serialized._id && typeof serialized._id !== 'string') {
    serialized._id = serialized._id.toString();
  }
  
  return serialized;
}

// Get users for admin management
export async function getAdminUsers(filters?: {
  tab?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
  stats?: {
    total: number;
    pendingApproval: number;
    unapproved: number;
    active: number;
    inactive: number;
  };
}> {
  try {
    const admin = await checkAdminAccess();
    
    const {
      tab = 'all',
      search = '',
      page = 1,
      limit = 50,
    } = filters || {};

    await connectToDatabase();

    // Build query based on tab
    const query: any = { role: { $ne: 'admin' } }; // Exclude admins from user management

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } },
        { referral_id: { $regex: search, $options: 'i' } },
      ];
    }

    // Get stats
    const [total, pendingApproval, unapproved, active, inactive] = await Promise.all([
      Profile.countDocuments({ role: { $ne: 'admin' } }),
      Profile.countDocuments({ role: { $ne: 'admin' }, approval_status: 'pending' }),
      Profile.countDocuments({ role: { $ne: 'admin' }, approval_status: 'approved', is_active: false }),
      Profile.countDocuments({ role: { $ne: 'admin' }, is_active: true, is_approved: true }),
      Profile.countDocuments({ role: { $ne: 'admin' }, is_active: false }),
    ]);

    // Apply tab-specific filters
    if (tab === 'pending') {
      query.approval_status = 'pending';
    } else if (tab === 'unapproved') {
      query.approval_status = 'approved';
      query.is_active = false;
    } else if (tab === 'active') {
      query.is_active = true;
      query.is_approved = true;
    } else if (tab === 'inactive') {
      query.is_active = false;
    }

    const skip = (page - 1) * limit;
    const users = await Profile.find(query)
      .select('-password') // Exclude password
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const serializedUsers = users.map(user => serializeDocument(user));

    return {
      success: true,
      data: serializedUsers,
      stats: {
        total,
        pendingApproval,
        unapproved,
        active,
        inactive,
      },
    };
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load users',
    };
  }
}

// Approve user account (administrative approval) - FIXED: Can be done independently of activation
export async function approveUserAccount(userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.approval_status === 'approved') {
      return { success: false, message: 'User is already approved' };
    }

    // Update ALL user approval fields
    user.approval_status = 'approved';
    user.is_approved = true;
    user.approval_by = admin._id;
    user.approval_at = new Date();

    await user.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'APPROVE_USER',
      action_type: 'approve',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        approval_status: 'approved',
        is_approved: true,
        approval_by: admin._id,
        approval_at: new Date(),
      },
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { success: true, message: 'User account approved successfully' };
  } catch (error) {
    console.error('Error approving user account:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to approve user account',
    };
  }
}

// Activate user account with financial logic (KSH 1,000 activation fee) - FIXED: Can be done independently of approval
export async function activateUserAccount(userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  let session = null;
  
  try {
    // Get mongoose connection for session
    await connectToDatabase();
    const mongoose = (await import('mongoose')).default;
    session = await mongoose.startSession();
    
    session.startTransaction();
    const admin = await checkAdminAccess();

    const user = await Profile.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return { success: false, message: 'User not found' };
    }

    // Check if user is already fully activated
    if (user.is_active && user.status === 'active' && user.activation_paid_at && user.activation_transaction_id) {
      await session.abortTransaction();
      return { success: false, message: 'User is already activated' };
    }

    // Constants for activation fee split
    const ACTIVATION_FEE_CENTS = 100000; // KSH 1,000
    const COMPANY_REVENUE_CENTS = 30000;  // KSH 300
    const REFERRAL_BONUS_CENTS = 70000;   // KSH 700

    // 1. Check if user has sufficient balance for activation fee
    let feeDeducted = false;
    let activationTransaction = null;

    if (user.balance_cents >= ACTIVATION_FEE_CENTS) {
      user.balance_cents -= ACTIVATION_FEE_CENTS;
      feeDeducted = true;

      // Create debit transaction for user
      activationTransaction = new Transaction({
        user_id: userId,
        amount_cents: -ACTIVATION_FEE_CENTS,
        type: 'ACTIVATION_FEE',
        description: 'Account activation fee deduction',
        status: 'completed',
        metadata: {
          activation_fee: ACTIVATION_FEE_CENTS,
          processed_by: admin._id,
          fee_deducted: true,
          admin_override: false,
          transaction_purpose: 'ACCOUNT_ACTIVATION'
        },
      });
      await activationTransaction.save({ session });
    } else {
      // Create record for admin-activated without deduction
      activationTransaction = new Transaction({
        user_id: userId,
        amount_cents: 0,
        type: 'BONUS',
        description: 'Account activated by admin (activation fee waived)',
        status: 'completed',
        metadata: {
          activation_fee: ACTIVATION_FEE_CENTS,
          processed_by: admin._id,
          fee_deducted: false,
          admin_override: true,
          reason: 'Automatic payment failed or admin override',
          transaction_purpose: 'ACCOUNT_ACTIVATION'
        },
      });
      await activationTransaction.save({ session });
    }

    // 2. Activate user account (update ALL activation fields)
    user.is_active = true;
    user.status = 'active';
    user.activation_paid_at = new Date();
    user.activation_transaction_id = activationTransaction._id;
    user.activation_method = 'manual'; // Since admin is activating manually

    // 3. Auto-approve user if not already approved
    if (user.approval_status !== 'approved') {
      user.approval_status = 'approved';
      user.is_approved = true;
      user.approval_by = admin._id;
      user.approval_at = new Date();
    }

    // 4. Credit company revenue to the designated company account
    const companyUser = await Profile.findOne({ email: 'lesylvanuss@gmail.com' }).session(session);
    if (!companyUser) {
      await session.abortTransaction();
      return { success: false, message: 'Company account not found' };
    }

    // Always credit company - this is revenue regardless of user payment
    companyUser.balance_cents += COMPANY_REVENUE_CENTS;
    companyUser.total_earnings_cents += COMPANY_REVENUE_CENTS;
    await companyUser.save({ session });

    // Create company revenue transaction
    const companyTransaction = new Transaction({
      user_id: companyUser._id,
      amount_cents: COMPANY_REVENUE_CENTS,
      type: 'COMPANY_REVENUE',
      description: `Activation fee revenue share from ${user.username}`,
      status: 'completed',
      metadata: {
        source_user_id: userId,
        activation_fee: ACTIVATION_FEE_CENTS,
        revenue_share: COMPANY_REVENUE_CENTS,
        user_fee_deducted: feeDeducted,
        admin_processed: admin._id,
        transaction_purpose: 'COMPANY_REVENUE'
      },
    });
    await companyTransaction.save({ session });

    // 5. Award referral bonus (KSH 700) if referrer exists AND is active
    let referralBonusAwarded = false;
    let referrerUsername = '';
    let referrerId = null;
    
    const referral = await Referral.findOne({ referred_id: userId }).session(session);
    if (referral) {
      const referrer = await Profile.findById(referral.referrer_id).session(session);
      if (referrer) {
        // Update referrer's balance and earnings
        referrer.balance_cents += REFERRAL_BONUS_CENTS;
        referrer.total_earnings_cents += REFERRAL_BONUS_CENTS;
        await referrer.save({ session });

        // Update referral record
        referral.earning_cents += REFERRAL_BONUS_CENTS;
        referral.referred_user_activated = true;
        referral.referred_user_activated_at = new Date();
        await referral.save({ session });

        // Create credit transaction for referrer
        const referralTransaction = new Transaction({
          user_id: referrer._id,
          amount_cents: REFERRAL_BONUS_CENTS,
          type: 'REFERRAL',
          description: `Referral bonus from ${user.username}'s account activation`,
          status: 'completed',
          metadata: {
            referred_user_id: userId,
            referred_username: user.username,
            activation_fee: ACTIVATION_FEE_CENTS,
            referral_bonus: REFERRAL_BONUS_CENTS,
            admin_processed: admin._id,
          },
        });
        await referralTransaction.save({ session });

        referralBonusAwarded = true;
        referrerUsername = referrer.username;
        referrerId = referrer._id;
      }
    }

    // If no referrer found or referrer inactive, company gets the remaining amount
    if (!referralBonusAwarded) {
      // Credit the remaining amount to company (referral bonus portion)
      companyUser.balance_cents += REFERRAL_BONUS_CENTS;
      companyUser.total_earnings_cents += REFERRAL_BONUS_CENTS;
      await companyUser.save({ session });

      // Create additional company revenue transaction for referral portion
      const additionalCompanyTransaction = new Transaction({
        user_id: companyUser._id,
        amount_cents: REFERRAL_BONUS_CENTS,
        type: 'COMPANY_REVENUE',
        description: `Activation fee (unclaimed referral portion) from ${user.username}`,
        status: 'completed',
        metadata: {
          source_user_id: userId,
          activation_fee: ACTIVATION_FEE_CENTS,
          revenue_share: REFERRAL_BONUS_CENTS,
          reason: 'No active referrer found',
          user_fee_deducted: feeDeducted,
          admin_processed: admin._id,
          transaction_purpose: 'COMPANY_REVENUE_REFERRAL_PORTION'
        },
      });
      await additionalCompanyTransaction.save({ session });
    }

    // Save user changes
    await user.save({ session });

    // Log the activation
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'ACTIVATE_USER',
      action_type: 'activate',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        is_active: true,
        status: 'active',
        activation_paid_at: new Date(),
        activation_transaction_id: activationTransaction._id,
        activation_method: 'manual',
        approval_status: user.approval_status,
        is_approved: user.is_approved,
        fee_deducted: feeDeducted,
        activation_fee: ACTIVATION_FEE_CENTS,
        company_revenue: COMPANY_REVENUE_CENTS,
        referral_bonus_awarded: referralBonusAwarded,
        referral_bonus_amount: referralBonusAwarded ? REFERRAL_BONUS_CENTS : 0,
        referrer_username: referrerUsername,
        referrer_id: referrerId,
        admin_override: !feeDeducted,
        company_account_credited: companyUser._id,
      },
    });
    await auditLog.save({ session });

    await session.commitTransaction();

    revalidatePath('/admin/users');
    revalidatePath('/dashboard');

    let message = `User account activated successfully. `;
    if (!feeDeducted) {
      message += `Activation fee waived (admin override). `;
    } else {
      message += `Activation fee of KSH ${ACTIVATION_FEE_CENTS / 100} deducted. `;
    }
    if (referralBonusAwarded) {
      message += `Referral bonus of KSH ${REFERRAL_BONUS_CENTS / 100} awarded to ${referrerUsername}.`;
    } else {
      message += `No active referrer found - full amount credited to company.`;
    }

    return { success: true, message };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error('Error activating user account:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to activate user account',
    };
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

// Add spins to user account
export async function addUserSpins(userId: string, spins: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    if (spins <= 0 || spins > 100) {
      return { success: false, message: 'Spins must be between 1 and 100' };
    }

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (!user.is_active) {
      return { success: false, message: 'Cannot add spins to inactive user' };
    }

    // Update user's spins
    user.available_spins += spins;
    await user.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'ADD_SPINS',
      action_type: 'update',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        spins_added: spins,
        new_spins_total: user.available_spins,
      },
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { success: true, message: `Successfully added ${spins} spins to user account` };
  } catch (error) {
    console.error('Error adding user spins:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add spins',
    };
  }
}

// Update user status
export async function updateUserStatus(userId: string, status: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    const validStatuses = ['active', 'inactive', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      return { success: false, message: 'Invalid status' };
    }

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const oldStatus = user.status;
    user.status = status;
    
    // Update is_active based on status
    user.is_active = status === 'active';

    await user.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'UPDATE_USER_STATUS',
      action_type: 'update',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        old_status: oldStatus,
        new_status: status,
        is_active: user.is_active,
      },
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { success: true, message: `User status updated to ${status}` };
  } catch (error) {
    console.error('Error updating user status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update user status',
    };
  }
}

// Get user details for admin view
export async function getUserDetails(userId: string): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    const user = await Profile.findById(userId)
      .select('-password')
      .populate('approval_by', 'username email')
      .lean();

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Get user's transactions
    const transactions = await Transaction.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

    // Get referral information if exists
    const referral = await Referral.findOne({ referred_id: userId })
      .populate('referrer_id', 'username email')
      .lean();

    const serializedUser = serializeDocument(user);
    const serializedTransactions = transactions.map(tx => serializeDocument(tx));
    const serializedReferral = referral ? serializeDocument(referral) : null;

    return {
      success: true,
      data: {
        user: serializedUser,
        recentTransactions: serializedTransactions,
        referral: serializedReferral,
      },
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load user details',
    };
  }
}

// Reset user's daily limits
export async function resetUserLimits(userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Reset daily deposit and withdrawal counters
    user.total_deposits_today_cents = 0;
    user.total_withdrawals_today_cents = 0;
    user.last_deposit_reset = new Date();
    user.last_withdrawal_reset = new Date();

    await user.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'RESET_USER_LIMITS',
      action_type: 'update',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        deposits_reset: true,
        withdrawals_reset: true,
        reset_at: new Date(),
      },
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { success: true, message: 'User daily limits reset successfully' };
  } catch (error) {
    console.error('Error resetting user limits:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset user limits',
    };
  }
}

// Delete user account (admin only)
export async function deleteUserAccount(userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.role === 'admin') {
      return { success: false, message: 'Cannot delete admin accounts' };
    }

    const username = user.username;
    await Profile.findByIdAndDelete(userId);

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'DELETE_USER',
      action_type: 'delete',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        username: username,
        deleted_at: new Date(),
      },
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { success: true, message: `User ${username} deleted successfully` };
  } catch (error) {
    console.error('Error deleting user account:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete user account',
    };
  }
}

// Suspend user account
export async function suspendUserAccount(userId: string, reason?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const oldStatus = user.status;
    user.status = 'suspended';
    user.is_active = false;
    user.suspension_reason = reason;
    user.suspended_at = new Date();

    await user.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'SUSPEND_USER',
      action_type: 'suspend',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        old_status: oldStatus,
        new_status: 'suspended',
        is_active: false,
        suspension_reason: reason,
        suspended_at: new Date(),
      },
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { success: true, message: `User account suspended${reason ? `: ${reason}` : ''}` };
  } catch (error) {
    console.error('Error suspending user account:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to suspend user account',
    };
  }
}

// Ban user account
export async function banUserAccount(userId: string, reason?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const oldStatus = user.status;
    user.status = 'banned';
    user.is_active = false;
    user.ban_reason = reason;
    user.banned_at = new Date();

    await user.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'BAN_USER',
      action_type: 'ban',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        old_status: oldStatus,
        new_status: 'banned',
        is_active: false,
        ban_reason: reason,
        banned_at: new Date(),
      },
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { success: true, message: `User account banned${reason ? `: ${reason}` : ''}` };
  } catch (error) {
    console.error('Error banning user account:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to ban user account',
    };
  }
}
