// --- Data Access Layer: app/lib/data.ts ---
// This file contains all MongoDB data fetching utilities using Mongoose.

"use server"

import {
  CustomerField,
  CustomersTableType,
  DashboardData,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  ProfileDB,
  ReceiptDB,
  Revenue as RevenueType,
  StatsCalcDB,
  TransactionDB,
} from './definitions';
import { formatCurrency } from './utils';

// Import Mongoose models and connection utility
import {
  Profile,
  Withdrawal,
  Transaction,
  Referral,
  DownlineUser,
  Earning,
  Revenue,
  Customer,
  Invoice,
  connectToDatabase,
  SupportTicket,
  AdminAuditLog,
  ActivationPayment,
} from './models';

// Interface for the lean Profile document used in fetchDashboardData
interface ProfileLean {
  _id: string;
  username: string;
  phone_number: string;
  referral_id: string;
  email: string;
  is_verified: boolean;
  is_active: boolean;
  is_approved: boolean;
  status: string;
  ban_reason?: string;
  banned_at?: Date;
  suspension_reason?: string;
  suspended_at?: Date;
  level: number;
  rank: string;
  total_earnings_cents: number;
  balance_cents: number;
  tasks_completed: number;
  available_spins: number;
}


/**
 * Helper function to convert amounts from cents (integer) to KES/Dollars (float).
 */
const centsToUnits = (cents: number): number => {
  return cents / 100;
};

// -----------------------------------------------
// NEW DASHBOARD DATA FETCHING FUNCTION
// -----------------------------------------------

