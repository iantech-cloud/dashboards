// app/admin/company/page.tsx - FIXED COMPANY DASHBOARD
'use client';

import { useState, useEffect } from 'react';
import { 
  getCompanyProfile, 
  getCompanyTransactions, 
  getRevenueBreakdown,
  updateCompanyInfo,
  exportCompanyReport,
  syncCompanyFinancials  // NEW: Import sync function
} from '@/app/actions/company';
import { 
  Building2, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Edit,
  Check,
  X,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  CreditCard,
  FileText,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Database  // NEW: For sync button
} from 'lucide-react';

interface CompanyData {
  _id: string;
  name: string;
  email: string;
  phone_number: string;
  wallet_balance: number;
  total_revenue: number;
  total_expenses: number;
  activation_revenue: number;
  unclaimed_referral_revenue: number;
  content_payment_revenue: number;
  spin_cost_revenue: number;  // NEW
  other_revenue: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CompanyStats {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  current_balance: number;
  transactions_count: number;
  activation_count: number;
  referral_bonus_count: number;
  today_revenue: number;
  this_week_revenue: number;
  this_month_revenue: number;
}

interface Transaction {
  _id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  source: string;
  balance_before: number;
  balance_after: number;
  created_at: Date;
  metadata?: any;
}

interface RevenueCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export default function CompanyDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);  // NEW: Syncing state
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<{
    categories: RevenueCategory[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);  // NEW: Sync feedback
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'breakdown'>('overview');
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    phone_number: ''
  });
  const [saving, setSaving] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const [profileRes, transactionsRes, breakdownRes] = await Promise.all([
        getCompanyProfile(),
        getCompanyTransactions({ page, limit: 50, type: typeFilter !== 'all' ? typeFilter : undefined }),
        getRevenueBreakdown()
      ]);
      
      if (profileRes.success && profileRes.data) {
        setCompany(profileRes.data.company);
        setStats(profileRes.data.stats);
        setEditData({
          name: profileRes.data.company.name,
          phone_number: profileRes.data.company.phone_number
        });
      } else {
        setError(profileRes.error || 'Failed to load company data');
      }
      
      if (transactionsRes.success && transactionsRes.data) {
        setTransactions(transactionsRes.data.transactions);
        setTotalPages(transactionsRes.data.pagination.pages);
      }
      
      if (breakdownRes.success && breakdownRes.data) {
        setRevenueBreakdown(breakdownRes.data);
      }
      
    } catch (err) {
      setError('An error occurred while loading data');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // NEW: Sync company financials
  const handleSyncFinancials = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      
      const result = await syncCompanyFinancials();
      
      if (result.success && result.data) {
        setSyncMessage(`✅ Synced! Revenue: KES ${result.data.synced_revenue.toLocaleString()}, Balance: KES ${result.data.synced_balance.toLocaleString()}`);
        // Reload data to show updated values
        await loadData();
      } else {
        setError(result.error || 'Failed to sync financials');
      }
    } catch (err) {
      setError('An error occurred during sync');
      console.error(err);
    } finally {
      setSyncing(false);
      // Clear sync message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, typeFilter]);

  // Handle company info update
  const handleUpdateCompany = async () => {
    try {
      setSaving(true);
      const result = await updateCompanyInfo(editData);
      if (result.success) {
        setIsEditing(false);
        loadData();
      } else {
        alert(result.error || 'Failed to update');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const result = await exportCompanyReport('json');
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `company-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading company dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !company || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Error</h2>
          <p className="text-gray-600 text-center mb-6">{error || 'Failed to load data'}</p>
          <button
            onClick={() => loadData()}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Company Dashboard</h1>
              <p className="text-gray-600 mt-1">Financial overview and management</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* NEW: Sync Button */}
            <button
              onClick={handleSyncFinancials}
              disabled={syncing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-2 shadow-md"
              title="Sync financials from transactions"
            >
              <Database className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
            <button
              onClick={() => loadData()}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2 shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* NEW: Sync Message */}
        {syncMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm font-medium">{syncMessage}</p>
          </div>
        )}

        {/* NEW: Balance Status Alert */}
        {stats.current_balance === 0 && stats.total_revenue > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-semibold">Balance Sync Required</p>
              <p className="text-yellow-700 text-sm mt-1">
                Company has KES {stats.total_revenue.toLocaleString()} revenue but balance shows KES 0. 
                Click the <strong>Sync</strong> button to recalculate from transactions.
              </p>
            </div>
          </div>
        )}
        
        {/* Company Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Company Information
            </h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateCompany}
                  disabled={saving}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: company.name,
                      phone_number: company.phone_number
                    });
                  }}
                  disabled={saving}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600 font-medium">Company Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              ) : (
                <p className="font-semibold text-gray-800 mt-1">{company.name}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm text-gray-600 font-medium">Email</label>
              <p className="font-semibold text-gray-800 mt-1">{company.email}</p>
            </div>
            
            <div>
              <label className="text-sm text-gray-600 font-medium">Phone Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.phone_number}
                  onChange={(e) => setEditData({ ...editData, phone_number: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              ) : (
                <p className="font-semibold text-gray-800 mt-1">{company.phone_number}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Current Balance"
          value={`KES ${stats.current_balance.toLocaleString()}`}
          icon={<Wallet className="w-6 h-6" />}
          color="blue"
          trend={stats.current_balance >= 0 ? 'up' : 'down'}
        />
        
        <StatCard
          title="Total Revenue"
          value={`KES ${stats.total_revenue.toLocaleString()}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
          trend="up"
          subtitle="All time"
        />
        
        <StatCard
          title="Net Profit"
          value={`KES ${stats.net_profit.toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6" />}
          color={stats.net_profit >= 0 ? 'green' : 'red'}
          trend={stats.net_profit >= 0 ? 'up' : 'down'}
          subtitle="All time"
        />
        
        <StatCard
          title="Total Transactions"
          value={stats.transactions_count.toLocaleString()}
          icon={<Activity className="w-6 h-6" />}
          color="purple"
          subtitle="Company transactions"
        />
      </div>

      {/* Revenue Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <RevenueCard
          title="Today's Revenue"
          amount={stats.today_revenue}
          icon={<Calendar className="w-5 h-5" />}
          color="blue"
        />
        
        <RevenueCard
          title="This Week's Revenue"
          amount={stats.this_week_revenue}
          icon={<BarChart3 className="w-5 h-5" />}
          color="purple"
        />
        
        <RevenueCard
          title="This Month's Revenue"
          amount={stats.this_month_revenue}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'overview' as const, label: 'Overview', icon: PieChartIcon },
          { id: 'transactions' as const, label: 'Transactions', icon: FileText },
          { id: 'breakdown' as const, label: 'Revenue Breakdown', icon: BarChart3 }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content - Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue Sources Grid */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-green-600" />
              Revenue Sources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border-2 border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Activation Fees</p>
                <p className="text-2xl font-bold text-green-700">
                  KES {company.activation_revenue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">{stats.activation_count} activations</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-5 border-2 border-orange-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Unclaimed Referrals</p>
                <p className="text-2xl font-bold text-orange-700">
                  KES {company.unclaimed_referral_revenue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">{stats.referral_bonus_count} referrals</p>
              </div>
              
              {/* NEW: Show Spin Cost Revenue */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-2 border-purple-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Spin Costs</p>
                <p className="text-2xl font-bold text-purple-700">
                  KES {(company.spin_cost_revenue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">User spin purchases</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-2 border-blue-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Content Payments</p>
                <p className="text-2xl font-bold text-blue-700">
                  KES {company.content_payment_revenue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">User submissions</p>
              </div>
            </div>
          </div>

          {/* Financial Health */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Financial Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Revenue vs Expenses</p>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-sm font-medium text-green-600">Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      KES {stats.total_revenue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600">Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      KES {stats.total_expenses.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Profit Margin</p>
                <p className="text-4xl font-bold text-green-600">
                  {stats.total_revenue > 0 
                    ? ((stats.net_profit / stats.total_revenue) * 100).toFixed(1)
                    : '0'}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Cash Flow Status</p>
                <p className={`text-4xl font-bold ${stats.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.net_profit >= 0 ? 'Positive' : 'Negative'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content - Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b bg-gray-50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Filter by type:</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="COMPANY_REVENUE">Company Revenue</option>
                <option value="ACTIVATION_FEE">Activation Fees</option>
                <option value="SPIN_COST">Spin Costs</option>
                <option value="UNCLAIMED_REFERRAL">Unclaimed Referrals</option>
              </select>
            </div>
            <p className="text-sm text-gray-600">
              Showing <strong>{transactions.length}</strong> transactions
            </p>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Balance After
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No transactions found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {stats.total_revenue > 0 && transactions.length === 0 
                          ? 'Click "Sync" button above to load transactions'
                          : 'Try adjusting your filters'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-blue-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(transaction.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getTypeColor(transaction.type)}`}>
                          {transaction.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {transaction.amount >= 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-sm font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount >= 0 ? '+' : ''}KES {Math.abs(transaction.amount).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                        KES {transaction.balance_after.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600 font-medium">
                Page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
              </span>
              
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab Content - Revenue Breakdown */}
      {activeTab === 'breakdown' && revenueBreakdown && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <PieChartIcon className="w-6 h-6 text-purple-600" />
            Revenue Breakdown
          </h3>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
            <p className="text-4xl font-bold text-gray-900">
              KES {revenueBreakdown.total.toLocaleString()}
            </p>
          </div>

          <div className="space-y-4">
            {revenueBreakdown.categories.map((category, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-semibold text-gray-900">{category.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${category.percentage}%`,
                        backgroundColor: category.color 
                      }}
                    />
                  </div>
                  <p className="text-lg font-bold text-gray-900 w-40 text-right">
                    KES {category.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Last updated: {new Date().toLocaleString()}</p>
        <p className="mt-1">Company ID: {company._id}</p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  trend?: 'up' | 'down';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, trend, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    red: 'bg-red-100 text-red-600 border-red-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200'
  };

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100 hover:shadow-xl transition">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
        <div className={`p-3 rounded-xl border-2 ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {trend && (
          <div className={`${trendColors[trend]}`}>
            {trend === 'up' ? (
              <TrendingUp className="w-6 h-6" />
            ) : (
              <TrendingDown className="w-6 h-6" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface RevenueCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'green';
}

function RevenueCard({ title, amount, icon, color }: RevenueCardProps) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-600',
    green: 'from-green-50 to-green-100 border-green-200 text-green-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl shadow-lg p-6 border-2`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-gray-900">
        KES {amount.toLocaleString()}
      </p>
      <div className="mt-3 pt-3 border-t border-gray-300">
        <p className="text-xs text-gray-600">
          {amount >= 0 ? 'Revenue earned' : 'No revenue yet'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTypeColor(type: string): string {
  const colors: { [key: string]: string } = {
    'COMPANY_REVENUE': 'bg-green-100 text-green-800 border border-green-300',
    'ACTIVATION_FEE': 'bg-blue-100 text-blue-800 border border-blue-300',
    'ACCOUNT_ACTIVATION': 'bg-blue-100 text-blue-800 border border-blue-300',
    'UNCLAIMED_REFERRAL': 'bg-orange-100 text-orange-800 border border-orange-300',
    'SPIN_COST': 'bg-purple-100 text-purple-800 border border-purple-300',
    'DEFAULT': 'bg-gray-100 text-gray-800 border border-gray-300'
  };
  return colors[type] || colors['DEFAULT'];
}

function getStatusColor(status: string): string {
  const colors: { [key: string]: string } = {
    'completed': 'bg-green-100 text-green-800 border border-green-300',
    'pending': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    'failed': 'bg-red-100 text-red-800 border border-red-300',
    'cancelled': 'bg-gray-100 text-gray-800 border border-gray-300'
  };
  return colors[status.toLowerCase()] || colors['pending'];
}
