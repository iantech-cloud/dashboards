// app/ui/dashboard/Card.tsx
'use client';

import { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface CardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'indigo' | 'green' | 'blue' | 'yellow' | 'purple' | 'teal' | 'red' | 'pink' | 'orange' | 'cyan' | 'gray';
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function Card({ title, value, icon: Icon, color, loading = false, trend }: CardProps) {
  // Map color names to Tailwind classes for bold, saturated colors
  const getColorClasses = (colorName: string) => {
    if (colorName === 'indigo') return { bg: 'bg-indigo-600', border: 'border-indigo-500', shadow: 'shadow-indigo-600/40', text: 'text-indigo-600', light: 'bg-indigo-50', lightBorder: 'border-indigo-200' };
    if (colorName === 'green') return { bg: 'bg-green-600', border: 'border-green-500', shadow: 'shadow-green-600/40', text: 'text-green-600', light: 'bg-green-50', lightBorder: 'border-green-200' };
    if (colorName === 'blue') return { bg: 'bg-blue-600', border: 'border-blue-500', shadow: 'shadow-blue-600/40', text: 'text-blue-600', light: 'bg-blue-50', lightBorder: 'border-blue-200' };
    if (colorName === 'yellow') return { bg: 'bg-yellow-500', border: 'border-yellow-400', shadow: 'shadow-yellow-500/40', text: 'text-yellow-600', light: 'bg-yellow-50', lightBorder: 'border-yellow-200' };
    if (colorName === 'purple') return { bg: 'bg-purple-600', border: 'border-purple-500', shadow: 'shadow-purple-600/40', text: 'text-purple-600', light: 'bg-purple-50', lightBorder: 'border-purple-200' };
    if (colorName === 'teal') return { bg: 'bg-teal-600', border: 'border-teal-500', shadow: 'shadow-teal-600/40', text: 'text-teal-600', light: 'bg-teal-50', lightBorder: 'border-teal-200' };
    if (colorName === 'red') return { bg: 'bg-red-600', border: 'border-red-500', shadow: 'shadow-red-600/40', text: 'text-red-600', light: 'bg-red-50', lightBorder: 'border-red-200' };
    if (colorName === 'pink') return { bg: 'bg-pink-600', border: 'border-pink-500', shadow: 'shadow-pink-600/40', text: 'text-pink-600', light: 'bg-pink-50', lightBorder: 'border-pink-200' };
    if (colorName === 'orange') return { bg: 'bg-orange-600', border: 'border-orange-500', shadow: 'shadow-orange-600/40', text: 'text-orange-600', light: 'bg-orange-50', lightBorder: 'border-orange-200' };
    if (colorName === 'cyan') return { bg: 'bg-cyan-600', border: 'border-cyan-500', shadow: 'shadow-cyan-600/40', text: 'text-cyan-600', light: 'bg-cyan-50', lightBorder: 'border-cyan-200' };
    if (colorName === 'gray') return { bg: 'bg-gray-700', border: 'border-gray-600', shadow: 'shadow-gray-700/40', text: 'text-gray-700', light: 'bg-gray-50', lightBorder: 'border-gray-200' };
    
    // Default to blue
    return { bg: 'bg-blue-600', border: 'border-blue-500', shadow: 'shadow-blue-600/40', text: 'text-blue-600', light: 'bg-blue-50', lightBorder: 'border-blue-200' };
  };

  const colors = getColorClasses(color);

  return (
    <div className={`group relative ${colors.bg} rounded-2xl p-4 sm:p-6 shadow-lg ${colors.shadow} hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden`}>
      {/* Animated shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 flex-shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          
          {trend && (
            <div className="flex items-center space-x-1 text-sm font-semibold text-white/90">
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
          <p className="text-xs sm:text-sm font-semibold text-white/80 uppercase tracking-wider">
            {title}
          </p>
          
          {loading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white/60" />
              <span className="text-sm sm:text-base font-bold text-white/60">Loading...</span>
            </div>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-white break-words">
              {value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
