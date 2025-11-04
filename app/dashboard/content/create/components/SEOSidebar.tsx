// app/dashboard/content/create/components/SEOSidebar.tsx
'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Target,
  BarChart3,
  FileText,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { SEOAnalysisState } from '@/app/hooks/useSEOAnalysis';

interface SEOSidebarProps {
  analysis: SEOAnalysisState;
  className?: string;
}

export default function SEOSidebar({ analysis, className = '' }: SEOSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    score: true,
    keywords: true,
    readability: true,
    structure: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2" />
        SEO Analysis
      </h3>

      {/* Overall SEO Score */}
      <Section
        title="SEO Score"
        icon={<TrendingUp className="w-4 h-4" />}
        expanded={expandedSections.score}
        onToggle={() => toggleSection('score')}
      >
        {analysis.seoScore ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.seoScore.overall)}`}>
                {analysis.seoScore.overall}/100
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {analysis.seoScore.overall >= 80 ? 'Excellent' :
                 analysis.seoScore.overall >= 60 ? 'Good' :
                 analysis.seoScore.overall >= 40 ? 'Needs Improvement' : 'Poor'}
              </p>
            </div>

            <div className="space-y-2">
              <ScoreBar
                label="Keywords"
                score={analysis.seoScore.keyword}
                max={40}
                color={analysis.seoScore.keyword >= 30 ? 'green' : 'yellow'}
              />
              <ScoreBar
                label="Readability"
                score={analysis.seoScore.readability}
                max={20}
                color={analysis.seoScore.readability >= 15 ? 'green' : 'yellow'}
              />
              <ScoreBar
                label="Structure"
                score={analysis.seoScore.structure}
                max={20}
                color={analysis.seoScore.structure >= 15 ? 'green' : 'yellow'}
              />
              <ScoreBar
                label="Meta Tags"
                score={analysis.seoScore.meta}
                max={20}
                color={analysis.seoScore.meta >= 15 ? 'green' : 'yellow'}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Start writing to see your SEO score...</p>
        )}
      </Section>

      {/* Keyword Analysis */}
      <Section
        title="Keywords"
        icon={<Target className="w-4 h-4" />}
        expanded={expandedSections.keywords}
        onToggle={() => toggleSection('keywords')}
      >
        {analysis.keywords.length > 0 ? (
          <div className="space-y-3">
            {analysis.keywords.map((kw, index) => (
              <div key={index} className="border-b border-gray-100 pb-2 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-700">{kw.keyword}</span>
                  <span className={`text-xs ${kw.isOptimal ? 'text-green-600' : 'text-yellow-600'}`}>
                    {kw.density}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {kw.isOptimal ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  )}
                  <span className="text-xs text-gray-600">
                    {kw.count} uses {kw.warning && `• ${kw.warning}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Add keywords to track their usage...</p>
        )}
      </Section>

      {/* Readability */}
      <Section
        title="Readability"
        icon={<FileText className="w-4 h-4" />}
        expanded={expandedSections.readability}
        onToggle={() => toggleSection('readability')}
      >
        {analysis.readability ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Flesch Score</span>
              <span className={`text-sm font-medium ${
                analysis.readability.fleschScore >= 60 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {analysis.readability.fleschScore}/100
              </span>
            </div>
            <p className="text-xs text-gray-500">{analysis.readability.grade}</p>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <MetricRow
                label="Avg. Sentence Length"
                value={`${analysis.readability.averageSentenceLength} words`}
                status={analysis.readability.averageSentenceLength <= 20 ? 'good' : 'warning'}
              />
              <MetricRow
                label="Long Sentences"
                value={analysis.readability.longSentences}
                status={analysis.readability.longSentences === 0 ? 'good' : 'warning'}
              />
              <MetricRow
                label="Passive Voice"
                value={analysis.readability.passiveVoiceCount}
                status={analysis.readability.passiveVoiceCount <= 5 ? 'good' : 'warning'}
              />
            </div>

            {analysis.readability.complexWords.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600 mb-1">Complex words found:</p>
                <p className="text-xs text-gray-500">
                  {analysis.readability.complexWords.join(', ')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Write content to check readability...</p>
        )}
      </Section>

      {/* Structure */}
      <Section
        title="Structure"
        icon={<LinkIcon className="w-4 h-4" />}
        expanded={expandedSections.structure}
        onToggle={() => toggleSection('structure')}
      >
        {analysis.structure ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className={`text-lg font-medium ${
                  analysis.structure.h1Count === 1 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analysis.structure.h1Count}
                </div>
                <div className="text-xs text-gray-500">H1</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-gray-700">
                  {analysis.structure.h2Count}
                </div>
                <div className="text-xs text-gray-500">H2</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-gray-700">
                  {analysis.structure.h3Count}
                </div>
                <div className="text-xs text-gray-500">H3</div>
              </div>
            </div>

            {analysis.structure.issues.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-red-600 mb-1">Issues:</p>
                <ul className="space-y-1">
                  {analysis.structure.issues.map((issue, i) => (
                    <li key={i} className="text-xs text-red-600 flex items-start">
                      <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.structure.outline.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-2">Content Outline:</p>
                <div className="space-y-1">
                  {analysis.structure.outline.map((heading, i) => (
                    <div
                      key={i}
                      className="text-xs text-gray-600"
                      style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                    >
                      {heading.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Add headings to see structure analysis...</p>
        )}
      </Section>

      {/* Word Count & Reading Time */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{analysis.wordCount}</div>
            <div className="text-xs text-gray-500">Words</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{analysis.readingTime}</div>
            <div className="text-xs text-gray-500">Min Read</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function Section({
  title,
  icon,
  expanded,
  onToggle,
  children
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-200 py-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  );
}

function ScoreBar({
  label,
  score,
  max,
  color
}: {
  label: string;
  score: number;
  max: number;
  color: 'green' | 'yellow' | 'red';
}) {
  const percentage = (score / max) * 100;
  const colorClass = color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{score}/{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  status
}: {
  label: string;
  value: string | number;
  status: 'good' | 'warning' | 'error';
}) {
  const statusColor = status === 'good' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-xs font-medium ${statusColor}`}>{value}</span>
    </div>
  );
}