/**
 * Fetches all necessary data for the user dashboard in a single, efficient call.
 * @param userId The ID of the authenticated user.
 */
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  await connectToDatabase();

  try {
    console.log(`🔍 Fetching dashboard data for user: ${userId}`);

    // 1. Fetch Profile and Balance/Earnings. Use .lean<Type>() for safety and performance
    const profilePromise = Profile.findById(userId).lean<ProfileLean>();

    // Compute start of today (server local time) and start of tomorrow for date range queries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // 2. Fetch Aggregated Statistics
    const statsCalcPromises = Promise.all([
      // A. Total pending withdrawals
      Withdrawal.aggregate([
        { $match: { user_id: userId, status: 'pending' } },
        { $group: { _id: null, pending_withdrawals_cents: { $sum: '$amount_cents' } } }
      ]),
      // B. Referral counts
      Referral.countDocuments({ referrer_id: userId }),
      // C. Downline count
      DownlineUser.countDocuments({ main_user_id: userId }),
      // D. Direct Referral Earnings (lifetime)
      Earning.aggregate([
        { $match: { user_id: userId, type: 'REFERRAL' } },
        { $group: { _id: null, direct_referral_earnings_cents: { $sum: '$amount_cents' } } }
      ]),
      // E. Downline Earnings (lifetime)
      Earning.aggregate([
        { $match: { user_id: userId, type: 'DOWNLINE' } },
        { $group: { _id: null, downline_earnings_cents: { $sum: '$amount_cents' } } }
      ]),
      // F. Spin Earnings / Spin Wallet (lifetime SPIN_WIN transactions)
      Transaction.aggregate([
        { $match: { user_id: userId, type: 'SPIN_WIN' } },
        { $group: { _id: null, spin_earnings_cents: { $sum: '$amount_cents' } } }
      ]),
      // G. Survey Earnings (lifetime)
      Transaction.aggregate([
        { $match: { user_id: userId, type: 'SURVEY' } },
        { $group: { _id: null, survey_earnings_cents: { $sum: '$amount_cents' } } }
      ]),
      // H. Task Earnings (lifetime) — from Earning collection (type=TASK)
      Earning.aggregate([
        { $match: { user_id: userId, type: 'TASK' } },
        { $group: { _id: null, task_earnings_cents: { $sum: '$amount_cents' } } }
      ]),
      // I. Bonus Earnings (lifetime) — from Earning collection (type=BONUS)
      Earning.aggregate([
        { $match: { user_id: userId, type: 'BONUS' } },
        { $group: { _id: null, bonus_earnings_cents: { $sum: '$amount_cents' } } }
      ]),
      // J. Today's Earnings — sum of all Earning rows created today
      Earning.aggregate([
        { $match: { user_id: userId, created_at: { $gte: startOfToday, $lt: startOfTomorrow } } },
        { $group: { _id: null, today_earnings_cents: { $sum: '$amount_cents' } } }
      ]),
      // K. Today's Withdrawals — sum of withdrawals created today (any status not rejected)
      Withdrawal.aggregate([
        { $match: { user_id: userId, status: { $ne: 'rejected' }, created_at: { $gte: startOfToday, $lt: startOfTomorrow } } },
        { $group: { _id: null, today_withdrawals_cents: { $sum: '$amount_cents' }, count: { $sum: 1 } } }
      ]),
    ]);

    // 3. Fetch Approved Withdrawal Receipts (limit 10)
    const receiptsPromise = Withdrawal.find({ user_id: userId, status: 'approved' })
      .select('amount_cents created_at transaction_code')
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

    // 4. Fetch Transaction History (limit 15)
    const transactionsPromise = Transaction.find({ user_id: userId })
      .select('amount_cents type description status created_at')
      .sort({ created_at: -1 })
      .limit(15)
      .lean();

    // Execute all queries concurrently
    const [
      profileResult,
      statsCalcAggregates,
      receiptsResult,
      transactionsResult,
    ] = await Promise.all([
      profilePromise,
      statsCalcPromises,
      receiptsPromise,
      transactionsPromise,
    ]);

    if (!profileResult) {
      // Throw an error if the user profile is not found
      throw new Error(`User with ID ${userId} not found in profiles collection.`);
    }

    const [
      pendingWithdrawalsAgg,
      referralCount,
      downlineCount,
      directReferralEarningsAgg,
      downlineEarningsAgg,
      spinEarningsAgg,
      surveyEarningsAgg,
      taskEarningsAgg,
      bonusEarningsAgg,
      todayEarningsAgg,
      todayWithdrawalsAgg,
    ] = statsCalcAggregates;

    // profileData is a plain JavaScript object because of .lean()
    const profileData = profileResult; 

    // Debug log to see what we're getting
    console.log('📊 Profile available_spins:', profileData.available_spins);
    console.log('📊 Profile data:', {
      username: profileData.username,
      available_spins: profileData.available_spins,
      balance_cents: profileData.balance_cents,
      total_earnings_cents: profileData.total_earnings_cents
    });

    // Aggregate stats into a single object
    const statsCalcData = {
      pending_withdrawals_cents: pendingWithdrawalsAgg[0]?.pending_withdrawals_cents || 0,
      referral_count: referralCount,
      downline_count: downlineCount,
      direct_referral_earnings_cents: directReferralEarningsAgg[0]?.direct_referral_earnings_cents || 0,
      downline_earnings_cents: downlineEarningsAgg[0]?.downline_earnings_cents || 0,
      spin_earnings_cents: spinEarningsAgg[0]?.spin_earnings_cents || 0,
      survey_earnings_cents: surveyEarningsAgg[0]?.survey_earnings_cents || 0,
      task_earnings_cents: taskEarningsAgg[0]?.task_earnings_cents || 0,
      bonus_earnings_cents: bonusEarningsAgg[0]?.bonus_earnings_cents || 0,
      today_earnings_cents: todayEarningsAgg[0]?.today_earnings_cents || 0,
      today_withdrawals_cents: todayWithdrawalsAgg[0]?.today_withdrawals_cents || 0,
      today_withdrawals_count: todayWithdrawalsAgg[0]?.count || 0,
    };

    // 1. Construct Profile (Convert MongoDB Date objects to ISO strings)
    const profile = {
      username: profileData.username,
      phone_number: profileData.phone_number,
      referral_id: profileData.referral_id,
      email: profileData.email,
      is_verified: profileData.is_verified,
      is_active: profileData.is_active,
      is_approved: profileData.is_approved,
      status: profileData.status,
      ban_reason: profileData.ban_reason,
      banned_at: profileData.banned_at ? profileData.banned_at.toISOString() : null,
      suspension_reason: profileData.suspension_reason,
      suspended_at: profileData.suspended_at ? profileData.suspended_at.toISOString() : null,
      level: profileData.level,
      rank: profileData.rank,
      total_earnings: centsToUnits(profileData.total_earnings_cents),
      tasks_completed: profileData.tasks_completed,
      available_spins: profileData.available_spins,
    } as ProfileDB;

    // 2. Construct Stats - FIXED VERSION
    const stats = {
      totalEarnings: centsToUnits(profileData.total_earnings_cents),
      availableBalance: centsToUnits(profileData.balance_cents),
      pendingWithdrawals: centsToUnits(statsCalcData.pending_withdrawals_cents),
      referralCount: Number(statsCalcData.referral_count),
      directReferralEarnings: centsToUnits(statsCalcData.direct_referral_earnings_cents),
      downlineCount: Number(statsCalcData.downline_count),
      downlineEarnings: centsToUnits(statsCalcData.downline_earnings_cents),
      level: profileData.level,
      rank: profileData.rank,
      availableSpins: profileData.available_spins,
      surveyEarnings: centsToUnits(statsCalcData.survey_earnings_cents),
      spinEarnings: centsToUnits(statsCalcData.spin_earnings_cents),
      // New per-wallet & daily stats
      taskEarnings: centsToUnits(statsCalcData.task_earnings_cents),
      bonusEarnings: centsToUnits(statsCalcData.bonus_earnings_cents),
      todayEarnings: centsToUnits(statsCalcData.today_earnings_cents),
      todayWithdrawals: centsToUnits(statsCalcData.today_withdrawals_cents),
      todayWithdrawalsCount: Number(statsCalcData.today_withdrawals_count),
    };

    console.log('🎯 Final stats.availableSpins:', stats.availableSpins);

    // 3. Construct Receipts
    const receipts = receiptsResult.map(r => ({
      id: r._id.toString(), // Use MongoDB's _id
      amount: centsToUnits(r.amount_cents),
      date: new Date(r.created_at).toISOString(),
      transactionCode: r.transaction_code,
    })) as ReceiptDB[];

    // 4. Construct Transactions
    const transactions = transactionsResult.map(t => ({
      id: t._id.toString(), // Use MongoDB's _id
      amount: centsToUnits(t.amount_cents),
      type: t.type,
      description: t.description,
      status: t.status,
      // Convert MongoDB Date objects to ISO strings
      date: new Date(t.created_at).toISOString(), 
    })) as TransactionDB[];

    const result = { profile, stats, receipts, transactions } as DashboardData;
    console.log('✅ Dashboard data fetched successfully');
    return result;

  } catch (error) {
    console.error('❌ Database Error in fetchDashboardData:', error);
    // Re-throw custom error to be handled by the calling layer (e.g., Next.js error boundary)
    throw new Error('Failed to fetch comprehensive dashboard data.'); 
  }
}

