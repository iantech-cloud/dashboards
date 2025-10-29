'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'next-auth/react';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
const WARNING_TIME = 1 * 60 * 1000; // Show warning 1 minute before timeout

export function useIdleTimer(onIdle: () => void, onWarning: () => void) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    // Set warning timeout (9 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      onWarning();
    }, IDLE_TIMEOUT - WARNING_TIME);

    // Set logout timeout (10 minutes)
    timeoutRef.current = setTimeout(() => {
      onIdle();
    }, IDLE_TIMEOUT);
  }, [onIdle, onWarning]);

  useEffect(() => {
    // Events that reset the idle timer
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Reset timer on any activity
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [resetTimer]);

  return { resetTimer };
}

export async function handleSessionTimeout() {
  try {
    // Simply sign out - NextAuth will handle session cleanup
    await signOut({ 
      callbackUrl: '/auth/login?timeout=true',
      redirect: true 
    });
  } catch (error) {
    console.error('Error during session timeout:', error);
    // Fallback redirect
    window.location.href = '/auth/login?timeout=true';
  }
}
