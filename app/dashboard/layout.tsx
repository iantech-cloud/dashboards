// app/dashboard/layout.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { signOut, getSession } from 'next-auth/react';
import SideNav from '@/app/ui/dashboard/sidenav';
import BottomNav from '@/app/ui/dashboard/BottomNav';
import Alert from '@/app/ui/Alert';
import { Loader2, LogOut, FileText, Plus, BookOpen } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardProvider } from './DashboardContext';
import { getUserProfile } from '../actions/user';
import { getReferrals } from '../actions/referrals';
import { getTransactions } from '../actions/transactions';
import Link from 'next/link';

const MAX_RETRIES = 3;

// Generic API fetch function for external APIs (keep this for external calls)
async function apiFetch<T>(
  endpoint: string,
  method: 'GET' | 'POST',
  data?: any,
  token?: string
): Promise<{ success: boolean; data?: T; message: string }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    }

    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(endpoint, options);

      let result: { success: boolean; data?: T; message: string };
      const contentType = response.headers.get('content-type');
      
      if (response.status === 204 || (contentType && !contentType.includes('application/json'))) {
        if (response.ok) {
          result = { success: true, message: 'No content', data: {} as T };
        } else {
          const errorText = await response.text();
          return { success: false, message: errorText || `Client Error: ${response.statusText}` };
        }
      } else {
        try {
          result = await response.json();
        } catch (e) {
          console.error('Failed to parse JSON response:', e);
          return { success: false, message: 'The server returned an invalid JSON response.' };
        }
      }

      if (response.ok) {
        return result;
      }

      if (response.status === 401 || response.status < 500) {
        return { success: false, message: result.message || `Client Error: ${response.statusText}` };
      }

      console.warn(`Attempt ${attempt + 1} failed for ${endpoint}. Retrying in ${Math.pow(2, attempt)}s...`);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } else {
        return { success: false, message: result.message || `Server Error: ${response.statusText}` };
      }
    } catch (error) {
      console.error(`Fetch error on attempt ${attempt + 1}:`, error);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } else {
        return { success: false, message: 'Network or internal error after multiple retries.' };
      }
    }
  }
  return { success: false, message: 'Exceeded max retries.' };
}

interface User {
  id: string;
  name: string;
  phone: string;
  balance: number;
  referralCode: string;
  totalEarnings: number;
  tasksCompleted: number;
  isVerified: boolean;
  isActive: boolean;
  isApproved: boolean;
  role: string;
  status: string;
  banReason?: string;
  bannedAt?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  level: number;
  rank: string;
  availableSpins: number;
  lastWithdrawalDate?: string;
  email: string;
}

