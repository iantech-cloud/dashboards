// app/ui/dashboard/sidenav.tsx
'use client';

import { Wallet, LogOut, Users, Award, HelpCircle, Settings, BarChart, User as UserIcon, ShoppingBag, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface SideNavProps {
  userName: string;
  onLogout: () => void;
}

export default function SideNav({ userName, onLogout }: SideNavProps) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check system preference on mount
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // You can implement actual dark mode toggle here
  };

  const links = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart },
    { path: '/dashboard/wallet', label: 'Wallet & Pay', icon: Wallet },
    { path: '/dashboard/surveys', label: 'Earn Surveys', icon: Award },
    { path: '/dashboard/referrals', label: 'Referrals', icon: Users },
    { path: '/dashboard/soko', label: 'Affiliate Marketing', icon: ShoppingBag },
    { path: '/dashboard/support', label: 'Help & Support', icon: HelpCircle },
    { path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl relative overflow-y-auto overflow-x-hidden fixed top-0 left-0 h-screen custom-scrollbar">
      {/* Animated background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-cyan-500/10 opacity-50 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col min-h-full p-6">
        {/* Logo Section */}
        <div className="flex items-center mb-10 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/50 group-hover:shadow-blue-500/70 transition-all duration-300 group-hover:scale-110">
            <BarChart size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-cyan-200 transition-all duration-300">
            HustleHub
          </h1>
        </div>

        {/* User Profile Card with Glassmorphism */}
        <div className="mb-8 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300 group">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300">
              <UserIcon size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors duration-300">
                {userName}
              </p>
              <p className="text-xs text-cyan-400/80 group-hover:text-cyan-300 transition-colors duration-300">
                Dashboard Access
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col space-y-1.5 flex-grow">
          {links.map(({ path, label, icon: Icon }) => {
            const isActive = pathname === path;
            
            return (
              <Link
                key={path}
                href={path}
                className={`
                  relative flex items-center p-3.5 rounded-xl font-medium transition-all duration-250 ease-in-out group
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-400 rounded-r-full shadow-lg shadow-cyan-400/50"></div>
                )}
                
                <div className={`
                  mr-3 transition-all duration-250
                  ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'}
                `}>
                  <Icon size={20} />
                </div>
                
                <span className="relative">
                  {label}
                  {isActive && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent"></div>
                  )}
                </span>

                {/* Hover glow effect */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-300"></div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Section with Dark Mode Toggle and Logout */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-250 text-slate-300 hover:bg-white/5 hover:text-white group"
          >
            <div className="flex items-center">
              {isDarkMode ? (
                <Moon size={20} className="mr-3 text-slate-400 group-hover:text-cyan-400 transition-colors duration-250" />
              ) : (
                <Sun size={20} className="mr-3 text-slate-400 group-hover:text-yellow-400 transition-colors duration-250" />
              )}
              <span className="font-medium">
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <div className={`w-11 h-6 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-blue-600' : 'bg-slate-600'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-300 transform ${isDarkMode ? 'translate-x-5.5 mt-0.5 ml-0.5' : 'translate-x-0.5 mt-0.5'}`}></div>
            </div>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center p-3.5 rounded-xl transition-all duration-250 font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:via-red-500/10 group-hover:to-red-500/5 transition-all duration-300"></div>
            <LogOut size={20} className="mr-3 relative z-10 group-hover:rotate-12 transition-transform duration-250" />
            <span className="relative z-10">Logout</span>
          </button>
        </div>
      </div>

      {/* Decorative corner accent */}
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-500/20 to-transparent rounded-tl-full blur-2xl"></div>
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-br-full blur-2xl"></div>
    </nav>
  );
}
