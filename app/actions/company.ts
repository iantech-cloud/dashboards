// app/actions/company.ts
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
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
    const session = await getServerSession(authOptions) as Session | null;
    
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
 * Transform company data for response
 */
function transformCompanyData(company: any): CompanyData {
  return {
    _id: company._id.toString(),
    name: company.name,
    email: company.email,
    phone_number: company.phone_number,
    wallet_balance: company.wallet_balance_cents / 100,
    total_revenue: company.total_revenue_cents / 100,
    total_expenses: company.total_expenses_cents / 100,
    activation_revenue: company.activation_revenue_cents / 100,
    unclaimed_referral_revenue: company.unclaimed_referral_revenue_cents / 100,
    content_payment_revenue: company.content_payment_revenue_cents / 100,
    other_revenue: company.other_revenue_cents / 100,
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
    balance_before: transaction.balance_before_cents / 100,
    balance_after: transaction.balance_after_cents / 100,
    created_at: transaction.created_at,
    metadata: transaction.metadata
  };
}

// =============================================================================
// EXPORTED ACTIONS
// =============================================================================

/**
 * Get company profile and statistics
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

    // Calculate statistics
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTransactions,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      activationCount,
      referralCount
    ] = await Promise.all([
      Transaction.countDocuments({ 
        target_type: 'company',
        target_id: company._id.toString()
      }),
      Transaction.aggregate([
        {
          $match: {
            target_type: 'company',
            target_id: company._id.toString(),
            type: { $in: ['COMPANY_REVENUE', 'ACTIVATION_FEE'] },
            created_at: { $gte: todayStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount_cents' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            target_type: 'company',
            target_id: company._id.toString(),
            type: { $in: ['COMPANY_REVENUE', 'ACTIVATION_FEE'] },
            created_at: { $gte: weekStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount_cents' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            target_type: 'company',
            target_id: company._id.toString(),
            type: { $in: ['COMPANY_REVENUE', 'ACTIVATION_FEE'] },
            created_at: { $gte: monthStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount_cents' } } }
      ]),
      Transaction.countDocuments({
        target_type: 'company',
        target_id: company._id.toString(),
        type: 'COMPANY_REVENUE'
      }),
      Transaction.countDocuments({
        type: 'REFERRAL',
        status: 'completed'
      })
    ]);

    const stats: CompanyStats = {
      total_revenue: company.total_revenue_cents / 100,
      total_expenses: company.total_expenses_cents / 100,
      net_profit: (company.total_revenue_cents - company.total_expenses_cents) / 100,
      current_balance: company.wallet_balance_cents / 100,
      transactions_count: totalTransactions,
      activation_count: activationCount,
      referral_bonus_count: referralCount,
      today_revenue: todayRevenue[0]?.total ? todayRevenue[0].total / 100 : 0,
      this_week_revenue: weekRevenue[0]?.total ? weekRevenue[0].total / 100 : 0,
      this_month_revenue: monthRevenue[0]?.total ? monthRevenue[0].total / 100 : 0
    };

    return {
      success: true,
      data: {
        company: transformCompanyData(company),
        stats
      }
    };
  } catch (error) {
    console.error('❌ Get company profile error:', error);
    return { success: false, error: 'Failed to fetch company profile' };
  }
}

/**
 * Create company revenue transaction
 */
export async function createCompanyRevenueTransaction(
  amountCents: number,
  type: 'COMPANY_REVENUE' | 'ACTIVATION_FEE' | 'UNCLAIMED_REFERRAL',
  description: string,
  metadata?: any,
  relatedUserId?: string
): Promise<ApiResponse<{ transaction_id: string }>> {
  try {
    await connectToDatabase();
    
    const company = await getOrCreateCompany();
    
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
      balance_before_cents: company.wallet_balance_cents,
      balance_after_cents: company.wallet_balance_cents + amountCents,
      metadata: {
        ...metadata,
        company_transaction: true,
        timestamp: new Date().toISOString()
      }
    });
    
    // Update company balance and revenue
    company.wallet_balance_cents += amountCents;
    company.total_revenue_cents += amountCents;
    
    // Update specific revenue category
    if (type === 'COMPANY_REVENUE') {
      company.activation_revenue_cents += amountCents;
    } else if (type === 'UNCLAIMED_REFERRAL') {
      company.unclaimed_referral_revenue_cents += amountCents;
    }
    
    await company.save();
    
    console.log('✅ Company transaction created:', transaction._id);
    
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
 * Get company transactions with filters and pagination
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
    const company = await getOrCreateCompany();
    
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {
      target_type: 'company',
      target_id: company._id.toString()
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
    
    return {
      success: true,
      data: transformCompanyData(company)
    };
    
  } catch (error) {
    console.error('❌ Update company info error:', error);
    return { success: false, error: 'Failed to update company information' };
  }
}

/**
 * Get revenue breakdown by category
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
    const company = await getOrCreateCompany();
    
    const total = company.total_revenue_cents / 100;
    
    const categories = [
      {
        name: 'Activation Revenue',
        amount: company.activation_revenue_cents / 100,
        percentage: total > 0 ? (company.activation_revenue_cents / company.total_revenue_cents) * 100 : 0,
        color: '#10b981'
      },
      {
        name: 'Unclaimed Referrals',
        amount: company.unclaimed_referral_revenue_cents / 100,
        percentage: total > 0 ? (company.unclaimed_referral_revenue_cents / company.total_revenue_cents) * 100 : 0,
        color: '#f59e0b'
      },
      {
        name: 'Content Payments',
        amount: company.content_payment_revenue_cents / 100,
        percentage: total > 0 ? (company.content_payment_revenue_cents / company.total_revenue_cents) * 100 : 0,
        color: '#3b82f6'
      },
      {
        name: 'Other Revenue',
        amount: company.other_revenue_cents / 100,
        percentage: total > 0 ? (company.other_revenue_cents / company.total_revenue_cents) * 100 : 0,
        color: '#8b5cf6'
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
    
    const transactions = await Transaction.find({
      target_type: 'company',
      target_id: company._id.toString()
    })
    .sort({ created_at: -1 })
    .lean();
    
    const report = {
      company: transformCompanyData(company),
      transactions: transactions.map(transformTransactionData),
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
