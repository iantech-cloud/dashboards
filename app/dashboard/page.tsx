// app/dashboard/page.tsx - FULLY MODERNIZED
"use client";

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  RotateCw, 
  Users, 
  Loader2, 
  AlertTriangle, 
  Gift, 
  Share2, 
  ClipboardCheck,
  FileText,
  Plus,
  BookOpen,
  Clock,
  AlertCircle,
  CheckSquare,
  X,
  ArrowRight,
  BarChart3,
  Sparkles,
  Trophy,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';

import Card from '@/app/ui/dashboard/Card';
import TransactionHistory from '@/app/ui/dashboard/TransactionHistory';
import WalletPay from '@/app/ui/dashboard/WalletPay';
import SpinWheel from '@/app/ui/dashboard/spin-wheel';
import UserReports from '@/app/ui/dashboard/userReports';
import { fetchDashboardData } from '@/app/lib/data';
import { useDashboard } from './DashboardContext';
import { getUserContentStats, getRecentSubmissions } from '@/app/actions/dashboard/content';
import { getUserSpinStats } from '@/app/actions/spin';
import TransactionTrendsChart from '@/app/ui/dashboard/chart';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Profile {
  username: string;
  phone_number: string;
  referral_id: string | null;
  email: string;
  is_verified: boolean;
  is_active: boolean;
  is_approved: boolean;
  status: string;
  ban_reason: string | null;
  banned_at: string | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  level: number;
  rank: string;
  total_earnings: number;
  tasks_completed: number;
  available_spins: number;
}

interface Stats {
  totalEarnings: number;
  availableBalance: number;
  pendingWithdrawals: number;
  referralCount: number;
  directReferralEarnings: number;
  downlineCount: number;
  downlineEarnings: number;
  level: number;
  rank: string;
  availableSpins: number;
  surveyEarnings: number;
  spinEarnings: number;
  totalSpins?: number;
  totalWins?: number;
  winRate?: number;
  currentStreak?: number;
  bestStreak?: number;
  totalSpinsUsed?: number;
}

interface Receipt {
  id: string;
  amount: number;
  date: string;
  transactionCode: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'EARNING' | 'WITHDRAW' | 'DEPOSIT' | 'BONUS' | 'SPIN_WIN' | 'REFERRAL' | 'SURVEY' | string;
  description: string;
  status: string;
  date: string;
}

interface DashboardData {
  profile: Profile;
  stats: Stats;
  receipts: Receipt[];
  transactions: Transaction[];
}

interface ContentStats {
  totalSubmissions: number;
  pending: number;
  approved: number;
  rejected: number;
  revisionRequested: number;
  totalEarned: number;
  averageEarnings: number;
}

interface RecentSubmission {
  _id: string;
  title: string;
  content_type: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  payment_status: 'pending' | 'paid' | 'rejected';
  payment_amount: number;
  submission_date: string;
  task_category: string;
}

interface SpinStats {
  totalSpins: number;
  totalWins: number;
  winRate: number;
  totalPrizeValue: number;
  currentStreak: number;
  bestStreak: number;
  availableSpins: number;
  totalSpinsUsed: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DashboardPage() {
  const { user, spinMutation } = useDashboard();
  const [spinMessage, setSpinMessage] = useState<string | null>(null);
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [spinStats, setSpinStats] = useState<SpinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [spinStatsLoading, setSpinStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboardData(user.id);
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadContentData = async () => {
      try {
        setContentLoading(true);
        const [statsResult, submissionsResult] = await Promise.allSettled([
          getUserContentStats(),
          getRecentSubmissions(5)
        ]);

        if (statsResult.status === 'fulfilled' && (statsResult.value as any).success) {
          setContentStats((statsResult.value as any).data);
        } else {
          console.error('Failed to load content stats:', statsResult.status === 'rejected' ? statsResult.reason : (statsResult.value as any).message);
        }

        if (submissionsResult.status === 'fulfilled' && (submissionsResult.value as any).success) {
          setRecentSubmissions((submissionsResult.value as any).data || []);
        } else {
          console.error('Failed to load recent submissions:', submissionsResult.status === 'rejected' ? submissionsResult.reason : (submissionsResult.value as any).message);
        }
      } catch (err) {
        console.error('Failed to load content data:', err);
      } finally {
        setContentLoading(false);
      }
    };

    loadContentData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadSpinStats = async () => {
      try {
        setSpinStatsLoading(true);
        console.log('🔄 Loading spin stats for user:', user.id);
        
        const result = await getUserSpinStats(user.id);
        
        if (result.success && result.data) {
          console.log('✅ Spin stats loaded:', result.data);
          setSpinStats(result.data);
        } else {
          console.error('❌ Failed to load spin stats:', result.message);
          setSpinStats({
            totalSpins: 0,
            totalWins: 0,
            winRate: 0,
            totalPrizeValue: 0,
            currentStreak: 0,
            bestStreak: 0,
            availableSpins: dashboardData?.stats.availableSpins || 0,
            totalSpinsUsed: 0
          });
        }
      } catch (err) {
        console.error('❌ Error loading spin stats:', err);
        setSpinStats({
          totalSpins: 0,
          totalWins: 0,
          winRate: 0,
          totalPrizeValue: 0,
          currentStreak: 0,
          bestStreak: 0,
          availableSpins: dashboardData?.stats.availableSpins || 0,
          totalSpinsUsed: 0
        });
      } finally {
        setSpinStatsLoading(false);
      }
    };

    loadSpinStats();
  }, [user, dashboardData?.stats.availableSpins]);

