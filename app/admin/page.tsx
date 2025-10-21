// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getAdminStats, toggleSpinWheel } from '../actions/admin';
import { redirect } from 'next/navigation';

interface AdminStats {
  totalUsers: number;
  pendingApprovals: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  activeUsers: number;
  totalTransactions: number;
  totalReferrals: number;
  todayRegistrations: number;
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
        // Update local state immediately for better UX
        setSpinStatus({
          active: activate,
          mode: activate ? 'manual' : 'scheduled'
        });
        
        // Refresh stats to get updated data
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Overview</h1>
        <p className="text-gray-600 mt-2">
          Welcome back. Here's what's happening with your platform.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-center">
            <div className="text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Spin Wheel Control Card */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl shadow border border-purple-200 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Spin Wheel Control</h2>
            <p className="text-gray-600">
              {spinStatus.active 
                ? 'Spin wheel is currently ACTIVE for all users' 
                : 'Spin wheel follows schedule (Wed & Fri 7PM-10PM EAT)'}
            </p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                spinStatus.active ? 'bg-green-500' : 'bg-gray-400'
              }`}></span>
              Mode: {spinStatus.mode === 'manual' ? 'Manual Override' : 'Scheduled'}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className={`text-sm font-medium ${
                spinStatus.active ? 'text-green-600' : 'text-gray-600'
              }`}>
                {spinStatus.active ? 'ACTIVE' : 'SCHEDULED'}
              </div>
              <div className="text-xs text-gray-500">
                {spinStatus.active ? 'Manual override' : 'Auto-schedule'}
              </div>
            </div>
            <button
              onClick={() => handleToggleSpinWheel(!spinStatus.active)}
              disabled={spinWheelLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                spinStatus.active ? 'bg-green-500' : 'bg-gray-300'
              } ${spinWheelLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  spinStatus.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        {/* Schedule Info */}
        {!spinStatus.active && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-2">Current Schedule</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Days:</span>
                <p className="text-gray-800">Wednesday & Friday</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Time:</span>
                <p className="text-gray-800">7:00 PM - 10:00 PM EAT</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <p className="text-gray-800">Following schedule</p>
              </div>
            </div>
          </div>
        )}

        {spinStatus.active && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-green-700 font-medium">
                Manual override active. Spin wheel is available to all users regardless of schedule.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid with Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-gray-500 mt-1">+{stats?.todayRegistrations || 0} today</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.pendingApprovals || 0}</p>
              {stats?.pendingApprovals > 0 && (
                <a href="/admin/approvals" className="text-xs text-yellow-600 hover:text-yellow-700 mt-1 block">
                  Review pending requests →
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.pendingWithdrawals || 0}</p>
              {stats?.pendingWithdrawals > 0 && (
                <a href="/admin/withdrawals" className="text-xs text-green-600 hover:text-green-700 mt-1 block">
                  Process withdrawals →
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">
                KES {((stats?.totalRevenue || 0) / 100).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">From activations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.activeUsers || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of total
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.totalTransactions || 0}</p>
              <p className="text-xs text-gray-500 mt-1">All time transactions</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">💳</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Referral Network</p>
              <p className="text-2xl font-bold text-gray-800">{stats?.totalReferrals || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total referrals</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <span className="text-2xl">🔄</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a 
            href="/admin/users" 
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <span className="ml-3 font-medium text-gray-700">Manage Users</span>
            </div>
          </a>

          <a 
            href="/admin/approvals" 
            className="p-4 border border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors"
          >
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="ml-3 font-medium text-gray-700">Review Approvals</span>
            </div>
          </a>

          <a 
            href="/admin/withdrawals" 
            className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="ml-3 font-medium text-gray-700">Process Withdrawals</span>
            </div>
          </a>

          <a 
            href="/admin/transactions" 
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="ml-3 font-medium text-gray-700">View Transactions</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
