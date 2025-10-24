// app/ui/dashboard/userReports.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  PieChart,
  Calendar,
  Users,
  CreditCard,
  Wallet,
  PiggyBank,
  Target,
  FileText,
  RefreshCw,
  AlertCircle,
  Eye
} from 'lucide-react';

interface UserFinancialReport {
  incomeStatement: {
    totalEarnings: number;
    totalFees: number;
    netIncome: number;
    period: string;
    breakdown: {
      bonuses: number;
      taskPayments: number;
      referralEarnings: number;
      surveyEarnings: number;
      spinWins: number;
      activationFees: number;
    };
  };
  balanceSheet: {
    assets: number;
    liabilities: number;
    netWorth: number;
    date: string;
    breakdown: {
      availableBalance: number;
      pendingWithdrawals: number;
      totalDeposits: number;
      totalWithdrawn: number;
    };
  };
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
    netChange: number;
    period: string;
    breakdown: {
      cashIn: number;
      cashOut: number;
      netCashFlow: number;
    };
  };
  equityStatement: {
    beginningBalance: number;
    netIncome: number;
    deposits: number;
    withdrawals: number;
    endingBalance: number;
    period: string;
  };
  accountsReceivable: Array<{
    description: string;
    reference: string;
    amount: number;
    dueDate: string;
    status: 'current' | '30_days' | '60_days' | '90_days' | 'over_90_days';
    daysOverdue: number;
  }>;
  userSummary: {
    currentBalance: number;
    totalEarnings: number;
    totalDeposits: number;
    totalWithdrawals: number;
    transactionCount: number;
    pendingWithdrawalsCount: number;
    successRate: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    date: string;
    status: string;
  }>;
}

interface UserReportsProps {
  className?: string;
}

