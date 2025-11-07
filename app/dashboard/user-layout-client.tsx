// app/dashboard/user-layout-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

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
  authMethod?: 'google' | 'credentials';
  profileCompleted?: boolean;
  activationPaidAt?: string;
  isActivationPaid?: boolean;
}

interface UserLayoutClientProps {
  user: User;
  children: React.ReactNode;
}

export default function UserLayoutClient({ user, children }: UserLayoutClientProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      console.log('🔍 UserLayoutClient - Checking user access:', {
        email: user.email,
        authMethod: user.authMethod,
        isVerified: user.isVerified,
        profileCompleted: user.profileCompleted,
        activationPaidAt: user.activationPaidAt,
        isApproved: user.isApproved,
        isActive: user.isActive,
        status: user.status
      });

      // Check for banned/suspended status first
      if (user.status === 'banned') {
        console.log('🚫 User banned, redirecting to login');
        router.push(`/auth/login?status=banned&reason=${encodeURIComponent(user.banReason || 'Your account has been permanently banned.')}`);
        return;
      }

      if (user.status === 'suspended' && user.suspendedAt) {
        const suspendedUntil = new Date(user.suspendedAt).getTime();
        const now = Date.now();
        if (suspendedUntil > now) {
          let message = `Your account has been suspended. Until: ${new Date(user.suspendedAt).toLocaleString()}.`;
          if (user.suspensionReason) message += ` Reason: ${user.suspensionReason}`;
          console.log('🚫 User suspended, redirecting to login');
          router.push(`/auth/login?status=suspended&message=${encodeURIComponent(message)}`);
          return;
        }
      }

      // Check email verification (common to both auth methods)
      if (!user.isVerified) {
        console.log('📧 Email not verified, redirecting to verify-email');
        router.push('/auth/verify-email');
        return;
      }

      const authMethod = user.authMethod || 'credentials';

      // For Google OAuth Users
      if (authMethod === 'google') {
        // Check profile completion
        if (!user.profileCompleted) {
          console.log('👤 OAuth user - Profile not completed, redirecting to complete-profile');
          router.push('/auth/complete-profile');
          return;
        }

        // Check activation payment
        if (!user.isActivationPaid && !user.activationPaidAt) {
          console.log('💰 OAuth user - Activation not paid, redirecting to activate');
          router.push('/auth/activate');
          return;
        }

        // Check if approved
        if (!user.isApproved) {
          console.log('⏳ OAuth user - Not approved, redirecting to pending-approval');
          router.push('/auth/pending-approval');
          return;
        }

        // Check if active
        if (!user.isActive) {
          console.log('❌ OAuth user - Not active, redirecting to pending-approval');
          router.push('/auth/pending-approval');
          return;
        }
      }

      // For Email/Credentials Users
      if (authMethod === 'credentials') {
        console.log('🔐 Credentials user - Skipping profile completion check');

        // Check activation payment
        if (!user.isActivationPaid && !user.activationPaidAt) {
          console.log('💰 Credentials user - Activation not paid, redirecting to activate');
          router.push('/auth/activate');
          return;
        }

        // Check if approved
        if (!user.isApproved) {
          console.log('⏳ Credentials user - Not approved, redirecting to pending-approval');
          router.push('/auth/pending-approval');
          return;
        }

        // Check if active
        if (!user.isActive) {
          console.log('❌ Credentials user - Not active, redirecting to pending-approval');
          router.push('/auth/pending-approval');
          return;
        }
      }

      console.log('✅ User access checks passed - rendering dashboard');
      setIsChecking(false);
    };

    checkUserAccess();
  }, [user, router]);

  if (isChecking) {
    return (
      <div className="flex justify-center items-center h-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30">
        <div className="text-center">
          <div className="relative inline-flex">
            <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 className="text-cyan-400 w-12 h-12 opacity-20" />
            </div>
          </div>
          <p className="mt-4 text-lg font-medium text-slate-700">Verifying account access...</p>
          <p className="mt-1 text-sm text-slate-500">Please wait while we check your account status</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
