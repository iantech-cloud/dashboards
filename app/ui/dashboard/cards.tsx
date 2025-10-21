// app/ui/dashboard/Card.tsx
'use client';

import React from 'react';

interface CardProps {
  title: string;
  value: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
}

export default function Card({ title, value, icon: Icon, color }: CardProps) {
  return (
    <div className={`relative p-6 rounded-xl shadow-xl overflow-hidden text-white ${color}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-extrabold mt-1">{value}</p>
        </div>
        <Icon size={40} className="opacity-30 absolute right-4 bottom-4" />
      </div>
    </div>
  );
}
