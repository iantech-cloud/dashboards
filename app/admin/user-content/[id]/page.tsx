// app/admin/user-content/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { approveUserContent, rejectUserContent, requestContentRevision, getUserContentById, adminUpdateContentSubmission } from '@/app/actions/user-content';
import { UserContentStatusBadge } from '../components/UserContentStatusBadge';
import { UserContentTypeBadge } from '../components/UserContentTypeBadge';
import { PaymentStatusBadge } from '../components/PaymentStatusBadge';

// Dynamically import Summernote to avoid SSR issues
const SummernoteEditor = dynamic(
  () => import('../../blogs/create/components/SummernoteEditor'),
  {
    ssr: false, // Disable SSR since Summernote relies on the browser DOM
    loading: () => (
      <div className="border border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center">
        <span className="text-gray-500">Loading editor...</span>
      </div>
    )
});

interface SubmissionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface SerializedUserContent {
  _id: string;
  title: string;
  content: string;
  content_type: 'blog_post' | 'social_media' | 'product_review' | 'video' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  payment_status: 'pending' | 'paid' | 'rejected';
  payment_amount: number;
  bonus_amount?: number;
  task_category: string;
  word_count?: number;
  tags?: string[];
  external_url?: string;
  attachments: string[];
  submission_date: string;
  admin_notes?: string;
  revision_notes?: string;
  approved_at?: string;
  approved_by?: {
    _id: string;
    username?: string;
    name?: string;
    email?: string;
  };
  user: {
    _id: string;
    username?: string;
    name?: string;
    email?: string;
    phone_number?: string;
  };
}

