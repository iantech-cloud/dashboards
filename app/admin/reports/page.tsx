// app/admin/reports/page.tsx
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
  AlertCircle,
  RefreshCw,
  FileText,
  Activity
} from 'lucide-react';

interface FinancialReport {
  incomeStatement: {
    revenue: number;
    expenses: number;
    netIncome: number;
    period: string;
    breakdown: {
      activationFees: number;
      companyRevenue: number;
      withdrawals: number;
      bonuses: number;
      taskPayments: number;
      referralBonuses: number;
      surveyPayments: number;
      spinWins: number;
    };
  };
  balanceSheet: {
    assets: number;
    liabilities: number;
    equity: number;
    date: string;
    breakdown: {
      cash: number;
      userBalances: number;
      pendingWithdrawals: number;
      companyEquity: number;
    };
  };
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
    netChange: number;
    period: string;
    breakdown: {
      cashFromOperations: number;
      cashFromInvesting: number;
      cashFromFinancing: number;
    };
  };
  equityStatement: {
    beginningEquity: number;
    netIncome: number;
    withdrawals: number;
    endingEquity: number;
    period: string;
  };
  accountsReceivable: Array<{
    customer: string;
    invoice: string;
    amount: number;
    dueDate: string;
    status: 'current' | '30_days' | '60_days' | '90_days' | 'over_90_days';
    daysOverdue: number;
  }>;
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    totalDeposits: number;
    totalWithdrawals: number;
    averageBalance: number;
    depositRate: number;
  };
  periodMetrics: {
    startDate: string;
    endDate: string;
    transactionCount: number;
    totalDepositsPeriod: number;
    totalWithdrawalsPeriod: number;
  };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/reports?start=${dateRange.start}&end=${dateRange.end}`);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      if (data.success) {
        setReports(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
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
        csvContent = `Income Statement,${reports.incomeStatement.period}\nRevenue,${reports.incomeStatement.revenue}\nExpenses,${reports.incomeStatement.expenses}\nNet Income,${reports.incomeStatement.netIncome}`;
        filename = `income_statement_${dateRange.start}_to_${dateRange.end}.csv`;
        break;
      case 'balance':
        csvContent = `Balance Sheet,${reports.balanceSheet.date}\nAssets,${reports.balanceSheet.assets}\nLiabilities,${reports.balanceSheet.liabilities}\nEquity,${reports.balanceSheet.equity}`;
        filename = `balance_sheet_${dateRange.start}.csv`;
        break;
      case 'cashflow':
        csvContent = `Cash Flow Statement,${reports.cashFlow.period}\nOperating Activities,${reports.cashFlow.operating}\nInvesting Activities,${reports.cashFlow.investing}\nFinancing Activities,${reports.cashFlow.financing}\nNet Change,${reports.cashFlow.netChange}`;
        filename = `cash_flow_${dateRange.start}_to_${dateRange.end}.csv`;
        break;
      case 'receivable':
        const headers = ['Customer', 'Invoice', 'Amount', 'Due Date', 'Status', 'Days Overdue'];
        const rows = reports.accountsReceivable.map(ar => 
          [ar.customer, ar.invoice, ar.amount, new Date(ar.dueDate).toLocaleDateString(), ar.status, ar.daysOverdue]
        );
        csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        filename = `accounts_receivable_${dateRange.start}.csv`;
        break;
      case 'full':
        // Export all reports in one file
        const fullHeaders = ['Report Type', 'Metric', 'Value', 'Period'];
        const fullRows = [
          ['Income Statement', 'Revenue', reports.incomeStatement.revenue, reports.incomeStatement.period],
          ['Income Statement', 'Expenses', reports.incomeStatement.expenses, reports.incomeStatement.period],
          ['Income Statement', 'Net Income', reports.incomeStatement.netIncome, reports.incomeStatement.period],
          ['Balance Sheet', 'Assets', reports.balanceSheet.assets, reports.balanceSheet.date],
          ['Balance Sheet', 'Liabilities', reports.balanceSheet.liabilities, reports.balanceSheet.date],
          ['Balance Sheet', 'Equity', reports.balanceSheet.equity, reports.balanceSheet.date],
          ['Cash Flow', 'Operating Activities', reports.cashFlow.operating, reports.cashFlow.period],
          ['Cash Flow', 'Investing Activities', reports.cashFlow.investing, reports.cashFlow.period],
          ['Cash Flow', 'Financing Activities', reports.cashFlow.financing, reports.cashFlow.period],
          ['Cash Flow', 'Net Change', reports.cashFlow.netChange, reports.cashFlow.period],
        ];
        csvContent = [fullHeaders, ...fullRows].map(row => row.join(',')).join('\n');
        filename = `full_financial_report_${dateRange.start}_to_${dateRange.end}.csv`;
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Generating financial reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-red-800">Error Loading Reports</h2>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchReports}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive financial analysis and reporting</p>
        </div>
        <button
          onClick={() => exportReport('full')}
          className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Export All Reports
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={fetchReports}
            className="ml-auto bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {reports && (
        <div className="space-y-6">
          {/* User Metrics Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Platform Overview</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{reports.userMetrics.totalUsers}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Activity className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{reports.userMetrics.activeUsers}</p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">KES {reports.userMetrics.totalDeposits.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Total Deposits</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <TrendingDown className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600">KES {reports.userMetrics.totalWithdrawals.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Total Withdrawals</p>
                </div>
              </div>
            </div>
          </div>

          {/* Income Statement */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Income Statement</h2>
              <button
                onClick={() => exportReport('income')}
                className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    KES {reports.incomeStatement.revenue.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    KES {reports.incomeStatement.expenses.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${
                  reports.incomeStatement.netIncome >= 0 ? 'bg-blue-50' : 'bg-orange-50'
                }`}>
                  <TrendingUp className={`h-8 w-8 mx-auto mb-2 ${
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
              
              {/* Income Statement Breakdown */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Revenue & Expense Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded">
                    <p className="text-sm font-medium text-green-800">Activation Fees</p>
                    <p className="text-lg font-bold">KES {reports.incomeStatement.breakdown.activationFees.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <p className="text-sm font-medium text-red-800">Withdrawals</p>
                    <p className="text-lg font-bold">KES {reports.incomeStatement.breakdown.withdrawals.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <p className="text-sm font-medium text-red-800">Bonuses</p>
                    <p className="text-lg font-bold">KES {reports.incomeStatement.breakdown.bonuses.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <p className="text-sm font-medium text-red-800">Task Payments</p>
                    <p className="text-lg font-bold">KES {reports.incomeStatement.breakdown.taskPayments.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-center text-gray-500 mt-4">
                Period: {reports.incomeStatement.period}
              </p>
            </div>
          </div>

          {/* Balance Sheet */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Balance Sheet</h2>
              <button
                onClick={() => exportReport('balance')}
                className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    KES {reports.balanceSheet.assets.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Assets</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">
                    KES {reports.balanceSheet.liabilities.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Liabilities</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    KES {reports.balanceSheet.equity.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Total Equity</p>
                </div>
              </div>
              
              {/* Balance Sheet Breakdown */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Balance Sheet Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <p className="text-sm font-medium text-blue-800">Cash Assets</p>
                    <p className="text-lg font-bold">KES {reports.balanceSheet.breakdown.cash.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <p className="text-sm font-medium text-orange-800">User Balances</p>
                    <p className="text-lg font-bold">KES {reports.balanceSheet.breakdown.userBalances.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <p className="text-sm font-medium text-purple-800">Pending Withdrawals</p>
                    <p className="text-lg font-bold">KES {reports.balanceSheet.breakdown.pendingWithdrawals.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-center text-gray-500 mt-4">
                As of: {reports.balanceSheet.date}
              </p>
            </div>
          </div>

          {/* Cash Flow Statement */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Cash Flow Statement</h2>
              <button
                onClick={() => exportReport('cashflow')}
                className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-lg font-semibold text-green-600">
                    KES {reports.cashFlow.operating.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Operating</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg font-semibold text-blue-600">
                    KES {reports.cashFlow.investing.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Investing</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-lg font-semibold text-purple-600">
                    KES {reports.cashFlow.financing.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Financing</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${
                  reports.cashFlow.netChange >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p className={`text-lg font-semibold ${
                    reports.cashFlow.netChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    KES {reports.cashFlow.netChange.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Net Change</p>
                </div>
              </div>
              <p className="text-center text-gray-500 mt-4">
                Period: {reports.cashFlow.period}
              </p>
            </div>
          </div>

          {/* Accounts Receivable Aging */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Accounts Receivable Aging Report</h2>
              <button
                onClick={() => exportReport('receivable')}
                className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            <div className="p-6">
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reports.accountsReceivable.map((ar, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{ar.customer}</td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-600">{ar.invoice}</td>
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
          </div>
        </div>
      )}
    </div>
  );
}
