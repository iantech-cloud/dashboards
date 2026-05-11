// app/ui/dashboard/Card.tsx
'use client';

import { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface CardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function Card({ title, value, icon: Icon, color, loading = false, trend }: CardProps) {
  // Extract color name from Tailwind class
  const getColorClasses = (colorClass: string) => {
    if (colorClass.includes('indigo')) {
      return {
        bg: 'from-indigo-600 to-indigo-500',
        shadow: 'shadow-indigo-500/30',
        hover: 'hover:shadow-indigo-500/40',
        glow: 'from-indigo-500/20',
      };
    }
    if (colorClass.includes('green')) {
      return {
        bg: 'from-green-600 to-green-500',
        shadow: 'shadow-green-500/30',
        hover: 'hover:shadow-green-500/40',
        glow: 'from-green-500/20',
      };
    }
    if (colorClass.includes('blue')) {
      return {
        bg: 'from-blue-600 to-blue-500',
        shadow: 'shadow-blue-500/30',
        hover: 'hover:shadow-blue-500/40',
        glow: 'from-blue-500/20',
      };
    }
    if (colorClass.includes('yellow')) {
      return {
        bg: 'from-yellow-600 to-yellow-500',
        shadow: 'shadow-yellow-500/30',
        hover: 'hover:shadow-yellow-500/40',
        glow: 'from-yellow-500/20',
      };
    }
    if (colorClass.includes('purple')) {
      return {
        bg: 'from-purple-600 to-purple-500',
        shadow: 'shadow-purple-500/30',
        hover: 'hover:shadow-purple-500/40',
        glow: 'from-purple-500/20',
      };
    }
    if (colorClass.includes('teal')) {
      return {
        bg: 'from-teal-600 to-teal-500',
        shadow: 'shadow-teal-500/30',
        hover: 'hover:shadow-teal-500/40',
        glow: 'from-teal-500/20',
      };
    }
    if (colorClass.includes('red')) {
      return {
        bg: 'from-red-600 to-red-500',
        shadow: 'shadow-red-500/30',
        hover: 'hover:shadow-red-500/40',
        glow: 'from-red-500/20',
      };
    }
    if (colorClass.includes('pink')) {
      return {
        bg: 'from-pink-600 to-pink-500',
        shadow: 'shadow-pink-500/30',
        hover: 'hover:shadow-pink-500/40',
        glow: 'from-pink-500/20',
      };
    }
    if (colorClass.includes('orange')) {
      return {
        bg: 'from-orange-600 to-orange-500',
        shadow: 'shadow-orange-500/30',
        hover: 'hover:shadow-orange-500/40',
        glow: 'from-orange-500/20',
      };
    }
    if (colorClass.includes('cyan')) {
      return {
        bg: 'from-cyan-600 to-cyan-500',
        shadow: 'shadow-cyan-500/30',
        hover: 'hover:shadow-cyan-500/40',
        glow: 'from-cyan-500/20',
      };
    }
    if (colorClass.includes('gray')) {
      return {
        bg: 'from-gray-600 to-gray-500',
        shadow: 'shadow-gray-500/30',
        hover: 'hover:shadow-gray-500/40',
        glow: 'from-gray-500/20',
      };
    }
    // Default to blue
    return {
      bg: 'from-blue-600 to-blue-500',
      shadow: 'shadow-blue-500/30',
      hover: 'hover:shadow-blue-500/40',
      glow: 'from-blue-500/20',
    };
  };

  const colors = getColorClasses(color);

  return (
    <div className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden">
      {/* Background gradient glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
      
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg} shadow-lg ${colors.shadow} group-hover:${colors.hover} group-hover:scale-110 transition-all duration-300 flex-shrink-0`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          
          {trend && (
            <div className={`flex items-center space-x-1 text-sm font-semibold ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <svg 
                className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-medium text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
            {title}
          </p>
          
          {loading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-slate-400" />
              <span className="text-sm sm:text-lg font-bold text-slate-400">Loading...</span>
            </div>
          ) : (
            <p className="text-lg sm:text-2xl font-bold text-slate-900 group-hover:text-slate-950 transition-colors duration-300 break-words">
              {value}
            </p>
          )}
        </div>
      </div>

      {/* Corner accent */}
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-slate-100/50 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
}
