// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, Transaction, Withdrawal } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];

    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59.999Z');

    // Get all transactions (not just completed - we need to see the full picture)
    const allTransactions = await Transaction.find({
      created_at: { $gte: start, $lte: end }
    }).populate('user_id', 'username email').lean();

    // For balance sheet, we need ALL TIME data
    const allTimeTransactions = await Transaction.find({
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
    
    const completedInPeriod = allTransactions.filter(t => t.status === 'completed');
    
    // REVENUE (Money coming INTO the company)
    // 1. Activation fees - Full KES 1,000 per activation
    const activationFeeRevenue = completedInPeriod
      .filter(t => t.type === 'ACTIVATION_FEE')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // 2. Any other company revenue streams
    const otherRevenue = completedInPeriod
      .filter(t => t.type === 'COMPANY_REVENUE')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const totalRevenue = activationFeeRevenue + otherRevenue;
    
    // EXPENSES (Money going OUT from the company)
    // 1. Referral bonuses paid (KES 700 per referral)
    const referralExpense = completedInPeriod
      .filter(t => t.type === 'REFERRAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // 2. User earnings - all payments to users for their work
    const bonusExpense = completedInPeriod
      .filter(t => t.type === 'BONUS')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const taskPaymentExpense = completedInPeriod
      .filter(t => t.type === 'TASK_PAYMENT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const surveyExpense = completedInPeriod
      .filter(t => t.type === 'SURVEY')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const spinWinExpense = completedInPeriod
      .filter(t => t.type === 'SPIN_WIN')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // 3. Withdrawals - cash paid out to users
    const withdrawalExpense = completedInPeriod
      .filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const totalExpenses = referralExpense + bonusExpense + taskPaymentExpense + 
                          surveyExpense + spinWinExpense + withdrawalExpense;
    
    const netIncome = totalRevenue - totalExpenses;
    
    // ============================================================
    // BALANCE SHEET (Point in time: As of End Date)
    // ============================================================
    
    // Calculate cumulative totals from all time
    const allCompleted = allTimeTransactions.filter(t => t.status === 'completed');
    
    // ASSETS (What the company HAS)
    // 1. Cash from deposits (money users put into the system)
    const totalDeposits = allCompleted
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // 2. Less: Cash paid out as withdrawals
    const totalWithdrawals = allCompleted
      .filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // 3. Add: Revenue collected (activation fees)
    const allTimeRevenue = allCompleted
      .filter(t => ['ACTIVATION_FEE', 'COMPANY_REVENUE'].includes(t.type))
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // Cash on hand = Deposits + Revenue - Withdrawals - User Earnings Paid
    const userEarningsPaid = allCompleted
      .filter(t => ['BONUS', 'TASK_PAYMENT', 'SURVEY', 'SPIN_WIN', 'REFERRAL'].includes(t.type))
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const cashAssets = totalDeposits + allTimeRevenue - totalWithdrawals - userEarningsPaid;
    
    // Total Assets
    const totalAssets = Math.max(0, cashAssets);
    
    // LIABILITIES (What the company OWES)
    // 1. Current user wallet balances
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
    
    // Operating Activities (day-to-day business)
    // Cash IN: Activation fees
    // Cash OUT: Referral bonuses, task payments, bonuses, surveys, spin wins
    const operatingCashIn = activationFeeRevenue + otherRevenue;
    const operatingCashOut = referralExpense + bonusExpense + taskPaymentExpense + 
                             surveyExpense + spinWinExpense;
    const operatingCashFlow = operatingCashIn - operatingCashOut;
    
    // Financing Activities (user deposits and withdrawals)
    const depositsInPeriod = completedInPeriod
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const withdrawalsInPeriod = withdrawalExpense;
    const financingCashFlow = depositsInPeriod - withdrawalsInPeriod;
    
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
      deposits: depositsInPeriod, // Capital contributions
      withdrawals: withdrawalsInPeriod, // Distributions
      endingEquity: totalEquity,
      period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    };
    
    // ============================================================
    // ACCOUNTS RECEIVABLE AGING (Pending Withdrawals)
    // ============================================================
    
    const accountsReceivable = pendingWithdrawals.map((withdrawal: any) => {
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
        customer: withdrawal.user_id?.username || 'Unknown User',
        invoice: `WDL-${withdrawal._id.toString().slice(-8).toUpperCase()}`,
        amount: withdrawal.amount_cents / 100,
        dueDate: dueDate.toISOString(),
        status,
        daysOverdue: Math.max(0, daysOverdue)
      };
    });
    
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
          // Revenue breakdown
          activationFees: activationFeeRevenue,
          companyRevenue: otherRevenue,
          // Expense breakdown
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
          cash: cashAssets,
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
        totalDeposits: totalDeposits,
        totalWithdrawals: totalWithdrawals,
        averageBalance: activeUsers > 0 ? userWalletBalances / activeUsers : 0,
        depositRate: totalUsers > 0 ? (totalDeposits / totalUsers) : 0
      },
      periodMetrics: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        transactionCount: completedInPeriod.length,
        totalDepositsPeriod: depositsInPeriod,
        totalWithdrawalsPeriod: withdrawalsInPeriod
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
