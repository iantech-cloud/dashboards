'use server';

import { auth } from '@/auth';
import type { Session } from 'next-auth';
import { connectToDatabase, Company, Transaction, AdminAuditLog, Profile } from '../lib/models';
import { revalidatePath } from 'next/cache';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface CompanyData {
  _id: string;
  name: string;
  email: string;
  phone_number: string;
  wallet_balance: number;
  total_revenue: number;
  total_expenses: number;
  activation_revenue: number;
  unclaimed_referral_revenue: number;
  content_payment_revenue: number;
  spin_cost_revenue: number;
  other_revenue: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CompanyTransactionData {
  _id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  source: string;
  balance_before: number;
  balance_after: number;
  created_at: Date;
  metadata?: any;
}

interface CompanyStats {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  current_balance: number;
  transactions_count: number;
  activation_count: number;
  referral_bonus_count: number;
  today_revenue: number;
  this_week_revenue: number;
  this_month_revenue: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if user is admin
 */
async function checkAdminAccess(): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  try {
    const session = await auth() as Session | null;
    
    if (!session?.user?.email) {
      return { isAdmin: false, error: 'Not authenticated' };
    }

    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });

    if (!user) {
      return { isAdmin: false, error: 'User not found' };
    }

    if (user.role !== 'admin') {
      return { isAdmin: false, error: 'Admin access required' };
    }

    return { isAdmin: true, userId: user._id.toString() };
  } catch (error) {
    console.error('Admin access check error:', error);
    return { isAdmin: false, error: 'Failed to verify admin access' };
  }
}

/**
 * Get or create company profile
 */
async function getOrCreateCompany() {
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

/**
 * Calculate actual financials from transactions (SOURCE OF TRUTH)
 */
async function calculateActualFinancials() {
  // Get ALL completed revenue transactions for company
  const revenueTransactions = await Transaction.find({
    target_type: 'company',
    status: 'completed'
  }).lean();

  // Get ALL completed expense transactions (company paying users)
  const expenseTransactions = await Transaction.find({
    target_type: 'user',
    status: 'completed',
    type: { 
      $in: ['WITHDRAWAL', 'BONUS', 'REFERRAL', 'SPIN_WIN', 'SPIN_PRIZE', 'TASK_PAYMENT', 'SURVEY'] 
    }
  }).lean();

  // Calculate revenue breakdown
  let activationRevenue = 0;
  let unclaimedReferralRevenue = 0;
  let spinCostRevenue = 0;
  let contentPaymentRevenue = 0;
  let otherRevenue = 0;

  for (const txn of revenueTransactions) {
    const amount = txn.amount_cents;
    
    switch (txn.type) {
      case 'ACTIVATION_FEE':
      case 'ACCOUNT_ACTIVATION':
        activationRevenue += amount;
        break;
      
      case 'SPIN_COST':
        spinCostRevenue += amount;
        break;
      
      case 'COMPANY_REVENUE':
        // Check metadata to determine subcategory
        if (txn.metadata?.source === 'unclaimed_referral') {
          unclaimedReferralRevenue += amount;
        } else if (txn.metadata?.source === 'content_payment') {
          contentPaymentRevenue += amount;
        } else {
          otherRevenue += amount;
        }
        break;
      
      default:
        otherRevenue += amount;
    }
  }

  const totalRevenue = activationRevenue + unclaimedReferralRevenue + 
                       spinCostRevenue + contentPaymentRevenue + otherRevenue;

  // Calculate expenses
  const totalExpenses = expenseTransactions.reduce((sum, txn) => sum + txn.amount_cents, 0);

  // Calculate balance
  const currentBalance = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    totalExpenses,
    currentBalance,
    activationRevenue,
    unclaimedReferralRevenue,
    spinCostRevenue,
    contentPaymentRevenue,
    otherRevenue,
    revenueTransactionCount: revenueTransactions.length,
    expenseTransactionCount: expenseTransactions.length
  };
}

/**
 * Transform company data for response
 */
function transformCompanyData(company: any, actualFinancials: any): CompanyData {
  return {
    _id: company._id.toString(),
    name: company.name,
    email: company.email,
    phone_number: company.phone_number,
    wallet_balance: actualFinancials.currentBalance / 100,
    total_revenue: actualFinancials.totalRevenue / 100,
    total_expenses: actualFinancials.totalExpenses / 100,
    activation_revenue: actualFinancials.activationRevenue / 100,
    unclaimed_referral_revenue: actualFinancials.unclaimedReferralRevenue / 100,
    content_payment_revenue: actualFinancials.contentPaymentRevenue / 100,
    spin_cost_revenue: actualFinancials.spinCostRevenue / 100,
    other_revenue: actualFinancials.otherRevenue / 100,
    is_active: company.is_active,
    created_at: company.created_at,
    updated_at: company.updated_at
  };
}

