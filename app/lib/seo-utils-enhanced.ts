// app/lib/seo-utils-enhanced.ts
'use client';

import {
  KeywordAnalysis,
  ReadabilityScore,
  ContentStructure,
  SEOScore,
  stripHtml,
  countWords,
  estimateReadingTime
} from './seo-utils';

// ============================================================================
// KEYWORD HIGHLIGHTING & TRACKING
// ============================================================================

export interface KeywordPosition {
  keyword: string;
  positions: number[];
  contexts: string[];
}

export interface KeywordDensityWarning {
  level: 'optimal' | 'low' | 'high' | 'stuffing';
  message: string;
  recommendation: string;
}

/**
 * Highlight keywords in HTML content
 */
export function highlightKeywords(
  htmlContent: string,
  keywords: string[]
): string {
  let highlighted = htmlContent;
  
  keywords.forEach((keyword, index) => {
    const color = getKeywordColor(index);
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    highlighted = highlighted.replace(
      regex,
      `<mark class="keyword-highlight" style="background-color: ${color}; padding: 2px 4px; border-radius: 3px;">$1</mark>`
    );
  });
  
  return highlighted;
}

/**
 * Get color for keyword highlighting
 */
function getKeywordColor(index: number): string {
  const colors = [
    '#fef08a', // yellow-200
    '#bfdbfe', // blue-200
    '#d9f99d', // lime-200
    '#fecaca', // red-200
    '#e9d5ff', // purple-200
  ];
  return colors[index % colors.length];
}

/**
 * Find all positions of keywords in text
 */
export function findKeywordPositions(
  content: string,
  keywords: string[]
): KeywordPosition[] {
  const text = stripHtml(content).toLowerCase();
  const words = text.split(/\s+/);
  
  return keywords.map(keyword => {
    const keywordLower = keyword.toLowerCase();
    const positions: number[] = [];
    const contexts: string[] = [];
    
    words.forEach((word, index) => {
      if (word === keywordLower) {
        positions.push(index);
        
        // Get context (3 words before and after)
        const start = Math.max(0, index - 3);
        const end = Math.min(words.length, index + 4);
        const context = words.slice(start, end).join(' ');
        contexts.push(context);
      }
    });
    
    return {
      keyword,
      positions,
      contexts
    };
  });
}

/**
 * Analyze keyword density and provide warnings
 */
