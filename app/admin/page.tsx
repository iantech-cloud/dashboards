// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getAdminStats, toggleSpinWheel } from '../actions/admin';
import { redirect } from 'next/navigation';
import { 
  Users, 
  UserCheck, 
  ArrowDownUp, 
  TrendingUp, 
  DollarSign,
  Activity,
  AlertCircle,
  TrendingDown,
  Wallet,
  PieChart
} from 'lucide-react';

interface AdminStats {
  // User Metrics
  totalUsers: number;
  activeUsers: number;
  pendingApprovals: number;
  todayRegistrations: number;
  
  // Transaction Metrics
  totalUserTransactions: number;
  totalCompanyTransactions: number;
  
  // Financial Metrics - COMPANY
  companyWalletBalance: number;
  totalCompanyRevenue: number;
  totalCompanyExpenses: number;
  netProfit: number;
  
  // Financial Metrics - LIABILITIES
  totalUserBalances: number;
  pendingWithdrawalsAmount: number;
  pendingWithdrawalsCount: number;
  
  // Revenue Breakdown
  revenueBreakdown: {
    activationFees: number;
    unclaimedReferrals: number;
    spinCosts: number;
    contentPayments: number;
    otherRevenue: number;
  };
  
  // Expense Breakdown
  expenseBreakdown: {
    userPayouts: number;
    bonuses: number;
    referralCommissions: number;
    spinPrizes: number;
    taskPayments: number;
    surveyPayments: number;
    otherExpenses: number;
  };
  
