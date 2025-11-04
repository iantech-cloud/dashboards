// app/dashboard/content/create/components/MetaTagsEditor.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Tag,
  Search,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Copy,
  Code,
  Globe
} from 'lucide-react';

interface MetaTagsEditorProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
  primaryKeyword: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onUrlSlugChange: (value: string) => void;
}

export default function MetaTagsEditor({
  title,
  metaTitle,
  metaDescription,
  urlSlug,
  primaryKeyword,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onUrlSlugChange
}: MetaTagsEditorProps) {
  const [showSchema, setShowSchema] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get site URL from environment
  const siteUrl = process.env.NEXTAUTH_URL || 'https://hustlehubafrica.com';
  const baseUrl = `${siteUrl}/blog`;

  // Auto-set meta title from content title
  useEffect(() => {
    if (title && title !== metaTitle) {
      onMetaTitleChange(title);
    }
  }, [title, metaTitle, onMetaTitleChange]);

  // Auto-generate URL slug from title
  useEffect(() => {
    if (title) {
      const slug = generateSlug(title);
      if (slug !== urlSlug) {
        onUrlSlugChange(slug);
      }
    }
  }, [title, urlSlug, onUrlSlugChange]);

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const getTitleStatus = () => {
    const length = metaTitle.length;
    if (length === 0) return { color: 'text-gray-400', message: 'Required' };
    if (length < 50) return { color: 'text-yellow-600', message: 'Too short' };
    if (length > 60) return { color: 'text-orange-600', message: 'Too long' };
    return { color: 'text-green-600', message: 'Perfect!' };
  };

  const getDescriptionStatus = () => {
    const length = metaDescription.length;
    if (length === 0) return { color: 'text-gray-400', message: 'Required' };
    if (length < 150) return { color: 'text-yellow-600', message: 'Too short' };
    if (length > 160) return { color: 'text-orange-600', message: 'Too long' };
    return { color: 'text-green-600', message: 'Perfect!' };
  };

  const titleStatus = getTitleStatus();
  const descriptionStatus = getDescriptionStatus();

  const hasKeywordInTitle = metaTitle.toLowerCase().includes(primaryKeyword.toLowerCase());
  const hasKeywordInDescription = metaDescription.toLowerCase().includes(primaryKeyword.toLowerCase());
  const hasKeywordInSlug = urlSlug.toLowerCase().includes(primaryKeyword.toLowerCase().replace(/\s+/g, '-'));

  // Generate Article Schema
  const generateArticleSchema = () => {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": metaTitle || title,
      "description": metaDescription,
      "author": {
        "@type": "Person",
        "name": "Author Name" // This should be dynamic
      },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "publisher": {
        "@type": "Organization",
        "name": "Your Company",
        "logo": {
          "@type": "ImageObject",
          "url": "https://yoursite.com/logo.png"
        }
      }
    }, null, 2);
  };

  const copySchema = () => {
    navigator.clipboard.writeText(generateArticleSchema());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">SEO Meta Tags</h3>
        </div>
        <button
          onClick={() => setShowSchema(!showSchema)}
          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          <Code className="w-4 h-4" />
          {showSchema ? 'Hide' : 'Show'} Schema
        </button>
      </div>

      {/* Meta Title */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Meta Title
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${titleStatus.color}`}>
              {titleStatus.message}
            </span>
            <span className="text-xs text-gray-500">
              {metaTitle.length}/60
            </span>
          </div>
        </div>
        <input
          type="text"
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          placeholder="Enter an engaging meta title (50-60 characters)"
          maxLength={70}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
            metaTitle.length >= 50 && metaTitle.length <= 60
              ? 'border-green-300'
              : metaTitle.length > 60
              ? 'border-orange-300'
              : 'border-gray-300'
          }`}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasKeywordInTitle ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Keyword included</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-yellow-600">
                <AlertCircle className="w-3 h-3" />
                <span>Add primary keyword</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Appears in search results and browser tabs
          </p>
        </div>
      </div>

      {/* Meta Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Meta Description
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${descriptionStatus.color}`}>
              {descriptionStatus.message}
            </span>
            <span className="text-xs text-gray-500">
              {metaDescription.length}/160
            </span>
          </div>
        </div>
        <textarea
          value={metaDescription}
          onChange={(e) => onMetaDescriptionChange(e.target.value)}
          placeholder="Write a compelling description (150-160 characters)"
          maxLength={170}
          rows={3}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
            metaDescription.length >= 150 && metaDescription.length <= 160
              ? 'border-green-300'
              : metaDescription.length > 160
              ? 'border-orange-300'
              : 'border-gray-300'
          }`}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasKeywordInDescription ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Keyword included</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-yellow-600">
                <AlertCircle className="w-3 h-3" />
                <span>Add primary keyword</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Appears below title in search results
          </p>
        </div>
      </div>

      {/* URL Slug */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            URL Slug
          </label>
          <div className="flex items-center gap-2">
            {hasKeywordInSlug ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Keyword included</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-yellow-600">
                <AlertCircle className="w-3 h-3" />
                <span>Add primary keyword</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{baseUrl}/</span>
          <input
            type="text"
            value={urlSlug}
            onChange={(e) => {
              const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
              onUrlSlugChange(slug);
            }}
            placeholder="url-friendly-slug"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Use lowercase letters, numbers, and hyphens only
        </p>
      </div>

      {/* SERP Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Google Preview</h4>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          {/* URL */}
          <div className="flex items-center gap-1 text-xs text-green-700 mb-1">
            <Globe className="w-3 h-3" />
            <span>{baseUrl}/{urlSlug || 'url-slug'}</span>
          </div>
          
          {/* Title */}
          <h5 className="text-lg text-blue-600 hover:underline cursor-pointer mb-1">
            {metaTitle || 'Your Meta Title Here'}
          </h5>
          
          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {metaDescription || 'Your meta description will appear here. Make it compelling to encourage clicks!'}
          </p>
        </div>
        
        <p className="mt-2 text-xs text-gray-500">
          This is how your page will appear in Google search results
        </p>
      </div>

      {/* Schema Markup */}
      {showSchema && (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Article Schema (JSON-LD)</h4>
            <button
              onClick={copySchema}
              className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-xs overflow-x-auto">
            <code>{generateArticleSchema()}</code>
          </pre>
          <p className="mt-2 text-xs text-gray-400">
            Add this schema markup to your page's &lt;head&gt; section for better search visibility
          </p>
        </div>
      )}

      {/* SEO Checklist */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-purple-900 mb-3">Meta Tags Checklist</h4>
        <div className="space-y-2">
          <ChecklistItem
            checked={metaTitle.length >= 50 && metaTitle.length <= 60}
            label="Meta title is 50-60 characters"
          />
          <ChecklistItem
            checked={hasKeywordInTitle}
            label="Primary keyword in meta title"
          />
          <ChecklistItem
            checked={metaDescription.length >= 150 && metaDescription.length <= 160}
            label="Meta description is 150-160 characters"
          />
          <ChecklistItem
            checked={hasKeywordInDescription}
            label="Primary keyword in meta description"
          />
          <ChecklistItem
            checked={urlSlug.length > 0 && hasKeywordInSlug}
            label="URL slug contains primary keyword"
          />
        </div>
      </div>
    </div>
  );
}

// Helper Component
function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded flex items-center justify-center ${
        checked ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
      }`}>
        {checked && <CheckCircle className="w-4 h-4" />}
      </div>
      <span className={`text-sm ${checked ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