export default function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SerializedUserContent | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revision' | 'update' | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [baseAmount, setBaseAmount] = useState(0);

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setIsLoading(true);
        const resolvedParams = await params;
        const result = await getUserContentById(resolvedParams.id);

        if (!result.success) {
          setError(result.message);
          return;
        }

        if (result.data) {
          // Serialize the data with all fields
          const serializedData: SerializedUserContent = {
            _id: result.data._id?.toString() || '',
            title: result.data.title || '',
            content: result.data.content || '',
            content_type: result.data.content_type,
            status: result.data.status,
            payment_status: result.data.payment_status,
            payment_amount: result.data.payment_amount,
            bonus_amount: result.data.bonus_amount,
            task_category: result.data.task_category,
            word_count: result.data.word_count,
            tags: result.data.tags || [],
            external_url: result.data.external_url,
            attachments: result.data.attachments || [],
            submission_date: result.data.submission_date ? new Date(result.data.submission_date).toISOString() : new Date().toISOString(),
            admin_notes: result.data.admin_notes,
            revision_notes: result.data.revision_notes,
            approved_at: result.data.approved_at ? new Date(result.data.approved_at).toISOString() : undefined,
            approved_by: result.data.approved_by ? {
              _id: result.data.approved_by._id?.toString() || '',
              username: result.data.approved_by.username,
              name: result.data.approved_by.name,
              email: result.data.approved_by.email
            } : undefined,
            user: {
              _id: result.data.user._id?.toString() || '',
              username: result.data.user.username,
              name: result.data.user.name,
              email: result.data.user.email,
              phone_number: result.data.user.phone_number
            }
          };

          setSubmission(serializedData);
          setPaymentAmount(serializedData.payment_amount);
          setBonusAmount(serializedData.bonus_amount || 0);
          setBaseAmount(serializedData.payment_amount - (serializedData.bonus_amount || 0));
        }
      } catch (err) {
        setError('Failed to load submission');
        console.error('Load submission error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmission();
  }, [params]);

  const handleApprove = async () => {
    if (!submission) return;

    setIsSubmitting(true);
    try {
      const result = await approveUserContent(submission._id, notes, bonusAmount);
      if (result.success) {
        router.push('/admin/user-content');
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to approve submission');
      console.error('Approve error:', err);
    } finally {
      setIsSubmitting(false);
      setActionType(null);
      setNotes('');
    }
  };

  const handleReject = async () => {
    if (!submission) return;

    setIsSubmitting(true);
    try {
      const result = await rejectUserContent(submission._id, notes);
      if (result.success) {
        router.push('/admin/user-content');
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to reject submission');
      console.error('Reject error:', err);
    } finally {
      setIsSubmitting(false);
      setActionType(null);
      setNotes('');
    }
  };

  const handleRequestRevision = async () => {
    if (!submission) return;

    setIsSubmitting(true);
    try {
      const result = await requestContentRevision(submission._id, notes);
      if (result.success) {
        router.push('/admin/user-content');
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to request revision');
      console.error('Revision request error:', err);
    } finally {
      setIsSubmitting(false);
      setActionType(null);
      setNotes('');
    }
  };

  const handleUpdatePayment = async () => {
    if (!submission) return;

    setIsSubmitting(true);
    try {
      const result = await adminUpdateContentSubmission(submission._id, {
        status: submission.status,
        payment_status: submission.payment_status,
        payment_amount: baseAmount,
        bonus_amount: bonusAmount,
        admin_notes: notes || undefined,
      });

      if (result.success) {
        // Reload the submission to get updated data
        const updatedResult = await getUserContentById(submission._id);
        if (updatedResult.success && updatedResult.data) {
          const updatedData = updatedResult.data;
          setSubmission({
            ...submission,
            payment_amount: updatedData.payment_amount,
            bonus_amount: updatedData.bonus_amount,
            admin_notes: notes || submission.admin_notes,
          });
          setBaseAmount(updatedData.payment_amount - (updatedData.bonus_amount || 0));
          setBonusAmount(updatedData.bonus_amount || 0);
        }
        setActionType(null);
        setNotes('');
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to update payment');
      console.error('Update payment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to calculate word count from HTML content
  const calculateWordCount = (htmlContent: string): number => {
    if (!htmlContent) return 0;
    const text = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  };

  // Helper to format KSH amounts
  const formatKshAmount = (amount: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return 'Ksh 0.00';
    }
    return `Ksh ${amount.toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Calculate total amount
  const getTotalAmount = () => {
    return baseAmount + bonusAmount;
  };

  // Handle attachment viewing with proper URL construction
  const handleViewAttachment = (attachment: string) => {
    // If attachment is already a full URL, use it directly
    if (attachment.startsWith('http')) {
      window.open(attachment, '_blank');
    } else {
      // Construct proper attachment URL with submission ID
      const attachmentUrl = `/api/attachments/${submission?._id}/${attachment}`;
      window.open(attachmentUrl, '_blank');
    }
  };

  // Get proper attachment display name
  const getAttachmentDisplayName = (attachment: string, index: number) => {
    if (attachment.startsWith('http')) {
      return attachment.split('/').pop() || `Attachment ${index + 1}`;
    }
    return attachment || `Attachment ${index + 1}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/admin/user-content"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Back to Submissions
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="text-yellow-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-yellow-800 font-medium">Submission Not Found</h3>
                <p className="text-yellow-700 text-sm">The requested submission could not be found.</p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/admin/user-content"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Back to Submissions
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wordCount = submission.word_count || calculateWordCount(submission.content);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="flex-1">
            <Link
              href="/admin/user-content"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Submissions
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Review Submission</h1>
            <p className="text-gray-600 mt-2">Review and take action on user-submitted content</p>
          </div>
          
          {/* Status Badges */}
          <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
            <UserContentStatusBadge status={submission.status} />
            <UserContentTypeBadge type={submission.content_type} />
            <PaymentStatusBadge status={submission.payment_status} />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Submission Content */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{submission.title}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>Submitted: {formatDate(submission.submission_date)}</span>
                  <span>Category: {submission.task_category}</span>
                  <span>Words: {wordCount}</span>
                  <span>Submission ID: {submission._id}</span>
                  {submission.external_url && (
                    <a 
                      href={submission.external_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View External Content
                    </a>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Content</h3>
                {/* Summernote Editor for formatted content viewing */}
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <SummernoteEditor
                    value={submission.content}
                    onChange={() => {}} // Empty function since we're only viewing
                    readOnly={true}
                    height="400px"
                  />
                </div>
              </div>

              {/* Tags */}
              {submission.tags && submission.tags.length > 0 && (
                <div className="p-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {submission.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {submission.attachments && submission.attachments.length > 0 && (
                <div className="p-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Attachments ({submission.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {submission.attachments.map((attachment, index) => {
                      const fileName = getAttachmentDisplayName(attachment, index);
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                      const isPDF = /\.pdf$/i.test(fileName);
                      
                      return (
                        <div key={index} className="flex flex-col border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                          <div className="p-4 flex items-center">
                            {isImage ? (
                              <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            ) : isPDF ? (
                              <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ) : (
                              <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                              </svg>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>
                                {fileName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isImage ? 'Image' : isPDF ? 'PDF Document' : 'File'}
                              </p>
                            </div>
                          </div>
                          <div className="border-t border-gray-200 p-2 bg-gray-50">
                            <button
                              onClick={() => handleViewAttachment(attachment)}
                              className="w-full px-3 py-1 bg-white border border-gray-300 text-sm font-medium rounded text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Notes & Revision History */}
            {(submission.admin_notes || submission.revision_notes || submission.approved_by) && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Review History</h3>
                  
                  {submission.admin_notes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Admin Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{submission.admin_notes}</p>
                    </div>
                  )}

                  {submission.revision_notes && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-orange-700 mb-2">Revision Notes</h4>
                      <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">{submission.revision_notes}</p>
                    </div>
                  )}

                  {submission.approved_by && submission.approved_at && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">Approval Details</h4>
                      <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                        Approved by {submission.approved_by.username || submission.approved_by.name || submission.approved_by.email} on {formatDate(submission.approved_at)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - User Info & Actions */}
          <div className="space-y-6">
            {/* User Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">User Information</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Username</p>
                    <p className="text-sm text-gray-900">{submission.user.username || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-sm text-gray-900">{submission.user.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-900">{submission.user.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-sm text-gray-900">{submission.user.phone_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">User ID</p>
                    <p className="text-sm text-gray-900 font-mono truncate">{submission.user._id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
                  {(submission.status === 'pending' || submission.status === 'revision_requested') && (
                    <button
                      onClick={() => setActionType('update')}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit Payment
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Base Amount</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatKshAmount(submission.payment_amount - (submission.bonus_amount || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Bonus Amount</p>
                      <p className="text-xl font-bold text-green-600">
                        {submission.bonus_amount ? `+${formatKshAmount(submission.bonus_amount)}` : 'Ksh 0.00'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatKshAmount(submission.payment_amount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Payment Status</p>
                      <PaymentStatusBadge status={submission.payment_status} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Content Status</p>
                      <UserContentStatusBadge status={submission.status} />
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="font-medium text-gray-700">Content Type</p>
                    <UserContentTypeBadge type={submission.content_type} />
                  </div>

                  <div className="text-sm">
                    <p className="font-medium text-gray-700">Task Category</p>
                    <p className="text-gray-900">{submission.task_category}</p>
                  </div>

                  <div className="text-sm">
                    <p className="font-medium text-gray-700">Word Count</p>
                    <p className="text-gray-900">{wordCount} words</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Panel */}
            {submission.status === 'pending' || submission.status === 'revision_requested' ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Take Action</h3>
                </div>
                <div className="p-6 space-y-4">
                  {!actionType || actionType === 'update' ? (
                    <>
                      {actionType === 'update' && (
                        <div className="space-y-4 p-4 bg-blue-50 rounded-lg mb-4">
                          <h4 className="font-medium text-blue-900">Update Payment Amounts</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Base Amount (Ksh)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="50"
                                value={baseAmount}
                                onChange={(e) => setBaseAmount(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0.00"
                              />
                              <p className="text-xs text-gray-500 mt-1">Maximum: Ksh 50.00 for base amount</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bonus Amount (Ksh)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={bonusAmount}
                                onChange={(e) => setBonusAmount(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0.00"
                              />
                              <p className="text-xs text-gray-500 mt-1">Additional bonus amount</p>
                            </div>
                            <div className="bg-white p-3 rounded border">
                              <p className="text-sm font-medium text-gray-700">Total Payment: {formatKshAmount(getTotalAmount())}</p>
                              <p className="text-xs text-gray-500">Base: {formatKshAmount(baseAmount)} + Bonus: {formatKshAmount(bonusAmount)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setActionType('approve')}
                        className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve & Pay
                      </button>
                      
                      <button
                        onClick={() => setActionType('revision')}
                        className="w-full px-4 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Request Revision
                      </button>
                      
                      <button
                        onClick={() => setActionType('reject')}
                        className="w-full px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>

                      {actionType === 'update' && (
                        <div className="flex space-x-3 pt-4 border-t">
                          <button
                            onClick={() => {
                              setActionType(null);
                              setBaseAmount(submission.payment_amount - (submission.bonus_amount || 0));
                              setBonusAmount(submission.bonus_amount || 0);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdatePayment}
                            disabled={isSubmitting || baseAmount > 50}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Updating...' : 'Update Payment'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                          {actionType === 'approve' && 'Approval Notes (Optional)'}
                          {actionType === 'reject' && 'Rejection Reason *'}
                          {actionType === 'revision' && 'Revision Instructions *'}
                        </label>
                        <textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={
                            actionType === 'approve' ? 'Add any notes about this approval...' :
                            actionType === 'reject' ? 'Explain why this submission is being rejected...' :
                            'Provide clear instructions for what needs to be revised...'
                          }
                          required={actionType !== 'approve'}
                        />
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setActionType(null);
                            setNotes('');
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          disabled={isSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (actionType === 'approve') handleApprove();
                            else if (actionType === 'reject') handleReject();
                            else if (actionType === 'revision') handleRequestRevision();
                          }}
                          disabled={isSubmitting || (actionType !== 'approve' && !notes.trim())}
                          className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                            actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                            'bg-orange-600 hover:bg-orange-700'
                          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            actionType === 'approve' ? 'Approve & Pay' :
                            actionType === 'reject' ? 'Reject' :
                            'Request Revision'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Submission Status</h3>
                <p className="text-sm text-gray-600">
                  This submission has already been {submission.status}. No further action can be taken.
                </p>
                {submission.approved_by && submission.approved_at && (
                  <p className="text-sm text-gray-600 mt-2">
                    Approved on {formatDate(submission.approved_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
