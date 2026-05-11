// app/dashboard/layout.tsx - MODERNIZED WITH ADVANCED STYLING
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { signOut, useSession } from 'next-auth/react';
import SideNav from '@/app/ui/dashboard/sidenav';
import BottomNav from '@/app/ui/dashboard/BottomNav';
import HamburgerMenu from '@/app/ui/dashboard/HamburgerMenu';
import Alert from '@/app/ui/Alert';
import { Loader2, LogOut, FileText, Plus, BookOpen, Sparkles } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardProvider } from './DashboardContext';
import { getUserProfile } from '../actions/user';
import { getReferrals } from '../actions/referrals';
import { getTransactions } from '../actions/transactions';
import Link from 'next/link';
import SessionMonitor from '@/app/components/SessionMonitor';
import SessionDebugger from '@/app/components/SessionDebugger'
import UserChatWidget from '@/app/components/chat/UserChatWidget';

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [shouldCheckStatus, setShouldCheckStatus] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
    
  const { data: session, status, update } = useSession();

  // Fix: Ensure component is mounted before any state updates that might trigger navigation
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    console.log('🔐 DASHBOARD LAYOUT - Session changed:', {
      status,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      fullSession: session
    });
  }, [session, status, isMounted]);

  const getCurrentSection = () => {
    if (pathname?.includes('/dashboard/content')) return 'content';
    if (pathname?.includes('/dashboard/blog')) return 'blog';
    if (pathname?.includes('/dashboard/wallet')) return 'wallet';
    if (pathname?.includes('/dashboard/surveys')) return 'surveys';
    if (pathname?.includes('/dashboard/referrals')) return 'referrals';
    if (pathname?.includes('/dashboard/support')) return 'support';
    if (pathname?.includes('/dashboard/settings')) return 'settings';
    if (pathname?.includes('/dashboard/soko')) return 'affiliate';
    return 'dashboard';
  };

  const externalApiToken = useMemo(() => {
    if (!isMounted) return null;
    
    console.log('🔄 External API Token update:', { 
      hasToken: !!(session as any)?.accessToken,
      sessionKeys: session ? Object.keys(session) : 'no session'
    });
    return (session as any)?.accessToken || null; 
  }, [session, isMounted]);

  const authenticatedApiFetch = useCallback(
    <T,>(endpoint: string, method: 'GET' | 'POST', data?: any) => 
      apiFetch<T>(endpoint, method, data, externalApiToken || undefined),
    [externalApiToken]
  );

  const fetchUser = useCallback(async () => {
    if (!isMounted) return false;
    
    console.log('🔄 fetchUser called:', { 
      status, 
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      hasAttemptedFetch 
    });

    if (status !== 'authenticated' || !session?.user?.id) {
      console.log('❌ fetchUser: Session not ready yet', { status, hasUserId: !!session?.user?.id });
      return false;
    }

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
        // Don't throw error for unauthorized - just handle gracefully
        if (profileResult.message?.includes('Unauthorized') || profileResult.message?.includes('401')) {
          console.log('🔐 fetchUser: Unauthorized - likely logged out');
          setError('Session expired. Please log in again.');
          setLoadingApp(false);
          return false;
        }
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
      setShouldCheckStatus(true);
      console.log('✅ fetchUser: Success! User set:', transformedUser);
      return true;
    } catch (err) {
      console.error('❌ fetchUser: Failed -', err);
      setUser(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data. Please try again.');
      setLoadingApp(false);
      setHasAttemptedFetch(false);
      return false;
    }
  }, [status, session, hasAttemptedFetch, isMounted]);

  const checkUserStatus = useCallback(async (userToCheck: User) => {
    if (!isMounted) return;
    
    console.log('👤 User status check:', userToCheck);

    if (userToCheck.status === 'banned') {
      await signOut({ redirect: false });
      console.log('Redirecting to /auth/login (banned)');
      // Use setTimeout to avoid React state update during render
      setTimeout(() => {
        router.push(`/auth/login?status=banned&reason=${encodeURIComponent(userToCheck.banReason || 'Your account has been permanently banned.')}`);
      }, 0);
      return;
    }

    if (userToCheck.status === 'suspended' && userToCheck.suspendedAt) {
      const suspendedUntil = new Date(userToCheck.suspendedAt).getTime();
      const now = Date.now();
      if (suspendedUntil > now) {
        await signOut({ redirect: false });
        let message = `Your account has been suspended. Until: ${new Date(userToCheck.suspendedAt).toLocaleString()}.`;
        if (userToCheck.suspensionReason) message += ` Reason: ${userToCheck.suspensionReason}`;
        console.log('Redirecting to /auth/login (suspended)');
        setTimeout(() => {
          router.push(`/auth/login?status=suspended&message=${encodeURIComponent(message)}`);
        }, 0);
      } else {
        const unsuspendResult = await authenticatedApiFetch('/api/unsuspend', 'POST', { userId: userToCheck.id });
        console.log('Unsuspend result (API call):', unsuspendResult);
        if (unsuspendResult.success) {
          setHasAttemptedFetch(false);
        }
      }
      return;
    }

    if (!userToCheck.isVerified) {
      await signOut({ redirect: false });
      console.log('Redirecting to /auth/login (unverified)');
      setTimeout(() => {
        router.push(`/auth/login?status=unverified_email&email=${encodeURIComponent(userToCheck.email || '')}`);
      }, 0);
      return;
    }

    if (!userToCheck.isActive) {
      console.log('Redirecting to /auth/activate');
      setTimeout(() => {
        router.push('/auth/activate');
      }, 0);
      return;
    }

    if (!userToCheck.isApproved) {
      console.log('Redirecting to /auth/pending-approval');
      setTimeout(() => {
        router.push('/auth/pending-approval');
      }, 0);
      return;
    }
  }, [authenticatedApiFetch, router, isMounted]);

  const fetchMpesaChangeRequests = useCallback(async () => {
    if (!user || !isMounted) return;
    
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
  }, [user, authenticatedApiFetch, isMounted]);

  // Main auth effect - fixed to prevent state updates during render
  useEffect(() => {
    if (!isMounted) return;
    
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
      setTimeout(() => {
        router.push('/auth/login');
      }, 0);
      return;
    }

    if (status === 'authenticated') {
      if (session?.user?.id) {
        console.log('✅ Session ready with user.id:', session.user.id);
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
        // Don't call update during render - use timeout
        setTimeout(() => {
          update();
        }, 0);
      }
    }
  }, [status, session, user, fetchUser, router, update, hasAttemptedFetch, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    
    if (shouldCheckStatus && user) {
      console.log('👤 User data loaded, running status checks');
      checkUserStatus(user);
      fetchMpesaChangeRequests();
      setShouldCheckStatus(false);
    }
  }, [shouldCheckStatus, user, checkUserStatus, fetchMpesaChangeRequests, isMounted]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut || !isMounted) return;
    
    setIsLoggingOut(true);
    try {
      // Clear local state first to prevent any further API calls
      setUser(null);
      setError(null);
      setLoadingApp(false);
      setHasAttemptedFetch(false);
      
      // Then call logout APIs
      try {
        await authenticatedApiFetch('/api/auth/logout', 'POST'); 
      } catch(e) {
        console.warn("Custom logout API call failed, proceeding with NextAuth signOut.", e);
      }
      
      await signOut({ redirect: false });
      console.log('Logging out, redirecting to /auth/login');
      
      // Use setTimeout to avoid React state updates during render
      setTimeout(() => {
        router.push('/auth/login');
      }, 0);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, still redirect to login
      setTimeout(() => {
        router.push('/auth/login');
      }, 0);
    } finally {
      if (isMounted) {
        setIsLoggingOut(false);
      }
    }
  }, [authenticatedApiFetch, router, isLoggingOut, isMounted]);

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

  // Don't render anything until component is mounted to avoid hydration issues
  if (!isMounted) {
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30">
        <div className="text-center">
          <div className="relative inline-flex">
            <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
          </div>
        </div>
      </div>
    );
  }

  if (isOverallLoading) {
    console.log('⏳ Layout: Loading - status:', status, 'hasUserId:', !!session?.user?.id, 'loadingApp:', loadingApp, 'hasUser:', !!user);
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30">
        <div className="text-center">
          <div className="relative inline-flex">
            <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 className="text-cyan-400 w-12 h-12 opacity-20" />
            </div>
          </div>
          <p className="mt-4 text-lg font-medium text-slate-700">Loading application data...</p>
          <p className="mt-1 text-sm text-slate-500">Please wait while we prepare your dashboard</p>
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && session?.user?.id && !user && error) {
    console.log('❌ Layout: Authenticated with user.id but no user data loaded - error:', error);
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gradient-to-br from-red-50 via-orange-50/30 to-red-50/30">
        <div className="text-center p-8 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-red-200/50 max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 font-semibold mb-4">Failed to load user data</p>
          <p className="text-sm text-red-500 mb-6">{error}</p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Signing Out...' : 'Sign Out and Re-Login'}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && session?.user?.id && !user && !loadingApp) {
    console.log('🔄 Layout: Should have user but none found - attempting refetch');
    if (!hasAttemptedFetch) {
      // Use timeout to avoid state update during render
      setTimeout(() => {
        fetchUser();
      }, 0);
    }
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30">
        <div className="text-center">
          <div className="relative inline-flex">
            <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 className="text-cyan-400 w-10 h-10 opacity-20" />
            </div>
          </div>
          <p className="mt-3 text-base font-medium text-slate-700">Finalizing user session...</p>
        </div>
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
      <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-cyan-50/20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-cyan-400/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <SideNav userName={user.name} onLogout={handleLogout} />
        
        <main className="flex-1 p-4 md:p-8 pb-20 lg:pb-8 relative z-10 h-screen overflow-y-auto main-content-scrollbar">
          {/* Mobile Header with Glassmorphism */}
          <header className="lg:hidden flex justify-between items-center mb-6 bg-white/70 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                HustleHub
              </h1>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center space-x-2 text-red-500 hover:text-red-700 transition-all duration-250 p-2 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <LogOut size={20} />
              <span className="font-semibold text-sm">
                {isLoggingOut ? 'Logging Out...' : 'Logout'}
              </span>
            </button>
          </header>
	
          <SessionDebugger />
          
          {/* Quick Action Buttons with Modern Design */}
          {(getCurrentSection() === 'dashboard' || getCurrentSection() === 'content') && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/content/create"
                  className="group inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-250 transform hover:scale-105"
                >
                  <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-250" />
                  Create Content
                </Link>
                <Link
                  href="/dashboard/content"
                  className="inline-flex items-center px-5 py-3 border-2 border-slate-200 bg-white/70 backdrop-blur-sm text-slate-700 font-semibold rounded-xl hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all duration-250 shadow-sm hover:shadow-md"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  My Submissions
                </Link>
                <Link
                  href="/dashboard/blog"
                  className="inline-flex items-center px-5 py-3 border-2 border-slate-200 bg-white/70 backdrop-blur-sm text-slate-700 font-semibold rounded-xl hover:bg-white hover:border-cyan-300 hover:text-cyan-600 transition-all duration-250 shadow-sm hover:shadow-md"
                >
                  <BookOpen className="w-5 h-5 mr-2" />
                  Read Blogs
                </Link>
              </div>
            </div>
          )}

          {/* Section Headers with Gradient */}
          <div className="mb-6">
            {getCurrentSection() === 'content' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Content Management
                </h1>
                <p className="text-slate-600 mt-2">Create and manage your content submissions</p>
              </div>
            )}
            {getCurrentSection() === 'blog' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Blog Posts
                </h1>
                <p className="text-slate-600 mt-2">Read and learn from our blog posts</p>
              </div>
            )}
            {getCurrentSection() === 'wallet' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Wallet & Payments
                </h1>
                <p className="text-slate-600 mt-2">Manage your balance and transactions</p>
              </div>
            )}
            {getCurrentSection() === 'surveys' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Earn Surveys
                </h1>
                <p className="text-slate-600 mt-2">Complete surveys and earn money</p>
              </div>
            )}
            {getCurrentSection() === 'referrals' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Referrals
                </h1>
                <p className="text-slate-600 mt-2">Invite friends and earn rewards</p>
              </div>
            )}
            {getCurrentSection() === 'support' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Help & Support
                </h1>
                <p className="text-slate-600 mt-2">Get help and support</p>
              </div>
            )}
            {getCurrentSection() === 'settings' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-slate-600 mt-2">Manage your account settings</p>
              </div>
            )}
            {getCurrentSection() === 'affiliate' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Affiliate Marketing
                </h1>
                <p className="text-slate-600 mt-2">Promote products and earn commissions</p>
              </div>
            )}
            {getCurrentSection() === 'dashboard' && (
              <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/50">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-slate-600 mt-2">Welcome back, {user.name}! 👋</p>
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
        
        <HamburgerMenu userName={user.name} />
      </div>

      <UserChatWidget />
    </>
  );
}
