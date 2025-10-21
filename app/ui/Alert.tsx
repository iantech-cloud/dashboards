// app/ui/Alert.tsx
'use client';

import React from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

export default function Alert({ type, message, onClose }: AlertProps) {
  const colorMap = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  };
  return (
    <div
      className={`p-4 mb-4 border-l-4 rounded-lg shadow-md ${colorMap[type]} flex justify-between items-center`}
      role="alert"
    >
      <p className="font-medium">{message}</p>
      <button onClick={onClose} className={`ml-4 text-xl font-bold ${colorMap[type].includes('green') ? 'text-green-800' : colorMap[type].includes('red') ? 'text-red-800' : 'text-blue-800'}`}>&times;</button>
    </div>
  );
}
