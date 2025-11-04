// app/dashboard/content/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Eye,
  Send,
  ArrowLeft,
  Sparkles,
  FileText,
  AlertCircle
} from 'lucide-react';
import SummernoteEditor from './components/SummernoteEditor';
import SEOSidebar from './components/SEOSidebar';
import KeywordManager from './components/KeywordManager';
import ReadabilityPanel from './components/ReadabilityPanel';
import MetaTagsEditor from './components/MetaTagsEditor';
import { useSEOAnalysis } from '@/app/hooks/useSEOAnalysis';
import { createContentSubmission } from '@/app/actions/dashboard/content';

export default function EnhancedContentCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'seo' | 'readability' | 'meta'>('editor');
  
  // Content state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'blog_post' | 'social_media' | 'product_review' | 'video' | 'other'>('blog_post');
  const [taskCategory, setTaskCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // SEO state
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [urlSlug, setUrlSlug] = useState('');
  
  // Use the SEO analysis hook
  const seoAnalysis = useSEOAnalysis(
    content,
    primaryKeyword,
    secondaryKeywords,
    metaTitle,
    metaDescription
  );

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setTimeout(() => {
      if (title || content) {
        // Save to localStorage as draft
        localStorage.setItem('content-draft', JSON.stringify({
          title,
          content,
          contentType,
          taskCategory,
          tags,
          primaryKeyword,
          secondaryKeywords,
          metaTitle,
          metaDescription,
          urlSlug,
          savedAt: new Date().toISOString()
        }));
      }
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(autoSave);
  }, [title, content, contentType, taskCategory, tags, primaryKeyword, secondaryKeywords, metaTitle, metaDescription, urlSlug]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('content-draft');
    if (draft) {
      try {
        const data = JSON.parse(draft);
        if (confirm('Found a saved draft. Would you like to restore it?')) {
          setTitle(data.title || '');
          setContent(data.content || '');
          setContentType(data.contentType || 'blog_post');
          setTaskCategory(data.taskCategory || '');
          setTags(data.tags || []);
          setPrimaryKeyword(data.primaryKeyword || '');
          setSecondaryKeywords(data.secondaryKeywords || []);
          setMetaTitle(data.metaTitle || '');
          setMetaDescription(data.metaDescription || '');
          setUrlSlug(data.urlSlug || '');
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!content.trim() || content === '<p><br></p>') {
      alert('Please write some content');
      return;
    }

    if (!taskCategory.trim()) {
      alert('Please select a task category');
      return;
    }

    if (!primaryKeyword.trim()) {
      alert('Please enter a primary keyword');
      return;
    }

    if (!metaTitle.trim()) {
      alert('Please enter a meta title');
      return;
    }

    if (!metaDescription.trim()) {
      alert('Please enter a meta description');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createContentSubmission({
        title,
        content_type: contentType,
        content_text: content,
        task_category: taskCategory,
        tags,
        word_count: seoAnalysis.wordCount,
        attachments: [] // Will be handled separately
      });

      if (result.success) {
        // Clear draft
        localStorage.removeItem('content-draft');
        
        // Show success message
        alert(result.message);
        
        // Redirect to content list
        router.push('/dashboard/content');
      } else {
        alert(result.message || 'Failed to submit content');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred while submitting your content');
    } finally {
      setSubmitting(false);
    }
  };

  const getTabColor = (tab: typeof activeTab) => {
    return activeTab === tab
      ? 'bg-blue-600 text-white'
      : 'bg-white text-gray-700 hover:bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Center: Title */}
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Create Content</h1>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {/* Preview functionality */}}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">Preview</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span className="text-sm">
                  {submitting ? 'Submitting...' : 'Submit'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Editor and Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Title
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter an engaging title..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Content Type and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="blog_post">Blog Post</option>
                    <option value="social_media">Social Media</option>
                    <option value="product_review">Product Review</option>
                    <option value="video">Video Script</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    placeholder="e.g., Technology, Health"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 flex">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${getTabColor('editor')}`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab('seo')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${getTabColor('seo')}`}
                >
                  Keywords
                </button>
                <button
                  onClick={() => setActiveTab('readability')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${getTabColor('readability')}`}
                >
                  Readability
                </button>
                <button
                  onClick={() => setActiveTab('meta')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${getTabColor('meta')}`}
                >
                  Meta Tags
                </button>
              </div>

              <div className="p-6">
                {/* Editor Tab */}
                {activeTab === 'editor' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Content
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <span className="text-xs text-gray-500">
                        {seoAnalysis.wordCount} words • {seoAnalysis.readingTime} min read
                      </span>
                    </div>
                    <SummernoteEditor
                      value={content}
                      onChange={setContent}
                      placeholder="Start writing your content here..."
                      height={600}
                    />
                  </div>
                )}

                {/* SEO Tab */}
                {activeTab === 'seo' && (
                  <KeywordManager
                    content={content}
                    primaryKeyword={primaryKeyword}
                    secondaryKeywords={secondaryKeywords}
                    metaTitle={metaTitle}
                    metaDescription={metaDescription}
                    urlSlug={urlSlug}
                    onPrimaryKeywordChange={setPrimaryKeyword}
                    onSecondaryKeywordsChange={setSecondaryKeywords}
                  />
                )}

                {/* Readability Tab */}
                {activeTab === 'readability' && (
                  <ReadabilityPanel content={content} />
                )}

                {/* Meta Tags Tab */}
                {activeTab === 'meta' && (
                  <MetaTagsEditor
                    title={title}
                    metaTitle={metaTitle}
                    metaDescription={metaDescription}
                    urlSlug={urlSlug}
                    primaryKeyword={primaryKeyword}
                    onMetaTitleChange={setMetaTitle}
                    onMetaDescriptionChange={setMetaDescription}
                    onUrlSlugChange={setUrlSlug}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column: SEO Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <SEOSidebar analysis={seoAnalysis} />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Info */}
      {seoAnalysis.wordCount > 0 && (
        <div className="fixed bottom-6 left-6 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Auto-save Active</h4>
              <p className="text-xs text-gray-600">
                Your work is being saved automatically every 3 seconds
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