// ===============================================
// Existing functions implemented with MongoDB
// ===============================================

export async function fetchRevenue(): Promise<RevenueType[]> {
  await connectToDatabase();
  try {
    // NOTE: If your Revenue collection is large, you might want to project/select specific fields.
    const data = await Revenue.find().select('month revenue').lean() as RevenueType[];
    return data;
  } catch (error) {
    console.error('Database Error in fetchRevenue:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices(): Promise<LatestInvoiceRaw[]> {
  await connectToDatabase();
  try {
    // Uses $lookup to perform the JOIN equivalent from invoices to customers
    const data = await Invoice.aggregate([
      { $sort: { date: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'customers', // The collection name (Mongoose pluralizes by default)
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customerDetails',
        }
      },
      { $unwind: '$customerDetails' },
      {
        $project: {
          _id: 0,
          id: '$_id',
          amount: '$amount',
          name: '$customerDetails.name',
          image_url: '$customerDetails.image_url',
          email: '$customerDetails.email',
        }
      }
    ]) as LatestInvoiceRaw[];

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error in fetchLatestInvoices:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  await connectToDatabase();
  try {
    const data = await Promise.all([
      // Invoice Count
      Invoice.countDocuments(),
      // Customer Count
      Customer.countDocuments(),
      // Paid and Pending Amounts (Aggregation)
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            paid: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
            }
          }
        }
      ])
    ]);

    const numberOfInvoices = Number(data[0] ?? 0);
    const numberOfCustomers = Number(data[1] ?? 0);
    const invoiceStatus = data[2][0] || { paid: 0, pending: 0 };
    const totalPaidInvoices = formatCurrency(invoiceStatus.paid ?? 0);
    const totalPendingInvoices = formatCurrency(invoiceStatus.pending ?? 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error in fetchCardData:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
): Promise<InvoicesTable[]> {
  await connectToDatabase();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    // MongoDB uses $regex for case-insensitive LIKE and $lookup for joins
    const invoices = await Invoice.aggregate([
      // Lookup customer details
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customerDetails',
        }
      },
      { $unwind: '$customerDetails' },
      // Apply filters (matching name, email, amount, date, or status)
      {
        $match: {
          $or: [
            { 'customerDetails.name': { $regex: query, $options: 'i' } },
            { 'customerDetails.email': { $regex: query, $options: 'i' } },
            // Match exact cents if number. Note: query is in units, amounts are in cents.
            // We only match if the query is a valid number, otherwise filter out the amount match
            { 'amount': Number.isNaN(Number(query)) ? undefined : Number(query) * 100 }, 
            { 'status': { $regex: query, $options: 'i' } },
            // Note: Date filtering by string is complex in Mongo. We skip it here or use date range logic.
          ].filter(Boolean)
        }
      },
      // Sort, skip, and limit
      { $sort: { date: -1 } },
      { $skip: offset },
      { $limit: ITEMS_PER_PAGE },
      // Project final structure
      {
        $project: {
          _id: 0,
          id: '$_id',
          amount: '$amount',
          date: '$date',
          status: '$status',
          name: '$customerDetails.name',
          email: '$customerDetails.email',
          image_url: '$customerDetails.image_url',
        }
      }
    ]) as InvoicesTable[];

    return invoices;
  } catch (error) {
    console.error('Database Error in fetchFilteredInvoices:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  await connectToDatabase();
  try {
    const pipeline = [
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customerDetails',
        }
      },
      { $unwind: '$customerDetails' },
      {
        $match: {
          $or: [
            { 'customerDetails.name': { $regex: query, $options: 'i' } },
            { 'customerDetails.email': { $regex: query, $options: 'i' } },
            // Match exact cents if number
            { 'amount': Number.isNaN(Number(query)) ? undefined : Number(query) * 100 },
            { 'status': { $regex: query, $options: 'i' } },
          ].filter(Boolean)
        }
      },
      { $count: 'count' }
    ];

    const data = await Invoice.aggregate(pipeline);

    const count = data[0]?.count ?? 0;
    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error in fetchInvoicesPages:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string): Promise<InvoiceForm | undefined> {
  await connectToDatabase();
  try {
    // Find by MongoDB ObjectId
    const data = await Invoice.findById(id).select('customer_id amount status').lean() as (InvoiceForm & { amount: number }) | null;

    if (!data) return undefined;

    const invoice = {
      ...data,
      id: data._id.toString(),
      // Convert amount from cents to dollars
      amount: data.amount / 100,
    } as InvoiceForm;

    return invoice;
  } catch (error) {
    console.error('Database Error in fetchInvoiceById:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers(): Promise<CustomerField[]> {
  await connectToDatabase();
  try {
    const customers = await Customer.find()
      .select('name email _id')
      .sort({ name: 1 })
      .lean() as CustomerField[];

    // Map _id to id for consistency with frontend
    return customers.map(c => ({ id: c._id.toString(), name: c.name }));
  } catch (err) {
    console.error('Database Error in fetchCustomers:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string): Promise<CustomersTableType[]> {
  await connectToDatabase();
  try {
    const pipeline = [
      {
        $match: {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ]
        }
      },
      // $lookup is used to join the Customer collection with the Invoice collection
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'customer_id',
          as: 'customerInvoices',
        }
      },
      // Calculate totals
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: 1,
          email: 1,
          image_url: 1,
          total_invoices: { $size: '$customerInvoices' },
          total_pending: {
            $sum: {
              $map: {
                input: '$customerInvoices',
                as: 'invoice',
                in: { $cond: [{ $eq: ['$$invoice.status', 'pending'] }, '$$invoice.amount', 0] }
              }
            }
          },
          total_paid: {
            $sum: {
              $map: {
                input: '$customerInvoices',
                as: 'invoice',
                in: { $cond: [{ $eq: ['$$invoice.status', 'paid'] }, '$$invoice.amount', 0] }
              }
            }
          },
        }
      },
      { $sort: { name: 1 } },
    ];

    const data = await Customer.aggregate(pipeline) as CustomersTableType[];

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(Number(customer.total_pending)),
      total_paid: formatCurrency(Number(customer.total_paid)),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error in fetchFilteredCustomers:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

// ===============================================
// ROLE-BASED DASHBOARD DATA FETCHING FUNCTIONS
// ===============================================

/**
 * Fetches profile with status for authentication and role checking
 */
export async function fetchProfileWithStatus(userId: string) {
  await connectToDatabase();
  try {
    // We explicitly select the fields needed for status/role checking
    const result = await Profile.findById(userId)
      .select('username email role is_verified email_verified_at activation_paid_at approval_status is_approved status ban_reason banned_at suspension_reason suspended_at available_spins')
      .lean();

    if (!result) {
      return null;
    }

    // Map _id to id for consistency
    return { 
      ...result, 
      id: result._id.toString(),
      available_spins: result.available_spins || 0 
    } as ProfileDB;
  } catch (error) {
    console.error('Database Error in fetchProfileWithStatus:', error);
    throw new Error('Failed to fetch profile status.');
  }
}

/**
 * Fetches all data for Support Team Dashboard
 */
export async function fetchSupportDashboardData(supportUserId: string) {
  await connectToDatabase();
  try {
    const [statsResult, myTicketsResult, unassignedResult] = await Promise.all([
      // 1. Fetch support tickets statistics
      SupportTicket.aggregate([
        {
          $group: {
            _id: null,
            open_tickets: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
            in_progress_tickets: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
            resolved_tickets: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
            closed_tickets: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
            my_tickets: { $sum: { $cond: [{ $eq: ["$assigned_to", supportUserId] }, 1, 0] } },
            // urgent tickets check if status is open or in_progress AND priority is urgent
            urgent_tickets: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "urgent"] }, { $in: ["$status", ["open", "in_progress"]] }] }, 1, 0] } }, 
          }
        }
      ]),
      // 2. Fetch assigned tickets for this support user ($lookup needed for user profile)
      SupportTicket.aggregate([
        { $match: { assigned_to: supportUserId } },
        { $sort: { priority: -1, created_at: -1 } }, // Assuming higher priority means higher value (descending sort)
        { $limit: 20 },
        {
          $lookup: {
            from: 'profiles',
            localField: 'user_id',
            foreignField: '_id',
            as: 'userDetails',
          }
        },
        { $unwind: '$userDetails' },
        {
          $project: {
            id: '$_id', subject: 1, description: 1, status: 1, priority: 1, created_at: 1, updated_at: 1,
            user_name: '$userDetails.username', user_email: '$userDetails.email'
          }
        }
      ]),
      // 3. Fetch unassigned tickets ($lookup needed for user profile)
      SupportTicket.aggregate([
        { $match: { assigned_to: null, status: { $in: ['open', 'in_progress'] } } },
        { $sort: { priority: -1, created_at: -1 } }, // Assuming higher priority means higher value (descending sort)
        { $limit: 10 },
        {
          $lookup: {
            from: 'profiles',
            localField: 'user_id',
            foreignField: '_id',
            as: 'userDetails',
          }
        },
        { $unwind: '$userDetails' },
        {
          $project: {
            id: '$_id', subject: 1, description: 1, status: 1, priority: 1, created_at: 1,
            user_name: '$userDetails.username', user_email: '$userDetails.email'
          }
        }
      ]),
    ]);

    return {
      stats: statsResult[0] || {},
      myTickets: myTicketsResult,
      unassignedTickets: unassignedResult,
    };
  } catch (error) {
    console.error('Database Error in fetchSupportDashboardData:', error);
    throw new Error('Failed to fetch support dashboard data.');
  }
}

