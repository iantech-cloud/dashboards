// app/dashboard/content/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createContentSubmission, type ContentType } from '@/app/actions/dashboard/content';

// Dynamically import Summernote to avoid SSR issues
const SummernoteEditor = dynamic(() => import('./components/SummernoteEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center">
      <div className="text-gray-500">Loading editor...</div>
    </div>
  )
});

export default function CreateContentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content_type: 'blog_post' as ContentType,
    task_category: '',
    tags: '',
  });
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Validate file sizes (10MB limit)
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} exceeds 10MB limit`);
          return false;
        }
        return true;
      });
      
      setAttachments(prev => [...prev, ...validFiles]);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setAttachments(prev => prev.filter(file => file.name !== fileName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

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

    try {
      const submissionData = {
        title: formData.title,
        content_type: formData.content_type,
        content_text: content,
        task_category: formData.task_category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        word_count: wordCount,
        attachments: attachments // Pass File objects directly as expected by server action
      };

      const result = await createContentSubmission(submissionData);

      if (result.success) {
        router.push('/dashboard/content');
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Create content error:', err);
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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Content</h1>
          <p className="text-gray-600 mt-2">Submit your content for review and earn money</p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter a descriptive title for your content"
              required
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Technology, Lifestyle, Finance"
                required
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
          
          {/* Attachments Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pt-4 border-t border-gray-100">Attachments (Optional)</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Supporting Files
            </label>
            
            {/* File Input Control */}
            <div className="flex items-center space-x-3 mb-4">
                <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Add File(s)
                </label>
                <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="sr-only"
                />
            </div>

            {/* File List */}
            <div className="space-y-2">
                {attachments.length === 0 ? (
                    <p className="text-sm text-gray-500">No files attached yet. Attach supporting images, video clips, or documents.</p>
                ) : (
                    attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex items-center min-w-0">
                                <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0015.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-800 truncate" title={file.name}>{file.name}</span>
                                <span className="ml-2 text-xs text-gray-500 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveFile(file.name)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium ml-4 focus:outline-none flex-shrink-0"
                            >
                                Remove
                            </button>
                        </div>
                    ))
                )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Maximum file size: 10MB per file. Accepted types: images, videos, PDF, Word documents.</p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="technology, web-development, review (separate with commas)"
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
            </ul>
          </div>
        </div>

        {/* Form Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600 mb-4 sm:mb-0">
              * Required fields
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
                disabled={isSubmitting || wordCount < minWords}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Content'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Payment Information Sidebar */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Content Type:</span>
            <span className="font-medium capitalize">{formData.content_type.replace('_', ' ')}</span>
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
            <span>Estimated Earnings:</span>
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
