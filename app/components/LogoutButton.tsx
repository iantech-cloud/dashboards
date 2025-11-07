// components/LogoutButton.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button 
      onClick={logout}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Logout
    </button>
  );
}
