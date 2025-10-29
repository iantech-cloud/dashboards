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
    <div className="border border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center bg-gray-50">
      <div className="text-gray-500 flex items-center space-x-2">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
        <span>Loading editor...</span>
      </div>
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
  const [showPreview, setShowPreview] = useState(false);
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

  // Trigger MathJax rendering when preview is shown
  useEffect(() => {
    if (showPreview && window.MathJax?.typesetPromise) {
      const timer = setTimeout(() => {
        window.MathJax.typesetPromise().catch((e: any) => {
          console.warn('MathJax preview render error:', e);
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showPreview]);

  // Re-render MathJax when content changes
  useEffect(() => {
    if (showPreview && window.MathJax?.typesetPromise) {
      const timer = setTimeout(() => {
        window.MathJax.typesetPromise().catch((e: any) => {
          console.warn('MathJax render error:', e);
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [content, showPreview]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle image upload
  const handleImageUpload = async (file: File, altText: string): Promise<string> => {
    const formDataToSend = new FormData();
    formDataToSend.append('file', file);
    formDataToSend.append('altText', altText);

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formDataToSend,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload image');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    return result.data.url;
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

  const calculateReadTime = (text: string): number => {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const readTime = calculateReadTime(content);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Blog Post</h1>
          <p className="text-gray-600 mt-2">Update and manage your blog post with LaTeX support</p>
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
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <Link
            href="/admin/blogs"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Blogs
          </Link>
        </div>
      </div>

      {/* LaTeX Usage Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">LaTeX Math Support</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p className="mb-2">You can use LaTeX to write mathematical equations:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Inline math:</strong> Wrap with single $ signs: <code className="bg-blue-100 px-1 rounded">$E = mc^2$</code></li>
                <li><strong>Display math:</strong> Wrap with double $$ signs: <code className="bg-blue-100 px-1 rounded">$$integral equation$$</code></li>
                <li><strong>Quick insert:</strong> Press <kbd className="bg-blue-100 px-2 py-0.5 rounded">Ctrl+M</kbd> or click the ∑ button</li>
                <li><strong>Paste LaTeX:</strong> Simply paste LaTeX code and it will be automatically detected and rendered</li>
              </ul>
            </div>
          </div>
        </div>
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

      <div className={`grid ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
        {/* Editor Section */}
        <div>
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 space-y-6">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Enter blog post title"
                  required
                />
              </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="e.g., Technology, Product Review, Science"
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content * ({readTime} min read)
                </label>
                <SummernoteEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your blog post content here... Use LaTeX for math equations!"
                  onImageUpload={handleImageUpload}
                  height={500}
                />
              </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Brief description of the blog post (optional)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  A short summary of your blog post. If left empty, it will be generated from the content.
                </p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="SEO description for search engines"
                  />
                </div>
              </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="technology, web-development, nextjs"
                  />
                  <p className="text-sm text-gray-500 mt-1">Separate tags with commas</p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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

              {blogPost && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Post Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Slug:</span> {blogPost.slug}
                    </div>
                    <div>
                      <span className="font-medium">Read Time:</span> {readTime} minutes
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

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-4">
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
                  <p className="text-sm text-gray-600">* Required fields</p>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <Link
                    href="/admin/blogs"
                    className="inline-flex justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Live Preview Section */}
        {showPreview && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-6 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto shadow-sm">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 border-b border-blue-700">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Live Preview
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {formData.category && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {formData.category}
                  </span>
                </div>
              )}

              <h1 className="text-3xl font-bold text-gray-900">
                {formData.title || blogPost?.title || 'Untitled Blog Post'}
              </h1>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{readTime} min read</span>
                <span>•</span>
                <span>{content.split(/\s+/).length} words</span>
                {blogPost && (
                  <>
                    <span>•</span>
                    <span>Updated {formatDate(blogPost.updated_at)}</span>
                  </>
                )}
              </div>

              {formData.excerpt && (
                <p className="text-lg text-gray-600 italic border-l-4 border-blue-500 pl-4">
                  {formData.excerpt}
                </p>
              )}

              {formData.tags && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.split(',').map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <div
                  className="blog-preview-content tex2jax_process"
                  dangerouslySetInnerHTML={{
                    __html: content || '<p class="text-gray-400 italic">Your content will appear here...</p>',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .blog-preview-content {
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.75;
          color: #374151;
        }

        .blog-preview-content h1,
        .blog-preview-content h2,
        .blog-preview-content h3,
        .blog-preview-content h4,
        .blog-preview-content h5,
        .blog-preview-content h6 {
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #111827;
          line-height: 1.3;
        }

        .blog-preview-content h1 { font-size: 2.25rem; }
        .blog-preview-content h2 { font-size: 1.875rem; }
        .blog-preview-content h3 { font-size: 1.5rem; }
        .blog-preview-content h4 { font-size: 1.25rem; }

        .blog-preview-content p { margin-bottom: 1rem; }

        .blog-preview-content ul,
        .blog-preview-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .blog-preview-content ul { list-style-type: disc; }
        .blog-preview-content ol { list-style-type: decimal; }

        .blog-preview-content li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .blog-preview-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .blog-preview-content a {
          color: #2563eb;
          text-decoration: underline;
        }

        .blog-preview-content a:hover { color: #1d4ed8; }

        .blog-preview-content a.affiliate-link {
          color: #dc2624;
          font-weight: 600;
        }

        .blog-preview-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1.5rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #6b7280;
        }

        .blog-preview-content code {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #1f2937;
        }

        .blog-preview-content pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1.5rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.5rem 0;
        }

        .blog-preview-content pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }

        .blog-preview-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .blog-preview-content th,
        .blog-preview-content td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: left;
        }

        .blog-preview-content th {
          background: #f9fafb;
          font-weight: 600;
          color: #1f2937;
        }

        .blog-preview-content tr:nth-child(even) {
          background: #f9fafb;
        }

        .blog-preview-content .product-review-box {
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1.5rem 0;
          background: #f0f9ff;
        }

        .blog-preview-content .math-equation {
          display: inline-block;
          padding: 0.5rem 0.75rem;
          margin: 0.25rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 6px;
          font-family: 'Times New Roman', serif;
          transition: all 0.2s ease;
        }

        .blog-preview-content .math-equation[data-type="inline"] {
          display: inline;
          padding: 0.15rem 0.4rem;
          margin: 0 0.15rem;
          vertical-align: middle;
        }

        .blog-preview-content .math-equation[data-type="display"] {
          display: block;
          margin: 1.5rem auto;
          padding: 1.25rem;
          text-align: center;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-left: 4px solid #3b82f6;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
          max-width: 95%;
        }

        .blog-preview-content mjx-container {
          display: inline !important;
          margin: 0 0.25em;
        }

        .blog-preview-content mjx-container[display="true"] {
          display: block !important;
          text-align: center;
          margin: 1.5rem auto;
          overflow-x: auto;
        }

        .blog-preview-content mjx-container svg {
          max-width: 100%;
          height: auto;
        }

        .blog-preview-content hr {
          border: none;
          border-top: 2px solid #d1d5db;
          margin: 1.5rem 0;
        }

        kbd {
          display: inline-block;
          padding: 0.125rem 0.375rem;
          font-size: 0.875rem;
          font-weight: 600;
          line-height: 1;
          color: #374151;
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
}