  // Other Metrics
  totalReferrals: number;
  spinWheelActive: boolean;
  spinWheelMode: 'manual' | 'scheduled';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spinWheelLoading, setSpinWheelLoading] = useState(false);
  const [spinStatus, setSpinStatus] = useState<{ active: boolean; mode: string }>({ 
    active: false, 
    mode: 'scheduled' 
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsResult = await getAdminStats();
      
      if (!statsResult.success) {
        if (statsResult.message.includes('Unauthorized') || statsResult.message.includes('Admin access required')) {
          redirect('/auth/login');
        }
        setError(statsResult.message);
        return;
      }

      if (statsResult.data) {
        setStats(statsResult.data);
        setSpinStatus({
          active: statsResult.data.spinWheelActive,
          mode: statsResult.data.spinWheelMode
        });
      }
    } catch (err) {
      setError('Failed to load admin statistics');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSpinWheel = async (activate: boolean) => {
    try {
      setSpinWheelLoading(true);
      const result = await toggleSpinWheel(activate);
      
      if (result.success) {
        setSpinStatus({
          active: activate,
          mode: activate ? 'manual' : 'scheduled'
        });
        await loadStats();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to update spin wheel');
      console.error('Error toggling spin wheel:', err);
    } finally {
      setSpinWheelLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="text-red-500 mr-2" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
        <button 
          onClick={loadStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const profitMargin = stats.totalCompanyRevenue > 0 
    ? ((stats.netProfit / stats.totalCompanyRevenue) * 100).toFixed(1)
    : '0.0';

  const isProfitable = stats.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of platform operations and finances</p>
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh Data
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Company Wallet Balance */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Wallet size={32} />
            <span className="text-blue-100 text-sm font-medium">BALANCE</span>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatCurrency(stats.companyWalletBalance)}</p>
            <p className="text-blue-100 text-sm mt-1">Company Wallet</p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={32} />
            <span className="text-green-100 text-sm font-medium">REVENUE</span>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatCurrency(stats.totalCompanyRevenue)}</p>
            <p className="text-green-100 text-sm mt-1">Total Income</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <TrendingDown size={32} />
            <span className="text-orange-100 text-sm font-medium">EXPENSES</span>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatCurrency(stats.totalCompanyExpenses)}</p>
            <p className="text-orange-100 text-sm mt-1">Total Payouts</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`bg-gradient-to-br ${isProfitable ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} rounded-lg p-6 text-white shadow-lg`}>
          <div className="flex items-center justify-between mb-4">
            <DollarSign size={32} />
            <span className={`${isProfitable ? 'text-emerald-100' : 'text-red-100'} text-sm font-medium`}>
              {isProfitable ? 'PROFIT' : 'LOSS'}
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatCurrency(stats.netProfit)}</p>
            <p className={`${isProfitable ? 'text-emerald-100' : 'text-red-100'} text-sm mt-1`}>
              Margin: {profitMargin}%
            </p>
          </div>
        </div>
      </div>

      {/* Liabilities & Obligations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Company Liabilities</h3>
            <AlertCircle className="text-yellow-500" size={24} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total User Balances</span>
              <span className="font-semibold text-gray-900">{formatCurrency(stats.totalUserBalances)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Pending Withdrawals</span>
              <span className="font-semibold text-orange-600">
                {formatCurrency(stats.pendingWithdrawalsAmount)}
                <span className="text-sm text-gray-500 ml-2">({stats.pendingWithdrawalsCount})</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-2 pt-3 border-t-2">
              <span className="font-semibold text-gray-700">Total Liabilities</span>
              <span className="font-bold text-red-600 text-lg">
                {formatCurrency(stats.totalUserBalances + stats.pendingWithdrawalsAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Health</h3>
            <PieChart className="text-blue-500" size={24} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Wallet Balance</span>
              <span className="font-semibold text-blue-600">{formatCurrency(stats.companyWalletBalance)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total Obligations</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(stats.totalUserBalances + stats.pendingWithdrawalsAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 pt-3 border-t-2">
              <span className="font-semibold text-gray-700">Net Position</span>
              <span className={`font-bold text-lg ${stats.companyWalletBalance - stats.totalUserBalances - stats.pendingWithdrawalsAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.companyWalletBalance - stats.totalUserBalances - stats.pendingWithdrawalsAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="mr-2 text-green-500" size={20} />
            Revenue Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Activation Fees</span>
              <span className="font-semibold">{formatCurrency(stats.revenueBreakdown.activationFees)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Unclaimed Referrals</span>
              <span className="font-semibold">{formatCurrency(stats.revenueBreakdown.unclaimedReferrals)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Spin Costs</span>
              <span className="font-semibold">{formatCurrency(stats.revenueBreakdown.spinCosts)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Content Payments</span>
              <span className="font-semibold">{formatCurrency(stats.revenueBreakdown.contentPayments)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Other Revenue</span>
              <span className="font-semibold">{formatCurrency(stats.revenueBreakdown.otherRevenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 pt-3 border-t-2">
              <span className="font-bold text-gray-800">Total Revenue</span>
              <span className="font-bold text-green-600 text-lg">{formatCurrency(stats.totalCompanyRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingDown className="mr-2 text-orange-500" size={20} />
            Expense Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">User Withdrawals</span>
              <span className="font-semibold">{formatCurrency(stats.expenseBreakdown.userPayouts)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Bonuses</span>
              <span className="font-semibold">{formatCurrency(stats.expenseBreakdown.bonuses)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Referral Commissions</span>
              <span className="font-semibold">{formatCurrency(stats.expenseBreakdown.referralCommissions)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Spin Prizes</span>
              <span className="font-semibold">{formatCurrency(stats.expenseBreakdown.spinPrizes)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Task Payments</span>
              <span className="font-semibold">{formatCurrency(stats.expenseBreakdown.taskPayments)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Survey Payments</span>
              <span className="font-semibold">{formatCurrency(stats.expenseBreakdown.surveyPayments)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Other Expenses</span>
              <span className="font-semibold">{formatCurrency(stats.expenseBreakdown.otherExpenses)}</span>
            </div>
            <div className="flex justify-between items-center py-2 pt-3 border-t-2">
              <span className="font-bold text-gray-800">Total Expenses</span>
              <span className="font-bold text-orange-600 text-lg">{formatCurrency(stats.totalCompanyExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User & Transaction Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
          <p className="text-xs text-gray-500 mt-2">+{stats.todayRegistrations} today</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeUsers.toLocaleString()}</p>
            </div>
            <Activity className="text-green-500" size={32} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : '0'}% of total
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingApprovals.toLocaleString()}</p>
            </div>
            <UserCheck className="text-yellow-500" size={32} />
          </div>
          <a href="/admin/approvals" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
            Review →
          </a>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Referrals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalReferrals.toLocaleString()}</p>
            </div>
            <ArrowDownUp className="text-purple-500" size={32} />
          </div>
          <p className="text-xs text-gray-500 mt-2">Platform growth</p>
        </div>
      </div>

      {/* Spin Wheel Control */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Spin Wheel Control</h3>
            <p className="text-sm text-gray-600 mt-1">
              Current mode: <span className="font-medium">{spinStatus.mode}</span>
            </p>
            <p className="text-sm text-gray-600">
              Status: <span className={`font-medium ${spinStatus.active ? 'text-green-600' : 'text-red-600'}`}>
                {spinStatus.active ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleToggleSpinWheel(true)}
              disabled={spinWheelLoading || spinStatus.active}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                spinStatus.active 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {spinWheelLoading ? 'Processing...' : 'Activate'}
            </button>
            <button
              onClick={() => handleToggleSpinWheel(false)}
              disabled={spinWheelLoading || !spinStatus.active}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                !spinStatus.active 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {spinWheelLoading ? 'Processing...' : 'Deactivate'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a 
            href="/admin/reports" 
            className="bg-white rounded-lg p-4 shadow hover:shadow-md transition text-center"
          >
            <PieChart className="mx-auto mb-2 text-blue-500" size={24} />
            <p className="font-medium text-gray-900">View Full Reports</p>
          </a>
          <a 
            href="/admin/transactions" 
            className="bg-white rounded-lg p-4 shadow hover:shadow-md transition text-center"
          >
            <Activity className="mx-auto mb-2 text-green-500" size={24} />
            <p className="font-medium text-gray-900">Manage Transactions</p>
          </a>
          <a 
            href="/admin/withdrawals" 
            className="bg-white rounded-lg p-4 shadow hover:shadow-md transition text-center"
          >
            <ArrowDownUp className="mx-auto mb-2 text-orange-500" size={24} />
            <p className="font-medium text-gray-900">Process Withdrawals</p>
          </a>
        </div>
      </div>
    </div>
  );
}
