// app/admin/approvals/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RotateCw,
  DollarSign,
  User,
  Calendar
} from 'lucide-react';

interface ContentSubmission {
  _id: string;
  title: string;
  content_type: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  payment_status: 'pending' | 'paid' | 'rejected';
  payment_amount: number;
  submission_date: string;
  task_category: string;
  word_count?: number;
  user: {
    _id: string;
    username?: string;
    name?: string;
    email?: string;
  };
}

export default function AdminApprovalsPage() {
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/submissions');
      
      if (!response.ok) {
        throw new Error('Failed to load submissions');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSubmissions(result.data || []);
      } else {
        setError(result.message || 'Failed to load submissions');
      }
    } catch (err) {
      setError('Failed to load submissions. Please try again.');
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter submissions based on search and filters
  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.task_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    const matchesType = typeFilter === 'all' || submission.content_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get status badge color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Approved'
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="w-4 h-4" />,
          text: 'Pending'
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="w-4 h-4" />,
          text: 'Rejected'
        };
      case 'revision_requested':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <RotateCw className="w-4 h-4" />,
          text: 'Revision Requested'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Clock className="w-4 h-4" />,
          text: status
        };
    }
  };

  // Get payment status badge
  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          color: 'bg-green-100 text-green-800',
          text: 'Paid'
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          text: 'Pending'
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800',
          text: 'Rejected'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          text: status
        };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format content type
  const formatContentType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Get stats
  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    revision: submissions.filter(s => s.status === 'revision_requested').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3 text-gray-600">Loading submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Content Approvals</h1>
              <p className="mt-2 text-gray-600">
                Review and manage user content submissions
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={loadSubmissions}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <RotateCw className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revision Needed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.revision}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 mr-2" />
              <p>{error}</p>
            </div>
            <button
              onClick={loadSubmissions}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by title, category, or user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="revision_requested">Revision Requested</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="blog_post">Blog Post</option>
                  <option value="social_media">Social Media</option>
                  <option value="product_review">Product Review</option>
                  <option value="video">Video</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Filter className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {submissions.length === 0 
                    ? "No content submissions have been made yet."
                    : "No submissions match your current filters."
                  }
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type & Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.map((submission) => {
                    const statusInfo = getStatusInfo(submission.status);
                    const paymentInfo = getPaymentStatusInfo(submission.payment_status);
                    
                    return (
                      <tr key={submission._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
                              {submission.title}
                            </div>
                            {submission.word_count && (
                              <div className="text-sm text-gray-500">
                                {submission.word_count} words
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.user.name || submission.user.username || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {submission.user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {formatContentType(submission.content_type)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {submission.task_category}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span className="ml-1">{statusInfo.text}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentInfo.color}`}>
                              {paymentInfo.text}
                            </span>
                            <div className="text-sm font-medium text-gray-900">
                              KES {submission.payment_amount.toFixed(2)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            {formatDate(submission.submission_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/admin/user-content/${submission._id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>
            Showing {filteredSubmissions.length} of {submissions.length} submissions
          </p>
        </div>
      </div>
    </div>
  );
}
