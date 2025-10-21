// app/dashboard/help/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Alert from '@/app/ui/Alert';

interface HelpContent {
  title: string;
  content: string;
}

export default function HelpPage() {
  const [helpContent, setHelpContent] = useState<HelpContent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    const fetchHelp = async () => {
      try {
        const response = await fetch('/api/help');
        const result = await response.json();
        if (response.ok && result.data) {
          setHelpContent(result.data);
        } else {
          setMessage(result.message || 'Failed to load help content.');
          setMessageType('error');
        }
      } catch (error) {
        setMessage('Failed to load help content.');
        setMessageType('error');
      }
    };
    fetchHelp();
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-2">Help & Support</h2>
      
      {message && <Alert type={messageType} message={message} onClose={() => setMessage(null)} />}
      
      <div className="space-y-6">
        {helpContent.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="font-bold mb-2">{item.title}</h3>
            <p className="text-gray-600">{item.content}</p>
          </div>
        ))}
      </div>
      
      {helpContent.length === 0 && <p className="text-center text-gray-500">No help content available.</p>}
    </div>
  );
}
