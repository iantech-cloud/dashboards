// app/blog/[slug]/BlogContent.tsx - OPTIMIZED VERSION
'use client';

import { useEffect, useRef } from 'react';

interface BlogContentProps {
  content: string;
}

export default function BlogContent({ content }: BlogContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const mathJaxInitialized = useRef(false);

  useEffect(() => {
    const initMathJax = async () => {
      if (typeof window === 'undefined' || mathJaxInitialized.current) return;

      // Check if content contains math elements before loading MathJax
      const hasMath = content.includes('\\(') || 
                     content.includes('\\[') || 
                     content.includes('$$') ||
                     content.includes('&lt;math') ||
                     content.includes('<math');

      if (!hasMath) return;

      try {
        if (!window.MathJax) {
          // Load MathJax only if needed
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          // Configure MathJax
          window.MathJax = {
            startup: {
              typeset: false,
              pageReady: () => {
                return Promise.resolve();
              }
            },
            tex: {
              inlineMath: [['\\(', '\\)']],
              displayMath: [['\\[', '\\]']],
              processEscapes: true,
            },
            options: {
              skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
            },
            svg: {
              fontCache: 'global'
            }
          };
        }

        mathJaxInitialized.current = true;

        // Typeset with debounce
        const timer = setTimeout(() => {
          if (window.MathJax?.typesetPromise && contentRef.current) {
            window.MathJax.typesetPromise([contentRef.current]).catch((err) => {
              console.warn('MathJax rendering error:', err);
            });
          }
        }, 150);

        return () => clearTimeout(timer);
      } catch (error) {
        console.warn('MathJax loading failed:', error);
      }
    };

    initMathJax();
  }, [content]);

  // Optimize images in content
  const optimizedContent = content.replace(
    /<img([^>]*)src="([^"]*)"([^>]*)>/g,
    (match, before, src, after) => {
      // Add loading lazy and basic attributes
      return `<img${before}src="${src}"${after} loading="lazy" decoding="async">`;
    }
  );

  return (
    <>
      <div 
        ref={contentRef}
        className="blog-content-wrapper"
        dangerouslySetInnerHTML={{ __html: optimizedContent }}
      />
      
      <style jsx global>{`
        .blog-content-wrapper {
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.7;
          color: #374151;
          font-size: 1.0625rem;
        }

        /* ===== PERFORMANCE OPTIMIZATIONS ===== */
        .blog-content-wrapper {
          content-visibility: auto;
          contain-intrinsic-size: 1000px;
        }

        .blog-content-wrapper img {
          content-visibility: auto;
        }

        /* ===== HEADINGS ===== */
        .blog-content-wrapper h1,
        .blog-content-wrapper h2,
        .blog-content-wrapper h3,
        .blog-content-wrapper h4,
        .blog-content-wrapper h5,
        .blog-content-wrapper h6 {
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #111827;
          line-height: 1.3;
          scroll-margin-top: 80px;
        }

        .blog-content-wrapper h1 { 
          font-size: 2.25rem;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }
        .blog-content-wrapper h2 { 
          font-size: 1.875rem;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 0.25rem;
        }
        .blog-content-wrapper h3 { font-size: 1.5rem; }
        .blog-content-wrapper h4 { font-size: 1.25rem; }
        .blog-content-wrapper h5 { font-size: 1.125rem; }
        .blog-content-wrapper h6 { font-size: 1rem; color: #6b7280; }

        /* ===== PARAGRAPHS & TEXT ===== */
        .blog-content-wrapper p {
          margin-bottom: 1.25rem;
          color: #374151;
        }

        .blog-content-wrapper strong {
          font-weight: 600;
          color: #111827;
        }

        .blog-content-wrapper em {
          font-style: italic;
          color: #6b7280;
        }

        /* Bold text in lists */
        .blog-content-wrapper li strong {
          font-weight: 700;
          color: #111827;
        }

        /* ===== LISTS - OPTIMIZED ===== */
        .blog-content-wrapper ul,
        .blog-content-wrapper ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .blog-content-wrapper ul {
          list-style-type: disc;
        }

        .blog-content-wrapper ul > li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .blog-content-wrapper ol {
          list-style-type: decimal;
        }

        .blog-content-wrapper ol > li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        /* Nested lists */
        .blog-content-wrapper ul ul,
        .blog-content-wrapper ol ul {
          margin: 0.25rem 0;
          list-style-type: circle;
        }

        .blog-content-wrapper ol ol {
          list-style-type: lower-alpha;
        }

        /* ===== IMAGES - OPTIMIZED ===== */
        .blog-content-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
          background: #f9fafb;
        }

        .blog-content-wrapper picture {
          display: block;
          margin: 1.5rem 0;
        }

        /* ===== LINKS - OPTIMIZED ===== */
        .blog-content-wrapper a {
          color: #2563eb;
          text-decoration: none;
          border-bottom: 1px solid #dbeafe;
          transition: color 0.2s ease;
          font-weight: 500;
        }

        .blog-content-wrapper a:hover {
          color: #1d4ed8;
          border-bottom-color: #2563eb;
        }

        .blog-content-wrapper a.affiliate-link {
          color: #dc2626;
          font-weight: 600;
          background: #fef2f2;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          border-bottom: none;
        }

        /* ===== BLOCKQUOTE - OPTIMIZED ===== */
        .blog-content-wrapper blockquote {
          border-left: 4px solid #e5e7eb;
          padding: 1rem 1.25rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 0.375rem;
        }

        .blog-content-wrapper blockquote p:last-child {
          margin-bottom: 0;
        }

        /* ===== CODE - OPTIMIZED ===== */
        .blog-content-wrapper code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 0.875em;
          color: #111827;
          border: 1px solid #e5e7eb;
        }

        .blog-content-wrapper pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1.25rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1.5rem 0;
          line-height: 1.5;
          border: 1px solid #374151;
        }

        .blog-content-wrapper pre code {
          background: transparent;
          padding: 0;
          color: inherit;
          border: none;
        }

        /* ===== TABLES - OPTIMIZED ===== */
        .blog-content-wrapper table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .blog-content-wrapper th,
        .blog-content-wrapper td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: left;
        }

        .blog-content-wrapper th {
          background: #f9fafb;
          font-weight: 600;
          color: #111827;
        }

        .blog-content-wrapper tbody tr:nth-child(even) {
          background: #f9fafb;
        }

        /* ===== PRODUCT REVIEW BOX - OPTIMIZED ===== */
        .blog-content-wrapper .product-review-box {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin: 1.5rem 0;
          background: #f9fafb;
        }

        .blog-content-wrapper .product-review-box h3 {
          margin-top: 0;
          color: #111827;
        }

        .blog-content-wrapper .review-rating {
          font-size: 1.125em;
          margin: 1rem 0;
          padding: 0.75rem;
          background: white;
          border-left: 4px solid #f59e0b;
          font-weight: 600;
          color: #92400e;
        }

        .blog-content-wrapper .review-verdict {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-left: 4px solid #2563eb;
          border-radius: 0.5rem;
        }

        /* ===== MATH EQUATIONS - OPTIMIZED ===== */
        .blog-content-wrapper .math-equation {
          display: inline-block;
          padding: 0.5rem 0.75rem;
          margin: 0.25rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          font-family: 'Times New Roman', serif;
        }

        .blog-content-wrapper .math-equation[data-type="display"] {
          display: block;
          margin: 1.5rem auto;
          padding: 1rem;
          text-align: center;
          background: #f9fafb;
          border-left: 4px solid #2563eb;
          border-radius: 0.5rem;
          max-width: 100%;
        }

        /* MathJax styling */
        .blog-content-wrapper mjx-container {
          display: inline !important;
        }

        .blog-content-wrapper mjx-container[display="true"] {
          display: block !important;
          text-align: center;
          margin: 1.5rem auto;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          overflow-x: auto;
        }

        /* ===== VIDEO/IFRAME - OPTIMIZED ===== */
        .blog-content-wrapper iframe {
          max-width: 100%;
          height: auto;
          min-height: 300px;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
          border: 1px solid #e5e7eb;
        }

        /* ===== HORIZONTAL RULE ===== */
        .blog-content-wrapper hr {
          border: none;
          height: 1px;
          background: #e5e7eb;
          margin: 2rem 0;
        }

        /* ===== SPECIAL ELEMENTS ===== */
        .blog-content-wrapper .callout {
          padding: 1rem 1.25rem;
          margin: 1.25rem 0;
          border-radius: 0.5rem;
          border-left: 4px solid;
        }

        .blog-content-wrapper .callout.info {
          background: #eff6ff;
          border-left-color: #2563eb;
          color: #1e40af;
        }

        .blog-content-wrapper .callout.warning {
          background: #fffbeb;
          border-left-color: #f59e0b;
          color: #92400e;
        }

        .blog-content-wrapper .callout.success {
          background: #f0fdf4;
          border-left-color: #10b981;
          color: #065f46;
        }

        .blog-content-wrapper .callout.danger {
          background: #fef2f2;
          border-left-color: #ef4444;
          color: #991b1b;
        }

        /* Keyboard keys */
        .blog-content-wrapper kbd {
          display: inline-block;
          padding: 0.125rem 0.375rem;
          font-size: 0.75em;
          font-family: 'Courier New', monospace;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.25rem;
          font-weight: 600;
        }

        /* ===== RESPONSIVE DESIGN ===== */
        @media (max-width: 768px) {
          .blog-content-wrapper {
            font-size: 1rem;
            line-height: 1.6;
          }

          .blog-content-wrapper h1 { 
            font-size: 1.75rem;
          }
          .blog-content-wrapper h2 { 
            font-size: 1.5rem;
          }
          .blog-content-wrapper h3 { 
            font-size: 1.25rem;
          }
          
          .blog-content-wrapper pre {
            padding: 1rem;
            font-size: 0.875rem;
          }
          
          .blog-content-wrapper table {
            font-size: 0.875rem;
          }
          
          .blog-content-wrapper th,
          .blog-content-wrapper td {
            padding: 0.5rem;
          }

          .blog-content-wrapper .product-review-box {
            padding: 1rem;
          }

          .blog-content-wrapper iframe {
            min-height: 200px;
          }

          .blog-content-wrapper ul,
          .blog-content-wrapper ol {
            padding-left: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .blog-content-wrapper {
            font-size: 0.9375rem;
          }

          .blog-content-wrapper h1 { font-size: 1.5rem; }
          .blog-content-wrapper h2 { font-size: 1.375rem; }
          .blog-content-wrapper h3 { font-size: 1.25rem; }

          .blog-content-wrapper pre {
            padding: 0.75rem;
            font-size: 0.8125rem;
          }
        }

        /* ===== PRINT STYLES ===== */
        @media print {
          .blog-content-wrapper {
            color: #000;
            font-size: 12pt;
            line-height: 1.4;
          }

          .blog-content-wrapper h1,
          .blog-content-wrapper h2,
          .blog-content-wrapper h3,
          .blog-content-wrapper h4,
          .blog-content-wrapper h5,
          .blog-content-wrapper h6 {
            color: #000;
            page-break-after: avoid;
          }

          .blog-content-wrapper img {
            max-width: 100% !important;
            page-break-inside: avoid;
          }

          .blog-content-wrapper pre,
          .blog-content-wrapper blockquote {
            page-break-inside: avoid;
          }

          .blog-content-wrapper a {
            color: #000;
            text-decoration: underline;
          }
        }

        /* ===== REDUCED MOTION SUPPORT ===== */
        @media (prefers-reduced-motion: reduce) {
          .blog-content-wrapper * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* ===== DARK MODE SUPPORT ===== */
        @media (prefers-color-scheme: dark) {
          .blog-content-wrapper {
            color: #d1d5db;
          }

          .blog-content-wrapper h1,
          .blog-content-wrapper h2,
          .blog-content-wrapper h3,
          .blog-content-wrapper h4,
          .blog-content-wrapper h5,
          .blog-content-wrapper h6 {
            color: #f9fafb;
          }

          .blog-content-wrapper code {
            background: #374151;
            color: #f9fafb;
            border-color: #4b5563;
          }

          .blog-content-wrapper blockquote {
            background: #374151;
            border-color: #4b5563;
            color: #d1d5db;
          }

          .blog-content-wrapper table {
            border-color: #4b5563;
          }

          .blog-content-wrapper th,
          .blog-content-wrapper td {
            border-color: #4b5563;
          }

          .blog-content-wrapper th {
            background: #374151;
            color: #f9fafb;
          }

          .blog-content-wrapper tbody tr:nth-child(even) {
            background: #374151;
          }
        }
      `}</style>
    </>
  );
}