  const handleSpinClick = () => {
    setShowSpinWheel(true);
    setSpinMessage('');
    setSpinResult(null);
  };

  const handleSpinComplete = async (result: any) => {
    console.log('🎯 Spin completed with result:', result);
    setSpinResult(result);
    
    if (result.success) {
      setSpinMessage(`🎉 Congratulations! You won: ${result.prizeName}`);
    } else {
      setSpinMessage(result.message || 'Spin completed. Better luck next time!');
    }

    if (user) {
      try {
        setRefreshingStats(true);
        console.log('🔄 Force refreshing dashboard data and spin stats after spin...');
        
        const [updatedDashboardData, updatedSpinStats] = await Promise.allSettled([
          fetchDashboardData(user.id),
          getUserSpinStats(user.id)
        ]);

        if (updatedDashboardData.status === 'fulfilled') {
          setDashboardData(updatedDashboardData.value);
          console.log('✅ Dashboard data refreshed');
        }

        if (updatedSpinStats.status === 'fulfilled' && updatedSpinStats.value.success) {
          setSpinStats(updatedSpinStats.value.data);
          console.log('✅ Spin stats refreshed:', updatedSpinStats.value.data);
        }

      } catch (err) {
        console.error('Failed to refresh data after spin:', err);
      } finally {
        setRefreshingStats(false);
      }
    }

    setTimeout(() => {
      setShowSpinWheel(false);
    }, 3000);
  };