/**
 * Fetches all data for Admin Dashboard
 */
export async function fetchAdminDashboardData() {
  await connectToDatabase();
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [pendingApprovals, recentPayments, stats, auditLogs] = await Promise.all([
      // 1. Fetch pending approvals ($lookup ActivationPayment to Profiles)
      Profile.aggregate([
        // Match profiles that need approval, have verified email, and have paid activation
        { $match: { approval_status: 'pending', email_verified_at: { $ne: null }, activation_paid_at: { $ne: null } } },
        { $sort: { created_at: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: 'activationpayments', // Mongoose model pluralizes to collection name
            localField: '_id',
            foreignField: 'user_id',
            as: 'payments',
            pipeline: [{ $sort: { created_at: -1 } }, { $limit: 1 }] // Only need the latest payment
          }
        },
        { $unwind: { path: '$payments', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: '$_id', username: 1, email: 1, phone_number: 1, created_at: 1, email_verified_at: 1, activation_paid_at: 1,
            payment_id: '$payments._id', amount_cents: '$payments.amount_cents', payment_status: '$payments.status',
            provider: '$payments.provider', provider_reference: '$payments.provider_reference', paid_at: '$payments.paid_at',
          }
        }
      ]),
      // 2. Fetch recent payments ($lookup ActivationPayment to Profiles)
      ActivationPayment.aggregate([
        { $match: { created_at: { $gt: sevenDaysAgo } } },
        { $sort: { created_at: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'profiles',
            localField: 'user_id',
            foreignField: '_id',
            as: 'userProfile',
          }
        },
        { $unwind: '$userProfile' },
        {
          $project: {
            id: '$_id', user_id: 1, amount_cents: 1, status: 1, provider: 1, paid_at: 1, created_at: 1,
            username: '$userProfile.username', email: '$userProfile.email'
          }
        }
      ]),
      // 3. Fetch dashboard statistics (Multiple $count/$sum aggregations using $facet)
      // Note: This promise resolves to an array where [0] is the Profile stats and [1] is the Revenue/Tickets stats
      Promise.all([
        Profile.aggregate([
          {
            $facet: {
              pending_approvals: [{ $match: { approval_status: 'pending' } }, { $count: 'count' }],
              new_users_today: [{ $match: { created_at: { $gt: oneDayAgo } } }, { $count: 'count' }],
              new_users_week: [{ $match: { created_at: { $gt: sevenDaysAgo } } }, { $count: 'count' }],
              active_users: [{ $match: { role: 'user', is_approved: true } }, { $count: 'count' }],
              support_team_count: [{ $match: { role: 'support' } }, { $count: 'count' }],
              payments_today: [{ // Check for completed payments today
                $lookup: { from: 'activationpayments', localField: '_id', foreignField: 'user_id', as: 'payments' }
              },
              { $unwind: '$payments' },
              { $match: { 'payments.status': 'completed', 'payments.created_at': { $gt: oneDayAgo } } },
              { $count: 'count' }],
            }
          },
          {
            $project: {
              pending_approvals: { $arrayElemAt: ["$pending_approvals.count", 0] },
              new_users_today: { $arrayElemAt: ["$new_users_today.count", 0] },
              new_users_week: { $arrayElemAt: ["$new_users_week.count", 0] },
              active_users: { $arrayElemAt: ["$active_users.count", 0] },
              support_team_count: { $arrayElemAt: ["$support_team_count.count", 0] },
              payments_today: { $arrayElemAt: ["$payments_today.count", 0] },
            }
          }
        ]),
        // Total Revenue and Open Tickets (separate aggregation for simplicity)
        Promise.all([
          ActivationPayment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total_revenue_cents: { $sum: '$amount_cents' } } }]),
          SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
        ]),
      ]),
      // 4. Fetch recent admin audit logs ($lookup to Profiles)
      AdminAuditLog.aggregate([
        { $sort: { created_at: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'profiles',
            localField: 'actor_id',
            foreignField: '_id',
            as: 'actorDetails',
          }
        },
        { $unwind: '$actorDetails' },
        {
          $project: {
            id: '$_id', action: 1, target_type: 1, target_id: 1, changes: 1, created_at: 1,
            actor_name: '$actorDetails.username', actor_email: '$actorDetails.email'
          }
        }
      ])
    ]);
    
    // Deconstruct the results from the nested stats promise structure
    const statsAggregate = stats[0][0]; 
    const [totalRevenueAgg, openTicketsCount] = stats[1]; 
    
    // Ensure statsAggregate exists before accessing properties
    if (!statsAggregate) {
        throw new Error('Failed to compute core admin dashboard stats.');
    }

    const finalStats = {
      pending_approvals: statsAggregate.pending_approvals || 0,
      new_users_today: statsAggregate.new_users_today || 0,
      new_users_week: statsAggregate.new_users_week || 0,
      payments_today: statsAggregate.payments_today || 0,
      total_revenue_cents: totalRevenueAgg[0]?.total_revenue_cents || 0,
      open_tickets: openTicketsCount,
      active_users: statsAggregate.active_users || 0,
      support_team_count: statsAggregate.support_team_count || 0,
    };

    return {
      pendingApprovals: pendingApprovals.map(p => ({
        ...p,
        amount: p.amount_cents ? centsToUnits(p.amount_cents) : 0,
      })),
      recentPayments: recentPayments.map(p => ({
        ...p,
        amount: centsToUnits(p.amount_cents),
      })),
      stats: {
        ...finalStats,
        total_revenue: centsToUnits(Number(finalStats.total_revenue_cents)),
      },
      auditLogs,
    };
  } catch (error) {
    console.error('Database Error in fetchAdminDashboardData:', error);
    throw new Error('Failed to fetch admin dashboard data.');
  }
}

