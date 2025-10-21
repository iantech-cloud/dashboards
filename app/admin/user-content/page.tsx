// app/admin/user-content/page.tsx

import Link from 'next/link';
import { getAllUserContentSubmissions, getAdminContentStats } from '../../actions/user-content';
import { UserContentStatusBadge } from './components/UserContentStatusBadge';
import { UserContentTypeBadge } from './components/UserContentTypeBadge';
import { PaymentStatusBadge } from './components/PaymentStatusBadge';
import { AttachmentButton } from './components/AttachmentButton';

interface UserContentPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    content_type?: string;
  }>;
}

export default async function UserContentPage({ searchParams }: UserContentPageProps) {
  // Await the searchParams Promise first
  const params = await searchParams;
  
  const page = parseInt(params.page || '1');
  const search = params.search || '';
  const status = params.status || 'all';
  const content_type = params.content_type || 'all';

  // Now fetch data after awaiting searchParams
  const [submissionsResult, statsResult] = await Promise.all([
    getAllUserContentSubmissions({
      page,
      search,
      status,
      content_type
    }),
    getAdminContentStats()
  ]);

  if (!submissionsResult.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm">{submissionsResult.message}</p>
          </div>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center mt-4 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { data: submissions, totalPages, currentPage, totalCount } = submissionsResult;
  const stats = statsResult.success ? statsResult.data : null;

  // Safe user display function
  const getUserDisplayName = (submission: any) => {
    if (!submission.user) return 'Unknown User';
    
    const user = submission.user;
    return user.username || user.name || user.email || 'Unknown User';
  };

  // Safe user ID function
  const getUserId = (submission: any) => {
    if (!submission.user) return 'unknown';
    
    const user = submission.user;
    return user._id || user.id || 'unknown';
  };

  // Helper to calculate word count from HTML content
  const calculateWordCount = (htmlContent: string): number => {
    if (!htmlContent) return 0;
    const text = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  };

  // Helper to format KSH amounts properly
  const formatKshAmount = (amount: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return 'Ksh 0.00';
    }
    
    // Ensure the amount is properly formatted with 2 decimal places
    const formattedAmount = amount.toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    
    return `Ksh ${formattedAmount}`;
  };

  // Get base amount from submission (already in KSH from the action)
  const getBaseAmount = (submission: any): number => {
    if (!submission) return 0;
    
    // The action already converts cents to KSH, so we can use it directly
    const baseAmount = submission.payment_amount || 0;
    const bonusAmount = submission.bonus_amount || 0;
    
    // Return base amount without bonus
    return baseAmount - bonusAmount;
  };

  // Get bonus amount from submission (already in KSH from the action)
  const getBonusAmount = (submission: any): number => {
    if (!submission) return 0;
    
    // The action already converts cents to KSH, so we can use it directly
    return submission.bonus_amount || 0;
  };

  // Calculate total amount (base + bonus) - already in KSH from the action
  const getTotalAmount = (submission: any): number => {
    if (!submission) return 0;
    
    // The payment_amount from the action is already total amount in KSH
    return submission.payment_amount || 0;
  };

  // Debug function to check amount data (remove in production)
  const debugAmounts = (submission: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Submission amounts:', {
        id: submission._id,
        payment_amount: submission.payment_amount,
        bonus_amount: submission.bonus_amount,
        base: getBaseAmount(submission),
        bonus: getBonusAmount(submission),
        total: getTotalAmount(submission)
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Content Submissions</h1>
          <p className="text-gray-600 mt-2">Review and manage user-submitted content from earn by tasks</p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Revision Requested</p>
                <p className="text-2xl font-bold text-gray-900">{stats.revisionRequested}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatKshAmount(stats.totalPaid || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug section - remove after testing */}
      {process.env.NODE_ENV === 'development' && submissions && submissions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs">
          <div className="font-medium text-yellow-800 mb-2">Debug Info (Development Only):</div>
          <div>Total Paid from API: {stats?.totalPaid}</div>
          <div>Submissions count: {submissions?.length}</div>
          <div>First submission total: {formatKshAmount(getTotalAmount(submissions[0]))}</div>
          <div>First submission base: {formatKshAmount(getBaseAmount(submissions[0]))}</div>
          <div>First submission bonus: {formatKshAmount(getBonusAmount(submissions[0]))}</div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-md">
        <form className="flex flex-col lg:flex-row gap-4" method="GET">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                name="search"
                placeholder="Search by title, content, category, or user..."
                defaultValue={search}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              name="status"
              defaultValue={status}
              className="w-full lg:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="revision_requested">Revision Requested</option>
            </select>
          </div>

          {/* Content Type Filter */}
          <div>
            <select
              name="content_type"
              defaultValue={content_type}
              className="w-full lg:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="blog_post">Blog Post</option>
              <option value="social_media">Social Media</option>
              <option value="product_review">Product Review</option>
              <option value="video">Video</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xl">
        {!submissions || submissions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No submissions found</h3>
            <p className="mt-1 text-gray-500">
              {search || status !== 'all' || content_type !== 'all' 
                ? 'Try adjusting your filters or search terms.' 
                : 'No user content submissions yet.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title & User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type & Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates & Info
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission: any) => {
                    // Debug amounts in development
                    if (process.env.NODE_ENV === 'development') {
                      debugAmounts(submission);
                    }

                    const baseAmount = getBaseAmount(submission);
                    const bonusAmount = getBonusAmount(submission);
                    const totalAmount = getTotalAmount(submission);
                    
                    return (
                      <tr key={submission._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
                              {submission.title}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              by {getUserDisplayName(submission)}
                            </div>
                            {submission.user?.email && (
                              <div className="text-xs text-gray-400 mt-1">
                                {submission.user.email}
                              </div>
                            )}
                            {submission.user?.phone_number && (
                              <div className="text-xs text-gray-400">
                                {submission.user.phone_number}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <UserContentTypeBadge type={submission.content_type} />
                            <div className="text-xs text-gray-500">
                              {submission.task_category}
                            </div>
                            <div className="text-xs text-gray-400">
                              {calculateWordCount(submission.content_text || submission.content)} words
                            </div>
                            {submission.tags && submission.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {submission.tags.slice(0, 2).map((tag: string, index: number) => (
                                  <span key={index} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                                {submission.tags.length > 2 && (
                                  <span className="inline-block bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded">
                                    +{submission.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <UserContentStatusBadge status={submission.status} />
                            <PaymentStatusBadge status={submission.payment_status} />
                            
                            {submission.revision_notes && (
                              <div className="text-xs text-orange-600 line-clamp-2" title={submission.revision_notes}>
                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Revision notes
                              </div>
                            )}
                            {submission.admin_notes && submission.status === 'rejected' && (
                              <div className="text-xs text-red-600 line-clamp-2" title={submission.admin_notes}>
                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Rejection reason
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-900">
                              Total: {formatKshAmount(totalAmount)}
                            </div>
                            <div className="text-xs text-gray-600">
                              Base: {formatKshAmount(baseAmount)}
                            </div>
                            {bonusAmount > 0 && (
                              <div className="text-xs text-green-600 font-medium">
                                Bonus: +{formatKshAmount(bonusAmount)}
                              </div>
                            )}
                            {submission.approved_by && (
                              <div className="text-xs text-gray-500 mt-1">
                                Approved by: {submission.approved_by?.name || submission.approved_by?.username || 'Admin'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-sm text-gray-500">
                            <div>
                              <div className="font-medium">Submitted:</div>
                              <div className="text-xs">
                                {new Date(submission.submission_date).toLocaleDateString()} at{' '}
                                {new Date(submission.submission_date).toLocaleTimeString()}
                              </div>
                            </div>
                            {submission.approved_at && (
                              <div className="mt-2">
                                <div className="font-medium text-green-600">Approved:</div>
                                <div className="text-xs">
                                  {new Date(submission.approved_at).toLocaleDateString()} at{' '}
                                  {new Date(submission.approved_at).toLocaleTimeString()}
                                </div>
                              </div>
                            )}
                            {submission.updated_at && submission.updated_at !== submission.submission_date && (
                              <div className="mt-1">
                                <div className="text-xs text-gray-400">
                                  Updated: {new Date(submission.updated_at).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Link
                              href={`/admin/user-content/${submission._id}`}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition-colors"
                              title="Review Submission"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            
                            {/* Use Client Component for attachment button */}
                            {submission.attachments && submission.attachments.length > 0 && (
                              <AttachmentButton attachments={submission.attachments} />
                            )}
                            
                            <Link
                              href={`/admin/users/${getUserId(submission)}`}
                              className="text-purple-600 hover:text-purple-900 p-2 rounded-full hover:bg-purple-50 transition-colors"
                              title="View User Profile"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </Link>

                            {/* Quick Actions */}
                            {submission.status === 'pending' && (
                              <Link
                                href={`/admin/user-content/${submission._id}?action=approve`}
                                className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-50 transition-colors"
                                title="Quick Approve"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages && totalPages > 1 && (
              <div className="bg-white px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * 10, totalCount || 0)}
                    </span>{' '}
                    of <span className="font-medium">{totalCount}</span> results
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={{
                        pathname: '/admin/user-content',
                        query: {
                          page: currentPage > 1 ? currentPage - 1 : 1,
                          ...(search && { search }),
                          ...(status !== 'all' && { status }),
                          ...(content_type !== 'all' && { content_type })
                        }
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        currentPage <= 1
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-disabled={currentPage <= 1}
                    >
                      Previous
                    </Link>
                    <Link
                      href={{
                        pathname: '/admin/user-content',
                        query: {
                          page: currentPage < totalPages ? currentPage + 1 : totalPages,
                          ...(search && { search }),
                          ...(status !== 'all' && { status }),
                          ...(content_type !== 'all' && { content_type })
                        }
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        currentPage >= totalPages
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-disabled={currentPage >= totalPages}
                    >
                      Next
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
