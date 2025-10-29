// app/dashboard/layout.tsx - DEBUGGING VERSION
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { signOut, useSession } from 'next-auth/react';
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
import SessionMonitor from '@/app/components/SessionMonitor';
import SessionDebugger from '@/app/components/SessionDebugger';
const MAX_RETRIES = 3;

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mpesaNotification, setMpesaNotification] = useState<any>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
    
  const { data: session, status, update } = useSession();

  // DEBUG: Log session changes
  useEffect(() => {
    console.log('🔐 DASHBOARD LAYOUT - Session changed:', {
      status,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      fullSession: session
    });
  }, [session, status]);

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

  const externalApiToken = useMemo(() => {
    console.log('🔄 External API Token update:', { 
      hasToken: !!(session as any)?.accessToken,
      sessionKeys: session ? Object.keys(session) : 'no session'
    });
    return (session as any)?.accessToken || null; 
  }, [session]);

  const authenticatedApiFetch = useCallback(
    <T,>(endpoint: string, method: 'GET' | 'POST', data?: any) => 
      apiFetch<T>(endpoint, method, data, externalApiToken || undefined),
    [externalApiToken]
  );

  // FIXED: Only fetch user data when session is fully populated
  const fetchUser = useCallback(async () => {
    console.log('🔄 fetchUser called:', { 
      status, 
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      hasAttemptedFetch 
    });

    // CRITICAL FIX: Check both status and session.user
    if (status !== 'authenticated' || !session?.user?.id) {
      console.log('❌ fetchUser: Session not ready yet', { status, hasUserId: !!session?.user?.id });
      return false;
    }

    // Prevent multiple fetch attempts
    if (hasAttemptedFetch) {
      console.log('⏸️ fetchUser: Already attempted fetch, skipping');
      return false;
    }

    setError(null);
    setLoadingApp(true);
    setHasAttemptedFetch(true);

    try {
      console.log('🚀 fetchUser: Starting with session user:', session.user.id);

      const profileResult = await getUserProfile();
      console.log('📊 fetchUser: Profile result:', profileResult);
      
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
      setLoadingApp(false);
      console.log('✅ fetchUser: Success! User set:', transformedUser);
      return true;
    } catch (err) {
      console.error('❌ fetchUser: Failed -', err);
      setUser(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data. Please try again.');
      setLoadingApp(false);
      setHasAttemptedFetch(false); // Reset to allow retry
      return false;
    }
  }, [status, session, hasAttemptedFetch]);

  const checkUserStatus = useCallback(async () => {
    if (!user) return;

    console.log('👤 User status check:', user);

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
        const unsuspendResult = await authenticatedApiFetch('/api/unsuspend', 'POST', { userId: user.id });
        console.log('Unsuspend result (API call):', unsuspendResult);
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

  // FIXED: Primary authentication gate - wait for session to be fully loaded
  useEffect(() => {
    console.log('🎯 Auth useEffect:', { 
      status, 
      hasSession: !!session, 
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      user: !!user,
      hasAttemptedFetch
    });
    
    if (status === 'loading') {
      console.log('⏳ Session still loading...');
      return;
    }

    if (status === 'unauthenticated') {
      console.log('🚫 Unauthenticated - redirecting to login');
      setLoadingApp(false);
      router.push('/auth/login');
      return;
    }

    // CRITICAL FIX: Wait for session.user.id to be populated with proper timing
    if (status === 'authenticated') {
      if (session?.user?.id) {
        console.log('✅ Session ready with user.id:', session.user.id);
        // Use setTimeout to ensure React has updated the state properly
        const timer = setTimeout(() => {
          if (!user && !hasAttemptedFetch) {
            console.log('📥 Fetching user data now...');
            fetchUser();
          } else {
            console.log('ℹ️  Skipping fetch - user exists or already attempted');
          }
        }, 100);
        
        return () => clearTimeout(timer);
      } else {
        console.log('⚠️ Session authenticated but user.id not available yet - waiting...');
        // Force update to trigger re-render
        update();
      }
    }
  }, [status, session, user, fetchUser, router, update, hasAttemptedFetch]);

  // Run user status checks after user data is loaded
  useEffect(() => {
    if (user) {
      console.log('👤 User data loaded, running status checks');
      checkUserStatus();
      fetchMpesaChangeRequests();
    }
  }, [user, checkUserStatus, fetchMpesaChangeRequests]);

  const handleLogout = useCallback(async () => {
    try {
      await authenticatedApiFetch('/api/auth/logout', 'POST'); 
    } catch(e) {
      console.warn("Custom logout API call failed, proceeding with NextAuth signOut.", e);
    }
    
    setUser(null);
    setError(null);
    setLoadingApp(false);
    setHasAttemptedFetch(false);
    await signOut({ redirect: false });
    console.log('Logging out, redirecting to /auth/login');
    router.push('/auth/login');
  }, [authenticatedApiFetch, router]);

  // FIXED: Better loading state logic
  const isOverallLoading = 
    status === 'loading' || 
    (status === 'authenticated' && !session?.user?.id) || 
    (status === 'authenticated' && session?.user?.id && loadingApp && !user);

  console.log('📊 Layout render state:', {
    isOverallLoading,
    status,
    hasUserId: !!session?.user?.id,
    loadingApp,
    hasUser: !!user,
    userId: session?.user?.id
  });

  if (isOverallLoading) {
    console.log('⏳ Layout: Loading - status:', status, 'hasUserId:', !!session?.user?.id, 'loadingApp:', loadingApp, 'hasUser:', !!user);
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
        <p className="ml-2 text-gray-600">Loading application data...</p>
      </div>
    );
  }

  // Show error if authenticated with user.id but failed to fetch user data
  if (status === 'authenticated' && session?.user?.id && !user && error) {
    console.log('❌ Layout: Authenticated with user.id but no user data loaded - error:', error);
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load user data: {error}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Sign Out and Re-Login
          </button>
        </div>
      </div>
    );
  }

  // CRITICAL FIX: Ensure user is loaded before rendering children
  if (status === 'authenticated' && session?.user?.id && !user && !loadingApp) {
    console.log('🔄 Layout: Should have user but none found - attempting refetch');
    // This should trigger the fetchUser again
    if (!hasAttemptedFetch) {
      fetchUser();
    }
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
        <p className="ml-2 text-gray-600">Finalizing user session...</p>
      </div>
    );
  }

  if (!user) {
    console.log('❌ Layout: No user - returning null');
    return null;
  }

  console.log('✅ Layout: Rendering with user:', user.name);
  return (
    <>
      <SessionMonitor />
      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
        <SideNav userName={user.name} onLogout={handleLogout} />
        <main className="flex-1 p-4 md:p-8 pb-20 lg:pb-8">
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
	
	<SessionDebugger />
          {/* ... rest of your JSX remains the same ... */}
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
        
        <BottomNav userName={user.name} />
      </div>
    </>
  );
}
