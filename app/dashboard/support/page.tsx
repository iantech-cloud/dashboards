// app/dashboard/support/page.tsx
"use client";

import { useState } from 'react';

export default function SupportPage() {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Support request submitted!');
    setMessage('');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Support</h1>
      <div className="bg-white rounded-lg border p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border p-3 rounded-lg"
              rows={4}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
}
