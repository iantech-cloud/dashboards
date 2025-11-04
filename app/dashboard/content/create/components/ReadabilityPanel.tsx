// app/dashboard/content/create/components/ReadabilityPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  TrendingUp,
  FileText
} from 'lucide-react';
import { analyzeReadability, type ReadabilityScore } from '@/app/lib/seo-utils';

interface ReadabilityPanelProps {
  content: string;
  onHighlightSentence?: (sentence: string) => void;
}

export default function ReadabilityPanel({
  content,
  onHighlightSentence
}: ReadabilityPanelProps) {
  const [analysis, setAnalysis] = useState<ReadabilityScore | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (content && content.trim().length > 0) {
      const result = analyzeReadability(content);
      setAnalysis(result);
    } else {
      setAnalysis(null);
    }
  }, [content]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 70) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 50) return 'bg-yellow-50 border-yellow-200';
    if (score >= 30) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getRecommendation = (score: number): string => {
    if (score >= 70) {
      return 'Excellent! Your content is very easy to read and accessible to a wide audience.';
    } else if (score >= 60) {
      return 'Good! Your content is fairly easy to read. Consider simplifying a few sentences.';
    } else if (score >= 50) {
      return 'Fair. Your content may be challenging for some readers. Try shorter sentences and simpler words.';
    } else if (score >= 30) {
      return 'Difficult. Break down complex sentences and use more common vocabulary.';
    }
    return 'Very difficult to read. Significant simplification needed for better accessibility.';
  };

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <BookOpen className="w-5 h-5" />
          <p className="text-sm">Start writing to see readability analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Readability Analysis</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Flesch Reading Ease Score */}
      <div className={`p-4 rounded-lg border ${getScoreBackground(analysis.fleschScore)}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">Flesch Reading Ease</h4>
          <div className={`text-2xl font-bold ${getScoreColor(analysis.fleschScore)}`}>
            {isNaN(analysis.fleschScore) ? '0' : Math.round(analysis.fleschScore)}
          </div>
        </div>
        
        {/* Score bar */}
        <div className="relative h-2 bg-gray-200 rounded-full mb-2 overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
              analysis.fleschScore >= 70 ? 'bg-green-500' :
              analysis.fleschScore >= 60 ? 'bg-blue-500' :
              analysis.fleschScore >= 50 ? 'bg-yellow-500' :
              analysis.fleschScore >= 30 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${isNaN(analysis.fleschScore) ? 0 : Math.round(analysis.fleschScore)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">{analysis.grade}</span>
          <span className={`font-medium ${getScoreColor(analysis.fleschScore)}`}>
            {analysis.fleschScore >= 60 ? 'Easy to Read' :
             analysis.fleschScore >= 50 ? 'Fairly Easy' :
             analysis.fleschScore >= 30 ? 'Difficult' : 'Very Difficult'}
          </span>
        </div>
        
        <p className="mt-3 text-xs text-gray-700">
          {getRecommendation(analysis.fleschScore)}
        </p>
      </div>

      {showDetails && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Average Sentence Length */}
            <MetricCard
              icon={<FileText className="w-5 h-5" />}
              label="Avg. Sentence Length"
              value={`${isNaN(analysis.averageSentenceLength) ? '0' : Math.round(analysis.averageSentenceLength)} words`}
              status={analysis.averageSentenceLength <= 20 ? 'good' : 'warning'}
              tip={analysis.averageSentenceLength <= 20 
                ? 'Perfect! Aim for 15-20 words per sentence.'
                : 'Try to shorten sentences to 15-20 words.'}
            />

            {/* Long Sentences */}
            <MetricCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Long Sentences"
              value={analysis.longSentences.toString()}
              status={analysis.longSentences === 0 ? 'good' : analysis.longSentences <= 3 ? 'warning' : 'error'}
              tip={analysis.longSentences === 0
                ? 'Great! No overly long sentences detected.'
                : `Found ${analysis.longSentences} sentence(s) over 20 words. Consider breaking them down.`}
            />

            {/* Passive Voice */}
            <MetricCard
              icon={<Eye className="w-5 h-5" />}
              label="Passive Voice Count"
              value={analysis.passiveVoiceCount.toString()}
              status={analysis.passiveVoiceCount <= 5 ? 'good' : 'warning'}
              tip={analysis.passiveVoiceCount <= 5
                ? 'Good! Minimal passive voice usage.'
                : 'Consider using more active voice for clarity.'}
            />

            {/* Complex Words */}
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Complex Words"
              value={analysis.complexWords.length.toString()}
              status={analysis.complexWords.length <= 10 ? 'good' : 'warning'}
              tip="Words with 3+ syllables may be harder to read."
            />
          </div>

          {/* Complex Words List */}
          {analysis.complexWords.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-900">Complex Words Found</h4>
                  <p className="text-xs text-yellow-700 mt-1">
                    Consider simpler alternatives for these words:
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {analysis.complexWords.map((word, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white border border-yellow-300 rounded text-xs text-gray-700"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reading Level Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Reading Level Guide
            </h4>
            <div className="space-y-2">
              <LevelGuide score={90} level="Very Easy" grade="5th grade" color="text-green-600" />
              <LevelGuide score={80} level="Easy" grade="6th grade" color="text-green-500" />
              <LevelGuide score={70} level="Fairly Easy" grade="7th grade" color="text-blue-600" />
              <LevelGuide score={60} level="Standard" grade="8th-9th grade" color="text-blue-500" />
              <LevelGuide score={50} level="Fairly Difficult" grade="10th-12th grade" color="text-yellow-600" />
              <LevelGuide score={30} level="Difficult" grade="College" color="text-orange-600" />
            </div>
          </div>

          {/* Improvement Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Tips to Improve Readability
            </h4>
            <ul className="space-y-2 text-xs text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Use shorter sentences (15-20 words average)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Replace complex words with simpler alternatives</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Use active voice instead of passive</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Break long paragraphs into smaller chunks</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Use bullet points and lists for clarity</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// Helper Components
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'error';
  tip: string;
}

function MetricCard({ icon, label, value, status, tip }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="opacity-60">{icon}</div>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <p className="text-xs opacity-80">{tip}</p>
    </div>
  );
}

interface LevelGuideProps {
  score: number;
  level: string;
  grade: string;
  color: string;
}

function LevelGuide({ score, level, grade, color }: LevelGuideProps) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <span className={`font-medium ${color}`}>{score}+</span>
        <span className="text-gray-700">{level}</span>
      </div>
      <span className="text-gray-500">{grade}</span>
    </div>
  );
}
