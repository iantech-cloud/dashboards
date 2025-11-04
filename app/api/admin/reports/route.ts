import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase, Profile, Transaction, Withdrawal, Company } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await Profile.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    let company = await Company.findOne({ email: 'company@hustlehubafrica.com' });
    if (!company) {
      company = await Company.create({
        name: 'HustleHub Africa Ltd',
        email: 'company@hustlehubafrica.com',
        phone_number: '+254700000000',
        wallet_balance_cents: 0,
        total_revenue_cents: 0,
        total_expenses_cents: 0,
        is_active: true
      });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];

    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59.999Z');

    // ============================================================
    // SEPARATE COMPANY AND USER TRANSACTIONS
    // ============================================================

    // Get COMPANY transactions (target_type: 'company')
    const companyTransactionsPeriod = await Transaction.find({
      target_type: 'company',
      target_id: company._id.toString(),
      created_at: { $gte: start, $lte: end },
      status: 'completed'
    }).lean();

    const allTimeCompanyTransactions = await Transaction.find({
      target_type: 'company',
      target_id: company._id.toString(),
      status: 'completed'
    }).lean();

    // Get USER transactions (payments TO users - these are company expenses)
    const userTransactionsPeriod = await Transaction.find({
      target_type: 'user',
      created_at: { $gte: start, $lte: end },
      status: 'completed',
      type: { $in: ['REFERRAL', 'BONUS', 'TASK_PAYMENT', 'SURVEY', 'SPIN_WIN'] }
    }).lean();

    const allTimeUserPayments = await Transaction.find({
      target_type: 'user',
      status: 'completed',
      type: { $in: ['REFERRAL', 'BONUS', 'TASK_PAYMENT', 'SURVEY', 'SPIN_WIN'] }
    }).lean();

    // Get withdrawal transactions
    const withdrawalsPeriod = await Transaction.find({
      target_type: 'user',
      type: 'WITHDRAWAL',
      created_at: { $gte: start, $lte: end },
      status: 'completed'
    }).lean();

    const allTimeWithdrawals = await Transaction.find({
      target_type: 'user',
      type: 'WITHDRAWAL',
      status: 'completed'
    }).lean();

    const totalUsers = await Profile.countDocuments();
    const activeUsers = await Profile.countDocuments({ 
      is_active: true, 
      status: 'active',
      approval_status: 'approved'
    });

    // ============================================================
    // INCOME STATEMENT (Period-based: Start to End Date)
    // ============================================================
    
    // REVENUE (Money coming INTO the company)
    const companyRevenue = companyTransactionsPeriod
      .filter(t => ['COMPANY_REVENUE', 'ACTIVATION_FEE'].includes(t.type))
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const unclaimedReferralRevenue = companyTransactionsPeriod
      .filter(t => t.type === 'UNCLAIMED_REFERRAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const totalRevenue = companyRevenue + unclaimedReferralRevenue;
    
    // EXPENSES (Money going OUT from the company)
    // 1. Referral bonuses paid
    const referralExpense = userTransactionsPeriod
      .filter(t => t.type === 'REFERRAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // 2. User earnings - all payments to users for their work
    const bonusExpense = userTransactionsPeriod
      .filter(t => t.type === 'BONUS')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const taskPaymentExpense = userTransactionsPeriod
      .filter(t => t.type === 'TASK_PAYMENT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const surveyExpense = userTransactionsPeriod
      .filter(t => t.type === 'SURVEY')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const spinWinExpense = userTransactionsPeriod
      .filter(t => t.type === 'SPIN_WIN')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // 3. Withdrawals - cash paid out to users
    const withdrawalExpense = withdrawalsPeriod
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const totalExpenses = referralExpense + bonusExpense + taskPaymentExpense + 
                          surveyExpense + spinWinExpense + withdrawalExpense;
    
    const netIncome = totalRevenue - totalExpenses;
    
    // ============================================================
    // BALANCE SHEET (Point in time: As of End Date)
    // ============================================================
    
    // ASSETS (What the company HAS)
    // 1. Company wallet balance
    const companyWalletBalance = company.wallet_balance_cents / 100;
    
    // 2. User deposits in system (Liability, but tracked for balancing)
    const totalDeposits = await Transaction.find({
      target_type: 'user',
      type: 'DEPOSIT',
      status: 'completed'
    }).lean();
    const totalDepositsAmount = totalDeposits.reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // Total Assets = Company wallet (Company's cash)
    const totalAssets = companyWalletBalance; 
    
    // LIABILITIES (What the company OWES)
    // 1. Current user wallet balances (money we owe to users)
    const userBalancesResult = await Profile.aggregate([
      { $match: { is_active: true, status: 'active', approval_status: 'approved' } },
      { $group: { _id: null, totalBalance: { $sum: '$balance_cents' } } }
    ]);
    const userWalletBalances = userBalancesResult.length > 0 ? userBalancesResult[0].totalBalance / 100 : 0;
    
    // 2. Pending withdrawals (obligations to pay)
    const pendingWithdrawals = await Withdrawal.find({ status: 'pending' }).lean();
    const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, w) => sum + (w.amount_cents / 100), 0);
    
    const totalLiabilities = userWalletBalances + pendingWithdrawalAmount;
    
    // EQUITY (What belongs to the company)
    // Assets - Liabilities = Equity
    const totalEquity = totalAssets - totalLiabilities;
    
    // ============================================================
    // CASH FLOW STATEMENT (Period-based)
    // ============================================================
    
    // Operating Activities (core business operations)
    // Cash IN: Company revenue from activations
    const operatingCashIn = totalRevenue;
    
    // Cash OUT: Payments to users (referrals, bonuses, tasks, surveys, spins)
    const operatingCashOut = referralExpense + bonusExpense + taskPaymentExpense + 
                             surveyExpense + spinWinExpense;
    const operatingCashFlow = operatingCashIn - operatingCashOut;
    
    // Financing Activities (user deposits and withdrawals)
    const depositsInPeriod = await Transaction.find({
      target_type: 'user',
      type: 'DEPOSIT',
      created_at: { $gte: start, $lte: end },
      status: 'completed'
    }).lean();
    const depositsInPeriodAmount = depositsInPeriod.reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const financingCashFlow = depositsInPeriodAmount - withdrawalExpense;
    
    // Investing Activities (none in current system)
    const investingCashFlow = 0;
    
    const netCashChange = operatingCashFlow + financingCashFlow + investingCashFlow;
    
    // ============================================================
    // EQUITY STATEMENT (Period-based)
    // ============================================================
    
    // Calculate beginning equity (total equity minus period net income)
    const beginningEquity = totalEquity - netIncome;
    
    const equityStatement = {
      beginningEquity: Math.max(0, beginningEquity),
      netIncome: netIncome,
      deposits: depositsInPeriodAmount, 
      withdrawals: withdrawalExpense,
      endingEquity: totalEquity,
      period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    };
    
    // ============================================================
    // ACCOUNTS RECEIVABLE AGING (Pending Withdrawals)
    // ============================================================
    
    const accountsReceivable = await Promise.all(
      pendingWithdrawals.map(async (withdrawal: any) => {
        const userProfile = await Profile.findById(withdrawal.user_id).lean();
        const dueDate = new Date(withdrawal.created_at);
        dueDate.setDate(dueDate.getDate() + 7);
        
        const now = new Date();
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'current' | '30_days' | '60_days' | '90_days' | 'over_90_days';
        if (daysOverdue <= 0) status = 'current';
        else if (daysOverdue <= 30) status = '30_days';
        else if (daysOverdue <= 60) status = '60_days';
        else if (daysOverdue <= 90) status = '90_days';
        else status = 'over_90_days';

        return {
          customer: userProfile?.username || 'Unknown User',
          invoice: `WDL-${withdrawal._id.toString().slice(-8).toUpperCase()}`,
          amount: withdrawal.amount_cents / 100,
          dueDate: dueDate.toISOString(),
          status,
          daysOverdue: Math.max(0, daysOverdue)
        };
      })
    );
    
    // ============================================================
    // FINAL REPORT STRUCTURE
    // ============================================================
    
    const reports = {
      incomeStatement: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        netIncome: netIncome,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        breakdown: {
          activationFees: companyRevenue,
          companyRevenue: companyRevenue,
          unclaimedReferrals: unclaimedReferralRevenue,
          referralBonuses: referralExpense,
          bonuses: bonusExpense,
          taskPayments: taskPaymentExpense,
          surveyPayments: surveyExpense,
          spinWins: spinWinExpense,
          withdrawals: withdrawalExpense
        }
      },
      balanceSheet: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        date: new Date().toLocaleDateString(),
        breakdown: {
          cash: companyWalletBalance,
          userDeposits: totalDepositsAmount,
          userBalances: userWalletBalances,
          pendingWithdrawals: pendingWithdrawalAmount,
          companyEquity: totalEquity
        }
      },
      cashFlow: {
        operating: operatingCashFlow,
        investing: investingCashFlow,
        financing: financingCashFlow,
        netChange: netCashChange,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        breakdown: {
          cashFromOperations: operatingCashFlow,
          cashFromInvesting: investingCashFlow,
          cashFromFinancing: financingCashFlow
        }
      },
      equityStatement,
      accountsReceivable,
      userMetrics: {
        totalUsers,
        activeUsers,
        totalDeposits: totalDepositsAmount,
        totalWithdrawals: allTimeWithdrawals.reduce((sum, t) => sum + (t.amount_cents / 100), 0),
        averageBalance: activeUsers > 0 ? userWalletBalances / activeUsers : 0,
        depositRate: totalUsers > 0 ? (totalDepositsAmount / totalUsers) : 0
      },
      periodMetrics: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        transactionCount: companyTransactionsPeriod.length + userTransactionsPeriod.length,
        totalDepositsPeriod: depositsInPeriodAmount,
        totalWithdrawalsPeriod: withdrawalExpense
      },
      companyMetrics: {
        companyWalletBalance: companyWalletBalance,
        totalCompanyRevenue: company.total_revenue_cents / 100,
        totalCompanyExpenses: company.total_expenses_cents / 100,
        activationRevenue: company.activation_revenue_cents / 100,
        unclaimedReferralRevenue: company.unclaimed_referral_revenue_cents / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: reports,
      message: 'Reports generated successfully'
    });

  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

