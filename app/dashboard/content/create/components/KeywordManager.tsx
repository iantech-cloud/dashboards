// app/dashboard/content/create/components/KeywordManager.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Info,
  Lightbulb
} from 'lucide-react';
import {
  analyzeKeywordDensity,
  detectSERPIntent,
  analyzeKeywordPlacement,
  findKeywordPositions,
  type KeywordDensityWarning,
  type SERPIntentAnalysis,
  type KeywordPlacementScore
} from '@/app/lib/seo-utils-enhanced';

interface KeywordManagerProps {
  content: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  metaTitle?: string;
  metaDescription?: string;
  urlSlug?: string;
  onPrimaryKeywordChange: (keyword: string) => void;
  onSecondaryKeywordsChange: (keywords: string[]) => void;
}

export default function KeywordManager({
  content,
  primaryKeyword,
  secondaryKeywords,
  metaTitle,
  metaDescription,
  urlSlug,
  onPrimaryKeywordChange,
  onSecondaryKeywordsChange
}: KeywordManagerProps) {
  const [newSecondaryKeyword, setNewSecondaryKeyword] = useState('');
  const [densityWarning, setDensityWarning] = useState<KeywordDensityWarning | null>(null);
  const [serpIntent, setSerpIntent] = useState<SERPIntentAnalysis | null>(null);
  const [placementScore, setPlacementScore] = useState<KeywordPlacementScore | null>(null);
  const [showIntentDetails, setShowIntentDetails] = useState(false);

  // Analyze on content or keyword change
  useEffect(() => {
    if (primaryKeyword && content) {
      // Analyze density
      const warning = analyzeKeywordDensity(content, primaryKeyword);
      setDensityWarning(warning);

      // Analyze placement
      const placement = analyzeKeywordPlacement(
        content,
        primaryKeyword,
        metaTitle,
        metaDescription,
        urlSlug
      );
      setPlacementScore(placement);

      // Detect SERP intent
      const intent = detectSERPIntent(content, [primaryKeyword, ...secondaryKeywords]);
      setSerpIntent(intent);
    }
  }, [content, primaryKeyword, secondaryKeywords, metaTitle, metaDescription, urlSlug]);

  const addSecondaryKeyword = () => {
    if (newSecondaryKeyword.trim() && !secondaryKeywords.includes(newSecondaryKeyword.trim())) {
      onSecondaryKeywordsChange([...secondaryKeywords, newSecondaryKeyword.trim()]);
      setNewSecondaryKeyword('');
    }
  };

  const removeSecondaryKeyword = (index: number) => {
    onSecondaryKeywordsChange(secondaryKeywords.filter((_, i) => i !== index));
  };

  const getDensityColor = (level: KeywordDensityWarning['level']) => {
    switch (level) {
      case 'optimal':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'stuffing':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'informational':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transactional':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'commercial_investigation':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'navigational':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Keyword Strategy</h3>
        </div>
        <button
          onClick={() => setShowIntentDetails(!showIntentDetails)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Info className="w-4 h-4" />
          {showIntentDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Primary Keyword */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Keyword
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={primaryKeyword}
          onChange={(e) => onPrimaryKeywordChange(e.target.value)}
          placeholder="e.g., content marketing strategy"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          Your main target keyword for this content
        </p>
      </div>

      {/* Density Warning */}
      {densityWarning && primaryKeyword && (
        <div className={`p-4 rounded-lg border ${getDensityColor(densityWarning.level)}`}>
          <div className="flex items-start gap-3">
            {densityWarning.level === 'optimal' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{densityWarning.message}</p>
              <p className="text-xs mt-1 opacity-80">{densityWarning.recommendation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Keyword Placement Score */}
      {placementScore && primaryKeyword && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Keyword Placement</h4>
            <div className="text-sm font-semibold">
              <span className={placementScore.score >= 4 ? 'text-green-600' : 'text-orange-600'}>
                {placementScore.score}/{placementScore.maxScore}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <PlacementItem
              checked={placementScore.inTitle}
              label="In Meta Title"
            />
            <PlacementItem
              checked={placementScore.inFirstParagraph}
              label="In First Paragraph"
            />
            <PlacementItem
              checked={placementScore.inHeadings}
              label="In Headings"
            />
            <PlacementItem
              checked={placementScore.inMetaDescription}
              label="In Meta Description"
            />
            <PlacementItem
              checked={placementScore.inURL}
              label="In URL Slug"
            />
          </div>

          {placementScore.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {placementScore.recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                    <Lightbulb className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SERP Intent */}
      {serpIntent && primaryKeyword && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Search Intent</h4>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getIntentColor(serpIntent.primaryIntent)}`}>
              {serpIntent.primaryIntent.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-gray-600 mb-2">
            Confidence: {serpIntent.confidence.toFixed(0)}%
          </p>

          {showIntentDetails && (
            <>
              {serpIntent.signals.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Detected Signals:</p>
                  <div className="flex flex-wrap gap-1">
                    {serpIntent.signals.map((signal, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-white rounded text-xs text-gray-600 border border-gray-200"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {serpIntent.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Recommendations:</p>
                  <ul className="space-y-1">
                    {serpIntent.recommendations.map((rec, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                        <Lightbulb className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Secondary Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Secondary Keywords (LSI)
        </label>
        
        {/* Add new keyword */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newSecondaryKeyword}
            onChange={(e) => setNewSecondaryKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSecondaryKeyword()}
            placeholder="Add a related keyword"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addSecondaryKeyword}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Secondary keywords list */}
        {secondaryKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {secondaryKeywords.map((keyword, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <span className="text-sm text-blue-900">{keyword}</span>
                <button
                  onClick={() => removeSecondaryKeyword(index)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No secondary keywords added yet
          </p>
        )}
        
        <p className="mt-2 text-xs text-gray-500">
          Add related keywords to improve semantic SEO and cover more search variations
        </p>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Keyword Tips
        </h4>
        <ul className="space-y-1 text-xs text-blue-800">
          <li>• Use keywords naturally - don't force them</li>
          <li>• Target 0.8-2% density for primary keyword</li>
          <li>• Include keywords in H2/H3 headings</li>
          <li>• Add semantic variations and related terms</li>
          <li>• Focus on user intent, not just keywords</li>
        </ul>
      </div>
    </div>
  );
}

// Helper component for placement checklist
function PlacementItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded flex items-center justify-center ${
        checked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
      }`}>
        {checked && <CheckCircle className="w-4 h-4" />}
      </div>
      <span className={`text-sm ${checked ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
