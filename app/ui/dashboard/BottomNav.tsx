// app/ui/dashboard/BottomNav.tsx
'use client';

import { BarChart, Wallet, Award, Users, Settings, HelpCircle, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  userName?: string;
}

export default function BottomNav({ userName }: BottomNavProps) {
  const pathname = usePathname();

  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Home', 
      icon: BarChart, 
      path: '/dashboard' 
    },
    { 
      id: 'wallet', 
      label: 'Wallet', 
      icon: Wallet, 
      path: '/dashboard/wallet' 
    },
    { 
      id: 'surveys', 
      label: 'Earn', 
      icon: Award, 
      path: '/dashboard/surveys' 
    },
    { 
      id: 'referrals', 
      label: 'Refs', 
      icon: Users, 
      path: '/dashboard/referrals' 
    },
    { 
      id: 'help', 
      label: 'Help', 
      icon: HelpCircle, 
      path: '/dashboard/help' 
    },
    { 
      id: 'settings', 
      label: 'Me', 
      icon: UserIcon, 
      path: '/dashboard/settings' 
    },
  ];

  // Helper function to check if a tab is active
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 lg:hidden bg-white shadow-2xl border-t border-gray-100 z-50 safe-area-bottom">
      {/* User Info Bar - Only show if userName is provided */}
      {userName && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center justify-center">
            <UserIcon size={14} className="text-indigo-600 mr-2" />
            <span className="text-xs font-medium text-indigo-800 truncate max-w-[120px]">
              {userName}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(({ id, label, icon: Icon, path }) => {
          const active = isActive(path);
          
          return (
            <Link
              key={id}
              href={path}
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 flex-1 mx-1 ${
                active 
                  ? 'text-indigo-600 bg-indigo-50 shadow-sm' 
                  : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon size={20} />
                {active && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full"></div>
                )}
              </div>
              <span className={`text-xs font-medium mt-0.5 ${
                active ? 'text-indigo-600' : 'text-gray-500'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
