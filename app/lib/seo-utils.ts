// app/lib/seo-utils.ts

export interface KeywordAnalysis {
  keyword: string;
  density: number;
  count: number;
  isOptimal: boolean;
  warning?: string;
}

export interface ReadabilityScore {
  fleschScore: number;
  grade: string;
  averageSentenceLength: number;
  longSentences: number;
  passiveVoiceCount: number;
  complexWords: string[];
}

export interface SEOScore {
  overall: number;
  keyword: number;
  readability: number;
  structure: number;
  meta: number;
  links: number;
}

export interface ContentStructure {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  properNesting: boolean;
  issues: string[];
  outline: HeadingNode[];
}

export interface HeadingNode {
  level: number;
  text: string;
  id: string;
}

// ============================================================================
// KEYWORD ANALYSIS
// ============================================================================

export function analyzeKeywords(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[] = []
): KeywordAnalysis[] {
  const text = stripHtml(content).toLowerCase();
  const wordCount = text.split(/\s+/).length;
  
  const results: KeywordAnalysis[] = [];
  
  // Analyze primary keyword
  if (primaryKeyword) {
    const keyword = primaryKeyword.toLowerCase();
    const count = countOccurrences(text, keyword);
    const density = (count / wordCount) * 100;
    
    results.push({
      keyword: primaryKeyword,
      density: Math.round(density * 100) / 100,
      count,
      isOptimal: density >= 0.8 && density <= 2.0,
      warning: density < 0.8 
        ? 'Keyword density too low - use keyword more naturally' 
        : density > 2.0 
        ? 'Keyword stuffing detected - reduce keyword usage' 
        : undefined
    });
  }
  
  // Analyze secondary keywords
  secondaryKeywords.forEach(kw => {
    if (kw.trim()) {
      const keyword = kw.toLowerCase();
      const count = countOccurrences(text, keyword);
      const density = (count / wordCount) * 100;
      
      results.push({
        keyword: kw,
        density: Math.round(density * 100) / 100,
        count,
        isOptimal: density >= 0.5 && density <= 1.5,
        warning: density < 0.5 
          ? 'Consider using this keyword more' 
          : density > 1.5 
          ? 'Too many uses - reduce frequency' 
          : undefined
      });
    }
  });
  
  return results;
}

function countOccurrences(text: string, keyword: string): number {
  const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
  return (text.match(regex) || []).length;
}

// ============================================================================
// READABILITY ANALYSIS
// ============================================================================

export function analyzeReadability(content: string): ReadabilityScore {
  const text = stripHtml(content);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = countSyllables(text);
  
  // Flesch Reading Ease
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  
  // Long sentences (>20 words)
  const longSentences = sentences.filter(s => 
    s.split(/\s+/).length > 20
  ).length;
  
  // Passive voice detection
  const passiveVoiceCount = detectPassiveVoice(sentences);
  
  // Complex words (>3 syllables)
  const complexWords = words.filter(w => 
    countWordSyllables(w) > 3
  ).slice(0, 10); // Return first 10
  
  // Grade level
  let grade = 'College';
  if (fleschScore >= 90) grade = 'Very Easy (5th grade)';
  else if (fleschScore >= 80) grade = 'Easy (6th grade)';
  else if (fleschScore >= 70) grade = 'Fairly Easy (7th grade)';
  else if (fleschScore >= 60) grade = 'Standard (8th-9th grade)';
  else if (fleschScore >= 50) grade = 'Fairly Difficult (10th-12th grade)';
  else if (fleschScore >= 30) grade = 'Difficult (College)';
  else grade = 'Very Difficult (College Graduate)';
  
  return {
    fleschScore: Math.max(0, Math.min(100, Math.round(fleschScore))),
    grade,
    averageSentenceLength: Math.round(avgWordsPerSentence * 10) / 10,
    longSentences,
    passiveVoiceCount,
    complexWords: complexWords.slice(0, 5) // Limit to 5 examples
  };
}

function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  return words.reduce((sum, word) => sum + countWordSyllables(word), 0);
}

function countWordSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

function detectPassiveVoice(sentences: string[]): number {
  const passiveIndicators = /\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/gi;
  return sentences.filter(s => passiveIndicators.test(s)).length;
}

// ============================================================================
// CONTENT STRUCTURE ANALYSIS
// ============================================================================

export function analyzeStructure(htmlContent: string): ContentStructure {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const h1s = Array.from(doc.querySelectorAll('h1'));
  const h2s = Array.from(doc.querySelectorAll('h2'));
  const h3s = Array.from(doc.querySelectorAll('h3'));
  
  const issues: string[] = [];
  
  // Check H1 count
  if (h1s.length === 0) {
    issues.push('Missing H1 heading - add a main title');
  } else if (h1s.length > 1) {
    issues.push('Multiple H1 headings found - use only one H1');
  }
  
  // Check heading hierarchy
  const allHeadings = [
    ...h1s.map(h => ({ level: 1, element: h })),
    ...h2s.map(h => ({ level: 2, element: h })),
    ...h3s.map(h => ({ level: 3, element: h }))
  ].sort((a, b) => {
    const aPos = Array.from(doc.body.childNodes).indexOf(a.element as ChildNode);
    const bPos = Array.from(doc.body.childNodes).indexOf(b.element as ChildNode);
    return aPos - bPos;
  });
  
  let properNesting = true;
  for (let i = 1; i < allHeadings.length; i++) {
    if (allHeadings[i].level - allHeadings[i - 1].level > 1) {
      properNesting = false;
      issues.push(`Heading hierarchy skip: H${allHeadings[i - 1].level} → H${allHeadings[i].level}`);
    }
  }
  
  // Generate outline
  const outline: HeadingNode[] = allHeadings.map((h, i) => ({
    level: h.level,
    text: h.element.textContent || '',
    id: `heading-${i}`
  }));
  
  return {
    h1Count: h1s.length,
    h2Count: h2s.length,
    h3Count: h3s.length,
    properNesting,
    issues,
    outline
  };
}

// ============================================================================
// SEO SCORING
// ============================================================================

export function calculateSEOScore(
  content: string,
  metaTitle: string,
  metaDescription: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): SEOScore {
  const keywordAnalysis = analyzeKeywords(content, primaryKeyword, secondaryKeywords);
  const readability = analyzeReadability(content);
  const structure = analyzeStructure(content);
  
  // Keyword score (40 points)
  const keywordScore = keywordAnalysis[0]?.isOptimal ? 40 : 
    keywordAnalysis[0]?.density < 0.8 ? 20 : 10;
  
  // Readability score (20 points)
  const readabilityScore = readability.fleschScore >= 60 ? 20 :
    readability.fleschScore >= 50 ? 15 : 10;
  
  // Structure score (20 points)
  const structureScore = structure.h1Count === 1 && structure.properNesting ? 20 : 10;
  
  // Meta score (20 points)
  let metaScore = 0;
  if (metaTitle.length >= 50 && metaTitle.length <= 60) metaScore += 10;
  if (metaDescription.length >= 150 && metaDescription.length <= 160) metaScore += 10;
  
  const overall = keywordScore + readabilityScore + structureScore + metaScore;
  
  return {
    overall,
    keyword: keywordScore,
    readability: readabilityScore,
    structure: structureScore,
    meta: metaScore,
    links: 0 // Will be calculated separately
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function countWords(text: string): number {
  return stripHtml(text).split(/\s+/).filter(w => w.length > 0).length;
}

export function estimateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 200); // 200 words per minute
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// For client-side use
export const clientSideUtils = {
  stripHtml,
  countWords,
  estimateReadingTime,
  generateSlug
};