/**
 * Transform transaction data for response
 */
function transformTransactionData(transaction: any): CompanyTransactionData {
  return {
    _id: transaction._id.toString(),
    amount: transaction.amount_cents / 100,
    type: transaction.type,
    description: transaction.description,
    status: transaction.status,
    source: transaction.source || 'activation',
    balance_before: (transaction.balance_before_cents || 0) / 100,
    balance_after: (transaction.balance_after_cents || 0) / 100,
    created_at: transaction.created_at,
    metadata: transaction.metadata
  };
}

// =============================================================================
// EXPORTED ACTIONS
// =============================================================================

/**
 * Sync company financials from transactions (CRITICAL FIX)
 */
export async function syncCompanyFinancials(): Promise<ApiResponse<{
  synced_revenue: number;
  synced_expenses: number;
  synced_balance: number;
  breakdown: any;
}>> {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error || 'Access denied' };
    }

    await connectToDatabase();
    const company = await getOrCreateCompany();

    // Calculate actual totals from transactions
    const actualFinancials = await calculateActualFinancials();

    // Update company model with actual values
    company.wallet_balance_cents = actualFinancials.currentBalance;
    company.total_revenue_cents = actualFinancials.totalRevenue;
    company.total_expenses_cents = actualFinancials.totalExpenses;
    company.activation_revenue_cents = actualFinancials.activationRevenue;
    company.unclaimed_referral_revenue_cents = actualFinancials.unclaimedReferralRevenue;
    company.content_payment_revenue_cents = actualFinancials.contentPaymentRevenue;
    company.other_revenue_cents = actualFinancials.otherRevenue + actualFinancials.spinCostRevenue;

    await company.save();

    console.log('✅ Company financials synced:', {
      revenue: actualFinancials.totalRevenue / 100,
      expenses: actualFinancials.totalExpenses / 100,
      balance: actualFinancials.currentBalance / 100
    });

    // Create audit log
    await AdminAuditLog.create({
      actor_id: adminCheck.userId,
      action: 'SYNC_COMPANY_FINANCIALS',
      target_type: 'company',
      target_id: company._id.toString(),
      resource_type: 'user',
      resource_id: company._id.toString(),
      action_type: 'update',
      changes: {
        wallet_balance_cents: actualFinancials.currentBalance,
        total_revenue_cents: actualFinancials.totalRevenue,
        total_expenses_cents: actualFinancials.totalExpenses
      },
      metadata: {
        sync_type: 'manual',
        timestamp: new Date().toISOString()
      }
    });

    revalidatePath('/admin/company');

    return {
      success: true,
      data: {
        synced_revenue: actualFinancials.totalRevenue / 100,
        synced_expenses: actualFinancials.totalExpenses / 100,
        synced_balance: actualFinancials.currentBalance / 100,
        breakdown: {
          activation: actualFinancials.activationRevenue / 100,
          unclaimed_referrals: actualFinancials.unclaimedReferralRevenue / 100,
          spin_costs: actualFinancials.spinCostRevenue / 100,
          content_payments: actualFinancials.contentPaymentRevenue / 100,
          other: actualFinancials.otherRevenue / 100
        }
      },
      message: 'Company financials synced successfully from transactions'
    };

  } catch (error) {
    console.error('❌ Sync company financials error:', error);
    return { success: false, error: 'Failed to sync company financials' };
  }
}

/**
 * Get company profile and statistics (FIXED - Uses Transaction data)
 */