  const handleCopyReferralCode = async (referralId: string) => {
    try {
      await navigator.clipboard.writeText(referralId);
      setReferralMessage('Referral code copied to clipboard!');
      setTimeout(() => setReferralMessage(null), 3000);
    } catch (err) {
      setReferralMessage('Failed to copy referral code.');
      setTimeout(() => setReferralMessage(null), 3000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border border-red-200';
      case 'revision_requested': return 'bg-orange-100 text-orange-800 border border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckSquare className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      case 'revision_requested': return <RotateCw className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatPayment = (amount: number) => {
    return `KES ${amount.toFixed(2)}`;
  };

  useEffect(() => {
    if (dashboardData?.stats) {
      console.log('📊 Current Dashboard Stats:', {
        totalSpins: dashboardData.stats.totalSpins,
        totalWins: dashboardData.stats.totalWins,
        winRate: dashboardData.stats.winRate,
        currentStreak: dashboardData.stats.currentStreak,
        availableSpins: dashboardData.stats.availableSpins
      });
    }
    
    if (spinStats) {
      console.log('🎯 Current Spin Stats:', spinStats);
    }
  }, [dashboardData, spinStats]);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30">
        <div className="text-center">
          <div className="relative inline-flex">
            <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 className="text-cyan-400 w-10 h-10 opacity-20" />
            </div>
          </div>
          <p className="mt-3 text-lg font-medium text-slate-700">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30">
        <div className="text-center">
          <div className="relative inline-flex">
            <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 className="text-cyan-400 w-10 h-10 opacity-20" />
            </div>
          </div>
          <p className="mt-3 text-lg font-medium text-slate-700">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-red-50 via-orange-50/30 to-red-50/30">
        <div className="bg-white/80 backdrop-blur-xl border-2 border-red-200 text-red-700 p-6 rounded-2xl max-w-md shadow-xl">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <p className="font-semibold text-lg">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full mt-4 py-2 px-4 bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-500/30 transition-all duration-250"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { profile, stats, receipts, transactions } = dashboardData || {};

  const displayStats = {
    ...stats,
    totalSpins: spinStats?.totalSpins ?? stats?.totalSpins ?? 0,
    totalWins: spinStats?.totalWins ?? stats?.totalWins ?? 0,
    winRate: spinStats?.winRate ?? stats?.winRate ?? 0,
    currentStreak: spinStats?.currentStreak ?? stats?.currentStreak ?? 0,
    bestStreak: spinStats?.bestStreak ?? stats?.bestStreak ?? 0,
    availableSpins: spinStats?.availableSpins ?? stats?.availableSpins ?? 0,
    totalSpinsUsed: spinStats?.totalSpinsUsed ?? stats?.totalSpinsUsed ?? 0,
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 min-h-screen relative">
      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-cyan-400/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

      {/* Welcome Header with Glassmorphism */}
      <div className="relative mb-8 bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/50 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-cyan-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-110">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Welcome back, {profile?.username || 'User'}!
              </h2>
              <p className="text-slate-600 mt-1">Here's what's happening with your account today</p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <span className="text-lg font-bold text-slate-700">Level {profile?.level}</span>
          </div>
        </div>
      </div>

      {/* Profile Overview Card with Glassmorphism */}
      {profile && (
        <div className={`relative mb-8 bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border-l-4 overflow-hidden ${
          profile.is_approved ? 'border-green-500' : 'border-yellow-500'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent"></div>
          <div className="relative z-10 flex justify-between items-start flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-md ${
                  profile.is_approved 
                    ? 'bg-gradient-to-r from-green-500 to-green-400 text-white' 
                    : 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-white'
                }`}>
                  {profile.is_approved ? '✓ Approved' : '⏳ Pending Approval'}
                </div>
                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 font-semibold text-sm border border-blue-200">
                  {profile.rank}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-slate-600">Username:</span>
                  <span className="font-semibold text-slate-900">{profile.username}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  <span className="text-slate-600">Phone:</span>
                  <span className="font-semibold text-slate-900">{profile.phone_number}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-slate-600">Email:</span>
                  <span className="font-semibold text-slate-900">{profile.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-slate-600">Level:</span>
                  <span className="font-semibold text-slate-900">{profile.level} ({profile.rank})</span>
                </div>
              </div>
            </div>
            
            {profile.referral_id && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 backdrop-blur-sm p-4 rounded-2xl border border-blue-200 shadow-md">
                <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Referral Code</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3 font-mono">
                  {profile.referral_id}
                </p>
                <button
                  onClick={() => handleCopyReferralCode(profile.referral_id!)}
                  className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-250 transform hover:scale-105"
                >
                  Copy Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid with Modern Cards */}
      {displayStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card title="Current Balance" value={`KES ${displayStats.availableBalance.toFixed(2)}`} icon={DollarSign} color="bg-indigo-600" />
          <Card title="Total Earnings" value={`KES ${displayStats.totalEarnings.toFixed(2)}`} icon={TrendingUp} color="bg-green-500" />
          <Card title="Referral Count" value={displayStats.referralCount.toString()} icon={Users} color="bg-blue-500" />
          <Card title="Pending Withdrawals" value={`KES ${displayStats.pendingWithdrawals.toFixed(2)}`} icon={DollarSign} color="bg-yellow-500" />
          <Card title="Downline Earnings" value={`KES ${displayStats.downlineEarnings.toFixed(2)}`} icon={Users} color="bg-purple-500" />
          <Card title="Tasks Completed" value={profile?.tasks_completed?.toString() || '0'} icon={CheckCircle} color="bg-teal-500" />
          <Card title="Available Spins" value={displayStats.availableSpins.toString()} icon={RotateCw} color="bg-red-500" />
          <Card title="Spin Earnings" value={`KES ${(displayStats.spinEarnings || 0).toFixed(2)}`} icon={Gift} color="bg-pink-500" />
          <Card title="Survey Earnings" value={`KES ${(displayStats.surveyEarnings || 0).toFixed(2)}`} icon={ClipboardCheck} color="bg-orange-500" />
          <Card title="Level/Rank" value={`Level ${displayStats.level} (${displayStats.rank})`} icon={CheckCircle} color="bg-cyan-500" />
          <Card title="Total Spins" value={displayStats.totalSpins?.toString() || '0'} icon={RotateCw} color="bg-purple-500" loading={spinStatsLoading} />
          <Card title="Total Wins" value={displayStats.totalWins?.toString() || '0'} icon={Gift} color="bg-green-500" loading={spinStatsLoading} />
          <Card title="Win Rate" value={`${displayStats.winRate?.toFixed(1) || '0.0'}%`} icon={TrendingUp} color="bg-blue-500" loading={spinStatsLoading} />
          <Card title="Current Streak" value={displayStats.currentStreak?.toString() || '0'} icon={CheckCircle} color="bg-orange-500" loading={spinStatsLoading} />
          <Card title="Best Streak" value={displayStats.bestStreak?.toString() || '0'} icon={TrendingUp} color="bg-yellow-500" loading={spinStatsLoading} />
          <Card title="Spins Used" value={displayStats.totalSpinsUsed?.toString() || '0'} icon={RotateCw} color="bg-gray-500" loading={spinStatsLoading} />
        </div>
      ) : (
        <p className="text-center text-slate-500 mb-8 py-8 bg-white/70 backdrop-blur-xl rounded-2xl">No statistics available.</p>
      )}

      {/* Quick Actions Grid with Enhanced Styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Spin-to-Win Card */}
        <div className="group relative bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50 transition-all duration-300 group-hover:rotate-12">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Spin-to-Win</h3>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-xl mb-4 border border-red-200">
              <p className="text-sm text-slate-600 mb-1">Available Spins</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                {displayStats?.availableSpins || profile?.available_spins || 0}
              </p>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 flex items-center">
              <Zap className="w-4 h-4 mr-1 text-yellow-500" />
              Cost per spin: <span className="font-semibold ml-1">5 spins</span>
            </p>
            
            <button
              onClick={handleSpinClick}
              disabled={refreshingStats || spinStatsLoading}
              className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-250 flex items-center justify-center transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshingStats ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Refreshing...
                </>
              ) : (
                <>
                  <Gift className="mr-2" size={20} />
                  Open Spin Wheel
                  <ArrowRight className="ml-2" size={16} />
                </>
              )}
            </button>
            
            {spinMessage && (
              <div className={`mt-4 p-3 rounded-xl text-center font-medium text-sm backdrop-blur-sm ${
                spinMessage.includes('Congratulations') || spinMessage.includes('🎉')
                  ? 'bg-green-100/80 text-green-700 border border-green-300'
                  : spinMessage.includes('Not enough')
                  ? 'bg-red-100/80 text-red-700 border border-red-300'
                  : 'bg-blue-100/80 text-blue-700 border border-blue-300'
              }`}>
                {spinMessage}
              </div>
            )}
          </div>
        </div>

        {/* Wallet Pay Card */}
        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50 hover:shadow-2xl transition-all duration-300">
          <WalletPay 
            onDepositSuccess={() => {
              if (user) {
                fetchDashboardData(user.id).then(setDashboardData);
              }
            }} 
          />
        </div>

        {/* Referral Card */}
        <div className="group relative bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Refer & Earn</h3>
            </div>
            <p className="text-slate-600 mb-4 text-sm">Share your referral code to earn bonuses</p>
            <div className="space-y-3">
              {profile?.referral_id && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl text-center border border-blue-200">
                  <p className="text-xs text-blue-700 mb-2 uppercase tracking-wide font-semibold">Your Referral Code</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3 font-mono">
                    {profile.referral_id}
                  </p>
                  <button
                    onClick={() => handleCopyReferralCode(profile.referral_id!)}
                    className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-250 transform hover:scale-105"
                  >
                    Copy Referral Code
                  </button>
                </div>
              )}
            </div>
            {referralMessage && (
              <div className={`mt-4 p-3 rounded-xl text-center font-medium text-sm backdrop-blur-sm ${
                referralMessage.includes('copied')
                  ? 'bg-green-100/80 text-green-700 border border-green-300'
                  : 'bg-blue-100/80 text-blue-700 border border-blue-300'
              }`}>
                {referralMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Reports Section */}
      <div className="mb-8">
        <UserReports className="mt-6" />
      </div>

      {/* Spin Wheel Modal with Enhanced Design */}
      {showSpinWheel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-white/50">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent flex items-center">
                  <Sparkles className="mr-2 text-red-500" />
                  Spin to Win!
                </h2>
                <button
                  onClick={() => setShowSpinWheel(false)}
                  className="text-slate-500 hover:text-slate-700 transition-all duration-200 transform hover:scale-110 hover:rotate-90 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                >
                  <X size={24} />
                </button>
              </div>

              <SpinWheel 
                userId={user.id}
                onSpinComplete={handleSpinComplete}
              />
            </div>
          </div>
        </div>
      )}

      {/* Transaction Trends */}
      <div className="mb-8">
        <TransactionTrendsChart timeRange="30days" />
      </div>

      {/* Approved Withdrawals with Modern Design */}
      <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Approved Withdrawals</h3>
        </div>
        {receipts && receipts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">No approved withdrawals found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {receipts?.map((receipt) => (
              <li key={receipt.id} className="flex justify-between items-center py-4 px-4 hover:bg-white/50 transition-all duration-250 rounded-xl group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-250">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Transaction ID: {receipt.transactionCode}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(receipt.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                    KES {receipt.amount.toFixed(2)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Transaction History */}
      <div className="mb-8">
        <TransactionHistory 
          transactions={transactions as any || []} 
          title="Recent Activity" 
          limit={10} 
        />
      </div>

      {/* Content Creation Section with Modern Design */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-4 bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Content Creation Dashboard</h3>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/dashboard/content/create"
                className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-250 transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Content
              </Link>
              <Link
                href="/dashboard/content"
                className="inline-flex items-center px-5 py-2.5 border-2 border-slate-200 bg-white/70 backdrop-blur-sm text-slate-700 font-semibold rounded-xl hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all duration-250 shadow-sm hover:shadow-md"
              >
                <FileText className="w-5 h-5 mr-2" />
                View All
              </Link>
              <Link
                href="/dashboard/blog"
                className="inline-flex items-center px-5 py-2.5 border-2 border-slate-200 bg-white/70 backdrop-blur-sm text-slate-700 font-semibold rounded-xl hover:bg-white hover:border-cyan-300 hover:text-cyan-600 transition-all duration-250 shadow-sm hover:shadow-md"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Read Blogs
              </Link>
            </div>
          </div>

          {contentLoading ? (
            <div className="flex justify-center py-12">
              <div className="relative inline-flex">
                <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
                <div className="absolute inset-0 animate-ping">
                  <Loader2 className="text-cyan-400 w-8 h-8 opacity-20" />
                </div>
              </div>
              <p className="ml-3 text-slate-600 font-medium">Loading content stats...</p>
            </div>
          ) : contentStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-all duration-250">
                <div className="text-3xl font-bold text-blue-600 mb-2">{contentStats.totalSubmissions}</div>
                <div className="text-sm text-blue-800 font-semibold">Total Submissions</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100/50 backdrop-blur-sm rounded-2xl border border-yellow-200 shadow-sm hover:shadow-md transition-all duration-250">
                <div className="text-3xl font-bold text-yellow-600 mb-2">{contentStats.pending}</div>
                <div className="text-sm text-yellow-800 font-semibold">Pending Review</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100/50 backdrop-blur-sm rounded-2xl border border-green-200 shadow-sm hover:shadow-md transition-all duration-250">
                <div className="text-3xl font-bold text-green-600 mb-2">{contentStats.approved}</div>
                <div className="text-sm text-green-800 font-semibold">Approved</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 backdrop-blur-sm rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all duration-250">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  KES {contentStats.totalEarned.toFixed(2)}
                </div>
                <div className="text-sm text-purple-800 font-semibold">Total Earned</div>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No content statistics available.</p>
          )}
        </div>
      </div>

      {/* Recent Submissions with Modern Design */}
      <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Recent Submissions</h3>
          </div>
          <Link
            href="/dashboard/content"
            className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center group"
          >
            View All 
            <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-250" />
          </Link>
        </div>

        {contentLoading ? (
          <div className="flex justify-center py-12">
            <div className="relative inline-flex">
              <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
              <div className="absolute inset-0 animate-ping">
                <Loader2 className="text-cyan-400 w-6 h-6 opacity-20" />
              </div>
            </div>
            <p className="ml-2 text-slate-600">Loading submissions...</p>
          </div>
        ) : recentSubmissions.length > 0 ? (
          <div className="space-y-3">
            {recentSubmissions.map((submission) => (
              <div
                key={submission._id}
                className="flex items-center justify-between p-5 border-2 border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl hover:bg-white hover:border-blue-300 hover:shadow-md transition-all duration-250 group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors duration-250">
                      {submission.title}
                    </h4>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(submission.status)}`}>
                      {getStatusIcon(submission.status)}
                      <span className="ml-1.5 capitalize">{submission.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                    <span className="capitalize font-medium">{submission.content_type.replace('_', ' ')}</span>
                    <span className="text-slate-400">•</span>
                    <span>{submission.task_category}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                      {formatPayment(submission.payment_amount)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-500 ml-4">
                  {new Date(submission.submission_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-4 font-medium">No submissions yet</p>
            <Link
              href="/dashboard/content/create"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-250 transform hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Submission
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
