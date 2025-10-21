// app/dashboard/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Alert from '@/app/ui/Alert';
import { useDashboard } from '../DashboardContext';

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
      const result = await apiFetch<MpesaChangeRequest[]>('/api/mpesa-change-requests', 'GET');
      if (result.success && result.data) setMpesaRequests(result.data);
    };
    fetchMpesaRequests();
  }, [apiFetch]);

  const handleUpdateProfile = async () => {
    const result = await apiFetch('/api/update-profile', 'POST', { name, phone });
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
    const result = await apiFetch('/api/mpesa-change', 'POST', { oldNumber: oldMpesaNumber, newNumber: newMpesaNumber, reason });
    if (result.success) {
      setMessage('M-Pesa number change request submitted for admin review.');
      setMessageType('success');
      setOldMpesaNumber('');
      setNewMpesaNumber('');
      setReason('');
      const requestsResult = await apiFetch<MpesaChangeRequest[]>('/api/mpesa-change-requests', 'GET');
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
    const result = await apiFetch('/api/reset-password', 'POST', { currentPassword, newPassword });
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
      
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">Update Profile</h3>
        <div className="mb-4">
          <label className="block font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 border rounded"
            disabled
          />
          <p className="text-sm text-gray-500 mt-1">To change your phone number, use the M-Pesa Change Request form below.</p>
        </div>
        <button onClick={handleUpdateProfile} className="w-full py-2 bg-indigo-600 text-white rounded">Update Profile</button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">Change M-Pesa Number</h3>
        <div className="mb-4">
          <label className="block font-medium mb-1">Old M-Pesa Number</label>
          <input
            type="text"
            value={oldMpesaNumber}
            onChange={(e) => setOldMpesaNumber(e.target.value)}
            placeholder="2547XXXXXXXX"
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">New M-Pesa Number</label>
          <input
            type="text"
            value={newMpesaNumber}
            onChange={(e) => setNewMpesaNumber(e.target.value)}
            placeholder="2547XXXXXXXX"
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Reason for Change</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you need to change your M-Pesa number"
            className="w-full p-2 border rounded"
          />
        </div>
        <button onClick={handleMpesaChange} className="w-full py-2 bg-indigo-600 text-white rounded">Submit M-Pesa Change Request</button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">M-Pesa Change Requests</h3>
        {mpesaRequests.length === 0 ? (
          <p className="text-gray-500">No M-Pesa change requests found.</p>
        ) : (
          <ul>
            {mpesaRequests.map((req) => (
              <li key={req.id} className="p-4 border-b last:border-b-0">
                <p><strong>Old Number:</strong> {req.old_mpesa_number}</p>
                <p><strong>New Number:</strong> {req.new_mpesa_number}</p>
                <p><strong>Reason:</strong> {req.reason}</p>
                <p><strong>Status:</strong> {req.status}</p>
                {req.admin_feedback && <p><strong>Admin Feedback:</strong> {req.admin_feedback}</p>}
                <p><strong>Requested:</strong> {new Date(req.request_date).toLocaleDateString()}</p>
                {req.processed_date && <p><strong>Processed:</strong> {new Date(req.processed_date).toLocaleDateString()}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Reset Password</h3>
        <div className="mb-4">
          <label className="block font-medium mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <button onClick={handleResetPassword} className="w-full py-2 bg-indigo-600 text-white rounded">Reset Password</button>
      </div>
    </div>
  );
}