/**
 * Approve a user (Admin action)
 */
export async function approveUser(userId: string, adminId: string) {
  await connectToDatabase();
  try {
    const updateResult = await Profile.updateOne(
      { _id: userId },
      {
        approval_status: 'approved',
        is_approved: true,
        approval_by: adminId,
        approval_at: new Date(),
        updated_at: new Date(),
      }
    );

    if (updateResult.modifiedCount === 0) {
      console.warn(`Attempted to approve user ${userId} but no document was modified.`);
    }

    // Log the action (MongoDB transactions aren't strictly required for two simple operations)
    await AdminAuditLog.create({
      actor_id: adminId,
      action: 'approve_user',
      target_type: 'profile',
      target_id: userId,
      changes: { status: 'approved' },
    });

    return { success: true };
  } catch (error) {
    console.error('Database Error in approveUser:', error);
    throw new Error('Failed to approve user.');
  }
}

/**
 * Reject a user (Admin action)
 */
export async function rejectUser(userId: string, adminId: string, reason: string) {
  await connectToDatabase();
  try {
    const updateResult = await Profile.updateOne(
      { _id: userId },
      {
        approval_status: 'rejected',
        approval_by: adminId,
        approval_at: new Date(),
        approval_notes: reason,
        updated_at: new Date(),
      }
    );

    if (updateResult.modifiedCount === 0) {
      console.warn(`Attempted to reject user ${userId} but no document was modified.`);
    }

    // Log the action
    await AdminAuditLog.create({
      actor_id: adminId,
      action: 'reject_user',
      target_type: 'profile',
      target_id: userId,
      changes: { status: 'rejected', reason: reason },
    });

    return { success: true };
  } catch (error) {
    console.error('Database Error in rejectUser:', error);
    throw new Error('Failed to reject user.');
  }
}

// ===============================================
// SPIN-RELATED DATA FUNCTIONS
// ===============================================

/**
 * Get user's available spins directly from profile
 */
export async function getUserAvailableSpins(userId: string): Promise<number> {
  await connectToDatabase();
  try {
    const profile = await Profile.findById(userId).select('available_spins').lean();
    return profile?.available_spins || 0;
  } catch (error) {
    console.error('Database Error in getUserAvailableSpins:', error);
    throw new Error('Failed to fetch user spins.');
  }
}

/**
 * Update user's available spins
 */
export async function updateUserSpins(userId: string, newSpinCount: number): Promise<boolean> {
  await connectToDatabase();
  try {
    const result = await Profile.updateOne(
      { _id: userId },
      { 
        available_spins: newSpinCount,
        updated_at: new Date()
      }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Database Error in updateUserSpins:', error);
    throw new Error('Failed to update user spins.');
  }
}
