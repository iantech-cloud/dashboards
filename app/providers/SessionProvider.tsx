// app/providers/SessionProvider.tsx - FIXED VERSION
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import type { Session } from 'next-auth';

interface SessionProviderProps {
  children: ReactNode;
  session?: Session | null;
}

export default function SessionProvider({ children, session }: SessionProviderProps) {
  // CRITICAL: Log the actual NextAuth session structure
  console.log('SessionProvider - Client session:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    email: session?.user?.email,
    // Log the actual structure to debug
    sessionStructure: session ? Object.keys(session) : [],
    userStructure: session?.user ? Object.keys(session.user) : []
  });
  
  return (
    <NextAuthSessionProvider 
      session={session}
      // CRITICAL: These settings ensure proper session handling
      refetchInterval={0}              // Don't auto-refetch (prevents loops)
      refetchOnWindowFocus={true}      // Refetch when window gets focus
      refetchWhenOffline={false}       // Don't refetch when offline
    >
      {children}
    </NextAuthSessionProvider>
  );
}
