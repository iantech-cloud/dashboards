// app/dashboard/content/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  RotateCw,
  Download,
  Edit,
  AlertCircle,
  Calendar,
  Tag,
  DollarSign
} from 'lucide-react';
import { getContentSubmissionById } from '@/app/actions/dashboard/content';
import SummernoteEditor from '@/app/dashboard/content/create/components/SummernoteEditor';

interface ContentSubmission {
  _id: string;
  title: string;
  content_type: string;
  content_text: string;
  status: string;
  payment_status: string;
  payment_amount: number;
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

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [submission, setSubmission] = useState<ContentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submissionId = params.id as string;

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getContentSubmissionById(submissionId);

      if (result.success && result.data) {
        setSubmission(result.data);
      } else {
        setError(result.message || 'Submission not found');
      }
    } catch (err) {
      console.error('Error loading submission:', err);
      setError('Failed to load submission. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
  const getPaymentStatusInfo = (status: string) => {
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error || 'Submission not found'}</p>
          </div>
          <Link
            href="/dashboard/content"
            className="inline-flex items-center mt-3 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(submission.status);
  const paymentInfo = getPaymentStatusInfo(submission.payment_status);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/content"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Submissions
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{submission.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Submitted on {formatDate(submission.submission_date)}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {(submission.status === 'pending' || submission.status === 'revision_requested') && (
              <Link
                href={`/dashboard/content/edit/${submission._id}`}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Submission
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            {statusInfo.icon}
            <span className="ml-2 text-sm font-medium text-gray-900">Status</span>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="ml-2 text-sm font-medium text-gray-900">Payment</span>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${paymentInfo.color}`}>
              {paymentInfo.text}
            </span>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              KES {submission.payment_amount.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="ml-2 text-sm font-medium text-gray-900">Category & Type</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-sm text-gray-900">{submission.task_category}</div>
            <div className="text-sm text-gray-600 capitalize">
              {submission.content_type.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Content</h2>
        </div>
        <div className="p-6">
          {/* Summernote Editor for formatted content viewing */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <SummernoteEditor
              value={submission.content_text}
              onChange={() => {}} // Empty function since we're only viewing
              readOnly={true}
              height="400px"
            />
          </div>
          
          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {submission.word_count && (
                <div>
                  <span className="font-medium text-gray-900">Word Count:</span>
                  <span className="ml-2 text-gray-600">{submission.word_count}</span>
                </div>
              )}
              {submission.tags && submission.tags.length > 0 && (
                <div>
                  <span className="font-medium text-gray-900">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {submission.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      {(submission.admin_feedback || submission.revision_notes) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Feedback & Notes</h2>
          </div>
          <div className="p-6">
            {submission.revision_notes && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-orange-800 mb-2">Revision Requested</h3>
                <p className="text-gray-700 bg-orange-50 p-3 rounded-lg">
                  {submission.revision_notes}
                </p>
              </div>
            )}
            {submission.admin_feedback && (
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Admin Feedback</h3>
                <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
                  {submission.admin_feedback}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Info */}
      {submission.approved_at && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Approval Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">Approved On:</span>
                <span className="ml-2 text-gray-600">
                  {formatDate(submission.approved_at)}
                </span>
              </div>
              {submission.approved_by && (
                <div>
                  <span className="font-medium text-gray-900">Approved By:</span>
                  <span className="ml-2 text-gray-600">
                    {submission.approved_by.name || 
                     submission.approved_by.username || 
                     submission.approved_by.email}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