export function analyzeKeywordDensity(
  content: string,
  keyword: string,
  targetMin: number = 0.8,
  targetMax: number = 2.0
): KeywordDensityWarning {
  const text = stripHtml(content).toLowerCase();
  const wordCount = text.split(/\s+/).length;
  const keywordCount = (text.match(new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g')) || []).length;
  const density = (keywordCount / wordCount) * 100;
  
  if (density < targetMin) {
    return {
      level: 'low',
      message: `Keyword density is ${density.toFixed(2)}% (target: ${targetMin}-${targetMax}%)`,
      recommendation: `Add ${Math.ceil((targetMin * wordCount / 100) - keywordCount)} more instances of "${keyword}" naturally throughout your content.`
    };
  } else if (density > targetMax * 1.5) {
    return {
      level: 'stuffing',
      message: `Keyword stuffing detected! Density is ${density.toFixed(2)}%`,
      recommendation: `Remove ${Math.ceil(keywordCount - (targetMax * wordCount / 100))} instances of "${keyword}". This may harm your SEO.`
    };
  } else if (density > targetMax) {
    return {
      level: 'high',
      message: `Keyword density is ${density.toFixed(2)}% (target: ${targetMin}-${targetMax}%)`,
      recommendation: `Consider reducing keyword usage by ${Math.ceil(keywordCount - (targetMax * wordCount / 100))} instances for better natural flow.`
    };
  }
  
  return {
    level: 'optimal',
    message: `Keyword density is optimal at ${density.toFixed(2)}%`,
    recommendation: 'Keep maintaining this natural keyword usage throughout your content.'
  };
}

// ============================================================================
// SERP INTENT DETECTION
// ============================================================================

export type SERPIntent = 
  | 'informational'
  | 'navigational'
  | 'transactional'
  | 'commercial_investigation';

export interface SERPIntentAnalysis {
  primaryIntent: SERPIntent;
  confidence: number;
  signals: string[];
  recommendations: string[];
}

/**
 * Detect SERP intent from content and keywords
 */
export function detectSERPIntent(
  content: string,
  keywords: string[]
): SERPIntentAnalysis {
  const text = stripHtml(content).toLowerCase();
  const allText = text + ' ' + keywords.join(' ').toLowerCase();
  
  // Intent signals
  const intentSignals = {
    informational: [
      'what', 'why', 'how', 'guide', 'tutorial', 'learn', 'understand',
      'definition', 'meaning', 'explain', 'tips', 'ways', 'steps'
    ],
    navigational: [
      'login', 'sign in', 'official', 'website', 'homepage', 'contact',
      'about', 'careers', 'support'
    ],
    transactional: [
      'buy', 'purchase', 'order', 'price', 'cost', 'discount', 'deal',
      'coupon', 'shipping', 'delivery', 'cart', 'checkout'
    ],
    commercial_investigation: [
      'best', 'top', 'review', 'comparison', 'vs', 'alternative',
      'recommendation', 'versus', 'compare', 'rating'
    ]
  };
  
  // Count signals for each intent
  const scores: Record<SERPIntent, number> = {
    informational: 0,
    navigational: 0,
    transactional: 0,
    commercial_investigation: 0
  };
  
  const foundSignals: Record<SERPIntent, string[]> = {
    informational: [],
    navigational: [],
    transactional: [],
    commercial_investigation: []
  };
  
  Object.entries(intentSignals).forEach(([intent, signals]) => {
    signals.forEach(signal => {
      const regex = new RegExp(`\\b${signal}\\b`, 'gi');
      const matches = allText.match(regex);
      if (matches) {
        scores[intent as SERPIntent] += matches.length;
        if (!foundSignals[intent as SERPIntent].includes(signal)) {
          foundSignals[intent as SERPIntent].push(signal);
        }
      }
    });
  });
  
  // Determine primary intent
  let primaryIntent: SERPIntent = 'informational';
  let maxScore = 0;
  
  Object.entries(scores).forEach(([intent, score]) => {
    if (score > maxScore) {
      maxScore = score;
      primaryIntent = intent as SERPIntent;
    }
  });
  
  // Calculate confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? (maxScore / totalScore) * 100 : 0;
  
  // Generate recommendations
  const recommendations = generateIntentRecommendations(primaryIntent, content);
  
  return {
    primaryIntent,
    confidence,
    signals: foundSignals[primaryIntent],
    recommendations
  };
}

/**
 * Generate recommendations based on intent
 */
function generateIntentRecommendations(
  intent: SERPIntent,
  content: string
): string[] {
  const recommendations: string[] = [];
  
  switch (intent) {
    case 'informational':
      recommendations.push(
        'Include clear headings (H2/H3) for easy scanning',
        'Add examples and explanations',
        'Use bullet points for key takeaways',
        'Consider adding a FAQ section'
      );
      break;
      
    case 'transactional':
      recommendations.push(
        'Add clear CTAs (Call-to-Actions)',
        'Include pricing information',
        'Highlight product benefits',
        'Add trust signals (reviews, guarantees)'
      );
      break;
      
    case 'commercial_investigation':
      recommendations.push(
        'Include comparison tables',
        'Add pros and cons sections',
        'Provide detailed feature analysis',
        'Include user reviews or ratings'
      );
      break;
      
    case 'navigational':
      recommendations.push(
        'Ensure clear navigation links',
        'Add contact information',
        'Include site structure/sitemap',
        'Optimize for brand name searches'
      );
      break;
  }
  
  return recommendations;
}

// ============================================================================
// KEYWORD PLACEMENT ANALYSIS
// ============================================================================

export interface KeywordPlacementScore {
  inTitle: boolean;
  inFirstParagraph: boolean;
  inHeadings: boolean;
  inMetaDescription: boolean;
  inURL: boolean;
  score: number;
  maxScore: number;
  recommendations: string[];
}

/**
 * Analyze keyword placement in strategic locations
 */
export function analyzeKeywordPlacement(
  content: string,
  keyword: string,
  metaTitle?: string,
  metaDescription?: string,
  url?: string
): KeywordPlacementScore {
  const keywordLower = keyword.toLowerCase();
  const text = stripHtml(content).toLowerCase();
  
  // Extract first paragraph
  const paragraphs = text.split(/\n\n+/);
  const firstParagraph = paragraphs[0] || '';
  
  // Extract headings
  const headings = extractHeadings(content);
  const headingsText = headings.map(h => h.text.toLowerCase()).join(' ');
  
  // Check placements
  const inTitle = metaTitle?.toLowerCase().includes(keywordLower) || false;
  const inFirstParagraph = firstParagraph.includes(keywordLower);
  const inHeadings = headingsText.includes(keywordLower);
  const inMetaDescription = metaDescription?.toLowerCase().includes(keywordLower) || false;
  const inURL = url?.toLowerCase().includes(keywordLower.replace(/\s+/g, '-')) || false;
  
  // Calculate score
  let score = 0;
  const maxScore = 5;
  
  if (inTitle) score++;
  if (inFirstParagraph) score++;
  if (inHeadings) score++;
  if (inMetaDescription) score++;
  if (inURL) score++;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!inTitle) {
    recommendations.push('Add your primary keyword to the meta title');
  }
  if (!inFirstParagraph) {
    recommendations.push('Include your keyword in the first paragraph (introduction)');
  }
  if (!inHeadings) {
    recommendations.push('Use your keyword in at least one heading (H2 or H3)');
  }
  if (!inMetaDescription) {
    recommendations.push('Include your keyword in the meta description');
  }
  if (!inURL) {
    recommendations.push('Add your keyword to the URL slug');
  }
  
  return {
    inTitle,
    inFirstParagraph,
    inHeadings,
    inMetaDescription,
    inURL,
    score,
    maxScore,
    recommendations
  };
}

/**
 * Extract headings from HTML content
 */
function extractHeadings(htmlContent: string): Array<{level: number, text: string}> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const headings: Array<{level: number, text: string}> = [];
  
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag, index) => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach(el => {
      headings.push({
        level: index + 1,
        text: el.textContent || ''
      });
    });
  });
  
  return headings;
}

