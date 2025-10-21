// app/ui/dashboard/sidenav.tsx
'use client';

import { Wallet, LogOut, Users, Award, HelpCircle, Settings, BarChart, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SideNavProps {
  userName: string;
  onLogout: () => void;
}

export default function SideNav({ userName, onLogout }: SideNavProps) {
  const pathname = usePathname();

  const links = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart },
    { path: '/dashboard/wallet', label: 'Wallet & Pay', icon: Wallet },
    { path: '/dashboard/surveys', label: 'Earn Surveys', icon: Award },
    { path: '/dashboard/referrals', label: 'Referrals', icon: Users },
    { path: '/dashboard/help', label: 'Help & Support', icon: HelpCircle },
    { path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="hidden lg:flex flex-col w-64 bg-white p-6 shadow-2xl">
      <div className="flex items-center mb-10">
        <h1 className="text-3xl font-extrabold text-indigo-600">HustleHub</h1>
      </div>
      <div className="mb-8 p-3 bg-indigo-50 rounded-xl">
        <p className="text-lg font-semibold text-indigo-800 flex items-center mb-1"><UserIcon size={18} className="mr-2"/>{userName}</p>
        <p className="text-sm text-indigo-600">Dashboard Access</p>
      </div>
      <div className="flex flex-col space-y-2 flex-grow">
        {links.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            href={path}
            className={`flex items-center p-3 rounded-xl transition-all duration-200 font-medium ${
              pathname === path ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
            }`}
          >
            <Icon size={20} className="mr-3" />
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-8 pt-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center p-3 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 hover:text-red-700 font-medium"
        >
          <LogOut size={20} className="mr-3" />
          Logout
        </button>
      </div>
    </nav>
  );
}