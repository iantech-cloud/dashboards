// app/admin/transactions/page.tsx - CORRECTED FOR COMPANY MODEL
"use client";

import { useState, useEffect } from 'react';
import { Download, Search, RefreshCw, TrendingUp, TrendingDown, DollarSign, Building2, Users } from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  user_email: string;
  user_username: string;
  amount: number;
  type: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  description: string;
  date: string;
  transaction_code: string;
  mpesa_receipt_number?: string;
  phone_number?: string;
  target_type: 'user' | 'company';
  target_id: string;
  metadata?: any;
}

interface Stats {
  totalTransactions: number;
  userTransactions: number;
  companyTransactions: number;
  
  // User transactions (payments TO users - expenses)
  userPayments: number;
  
  // Company transactions (revenue)
  companyRevenue: number;
  
  // Status counts
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  timeoutCount: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalTransactions: 0,
    userTransactions: 0,
    companyTransactions: 0,
    userPayments: 0,
    companyRevenue: 0,
    pendingCount: 0,
    completedCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    timeoutCount: 0
  });
  
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    targetType: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('limit', '1000');
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`/api/admin/transactions?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.data.transactions);
        calculateStats(data.data.transactions);
      } else {
        console.error('Failed to fetch transactions:', data.message);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (txns: Transaction[]) => {
    const completedTxns = txns.filter(t => t.status === 'completed');
    
    // Separate user and company transactions
    const userTxns = completedTxns.filter(t => t.target_type === 'user');
    const companyTxns = completedTxns.filter(t => t.target_type === 'company');
    
    // User payments (money paid TO users - these are expenses from company perspective)
    const userPaymentTypes = ['REFERRAL', 'BONUS', 'TASK_PAYMENT', 'SURVEY', 'SPIN_WIN'];
    const userPayments = userTxns
      .filter(t => userPaymentTypes.includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Company revenue (money earned BY company)
    const companyRevenueTypes = ['COMPANY_REVENUE', 'ACTIVATION_FEE', 'UNCLAIMED_REFERRAL'];
    const companyRevenue = companyTxns
      .filter(t => companyRevenueTypes.includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);
    
    setStats({
      totalTransactions: txns.length,
      userTransactions: userTxns.length,
      companyTransactions: companyTxns.length,
      userPayments,
      companyRevenue,
      pendingCount: txns.filter(t => t.status === 'pending').length,
      completedCount: txns.filter(t => t.status === 'completed').length,
      failedCount: txns.filter(t => t.status === 'failed').length,
      cancelledCount: txns.filter(t => t.status === 'cancelled').length,
      timeoutCount: txns.filter(t => t.status === 'timeout').length
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];
    
    if (filters.search) {
      filtered = filtered.filter(t => 
        t.user_email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.user_username?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.transaction_code?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.mpesa_receipt_number?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    
    if (filters.targetType !== 'all') {
      filtered = filtered.filter(t => t.target_type === filters.targetType);
    }
    
    if (filters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(filters.dateFrom));
    }
    
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.date) <= endDate);
    }
    
    setFilteredTransactions(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'timeout': return 'bg-orange-100 text-orange-800 border border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getTypeColor = (type: string, targetType: string) => {
    // Company revenue = green (income)
    if (targetType === 'company' && ['COMPANY_REVENUE', 'UNCLAIMED_REFERRAL'].includes(type)) {
      return 'text-green-600';
    }
    // User payments = red (expense from company view)
    if (targetType === 'user' && ['REFERRAL', 'BONUS', 'TASK_PAYMENT', 'SURVEY', 'SPIN_WIN'].includes(type)) {
      return 'text-red-600';
    }
    // User deposits = green (assets increase)
    if (type === 'DEPOSIT') {
      return 'text-green-600';
    }
    // Withdrawals = red (assets decrease)
    if (type === 'WITHDRAWAL') {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const getTypeIcon = (type: string, targetType: string) => {
    if (targetType === 'company' && ['COMPANY_REVENUE', 'UNCLAIMED_REFERRAL'].includes(type)) {
      return '+';
    }
    if (targetType === 'user' && ['REFERRAL', 'BONUS', 'TASK_PAYMENT', 'SURVEY', 'SPIN_WIN'].includes(type)) {
      return '-';
    }
    if (type === 'DEPOSIT') return '+';
    if (type === 'WITHDRAWAL') return '-';
    return '';
  };

  const getTargetBadge = (targetType: string) => {
    if (targetType === 'company') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <Building2 className="w-3 h-3" />
          Company
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
        <Users className="w-3 h-3" />
        User
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = [
      'Date', 'Transaction Code', 'Target Type', 'User', 'Type', 
      'Amount', 'Status', 'Description', 'M-Pesa Receipt', 'Phone Number'
    ];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleString(),
      t.transaction_code || 'N/A',
      t.target_type,
      `${t.user_username || 'N/A'} (${t.user_email || 'N/A'})`,
      t.type,
      t.amount.toFixed(2),
      t.status,
      t.description,
      t.mpesa_receipt_number || 'N/A',
      t.phone_number || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction Management</h1>
          <p className="text-gray-600 mt-1">Monitor all platform transactions (User & Company)</p>
        </div>
        <button
          onClick={fetchTransactions}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards - UPDATED */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Company Revenue</p>
              <p className="text-2xl font-bold text-green-600">KES {stats.companyRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.companyTransactions} transactions</p>
            </div>
            <Building2 className="h-10 w-10 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">User Payments (Expenses)</p>
              <p className="text-2xl font-bold text-red-600">KES {stats.userPayments.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.userTransactions} transactions</p>
            </div>
            <Users className="h-10 w-10 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${stats.companyRevenue - stats.userPayments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                KES {(stats.companyRevenue - stats.userPayments).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Revenue - Expenses</p>
            </div>
            <DollarSign className="h-10 w-10 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Transaction Status Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.completedCount}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{stats.failedCount}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-600">
              {stats.cancelledCount + stats.timeoutCount}
            </p>
            <p className="text-sm text-gray-600">Cancelled/Timeout</p>
          </div>
        </div>
      </div>

      {/* Filters - UPDATED */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="pl-10 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          
          <select
            value={filters.targetType}
            onChange={(e) => setFilters({...filters, targetType: e.target.value})}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Targets</option>
            <option value="company">Company</option>
            <option value="user">User</option>
          </select>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="COMPANY_REVENUE">Company Revenue</option>
            <option value="UNCLAIMED_REFERRAL">Unclaimed Referral</option>
            <option value="REFERRAL">Referral Bonus</option>
            <option value="BONUS">Bonus</option>
            <option value="TASK_PAYMENT">Task Payment</option>
            <option value="SURVEY">Survey</option>
            <option value="SPIN_WIN">Spin Win</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="ACTIVATION_FEE">Activation Fee</option>
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="timeout">Timeout</option>
          </select>
          
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="From Date"
          />
          
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Transactions Table - UPDATED */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No transactions found matching your filters
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(txn.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getTargetBadge(txn.target_type)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {txn.transaction_code || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{txn.user_username || 'System'}</p>
                        <p className="text-gray-500 text-xs">{txn.user_email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-medium ${getTypeColor(txn.type, txn.target_type)}`}>
                        {txn.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-bold ${getTypeColor(txn.type, txn.target_type)}`}>
                        {getTypeIcon(txn.type, txn.target_type)}
                        KES {txn.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}>
                        {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div>
                        {txn.description}
                        {txn.mpesa_receipt_number && (
                          <span className="block text-xs text-blue-600 mt-1">
                            M-Pesa: {txn.mpesa_receipt_number}
                          </span>
                        )}
                        {txn.phone_number && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Phone: {txn.phone_number}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </p>
      </div>
    </div>
  );
}
