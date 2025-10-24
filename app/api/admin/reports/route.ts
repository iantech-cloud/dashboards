// app/api/admin/reports/route.ts
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

    // Verify user is admin
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

    // Create date objects for query
    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59.999Z');

    console.log('Fetching reports for period:', startDate, 'to', endDate);

    // Get all completed transactions in the date range
    const transactions = await Transaction.find({
      status: 'completed',
      created_at: {
        $gte: start,
        $lte: end
      }
    }).populate('user_id', 'username email').lean();

    console.log(`Found ${transactions.length} completed transactions`);

    // Get all users for balance calculations
    const totalUsers = await Profile.countDocuments();
    const activeUsers = await Profile.countDocuments({ 
      is_active: true, 
      status: 'active',
      approval_status: 'approved'
    });

    // Calculate financial metrics
    const revenue = transactions
      .filter(t => ['ACTIVATION_FEE', 'COMPANY_REVENUE'].includes(t.type))
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);

    // Deposits are liabilities until used
    const deposits = transactions
      .filter(t => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);

    const expenses = transactions
      .filter(t => ['WITHDRAWAL', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'].includes(t.type))
      .reduce((sum, t) => sum + (t.amount_cents / 100), 0);

    const netIncome = revenue - expenses;

    // Calculate actual balances from database
    const totalUserBalances = await Profile.aggregate([
      { 
        $match: { 
          is_active: true,
          status: 'active',
          approval_status: 'approved'
        } 
      },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: '$balance_cents' }
        }
      }
    ]);

    const totalBalance = totalUserBalances.length > 0 ? totalUserBalances[0].totalBalance / 100 : 0;

    // Calculate total deposits (cash in system) - all time
    const totalDepositsResult = await Transaction.aggregate([
      {
        $match: {
          type: 'DEPOSIT',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount_cents' }
        }
      }
    ]);

    const totalDepositsAllTime = totalDepositsResult.length > 0 ? totalDepositsResult[0].total / 100 : 0;

    // Calculate total withdrawals - all time
    const totalWithdrawalsResult = await Transaction.aggregate([
      {
        $match: {
          type: 'WITHDRAWAL',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount_cents' }
        }
      }
    ]);

    const totalWithdrawalsAllTime = totalWithdrawalsResult.length > 0 ? totalWithdrawalsResult[0].total / 100 : 0;

    // Calculate company equity (deposits - user balances - withdrawals)
    const companyEquity = totalDepositsAllTime - totalBalance - totalWithdrawalsAllTime;

    // Real balance sheet calculations
    const assets = totalDepositsAllTime; // Cash from deposits
    const liabilities = totalBalance + totalWithdrawalsAllTime; // What we owe users (their balances + paid withdrawals)
    const equity = companyEquity; // Company's actual equity

    // Cash flow calculations for the period
    const operatingCashFlow = netIncome; // Simplified - revenue minus expenses
    const investingCashFlow = 0; // No investments in current model
    const financingCashFlow = deposits - expenses; // Deposits and expenses for the period
    const netCashChange = operatingCashFlow + investingCashFlow + financingCashFlow;

    // Accounts Receivable - pending withdrawals
    const pendingWithdrawals = await Withdrawal.find({
      status: 'pending'
    }).populate('user_id', 'username email').lean();

    const accountsReceivable = pendingWithdrawals.map((withdrawal: any) => {
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
        customer: withdrawal.user_id?.username || 'Unknown User',
        invoice: `WDL-${withdrawal._id.toString().slice(-8).toUpperCase()}`,
        amount: withdrawal.amount_cents / 100,
        dueDate: dueDate.toISOString(),
        status,
        daysOverdue: Math.max(0, daysOverdue)
      };
    });

    // Generate comprehensive reports
    const reports = {
      incomeStatement: {
        revenue,
        expenses,
        netIncome,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        breakdown: {
          activationFees: transactions
            .filter(t => t.type === 'ACTIVATION_FEE')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          companyRevenue: transactions
            .filter(t => t.type === 'COMPANY_REVENUE')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          withdrawals: transactions
            .filter(t => t.type === 'WITHDRAWAL')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          bonuses: transactions
            .filter(t => t.type === 'BONUS')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          taskPayments: transactions
            .filter(t => t.type === 'TASK_PAYMENT')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          referralBonuses: transactions
            .filter(t => t.type === 'REFERRAL')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          surveyPayments: transactions
            .filter(t => t.type === 'SURVEY')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0),
          spinWins: transactions
            .filter(t => t.type === 'SPIN_WIN')
            .reduce((sum, t) => sum + (t.amount_cents / 100), 0)
        }
      },
      balanceSheet: {
        assets,
        liabilities,
        equity,
        date: new Date().toLocaleDateString(),
        breakdown: {
          cash: assets,
          userBalances: totalBalance,
          pendingWithdrawals: pendingWithdrawals.reduce((sum, w) => sum + (w.amount_cents / 100), 0),
          companyEquity
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
      equityStatement: {
        beginningEquity: Math.max(0, companyEquity - netIncome), // Don't go negative
        netIncome,
        withdrawals: expenses,
        endingEquity: Math.max(0, companyEquity), // Don't show negative equity
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      },
      accountsReceivable,
      userMetrics: {
        totalUsers,
        activeUsers,
        totalDeposits: totalDepositsAllTime,
        totalWithdrawals: totalWithdrawalsAllTime,
        averageBalance: activeUsers > 0 ? totalBalance / activeUsers : 0,
        depositRate: activeUsers > 0 ? (deposits / activeUsers) : 0
      },
      periodMetrics: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        transactionCount: transactions.length,
        totalDepositsPeriod: deposits,
        totalWithdrawalsPeriod: transactions
          .filter(t => t.type === 'WITHDRAWAL')
          .reduce((sum, t) => sum + (t.amount_cents / 100), 0)
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
