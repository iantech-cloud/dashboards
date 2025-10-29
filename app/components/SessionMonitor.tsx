'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Alert from '@/app/ui/Alert'; // Using your existing Alert component

export default function SessionMonitor() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Simple idle timer implementation
  useEffect(() => {
    if (!session) return;

    let warningTimer: NodeJS.Timeout;
    let logoutTimer: NodeJS.Timeout;
    let lastActivity = Date.now();

    const resetTimers = () => {
      lastActivity = Date.now();
      
      // Clear existing timers
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      
      // Set new timers (9 minutes for warning, 10 minutes for logout)
      warningTimer = setTimeout(() => {
        setShowWarning(true);
        setCountdown(60);
        
        // Start countdown for auto logout
        logoutTimer = setTimeout(async () => {
          await signOut({ redirect: false });
          router.push('/auth/login?timeout=true');
        }, 60000); // 1 minute after warning
      }, 9 * 60 * 1000); // 9 minutes
    };

    const handleActivity = () => {
      resetTimers();
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimers();

    // Cleanup
    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [session, router]);

  // Countdown timer for warning
  useEffect(() => {
    if (showWarning && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showWarning && countdown === 0) {
      // Auto logout when countdown reaches 0
      handleLogout();
    }
  }, [showWarning, countdown]);

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    setCountdown(60);
    
    // Reset timers by triggering a user activity
    const event = new Event('mousedown');
    document.dispatchEvent(event);
  };

  const handleLogout = async () => {
    setShowWarning(false);
    await signOut({ redirect: false });
    router.push('/auth/login?timeout=true');
  };

  // Only render for authenticated users
  if (!session) {
    return null;
  }

  // If you want to use a modal instead of Alert, you can use this:
  if (showWarning) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Session Timeout Warning
            </h3>
            <p className="text-gray-600 mb-4">
              Your session will expire in <strong>{countdown} seconds</strong> due to inactivity.
              Do you want to stay logged in?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleLogout}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Logout Now
              </button>
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
