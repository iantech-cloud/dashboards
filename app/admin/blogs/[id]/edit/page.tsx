// app/admin/blogs/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getBlogPostById, updateBlogPost } from '../../../../actions/blog';

// Dynamically import Summernote to avoid SSR issues
const SummernoteEditor = dynamic(() => import('../../create/components/SummernoteEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center">
      <div className="text-gray-500">Loading editor...</div>
    </div>
  )
});

interface EditBlogPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface BlogPostFormData {
  title: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  tags: string;
  category: string;
  featured_image: string;
  status: 'draft' | 'published' | 'archived';
}

interface SerializedBlogPost {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  tags: string[];
  category: string;
  featured_image: string;
  status: 'draft' | 'published' | 'archived';
  read_time: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  author: {
    _id: string;
    username?: string;
    name?: string;
    email?: string;
  } | null;
  source_submission_id?: {
    _id: string;
    title?: string;
    user?: string;
    content_type?: string;
  } | null;
  metadata?: {
    submitted_via?: string;
    original_submission_date?: string;
    content_type?: string;
    task_category?: string;
    payment_amount?: number;
  };
}

export default function EditBlogPage({ params }: EditBlogPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blogPost, setBlogPost] = useState<SerializedBlogPost | null>(null);
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: '',
    excerpt: '',
    meta_title: '',
    meta_description: '',
    tags: '',
    category: '',
    featured_image: '',
    status: 'draft'
  });
  const [content, setContent] = useState('');

  useEffect(() => {
    const loadBlogPost = async () => {
      try {
        setIsLoading(true);
        const resolvedParams = await params;
        const result = await getBlogPostById(resolvedParams.id);

        if (!result.success) {
          setError(result.message);
          return;
        }

        if (result.data) {
          // Serialize the data to ensure all MongoDB objects are converted to plain objects
          const serializedData: SerializedBlogPost = {
            _id: result.data._id?.toString() || '',
            title: result.data.title || '',
            slug: result.data.slug || '',
            content: result.data.content || '',
            excerpt: result.data.excerpt || '',
            meta_title: result.data.meta_title || '',
            meta_description: result.data.meta_description || '',
            tags: result.data.tags || [],
            category: result.data.category || '',
            featured_image: result.data.featured_image || '',
            status: result.data.status || 'draft',
            read_time: result.data.read_time || 0,
            created_at: result.data.created_at ? new Date(result.data.created_at).toISOString() : new Date().toISOString(),
            updated_at: result.data.updated_at ? new Date(result.data.updated_at).toISOString() : new Date().toISOString(),
            published_at: result.data.published_at ? new Date(result.data.published_at).toISOString() : null,
            author: result.data.author ? {
              _id: result.data.author._id?.toString() || '',
              username: result.data.author.username || undefined,
              name: result.data.author.name || undefined,
              email: result.data.author.email || undefined
            } : null,
            source_submission_id: result.data.source_submission_id ? {
              _id: result.data.source_submission_id._id?.toString() || '',
              title: result.data.source_submission_id.title || undefined,
              user: result.data.source_submission_id.user || undefined,
              content_type: result.data.source_submission_id.content_type || undefined
            } : null,
            metadata: result.data.metadata || {}
          };

          setBlogPost(serializedData);
          setFormData({
            title: serializedData.title,
            excerpt: serializedData.excerpt,
            meta_title: serializedData.meta_title,
            meta_description: serializedData.meta_description,
            tags: serializedData.tags?.join(', ') || '',
            category: serializedData.category,
            featured_image: serializedData.featured_image,
            status: serializedData.status
          });
          setContent(serializedData.content);
        }
      } catch (err) {
        setError('Failed to load blog post');
        console.error('Load blog post error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBlogPost();
  }, [params]);

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

    if (!formData.title.trim()) {
      setError('Title is required');
      setIsSubmitting(false);
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const resolvedParams = await params;
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', content);
      formDataToSend.append('excerpt', formData.excerpt);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('meta_title', formData.meta_title || formData.title);
      formDataToSend.append('meta_description', formData.meta_description);
      formDataToSend.append('tags', formData.tags);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('featured_image', formData.featured_image);

      const result = await updateBlogPost(resolvedParams.id, formDataToSend);

      if (result.success) {
        router.push('/admin/blogs');
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Update blog error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to format dates for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (error && !blogPost) {
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
                href="/admin/blogs"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Back to Blogs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Blog Post</h1>
          <p className="text-gray-600 mt-2">Update and manage your blog post</p>
          {blogPost && (
            <div className="flex flex-col gap-1 mt-2 text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <span>Created: {formatDate(blogPost.created_at)}</span>
                {blogPost.published_at && (
                  <span>Published: {formatDate(blogPost.published_at)}</span>
                )}
              </div>
              <div>
                <span>Last updated: {formatDate(blogPost.updated_at)}</span>
              </div>
              {blogPost.source_submission_id && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    From User Content
                  </span>
                  <span className="text-xs text-gray-500">
                    Original submission: {blogPost.source_submission_id.title}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <Link
          href="/admin/blogs"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors mt-4 sm:mt-0"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Blogs
        </Link>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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

      {/* Blog Form */}
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
              placeholder="Enter blog post title"
              required
            />
          </div>

          {/* Content Editor */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <SummernoteEditor
              value={content}
              onChange={setContent}
              placeholder="Write your blog post content here..."
            />
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the blog post (optional)"
            />
            <p className="text-sm text-gray-500 mt-1">
              A short summary of your blog post. If left empty, it will be generated from the content.
            </p>
          </div>

          {/* Category and Featured Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Technology, Business, Lifestyle"
              />
            </div>

            <div>
              <label htmlFor="featured_image" className="block text-sm font-medium text-gray-700 mb-2">
                Featured Image URL
              </label>
              <input
                type="url"
                id="featured_image"
                name="featured_image"
                value={formData.featured_image}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          {/* SEO Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700 mb-2">
                SEO Title
              </label>
              <input
                type="text"
                id="meta_title"
                name="meta_title"
                value={formData.meta_title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="SEO title (defaults to blog title)"
              />
            </div>

            <div>
              <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 mb-2">
                SEO Description
              </label>
              <textarea
                id="meta_description"
                name="meta_description"
                value={formData.meta_description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="SEO description for search engines"
              />
            </div>
          </div>

          {/* Tags and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="technology, web-development, nextjs"
              />
              <p className="text-sm text-gray-500 mt-1">
                Separate tags with commas
              </p>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              {blogPost?.status === 'published' && formData.status === 'draft' && (
                <p className="text-sm text-yellow-600 mt-1">
                  Changing from published to draft will unpublish this post.
                </p>
              )}
              {blogPost?.status === 'published' && formData.status === 'archived' && (
                <p className="text-sm text-orange-600 mt-1">
                  Archiving will remove this post from public view.
                </p>
              )}
              {blogPost?.status === 'draft' && formData.status === 'published' && (
                <p className="text-sm text-green-600 mt-1">
                  Publishing this post will make it visible to the public.
                </p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {blogPost && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Post Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Slug:</span> {blogPost.slug}
                </div>
                <div>
                  <span className="font-medium">Read Time:</span> {blogPost.read_time} minutes
                </div>
                <div>
                  <span className="font-medium">Author:</span> {blogPost.author?.username || blogPost.author?.name || blogPost.author?.email || 'Unknown'}
                </div>
                <div>
                  <span className="font-medium">Word Count:</span> {content.split(/\s+/).length}
                </div>
              </div>
              {blogPost.metadata && Object.keys(blogPost.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Submission Metadata</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    {blogPost.metadata.submitted_via && (
                      <div>Submitted via: {blogPost.metadata.submitted_via}</div>
                    )}
                    {blogPost.metadata.content_type && (
                      <div>Content type: {blogPost.metadata.content_type}</div>
                    )}
                    {blogPost.metadata.task_category && (
                      <div>Task category: {blogPost.metadata.task_category}</div>
                    )}
                    {blogPost.metadata.payment_amount && (
                      <div>Payment: KES {blogPost.metadata.payment_amount}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <Link
                href={`/blog/${blogPost?.slug}`}
                target="_blank"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Live
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href="/admin/blogs"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Discard Changes
              </Link>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/admin/blogs"
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
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
                  'Update Blog Post'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
