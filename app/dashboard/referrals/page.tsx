// app/dashboard/referrals/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Alert from '@/app/ui/Alert';
import { useDashboard } from '../DashboardContext';
import { getReferrals, getReferralCommissionStats, getReferralInfo } from '@/app/actions/referrals';

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
  activationStatus: string;
  referralCount: number;
}

interface CommissionStats {
  directReferrals: {
    totalEarnings: number;
    count: number;
    first2Count: number;
    first2Earnings: number;
    subsequentCount: number;
    subsequentEarnings: number;
  };
  level1: {
    totalEarnings: number;
    count: number;
  };
  total: number;
}

export default function ReferralsPage() {
  const { user } = useDashboard();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissionStats, setCommissionStats] = useState<CommissionStats | null>(null);
  const [referralLink, setReferralLink] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setStatsLoading(true);

        // Fetch referrals, commission stats, and referral info in parallel
        const [referralsResult, statsResult, infoResult] = await Promise.all([
          getReferrals(),
          getReferralCommissionStats(),
          getReferralInfo()
        ]);

        if (referralsResult.success && referralsResult.data) {
          const transformedReferrals = referralsResult.data.map(ref => ({
            ...ref,
            earnings: ref.earnings || ref.earning || 0,
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

        if (infoResult.success && infoResult.data) {
          setReferralLink(infoResult.data.referralLink);
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
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMessage(`${label} copied to clipboard!`);
    setMessageType('success');
    setTimeout(() => setMessage(null), 3000);
  };

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
      
      {/* Referral Code & Link Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Your Referral Information</h3>
        
        {/* Referral Code */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Referral Code</label>
          <div className="flex items-center gap-4">
            <code className="text-xl font-mono text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg border-2 border-indigo-200">
              {user?.referralCode || 'Loading...'}
            </code>
            <button
              onClick={() => {
                if (user?.referralCode) {
                  copyToClipboard(user.referralCode, 'Referral code');
                }
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Copy Code
            </button>
          </div>
        </div>

        {/* Referral Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Referral Link</label>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300 overflow-x-auto">
              <code className="text-sm text-gray-700 whitespace-nowrap">
                {referralLink || 'Loading...'}
              </code>
            </div>
            <button
              onClick={() => {
                if (referralLink) {
                  copyToClipboard(referralLink, 'Referral link');
                }
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              Copy Link
            </button>
          </div>
        </div>

        <p className="text-gray-600 mt-4 text-sm">
          Share your referral code or link with friends. You'll earn <strong>KES 600</strong> for your first 2 referrals and <strong>KES 700</strong> for subsequent referrals when they activate their accounts!
        </p>
      </div>

      {/* Commission Breakdown Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="font-bold text-lg mb-4 text-gray-800">Commission Breakdown</h3>
        
        {statsLoading ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center p-4 bg-gray-100 rounded-lg">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : commissionStats ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Total Commissions */}
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  KES {(commissionStats.total / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Commissions</div>
                <div className="text-xs text-blue-500 mt-1">All Levels</div>
              </div>

              {/* Direct Referrals - First 2 */}
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  KES {(commissionStats.directReferrals.first2Earnings / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 mt-1">First 2 Referrals</div>
                <div className="text-xs text-green-500 mt-1">
                  {commissionStats.directReferrals.first2Count} users × KES 600
                </div>
              </div>

              {/* Direct Referrals - Subsequent */}
              <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-600">
                  KES {(commissionStats.directReferrals.subsequentEarnings / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Subsequent Referrals</div>
                <div className="text-xs text-emerald-500 mt-1">
                  {commissionStats.directReferrals.subsequentCount} users × KES 700
                </div>
              </div>

              {/* Level 1 Downline */}
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">
                  KES {(commissionStats.level1.totalEarnings / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Level 1 Downline</div>
                <div className="text-xs text-yellow-500 mt-1">
                  {commissionStats.level1.count} users × KES 100
                </div>
              </div>
            </div>

            {/* Commission Structure Info */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-gray-800 mb-3">Commission Structure</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span><strong>First 2 Direct:</strong> KES 600 each</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span><strong>Subsequent Direct:</strong> KES 700 each</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span><strong>Level 1:</strong> KES 100 (Your direct referrals' referrals)</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * Commissions are paid when referred users pay KES 1,000 activation fee and get approved.
              </p>
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
            <p className="text-gray-400 text-sm">Start sharing your referral link to grow your network!</p>
          </div>
        ) : (
          <div className="divide-y">
            {referrals.map((ref) => (
              <div key={ref.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ref.activationStatus === 'activated' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ref.activationStatus === 'activated' ? '✓ Activated' : 'Not Activated'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Joined: {new Date(ref.joinDate).toLocaleDateString()}
                      </span>
                      {ref.level && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          Level: {ref.level}
                        </span>
                      )}
                      {ref.rank && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          {ref.rank}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Referred: {ref.referralCount} {ref.referralCount === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      +KES {(ref.earnings || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Your Earnings</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {referrals.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="text-sm text-gray-500">Activated Users</div>
            <div className="text-2xl font-bold text-blue-600">
              {referrals.filter(ref => ref.activationStatus === 'activated').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm text-gray-500">Total Earnings</div>
            <div className="text-2xl font-bold text-purple-600">
              KES {referrals.reduce((sum, ref) => sum + (ref.earnings || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
