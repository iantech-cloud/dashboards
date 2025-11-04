'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getAllTickets,
  getTicketByIdAdmin,
  assignTicket,
  updateTicketStatus,
  addAdminMessage,
  addInternalNote,
  updateTicketPriority,
  updateTicketCategory,
  getTicketStatistics,
  getSupportAgents,
  getMyAssignedTickets,
  bulkUpdateStatus,
  bulkAssignTickets,
} from '@/app/actions/admin/tickets';
import { toast } from 'sonner';

// ============ COMPLETE ADMIN SUPPORT PAGE ============
// Full-featured admin interface for managing support tickets
// Features: View all tickets, assign, update status, internal notes, bulk actions, statistics

export default function AdminSupportPage() {
  const [activeView, setActiveView] = useState<'list' | 'detail' | 'stats'>('list');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    assignedTo: '',
    searchTerm: '',
    isOverdue: false,
  });
  const [newMessage, setNewMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [showInternalNoteModal, setShowInternalNoteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const CATEGORIES = ['Technical Issue', 'Billing', 'Account', 'Feature Request', 'Bug Report', 'General Inquiry', 'Password Reset', 'Payment Issue', 'Verification', 'Other'];
  const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
  const STATUSES = ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'];
  const STATUS_COLORS: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Waiting for Customer': 'bg-orange-100 text-orange-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Closed': 'bg-gray-100 text-gray-800',
    'Reopened': 'bg-purple-100 text-purple-800',
  };
  const PRIORITY_COLORS: Record<string, string> = {
    'Low': 'bg-gray-100 text-gray-700',
    'Medium': 'bg-blue-100 text-blue-700',
    'High': 'bg-orange-100 text-orange-700',
    'Urgent': 'bg-red-100 text-red-700',
  };

  useEffect(() => {
    loadTickets();
    loadAgents();
    loadStats();
  }, [filters]);

  useEffect(() => {
    if (selectedTicket?.messages) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const getTimeAgo = (date: Date | string) => {
    const diff = new Date().getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const result = await getAllTickets(filters);
      if (result.success) setTickets(result.tickets || []);
      else toast.error(result.error || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const result = await getTicketStatistics();
    if (result.success) setStats(result.stats);
  };

  const loadAgents = async () => {
    const result = await getSupportAgents();
    if (result.success) setAgents(result.agents || []);
  };

  const loadTicketDetails = async (ticketId: string) => {
    setLoading(true);
    try {
      const result = await getTicketByIdAdmin(ticketId);
      if (result.success) {
        setSelectedTicket(result.ticket);
        setActiveView('detail');
      } else toast.error(result.error || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = async (agentId: string) => {
    if (!selectedTicket) return;
    setLoading(true);
    try {
      const result = await assignTicket({ ticketId: selectedTicket.id, agentId });
      if (result.success) {
        toast.success(result.message);
        await loadTicketDetails(selectedTicket.id);
      } else toast.error(result.error || 'Failed to assign');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    setLoading(true);
    try {
      const result = await updateTicketStatus({ ticketId: selectedTicket.id, status });
      if (result.success) {
        toast.success(result.message);
        await loadTicketDetails(selectedTicket.id);
        loadStats();
      } else toast.error(result.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    if (!selectedTicket) return;
    setLoading(true);
    try {
      const result = await updateTicketPriority(selectedTicket.id, priority);
      if (result.success) {
        toast.success(result.message);
        await loadTicketDetails(selectedTicket.id);
      } else toast.error(result.error || 'Failed to update priority');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (category: string) => {
    if (!selectedTicket) return;
    setLoading(true);
    try {
      const result = await updateTicketCategory(selectedTicket.id, category);
      if (result.success) {
        toast.success(result.message);
        await loadTicketDetails(selectedTicket.id);
      } else toast.error(result.error || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    setLoading(true);
    try {
      const result = await addAdminMessage(selectedTicket.id, newMessage);
      if (result.success) {
        toast.success('Message sent');
        setNewMessage('');
        await loadTicketDetails(selectedTicket.id);
      } else toast.error(result.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedTicket || !internalNote.trim()) return;
    setLoading(true);
    try {
      const result = await addInternalNote({ ticketId: selectedTicket.id, note: internalNote });
      if (result.success) {
        toast.success('Internal note added');
        setInternalNote('');
        setShowInternalNoteModal(false);
        await loadTicketDetails(selectedTicket.id);
      } else toast.error(result.error || 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: 'assign' | 'status', value: string) => {
    if (selectedTickets.length === 0) {
      toast.error('No tickets selected');
      return;
    }
    setLoading(true);
    try {
      const result = action === 'assign' 
        ? await bulkAssignTickets(selectedTickets, value)
        : await bulkUpdateStatus(selectedTickets, value);
      if (result.success) {
        toast.success(result.message);
        setSelectedTickets([]);
        setShowBulkModal(false);
        loadTickets();
        loadStats();
      } else toast.error(result.error || 'Failed to perform bulk action');
    } finally {
      setLoading(false);
    }
  };

  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTickets(prev =>
      prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId]
    );
  };

  const selectAllTickets = () => {
    if (selectedTickets.length === tickets.length) setSelectedTickets([]);
    else setSelectedTickets(tickets.map(t => t.id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and respond to customer support tickets</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setActiveView('stats')} className={`px-4 py-2 rounded-lg ${activeView === 'stats' ? 'bg-blue-600 text-white' : 'border text-gray-700 hover:bg-gray-50'}`}>
              Statistics
            </button>
            {activeView !== 'list' && (
              <button onClick={() => setActiveView('list')} className="border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                Back to List
              </button>
            )}
            {selectedTickets.length > 0 && (
              <button onClick={() => setShowBulkModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                Bulk Actions ({selectedTickets.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics View */}
      {activeView === 'stats' && stats && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Tickets', value: stats.total, color: 'bg-blue-500' },
              { label: 'Open', value: stats.open, color: 'bg-blue-500' },
              { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-500' },
              { label: 'Unassigned', value: stats.unassigned, color: 'bg-red-500' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-sm border p-6">
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-bold mb-4">Priority Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(stats.priorityBreakdown || {}).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${PRIORITY_COLORS[priority]}`}>{priority}</span>
                    <span className="text-2xl font-bold">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-bold mb-4">Top Categories</h3>
              <div className="space-y-3">
                {stats.categoryBreakdown?.slice(0, 5).map((item: any) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.category}</span>
                    <span className="text-xl font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-bold mb-4">Agent Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agents.map(agent => (
                <div key={agent.id} className="border rounded-lg p-4">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-gray-500">{agent.email}</p>
                  <p className="text-sm text-gray-500 mt-2">Active Tickets: <span className="font-bold">{agent.assignedTickets}</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ticket List View */}
      {activeView === 'list' && (
        <div className="p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            {stats && [
              { label: 'Total', value: stats.total },
              { label: 'Open', value: stats.open },
              { label: 'In Progress', value: stats.inProgress },
              { label: 'Resolved', value: stats.resolved },
              { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
              { label: 'Unassigned', value: stats.unassigned, color: 'text-orange-600' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-sm border p-4">
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color || 'text-gray-900'}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <input type="text" placeholder="Search..." value={filters.searchTerm} onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })} className="px-4 py-2 border rounded-lg" />
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-4 py-2 border rounded-lg">
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="px-4 py-2 border rounded-lg">
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="px-4 py-2 border rounded-lg">
                <option value="">All Priorities</option>
                {PRIORITIES.map(pri => <option key={pri} value={pri}>{pri}</option>)}
              </select>
              <select value={filters.assignedTo} onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })} className="px-4 py-2 border rounded-lg">
                <option value="">All Agents</option>
                <option value="unassigned">Unassigned</option>
                {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
              <label className="flex items-center px-4 py-2 border rounded-lg cursor-pointer">
                <input type="checkbox" checked={filters.isOverdue} onChange={(e) => setFilters({ ...filters, isOverdue: e.target.checked })} className="mr-2" />
                <span className="text-sm">Overdue Only</span>
              </label>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" onChange={selectAllTickets} checked={selectedTickets.length === tickets.length && tickets.length > 0} />
                  </th>
                  {['Ticket #', 'User', 'Subject', 'Status', 'Priority', 'Category', 'Assigned', 'Created', 'Messages'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={10} className="px-6 py-12 text-center text-gray-500">No tickets found</td></tr>
                ) : (
                  tickets.map(ticket => (
                    <tr key={ticket.id} className={`hover:bg-gray-50 ${ticket.sla?.isOverdue ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedTickets.includes(ticket.id)} onChange={() => toggleTicketSelection(ticket.id)} onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 text-sm font-medium text-blue-600 cursor-pointer">{ticket.ticketNumber}</td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 cursor-pointer">
                        <div className="text-sm font-medium">{ticket.user.name}</div>
                        <div className="text-xs text-gray-500">{ticket.user.email}</div>
                      </td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 cursor-pointer"><div className="text-sm">{ticket.subject}</div></td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 cursor-pointer"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span></td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 cursor-pointer"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span></td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 text-sm text-gray-500 cursor-pointer">{ticket.category}</td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 text-sm text-gray-500 cursor-pointer">{ticket.assignedTo ? ticket.assignedTo.name : <span className="text-orange-600">Unassigned</span>}</td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 text-sm text-gray-500 cursor-pointer">{getTimeAgo(ticket.createdAt)}</td>
                      <td onClick={() => loadTicketDetails(ticket.id)} className="px-6 py-4 text-sm text-gray-500 cursor-pointer">{ticket.messageCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Detail View */}
      {activeView === 'detail' && selectedTicket && (
        <div className="p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{selectedTicket.subject}</h2>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[selectedTicket.status]}`}>{selectedTicket.status}</span>
                      {selectedTicket.sla?.isOverdue && <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">OVERDUE</span>}
                    </div>
                    <p className="text-sm text-gray-500">Ticket #{selectedTicket.ticketNumber}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span>User: <strong>{selectedTicket.user.name}</strong></span>
                      <span>{selectedTicket.user.email}</span>
                      {selectedTicket.user.phone && <span>{selectedTicket.user.phone}</span>}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                {selectedTicket.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedTicket.tags.map((tag: string, i: number) => <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded-full">#{tag}</span>)}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold mb-4">Conversation & Internal Notes</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {selectedTicket.messages?.map((msg: any) => (
                    <div key={msg.id} className={`${msg.isInternalNote ? 'bg-yellow-50 border-l-4 border-yellow-400 pl-4' : ''} pb-4`}>
                      {msg.isInternalNote && <div className="text-xs font-bold text-yellow-700 mb-2">🔒 INTERNAL NOTE</div>}
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.senderRole === 'user' ? 'bg-blue-500' : 'bg-green-500'} text-white font-bold`}>
                          {msg.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{msg.senderName}</span>
                            <span className="text-xs text-gray-500">{formatDate(msg.createdAt)}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${msg.senderRole === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {msg.senderRole === 'user' ? 'Customer' : 'Support'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900 whitespace-pre-wrap">{msg.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {selectedTicket.status !== 'Closed' && (
                  <div className="mt-6 pt-6 border-t space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Send Message to Customer</label>
                      <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} rows={4} className="w-full px-4 py-2 border rounded-lg" placeholder="Type your response..." />
                      <div className="mt-3 flex justify-end gap-3">
                        <button onClick={() => setShowInternalNoteModal(true)} className="px-4 py-2 border border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50">Add Internal Note</button>
                        <button onClick={handleSendMessage} disabled={loading || !newMessage.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Send Message</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Log */}
              {selectedTicket.activityLog && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-bold mb-4">Activity History</h3>
                  <div className="space-y-3">
                    {selectedTicket.activityLog.slice(0, 10).map((log: any) => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className="text-gray-500">{formatDate(log.timestamp)}</div>
                        <div className="flex-1">
                          <span className="font-medium">{log.performedBy}</span> - {log.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold mb-4">Actions</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select value={selectedTicket.status} onChange={(e) => handleUpdateStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg" disabled={loading}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority</label>
                    <select value={selectedTicket.priority} onChange={(e) => handleUpdatePriority(e.target.value)} className="w-full px-3 py-2 border rounded-lg" disabled={loading}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select value={selectedTicket.category} onChange={(e) => handleUpdateCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg" disabled={loading}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Assign To</label>
                    <select value={selectedTicket.assignedTo?.id || ''} onChange={(e) => handleAssignTicket(e.target.value)} className="w-full px-3 py-2 border rounded-lg" disabled={loading}>
                      <option value="">Unassigned</option>
                      {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name} ({agent.assignedTickets})</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SLA Tracking */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold mb-4">SLA Tracking</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">First Response Due:</span>
                    <div className={`font-medium ${!selectedTicket.sla?.firstResponseAt && new Date(selectedTicket.sla?.firstResponseDue) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDate(selectedTicket.sla?.firstResponseDue)}
                    </div>
                  </div>
                  {selectedTicket.sla?.firstResponseAt && (
                    <div>
                      <span className="text-gray-500">First Response At:</span>
                      <div className="font-medium text-green-600">{formatDate(selectedTicket.sla.firstResponseAt)}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Resolution Due:</span>
                    <div className={`font-medium ${!selectedTicket.sla?.resolvedAt && new Date(selectedTicket.sla?.resolutionDue) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDate(selectedTicket.sla?.resolutionDue)}
                    </div>
                  </div>
                  {selectedTicket.sla?.resolvedAt && (
                    <div>
                      <span className="text-gray-500">Resolved At:</span>
                      <div className="font-medium text-green-600">{formatDate(selectedTicket.sla.resolvedAt)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Satisfaction */}
              {selectedTicket.satisfaction?.rating && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-bold mb-4">Customer Rating</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg key={star} className={`w-6 h-6 ${star <= selectedTicket.satisfaction.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {selectedTicket.satisfaction.feedback && <p className="text-sm text-gray-600 mt-2">{selectedTicket.satisfaction.feedback}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Internal Note Modal */}
      {showInternalNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add Internal Note</h3>
            <p className="text-sm text-gray-600 mb-4">Internal notes are only visible to support staff</p>
            <textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={6} className="w-full px-4 py-2 border rounded-lg mb-4" placeholder="Type your internal note..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowInternalNoteModal(false); setInternalNote(''); }} className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddInternalNote} disabled={loading || !internalNote.trim()} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50">Add Note</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Bulk Actions</h3>
            <p className="text-sm text-gray-600 mb-4">{selectedTickets.length} ticket(s) selected</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Update Status</label>
                <select onChange={(e) => { if (e.target.value) handleBulkAction('status', e.target.value); }} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select status...</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Assign To</label>
                <select onChange={(e) => { if (e.target.value) handleBulkAction('assign', e.target.value); }} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select agent...</option>
                  {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowBulkModal(false); setSelectedTickets([]); }} className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
