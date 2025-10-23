// app/dashboard/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Alert from '@/app/ui/Alert';
import { useDashboard } from '../DashboardContext';
import TwoFactorAuth from './TwoFactorAuth';

interface MpesaChangeRequest {
  id: string;
  old_mpesa_number: string;
  new_mpesa_number: string;
  reason: string;
  status: string;
  admin_feedback?: string;
  request_date: string;
  processed_date?: string;
}

export default function SettingsPage() {
  const { user, apiFetch } = useDashboard();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [oldMpesaNumber, setOldMpesaNumber] = useState('');
  const [newMpesaNumber, setNewMpesaNumber] = useState('');
  const [reason, setReason] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [mpesaRequests, setMpesaRequests] = useState<MpesaChangeRequest[]>([]);

  useEffect(() => {
    const fetchMpesaRequests = async () => {
      const result = await apiFetch<MpesaChangeRequest[]>('/mpesa-change-requests', 'GET');
      if (result.success && result.data) setMpesaRequests(result.data);
    };
    
    fetchMpesaRequests();
  }, [apiFetch]);

  const handleUpdateProfile = async () => {
    const result = await apiFetch('/update-profile', 'POST', { name, phone });
    if (result.success) {
      setMessage('Profile updated successfully!');
      setMessageType('success');
    } else {
      setMessage(result.message || 'Update failed.');
      setMessageType('error');
    }
  };

  const handleMpesaChange = async () => {
    if (!oldMpesaNumber || !newMpesaNumber || !reason) {
      setMessage('All fields are required for M-Pesa change request.');
      setMessageType('error');
      return;
    }
    if (!oldMpesaNumber.match(/^254[0-9]{9}$/) || !newMpesaNumber.match(/^254[0-9]{9}$/)) {
      setMessage('Please enter valid M-Pesa numbers (format: 2547XXXXXXXX).');
      setMessageType('error');
      return;
    }
    if (oldMpesaNumber !== user.phone) {
      setMessage('Old M-Pesa number does not match your registered number.');
      setMessageType('error');
      return;
    }
    if (oldMpesaNumber === newMpesaNumber) {
      setMessage('New M-Pesa number cannot be the same as the old one.');
      setMessageType('error');
      return;
    }
    
    const result = await apiFetch('/mpesa-change', 'POST', { 
      oldNumber: oldMpesaNumber, 
      newNumber: newMpesaNumber, 
      reason 
    });
    
    if (result.success) {
      setMessage('M-Pesa number change request submitted for admin review.');
      setMessageType('success');
      setOldMpesaNumber('');
      setNewMpesaNumber('');
      setReason('');
      const requestsResult = await apiFetch<MpesaChangeRequest[]>('/mpesa-change-requests', 'GET');
      if (requestsResult.success && requestsResult.data) setMpesaRequests(requestsResult.data);
    } else {
      setMessage(result.message || 'Failed to submit M-Pesa change request.');
      setMessageType('error');
    }
  };

  const handleResetPassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('All password fields are required.');
      setMessageType('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      setMessageType('error');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('New password must be at least 6 characters long.');
      setMessageType('error');
      return;
    }
    
    const result = await apiFetch('/reset-password', 'POST', { 
      currentPassword, 
      newPassword 
    });
    
    if (result.success) {
      setMessage('Password updated successfully!');
      setMessageType('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage(result.message || 'Failed to update password.');
      setMessageType('error');
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-2">Settings</h2>
      
      {message && <Alert type={messageType} message={message} onClose={() => setMessage(null)} />}
      
      {/* Two-Factor Authentication Section - Using the separate component */}
      <TwoFactorAuth userEmail={user.email} />

      {/* Profile Update Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">Update Profile</h3>
        <div className="mb-4">
          <label className="block font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your full name"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
            disabled
          />
          <p className="text-sm text-gray-500 mt-1">To change your phone number, use the M-Pesa Change Request form below.</p>
        </div>
        <button 
          onClick={handleUpdateProfile}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Update Profile
        </button>
      </div>

      {/* M-Pesa Change Request Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">Change M-Pesa Number</h3>
        <div className="mb-4">
          <label className="block font-medium mb-1">Old M-Pesa Number</label>
          <input
            type="text"
            value={oldMpesaNumber}
            onChange={(e) => setOldMpesaNumber(e.target.value)}
            placeholder="2547XXXXXXXX"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">New M-Pesa Number</label>
          <input
            type="text"
            value={newMpesaNumber}
            onChange={(e) => setNewMpesaNumber(e.target.value)}
            placeholder="2547XXXXXXXX"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Reason for Change</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you need to change your M-Pesa number..."
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button 
          onClick={handleMpesaChange}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Submit M-Pesa Change Request
        </button>
      </div>

      {/* M-Pesa Change Requests History */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">M-Pesa Change Requests</h3>
        {mpesaRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No M-Pesa change requests found.</p>
        ) : (
          <div className="space-y-4">
            {mpesaRequests.map((req) => (
              <div key={req.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong className="text-gray-700">Old Number:</strong> {req.old_mpesa_number}</p>
                    <p><strong className="text-gray-700">New Number:</strong> {req.new_mpesa_number}</p>
                  </div>
                  <div>
                    <p><strong className="text-gray-700">Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        req.status === 'approved' ? 'bg-green-100 text-green-800' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {req.status}
                      </span>
                    </p>
                    <p><strong className="text-gray-700">Requested:</strong> {new Date(req.request_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="mt-2"><strong className="text-gray-700">Reason:</strong> {req.reason}</p>
                {req.admin_feedback && (
                  <p className="mt-2"><strong className="text-gray-700">Admin Feedback:</strong> {req.admin_feedback}</p>
                )}
                {req.processed_date && (
                  <p className="mt-1 text-sm text-gray-500">
                    <strong>Processed:</strong> {new Date(req.processed_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Reset Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Reset Password</h3>
        <div className="mb-4">
          <label className="block font-medium mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter current password"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter new password"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Confirm new password"
          />
        </div>
        <button 
          onClick={handleResetPassword}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
}
