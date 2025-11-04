// app/dashboard/soko/components/tabs/ReferralsTab.tsx
import { UserPlus, Copy, Users } from 'lucide-react';
import { SokoStats } from '../types';

interface ReferralsTabProps {
  stats: SokoStats | null;
  onCopyLink: (url: string) => void;
}

export default function ReferralsTab({ stats, onCopyLink }: ReferralsTabProps) {
  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/soko?ref=${stats?.totalClicks || 'YOUR_CODE'}` 
    : '/soko?ref=YOUR_CODE';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Your Affiliate Referral Link</h3>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-4">
          Share your unique referral link to invite others to join Soko affiliate program!
        </p>
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm mb-1">Your Referral Link</p>
              <code className="text-xs sm:text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded block truncate">
                {referralLink}
              </code>
            </div>
            <button
              onClick={() => onCopyLink(referralLink)}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-xs text-gray-600">Referrals</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="text-2xl font-bold text-green-600">KES 0</div>
            <div className="text-xs text-gray-600">Referral Earnings</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="text-2xl font-bold text-blue-600">10%</div>
            <div className="text-xs text-gray-600">Commission Rate</div>
          </div>
        </div>
      </div>

      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-sm sm:text-base mb-2">Start inviting affiliates today!</p>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto px-4">
          Invite other affiliates and earn 10% of their commissions for the first 3 months.
        </p>
      </div>
    </div>
  );
}
