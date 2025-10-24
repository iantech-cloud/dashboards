// app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { connectToDatabase, Profile, Transaction, Withdrawal } from '@/app/lib/models';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get current user
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

    // Create date objects for query
    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59.999Z');

    console.log(`Fetching user reports for ${user.email} from ${startDate} to ${endDate}`);

    // Get user's transactions in the date range
    const transactions = await Transaction.find({
      user_id: user._id,
      status: 'completed',
      created_at: {
        $gte: start,
        $lte: end
      }
    }).sort({ created_at: -1 }).lean();

    console.log(`Found ${transactions.length} transactions for user`);

    // Calculate user financial metrics
    const totalEarnings = transactions
      .filter(t => ['BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'].includes(t.type))
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);

    const totalDeposits = transactions
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);

    const totalWithdrawals = transactions
      .filter(t => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);

    const totalFees = transactions
      .filter(t => t.type === 'ACTIVATION_FEE')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);

    const netIncome = totalEarnings - totalFees;

    // Get pending withdrawals
    const pendingWithdrawals = await Withdrawal.find({
      user_id: user._id,
      status: 'pending'
    }).lean();

    // Calculate transaction counts by type
    const transactionCounts = {
      deposits: transactions.filter(t => t.type === 'DEPOSIT').length,
      withdrawals: transactions.filter(t => t.type === 'WITHDRAWAL').length,
      earnings: transactions.filter(t => ['BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'].includes(t.type)).length,
      fees: transactions.filter(t => t.type === 'ACTIVATION_FEE').length
    };

    // Generate user financial reports
    const reports = {
      // Personal Income Statement
      incomeStatement: {
        totalEarnings,
        totalFees,
        netIncome,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        breakdown: {
          bonuses: transactions
            .filter(t => t.type === 'BONUS')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          taskPayments: transactions
            .filter(t => t.type === 'TASK_PAYMENT')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          referralEarnings: transactions
            .filter(t => t.type === 'REFERRAL')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          surveyEarnings: transactions
            .filter(t => t.type === 'SURVEY')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          spinWins: transactions
            .filter(t => t.type === 'SPIN_WIN')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          activationFees: totalFees
        }
      },

      // Personal Balance Sheet
      balanceSheet: {
        assets: user.balance_cents / 100, // Current balance
        liabilities: 0, // Users don't have liabilities in this system
        netWorth: user.balance_cents / 100,
        date: new Date().toLocaleDateString(),
        breakdown: {
          availableBalance: user.balance_cents / 100,
          pendingWithdrawals: pendingWithdrawals.reduce((sum, w) => sum + (w.amount_cents / 100), 0),
          totalDeposits: totalDeposits,
          totalWithdrawn: totalWithdrawals
        }
      },

      // Personal Cash Flow Statement
      cashFlow: {
        operating: totalEarnings, // Money from activities
        investing: 0, // Not applicable for users
        financing: totalDeposits - totalWithdrawals, // Deposits and withdrawals
        netChange: (totalEarnings + totalDeposits) - (totalWithdrawals + totalFees),
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        breakdown: {
          cashIn: totalEarnings + totalDeposits,
          cashOut: totalWithdrawals + totalFees,
          netCashFlow: (totalEarnings + totalDeposits) - (totalWithdrawals + totalFees)
        }
      },

      // Personal Equity Statement
      equityStatement: {
        beginningBalance: Math.max(0, (user.balance_cents / 100) - netIncome - totalDeposits + totalWithdrawals),
        netIncome,
        deposits: totalDeposits,
        withdrawals: totalWithdrawals,
        endingBalance: user.balance_cents / 100,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      },

      // Personal Accounts Receivable (Pending Withdrawals)
      accountsReceivable: pendingWithdrawals.map((withdrawal: any) => {
        const dueDate = new Date(withdrawal.created_at);
        dueDate.setDate(dueDate.getDate() + 7); // Assume 7 days processing time
        
        const now = new Date();
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'current' | '30_days' | '60_days' | '90_days' | 'over_90_days' = 'current';
        
        if (daysOverdue <= 0) {
          status = 'current';
        } else if (daysOverdue <= 30) {
          status = '30_days';
        } else if (daysOverdue <= 60) {
          status = '60_days';
        } else if (daysOverdue <= 90) {
          status = '90_days';
        } else {
          status = 'over_90_days';
        }

        return {
          description: `Withdrawal to ${withdrawal.mpesa_number}`,
          reference: `WDL-${withdrawal._id.toString().slice(-8).toUpperCase()}`,
          amount: withdrawal.amount_cents / 100,
          dueDate: dueDate.toISOString(),
          status,
          daysOverdue: Math.max(0, daysOverdue)
        };
      }),

      // User Summary
      userSummary: {
        currentBalance: user.balance_cents / 100,
        totalEarnings,
        totalDeposits,
        totalWithdrawals,
        transactionCount: transactions.length,
        pendingWithdrawalsCount: pendingWithdrawals.length,
        successRate: transactions.length > 0 ? 
          (transactions.filter(t => t.status === 'completed').length / transactions.length * 100) : 0
      },

      // Recent Transactions (last 10)
      recentTransactions: transactions.slice(0, 10).map(txn => ({
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
        transactionCount: transactions.length,
        totalDeposits,
        totalWithdrawals,
        totalEarnings
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
