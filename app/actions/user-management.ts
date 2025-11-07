// app/actions/user-management.ts
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase, Profile, Transaction, Referral, AdminAuditLog, Company } from '../lib/models';
import { Types } from 'mongoose';

// Helper to check admin access
async function checkAdminAccess() {
  const session = await auth();
  
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

// Helper to get or create company
async function getOrCreateCompany() {
  await connectToDatabase();
  
  let company = await Company.findOne({ email: 'company@hustlehubafrica.com' });
  
  if (!company) {
    company = await Company.create({
      name: 'HustleHub Africa Ltd',
      email: 'company@hustlehubafrica.com',
      phone_number: '+254700000000',
      wallet_balance_cents: 0,
      total_revenue_cents: 0,
      total_expenses_cents: 0,
      activation_revenue_cents: 0,
      unclaimed_referral_revenue_cents: 0,
      content_payment_revenue_cents: 0,
      other_revenue_cents: 0,
      is_active: true
    });
    
    console.log('✅ Company profile created:', company._id);
  }
  
  return company;
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

// Get users for admin management with enhanced filtering and pagination
export async function getAdminUsers(filters?: {
  tab?: string;
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  try {
    const admin = await checkAdminAccess();
    
    const {
      tab = 'all',
      search = '',
      page = 1,
      limit = 50,
      status,
      role,
    } = filters || {};

    await connectToDatabase();

    // Build query based on tab and filters
    const query: any = { role: { $ne: 'admin' } }; // Exclude admins from user management

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } },
        { referral_id: { $regex: search, $options: 'i' } },
      ];
    }

    // Apply status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    // Apply role filter if provided
    if (role && role !== 'all') {
      query.role = role;
    }

    // Get stats for all tabs
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

    const totalFiltered = await Profile.countDocuments(query);
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
      pagination: {
        page,
        limit,
        total: totalFiltered,
        pages: Math.ceil(totalFiltered / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load users',
    };
  }
}

// Approve user account (administrative approval) - Can be done independently of activation
export async function approveUserAccount(userId: string, approvalNotes?: string): Promise<{
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
    if (approvalNotes) {
      user.approval_notes = approvalNotes;
    }

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
      metadata: {
        approval_notes: approvalNotes
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });
    await auditLog.save();

    revalidatePath('/admin/users');
    revalidatePath('/admin/approvals');

    return { success: true, message: 'User account approved successfully' };
  } catch (error) {
    console.error('Error approving user account:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to approve user account',
    };
  }
}

// Reject user account
export async function rejectUserAccount(userId: string, rejectionReason: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return { success: false, message: 'Rejection reason is required' };
    }

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.approval_status === 'rejected') {
      return { success: false, message: 'User is already rejected' };
    }

    // Update user rejection fields
    user.approval_status = 'rejected';
    user.is_approved = false;
    user.status = 'inactive';
    user.is_active = false;
    user.approval_by = admin._id;
    user.approval_at = new Date();
    user.approval_notes = rejectionReason;

    await user.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'REJECT_USER',
      action_type: 'reject',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        approval_status: 'rejected',
        is_approved: false,
        status: 'inactive',
        is_active: false,
      },
      metadata: {
        rejection_reason: rejectionReason
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });
    await auditLog.save();

    revalidatePath('/admin/users');
    revalidatePath('/admin/approvals');

    return { success: true, message: `User account rejected: ${rejectionReason}` };
  } catch (error) {
    console.error('Error rejecting user account:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reject user account',
    };
  }
}

