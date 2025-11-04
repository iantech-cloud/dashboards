'use client';

import { useState, useEffect, useRef } from 'react';
import {
  createTicket,
  getUserTickets,
  getTicketById,
  addMessageToTicket,
  closeTicket,
  reopenTicket,
  rateTicket,
  getUserTicketStats,
} from '@/app/actions/tickets';
import { toast } from 'sonner';

// ============ COMPLETE USER SUPPORT PAGE ============
// This is a fully functional support ticket system for end users
// Features: Create tickets, view list, detailed view with chat, ratings, filters

export default function SupportPage() {
  const [activeView, setActiveView] = useState<'list' | 'new' | 'detail'>('list');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', searchTerm: '' });
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'Medium',
    relatedOrderId: '',
    relatedProduct: '',
    tags: '',
    ccEmails: '',
  });
  const [newMessage, setNewMessage] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const CATEGORIES = ['Technical Issue', 'Billing', 'Account', 'Feature Request', 'Bug Report', 'General Inquiry', 'Password Reset', 'Payment Issue', 'Verification', 'Other'];
  const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
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
      const result = await getUserTickets(filters);
      if (result.success) setTickets(result.tickets || []);
      else toast.error(result.error || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const result = await getUserTicketStats();
    if (result.success) setStats(result.stats!);
  };

  const loadTicketDetails = async (ticketId: string) => {
    setLoading(true);
    try {
      const result = await getTicketById(ticketId);
      if (result.success) {
        setSelectedTicket(result.ticket);
        setActiveView('detail');
      } else toast.error(result.error || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim() || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const result = await createTicket({
        subject: formData.subject,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        relatedOrderId: formData.relatedOrderId || undefined,
        relatedProduct: formData.relatedProduct || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
        ccEmails: formData.ccEmails ? formData.ccEmails.split(',').map(e => e.trim()) : undefined,
      });
      if (result.success) {
        toast.success(`Ticket ${result.ticket?.ticketNumber} created!`);
        setFormData({ subject: '', description: '', category: '', priority: 'Medium', relatedOrderId: '', relatedProduct: '', tags: '', ccEmails: '' });
        setActiveView('list');
        loadTickets();
        loadStats();
      } else toast.error(result.error || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    setLoading(true);
    try {
      const result = await addMessageToTicket({ ticketId: selectedTicket.id, message: newMessage });
      if (result.success) {
        toast.success('Message sent');
        setNewMessage('');
        await loadTicketDetails(selectedTicket.id);
      } else toast.error(result.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket || !confirm('Close this ticket?')) return;
    setLoading(true);
    try {
      const result = await closeTicket(selectedTicket.id);
      if (result.success) {
        toast.success('Ticket closed');
        setShowRatingModal(true);
        await loadTicketDetails(selectedTicket.id);
        loadStats();
      } else toast.error(result.error || 'Failed to close ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    setLoading(true);
    try {
      const result = await reopenTicket(selectedTicket.id);
      if (result.success) {
        toast.success('Ticket reopened');
        await loadTicketDetails(selectedTicket.id);
        loadStats();
      } else toast.error(result.error || 'Failed to reopen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedTicket || rating === 0) return;
    setLoading(true);
    try {
      const result = await rateTicket(selectedTicket.id, rating, ratingFeedback);
      if (result.success) {
        toast.success('Thank you for your feedback!');
        setShowRatingModal(false);
        setRating(0);
        setRatingFeedback('');
        await loadTicketDetails(selectedTicket.id);
      } else toast.error(result.error || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
            <p className="text-sm text-gray-500 mt-1">Get help and manage your support tickets</p>
          </div>
          <div className="flex gap-3">
            {activeView !== 'new' && (
              <button onClick={() => setActiveView('new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Ticket
              </button>
            )}
            {activeView !== 'list' && (
              <button onClick={() => setActiveView('list')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                Back to List
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {activeView === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-6 py-4 bg-gray-50">
          {[
            { label: 'Total', value: stats.total, color: 'bg-blue-500' },
            { label: 'Open', value: stats.open, color: 'bg-blue-500' },
            { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-500' },
            { label: 'Resolved', value: stats.resolved, color: 'bg-green-500' },
            { label: 'Closed', value: stats.closed, color: 'bg-gray-500' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm border p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ticket List View */}
      {activeView === 'list' && (
        <div className="p-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="text" placeholder="Search..." value={filters.searchTerm} onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })} className="px-4 py-2 border rounded-lg" />
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-4 py-2 border rounded-lg">
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="px-4 py-2 border rounded-lg">
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="px-4 py-2 border rounded-lg">
                <option value="">All Priorities</option>
                {PRIORITIES.map(pri => <option key={pri} value={pri}>{pri}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Ticket #', 'Subject', 'Status', 'Priority', 'Category', 'Last Updated', 'Messages'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                    <p className="text-gray-500 mb-2">No tickets found</p>
                    <button onClick={() => setActiveView('new')} className="text-blue-600 font-medium">Create your first ticket</button>
                  </td></tr>
                ) : (
                  tickets.map(ticket => (
                    <tr key={ticket.id} onClick={() => loadTicketDetails(ticket.id)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{ticket.ticketNumber}</td>
                      <td className="px-6 py-4"><div className="text-sm font-medium">{ticket.subject}</div>{ticket.assignedTo && <div className="text-xs text-gray-500">Assigned: {ticket.assignedTo.name}</div>}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span></td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ticket.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{getTimeAgo(ticket.lastMessageAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500"><div className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>{ticket.messageCount}</div></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Ticket Form */}
      {activeView === 'new' && (
        <div className="p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold mb-6">Submit New Ticket</h2>
            <form onSubmit={handleSubmitTicket} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Subject <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Brief summary" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category <span className="text-red-500">*</span></label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required>
                    <option value="">Select category</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                    {PRIORITIES.map(pri => <option key={pri} value={pri}>{pri}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Description <span className="text-red-500">*</span></label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={8} className="w-full px-4 py-2 border rounded-lg" placeholder="Detailed information" required />
                </div>
                <div><label className="block text-sm font-medium mb-2">Related Order ID (Optional)</label><input type="text" value={formData.relatedOrderId} onChange={(e) => setFormData({ ...formData, relatedOrderId: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-2">Related Product (Optional)</label><input type="text" value={formData.relatedProduct} onChange={(e) => setFormData({ ...formData, relatedProduct: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-2">Tags (Optional)</label><input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Comma-separated" /></div>
                <div><label className="block text-sm font-medium mb-2">CC Emails (Optional)</label><input type="text" value={formData.ccEmails} onChange={(e) => setFormData({ ...formData, ccEmails: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Comma-separated" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setActiveView('list'); setFormData({ subject: '', description: '', category: '', priority: 'Medium', relatedOrderId: '', relatedProduct: '', tags: '', ccEmails: '' }); }} className="px-6 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Submitting...' : 'Submit Ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail View */}
      {activeView === 'detail' && selectedTicket && (
        <div className="p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{selectedTicket.subject}</h2>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[selectedTicket.status]}`}>{selectedTicket.status}</span>
                    </div>
                    <p className="text-sm text-gray-500">Ticket #{selectedTicket.ticketNumber}</p>
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
                <h3 className="text-lg font-bold mb-4">Conversation</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {selectedTicket.messages?.map((msg: any) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.senderRole === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${msg.senderRole === 'user' ? 'bg-blue-500' : 'bg-green-500'} text-white font-bold`}>
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                      <div className={`flex-1 ${msg.senderRole === 'user' ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{msg.senderName}</span>
                          <span className="text-xs text-gray-500">{formatDate(msg.createdAt)}</span>
                          {msg.senderRole !== 'user' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Support</span>}
                        </div>
                        <div className={`inline-block px-4 py-3 rounded-lg ${msg.senderRole === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {selectedTicket.status !== 'Closed' ? (
                  <div className="mt-6 pt-6 border-t">
                    <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} rows={4} className="w-full px-4 py-2 border rounded-lg" placeholder="Type your message..." />
                    <div className="mt-3 flex justify-end">
                      <button onClick={handleSendMessage} disabled={loading || !newMessage.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        Send Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 pt-6 border-t"><div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-sm text-gray-600">This ticket is closed. {(selectedTicket.status === 'Closed' || selectedTicket.status === 'Resolved') && 'Reopen to continue.'}</p></div></div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold mb-4">Actions</h3>
                <div className="space-y-3">
                  {selectedTicket.status !== 'Closed' && selectedTicket.status !== 'Resolved' && (
                    <button onClick={handleCloseTicket} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close Ticket</button>
                  )}
                  {(selectedTicket.status === 'Closed' || selectedTicket.status === 'Resolved') && (
                    <button onClick={handleReopenTicket} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Reopen Ticket</button>
                  )}
                  {(selectedTicket.status === 'Closed' || selectedTicket.status === 'Resolved') && !selectedTicket.satisfaction?.rating && (
                    <button onClick={() => setShowRatingModal(true)} className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">Rate Support</button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-bold mb-4">Ticket Info</h3>
                <div className="space-y-3 text-sm">
                  <div><span className="text-gray-500">Category:</span><span className="ml-2 font-medium">{selectedTicket.category}</span></div>
                  <div><span className="text-gray-500">Department:</span><span className="ml-2 font-medium">{selectedTicket.department}</span></div>
                  {selectedTicket.assignedTo && <div><span className="text-gray-500">Assigned:</span><span className="ml-2 font-medium">{selectedTicket.assignedTo.name}</span></div>}
                  <div><span className="text-gray-500">Created:</span><span className="ml-2 font-medium">{formatDate(selectedTicket.createdAt)}</span></div>
                  <div><span className="text-gray-500">Updated:</span><span className="ml-2 font-medium">{getTimeAgo(selectedTicket.lastMessageAt)}</span></div>
                  {selectedTicket.closedAt && <div><span className="text-gray-500">Closed:</span><span className="ml-2 font-medium">{formatDate(selectedTicket.closedAt)}</span></div>}
                </div>
              </div>

              {selectedTicket.satisfaction?.rating && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-bold mb-4">Your Rating</h3>
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

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Rate Your Support Experience</h3>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">How satisfied are you?</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRating(star)} className="hover:scale-110">
                    <svg className={`w-10 h-10 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Feedback (Optional)</label>
              <textarea value={ratingFeedback} onChange={(e) => setRatingFeedback(e.target.value)} rows={4} className="w-full px-3 py-2 border rounded-lg" placeholder="Tell us more..." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRatingModal(false)} className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50">Skip</button>
              <button onClick={handleSubmitRating} disabled={rating === 0 || loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Submitting...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
