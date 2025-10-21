// app/dashboard/referrals/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Alert from '@/app/ui/Alert';
import { useDashboard } from '../DashboardContext';
import { getReferrals, getReferralCommissionStats } from '@/app/actions/referrals';

interface Referral {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: 'active' | 'pending' | 'suspended' | 'banned';
  earnings: number;
  level?: number;
  rank?: string;
  referredUser?: string;
  earning?: number;
}

interface CommissionStats {
  directReferrals: {
    totalEarnings: number;
    count: number;
  };
  level1: {
    totalEarnings: number;
    count: number;
  };
  level2: {
    totalEarnings: number;
    count: number;
  };
  level3: {
    totalEarnings: number;
    count: number;
  };
  total: number;
}

export default function ReferralsPage() {
  const { user } = useDashboard();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissionStats, setCommissionStats] = useState<CommissionStats | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setStatsLoading(true);

        // Fetch referrals and commission stats in parallel using server actions
        const [referralsResult, statsResult] = await Promise.all([
          getReferrals(),
          getReferralCommissionStats()
        ]);

        if (referralsResult.success && referralsResult.data) {
          // Transform the data to ensure consistent structure
          const transformedReferrals = referralsResult.data.map(ref => ({
            ...ref,
            // Ensure earnings field exists and has a default value
            earnings: ref.earnings || ref.earning || 0,
            // Ensure referredUser field exists for display
            referredUser: ref.name || ref.email || 'Unknown User'
          }));
          setReferrals(transformedReferrals);
        } else {
          setMessage(referralsResult.message || 'Failed to load referrals.');
          setMessageType('error');
        }

        if (statsResult.success && statsResult.data) {
          setCommissionStats(statsResult.data);
        } else {
          console.error('Failed to load commission stats:', statsResult.message);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage('An error occurred while loading data.');
        setMessageType('error');
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    };
    
    fetchData();
  }, []); // Remove apiFetch dependency

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded mb-4 last:mb-0"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-2">Referrals</h2>
      
      {message && <Alert type={messageType} message={message} onClose={() => setMessage(null)} />}
      
      {/* Referral Code Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="font-bold text-lg mb-2 text-gray-800">Your Referral Code</h3>
        <div className="flex items-center gap-4 mb-4">
          <code className="text-xl font-mono text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg border-2 border-indigo-200">
            {user?.referralCode || 'Loading...'}
          </code>
          <button
            onClick={() => {
              if (user?.referralCode) {
                navigator.clipboard.writeText(user.referralCode);
                setMessage('Referral code copied to clipboard!');
                setMessageType('success');
              }
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Copy Code
          </button>
        </div>
        <p className="text-gray-600">Share this code with friends to earn bonuses when they sign up and become active!</p>
      </div>

      {/* Commission Breakdown Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Commission Breakdown</h3>
        
        {statsLoading ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="text-center p-4 bg-gray-100 rounded-lg">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : commissionStats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Total Commissions */}
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                KES {(commissionStats.total / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Commissions</div>
              <div className="text-xs text-blue-500 mt-1">All Levels</div>
            </div>

            {/* Direct Referrals */}
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                KES {(commissionStats.directReferrals.totalEarnings / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Direct Referrals</div>
              <div className="text-xs text-green-500 mt-1">
                {commissionStats.directReferrals.count} users × KSH 800
              </div>
            </div>

            {/* Level 1 Downline */}
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                KES {(commissionStats.level1.totalEarnings / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Level 1 Downline</div>
              <div className="text-xs text-yellow-500 mt-1">
                {commissionStats.level1.count} users × KSH 100
              </div>
            </div>

            {/* Level 2 Downline */}
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                KES {(commissionStats.level2.totalEarnings / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Level 2 Downline</div>
              <div className="text-xs text-orange-500 mt-1">
                {commissionStats.level2.count} users × KSH 50
              </div>
            </div>

            {/* Level 3 Downline */}
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                KES {(commissionStats.level3.totalEarnings / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Level 3 Downline</div>
              <div className="text-xs text-red-500 mt-1">
                {commissionStats.level3.count} users × KSH 25
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>Commission data not available</p>
          </div>
        )}

        {/* Commission Structure Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-semibold text-gray-800 mb-3">Commission Structure</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span><strong>Level 0:</strong> KSH 800 (Direct Referrals)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span><strong>Level 1:</strong> KSH 100 (Your downline's referrals)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span><strong>Level 2:</strong> KSH 50 (2 levels down)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span><strong>Level 3:</strong> KSH 25 (3 levels down)</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * Commissions are paid when referred users pay KSH 1000 activation fee and get approved.
          </p>
        </div>
      </div>

      {/* Referrals List Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Your Referral Network</h3>
        </div>
        
        {referrals.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg mb-2">No referrals yet</p>
            <p className="text-gray-400 text-sm">Start sharing your referral code to grow your network!</p>
          </div>
        ) : (
          <div className="divide-y">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex justify-between items-center p-6 hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      {ref.name || ref.email}
                    </h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ref.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : ref.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {ref.status?.charAt(0).toUpperCase() + ref.status?.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Joined: {new Date(ref.joinDate).toLocaleDateString()}</span>
                    {ref.level && <span>Level: {ref.level}</span>}
                    {ref.rank && <span>Rank: {ref.rank}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    +KES {(ref.earnings || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Earnings</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {referrals.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm text-gray-500">Total Referrals</div>
            <div className="text-2xl font-bold text-gray-800">{referrals.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm text-gray-500">Active Referrals</div>
            <div className="text-2xl font-bold text-green-600">
              {referrals.filter(ref => ref.status === 'active').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm text-gray-500">Total Earnings</div>
            <div className="text-2xl font-bold text-blue-600">
              KES {referrals.reduce((sum, ref) => sum + (ref.earnings || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
