// app/admin/audit-logs/page.tsx
"use client";

import { useState, useEffect } from 'react';

interface AuditLog {
  _id: string;
  action: string;
  user: string;
  target: string;
  timestamp: string;
  ip_address?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockLogs: AuditLog[] = [
      {
        _id: '1',
        action: 'user_login',
        user: 'john@example.com',
        target: 'System',
        timestamp: new Date().toISOString(),
        ip_address: '192.168.1.1'
      },
      {
        _id: '2',
        action: 'content_approved',
        user: 'admin@system.com',
        target: 'Content #123',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        _id: '3',
        action: 'user_created',
        user: 'admin@system.com',
        target: 'User: jane@example.com',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      }
    ];

    setLogs(mockLogs);
    setLoading(false);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string) => {
    if (action.includes('login')) return 'bg-blue-100 text-blue-800';
    if (action.includes('approved')) return 'bg-green-100 text-green-800';
    if (action.includes('rejected')) return 'bg-red-100 text-red-800';
    if (action.includes('created')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">System activity and user actions</p>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.target}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No audit logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
