// hooks/useAuth.ts
import { signOut } from 'next-auth/react';

export const useAuth = () => {
  const logout = async () => {
    try {
      // Clear client-side storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Use NextAuth v5 client-side signOut
      await signOut({ 
        redirect: true,
        callbackUrl: '/auth/login'
      });
      
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback redirect
      window.location.href = '/auth/login';
    }
  };

  return { logout };
};