export default function UserReports({ className = '' }: UserReportsProps) {
  const [reports, setReports] = useState<UserFinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [activeReport, setActiveReport] = useState<'overview' | 'income' | 'balance' | 'cashflow' | 'equity' | 'receivable'>('overview');

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/reports?start=${dateRange.start}&end=${dateRange.end}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReports(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching user reports:', error);
      setError(error instanceof Error ? error.message : 'Failed to load financial reports');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (reportType: string) => {
    if (!reports) return;

    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'income':
        csvContent = `Personal Income Statement,${reports.incomeStatement.period}\nTotal Earnings,${reports.incomeStatement.totalEarnings}\nTotal Fees,${reports.incomeStatement.totalFees}\nNet Income,${reports.incomeStatement.netIncome}`;
        filename = `my_income_statement_${dateRange.start}_to_${dateRange.end}.csv`;
        break;
      case 'balance':
        csvContent = `Personal Balance Sheet,${reports.balanceSheet.date}\nAssets,${reports.balanceSheet.assets}\nLiabilities,${reports.balanceSheet.liabilities}\nNet Worth,${reports.balanceSheet.netWorth}`;
        filename = `my_balance_sheet_${dateRange.start}.csv`;
        break;
      case 'full':
        const headers = ['Report Type', 'Metric', 'Value', 'Period'];
        const rows = [
          ['Income Statement', 'Total Earnings', reports.incomeStatement.totalEarnings, reports.incomeStatement.period],
          ['Income Statement', 'Total Fees', reports.incomeStatement.totalFees, reports.incomeStatement.period],
          ['Income Statement', 'Net Income', reports.incomeStatement.netIncome, reports.incomeStatement.period],
          ['Balance Sheet', 'Assets', reports.balanceSheet.assets, reports.balanceSheet.date],
          ['Balance Sheet', 'Net Worth', reports.balanceSheet.netWorth, reports.balanceSheet.date],
          ['Cash Flow', 'Net Cash Flow', reports.cashFlow.netChange, reports.cashFlow.period],
        ];
        csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `my_financial_report_${dateRange.start}_to_${dateRange.end}.csv`;
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getAgingColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800 border border-green-200';
      case '30_days': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case '60_days': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case '90_days': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'over_90_days': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getTransactionColor = (type: string) => {
    const creditTypes = ['DEPOSIT', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'];
    return creditTypes.includes(type) ? 'text-green-600' : 'text-red-600';
  };

  const getTransactionIcon = (type: string) => {
    const creditTypes = ['DEPOSIT', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'];
    return creditTypes.includes(type) ? '+' : '-';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading your financial reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Error Loading Reports</h3>
          </div>
          <p className="text-red-700 mb-3">{error}</p>
          <button
            onClick={fetchReports}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Financial Reports</h2>
            <p className="text-gray-600 mt-1">Track your earnings, expenses, and financial growth</p>
          </div>
          <button
            onClick={() => exportReport('full')}
            className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Export All
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Report Period:</span>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={fetchReports}
            className="bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 flex items-center gap-1 text-sm ml-auto"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {reports && (
        <div className="p-6">
          {/* Report Navigation */}
          <div className="flex overflow-x-auto gap-1 mb-6 pb-2 border-b">
            {[
              { id: 'overview' as const, label: 'Overview', icon: Eye },
              { id: 'income' as const, label: 'Income', icon: TrendingUp },
              { id: 'balance' as const, label: 'Balance', icon: Wallet },
              { id: 'cashflow' as const, label: 'Cash Flow', icon: DollarSign },
              { id: 'equity' as const, label: 'Equity', icon: BarChart3 },
              { id: 'receivable' as const, label: 'Pending', icon: FileText }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveReport(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  activeReport === id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Overview Report */}
          {activeReport === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Current Balance</p>
                      <p className="text-2xl font-bold text-green-700">
                        KES {reports.userSummary.currentBalance.toFixed(2)}
                      </p>
                    </div>
                    <Wallet className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-blue-700">
                        KES {reports.userSummary.totalEarnings.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600">Net Income</p>
                      <p className="text-2xl font-bold text-purple-700">
                        KES {reports.incomeStatement.netIncome.toFixed(2)}
                      </p>
                    </div>
                    <PiggyBank className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600">Transactions</p>
                      <p className="text-2xl font-bold text-orange-700">
                        {reports.userSummary.transactionCount}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Quick Reports */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expenses */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Income vs Fees</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-green-600">Total Earnings</span>
                        <span className="font-medium">KES {reports.incomeStatement.totalEarnings.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-red-600">Total Fees</span>
                        <span className="font-medium">KES {reports.incomeStatement.totalFees.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (reports.incomeStatement.totalFees / reports.incomeStatement.totalEarnings) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {reports.recentTransactions.map((txn) => (
                      <div key={txn.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium text-sm">{txn.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(txn.date).toLocaleDateString()} • {txn.type.replace('_', ' ')}
                          </p>
                        </div>
                        <span className={`font-bold ${getTransactionColor(txn.type)}`}>
                          {getTransactionIcon(txn.type)}KES {txn.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Income Statement */}
          {activeReport === 'income' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    KES {reports.incomeStatement.totalEarnings.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Earnings</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    KES {reports.incomeStatement.totalFees.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Fees</p>
                </div>
                <div className={`text-center p-4 rounded-lg border ${
                  reports.incomeStatement.netIncome >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
                }`}>
                  <DollarSign className={`h-8 w-8 mx-auto mb-2 ${
                    reports.incomeStatement.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                  <p className={`text-2xl font-bold ${
                    reports.incomeStatement.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    KES {reports.incomeStatement.netIncome.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Net Income</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Earnings Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(reports.incomeStatement.breakdown).map(([key, value]) => (
                    <div key={key} className="text-center p-3 bg-gray-50 rounded border">
                      <p className="text-sm font-medium text-gray-800 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/([A-Z][a-z])/g, ' $1').trim()}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        KES {value.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-gray-500">
                Period: {reports.incomeStatement.period}
              </p>
            </div>
          )}

          {/* Balance Sheet */}
          {activeReport === 'balance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <Wallet className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    KES {reports.balanceSheet.assets.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Assets</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <CreditCard className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    KES {reports.balanceSheet.liabilities.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Liabilities</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    KES {reports.balanceSheet.netWorth.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Net Worth</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Balance Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(reports.balanceSheet.breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                      <span className="font-medium text-gray-800 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="font-bold text-gray-900">
                        KES {value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-gray-500">
                As of: {reports.balanceSheet.date}
              </p>
            </div>
          )}

          {/* Cash Flow Statement */}
          {activeReport === 'cashflow' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-lg font-semibold text-green-600">
                    KES {reports.cashFlow.operating.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Operating</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-lg font-semibold text-blue-600">
                    KES {reports.cashFlow.investing.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Investing</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-lg font-semibold text-purple-600">
                    KES {reports.cashFlow.financing.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Financing</p>
                </div>
                <div className={`text-center p-4 rounded-lg border ${
                  reports.cashFlow.netChange >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-lg font-semibold ${
                    reports.cashFlow.netChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    KES {reports.cashFlow.netChange.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Net Change</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Cash Flow Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(reports.cashFlow.breakdown).map(([key, value]) => (
                    <div key={key} className="text-center p-3 bg-gray-50 rounded border">
                      <p className="text-sm font-medium text-gray-800 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        KES {value.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-center text-gray-500">
                Period: {reports.cashFlow.period}
              </p>
            </div>
          )}

          {/* Accounts Receivable */}
          {activeReport === 'receivable' && (
            <div className="space-y-6">
              {reports.accountsReceivable.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No pending withdrawals found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reports.accountsReceivable.map((ar, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{ar.description}</td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">{ar.reference}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">
                            KES {ar.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(ar.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgingColor(ar.status)}`}>
                              {ar.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {ar.daysOverdue > 0 ? `${ar.daysOverdue} days` : 'On time'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
