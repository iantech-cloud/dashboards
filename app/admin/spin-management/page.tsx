"use client";

import { useState, useEffect } from 'react';
import { Settings, Power, PowerOff, Calendar, Clock, Users, TrendingUp, Award, RefreshCw, Save, AlertCircle } from 'lucide-react';

export default function AdminSpinManagement() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/admin/spin/settings'),
        fetch('/api/admin/spin/logs?page=1&limit=10'),
        fetch('/api/admin/spin/analytics')
      ]);

      const settingsData = await settingsRes.json();
      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      if (settingsData.success) setSettings(settingsData.data);
      if (logsData.success) setLogs(logsData.data || []);
      if (statsData.success) setStats(statsData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivation = async (activate: boolean) => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/spin/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activate })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        await loadData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle spin wheel' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/spin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        await loadData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading spin management...</p>
        </div>
      </div>
    );
  }

  const isActive = settings?.is_active || false;
  const isManual = settings?.activation_mode === 'manual';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Spin Wheel Management</h1>
                <p className="text-gray-600">Control spin wheel activation and settings</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full font-semibold ${
                isActive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <AlertCircle className="w-5 h-5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleToggleActivation(!isActive)}
              disabled={saving}
              className={`flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold transition-colors ${
                isActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isActive ? (
                <>
                  <PowerOff className="w-5 h-5" />
                  Deactivate Spin Wheel
                </>
              ) : (
                <>
                  <Power className="w-5 h-5" />
                  Activate Spin Wheel
                </>
              )}
            </button>

            <button
              onClick={loadData}
              disabled={saving}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Activation Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Power className="w-5 h-5 text-blue-600" />
              Activation Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activation Mode
                </label>
                <select
                  value={settings?.activation_mode || 'scheduled'}
                  onChange={(e) => setSettings({ ...settings, activation_mode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="manual">Manual Control</option>
                  <option value="scheduled">Scheduled (Wed & Fri)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Manual override ignores scheduled times
                </p>
              </div>

              {settings?.activation_mode === 'scheduled' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Days
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                        <label key={day} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings?.scheduled_days?.includes(day) || false}
                            onChange={(e) => {
                              const days = settings?.scheduled_days || [];
                              if (e.target.checked) {
                                setSettings({ ...settings, scheduled_days: [...days, day] });
                              } else {
                                setSettings({ ...settings, scheduled_days: days.filter((d: string) => d !== day) });
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm capitalize">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={settings?.start_time || '19:00'}
                        onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={settings?.end_time || '22:00'}
                        onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={settings?.timezone || 'Africa/Nairobi'}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Spin Parameters */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Spin Parameters
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spins Per Session
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings?.spins_per_session || 3}
                  onChange={(e) => setSettings({ ...settings, spins_per_session: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum spins per active session</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Per Spin
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings?.spins_cost_per_spin || 5}
                  onChange={(e) => setSettings({ ...settings, spins_cost_per_spin: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Spins deducted per attempt</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cooldown Period (minutes)
                </label>
                <input
                  type="number"
                  min="60"
                  max="10080"
                  value={settings?.cooldown_minutes || 1440}
                  onChange={(e) => setSettings({ ...settings, cooldown_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Time between sessions (default: 1440 = 24 hours)</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="require_tasks"
                  checked={settings?.require_tasks_completion !== false}
                  onChange={(e) => setSettings({ ...settings, require_tasks_completion: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="require_tasks" className="text-sm text-gray-700">
                  Require weekly tasks completion
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Probability Multipliers */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Probability Multipliers by Tier
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['starter', 'bronze', 'silver', 'gold', 'diamond'].map(tier => (
              <div key={tier}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {tier}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  value={settings?.probability_multipliers?.[tier] || 1.0}
                  onChange={(e) => setSettings({
                    ...settings,
                    probability_multipliers: {
                      ...settings?.probability_multipliers,
                      [tier]: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Higher multipliers increase win probability for each tier</p>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Mode</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="maintenance"
                checked={settings?.maintenance_mode || false}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                className="rounded text-blue-600"
              />
              <label htmlFor="maintenance" className="text-sm text-gray-700">
                Enable maintenance mode
              </label>
            </div>

            {settings?.maintenance_mode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maintenance Message
                </label>
                <textarea
                  value={settings?.maintenance_message || ''}
                  onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter message to display to users..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 opacity-80" />
                <span className="text-2xl font-bold">{stats.total_spins_today || 0}</span>
              </div>
              <p className="text-sm opacity-90">Spins Today</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 opacity-80" />
                <span className="text-2xl font-bold">{stats.total_wins_today || 0}</span>
              </div>
              <p className="text-sm opacity-90">Wins Today</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 opacity-80" />
                <span className="text-2xl font-bold">
                  KES {((stats.total_revenue_today_cents || 0) / 100).toFixed(0)}
                </span>
              </div>
              <p className="text-sm opacity-90">Revenue Today</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 opacity-80" />
                <span className="text-2xl font-bold">
                  KES {((stats.total_payouts_today_cents || 0) / 100).toFixed(0)}
                </span>
              </div>
              <p className="text-sm opacity-90">Payouts Today</p>
            </div>
          </div>
        )}

        {/* Recent Spin Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Spin Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prize</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {log.user_id?.username || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {log.prize_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.won 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {log.won ? 'Won' : 'Lost'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        KES {((log.prize_value_cents || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No spin activity yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
