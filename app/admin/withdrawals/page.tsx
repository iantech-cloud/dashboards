// app/admin/withdrawals/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  getWithdrawalsAdmin,
  getWithdrawalStatsAdmin,
  approveWithdrawalAdmin,
  rejectWithdrawalAdmin,
  completeWithdrawalAdmin,
  reverseWithdrawalAdmin,
  bulkApproveWithdrawalsAdmin
} from '../../actions/admin';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Eye,
  Loader2
} from 'lucide-react';

interface Withdrawal {
  _id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
    phone: string;
    balance: number;
  };
  amount: number;
  amountCents: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  mpesaNumber: string;
  transactionCode?: string;
  mpesaReceiptNumber?: string;
  approvedBy?: {
    id: string;
    username: string;
    email: string;
  };
  approvedAt?: string;
  processedAt?: string;
  processingNotes?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  totalAmountCents: number;
  averageAmountCents: number;
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [modalInput, setModalInput] = useState('');

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      
      const filters: any = {
        page: currentPage,
        limit: 20
      };
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }
      if (dateFilter !== 'all') {
        const now = new Date();
        if (dateFilter === 'today') {
          filters.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          filters.startDate = weekAgo.toISOString();
        } else if (dateFilter === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          filters.startDate = monthAgo.toISOString();
        }
      }

      const result = await getWithdrawalsAdmin(filters);
      
      if (result.success && result.data) {
        setWithdrawals(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.pages);
          setTotalCount(result.pagination.total);
        }
      } else {
        toast.error(result.message || 'Failed to fetch withdrawals');
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to fetch withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await getWithdrawalStatsAdmin();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
    fetchStats();
  }, [currentPage, statusFilter, dateFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchWithdrawals();
  };

  const handleApprove = async (withdrawalId: string) => {
    if (processing) return;
    
    setProcessing(withdrawalId);
    try {
      const result = await approveWithdrawalAdmin(withdrawalId);
      if (result.success) {
        toast.success(result.message);
        fetchWithdrawals();
        fetchStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to approve withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !modalInput) return;
    
    if (modalInput.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters');
      return;
    }
    
    setProcessing(selectedWithdrawal._id);
    try {
      const result = await rejectWithdrawalAdmin(selectedWithdrawal._id, modalInput);
      if (result.success) {
        toast.success(result.message);
        setShowRejectModal(false);
        setModalInput('');
        setSelectedWithdrawal(null);
        fetchWithdrawals();
        fetchStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to reject withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const handleComplete = async () => {
    if (!selectedWithdrawal || !modalInput) return;
    
    if (modalInput.trim().length === 0) {
      toast.error('Transaction code is required');
      return;
    }
    
    setProcessing(selectedWithdrawal._id);
    try {
      const result = await completeWithdrawalAdmin(selectedWithdrawal._id, modalInput);
      if (result.success) {
        toast.success(result.message);
        setShowCompleteModal(false);
        setModalInput('');
        setSelectedWithdrawal(null);
        fetchWithdrawals();
        fetchStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to complete withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const handleReverse = async () => {
    if (!selectedWithdrawal || !modalInput) return;
    
    if (modalInput.trim().length < 10) {
      toast.error('Reversal reason must be at least 10 characters');
      return;
    }
    
    setProcessing(selectedWithdrawal._id);
    try {
      const result = await reverseWithdrawalAdmin(selectedWithdrawal._id, modalInput);
      if (result.success) {
        toast.success(result.message);
        setShowReverseModal(false);
        setModalInput('');
        setSelectedWithdrawal(null);
        fetchWithdrawals();
        fetchStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to reverse withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedWithdrawals.length === 0) {
      toast.error('No withdrawals selected');
      return;
    }

    setProcessing('bulk');
    try {
      const result = await bulkApproveWithdrawalsAdmin(selectedWithdrawals);
      if (result.success) {
        toast.success(result.message);
        setSelectedWithdrawals([]);
        fetchWithdrawals();
        fetchStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to bulk approve');
    } finally {
      setProcessing(null);
    }
  };

  const toggleSelectWithdrawal = (id: string) => {
    setSelectedWithdrawals(prev => 
      prev.includes(id) 
        ? prev.filter(wId => wId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedWithdrawals.length === withdrawals.filter(w => w.status === 'pending').length) {
      setSelectedWithdrawals([]);
    } else {
      setSelectedWithdrawals(withdrawals.filter(w => w.status === 'pending').map(w => w._id));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <AlertCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatCurrency = (cents: number) => {
    return `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Withdrawals Management</h1>
          <p className="text-gray-600 mt-1">Review and process user withdrawal requests</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Withdrawals</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.totalAmountCents)}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by M-Pesa number or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </button>
        </div>

        {selectedWithdrawals.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-800">
              {selectedWithdrawals.length} withdrawal(s) selected
            </span>
            <button
              onClick={handleBulkApprove}
              disabled={processing === 'bulk'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {processing === 'bulk' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Bulk Approve
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No withdrawals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedWithdrawals.length === withdrawals.filter(w => w.status === 'pending').length && withdrawals.filter(w => w.status === 'pending').length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">M-Pesa Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      {withdrawal.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedWithdrawals.includes(withdrawal._id)}
                          onChange={() => toggleSelectWithdrawal(withdrawal._id)}
                          className="rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{withdrawal.user.username}</p>
                        <p className="text-sm text-gray-500">{withdrawal.user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{formatCurrency(withdrawal.amountCents)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-gray-900">{withdrawal.mpesaNumber}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(withdrawal.status)}`}>
                        {getStatusIcon(withdrawal.status)}
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{formatDate(withdrawal.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(withdrawal._id)}
                              disabled={processing === withdrawal._id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              {processing === withdrawal._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setShowRejectModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {withdrawal.status === 'approved' && (
                          <button
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setShowCompleteModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Complete"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {withdrawal.status === 'completed' && (
                          <button
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setShowReverseModal(true);
                            }}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Reverse"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reject Withdrawal</h3>
                <p className="text-sm text-gray-600">User: {selectedWithdrawal.user.username}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Enter detailed reason for rejection (min 10 characters)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {modalInput.length} / 10 characters minimum
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ The withdrawal amount will be refunded to the user's balance automatically.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setModalInput('');
                    setSelectedWithdrawal(null);
                  }}
                  disabled={processing !== null}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing !== null || modalInput.trim().length < 10}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Reject & Refund
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Complete Withdrawal</h3>
                <p className="text-sm text-gray-600">User: {selectedWithdrawal.user.username}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedWithdrawal.amountCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">M-Pesa Number:</span>
                  <span className="font-medium text-gray-900">{selectedWithdrawal.mpesaNumber}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  M-Pesa Transaction Code *
                </label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Enter M-Pesa transaction code (e.g., QGH1K2L3M4)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The transaction code from M-Pesa confirmation
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Make sure you've sent the money via M-Pesa before completing this request.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCompleteModal(false);
                    setModalInput('');
                    setSelectedWithdrawal(null);
                  }}
                  disabled={processing !== null}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={processing !== null || !modalInput.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Complete Withdrawal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reverse Modal */}
      {showReverseModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <RotateCcw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reverse Withdrawal</h3>
                <p className="text-sm text-gray-600">User: {selectedWithdrawal.user.username}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning: This is a critical action!</p>
                <p className="text-sm text-red-700">
                  Reversing a completed withdrawal will refund the amount to the user's balance and mark it as rejected.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedWithdrawal.amountCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transaction Code:</span>
                  <span className="font-medium text-gray-900">{selectedWithdrawal.transactionCode || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reversal Reason *
                </label>
                <textarea
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Enter detailed reason for reversal (min 10 characters)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {modalInput.length} / 10 characters minimum
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReverseModal(false);
                    setModalInput('');
                    setSelectedWithdrawal(null);
                  }}
                  disabled={processing !== null}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReverse}
                  disabled={processing !== null || modalInput.trim().length < 10}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Reverse Withdrawal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Withdrawal Details</h3>
                  <p className="text-sm text-gray-600">ID: {selectedWithdrawal._id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedWithdrawal(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-center">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(selectedWithdrawal.status)}`}>
                  {getStatusIcon(selectedWithdrawal.status)}
                  {selectedWithdrawal.status.toUpperCase()}
                </span>
              </div>

              {/* User Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">User Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Username</p>
                    <p className="text-sm font-medium text-gray-900">{selectedWithdrawal.user.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{selectedWithdrawal.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{selectedWithdrawal.user.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Balance</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(selectedWithdrawal.user.balance)}</p>
                  </div>
                </div>
              </div>

              {/* Withdrawal Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Withdrawal Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(selectedWithdrawal.amountCents)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">M-Pesa Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedWithdrawal.mpesaNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created At</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedWithdrawal.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Updated At</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedWithdrawal.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Processing Information */}
              {(selectedWithdrawal.approvedBy || selectedWithdrawal.transactionCode) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Processing Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedWithdrawal.approvedBy && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Approved By</p>
                          <p className="text-sm font-medium text-gray-900">{selectedWithdrawal.approvedBy.username}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Approved At</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedWithdrawal.approvedAt ? formatDate(selectedWithdrawal.approvedAt) : 'N/A'}
                          </p>
                        </div>
                      </>
                    )}
                    {selectedWithdrawal.transactionCode && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Transaction Code</p>
                          <p className="text-sm font-medium text-gray-900">{selectedWithdrawal.transactionCode}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">M-Pesa Receipt</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedWithdrawal.mpesaReceiptNumber || 'N/A'}
                          </p>
                        </div>
                      </>
                    )}
                    {selectedWithdrawal.processedAt && (
                      <div>
                        <p className="text-xs text-gray-500">Processed At</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(selectedWithdrawal.processedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(selectedWithdrawal.processingNotes || selectedWithdrawal.failureReason) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Notes</h4>
                  {selectedWithdrawal.processingNotes && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500">Processing Notes</p>
                      <p className="text-sm text-gray-900">{selectedWithdrawal.processingNotes}</p>
                    </div>
                  )}
                  {selectedWithdrawal.failureReason && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-500">Failure Reason</p>
                      <p className="text-sm text-red-700">{selectedWithdrawal.failureReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedWithdrawal(null);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
