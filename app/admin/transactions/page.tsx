// app/admin/transactions/page.tsx - UPDATED
"use client";

import { useState, useEffect } from 'react';
import { Download, Search, Filter, RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  user_email: string;
  user_username: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'TASK_PAYMENT' | 'SPIN_WIN' | 'REFERRAL' | 'SURVEY' | 'ACTIVATION_FEE' | 'COMPANY_REVENUE' | 'ACCOUNT_ACTIVATION';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  description: string;
  date: string;
  transaction_code: string;
  mpesa_receipt_number?: string;
  phone_number?: string;
}

interface Stats {
  totalTransactions: number;
  totalCredit: number;
  totalDebit: number;
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
    totalCredit: 0,
    totalDebit: 0,
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
      
      // Build query params
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
    const creditTypes = ['DEPOSIT', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'];
    const debitTypes = ['WITHDRAWAL', 'ACTIVATION_FEE', 'COMPANY_REVENUE', 'ACCOUNT_ACTIVATION'];
    
    const completedTxns = txns.filter(t => t.status === 'completed');
    
    const totalCredit = completedTxns
      .filter(t => creditTypes.includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalDebit = completedTxns
      .filter(t => debitTypes.includes(t.type))
      .reduce((sum, t) => sum + t.amount, 0);
    
    setStats({
      totalTransactions: txns.length,
      totalCredit,
      totalDebit,
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

  const getTypeColor = (type: string) => {
    const creditTypes = ['DEPOSIT', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'];
    return creditTypes.includes(type) ? 'text-green-600' : 'text-red-600';
  };

  const getTypeIcon = (type: string) => {
    const creditTypes = ['DEPOSIT', 'BONUS', 'TASK_PAYMENT', 'SPIN_WIN', 'REFERRAL', 'SURVEY'];
    return creditTypes.includes(type) ? '+' : '-';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Transaction Code', 'User', 'Type', 'Amount', 'Status', 'Description', 'M-Pesa Receipt', 'Phone Number'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleString(),
      t.transaction_code || 'N/A',
      `${t.user_username} (${t.user_email})`,
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

  const refreshData = () => {
    fetchTransactions();
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
          <p className="text-gray-600 mt-1">Monitor and manage all platform transactions</p>
        </div>
        <button
          onClick={refreshData}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Credit (Incoming)</p>
              <p className="text-2xl font-bold text-green-600">KES {stats.totalCredit.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Debit (Outgoing)</p>
              <p className="text-2xl font-bold text-red-600">KES {stats.totalDebit.toFixed(2)}</p>
            </div>
            <TrendingDown className="h-10 w-10 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Flow</p>
              <p className={`text-2xl font-bold ${stats.totalCredit - stats.totalDebit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                KES {(stats.totalCredit - stats.totalDebit).toFixed(2)}
              </p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="BONUS">Bonus</option>
            <option value="TASK_PAYMENT">Task Payment</option>
            <option value="ACTIVATION_FEE">Activation Fee</option>
            <option value="REFERRAL">Referral</option>
            <option value="SPIN_WIN">Spin Win</option>
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

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
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
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {txn.transaction_code || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{txn.user_username || 'N/A'}</p>
                        <p className="text-gray-500 text-xs">{txn.user_email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-medium ${getTypeColor(txn.type)}`}>
                        {txn.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-bold ${getTypeColor(txn.type)}`}>
                        {getTypeIcon(txn.type)}
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
    </div>
  );
}
