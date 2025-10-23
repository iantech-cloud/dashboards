// app/dashboard/page.tsx
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
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

import Card from '@/app/ui/dashboard/Card';
import TransactionHistory from '@/app/ui/dashboard/TransactionHistory';
import WalletPay from '@/app/ui/dashboard/WalletPay';
import SpinWheel from '@/app/ui/dashboard/spin-wheel';
import { fetchDashboardData } from '@/app/lib/data';
import { useDashboard } from './DashboardContext';
import { getUserContentStats, getRecentSubmissions } from '@/app/actions/dashboard/content';
import { getUserSpinStats } from '@/app/actions/spin';

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
  // Context and state
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
  
  // Spin wheel state
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Load dashboard data effect
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

  // Load content stats and recent submissions
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

  // Load spin statistics
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
          // Set default spin stats if API fails
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
        // Set default spin stats on error
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

  // Spin handler - shows the spin wheel modal
  const handleSpinClick = () => {
    setShowSpinWheel(true);
    setSpinMessage('');
    setSpinResult(null);
  };

  // Handle spin completion from the wheel
  const handleSpinComplete = async (result: any) => {
    console.log('🎯 Spin completed with result:', result);
    setSpinResult(result);
    
    if (result.success) {
      setSpinMessage(`🎉 Congratulations! You won: ${result.prizeName}`);
    } else {
      setSpinMessage(result.message || 'Spin completed. Better luck next time!');
    }

    // Force refresh both dashboard data AND spin stats immediately
    if (user) {
      try {
        setRefreshingStats(true);
        console.log('🔄 Force refreshing dashboard data and spin stats after spin...');
        
        // Refresh both in parallel
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

    // Close the wheel after showing result
    setTimeout(() => {
      setShowSpinWheel(false);
    }, 3000);
  };

  // Copy referral code handler
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

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'revision_requested': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckSquare className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      case 'revision_requested': return <RotateCw className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Format payment amount - FIXED: Remove division by 100 since amounts are already in KSH
  const formatPayment = (amount: number) => {
    return `KES ${amount.toFixed(2)}`;
  };

  // Debug effect to monitor stats changes
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

  // Loading states
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
        <p className="ml-3 text-lg text-gray-600">Loading user data...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
        <p className="ml-3 text-lg text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg max-w-md">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2" />
            <p className="font-medium">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-red-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { profile, stats, receipts, transactions } = dashboardData || {};

  // Use spinStats for spin-related data, fallback to dashboard stats
  const displayStats = {
    ...stats,
    // OVERRIDE spin-related stats with data from spinStats API
    totalSpins: spinStats?.totalSpins ?? stats?.totalSpins ?? 0,
    totalWins: spinStats?.totalWins ?? stats?.totalWins ?? 0,
    winRate: spinStats?.winRate ?? stats?.winRate ?? 0,
    currentStreak: spinStats?.currentStreak ?? stats?.currentStreak ?? 0,
    bestStreak: spinStats?.bestStreak ?? stats?.bestStreak ?? 0,
    availableSpins: spinStats?.availableSpins ?? stats?.availableSpins ?? 0,
    totalSpinsUsed: spinStats?.totalSpinsUsed ?? stats?.totalSpinsUsed ?? 0,
  };

  // Prepare chart data
  const chartData = transactions?.reduce((acc, curr) => {
    const date = curr.date.split('T')[0];
    if (!acc[date]) acc[date] = 0;
    acc[date] += curr.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  const chartLabels = Object.keys(chartData).sort();
  const chartValues = chartLabels.map((date) => chartData[date]);

  // Calculate transaction summaries
  const spinWinTotal = transactions?.filter(t => t.type === 'SPIN_WIN')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const referralTotal = transactions?.filter(t => t.type === 'REFERRAL')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const surveyTotal = transactions?.filter(t => t.type === 'SURVEY')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalEarnings = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <h2 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-2 border-indigo-200 pb-3">
        Welcome, {profile?.username || 'User'}!
      </h2>

      {/* Profile Overview Card */}
      {profile && (
        <div className={`p-6 rounded-xl shadow-lg mb-8 border-l-4 ${
          profile.is_approved ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'
        }`}>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Account Overview</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-semibold">Status:</span>{' '}
                  <span className={profile.is_approved ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                    {profile.is_approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </p>
                <p><span className="font-semibold">Username:</span> {profile.username}</p>
                <p><span className="font-semibold">Phone:</span> {profile.phone_number}</p>
                <p><span className="font-semibold">Email:</span> {profile.email}</p>
                <p><span className="font-semibold">Level:</span> {profile.level} ({profile.rank})</p>
              </div>
            </div>
            
            {profile.referral_id && (
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-600 mb-2">Referral Code</p>
                <p className="text-lg font-bold text-indigo-600 mb-2">{profile.referral_id}</p>
                <button
                  onClick={() => handleCopyReferralCode(profile.referral_id!)}
                  className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-200 transition"
                >
                  Copy Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {displayStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card title="Current Balance" value={`KES ${displayStats.availableBalance.toFixed(2)}`} icon={DollarSign} color="bg-indigo-600" />
          <Card title="Total Earnings" value={`KES ${displayStats.totalEarnings.toFixed(2)}`} icon={TrendingUp} color="bg-green-500" />
          <Card title="Referral Count" value={displayStats.referralCount.toString()} icon={Users} color="bg-blue-500" />
          <Card title="Pending Withdrawals" value={`KES ${displayStats.pendingWithdrawals.toFixed(2)}`} icon={DollarSign} color="bg-yellow-500" />
          <Card title="Downline Earnings" value={`KES ${displayStats.downlineEarnings.toFixed(2)}`} icon={Users} color="bg-purple-500" />
          <Card title="Tasks Completed" value={profile?.tasks_completed?.toString() || '0'} icon={CheckCircle} color="bg-teal-500" />
          
          {/* Spin Statistics Cards - USING CORRECT SPIN STATS API DATA */}
          <Card 
            title="Available Spins" 
            value={displayStats.availableSpins.toString()} 
            icon={RotateCw} 
            color="bg-red-500" 
          />
          <Card 
            title="Spin Earnings" 
            value={`KES ${(displayStats.spinEarnings || 0).toFixed(2)}`} 
            icon={Gift} 
            color="bg-pink-500" 
          />
          <Card 
            title="Survey Earnings" 
            value={`KES ${(displayStats.surveyEarnings || 0).toFixed(2)}`} 
            icon={ClipboardCheck} 
            color="bg-orange-500" 
          />
          <Card 
            title="Level/Rank" 
            value={`Level ${displayStats.level} (${displayStats.rank})`} 
            icon={CheckCircle} 
            color="bg-cyan-500" 
          />
          
          {/* Enhanced Spin Statistics Cards - USING CORRECT SPIN STATS API DATA */}
          <Card 
            title="Total Spins" 
            value={displayStats.totalSpins?.toString() || '0'} 
            icon={RotateCw} 
            color="bg-purple-500" 
            loading={spinStatsLoading}
          />
          <Card 
            title="Total Wins" 
            value={displayStats.totalWins?.toString() || '0'} 
            icon={Gift} 
            color="bg-green-500" 
            loading={spinStatsLoading}
          />
          <Card 
            title="Win Rate" 
            value={`${displayStats.winRate?.toFixed(1) || '0.0'}%`} 
            icon={TrendingUp} 
            color="bg-blue-500" 
            loading={spinStatsLoading}
          />
          <Card 
            title="Current Streak" 
            value={displayStats.currentStreak?.toString() || '0'} 
            icon={CheckCircle} 
            color="bg-orange-500" 
            loading={spinStatsLoading}
          />
          <Card 
            title="Best Streak" 
            value={displayStats.bestStreak?.toString() || '0'} 
            icon={TrendingUp} 
            color="bg-yellow-500" 
            loading={spinStatsLoading}
          />
          <Card 
            title="Spins Used" 
            value={displayStats.totalSpinsUsed?.toString() || '0'} 
            icon={RotateCw} 
            color="bg-gray-500" 
            loading={spinStatsLoading}
          />
        </div>
      ) : (
        <p className="text-center text-gray-500 mb-8">No statistics available.</p>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Spin-to-Win - Updated to use Spin Wheel Modal */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Gift className="mr-2 text-red-500" />
            Spin-to-Win
          </h3>
          
          <p className="text-gray-600 mb-4">
            Available Spins: <span className="font-bold text-red-600">
              {displayStats?.availableSpins || profile?.available_spins || 0}
            </span>
          </p>
          
          <p className="text-sm text-gray-500 mb-4">
            Cost per spin: <span className="font-semibold">5 spins</span>
          </p>
          
          <button
            onClick={handleSpinClick}
            disabled={refreshingStats || spinStatsLoading}
            className="w-full py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl shadow-md hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className={`mt-4 p-3 rounded-lg text-center font-medium animate-pulse ${
              spinMessage.includes('Congratulations') || spinMessage.includes('🎉')
                ? 'bg-green-100 text-green-700 border border-green-300'
                : spinMessage.includes('Not enough')
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-blue-100 text-blue-700 border border-blue-300'
            }`}>
              {spinMessage}
            </div>
          )}
        </div>

        {/* Wallet Pay */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <WalletPay 
            onDepositSuccess={() => {
              if (user) {
                fetchDashboardData(user.id).then(setDashboardData);
              }
            }} 
          />
        </div>

        {/* Referral Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Share2 className="mr-2 text-blue-500" />
            Refer & Earn
          </h3>
          <p className="text-gray-600 mb-4">Share your referral code to earn bonuses</p>
          <div className="space-y-3">
            {profile?.referral_id && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg text-center border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Your Referral Code:</p>
                <p className="text-xl font-bold text-indigo-600 mb-3 font-mono">{profile.referral_id}</p>
                <button
                  onClick={() => handleCopyReferralCode(profile.referral_id!)}
                  className="w-full py-2 px-4 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition transform hover:scale-105"
                >
                  Copy Referral Code
                </button>
              </div>
            )}
          </div>
          {referralMessage && (
            <div className={`mt-4 p-3 rounded-lg text-center font-medium ${
              referralMessage.includes('copied')
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-100 text-blue-700 border border-blue-300'
            }`}>
              {referralMessage}
            </div>
          )}
        </div>
      </div>

      {/* Spin Wheel Modal */}
      {showSpinWheel && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  Spin to Win!
                </h2>
                <button
                  onClick={() => setShowSpinWheel(false)}
                  className="text-gray-500 hover:text-gray-700 transition duration-200 transform hover:scale-110"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Spin Wheel Component */}
              <SpinWheel 
                userId={user.id}
                onSpinComplete={handleSpinComplete}
              />
            </div>
          </div>
        </div>
      )}

      {/* Transaction Trends */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Transaction Trends</h3>
        {chartLabels.length > 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p>Chart data available for {chartLabels.length} transactions</p>
            <p className="text-sm mt-2">Chart visualization coming soon</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-green-100 p-3 rounded-lg border border-green-200">
                <div className="font-semibold text-green-800">SPIN WINS</div>
                <div className="text-green-600 font-bold">KES {spinWinTotal.toFixed(2)}</div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg border border-blue-200">
                <div className="font-semibold text-blue-800">REFERRALS</div>
                <div className="text-blue-600 font-bold">KES {referralTotal.toFixed(2)}</div>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg border border-orange-200">
                <div className="font-semibold text-orange-800">SURVEYS</div>
                <div className="text-orange-600 font-bold">KES {surveyTotal.toFixed(2)}</div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg border border-purple-200">
                <div className="font-semibold text-purple-800">TOTAL</div>
                <div className="text-purple-600 font-bold">KES {totalEarnings.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No transaction data available for chart.</p>
        )}
      </div>

      {/* Approved Withdrawals */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Approved Withdrawals</h3>
        {receipts && receipts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No approved withdrawals found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {receipts?.map((receipt) => (
              <li key={receipt.id} className="flex justify-between items-center py-4 px-2 hover:bg-gray-50 transition rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">Transaction ID: {receipt.transactionCode}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(receipt.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <p className="font-bold text-indigo-600 text-lg">KES {receipt.amount.toFixed(2)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Transaction History */}
      <TransactionHistory 
        transactions={transactions as any || []} 
        title="Recent Activity" 
        limit={10} 
      />

      {/* Content Creation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Content Stats Card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Content Creation Dashboard</h3>
            <div className="flex gap-3">
              <Link
                href="/dashboard/content/create"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Content
              </Link>
              <Link
                href="/dashboard/content"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-5 h-5 mr-2" />
                View All
              </Link>
              <Link
                href="/dashboard/blog"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Read Blogs
              </Link>
            </div>
          </div>

          {contentLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-indigo-600 w-6 h-6" />
              <p className="ml-2 text-gray-600">Loading content stats...</p>
            </div>
          ) : contentStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{contentStats.totalSubmissions}</div>
                <div className="text-sm text-blue-800 font-medium">Total Submissions</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">{contentStats.pending}</div>
                <div className="text-sm text-yellow-800 font-medium">Pending Review</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{contentStats.approved}</div>
                <div className="text-sm text-green-800 font-medium">Approved</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                {/* FIXED: Remove division by 100 since totalEarned is already in KSH */}
                <div className="text-2xl font-bold text-purple-600">
                  KES {contentStats.totalEarned.toFixed(2)}
                </div>
                <div className="text-sm text-purple-800 font-medium">Total Earned</div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No content statistics available.</p>
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Recent Submissions</h3>
          <Link
            href="/dashboard/content"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View All →
          </Link>
        </div>

        {contentLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-indigo-600 w-6 h-6" />
            <p className="ml-2 text-gray-600">Loading submissions...</p>
          </div>
        ) : recentSubmissions.length > 0 ? (
          <div className="space-y-3">
            {recentSubmissions.map((submission) => (
              <div
                key={submission._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors hover:shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900 line-clamp-1">{submission.title}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                      {getStatusIcon(submission.status)}
                      <span className="ml-1 capitalize">{submission.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="capitalize">{submission.content_type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{submission.task_category}</span>
                    <span>•</span>
                    {/* FIXED: Use the corrected formatPayment function */}
                    <span className="font-semibold text-green-600">{formatPayment(submission.payment_amount)}</span>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {new Date(submission.submission_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500 mb-4">No submissions yet</p>
            <Link
              href="/dashboard/content/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
