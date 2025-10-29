import crypto from 'crypto';

// Session configuration - match these with auth.ts
export const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes for idle timeout
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days for max session age

/**
 * Hash session token for secure storage
 */
export function hashSessionToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate session expiry time (10 minutes from now for idle timeout)
 */
export function getSessionExpiryTime(): Date {
  return new Date(Date.now() + SESSION_TIMEOUT);
}

/**
 * Check if session is expired based on idle time
 */
export function isSessionExpired(expiresAt: Date, lastActivity: Date): boolean {
  const now = new Date();
  const timeSinceActivity = now.getTime() - lastActivity.getTime();
  
  return now > expiresAt || timeSinceActivity > SESSION_TIMEOUT;
}
