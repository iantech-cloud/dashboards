import { NextRequest, NextResponse } from 'next/server';
// --- NextAuth v5/Auth.js change: Import the 'auth' utility directly ---
import { auth } from '@/auth'; // Assuming '@/auth' exports the Auth.js instance
// --- Removed: import { getServerSession } from 'next-auth';
// --- Removed: import { authOptions } from '@/auth';
import { connectToDatabase, Profile, Transaction, Withdrawal } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    // --- NextAuth v5/Auth.js change: Use auth() to get the session ---
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await Profile.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];

    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59.999Z');

    // Get user's transactions in the date range
    const periodTransactions = await Transaction.find({
      user_id: user._id,
      created_at: { $gte: start, $lte: end }
    }).sort({ created_at: -1 }).lean();

    // Get ALL time transactions for balance sheet
    const allTimeTransactions = await Transaction.find({
      user_id: user._id,
      status: 'completed'
    }).lean();

    const completedInPeriod = periodTransactions.filter(t => t.status === 'completed');

    // ============================================================
    // USER INCOME STATEMENT (Period-based)
    // ============================================================
    
    // INCOME (Money earned by user)
    const bonusIncome = completedInPeriod
      .filter(t => t.type === 'BONUS')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const taskPaymentIncome = completedInPeriod
      .filter(t => t.type === 'TASK_PAYMENT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const referralIncome = completedInPeriod
      .filter(t => t.type === 'REFERRAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const surveyIncome = completedInPeriod
      .filter(t => t.type === 'SURVEY')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const spinWinIncome = completedInPeriod
      .filter(t => t.type === 'SPIN_WIN')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const totalEarnings = bonusIncome + taskPaymentIncome + referralIncome + 
                          surveyIncome + spinWinIncome;
    
    // EXPENSES (Money spent by user)
    const activationFeeExpense = completedInPeriod
      .filter(t => t.type === 'ACTIVATION_FEE')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const totalExpenses = activationFeeExpense;
    
    // Net Income = Earnings - Expenses
    const netIncome = totalEarnings - totalExpenses;
    
    // ============================================================
    // USER BALANCE SHEET (Point in time)
    // ============================================================
    
    // ASSETS (What user has)
    const currentBalance = user.balance_cents / 100;
    
    // Get deposits made (money put into system)
    const totalDeposits = allTimeTransactions
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // LIABILITIES (What user owes) - None in this system
    const totalLiabilities = 0;
    
    // NET WORTH = Assets - Liabilities
    const netWorth = currentBalance - totalLiabilities;
    
    // ============================================================
    // USER CASH FLOW STATEMENT (Period-based)
    // ============================================================
    
    // Operating Activities (earnings from platform activities)
    const operatingCashFlow = totalEarnings - activationFeeExpense;
    
    // Financing Activities (deposits and withdrawals)
    const depositsInPeriod = completedInPeriod
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const withdrawalsInPeriod = completedInPeriod
      .filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    const financingCashFlow = depositsInPeriod - withdrawalsInPeriod;
    
    // Investing Activities (none)
    const investingCashFlow = 0;
    
    const netCashChange = operatingCashFlow + financingCashFlow + investingCashFlow;
    
    // ============================================================
    // USER EQUITY STATEMENT (Period-based)
    // ============================================================
    
    const totalWithdrawals = allTimeTransactions
      .filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);
    
    // Beginning balance = Current balance - Period net income - Period deposits + Period withdrawals
    const beginningBalance = currentBalance - netIncome - depositsInPeriod + withdrawalsInPeriod;
    
    // ============================================================
    // PENDING PAYMENTS (User's Accounts Receivable)
    // ============================================================
    
    const pendingWithdrawals = await Withdrawal.find({
      user_id: user._id,
      status: 'pending'
    }).lean();

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
        description: `Withdrawal to ${withdrawal.mpesa_number}`,
        reference: `WDL-${withdrawal._id.toString().slice(-8).toUpperCase()}`,
        amount: withdrawal.amount_cents / 100,
        dueDate: dueDate.toISOString(),
        status,
        daysOverdue: Math.max(0, daysOverdue)
      };
    });
    
    // ============================================================
    // FINAL USER REPORT STRUCTURE
    // ============================================================
    
    const reports = {
      incomeStatement: {
        totalEarnings: totalEarnings,
        totalFees: totalExpenses,
        netIncome: netIncome,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        breakdown: {
          bonuses: bonusIncome,
          taskPayments: taskPaymentIncome,
          referralEarnings: referralIncome,
          surveyEarnings: surveyIncome,
          spinWins: spinWinIncome,
          activationFees: activationFeeExpense
        }
      },
      balanceSheet: {
        assets: currentBalance,
        liabilities: totalLiabilities,
        netWorth: netWorth,
        date: new Date().toLocaleDateString(),
        breakdown: {
          availableBalance: currentBalance,
          pendingWithdrawals: pendingWithdrawals.reduce((sum, w) => sum + (w.amount_cents / 100), 0),
          totalDeposits: totalDeposits,
          totalWithdrawn: totalWithdrawals
        }
      },
      cashFlow: {
        operating: operatingCashFlow,
        investing: investingCashFlow,
        financing: financingCashFlow,
        netChange: netCashChange,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        breakdown: {
          cashIn: totalEarnings + depositsInPeriod,
          cashOut: activationFeeExpense + withdrawalsInPeriod,
          netCashFlow: netCashChange
        }
      },
      equityStatement: {
        beginningBalance: Math.max(0, beginningBalance),
        netIncome: netIncome,
        deposits: depositsInPeriod,
        withdrawals: withdrawalsInPeriod,
        endingBalance: currentBalance,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      },
      accountsReceivable: accountsReceivable,
      userSummary: {
        currentBalance: currentBalance,
        totalEarnings: totalEarnings,
        totalDeposits: totalDeposits,
        totalWithdrawals: totalWithdrawals,
        transactionCount: periodTransactions.length,
        pendingWithdrawalsCount: pendingWithdrawals.length,
        successRate: periodTransactions.length > 0 ? 
          (completedInPeriod.length / periodTransactions.length * 100) : 0
      },
      recentTransactions: completedInPeriod.slice(0, 10).map(txn => ({
        id: txn._id.toString(),
        type: txn.type,
        amount: txn.amount_cents / 100,
        description: txn.description,
        date: txn.created_at,
        status: txn.status
      })),
      periodMetrics: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        transactionCount: completedInPeriod.length,
        totalDeposits: depositsInPeriod,
        totalWithdrawals: withdrawalsInPeriod,
        totalEarnings: totalEarnings
      }
    };

    return NextResponse.json({
      success: true,
      data: reports,
      message: 'User financial reports generated successfully'
    });

  } catch (error) {
    console.error('User reports API error:', error);
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