// Helper function to fetch dashboard data using server actions
async function fetchDashboardData(userId: string) {
  try {
    // Fetch user profile using server action
    const profileResult = await getUserProfile();
    if (!profileResult.success || !profileResult.data) {
      throw new Error(profileResult.message || 'Failed to fetch user profile');
    }

    const userData = profileResult.data;

    // Fetch additional data using server actions
    const [referralsResult, transactionsResult] = await Promise.all([
      getReferrals(),
      getTransactions()
    ]);

    // Transform data to match your existing DashboardData structure
    return {
      profile: {
        username: userData.name,
        phone_number: userData.phone,
        referral_id: userData.referralCode,
        email: userData.email,
        is_verified: userData.isVerified,
        is_active: userData.isActive,
        is_approved: userData.isApproved,
        status: userData.status,
        ban_reason: userData.banReason,
        banned_at: userData.bannedAt,
        suspension_reason: userData.suspensionReason,
        suspended_at: userData.suspendedAt,
        level: userData.level,
        rank: userData.rank,
        total_earnings: userData.totalEarnings,
        tasks_completed: userData.tasksCompleted,
        available_spins: userData.availableSpins,
      },
      stats: {
        totalEarnings: userData.totalEarnings,
        availableBalance: userData.balance,
        pendingWithdrawals: 0, // You might want to fetch this separately
        referralCount: referralsResult.success ? referralsResult.data?.length || 0 : 0,
        directReferralEarnings: 0, // Calculate from transactions
        downlineCount: 0, // Calculate from referrals
        downlineEarnings: 0, // Calculate from transactions
        level: userData.level,
        rank: userData.rank,
        availableSpins: userData.availableSpins,
      },
      receipts: [], // You might want to create a getReceipts action
      transactions: transactionsResult.success ? transactionsResult.data || [] : []
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mpesaNotification, setMpesaNotification] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Determine current section for navigation highlighting
  const getCurrentSection = () => {
    if (pathname?.includes('/dashboard/content')) return 'content';
    if (pathname?.includes('/dashboard/blog')) return 'blog';
    if (pathname?.includes('/dashboard/wallet')) return 'wallet';
    if (pathname?.includes('/dashboard/surveys')) return 'surveys';
    if (pathname?.includes('/dashboard/referrals')) return 'referrals';
    if (pathname?.includes('/dashboard/help')) return 'help';
    if (pathname?.includes('/dashboard/settings')) return 'settings';
    return 'dashboard';
  };

  // Use server actions instead of API calls for internal operations
  const authenticatedApiFetch = useCallback(
    <T,>(endpoint: string, method: 'GET' | 'POST', data?: any) => 
      apiFetch<T>(endpoint, method, data, authToken || undefined),
    [authToken]
  );

  const fetchUser = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const session = await getSession();
      
      if (!session?.user?.id) {
        throw new Error('No active session found. Please log in again.');
      }

      // Use server action to get user profile
      const profileResult = await getUserProfile();
      
      if (!profileResult.success || !profileResult.data) {
        throw new Error(profileResult.message || 'Failed to fetch user data');
      }

      const userData = profileResult.data;

      const transformedUser: User = {
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        balance: userData.balance,
        referralCode: userData.referralCode,
        totalEarnings: userData.totalEarnings,
        tasksCompleted: userData.tasksCompleted,
        isVerified: userData.isVerified,
        isActive: userData.isActive,
        isApproved: userData.isApproved,
        role: userData.role,
        status: userData.status,
        banReason: userData.banReason,
        bannedAt: userData.bannedAt,
        suspensionReason: userData.suspensionReason,
        suspendedAt: userData.suspendedAt,
        level: userData.level,
        rank: userData.rank,
        availableSpins: userData.availableSpins,
        lastWithdrawalDate: userData.lastWithdrawalDate,
        email: userData.email,
      };

      setUser(transformedUser);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setUser(null);
      setAuthToken(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data. Please try again.');
      setLoading(false);
      return false;
    }
  }, []);

  const checkUserStatus = useCallback(async () => {
    if (!user) return;

    console.log('User status:', user);

    if (user.status === 'banned') {
      await signOut({ redirect: false });
      console.log('Redirecting to /auth/login (banned)');
      router.push(`/auth/login?status=banned&reason=${encodeURIComponent(user.banReason || 'Your account has been permanently banned.')}`);
      return;
    }

    if (user.status === 'suspended' && user.suspendedAt) {
      const suspendedUntil = new Date(user.suspendedAt).getTime();
      const now = Date.now();
      if (suspendedUntil > now) {
        await signOut({ redirect: false });
        let message = `Your account has been suspended. Until: ${new Date(user.suspendedAt).toLocaleString()}.`;
        if (user.suspensionReason) message += ` Reason: ${user.suspensionReason}`;
        console.log('Redirecting to /auth/login (suspended)');
        router.push(`/auth/login?status=suspended&message=${encodeURIComponent(message)}`);
      } else {
        // Use server action for unsuspend
        const unsuspendResult = await authenticatedApiFetch('/api/unsuspend', 'POST', { userId: user.id });
        console.log('Unsuspend result:', unsuspendResult);
        if (unsuspendResult.success) await fetchUser();
      }
      return;
    }

    if (!user.isVerified) {
      await signOut({ redirect: false });
      console.log('Redirecting to /auth/login (unverified)');
      router.push(`/auth/login?status=unverified_email&email=${encodeURIComponent(user.email || '')}`);
      return;
    }

    if (!user.isActive) {
      console.log('Redirecting to /activate');
      router.push('/activate');
      return;
    }

    if (!user.isApproved) {
      console.log('Redirecting to /pending-approval');
      router.push('/pending-approval');
      return;
    }
  }, [user, authenticatedApiFetch, router, fetchUser]);

  const fetchMpesaChangeRequests = useCallback(async () => {
    if (!user) return;
    
    // You might want to create a server action for this
    const result = await authenticatedApiFetch<any[]>('/api/mpesa-change-requests', 'GET');
    console.log('fetchMpesaChangeRequests result:', result);
    
    if (result.success && result.data && result.data.length > 0) {
      const latestRequest = result.data[0];
      if (latestRequest.status !== 'pending' && latestRequest.processed_date) {
        const processedTimestamp = new Date(latestRequest.processed_date).getTime();
        const recentThreshold = Date.now() - 24 * 60 * 60 * 1000;
        const notificationId = `${latestRequest.id}_${latestRequest.status}_${latestRequest.processed_date}`;
        const lastNotificationId = localStorage.getItem('last_mpesa_notification_id');

        if (processedTimestamp > recentThreshold && lastNotificationId !== notificationId) {
          setMpesaNotification(latestRequest);
          localStorage.setItem('last_mpesa_notification_id', notificationId);
        }
      }
    }
  }, [user, authenticatedApiFetch]);

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      try {
        const session = await getSession();
        console.log('Session check:', { session });
        
        if (!session) {
          console.log('No session, redirecting to /auth/login');
          router.push('/auth/login');
          return;
        }

        const success = await fetchUser();
        if (!success) {
          console.log('No user data, redirecting to /auth/login');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Session error:', error);
        setLoading(false);
        router.push('/auth/login');
      }
    };
    checkSession();
  }, [fetchUser, router]);

  useEffect(() => {
    if (user) {
      checkUserStatus();
      fetchMpesaChangeRequests();
    }
  }, [user, checkUserStatus, fetchMpesaChangeRequests]);

  const handleLogout = useCallback(async () => {
    // Use server action for logout if you create one, otherwise keep API call
    await authenticatedApiFetch('/api/auth/logout', 'POST');
    setUser(null);
    setAuthToken(null);
    setError(null);
    setLoading(false);
    await signOut({ redirect: false });
    console.log('Logging out, redirecting to /auth/login');
    router.push('/auth/login');
  }, [authenticatedApiFetch, router]);

  if (loading || !user) {
    console.log('Layout: Skipping render, loading:', loading, 'user:', user);
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
        <p className="ml-2 text-gray-600">Loading application data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      <SideNav userName={user.name} onLogout={handleLogout} />
      <main className="flex-1 p-4 md:p-8 pb-20 lg:pb-8">
        {/* Mobile Header */}
        <header className="lg:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-md">
          <h1 className="text-2xl font-bold text-gray-800">HustleHub</h1>
          <button
            onClick={handleLogout}
            className="flex items-center text-red-500 hover:text-red-700 transition-colors p-2 rounded-full bg-red-50 hover:bg-red-100"
          >
            <LogOut size={20} className="mr-1" />
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </header>

        {/* Content Creation Quick Actions - Only show on relevant pages */}
        {(getCurrentSection() === 'dashboard' || getCurrentSection() === 'content') && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/content/create"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Content
              </Link>
              <Link
                href="/dashboard/content"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-5 h-5 mr-2" />
                My Submissions
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
        )}

        {/* Section Header */}
        <div className="mb-6">
          {getCurrentSection() === 'content' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
              <p className="text-gray-600 mt-1">Create and manage your content submissions</p>
            </div>
          )}
          {getCurrentSection() === 'blog' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
              <p className="text-gray-600 mt-1">Read and learn from our blog posts</p>
            </div>
          )}
          {getCurrentSection() === 'wallet' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Wallet & Payments</h1>
              <p className="text-gray-600 mt-1">Manage your balance and transactions</p>
            </div>
          )}
          {getCurrentSection() === 'surveys' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Earn Surveys</h1>
              <p className="text-gray-600 mt-1">Complete surveys and earn money</p>
            </div>
          )}
          {getCurrentSection() === 'referrals' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
              <p className="text-gray-600 mt-1">Invite friends and earn rewards</p>
            </div>
          )}
          {getCurrentSection() === 'help' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
              <p className="text-gray-600 mt-1">Get help and support</p>
            </div>
          )}
          {getCurrentSection() === 'settings' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account settings</p>
            </div>
          )}
          {getCurrentSection() === 'dashboard' && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.name}!</p>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {mpesaNotification && (
            <Alert
              type={mpesaNotification.status === 'approved' ? 'success' : 'error'}
              message={`M-Pesa change request ${mpesaNotification.status}. ${mpesaNotification.admin_feedback || ''}`}
              onClose={() => setMpesaNotification(null)}
            />
          )}
          <DashboardProvider value={{ user, apiFetch: authenticatedApiFetch }}>
            {children}
          </DashboardProvider>
        </div>
      </main>
      
      {/* Bottom Navigation - Pass userName for mobile display */}
      <BottomNav userName={user.name} />
    </div>
  );
}
