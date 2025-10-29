// app/components/SessionDebugger.tsx
// Add this component to your layout to debug session issues
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function SessionDebugger() {
  const { data: session, status } = useSession();
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Debug Toggle Button - Fixed position bottom right */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Toggle Session Debug Info"
      >
        🐛
      </button>

      {/* Debug Panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 z-50 bg-white border-2 border-purple-600 rounded-lg shadow-2xl p-4 max-w-md max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg text-purple-600">Session Debug Info</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 font-bold text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {/* Status */}
            <div className="p-2 bg-gray-100 rounded">
              <div className="font-bold text-gray-700">Status:</div>
              <div className={`font-semibold ${
                status === 'authenticated' ? 'text-green-600' :
                status === 'loading' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {status}
              </div>
            </div>

            {/* Session User */}
            <div className="p-2 bg-gray-100 rounded">
              <div className="font-bold text-gray-700">Session User:</div>
              {session?.user ? (
                <div className="pl-2 mt-1 space-y-1">
                  <div>
                    <span className="text-gray-600">id:</span>{' '}
                    <span className={session.user.id ? 'text-green-600 font-bold' : 'text-red-600'}>
                      {session.user.id || '❌ MISSING'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">email:</span>{' '}
                    <span className="text-blue-600">{session.user.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">name:</span>{' '}
                    <span className="text-blue-600">{session.user.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">role:</span>{' '}
                    <span className="text-blue-600">{(session.user as any).role || 'N/A'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-red-600 pl-2">No user data</div>
              )}
            </div>

            {/* Full Session Object */}
            <div className="p-2 bg-gray-100 rounded">
              <div className="font-bold text-gray-700 mb-1">Full Session:</div>
              <pre className="text-xs overflow-x-auto bg-white p-2 rounded border border-gray-300">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            {/* Recommendations */}
            {session && !session.user?.id && (
              <div className="p-2 bg-red-50 border border-red-300 rounded">
                <div className="font-bold text-red-700">⚠️ Issue Detected:</div>
                <div className="text-red-600 mt-1">
                  session.user.id is missing! Check:
                  <ul className="list-disc pl-4 mt-1">
                    <li>JWT callback returns user.id</li>
                    <li>Session callback maps token to session.user.id</li>
                    <li>NextAuth types are properly extended</li>
                  </ul>
                </div>
              </div>
            )}

            {status === 'authenticated' && session?.user?.id && (
              <div className="p-2 bg-green-50 border border-green-300 rounded">
                <div className="font-bold text-green-700">✅ Session OK</div>
                <div className="text-green-600 text-xs">
                  User ID is properly set: {session.user.id}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
