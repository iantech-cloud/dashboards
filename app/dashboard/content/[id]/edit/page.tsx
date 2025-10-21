// app/dashboard/content/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getContentSubmission, updateContentSubmission, type ContentType, type ContentStatus, type PaymentStatus } from '@/app/actions/dashboard/content';

// Dynamically import Summernote to avoid SSR issues
const SummernoteEditor = dynamic(() => import('./components/SummernoteEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center">
      <div className="text-gray-500">Loading editor...</div>
    </div>
  )
});

interface ContentSubmission {
  _id: string;
  title: string;
  content_type: ContentType;
  content_text: string;
  task_category: string;
  tags: string[];
  status: ContentStatus;
  payment_status: PaymentStatus;
  payment_amount: number; // This is in KSH for display
  submission_date: string;
  admin_feedback?: string;
  revision_notes?: string;
  word_count: number;
  attachments?: string[];
  user_id: string;
  approved_at?: string;
}

export default function EditContentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submission, setSubmission] = useState<ContentSubmission | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content_type: 'blog_post' as ContentType,
    task_category: '',
    tags: '',
  });
  const [content, setContent] = useState('');

  // Load submission data
  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await getContentSubmission(id);
        
        if (result.success && result.data) {
          const submissionData = result.data;
          setSubmission(submissionData);
          setFormData({
            title: submissionData.title,
            content_type: submissionData.content_type,
            task_category: submissionData.task_category,
            tags: submissionData.tags?.join(', ') || '',
          });
          setContent(submissionData.content_text);
        } else {
          setError(result.message || 'Failed to load submission');
        }
      } catch (err) {
        console.error('Error loading submission:', err);
        setError('Failed to load submission data');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadSubmission();
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      setIsSubmitting(false);
      return;
    }

    if (!content.trim() || content === '<p><br></p>') {
      setError('Content is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.task_category.trim()) {
      setError('Task category is required');
      setIsSubmitting(false);
      return;
    }

    // Calculate word count (matching server-side logic)
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = text ? text.split(' ').length : 0;

    // Get minimum word count based on content type
    const minWordCounts = {
      blog_post: 400,
      social_media: 150,
      product_review: 150,
      video: 150,
      other: 150,
    };

    const minWords = minWordCounts[formData.content_type];

    if (wordCount < minWords) {
      setError(`Content must be at least ${minWords} words for ${formData.content_type.replace('_', ' ')}. Current count: ${wordCount} words.`);
      setIsSubmitting(false);
      return;
    }

    // Check if submission can be edited
    if (submission && !['pending', 'revision_requested'].includes(submission.status)) {
      setError('This submission cannot be edited as it has already been processed.');
      setIsSubmitting(false);
      return;
    }

    try {
      const updateData = {
        title: formData.title,
        content_type: formData.content_type,
        content_text: content,
        task_category: formData.task_category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        word_count: wordCount,
      };

      const result = await updateContentSubmission(id, updateData);

      if (result.success) {
        setSuccess(result.message || 'Content updated successfully! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard/content');
          router.refresh();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Update content error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Content type options - updated to match server-side enum
  const contentTypeOptions = [
    { value: 'blog_post', label: 'Blog Post' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'product_review', label: 'Product Review' },
    { value: 'video', label: 'Video' },
    { value: 'other', label: 'Other' }
  ];

  // Calculate estimated payment (matching server-side logic)
  const calculateEstimatedPayment = () => {
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = text ? text.split(' ').length : 0;
    
    if (wordCount === 0) return 0;

    const baseRate = 0.5; // KES per word
    const baseAmount = wordCount * baseRate;
    
    const typeMultipliers = {
      blog_post: 1.2,
      product_review: 1.1,
      video: 1.3,
      social_media: 0.8,
      other: 1.0,
    };

    const paymentAmount = baseAmount * typeMultipliers[formData.content_type];
    const minPayment = 0.50; // Minimum KES 0.50
    const maxPayment = 50.00; // Maximum KES 50.00

    return Math.max(minPayment, Math.min(maxPayment, paymentAmount));
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

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'revision_requested': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const estimatedPayment = calculateEstimatedPayment();
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;
  const minWordCounts = {
    blog_post: 400,
    social_media: 150,
    product_review: 150,
    video: 150,
    other: 150,
  };
  const minWords = minWordCounts[formData.content_type];
  const canEdit = submission && ['pending', 'revision_requested'].includes(submission.status);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading submission data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
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
          <Link
            href="/dashboard/content"
            className="inline-flex items-center mt-4 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Submission Not Found</h2>
          <p className="text-gray-600 mb-6">The requested content submission could not be found.</p>
          <Link
            href="/dashboard/content"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Content</h1>
          <p className="text-gray-600 mt-2">Update your content submission</p>
          {!canEdit && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                This submission cannot be edited because it has been {submission.status.replace('_', ' ')}.
                {submission.status === 'revision_requested' && ' Please address the revision notes below and resubmit.'}
              </p>
            </div>
          )}
        </div>
        <Link
          href="/dashboard/content"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors mt-4 sm:mt-0"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Submissions
        </Link>
      </div>

      {/* Submission Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(submission.status)}`}>
              {submission.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Payment Status:</span>
            <span className="ml-2 text-gray-900 capitalize">{submission.payment_status.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Submitted:</span>
            <span className="ml-2 text-gray-900">{formatDate(submission.submission_date)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Payment Amount:</span>
            <span className="ml-2 text-gray-900">KES {submission.payment_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Admin Feedback */}
      {(submission.admin_feedback || submission.revision_notes) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Important Notices
          </h3>
          
          {submission.revision_notes && (
            <div className="mb-4">
              <h4 className="font-medium text-orange-700 mb-2">Revision Requested:</h4>
              <p className="text-orange-800 bg-orange-100 border border-orange-200 rounded-lg p-4">
                {submission.revision_notes}
              </p>
            </div>
          )}
          
          {submission.admin_feedback && (
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Admin Feedback:</h4>
              <p className="text-blue-800 bg-blue-100 border border-blue-200 rounded-lg p-4">
                {submission.admin_feedback}
              </p>
            </div>
          )}
        </div>
      )}

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

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-green-800 font-medium">Success</h3>
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter a descriptive title for your content"
              required
              disabled={!canEdit}
            />
          </div>

          {/* Content Type and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="content_type" className="block text-sm font-medium text-gray-700 mb-2">
                Content Type *
              </label>
              <select
                id="content_type"
                name="content_type"
                value={formData.content_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={!canEdit}
              >
                {contentTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task_category" className="block text-sm font-medium text-gray-700 mb-2">
                Task Category *
              </label>
              <input
                type="text"
                id="task_category"
                name="task_category"
                value={formData.task_category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="e.g., Technology, Lifestyle, Finance"
                required
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <SummernoteEditor
              value={content}
              onChange={setContent}
              placeholder="Write your content here..."
              height={400}
              readOnly={!canEdit}
            />
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>
                Word Count: {wordCount}
              </span>
              <span className={wordCount < minWords ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                Minimum: {minWords} words
              </span>
            </div>
            {wordCount > 0 && wordCount < minWords && (
              <p className="mt-1 text-sm text-red-600">
                {minWords - wordCount} more words needed for {formData.content_type.replace('_', ' ')}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="technology, web-development, review (separate with commas)"
              disabled={!canEdit}
            />
            <p className="text-sm text-gray-500 mt-1">
              Add relevant tags to help categorize your content
            </p>
          </div>

          {/* Submission Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Submission Guidelines</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Content must be original and not plagiarized</li>
              <li>• Minimum word counts: Blog Post (400), Social Media (150), Product Review (150), Video (150), Other (150)</li>
              <li>• Use proper formatting and structure</li>
              <li>• Check for spelling and grammar errors</li>
              <li>• Payment is calculated based on word count and content type</li>
              {submission.status === 'revision_requested' && (
                <li className="font-semibold">• Please address the revision notes above before resubmitting</li>
              )}
            </ul>
          </div>
        </div>

        {/* Form Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600 mb-4 sm:mb-0">
              * Required fields {!canEdit && ' - This submission cannot be edited'}
            </p>
            <div className="flex space-x-3">
              <Link
                href="/dashboard/content"
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !canEdit || wordCount < minWords}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Content'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Payment Information */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Content Type:</span>
            <span className="font-medium capitalize">{formData.content_type.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span>Current Payment Amount:</span>
            <span className="font-medium">KES {submission.payment_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Word Count:</span>
            <span className="font-medium">{wordCount} words</span>
          </div>
          <div className="flex justify-between">
            <span>Base Rate:</span>
            <span className="font-medium">KES 0.50 per word</span>
          </div>
          <div className="flex justify-between">
            <span>Content Type Multiplier:</span>
            <span className="font-medium">
              {formData.content_type === 'blog_post' && '1.2x'}
              {formData.content_type === 'product_review' && '1.1x'}
              {formData.content_type === 'video' && '1.3x'}
              {formData.content_type === 'social_media' && '0.8x'}
              {formData.content_type === 'other' && '1.0x'}
            </span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between text-base font-semibold text-gray-900">
            <span>Estimated Updated Earnings:</span>
            <span>KES {estimatedPayment.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Final payment depends on content quality and adherence to guidelines
          </p>
        </div>
      </div>
    </div>
  );
}
