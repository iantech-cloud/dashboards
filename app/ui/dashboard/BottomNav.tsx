// app/ui/dashboard/BottomNav.tsx
'use client';

import { BarChart, Wallet, Award, Users, Settings, HelpCircle, User as UserIcon, ShoppingBag } from 'lucide-react';
// (UserIcon now used for Profile tab; Settings icon used for Settings tab)
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface BottomNavProps {
  userName?: string;
}

export default function BottomNav({ userName }: BottomNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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
      id: 'affiliate', 
      label: 'Soko', 
      icon: ShoppingBag, 
      path: '/dashboard/soko' 
    },
    { 
      id: 'referrals', 
      label: 'Refs', 
      icon: Users, 
      path: '/dashboard/referrals' 
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: UserIcon, 
      path: '/dashboard/profile' 
    },
    { 
      id: 'support', 
      label: 'Support', 
      icon: HelpCircle, 
      path: '/dashboard/support' 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      path: '/dashboard/settings' 
    },
  ];

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        // Scrolling up or near top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and not near top
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Helper function to check if a tab is active
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav 
      className={`
        fixed inset-x-0 bottom-0 lg:hidden z-50 safe-area-bottom
        transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      {/* Glassmorphism Container */}
      <div className="relative">
        {/* Background blur layer */}
        <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl rounded-t-2xl"></div>
        
        {/* Subtle top border with gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>

        {/* Shadow effect */}
        <div className="absolute -top-4 inset-x-0 h-4 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>

        {/* User Info Bar - Glassmorphism style */}
        {userName && (
          <div className="relative px-4 py-2 bg-gradient-to-r from-blue-50/80 via-cyan-50/80 to-blue-50/80 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-blue-950/30 backdrop-blur-md border-b border-blue-100/50 dark:border-blue-900/30">
            <div className="flex items-center justify-center max-w-lg mx-auto">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mr-2 shadow-sm">
                <UserIcon size={12} className="text-white" />
              </div>
              <span className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent truncate max-w-[120px]">
                {userName}
              </span>
            </div>
          </div>
        )}
        
        {/* Navigation Items */}
        <div className="relative flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          {tabs.map(({ id, label, icon: Icon, path }) => {
            const active = isActive(path);
            
            return (
              <Link
                key={id}
                href={path}
                className={`
                  relative flex flex-col items-center justify-center p-2 rounded-2xl flex-1 mx-0.5
                  transition-all duration-250 ease-in-out group
                  ${active 
                    ? 'text-blue-600 dark:text-cyan-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-cyan-400'
                  }
                `}
              >
                {/* Active background with gradient */}
                {active && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950/50 dark:to-cyan-950/50 rounded-2xl opacity-60"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30"></div>
                  </>
                )}

                {/* Hover effect for inactive items */}
                {!active && (
                  <div className="absolute inset-0 bg-slate-100/0 dark:bg-slate-800/0 group-hover:bg-slate-100/50 dark:group-hover:bg-slate-800/30 rounded-2xl transition-all duration-250"></div>
                )}

                {/* Icon Container */}
                <div className="relative z-10 mb-0.5">
                  <Icon 
                    size={22} 
                    className={`
                      transition-all duration-250
                      ${active 
                        ? 'stroke-[2.5] filter drop-shadow-sm' 
                        : 'stroke-[2] group-hover:scale-110'
                      }
                    `}
                  />
                  
                  {/* Active indicator dot */}
                  {active && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full shadow-lg shadow-blue-400/50 animate-pulse"></div>
                  )}
                </div>
                
                {/* Label */}
                <span 
                  className={`
                    relative z-10 text-[10px] font-semibold tracking-tight
                    transition-all duration-250
                    ${active 
                      ? 'text-blue-600 dark:text-cyan-400' 
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-cyan-400'
                    }
                  `}
                >
                  {label}
                </span>

                {/* Active underline indicator */}
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full shadow-lg shadow-blue-400/50"></div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Safe area for devices with home indicator */}
        <div className="h-safe-bottom bg-gradient-to-t from-white/90 to-white/70 dark:from-slate-900/90 dark:to-slate-900/70"></div>
      </div>

      {/* Decorative gradient edges */}
      <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none rounded-tl-2xl"></div>
      <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none rounded-tr-2xl"></div>
    </nav>
  );
}
