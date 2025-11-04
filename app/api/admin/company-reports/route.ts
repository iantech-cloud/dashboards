// app/api/admin/company-reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  connectToDatabase, 
  Profile, 
  Transaction, 
  Withdrawal,
  Company 
} from '@/app/lib/models';

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

    const adminUser = await Profile.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];

    const start = new Date(startDate);
    const end = new Date(endDate + 'T23:59:59.999Z');

    // Get or create company record
    let company = await Company.findOne({});
    if (!company) {
      company = await Company.create({
        name: 'HustleHub Africa Ltd',
        email: 'company@hustlehubafrica.com',
        wallet_balance_cents: 0,
        total_revenue_cents: 0,
        total_expenses_cents: 0
      });
    }

    // ============================================================
    // GET COMPANY TRANSACTIONS IN THE PERIOD
    // ============================================================
    
    const periodCompanyRevenueTxns = await Transaction.find({
      target_type: 'company',
      status: 'completed',
      created_at: { $gte: start, $lte: end }
    }).lean();

    const periodCompanyExpenseTxns = await Transaction.find({
      target_type: 'user',
      status: 'completed',
      type: { 
        $in: [
          'BONUS', 
          'TASK_PAYMENT', 
          'SPIN_WIN', 
          'SPIN_PRIZE',
          'REFERRAL', 
          'SURVEY',
          'WITHDRAWAL'
        ] 
      },
      created_at: { $gte: start, $lte: end }
    }).lean();

    // ============================================================
    // GET ALL-TIME COMPANY TRANSACTIONS FOR BALANCE SHEET
    // ============================================================
    
    const allTimeCompanyRevenueTxns = await Transaction.find({
      target_type: 'company',
      status: 'completed'
    }).lean();

    const allTimeCompanyExpenseTxns = await Transaction.find({
      target_type: 'user',
      status: 'completed',
      type: { 
        $in: [
          'BONUS', 
          'TASK_PAYMENT', 
          'SPIN_WIN', 
          'SPIN_PRIZE',
          'REFERRAL', 
          'SURVEY',
          'WITHDRAWAL'
        ] 
      }
    }).lean();

    // ============================================================
    // COMPANY INCOME STATEMENT (Period-based)
    // ============================================================
    
    // REVENUE (Money coming into company)
    let activationRevenue = 0;
    let unclaimedReferralRevenue = 0;
    let spinCostRevenue = 0;
    let contentPaymentRevenue = 0;
    let otherRevenue = 0;

    for (const txn of periodCompanyRevenueTxns) {
      const amount = txn.amount_cents / 100;
      
      switch (txn.type) {
        case 'ACTIVATION_FEE':
        case 'ACCOUNT_ACTIVATION':
        case 'COMPANY_REVENUE':
          if (txn.metadata?.source === 'unclaimed_referral') {
            unclaimedReferralRevenue += amount;
          } else if (txn.metadata?.source === 'activation') {
            activationRevenue += amount;
          } else {
            activationRevenue += amount;
          }
          break;
        
        case 'SPIN_COST':
          spinCostRevenue += amount;
          break;
        
        default:
          if (txn.description?.toLowerCase().includes('content')) {
            contentPaymentRevenue += amount;
          } else {
            otherRevenue += amount;
          }
      }
    }

    const totalRevenue = activationRevenue + unclaimedReferralRevenue + 
                         spinCostRevenue + contentPaymentRevenue + otherRevenue;

    // EXPENSES (Money going out from company)
    let withdrawalExpense = 0;
    let bonusExpense = 0;
    let referralExpense = 0;
    let spinPrizeExpense = 0;
    let taskPaymentExpense = 0;
    let surveyPaymentExpense = 0;
    let otherExpenses = 0;

    for (const txn of periodCompanyExpenseTxns) {
      const amount = txn.amount_cents / 100;
      
      switch (txn.type) {
        case 'WITHDRAWAL':
          withdrawalExpense += amount;
          break;
        case 'BONUS':
          bonusExpense += amount;
          break;
        case 'REFERRAL':
          referralExpense += amount;
          break;
        case 'SPIN_WIN':
        case 'SPIN_PRIZE':
          spinPrizeExpense += amount;
          break;
        case 'TASK_PAYMENT':
          taskPaymentExpense += amount;
          break;
        case 'SURVEY':
          surveyPaymentExpense += amount;
          break;
        default:
          otherExpenses += amount;
      }
    }

    const totalExpenses = withdrawalExpense + bonusExpense + referralExpense + 
                          spinPrizeExpense + taskPaymentExpense + surveyPaymentExpense + otherExpenses;

    // Net Income = Revenue - Expenses
    const netIncome = totalRevenue - totalExpenses;

    // ============================================================
    // COMPANY BALANCE SHEET (Point in time)
    // ============================================================
    
    // ASSETS (What company has)
    const companyWalletBalance = company.wallet_balance_cents / 100;
    
    // Calculate all-time revenue
    const allTimeRevenue = allTimeCompanyRevenueTxns.reduce(
      (sum, txn) => sum + (txn.amount_cents / 100), 
      0
    );
    
    // Calculate all-time expenses
    const allTimeExpenses = allTimeCompanyExpenseTxns.reduce(
      (sum, txn) => sum + (txn.amount_cents / 100), 
      0
    );
    
    // LIABILITIES (What company owes)
    const allUsers = await Profile.find({}).select('balance_cents').lean();
    const totalUserBalances = allUsers.reduce(
      (sum, user) => sum + (user.balance_cents / 100), 
      0
    );
    
    const pendingWithdrawals = await Withdrawal.find({ 
      status: 'pending' 
    }).lean();
    
    const pendingWithdrawalsAmount = pendingWithdrawals.reduce(
      (sum, w) => sum + (w.amount_cents / 100), 
      0
    );
    
    const totalLiabilities = totalUserBalances + pendingWithdrawalsAmount;
    
    // EQUITY = Assets - Liabilities
    const equity = companyWalletBalance - totalLiabilities;
    
    // ============================================================
    // COMPANY CASH FLOW STATEMENT (Period-based)
    // ============================================================
    
    // Operating Activities (revenue minus payouts)
    const operatingCashInflow = totalRevenue;
    const operatingCashOutflow = totalExpenses;
    const netOperatingCashFlow = operatingCashInflow - operatingCashOutflow;
    
    // Financing Activities (none typically)
    const financingCashFlow = 0;
    
    // Investing Activities (none typically)
    const investingCashFlow = 0;
    
    const netCashChange = netOperatingCashFlow + financingCashFlow + investingCashFlow;
    
    // ============================================================
    // ACCOUNTS PAYABLE (Company's Outstanding Obligations)
    // ============================================================
    
    const accountsPayable = pendingWithdrawals.map((withdrawal: any) => {
      const dueDate = new Date(withdrawal.created_at);
      dueDate.setDate(dueDate.getDate() + 7); // 7-day payment window
      
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'current' | '30_days' | '60_days' | '90_days' | 'over_90_days';
      if (daysOverdue <= 0) status = 'current';
      else if (daysOverdue <= 30) status = '30_days';
      else if (daysOverdue <= 60) status = '60_days';
      else if (daysOverdue <= 90) status = '90_days';
      else status = 'over_90_days';

      return {
        userId: withdrawal.user_id?.toString(),
        description: `Pending withdrawal to ${withdrawal.mpesa_number}`,
        reference: `WDL-${withdrawal._id.toString().slice(-8).toUpperCase()}`,
        amount: withdrawal.amount_cents / 100,
        requestDate: withdrawal.created_at,
        dueDate: dueDate.toISOString(),
        status,
        daysOverdue: Math.max(0, daysOverdue)
      };
    });
    
    // ============================================================
    // METRICS AND ANALYSIS
    // ============================================================
    
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue * 100) : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue * 100) : 0;
    
    // Calculate beginning balance
    const beginningBalance = companyWalletBalance - netCashChange;
    
    // ============================================================
    // FINAL COMPANY REPORT STRUCTURE
    // ============================================================
    
    const reports = {
      incomeStatement: {
        totalRevenue: totalRevenue,
        totalExpenses: totalExpenses,
        netIncome: netIncome,
        profitMargin: profitMargin,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        revenueBreakdown: {
          activationFees: activationRevenue,
          unclaimedReferrals: unclaimedReferralRevenue,
          spinCosts: spinCostRevenue,
          contentPayments: contentPaymentRevenue,
          other: otherRevenue
        },
        expenseBreakdown: {
          withdrawals: withdrawalExpense,
          bonuses: bonusExpense,
          referralCommissions: referralExpense,
          spinPrizes: spinPrizeExpense,
          taskPayments: taskPaymentExpense,
          surveyPayments: surveyPaymentExpense,
          other: otherExpenses
        }
      },
      balanceSheet: {
        assets: companyWalletBalance,
        liabilities: totalLiabilities,
        equity: equity,
        date: new Date().toLocaleDateString(),
        breakdown: {
          // Assets
          companyWallet: companyWalletBalance,
          
          // Liabilities
          userBalances: totalUserBalances,
          pendingWithdrawals: pendingWithdrawalsAmount,
          
          // Historical
          allTimeRevenue: allTimeRevenue,
          allTimeExpenses: allTimeExpenses
        }
      },
      cashFlow: {
        operatingActivities: netOperatingCashFlow,
        investingActivities: investingCashFlow,
        financingActivities: financingCashFlow,
        netCashChange: netCashChange,
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        breakdown: {
          cashInflow: operatingCashInflow,
          cashOutflow: operatingCashOutflow,
          beginningBalance: beginningBalance,
          endingBalance: companyWalletBalance
        }
      },
      accountsPayable: accountsPayable,
      companySummary: {
        companyName: company.name,
        companyWalletBalance: companyWalletBalance,
        totalRevenue: totalRevenue,
        totalExpenses: totalExpenses,
        netIncome: netIncome,
        profitMargin: profitMargin,
        expenseRatio: expenseRatio,
        totalLiabilities: totalLiabilities,
        equity: equity,
        pendingObligations: {
          count: pendingWithdrawals.length,
          amount: pendingWithdrawalsAmount
        },
        userCount: allUsers.length,
        activeUserCount: allUsers.filter(u => u.balance_cents > 0).length
      },
      recentTransactions: {
        revenue: periodCompanyRevenueTxns.slice(0, 10).map(txn => ({
          id: txn._id.toString(),
          type: txn.type,
          amount: txn.amount_cents / 100,
          description: txn.description,
          date: txn.created_at,
          status: txn.status,
          userId: txn.user_id?.toString()
        })),
        expenses: periodCompanyExpenseTxns.slice(0, 10).map(txn => ({
          id: txn._id.toString(),
          type: txn.type,
          amount: txn.amount_cents / 100,
          description: txn.description,
          date: txn.created_at,
          status: txn.status,
          userId: txn.user_id?.toString()
        }))
      },
      periodMetrics: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        revenueTransactionCount: periodCompanyRevenueTxns.length,
        expenseTransactionCount: periodCompanyExpenseTxns.length,
        netTransactionCount: periodCompanyRevenueTxns.length + periodCompanyExpenseTxns.length
      }
    };

    return NextResponse.json({
      success: true,
      data: reports,
      message: 'Company financial reports generated successfully'
    });

  } catch (error) {
    console.error('Company reports API error:', error);
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
