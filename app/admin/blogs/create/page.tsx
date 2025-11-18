// app/admin/blogs/create/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createBlogPost } from '../../../actions/blog';

// Dynamically import Summernote to avoid SSR issues
const SummernoteEditor = dynamic(() => import('./components/SummernoteEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center bg-gray-50">
      <div className="text-gray-500 flex items-center space-x-2">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
        <span>Loading editor...</span>
      </div>
    </div>
  ),
});

export default function CreateBlogPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    meta_title: '',
    meta_description: '',
    tags: '',
    category: '',
    status: 'draft' as 'draft' | 'published',
  });
  const [content, setContent] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

  // Comprehensive link validation and fixing
  const validateAndFixLinks = useCallback((html: string): { 
    cleanedHtml: string; 
    errors: string[]; 
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!html) {
      return { cleanedHtml: html, errors, warnings };
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const links = tempDiv.querySelectorAll('a');
    
    links.forEach((link, index) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();
      const linkNum = index + 1;
      
      // Critical: Remove links without href
      if (!href || href === '' || href === '#') {
        errors.push(`Link #${linkNum}: Missing URL - will be removed`);
        const textNode = document.createTextNode(text || '[broken link]');
        link.parentNode?.replaceChild(textNode, link);
        return;
      }
      
      // Warning: Empty link text
      if (!text || text === '') {
        warnings.push(`Link #${linkNum}: Empty text - using URL as text`);
        link.textContent = href;
      }
      
      // Fix target attribute
      const target = link.getAttribute('target');
      if (target === '_new' || target === 'new') {
        link.setAttribute('target', '_blank');
        warnings.push(`Link #${linkNum}: Fixed target from "${target}" to "_blank"`);
      }
      
      // Ensure proper rel for external links
      if (target === '_blank' || link.getAttribute('target') === '_blank') {
        const currentRel = link.getAttribute('rel') || '';
        const relParts = currentRel.split(' ').filter(Boolean);
        
        if (!relParts.includes('noopener')) relParts.push('noopener');
        if (!relParts.includes('noreferrer')) relParts.push('noreferrer');
        
        link.setAttribute('rel', relParts.join(' '));
      }
      
      // Remove problematic attributes
      link.removeAttribute('data-start');
      link.removeAttribute('data-end');
      if (link.classList.contains('cursor-pointer')) {
        link.classList.remove('cursor-pointer');
      }
      
      // Ensure protocol
      let cleanHref = href.trim();
      if (!cleanHref.match(/^(https?|mailto|tel):/i)) {
        cleanHref = 'https://' + cleanHref;
        link.setAttribute('href', cleanHref);
        warnings.push(`Link #${linkNum}: Added https:// protocol`);
      }
      
      // Validate URL format
      try {
        new URL(cleanHref);
      } catch (e) {
        errors.push(`Link #${linkNum}: Invalid URL format - "${cleanHref}"`);
      }
    });
    
    return {
      cleanedHtml: tempDiv.innerHTML,
      errors,
      warnings
    };
  }, []);

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
      // Validate and fix links
      const { cleanedHtml, errors, warnings } = validateAndFixLinks(content);
      
      // Show errors if any critical issues found
      if (errors.length > 0) {
        const errorMsg = 'Link validation errors found:\n\n' + errors.join('\n');
        const proceed = window.confirm(
          errorMsg + '\n\nThese issues have been automatically fixed. Do you want to continue?'
        );
        
        if (!proceed) {
          setIsSubmitting(false);
          return;
        }
      }
      
      // Show warnings if any
      if (warnings.length > 0) {
        console.warn('Link warnings:', warnings);
      }
      
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', cleanedHtml); // Use cleaned content
      formDataToSend.append('excerpt', formData.excerpt);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('meta_title', formData.meta_title || formData.title);
      formDataToSend.append('meta_description', formData.meta_description);
      formDataToSend.append('tags', formData.tags);
      formDataToSend.append('category', formData.category);

      const result = await createBlogPost(formDataToSend);

      if (result.success) {
        router.push('/admin/blogs');
        router.refresh();
      } else {
        setError(result.message || 'Failed to create blog post');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Create blog error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateReadTime = (text: string): number => {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  const readTime = calculateReadTime(content);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Blog Post</h1>
          <p className="text-gray-600 mt-2">Write and publish a new blog post with LaTeX support</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <Link
            href="/admin/blogs"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Blogs
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
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
          {/* Blog Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Enter blog post title"
                  required
                />
              </div>

              {/* Category */}
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

              {/* Content Editor */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Brief description of the blog post (optional)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  A short summary of your blog post. If left empty, it will be generated from the content.
                </p>
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
                    <option value="published">Publish</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-600">* Required fields</p>
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
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create Blog Post'
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
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Live Preview
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Preview Header */}
              {formData.category && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {formData.category}
                  </span>
                </div>
              )}

              <h1 className="text-3xl font-bold text-gray-900">
                {formData.title || 'Untitled Blog Post'}
              </h1>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{readTime} min read</span>
                <span>•</span>
                <span>{content.split(/\s+/).length} words</span>
              </div>

              {formData.excerpt && (
                <p className="text-lg text-gray-600 italic border-l-4 border-blue-500 pl-4">
                  {formData.excerpt}
                </p>
              )}

              {formData.tags && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.split(',').map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                {/* Preview Content - With tex2jax_process class for MathJax */}
                <div
                  className="blog-preview-content tex2jax_process"
                  dangerouslySetInnerHTML={{
                    __html:
                      content ||
                      '<p class="text-gray-400 italic">Your content will appear here...</p>',
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

        .blog-preview-content h1 {
          font-size: 2.25rem;
        }
        .blog-preview-content h2 {
          font-size: 1.875rem;
        }
        .blog-preview-content h3 {
          font-size: 1.5rem;
        }
        .blog-preview-content h4 {
          font-size: 1.25rem;
        }

        .blog-preview-content p {
          margin-bottom: 1rem;
        }

        .blog-preview-content ul,
        .blog-preview-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .blog-preview-content ul {
          list-style-type: disc;
        }

        .blog-preview-content ol {
          list-style-type: decimal;
        }

        .blog-preview-content li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .blog-preview-content ul ul,
        .blog-preview-content ol ol {
          margin: 0.5rem 0;
        }

        .blog-preview-content ul ul {
          list-style-type: circle;
        }

        .blog-preview-content ol ol {
          list-style-type: lower-alpha;
        }

        .blog-preview-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .blog-preview-content picture img {
          margin: 1.5rem 0;
        }

        .blog-preview-content a {
          color: #2563eb;
          text-decoration: underline;
        }

        .blog-preview-content a:hover {
          color: #1d4ed8;
        }

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
          line-height: 1.4;
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
          page-break-inside: avoid;
        }

        .blog-preview-content .product-review-box h3 {
          margin-top: 0;
          color: #1e40af;
        }

        .blog-preview-content .product-review-box h4 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .blog-preview-content .review-rating {
          font-size: 1.1em;
          margin: 1rem 0;
        }

        .blog-preview-content .review-section ul {
          margin: 0.5rem 0;
        }

        .blog-preview-content .review-verdict {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
        }

        /* Enhanced Math equation styling for preview */
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

        /* MathJax rendering in preview */
        .blog-preview-content mjx-container {
          display: inline !important;
          margin: 0 0.25em;
        }

        .blog-preview-content mjx-container[display="true"] {
          display: block !important;
          text-align: center;
          margin: 1.5rem auto;
          overflow-x: auto;
          overflow-y: hidden;
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

        /* Kbd styling for shortcuts */
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

        /* Link validation indicators (for debugging) */
        .blog-preview-content a:not([href])::before {
          content: '⚠️ NO URL ';
          color: red;
          font-weight: bold;
        }

        .blog-preview-content a[href="#"]::before,
        .blog-preview-content a[href=""]::before {
          content: '⚠️ EMPTY URL ';
          color: orange;
          font-weight: bold;
        }

        .blog-preview-content a:empty::after {
          content: '[Empty Link Text]';
          color: red;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
