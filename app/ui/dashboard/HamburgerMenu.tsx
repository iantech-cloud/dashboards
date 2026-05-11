'use client';

import { useState } from 'react';
import { Menu, X, BarChart, Wallet, Award, Users, Settings, HelpCircle, User as UserIcon, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HamburgerMenuProps {
  userName?: string;
}

export default function HamburgerMenu({ userName }: HamburgerMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: BarChart, path: '/dashboard' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/dashboard/wallet' },
    { id: 'surveys', label: 'Earn', icon: Award, path: '/dashboard/surveys' },
    { id: 'affiliate', label: 'Soko', icon: ShoppingBag, path: '/dashboard/soko' },
    { id: 'referrals', label: 'Refs', icon: Users, path: '/dashboard/referrals' },
    { id: 'support', label: 'Support', icon: HelpCircle, path: '/dashboard/support' },
    { id: 'settings', label: 'Settings', icon: UserIcon, path: '/dashboard/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="lg:hidden">
      {/* Hamburger Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Hamburger Menu */}
      <nav
        className={`
          fixed inset-y-0 right-0 w-64 z-40 bg-white dark:bg-slate-900 shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col pt-20 pb-6 px-4 overflow-y-auto">
          {/* User Info */}
          {userName && (
            <div className="mb-8 pb-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
                  <UserIcon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-2 flex-1">
            {tabs.map(({ id, label, icon: Icon, path }) => {
              const active = isActive(path);
              return (
                <Link
                  key={id}
                  href={path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg
                    transition-all duration-200 font-medium text-sm
                    ${
                      active
                        ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                  {active && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