// Activate user account with NEW TIERED financial logic (KSH 1,000 activation fee)
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

    // 1. Check if user has sufficient balance for activation fee
    let feeDeducted = false;
    let activationTransaction = null;

    if (user.balance_cents >= ACTIVATION_FEE_CENTS) {
      user.balance_cents -= ACTIVATION_FEE_CENTS;
      feeDeducted = true;

      // Create debit transaction for user
      activationTransaction = new Transaction({
        user_id: userId,
        target_type: 'user',
        target_id: userId, 
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
      // CRITICAL FIX: Even if user doesn't pay, record KES 1,000 as activation transaction
      // This represents the value of the activation that company is providing
      feeDeducted = false;

      activationTransaction = new Transaction({
        user_id: userId,
        target_type: 'user', 
        target_id: userId,
        amount_cents: ACTIVATION_FEE_CENTS, // CHANGED: Record full amount, not 0
        type: 'BONUS', // This is a bonus/gift from company
        description: 'Account activated by admin - activation fee credited as bonus',
        status: 'completed',
        metadata: {
          activation_fee: ACTIVATION_FEE_CENTS,
          processed_by: admin._id,
          fee_deducted: false,
          admin_override: true,
          reason: 'Admin activated - user receives KES 1,000 value as activation bonus',
          transaction_purpose: 'ACCOUNT_ACTIVATION',
          is_gift_activation: true
        },
      });
      await activationTransaction.save({ session });
    }

    // 2. Activate user account (update ALL activation fields)
    user.is_active = true;
    user.status = 'active';
    user.activation_paid_at = new Date();
    user.activation_transaction_id = activationTransaction._id;
    user.activation_method = 'manual';
    user.activation_status = 'activated'; // NEW FIELD

    // 3. Auto-approve user if not already approved
    if (user.approval_status !== 'approved') {
      user.approval_status = 'approved';
      user.is_approved = true;
      user.approval_by = admin._id;
      user.approval_at = new Date();
    }

    // 4. Get or create company account
    const company = await getOrCreateCompany();

    // ============================================================================
    // CRITICAL FIX: Always credit company with full KES 1,000 activation fee first
    // This ensures company balance is never negative, regardless of who pays
    // ============================================================================
    company.wallet_balance_cents += ACTIVATION_FEE_CENTS;
    company.total_revenue_cents += ACTIVATION_FEE_CENTS;
    company.activation_revenue_cents += ACTIVATION_FEE_CENTS;
    await company.save({ session });

    // Create company revenue transaction for the FULL activation fee
    const initialCompanyTransaction = new Transaction({
      target_type: 'company',
      target_id: company._id.toString(),
      user_id: userId,
      amount_cents: ACTIVATION_FEE_CENTS,
      type: 'ACTIVATION_FEE',
      description: `Activation fee received from ${user.username} ${feeDeducted ? '(paid by user)' : '(admin activated)'}`,
      status: 'completed',
      source: 'activation',
      balance_before_cents: company.wallet_balance_cents - ACTIVATION_FEE_CENTS,
      balance_after_cents: company.wallet_balance_cents,
      metadata: {
        source_user_id: userId,
        activation_fee: ACTIVATION_FEE_CENTS,
        user_paid: feeDeducted,
        admin_activated: !feeDeducted,
        admin_processed: admin._id,
        transaction_purpose: 'ACTIVATION_FEE_RECEIVED'
      },
    });
    await initialCompanyTransaction.save({ session });

    console.log(`✅ Company credited with KES 1,000 activation fee from ${user.username}`);

    // 5. Process referral bonuses with NEW TIERED STRUCTURE
    // NOTE: These will be DEDUCTED from company balance
    let directReferralBonus = null;
    let level1ReferralBonus = null;

    const referral = await Referral.findOne({ referred_id: userId }).session(session);
    
    if (referral) {
      const referrer = await Profile.findById(referral.referrer_id).session(session);
      
      if (referrer && referrer.is_active) {
        // ===== DIRECT REFERRAL BONUS (TIERED) =====
        // Count how many direct referrals this referrer has already had activated
        const activatedDirectReferrals = await Referral.countDocuments({
          referrer_id: referrer._id,
          referral_bonus_paid: true,
          'metadata.level': 0
        }).session(session);

        // Determine bonus amount: First 2 get 60,000 cents (KES 600), subsequent get 70,000 cents (KES 700)
        const isFirst2 = activatedDirectReferrals < 2;
        const DIRECT_BONUS_CENTS = isFirst2 ? 60000 : 70000;
        const bonusTier = isFirst2 ? 'first_2' : 'subsequent';

        // DEDUCT from company balance as expense
        company.wallet_balance_cents -= DIRECT_BONUS_CENTS;
        company.total_expenses_cents += DIRECT_BONUS_CENTS;
        await company.save({ session });

        // Create company expense transaction
        const companyExpenseTransaction = new Transaction({
          target_type: 'company',
          target_id: company._id.toString(),
          user_id: company._id.toString(),
          amount_cents: -DIRECT_BONUS_CENTS,
          type: 'REFERRAL',
          description: `Direct referral bonus paid to ${referrer.username} for ${user.username}'s activation (${bonusTier})`,
          status: 'completed',
          source: 'activation',
          balance_before_cents: company.wallet_balance_cents + DIRECT_BONUS_CENTS,
          balance_after_cents: company.wallet_balance_cents,
          metadata: {
            beneficiary_user_id: referrer._id,
            beneficiary_username: referrer.username,
            referred_user_id: userId,
            referred_username: user.username,
            bonus_tier: bonusTier,
            level: 0,
            transaction_purpose: 'REFERRAL_BONUS_PAYMENT'
          },
        });
        await companyExpenseTransaction.save({ session });

        // Update referrer's balance and earnings
        referrer.balance_cents += DIRECT_BONUS_CENTS;
        referrer.total_earnings_cents += DIRECT_BONUS_CENTS;
        await referrer.save({ session });

        // Update referral record
        referral.earning_cents = DIRECT_BONUS_CENTS;
        referral.referral_bonus_paid = true;
        referral.referral_bonus_amount_cents = DIRECT_BONUS_CENTS;
        referral.bonus_paid_at = new Date();
        referral.status = 'bonus_paid';
        referral.referred_user_activated = true;
        referral.referred_user_activated_at = new Date();
        referral.metadata = {
          level: 0,
          bonus_tier: bonusTier,
          referrer_activated_count: activatedDirectReferrals
        };
        await referral.save({ session });

        // Create credit transaction for referrer
        const referralTransaction = new Transaction({
          user_id: referrer._id,
          target_type: 'user',
          target_id: referrer._id,
          amount_cents: DIRECT_BONUS_CENTS,
          type: 'REFERRAL',
          description: `Direct referral bonus for ${user.username}'s activation (${isFirst2 ? 'First 2' : 'Subsequent'})`,
          status: 'completed',
          source: 'activation',
          balance_before_cents: referrer.balance_cents - DIRECT_BONUS_CENTS,
          balance_after_cents: referrer.balance_cents,
          metadata: {
            referred_user_id: userId,
            referred_username: user.username,
            activation_payment_id: activationTransaction._id,
            referral_id: referral._id,
            level: 0,
            bonus_tier: bonusTier,
            referrer_activated_count: activatedDirectReferrals
          },
        });
        await referralTransaction.save({ session });

        directReferralBonus = {
          referrer_id: referrer._id,
          referrer_username: referrer.username,
          amount_cents: DIRECT_BONUS_CENTS,
          transaction_id: referralTransaction._id,
          bonus_tier: bonusTier
        };

        console.log(`✅ Direct referral bonus paid: ${referrer.username} earned KES ${DIRECT_BONUS_CENTS / 100} (${bonusTier})`);
        console.log(`   Company balance after bonus: KES ${company.wallet_balance_cents / 100}`);

        // ===== LEVEL 1 DOWNLINE BONUS (KES 100) =====
        if (referrer.referred_by) {
          const level1Referrer = await Profile.findById(referrer.referred_by).session(session);
          
          if (level1Referrer && level1Referrer.is_active) {
            const LEVEL1_BONUS_CENTS = 10000; // KES 100

            // DEDUCT from company balance as expense
            company.wallet_balance_cents -= LEVEL1_BONUS_CENTS;
            company.total_expenses_cents += LEVEL1_BONUS_CENTS;
            await company.save({ session });

            // Create company expense transaction for level 1
            const companyLevel1ExpenseTransaction = new Transaction({
              target_type: 'company',
              target_id: company._id.toString(),
              user_id: company._id.toString(),
              amount_cents: -LEVEL1_BONUS_CENTS,
              type: 'REFERRAL',
              description: `Level 1 downline bonus paid to ${level1Referrer.username} for ${user.username}'s activation`,
              status: 'completed',
              source: 'activation',
              balance_before_cents: company.wallet_balance_cents + LEVEL1_BONUS_CENTS,
              balance_after_cents: company.wallet_balance_cents,
              metadata: {
                beneficiary_user_id: level1Referrer._id,
                beneficiary_username: level1Referrer.username,
                referred_user_id: userId,
                referred_username: user.username,
                direct_referrer_id: referrer._id,
                direct_referrer_username: referrer.username,
                level: 1,
                transaction_purpose: 'LEVEL1_BONUS_PAYMENT'
              },
            });
            await companyLevel1ExpenseTransaction.save({ session });

            // Update level 1 referrer's balance
            level1Referrer.balance_cents += LEVEL1_BONUS_CENTS;
            level1Referrer.total_earnings_cents += LEVEL1_BONUS_CENTS;
            await level1Referrer.save({ session });

            // Create transaction for level 1 referrer
            const level1Transaction = new Transaction({
              user_id: level1Referrer._id,
              target_type: 'user',
              target_id: level1Referrer._id,
              amount_cents: LEVEL1_BONUS_CENTS,
              type: 'REFERRAL',
              description: `Level 1 downline bonus for ${user.username}'s activation (via ${referrer.username})`,
              status: 'completed',
              source: 'activation',
              balance_before_cents: level1Referrer.balance_cents - LEVEL1_BONUS_CENTS,
              balance_after_cents: level1Referrer.balance_cents,
              metadata: {
                referred_user_id: userId,
                referred_username: user.username,
                direct_referrer_id: referrer._id,
                direct_referrer_username: referrer.username,
                activation_payment_id: activationTransaction._id,
                level: 1
              },
            });
            await level1Transaction.save({ session });

            level1ReferralBonus = {
              referrer_id: level1Referrer._id,
              referrer_username: level1Referrer.username,
              amount_cents: LEVEL1_BONUS_CENTS,
              transaction_id: level1Transaction._id
            };

            console.log(`✅ Level 1 downline bonus paid: ${level1Referrer.username} earned KES 100`);
            console.log(`   Company balance after level 1 bonus: KES ${company.wallet_balance_cents / 100}`);
          }
        }
      }
    }

    // 6. Calculate final balances for logging
    const totalBonusesPaid = (directReferralBonus?.amount_cents || 0) + (level1ReferralBonus?.amount_cents || 0);
    const finalCompanyBalance = company.wallet_balance_cents;
    
    console.log(`\n💰 ACTIVATION SUMMARY for ${user.username}:`);
    console.log(`   Initial Company Credit: +KES 1,000`);
    console.log(`   Direct Bonus Paid: -KES ${(directReferralBonus?.amount_cents || 0) / 100}`);
    console.log(`   Level 1 Bonus Paid: -KES ${(level1ReferralBonus?.amount_cents || 0) / 100}`);
    console.log(`   Final Company Balance: KES ${finalCompanyBalance / 100}`);
    console.log(`   Company Net from this activation: KES ${(ACTIVATION_FEE_CENTS - totalBonusesPaid) / 100}\n`);

    // Save user changes
    await user.save({ session });

    // Log the activation
    const totalBonusesPaid = (directReferralBonus?.amount_cents || 0) + (level1ReferralBonus?.amount_cents || 0);
    const netCompanyRevenue = ACTIVATION_FEE_CENTS - totalBonusesPaid;

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
        activation_status: 'activated',
        activation_paid_at: new Date(),
        activation_transaction_id: activationTransaction._id,
        activation_method: 'manual',
        approval_status: user.approval_status,
        is_approved: user.is_approved,
        fee_deducted: feeDeducted,
        activation_fee: ACTIVATION_FEE_CENTS,
        total_bonuses_paid: totalBonusesPaid,
        company_net_revenue: netCompanyRevenue,
        direct_bonus: directReferralBonus?.amount_cents || 0,
        level1_bonus: level1ReferralBonus?.amount_cents || 0,
        bonus_tier: directReferralBonus?.bonus_tier || 'none',
      },
      metadata: {
        activation_details: {
          fee_deducted: feeDeducted,
          direct_referral_bonus: directReferralBonus,
          level1_referral_bonus: level1ReferralBonus,
          initial_company_credit: ACTIVATION_FEE_CENTS / 100,
          total_bonuses_paid: totalBonusesPaid / 100,
          company_net_revenue: netCompanyRevenue / 100,
          final_company_balance: company.wallet_balance_cents / 100
        }
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });
    await auditLog.save({ session });

    await session.commitTransaction();

    revalidatePath('/admin/users');
    revalidatePath('/admin/approvals');
    revalidatePath('/dashboard');

    let message = `User account activated successfully. `;
    if (!feeDeducted) {
      message += `Activation fee waived (admin override). `;
    } else {
      message += `Activation fee of KSH ${ACTIVATION_FEE_CENTS / 100} deducted. `;
    }
    if (directReferralBonus) {
      message += `Direct referral bonus of KSH ${directReferralBonus.amount_cents / 100} (${directReferralBonus.bonus_tier}) awarded to ${directReferralBonus.referrer_username}. `;
    }
    if (level1ReferralBonus) {
      message += `Level 1 bonus of KSH ${level1ReferralBonus.amount_cents / 100} awarded to ${level1ReferralBonus.referrer_username}.`;
    }
    if (!directReferralBonus && !level1ReferralBonus) {
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

    const oldSpins = user.available_spins;

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
        old_spins_total: oldSpins,
        new_spins_total: user.available_spins,
      },
      metadata: {
        spins_operation: 'add',
        amount: spins
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
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
      metadata: {
        status_change: `${oldStatus} -> ${status}`
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
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

    // Get users referred by this user
    const referrals = await Referral.find({ referrer_id: userId })
      .populate('referred_id', 'username email is_active activation_status')
      .lean();

    const serializedUser = serializeDocument(user);
    const serializedTransactions = transactions.map(tx => serializeDocument(tx));
    const serializedReferral = referral ? serializeDocument(referral) : null;
    const serializedReferrals = referrals.map(ref => serializeDocument(ref));

    return {
      success: true,
      data: {
        user: serializedUser,
        recentTransactions: serializedTransactions,
        referral: serializedReferral,
        referrals: serializedReferrals,
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

    const oldDepositLimit = user.total_deposits_today_cents || 0;
    const oldWithdrawalLimit = user.total_withdrawals_today_cents || 0;

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
        old_deposit_limit: oldDepositLimit,
        old_withdrawal_limit: oldWithdrawalLimit,
        reset_at: new Date(),
      },
      metadata: {
        reset_type: 'daily_limits',
        limits_cleared: {
          deposits: oldDepositLimit,
          withdrawals: oldWithdrawalLimit
        }
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
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

// Delete user account (admin only) - Use with caution
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
    const email = user.email;
    
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
        email: email,
        deleted_at: new Date(),
      },
      metadata: {
        permanent_deletion: true,
        user_details: {
          username,
          email
        }
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
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

    if (user.status === 'suspended') {
      return { success: false, message: 'User is already suspended' };
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
      metadata: {
        suspension_reason: reason || 'No reason provided'
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
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

    if (user.status === 'banned') {
      return { success: false, message: 'User is already banned' };
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
      metadata: {
        ban_reason: reason || 'No reason provided'
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
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

// Unban/Unsuspend user account
export async function reinstateUserAccount(userId: string): Promise<{
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

    if (user.status !== 'suspended' && user.status !== 'banned') {
      return { success: false, message: 'User is not suspended or banned' };
    }

    const oldStatus = user.status;
    user.status = 'active';
    user.is_active = true;
    user.suspension_reason = undefined;
    user.suspended_at = undefined;
    user.ban_reason = undefined;
    user.banned_at = undefined;

    await user.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: 'REINSTATE_USER',
      action_type: 'reinstate',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        old_status: oldStatus,
        new_status: 'active',
        is_active: true,
        reinstated_at: new Date(),
      },
      metadata: {
        previous_status: oldStatus,
        action: 'account_reinstated'
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { success: true, message: `User account reinstated successfully` };
  } catch (error) {
    console.error('Error reinstating user account:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reinstate user account',
    };
  }
}

// Adjust user balance (add or deduct)
export async function adjustUserBalance(
  userId: string, 
  amountCents: number, 
  reason: string,
  type: 'credit' | 'debit'
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    if (!reason || reason.trim().length === 0) {
      return { success: false, message: 'Reason is required for balance adjustment' };
    }

    if (amountCents <= 0) {
      return { success: false, message: 'Amount must be greater than 0' };
    }

    const user = await Profile.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const oldBalance = user.balance_cents;
    const adjustmentAmount = type === 'credit' ? amountCents : -amountCents;

    // Check if debit would result in negative balance
    if (type === 'debit' && user.balance_cents < amountCents) {
      return { success: false, message: 'Insufficient balance for debit adjustment' };
    }

    user.balance_cents += adjustmentAmount;
    
    // Update earnings if it's a credit
    if (type === 'credit') {
      user.total_earnings_cents += amountCents;
    }

    await user.save();

    // Create transaction record
    const transaction = new Transaction({
      user_id: userId,
      target_type: 'user',
      target_id: userId,
      amount_cents: adjustmentAmount,
      type: type === 'credit' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
      description: `Admin balance adjustment: ${reason}`,
      status: 'completed',
      metadata: {
        adjustment_type: type,
        adjustment_reason: reason,
        processed_by: admin._id,
        old_balance: oldBalance,
        new_balance: user.balance_cents,
      },
    });
    await transaction.save();

    // Log the action
    const auditLog = new AdminAuditLog({
      actor_id: admin._id,
      action: type === 'credit' ? 'CREDIT_USER_BALANCE' : 'DEBIT_USER_BALANCE',
      action_type: 'balance_adjustment',
      target_type: 'Profile',
      target_id: userId,
      resource_type: 'user',
      resource_id: userId,
      changes: {
        adjustment_type: type,
        amount_cents: amountCents,
        old_balance: oldBalance,
        new_balance: user.balance_cents,
        reason: reason,
      },
      metadata: {
        transaction_id: transaction._id,
        adjustment_details: {
          type,
          amount: amountCents,
          reason
        }
      },
      ip_address: 'server-action',
      user_agent: 'server-action'
    });
    await auditLog.save();

    revalidatePath('/admin/users');

    return { 
      success: true, 
      message: `Successfully ${type === 'credit' ? 'credited' : 'debited'} KES ${amountCents / 100} ${type === 'credit' ? 'to' : 'from'} user account` 
    };
  } catch (error) {
    console.error('Error adjusting user balance:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to adjust user balance',
    };
  }
}

// Get admin audit logs for a specific user
export async function getUserAuditLogs(userId: string, limit: number = 20): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
}> {
  try {
    const admin = await checkAdminAccess();
    await connectToDatabase();

    const logs = await AdminAuditLog.find({ target_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .populate('actor_id', 'username email')
      .lean();

    const serializedLogs = logs.map(log => serializeDocument(log));

    return {
      success: true,
      data: serializedLogs,
    };
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load audit logs',
    };
  }
}
