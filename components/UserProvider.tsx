// components/UserProvider.tsx
'use client';

import { useEffect } from 'react';
import { useDashboard } from '../app/dashboard/DashboardContext';

export function UserProvider() {
  const { setUser } = useDashboard();

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          console.error('Failed to fetch user:', response.status);
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      }
    }

    fetchUser();
  }, [setUser]);

  return null;
}
