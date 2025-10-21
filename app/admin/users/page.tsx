// app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getAdminUsers, 
  approveUserAccount, 
  activateUserAccount, 
  addUserSpins,
  updateUserStatus,
  resetUserLimits,
  getUserDetails
} from '../../actions/user-management';

interface User {
  _id: string;
  username: string;
  email: string;
  phone_number: string;
  role: string;
  approval_status: string;
  status: string;
  is_active: boolean;
  is_approved: boolean;
  balance_cents: number;
  available_spins: number;
  total_earnings_cents: number;
  tasks_completed: number;
  created_at: string;
  activation_paid_at?: string;
  activation_transaction_id?: string;
  activation_method?: string;
  referral_id?: string;
  preferred_mpesa_number?: string;
  total_deposits_today_cents?: number;
  total_withdrawals_today_cents?: number;
}

interface UsersResponse {
  success: boolean;
  data?: User[];
  message?: string;
  stats?: {
    total: number;
    pendingApproval: number;
    unapproved: number;
    active: number;
    inactive: number;
  };
}

interface UserDetails {
  user: User;
  recentTransactions: any[];
  referral: any;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [spinsAmount, setSpinsAmount] = useState<{ [key: string]: number }>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  const loadUsers = async (tab: string = activeTab) => {
    setLoading(true);
    try {
      const result: UsersResponse = await getAdminUsers({ tab, search: searchTerm });
      if (result.success) {
        setUsers(result.data || []);
        setStats(result.stats);
      } else {
        setFeedback({ type: 'error', message: result.message || 'Failed to load users' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [activeTab, searchTerm]);

  const handleApprove = async (userId: string) => {
    setActionLoading(`approve-${userId}`);
    setFeedback(null);
    
    try {
      const result = await approveUserAccount(userId);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        await loadUsers();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to approve user' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (userId: string) => {
    setActionLoading(`activate-${userId}`);
    setFeedback(null);
    
    try {
      const result = await activateUserAccount(userId);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        await loadUsers();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to activate user' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSpins = async (userId: string) => {
    setActionLoading(`spins-${userId}`);
    setFeedback(null);
    
    const spins = spinsAmount[userId] || 0;
    if (spins <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid number of spins' });
      setActionLoading(null);
      return;
    }

    try {
      const result = await addUserSpins(userId, spins);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        setSpinsAmount(prev => ({ ...prev, [userId]: 0 }));
        await loadUsers();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to add spins' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    setActionLoading(`status-${userId}`);
    setFeedback(null);
    
    try {
      const result = await updateUserStatus(userId, newStatus);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        await loadUsers();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to update user status' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetLimits = async (userId: string) => {
    setActionLoading(`reset-${userId}`);
    setFeedback(null);
    
    try {
      const result = await resetUserLimits(userId);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        await loadUsers();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to reset user limits' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = async (userId: string) => {
    setActionLoading(`details-${userId}`);
    try {
      const result = await getUserDetails(userId);
      if (result.success && result.data) {
        setSelectedUser(result.data);
        setShowUserDetails(true);
      } else {
        setFeedback({ type: 'error', message: result.message || 'Failed to load user details' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to load user details' });
    } finally {
      setActionLoading(null);
    }
  };

  // Check if user is fully activated
  const isUserFullyActivated = (user: User) => {
    return user.is_active && 
           user.status === 'active' && 
           user.activation_paid_at && 
           user.activation_transaction_id;
  };

  // Check if user can be activated (not already fully activated)
  const canActivateUser = (user: User) => {
    return !isUserFullyActivated(user);
  };

  // Check if user can be approved (not already approved)
  const canApproveUser = (user: User) => {
    return user.approval_status !== 'approved';
  };

  const filteredUsers = users.filter(user => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return user.approval_status === 'pending';
    if (activeTab === 'unapproved') return user.approval_status === 'approved' && !user.is_active;
    if (activeTab === 'active') return user.is_active && user.is_approved;
    if (activeTab === 'inactive') return !user.is_active;
    return true;
  });

  const formatCurrency = (cents: number) => {
    return `KES ${(cents / 100).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string; label: string } } = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'ACTIVE' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'INACTIVE' },
      suspended: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'SUSPENDED' },
      banned: { bg: 'bg-red-100', text: 'text-red-800', label: 'BANNED' },
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user accounts, approvals, and activations</p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors mt-4 sm:mt-0"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div className={`p-4 rounded-lg ${
          feedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingApproval}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Unapproved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unapproved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by name, email, phone, or referral ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tab Filters */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'all', label: 'All Users' },
              { id: 'pending', label: 'Pending Approval' },
              { id: 'unapproved', label: 'Unapproved' },
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Inactive' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm || activeTab !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'No users in the system yet.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financials
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.phone_number}</div>
                        {user.referral_id && (
                          <div className="text-xs text-blue-600 mt-1">
                            Referral ID: {user.referral_id}
                          </div>
                        )}
                        <button
                          onClick={() => handleViewDetails(user._id)}
                          disabled={actionLoading === `details-${user._id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1 disabled:opacity-50"
                        >
                          {actionLoading === `details-${user._id}` ? 'Loading...' : 'View Details'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.approval_status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : user.approval_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.approval_status.toUpperCase()}
                          </span>
                          {getStatusBadge(user.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          {isUserFullyActivated(user) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              ACTIVATED
                            </span>
                          )}
                        </div>
                        {user.activation_paid_at && (
                          <div className="text-xs text-gray-500">
                            Activated: {formatDate(user.activation_paid_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          Balance: {formatCurrency(user.balance_cents)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Earnings: {formatCurrency(user.total_earnings_cents)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Spins: {user.available_spins}
                        </div>
                        {(user.total_deposits_today_cents || user.total_withdrawals_today_cents) && (
                          <div className="text-xs text-gray-400 mt-1">
                            Today: D-{formatCurrency(user.total_deposits_today_cents || 0)} / W-{formatCurrency(user.total_withdrawals_today_cents || 0)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          Tasks: {user.tasks_completed}
                        </div>
                        <div className="text-sm text-gray-500">
                          Joined: {formatDate(user.created_at)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Role: <span className="capitalize">{user.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col space-y-2 items-end">
                        {/* Approval Actions - Show for unapproved users */}
                        {canApproveUser(user) && (
                          <button
                            onClick={() => handleApprove(user._id)}
                            disabled={actionLoading === `approve-${user._id}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === `approve-${user._id}` ? 'Approving...' : 'Approve'}
                          </button>
                        )}

                        {/* Activation Actions - Show for users who can be activated */}
                        {canActivateUser(user) && (
                          <button
                            onClick={() => handleActivate(user._id)}
                            disabled={actionLoading === `activate-${user._id}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === `activate-${user._id}` ? 'Activating...' : 'Activate (KSH 1,000)'}
                          </button>
                        )}

                        {/* Add Spins for Active Users */}
                        {user.is_active && (
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={spinsAmount[user._id] || ''}
                              onChange={(e) => setSpinsAmount(prev => ({
                                ...prev,
                                [user._id]: parseInt(e.target.value) || 0
                              }))}
                              placeholder="Spins"
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleAddSpins(user._id)}
                              disabled={actionLoading === `spins-${user._id}`}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === `spins-${user._id}` ? 'Adding...' : 'Add'}
                            </button>
                          </div>
                        )}

                        {/* Status Management */}
                        <div className="flex space-x-2">
                          <select
                            value={user.status}
                            onChange={(e) => handleStatusUpdate(user._id, e.target.value)}
                            disabled={actionLoading === `status-${user._id}`}
                            className="text-xs border border-gray-300 rounded px-2 py-1 disabled:opacity-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                            <option value="banned">Banned</option>
                          </select>
                          
                          {/* Reset Limits Button */}
                          <button
                            onClick={() => handleResetLimits(user._id)}
                            disabled={actionLoading === `reset-${user._id}`}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            title="Reset Daily Limits"
                          >
                            {actionLoading === `reset-${user._id}` ? '...' : '↻'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  User Details: {selectedUser.user.username}
                </h3>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Username</label>
                    <p className="text-sm text-gray-900">{selectedUser.user.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{selectedUser.user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-sm text-gray-900">{selectedUser.user.phone_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Referral ID</label>
                    <p className="text-sm text-gray-900">{selectedUser.user.referral_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">M-Pesa Number</label>
                    <p className="text-sm text-gray-900">{selectedUser.user.preferred_mpesa_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Joined Date</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedUser.user.created_at)}</p>
                  </div>
                  {selectedUser.user.activation_paid_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Activated At</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedUser.user.activation_paid_at)}</p>
                    </div>
                  )}
                  {selectedUser.user.activation_method && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Activation Method</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedUser.user.activation_method}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Account Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Approval</div>
                    <div className={`text-sm font-medium ${
                      selectedUser.user.approval_status === 'approved' ? 'text-green-600' : 
                      selectedUser.user.approval_status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {selectedUser.user.approval_status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Status</div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedUser.user.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Active</div>
                    <div className={`text-sm font-medium ${
                      selectedUser.user.is_active ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedUser.user.is_active ? 'YES' : 'NO'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">Role</div>
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {selectedUser.user.role}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Financial Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">Balance</div>
                    <div className="text-lg font-bold text-blue-700">
                      {formatCurrency(selectedUser.user.balance_cents)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Total Earnings</div>
                    <div className="text-lg font-bold text-green-700">
                      {formatCurrency(selectedUser.user.total_earnings_cents)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm font-medium text-purple-600">Available Spins</div>
                    <div className="text-lg font-bold text-purple-700">
                      {selectedUser.user.available_spins}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm font-medium text-orange-600">Tasks Completed</div>
                    <div className="text-lg font-bold text-orange-700">
                      {selectedUser.user.tasks_completed}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              {selectedUser.recentTransactions && selectedUser.recentTransactions.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Recent Transactions</h4>
                  <div className="space-y-2">
                    {selectedUser.recentTransactions.slice(0, 5).map((transaction: any) => (
                      <div key={transaction._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${
                          transaction.amount_cents >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(transaction.amount_cents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Referral Information */}
              {selectedUser.referral && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Referral Information</h4>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium">Referred by:</span>{' '}
                      {selectedUser.referral.referrer_id?.username || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Referral Earnings: {formatCurrency(selectedUser.referral.earning_cents || 0)}
                    </div>
                    {selectedUser.referral.referred_user_activated && (
                      <div className="text-sm text-green-600 mt-1">
                        ✓ Referred user activated
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
