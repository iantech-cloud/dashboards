// app/lib/auth-utils.ts
'use server';

/**
 * Server-side authentication helper for server actions
 * Using dynamic import to avoid webpack issues
 */
export async function getServerSession() {
  try {
    // Use dynamic import to avoid webpack issues
    const { auth } = await import('@/auth');
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
  try {
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
  } catch (error) {
    console.error('Error getting current user:', error);
    throw new Error('User not authenticated');
  }
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
