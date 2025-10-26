// app/dashboard/settings/page.tsx - UPDATED VERSION
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
  
  // M-Pesa Change Request
  const [oldMpesaNumber, setOldMpesaNumber] = useState('');
  const [newMpesaNumber, setNewMpesaNumber] = useState('');
  const [reason, setReason] = useState('');
  const [mpesaVerificationCode, setMpesaVerificationCode] = useState('');
  const [mpesaVerificationMethod, setMpesaVerificationMethod] = useState<'2fa' | 'email' | null>(null);
  const [needsMpesaVerification, setNeedsMpesaVerification] = useState(false);
  
  // Password Reset
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVerificationCode, setPasswordVerificationCode] = useState('');
  const [passwordVerificationMethod, setPasswordVerificationMethod] = useState<'2fa' | 'email' | null>(null);
  const [needsPasswordVerification, setNeedsPasswordVerification] = useState(false);
  
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [mpesaRequests, setMpesaRequests] = useState<MpesaChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMpesaRequests = async () => {
      const response = await fetch('/api/mpesa-change-requests', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMpesaRequests(data);
      }
    };
    
    fetchMpesaRequests();
  }, []);

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
    if (!needsMpesaVerification) {
      // First submission - request verification
      if (!oldMpesaNumber || !newMpesaNumber || !reason) {
        setMessage('All fields are required for M-Pesa change request.');
        setMessageType('error');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/mpesa-change-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldNumber: oldMpesaNumber, newNumber: newMpesaNumber, reason }),
        });

        const data = await response.json();

        if (data.needsVerification) {
          setNeedsMpesaVerification(true);
          setMpesaVerificationMethod(data.verificationMethod);
          setMessage(data.message);
          setMessageType('info');
        } else if (response.ok && data.success) {
          setMessage(data.message);
          setMessageType('success');
          // Reset form
          setOldMpesaNumber('');
          setNewMpesaNumber('');
          setReason('');
          // Refresh requests
          const requestsResponse = await fetch('/api/mpesa-change-requests');
          if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            setMpesaRequests(requestsData);
          }
        } else {
          setMessage(data.error || 'Failed to submit request.');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Error:', error);
        setMessage('An error occurred. Please try again.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    } else {
      // Second submission - with verification code
      if (!mpesaVerificationCode) {
        setMessage('Please enter the verification code.');
        setMessageType('error');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/mpesa-change-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldNumber: oldMpesaNumber,
            newNumber: newMpesaNumber,
            reason,
            verificationCode: mpesaVerificationCode,
            verificationMethod: mpesaVerificationMethod,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setMessage(data.message);
          setMessageType('success');
          // Reset all fields
          setOldMpesaNumber('');
          setNewMpesaNumber('');
          setReason('');
          setMpesaVerificationCode('');
          setNeedsMpesaVerification(false);
          setMpesaVerificationMethod(null);
          // Refresh requests
          const requestsResponse = await fetch('/api/mpesa-change-requests');
          if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            setMpesaRequests(requestsData);
          }
        } else {
          setMessage(data.error || 'Verification failed.');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Error:', error);
        setMessage('An error occurred. Please try again.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!needsPasswordVerification) {
      // First submission - request verification
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
      
      if (newPassword.length < 8) {
        setMessage('New password must be at least 8 characters long.');
        setMessageType('error');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await response.json();

        if (data.needsVerification) {
          setNeedsPasswordVerification(true);
          setPasswordVerificationMethod(data.verificationMethod);
          setMessage(data.message);
          setMessageType('info');
        } else if (response.ok && data.success) {
          setMessage(data.message);
          setMessageType('success');
          // Reset form
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          setMessage(data.error || 'Failed to reset password.');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Error:', error);
        setMessage('An error occurred. Please try again.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    } else {
      // Second submission - with verification code
      if (!passwordVerificationCode) {
        setMessage('Please enter the verification code.');
        setMessageType('error');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            verificationCode: passwordVerificationCode,
            verificationMethod: passwordVerificationMethod,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setMessage(data.message);
          setMessageType('success');
          // Reset all fields
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordVerificationCode('');
          setNeedsPasswordVerification(false);
          setPasswordVerificationMethod(null);
        } else {
          setMessage(data.error || 'Verification failed.');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Error:', error);
        setMessage('An error occurred. Please try again.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-2">Settings</h2>
      
      {message && <Alert type={messageType} message={message} onClose={() => setMessage(null)} />}
      
      {/* Two-Factor Authentication Section */}
      <div className="mb-8">
        <TwoFactorAuth userEmail={user.email} />
      </div>

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
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
        >
          Update Profile
        </button>
      </div>

      {/* M-Pesa Change Request Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">Change M-Pesa Number</h3>
        
        {!needsMpesaVerification ? (
          <>
            <div className="mb-4">
              <label className="block font-medium mb-1">Old M-Pesa Number</label>
              <input
                type="text"
                value={oldMpesaNumber}
                onChange={(e) => setOldMpesaNumber(e.target.value)}
                placeholder="254XXXXXXXXX or 07XXXXXXXX"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-1">New M-Pesa Number</label>
              <input
                type="text"
                value={newMpesaNumber}
                onChange={(e) => setNewMpesaNumber(e.target.value)}
                placeholder="254XXXXXXXXX or 07XXXXXXXX"
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
          </>
        ) : (
          <div className="mb-4">
            <label className="block font-medium mb-1">
              {mpesaVerificationMethod === '2fa' ? 'Google Authenticator Code' : 'Email Verification Code'}
            </label>
            <input
              type="text"
              value={mpesaVerificationCode}
              onChange={(e) => setMpesaVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl font-mono tracking-widest"
            />
            <p className="text-sm text-gray-500 mt-2">
              {mpesaVerificationMethod === '2fa' 
                ? 'Enter the code from your Google Authenticator app' 
                : 'Check your email for the verification code'}
            </p>
            <button
              onClick={() => {
                setNeedsMpesaVerification(false);
                setMpesaVerificationCode('');
                setMpesaVerificationMethod(null);
              }}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              ← Cancel and go back
            </button>
          </div>
        )}
        
        <button 
          onClick={handleMpesaChange}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
        >
          {loading ? 'Processing...' : needsMpesaVerification ? 'Verify and Submit' : 'Submit M-Pesa Change Request'}
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
        
        {!needsPasswordVerification ? (
          <>
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
                placeholder="Enter new password (min. 8 characters)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must contain uppercase, lowercase, and numbers
              </p>
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
          </>
        ) : (
          <div className="mb-4">
            <label className="block font-medium mb-1">
              {passwordVerificationMethod === '2fa' ? 'Google Authenticator Code' : 'Email Verification Code'}
            </label>
            <input
              type="text"
              value={passwordVerificationCode}
              onChange={(e) => setPasswordVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl font-mono tracking-widest"
            />
            <p className="text-sm text-gray-500 mt-2">
              {passwordVerificationMethod === '2fa' 
                ? 'Enter the code from your Google Authenticator app' 
                : 'Check your email for the verification code'}
            </p>
            <button
              onClick={() => {
                setNeedsPasswordVerification(false);
                setPasswordVerificationCode('');
                setPasswordVerificationMethod(null);
              }}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
            >
              ← Cancel and go back
            </button>
          </div>
        )}
        
        <button 
          onClick={handleResetPassword}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400"
        >
          {loading ? 'Processing...' : needsPasswordVerification ? 'Verify and Reset Password' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
}
