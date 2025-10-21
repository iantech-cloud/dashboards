// app/lib/auth-utils.ts
'use server';

import { auth } from '@/auth';

/**
 * Server-side authentication helper for server actions
 */
export async function getServerSession() {
  try {
    const session = await auth();
    return session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

/**
 * Get current user from server session
 */
export async function getCurrentUser() {
  const session = await getServerSession();
  
  if (!session?.user?.id) {
    throw new Error('User not authenticated');
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role
  };
}

/**
 * Verify user is authenticated and has required role
 */
export async function requireAuth(requiredRole?: string) {
  const user = await getCurrentUser();
  
  if (requiredRole && user.role !== requiredRole) {
    throw new Error(`Access denied. ${requiredRole} role required.`);
  }
  
  return user;
}
