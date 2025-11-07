'use server';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

/**
 * Require user to be authenticated
 * Redirects to login if not authenticated
 */
export async function requireAuth() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/login');
  }
  
  return session;
}

/**
 * Check if user meets all status requirements
 * Redirects to appropriate pages if requirements not met
 */
export async function checkUserStatus() {
  const session = await requireAuth();
  const user = session.user;
  
  const isGoogle = user.authMethod === 'google';
  const isCreds = user.authMethod === 'credentials' || user.authMethod === 'email';

  // Google OAuth checks
  if (isGoogle) {
    if (!user.is_verified) {
      redirect('/auth/verify-request');
    }
    if (!user.profile_completed) {
      redirect('/auth/complete-profile');
    }
    if (!user.isActivationPaid) {
      redirect('/auth/activate');
    }
    if (!user.is_approved || !user.is_active) {
      redirect('/auth/pending-approval');
    }
  }

  // Email/Credentials checks
  if (isCreds) {
    if (!user.is_verified) {
      redirect('/auth/verify-request');
    }
    if (!user.isActivationPaid) {
      redirect('/auth/activate');
    }
    if (!user.is_approved || !user.is_active) {
      redirect('/auth/pending-approval');
    }
  }

  return session;
}

/**
 * Require specific user role
 * Redirects to unauthorized if role doesn't match
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await checkUserStatus();
  
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized');
  }
  
  return session;
}

/**
 * Get current user without redirects (safe for UI components)
 */
export async function getCurrentUser() {
  try {
    const session = await auth();
    return session?.user || null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user has specific role (without redirect)
 */
export async function hasRole(role: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user?.role === role;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user meets status requirements (without redirect)
 * Useful for conditional rendering
 */
export async function getUserStatus() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { 
        authenticated: false, 
        meetsRequirements: false,
        missingRequirements: ['authentication']
      };
    }

    const isGoogle = user.authMethod === 'google';
    const isCreds = user.authMethod === 'credentials' || user.authMethod === 'email';
    
    const missingRequirements: string[] = [];

    // Google OAuth checks
    if (isGoogle) {
      if (!user.is_verified) missingRequirements.push('verification');
      if (!user.profile_completed) missingRequirements.push('profile_completion');
      if (!user.isActivationPaid) missingRequirements.push('activation_payment');
      if (!user.is_approved || !user.is_active) missingRequirements.push('approval');
    }

    // Email/Credentials checks
    if (isCreds) {
      if (!user.is_verified) missingRequirements.push('verification');
      if (!user.isActivationPaid) missingRequirements.push('activation_payment');
      if (!user.is_approved || !user.is_active) missingRequirements.push('approval');
    }

    return {
      authenticated: true,
      meetsRequirements: missingRequirements.length === 0,
      missingRequirements,
      user
    };
  } catch (error) {
    return { 
      authenticated: false, 
      meetsRequirements: false,
      missingRequirements: ['error']
    };
  }
}

/**
 * Refresh session data
 */
export async function refreshSession(path?: string) {
  if (path) {
    revalidatePath(path);
  }
  
  const session = await auth();
  return session;
}

/**
 * Check if user can access a specific path
 */
export async function canAccessPath(path: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    
    if (!user) return false;

    // Admin routes
    if (path.startsWith('/admin')) {
      return ['admin', 'super_admin'].includes(user.role);
    }

    // Support routes
    if (path.startsWith('/support')) {
      return ['support', 'admin', 'super_admin'].includes(user.role);
    }

    // Dashboard routes - check user status
    if (path.startsWith('/dashboard') || path.startsWith('/account')) {
      const status = await getUserStatus();
      return status.meetsRequirements;
    }

    return true;
  } catch (error) {
    return false;
  }
}

// ==================== SPECIFIC ROUTE PROTECTORS ====================

/**
 * Protect dashboard routes
 */
export async function protectDashboard() {
  return await checkUserStatus();
}

/**
 * Protect admin routes with admin role requirement
 */
export async function protectAdmin() {
  return await requireRole(['admin', 'super_admin']);
}

/**
 * Protect support routes with support role requirement
 */
export async function protectSupport() {
  return await requireRole(['support', 'admin', 'super_admin']);
}

/**
 * Protect account routes
 */
export async function protectAccount() {
  return await checkUserStatus();
}

/**
 * Quick auth check for client components (no redirect)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Quick role check for client components (no redirect)
 */
export async function hasAnyRole(roles: string[]): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? roles.includes(user.role) : false;
}
