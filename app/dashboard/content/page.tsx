// app/dashboard/content/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  RotateCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { getUserContentSubmissions, deleteContentSubmission, ContentType, ContentStatus, PaymentStatus } from '@/app/actions/dashboard/content';

// =============================================================================
// TYPE DEFINITIONS - UPDATED TO MATCH ACTIONS
// =============================================================================

interface ContentSubmission {
  _id: string;
  title: string;
  content_type: ContentType;
  content_text: string;
  status: ContentStatus;
  payment_status: PaymentStatus;
  payment_amount: number; // This is already in KSH from the actions
  submission_date: string;
  task_category: string;
  admin_feedback?: string;
  revision_notes?: string;
  word_count?: number;
  tags?: string[];
  attachments?: string[];
  user_id: string;
  approved_at?: string;
  approved_by?: {
    _id: string;
    username?: string;
    name?: string;
    email?: string;
  };
}

interface ContentSubmissionsResponse {
  success: boolean;
  data?: ContentSubmission[];
  message?: string;
  totalPages?: number;
  currentPage?: number;
  totalCount?: number;
}

interface DeleteResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ContentListingPage() {
  // State management
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load submissions
  useEffect(() => {
    loadSubmissions();
  }, [currentPage, statusFilter, typeFilter]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { content_type: typeFilter }),
        ...(searchTerm && { search: searchTerm }),
        page: currentPage,
        limit: 10
      };

      const result: ContentSubmissionsResponse = await getUserContentSubmissions(filters);

      if (result.success && result.data) {
        setSubmissions(result.data);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.totalCount || 0);
      } else {
        setError(result.message || 'Failed to load submissions');
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError('Failed to load submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadSubmissions();
  };

  // Handle delete submission
  const handleDeleteSubmission = async (id: string) => {
    try {
      setDeletingId(id);
      setDeleteError(null);
      
      const result: DeleteResponse = await deleteContentSubmission(id);

      if (result.success) {
        setSubmissions(prev => prev.filter(sub => sub._id !== id));
        setDeleteConfirm(null);
        // Reload to update counts
        loadSubmissions();
      } else {
        setDeleteError(result.message || 'Failed to delete submission');
      }
    } catch (err) {
      console.error('Error deleting submission:', err);
      setDeleteError('Failed to delete submission. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Get status badge color and icon
  const getStatusInfo = (status: ContentStatus) => {
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
          text: 'Pending Review'
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
  const getPaymentStatusInfo = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          text: 'Paid'
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: 'Payment Pending'
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          text: 'Payment Rejected'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          text: status
        };
    }
  };

  // Get content type display name - UPDATED TO MATCH ACTIONS
  const getContentTypeDisplay = (type: ContentType) => {
    const typeMap: { [key in ContentType]: string } = {
      'blog_post': 'Blog Post',
      'social_media': 'Social Media',
      'product_review': 'Product Review',
      'video': 'Video',
      'other': 'Other'
    };
    return typeMap[type] || type;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format payment amount - UPDATED: Amount is already in KSH
  const formatPayment = (amount: number) => {
    return `KES ${amount.toFixed(2)}`;
  };

  // Calculate total earned - UPDATED: Amounts are already in KSH
  const calculateTotalEarned = () => {
    return submissions
      .filter(sub => sub.payment_status === 'paid')
      .reduce((sum, sub) => sum + sub.payment_amount, 0);
  };

  // Check if submission can be deleted
  const canDeleteSubmission = (submission: ContentSubmission) => {
    return submission.status !== 'approved' && submission.payment_status !== 'paid';
  };

  // Pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * 10, totalCount)}</span> of{' '}
              <span className="font-medium">{totalCount}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Content Submissions</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage and track your content submissions
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              href="/dashboard/content/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Content
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          <div className="text-sm text-gray-600">Total Submissions</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {submissions.filter(s => s.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {submissions.filter(s => s.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">
            KES {calculateTotalEarned().toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Earned</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title, category, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="revision_requested">Revision Requested</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{deleteError}</p>
          </div>
          <button
            onClick={() => setDeleteError(null)}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-blue-600 w-8 h-8 mr-3" />
          <p className="text-gray-600">Loading submissions...</p>
        </div>
      )}

      {/* Content List */}
      {!loading && submissions.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No submissions match your filters. Try adjusting your search criteria.'
              : "You haven't submitted any content yet. Get started by creating your first submission!"}
          </p>
          <Link
            href="/dashboard/content/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Submission
          </Link>
        </div>
      )}

      {/* Submissions Grid */}
      {!loading && submissions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => {
                  const statusInfo = getStatusInfo(submission.status);
                  const paymentInfo = getPaymentStatusInfo(submission.payment_status);
                  const canDelete = canDeleteSubmission(submission);
                  
                  return (
                    <tr key={submission._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">
                              {submission.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {submission.task_category}
                            </div>
                            {submission.word_count && (
                              <div className="text-xs text-gray-400 mt-1">
                                {submission.word_count} words
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getContentTypeDisplay(submission.content_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          {statusInfo.icon}
                          <span className="ml-1">{statusInfo.text}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${paymentInfo.color}`}>
                          {paymentInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPayment(submission.payment_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(submission.submission_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Button */}
                          <Link
                            href={`/dashboard/content/${submission._id}`}
                            className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Edit Button - Only show for pending or revision requested */}
                          {(submission.status === 'pending' || submission.status === 'revision_requested') && (
                            <Link
                              href={`/dashboard/content/edit/${submission._id}`}
                              className="text-green-600 hover:text-green-900 transition-colors p-1 rounded hover:bg-green-50"
                              title="Edit Submission"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirm(submission._id)}
                            disabled={deletingId === submission._id || !canDelete}
                            className={`transition-colors p-1 rounded ${
                              canDelete 
                                ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                                : 'text-gray-400 cursor-not-allowed'
                            } disabled:opacity-50`}
                            title={canDelete ? "Delete Submission" : "Cannot delete approved or paid content"}
                          >
                            {deletingId === submission._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Delete Confirmation Modal */}
                        {deleteConfirm === submission._id && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded-lg max-w-md mx-4">
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Delete Submission
                              </h3>
                              <p className="text-gray-600 mb-4">
                                Are you sure you want to delete "{submission.title}"? This action cannot be undone.
                              </p>
                              {!canDelete && (
                                <p className="text-red-600 text-sm mb-4">
                                  This submission cannot be deleted because it has been approved or paid.
                                </p>
                              )}
                              <div className="flex justify-end space-x-3">
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteSubmission(submission._id)}
                                  disabled={deletingId === submission._id || !canDelete}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                  {deletingId === submission._id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {renderPagination()}
        </div>
      )}

      {/* Admin Feedback Section */}
      {!loading && submissions.some(s => s.admin_feedback || s.revision_notes) && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Important Notices
          </h3>
          <div className="space-y-4">
            {submissions
              .filter(s => s.admin_feedback || s.revision_notes)
              .map(submission => (
                <div key={submission._id} className="bg-white rounded-lg p-4 border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{submission.title}</h4>
                    <span className="text-sm text-gray-500">{formatDate(submission.submission_date)}</span>
                  </div>
                  {submission.revision_notes && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-orange-700">Revision Requested:</p>
                      <p className="text-sm text-gray-700 mt-1">{submission.revision_notes}</p>
                    </div>
                  )}
                  {submission.admin_feedback && (
                    <div>
                      <p className="text-sm font-medium text-blue-700">Admin Feedback:</p>
                      <p className="text-sm text-gray-700 mt-1">{submission.admin_feedback}</p>
                    </div>
                  )}
                  {(submission.status === 'revision_requested') && (
                    <Link
                      href={`/dashboard/content/edit/${submission._id}`}
                      className="inline-flex items-center mt-3 px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Make Revisions
                    </Link>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
