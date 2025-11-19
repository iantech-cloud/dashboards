// app/blog/[slug]/BlogContentWithTOC.tsx
'use client';

import { useEffect, useState, useRef, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import BlogContent from './BlogContent';

// Dynamically import TOC with no SSR to improve initial load
const TableOfContents = dynamic(() => import('./TableOfContents'), {
  ssr: false,
  loading: () => (
    <div className="toc-skeleton">
      <div className="skeleton-header"></div>
      <div className="skeleton-content"></div>
      <style jsx>{`
        .toc-skeleton {
          margin: 2.5rem 0;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px solid #bae6fd;
          border-radius: 1rem;
          overflow: hidden;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skeleton-header {
          height: 4rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }
        .skeleton-content {
          height: 8rem;
          padding: 1.5rem;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  ),
});

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface BlogContentWithTOCProps {
  content: string;
}

// Memoize the content processor to avoid re-processing on every render
const BlogContentWithTOC = memo(function BlogContentWithTOC({ content }: BlogContentWithTOCProps) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [processedContent, setProcessedContent] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  // Generate slug from heading text
  const generateSlug = useMemo(() => {
    return (text: string, index: number): string => {
      let slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();

      slug = slug || `heading-${index}`;
      return slug;
    };
  }, []);

  // Process content once on mount or when content changes
  useEffect(() => {
    if (!content || processingRef.current) return;
    
    processingRef.current = true;
    setIsMounted(true);

    // Use requestIdleCallback for non-blocking processing
    const processContent = () => {
      try {
        // Parse HTML content
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        // Find all h2, h3, h4 elements
        const headingElements = doc.querySelectorAll('h2, h3, h4');
        const extractedHeadings: TOCItem[] = [];
        const usedIds = new Set<string>();

        headingElements.forEach((heading, index) => {
          const level = parseInt(heading.tagName.substring(1));
          let text = heading.textContent || '';
          
          // Clean up text - remove extra whitespace and math symbols
          text = text
            .replace(/\s+/g, ' ')
            .replace(/[\\${}[\]]/g, '') // Remove LaTeX symbols
            .trim();
          
          // Skip empty headings
          if (!text || text.length < 2) return;

          // Generate unique ID
          let id = heading.id || generateSlug(text, index);
          
          // Ensure ID is unique
          let counter = 1;
          let uniqueId = id;
          while (usedIds.has(uniqueId)) {
            uniqueId = `${id}-${counter}`;
            counter++;
          }
          id = uniqueId;
          usedIds.add(id);

          // Set ID on heading element
          heading.id = id;

          // Add scroll margin and data attribute for better tracking
          heading.setAttribute('style', 'scroll-margin-top: 100px; scroll-snap-align: start;');
          heading.setAttribute('data-toc-heading', 'true');

          extractedHeadings.push({
            id,
            text,
            level,
          });
        });

        setHeadings(extractedHeadings);

        // Inject TOC before first H2 if headings exist
        if (extractedHeadings.length > 0) {
          const firstH2 = doc.querySelector('h2');
          
          if (firstH2) {
            // Create TOC placeholder div
            const tocPlaceholder = doc.createElement('div');
            tocPlaceholder.id = 'toc-placeholder';
            tocPlaceholder.setAttribute('data-toc', 'true');
            tocPlaceholder.setAttribute('role', 'navigation');
            tocPlaceholder.setAttribute('aria-label', 'Table of contents');
            
            // Insert TOC placeholder before first H2
            firstH2.parentNode?.insertBefore(tocPlaceholder, firstH2);
          }
        }

        // Serialize back to HTML
        const serialized = doc.body.innerHTML;
        setProcessedContent(serialized);
        
      } catch (error) {
        console.error('Error processing blog content:', error);
        // Fallback to original content
        setProcessedContent(content);
      } finally {
        processingRef.current = false;
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(processContent, { timeout: 2000 });
    } else {
      setTimeout(processContent, 0);
    }

  }, [content, generateSlug]);

  // Handle MathJax rendering after content is mounted - debounced
  useEffect(() => {
    if (!isMounted || !contentRef.current || !processedContent) return;

    const timer = setTimeout(() => {
      if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise([contentRef.current]).catch((err: any) => {
          console.warn('MathJax rendering error:', err);
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [processedContent, isMounted]);

  // Prefetch resources on idle
  useEffect(() => {
    if (!isMounted) return;

    const prefetchResources = () => {
      // Prefetch any images in the content
      const images = contentRef.current?.querySelectorAll('img[data-src]');
      images?.forEach((img) => {
        const src = img.getAttribute('data-src');
        if (src) {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = src;
          document.head.appendChild(link);
        }
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetchResources);
    }
  }, [isMounted]);

  return (
    <div className="blog-content-with-toc" ref={contentRef}>
      {/* Render content with placeholder */}
      <BlogContent content={processedContent || content} />
      
      {/* Inject TOC into placeholder using portal */}
      {isMounted && headings.length > 0 && (
        <TOCPortal headings={headings} />
      )}
    </div>
  );
});

// Optimized portal component with lazy rendering
const TOCPortal = memo(function TOCPortal({ headings }: { headings: TOCItem[] }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Find placeholder with retries
    let attempts = 0;
    const maxAttempts = 10;
    
    const findPlaceholder = () => {
      const placeholder = document.getElementById('toc-placeholder');
      if (placeholder) {
        setContainer(placeholder);
        setIsReady(true);
        return true;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(findPlaceholder, 100);
      }
      return false;
    };

    findPlaceholder();
  }, []);

  if (!container || !isReady) return null;

  // Use React Portal
  const ReactDOM = require('react-dom');
  return ReactDOM.createPortal(
    <TableOfContents headings={headings} />,
    container
  );
});

export default BlogContentWithTOC;
