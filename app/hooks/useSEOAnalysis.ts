// app/hooks/useSEOAnalysis.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  analyzeKeywords,
  analyzeReadability,
  analyzeStructure,
  calculateSEOScore,
  countWords,
  estimateReadingTime,
  type KeywordAnalysis,
  type ReadabilityScore,
  type ContentStructure,
  type SEOScore
} from '@/app/lib/seo-utils';

export interface SEOAnalysisState {
  keywords: KeywordAnalysis[];
  readability: ReadabilityScore | null;
  structure: ContentStructure | null;
  seoScore: SEOScore | null;
  wordCount: number;
  readingTime: number;
  isAnalyzing: boolean;
}

export function useSEOAnalysis(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[],
  metaTitle: string,
  metaDescription: string,
  contentTitle?: string // Add content title parameter
) {
  const [analysis, setAnalysis] = useState<SEOAnalysisState>({
    keywords: [],
    readability: null,
    structure: null,
    seoScore: null,
    wordCount: 0,
    readingTime: 0,
    isAnalyzing: false
  });

  const runAnalysis = useCallback(async () => {
    if (!content || content === '<p><br></p>') {
      setAnalysis({
        keywords: [],
        readability: null,
        structure: null,
        seoScore: null,
        wordCount: 0,
        readingTime: 0,
        isAnalyzing: false
      });
      return;
    }

    setAnalysis(prev => ({ ...prev, isAnalyzing: true }));

    try {
      // Combine title and content for analysis to treat title as H1
      const contentWithTitle = contentTitle 
        ? `<h1>${contentTitle}</h1>${content}`
        : content;

      // Run all analyses using content with title
      const keywordResults = analyzeKeywords(contentWithTitle, primaryKeyword, secondaryKeywords);
      const readabilityResults = analyzeReadability(contentWithTitle);
      const structureResults = analyzeStructure(contentWithTitle);
      const wordCount = countWords(contentWithTitle);
      const readingTime = estimateReadingTime(wordCount);
      const seoScore = calculateSEOScore(
        contentWithTitle,
        metaTitle,
        metaDescription,
        primaryKeyword,
        secondaryKeywords
      );

      setAnalysis({
        keywords: keywordResults,
        readability: readabilityResults,
        structure: structureResults,
        seoScore,
        wordCount,
        readingTime,
        isAnalyzing: false
      });
    } catch (error) {
      console.error('SEO Analysis error:', error);
      setAnalysis(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [content, contentTitle, primaryKeyword, secondaryKeywords, metaTitle, metaDescription]);

  // Debounced analysis - run 1 second after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      runAnalysis();
    }, 1000);

    return () => clearTimeout(timer);
  }, [runAnalysis]);

  return analysis;
}