export async function getCompanyProfile(): Promise<ApiResponse<{ 
  company: CompanyData; 
  stats: CompanyStats 
}>> {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error || 'Access denied' };
    }

    await connectToDatabase();
    const company = await getOrCreateCompany();

    // CRITICAL FIX: Calculate from transactions, not Company model fields
    const actualFinancials = await calculateActualFinancials();

    // Calculate time-based statistics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayRevenue,
      weekRevenue,
      monthRevenue,
      activationCount,
      referralCount
    ] = await Promise.all([
      // Today's revenue
      Transaction.aggregate([
        {
          $match: {
            target_type: 'company',
            status: 'completed',
            type: { $in: ['COMPANY_REVENUE', 'ACTIVATION_FEE', 'ACCOUNT_ACTIVATION', 'SPIN_COST'] },
            created_at: { $gte: todayStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount_cents' } } }
      ]),
      // This week's revenue
      Transaction.aggregate([
        {
          $match: {
            target_type: 'company',
            status: 'completed',
            type: { $in: ['COMPANY_REVENUE', 'ACTIVATION_FEE', 'ACCOUNT_ACTIVATION', 'SPIN_COST'] },
            created_at: { $gte: weekStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount_cents' } } }
      ]),
      // This month's revenue
      Transaction.aggregate([
        {
          $match: {
            target_type: 'company',
            status: 'completed',
            type: { $in: ['COMPANY_REVENUE', 'ACTIVATION_FEE', 'ACCOUNT_ACTIVATION', 'SPIN_COST'] },
            created_at: { $gte: monthStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount_cents' } } }
      ]),
      // Activation transaction count
      Transaction.countDocuments({
        target_type: 'company',
        status: 'completed',
        type: { $in: ['ACTIVATION_FEE', 'ACCOUNT_ACTIVATION'] }
      }),
      // Referral transaction count
      Transaction.countDocuments({
        type: 'REFERRAL',
        status: 'completed'
      })
    ]);

    const stats: CompanyStats = {
      total_revenue: actualFinancials.totalRevenue / 100,
      total_expenses: actualFinancials.totalExpenses / 100,
      net_profit: (actualFinancials.totalRevenue - actualFinancials.totalExpenses) / 100,
      current_balance: actualFinancials.currentBalance / 100,
      transactions_count: actualFinancials.revenueTransactionCount + actualFinancials.expenseTransactionCount,
      activation_count: activationCount,
      referral_bonus_count: referralCount,
      today_revenue: todayRevenue[0]?.total ? todayRevenue[0].total / 100 : 0,
      this_week_revenue: weekRevenue[0]?.total ? weekRevenue[0].total / 100 : 0,
      this_month_revenue: monthRevenue[0]?.total ? monthRevenue[0].total / 100 : 0
    };

    return {
      success: true,
      data: {
        company: transformCompanyData(company, actualFinancials),
        stats
      }
    };
  } catch (error) {
    console.error('❌ Get company profile error:', error);
    return { success: false, error: 'Failed to fetch company profile' };
  }
}

/**
 * Create company revenue transaction (UPDATED with better balance tracking)
 */
export async function createCompanyRevenueTransaction(
  amountCents: number,
  type: 'COMPANY_REVENUE' | 'ACTIVATION_FEE' | 'UNCLAIMED_REFERRAL' | 'SPIN_COST',
  description: string,
  metadata?: any,
  relatedUserId?: string
): Promise<ApiResponse<{ transaction_id: string }>> {
  try {
    await connectToDatabase();
    
    const company = await getOrCreateCompany();
    
    // Get current balance from transactions (SOURCE OF TRUTH)
    const actualFinancials = await calculateActualFinancials();
    const balanceBefore = actualFinancials.currentBalance;
    const balanceAfter = balanceBefore + amountCents;
    
    // Create transaction
    const transaction = await Transaction.create({
      target_type: 'company',
      target_id: company._id.toString(),
      user_id: relatedUserId || null,
      amount_cents: amountCents,
      type: type,
      description: description,
      status: 'completed',
      source: 'activation',
      balance_before_cents: balanceBefore,
      balance_after_cents: balanceAfter,
      metadata: {
        ...metadata,
        company_transaction: true,
        timestamp: new Date().toISOString()
      }
    });
    
    // Update company balance (but transactions are still source of truth)
    company.wallet_balance_cents = balanceAfter;
    company.total_revenue_cents += amountCents;
    
    // Update specific revenue category
    if (type === 'ACTIVATION_FEE' || type === 'COMPANY_REVENUE') {
      company.activation_revenue_cents += amountCents;
    } else if (type === 'UNCLAIMED_REFERRAL') {
      company.unclaimed_referral_revenue_cents += amountCents;
    } else if (type === 'SPIN_COST') {
      company.other_revenue_cents += amountCents;
    }
    
    await company.save();
    
    console.log('✅ Company transaction created:', {
      id: transaction._id,
      amount: amountCents / 100,
      type,
      balance_after: balanceAfter / 100
    });
    
    revalidatePath('/admin/company');
    
    return {
      success: true,
      data: {
        transaction_id: transaction._id.toString()
      }
    };
    
  } catch (error) {
    console.error('❌ Company transaction error:', error);
    return { success: false, error: 'Failed to create company transaction' };
  }
}

/**
 * Get company transactions with filters and pagination (FIXED - Removed target_id filter)
 */
export async function getCompanyTransactions(filters?: {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<ApiResponse<{
  transactions: CompanyTransactionData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}>> {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error || 'Access denied' };
    }

    await connectToDatabase();
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;
    
    // Build query - FIXED: Don't filter by target_id, just target_type
    const query: any = {
      target_type: 'company',
      status: 'completed'  // Only show completed transactions
    };
    
    if (filters?.type && filters.type !== 'all') {
      query.type = filters.type;
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.created_at = {};
      if (filters.startDate) {
        query.created_at.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.created_at.$lte = filters.endDate;
      }
    }
    
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query)
    ]);
    
    return {
      success: true,
      data: {
        transactions: transactions.map(transformTransactionData),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Get company transactions error:', error);
    return { success: false, error: 'Failed to fetch company transactions' };
  }
}

/**
 * Update company information
 */
export async function updateCompanyInfo(data: {
  name?: string;
  phone_number?: string;
  registration_number?: string;
  tax_id?: string;
  address?: string;
}): Promise<ApiResponse<CompanyData>> {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error || 'Access denied' };
    }

    await connectToDatabase();
    const company = await getOrCreateCompany();
    
    // Update fields
    if (data.name) company.name = data.name;
    if (data.phone_number) company.phone_number = data.phone_number;
    if (data.registration_number) company.registration_number = data.registration_number;
    if (data.tax_id) company.tax_id = data.tax_id;
    if (data.address) company.address = data.address;
    
    await company.save();
    
    // Create audit log
    await AdminAuditLog.create({
      actor_id: adminCheck.userId,
      action: 'UPDATE_SYSTEM_SETTINGS',
      target_type: 'company',
      target_id: company._id.toString(),
      resource_type: 'user',
      resource_id: company._id.toString(),
      action_type: 'update',
      changes: data,
      metadata: {
        company_update: true
      }
    });
    
    revalidatePath('/admin/company');
    
    // Get actual financials for accurate data
    const actualFinancials = await calculateActualFinancials();
    
    return {
      success: true,
      data: transformCompanyData(company, actualFinancials)
    };
    
  } catch (error) {
    console.error('❌ Update company info error:', error);
    return { success: false, error: 'Failed to update company information' };
  }
}

/**
 * Get revenue breakdown by category (FIXED - Uses actual transactions)
 */
export async function getRevenueBreakdown(): Promise<ApiResponse<{
  categories: {
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
  total: number;
}>> {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error || 'Access denied' };
    }

    await connectToDatabase();
    
    // Calculate from actual transactions
    const actualFinancials = await calculateActualFinancials();
    
    const total = actualFinancials.totalRevenue / 100;
    
    const categories = [
      {
        name: 'Activation Revenue',
        amount: actualFinancials.activationRevenue / 100,
        percentage: total > 0 ? (actualFinancials.activationRevenue / actualFinancials.totalRevenue) * 100 : 0,
        color: '#10b981'
      },
      {
        name: 'Unclaimed Referrals',
        amount: actualFinancials.unclaimedReferralRevenue / 100,
        percentage: total > 0 ? (actualFinancials.unclaimedReferralRevenue / actualFinancials.totalRevenue) * 100 : 0,
        color: '#f59e0b'
      },
      {
        name: 'Spin Costs',
        amount: actualFinancials.spinCostRevenue / 100,
        percentage: total > 0 ? (actualFinancials.spinCostRevenue / actualFinancials.totalRevenue) * 100 : 0,
        color: '#8b5cf6'
      },
      {
        name: 'Content Payments',
        amount: actualFinancials.contentPaymentRevenue / 100,
        percentage: total > 0 ? (actualFinancials.contentPaymentRevenue / actualFinancials.totalRevenue) * 100 : 0,
        color: '#3b82f6'
      },
      {
        name: 'Other Revenue',
        amount: actualFinancials.otherRevenue / 100,
        percentage: total > 0 ? (actualFinancials.otherRevenue / actualFinancials.totalRevenue) * 100 : 0,
        color: '#6b7280'
      }
    ];
    
    return {
      success: true,
      data: {
        categories,
        total
      }
    };
    
  } catch (error) {
    console.error('❌ Get revenue breakdown error:', error);
    return { success: false, error: 'Failed to fetch revenue breakdown' };
  }
}

/**
 * Export company financial report
 */
export async function exportCompanyReport(format: 'csv' | 'json' = 'json'): Promise<ApiResponse<any>> {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      return { success: false, error: adminCheck.error || 'Access denied' };
    }

    await connectToDatabase();
    const company = await getOrCreateCompany();
    const actualFinancials = await calculateActualFinancials();
    
    const transactions = await Transaction.find({
      target_type: 'company',
      status: 'completed'
    })
    .sort({ created_at: -1 })
    .lean();
    
    const report = {
      company: transformCompanyData(company, actualFinancials),
      transactions: transactions.map(transformTransactionData),
      financials: {
        total_revenue: actualFinancials.totalRevenue / 100,
        total_expenses: actualFinancials.totalExpenses / 100,
        net_profit: (actualFinancials.totalRevenue - actualFinancials.totalExpenses) / 100,
        current_balance: actualFinancials.currentBalance / 100
      },
      generated_at: new Date().toISOString(),
      generated_by: adminCheck.userId
    };
    
    return {
      success: true,
      data: report
    };
    
  } catch (error) {
    console.error('❌ Export company report error:', error);
    return { success: false, error: 'Failed to export report' };
  }
}