// ============================================================================
// REAL-TIME FEEDBACK
// ============================================================================

export interface RealTimeFeedback {
  wordCount: number;
  readingTime: number;
  keywordDensity: number;
  readabilityScore: number;
  seoScore: number;
  warnings: string[];
  suggestions: string[];
}

/**
 * Get comprehensive real-time feedback
 */
export function getRealTimeFeedback(
  content: string,
  primaryKeyword: string,
  metaTitle?: string,
  metaDescription?: string
): RealTimeFeedback {
  const wordCount = countWords(content);
  const readingTime = estimateReadingTime(wordCount);
  
  const text = stripHtml(content).toLowerCase();
  const keywordCount = (text.match(new RegExp(`\\b${primaryKeyword.toLowerCase()}\\b`, 'g')) || []).length;
  const keywordDensity = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Word count check
  if (wordCount < 300) {
    warnings.push('Content is too short. Aim for at least 300 words for better SEO.');
  }
  
  // Keyword density check
  if (keywordDensity < 0.8) {
    warnings.push(`Low keyword density (${keywordDensity.toFixed(2)}%). Add more instances of "${primaryKeyword}".`);
  } else if (keywordDensity > 2.5) {
    warnings.push(`High keyword density (${keywordDensity.toFixed(2)}%). Reduce keyword usage to avoid stuffing.`);
  }
  
  // Meta title check
  if (!metaTitle || metaTitle.length < 50) {
    warnings.push('Meta title is too short. Aim for 50-60 characters.');
  } else if (metaTitle.length > 60) {
    warnings.push('Meta title is too long. Keep it under 60 characters.');
  }
  
  // Meta description check
  if (!metaDescription || metaDescription.length < 150) {
    warnings.push('Meta description is too short. Aim for 150-160 characters.');
  } else if (metaDescription.length > 160) {
    warnings.push('Meta description is too long. Keep it under 160 characters.');
  }
  
  // Add suggestions
  if (wordCount > 0) {
    suggestions.push('Use headings (H2, H3) to break up your content');
    suggestions.push('Add internal links to related content');
    suggestions.push('Include images with alt text');
  }
  
  return {
    wordCount,
    readingTime,
    keywordDensity,
    readabilityScore: 0, // Will be calculated separately
    seoScore: 0, // Will be calculated separately
    warnings,
    suggestions
  };
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export {
  // From original seo-utils
  stripHtml,
  countWords,
  estimateReadingTime
};
