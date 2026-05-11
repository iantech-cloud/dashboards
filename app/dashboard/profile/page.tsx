// app/dashboard/profile/page.tsx
"use client";

import { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Trophy,
  Copy,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Sparkles,
  Award,
  Hash,
} from 'lucide-react';
import { fetchDashboardData } from '@/app/lib/data';
import { useDashboard } from '../DashboardContext';

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

export default function ProfilePage() {
  const { user } = useDashboard();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboardData(user.id);
        if (!cancelled) setProfile(data.profile as Profile);
      } catch (err) {
        console.error('Failed to load profile data:', err);
        if (!cancelled) setError('Failed to load profile data. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCopyReferralCode = async (referralId: string) => {
    try {
      await navigator.clipboard.writeText(referralId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy referral code:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200 flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-slate-700 font-semibold">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 min-h-screen">
        <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-red-300 flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Unable to load profile</h2>
            <p className="text-sm text-slate-600 mt-1">{error || 'No profile data found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 min-h-screen relative">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-purple-400/10 to-transparent rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-teal-400/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>

      {/* Page Header */}
      <div className="relative mb-6 bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border-2 border-indigo-500 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/50 flex-shrink-0">
              <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 truncate">
                {profile.username}
              </h1>
              <p className="text-slate-600 mt-1 text-xs sm:text-sm">Your account profile and details</p>
            </div>
          </div>
          <div className={`px-3 sm:px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm shadow-md whitespace-nowrap ${
            profile.is_approved
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
          }`}>
            {profile.is_approved ? 'Approved' : 'Pending Approval'}
          </div>
        </div>
      </div>

      {/* Account Details Card */}
      <div className={`relative mb-6 bg-white rounded-2xl p-4 sm:p-6 shadow-xl border-2 overflow-hidden ${
        profile.is_approved ? 'border-emerald-500' : 'border-orange-500'
      }`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          profile.is_approved ? 'bg-emerald-600' : 'bg-orange-600'
        }`}></div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center">
            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
            Account Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="flex items-center space-x-2 mb-1">
                <UserIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Username</span>
              </div>
              <p className="font-semibold text-slate-900 break-all text-sm sm:text-base">{profile.username}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="flex items-center space-x-2 mb-1">
                <Phone className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</span>
              </div>
              <p className="font-semibold text-slate-900 break-all text-sm sm:text-base">{profile.phone_number}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200 sm:col-span-2">
              <div className="flex items-center space-x-2 mb-1">
                <Mail className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</span>
              </div>
              <p className="font-semibold text-slate-900 break-all text-sm sm:text-base">{profile.email}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Level</span>
              </div>
              <p className="font-semibold text-slate-900 text-sm sm:text-base">Level {profile.level}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
              <div className="flex items-center space-x-2 mb-1">
                <Award className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rank</span>
              </div>
              <p className="font-semibold text-slate-900 text-sm sm:text-base">{profile.rank}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Card */}
      <div className="relative mb-6 bg-white rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-purple-500 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600"></div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-600" />
            Quick Stats
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 sm:p-4 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Total Earnings</p>
              <p className="text-base sm:text-xl font-bold text-emerald-900">KES {profile.total_earnings.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 sm:p-4 border border-cyan-200">
              <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide mb-1">Tasks Done</p>
              <p className="text-base sm:text-xl font-bold text-cyan-900">{profile.tasks_completed}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-3 sm:p-4 border border-red-200">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Available Spins</p>
              <p className="text-base sm:text-xl font-bold text-red-900">{profile.available_spins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code Card */}
      {profile.referral_id && (
        <div className="relative mb-6 bg-white rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-blue-500 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
          <div className="relative z-10">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center">
              <Hash className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
              Your Referral Code
            </h2>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 sm:p-5 rounded-2xl border border-blue-200 text-center">
              <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Share this code to earn referral bonuses</p>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4 font-mono break-all">
                {profile.referral_id}
              </p>
              <button
                onClick={() => handleCopyReferralCode(profile.referral_id!)}
                className="w-full sm:w-auto py-2 px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-250 transform hover:scale-105 inline-flex items-center justify-center space-x-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status notices */}
      {profile.status === 'suspended' && profile.suspension_reason && (
        <div className="relative mb-6 bg-white rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-orange-500 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-600"></div>
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Account Suspended</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">{profile.suspension_reason}</p>
            </div>
          </div>
        </div>
      )}

      {profile.status === 'banned' && profile.ban_reason && (
        <div className="relative mb-6 bg-white rounded-2xl p-4 sm:p-6 shadow-xl border-2 border-red-500 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Account Banned</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">{profile.ban_reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
