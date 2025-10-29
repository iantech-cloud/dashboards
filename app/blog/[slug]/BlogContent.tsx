// app/blog/[slug]/BlogContent.tsx
'use client';

import { useEffect, useRef } from 'react';

interface BlogContentProps {
  content: string;
}

export default function BlogContent({ content }: BlogContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger MathJax rendering when component mounts or content changes
    if (typeof window !== 'undefined' && window.MathJax) {
      // Wait a bit for DOM to be ready
      const timer = setTimeout(() => {
        if (window.MathJax.typesetPromise && contentRef.current) {
          window.MathJax.typesetPromise([contentRef.current]).catch((err: any) => {
            console.warn('MathJax rendering error:', err);
          });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [content]);

  return (
    <>
      <div 
        ref={contentRef}
        className="blog-content-wrapper tex2jax_process"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      
      <style jsx global>{`
        .blog-content-wrapper {
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.75;
          color: #374151;
        }

        .blog-content-wrapper h1,
        .blog-content-wrapper h2,
        .blog-content-wrapper h3,
        .blog-content-wrapper h4,
        .blog-content-wrapper h5,
        .blog-content-wrapper h6 {
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #111827;
          line-height: 1.3;
        }

        .blog-content-wrapper h1 { font-size: 2.25rem; }
        .blog-content-wrapper h2 { font-size: 1.875rem; }
        .blog-content-wrapper h3 { font-size: 1.5rem; }
        .blog-content-wrapper h4 { font-size: 1.25rem; }

        .blog-content-wrapper p {
          margin-bottom: 1rem;
        }

        .blog-content-wrapper ul,
        .blog-content-wrapper ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .blog-content-wrapper ul {
          list-style-type: disc;
        }

        .blog-content-wrapper ol {
          list-style-type: decimal;
        }

        .blog-content-wrapper li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .blog-content-wrapper ul ul,
        .blog-content-wrapper ol ol {
          margin: 0.5rem 0;
        }

        .blog-content-wrapper ul ul {
          list-style-type: circle;
        }

        .blog-content-wrapper ol ol {
          list-style-type: lower-alpha;
        }

        .blog-content-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .blog-content-wrapper picture img {
          margin: 1.5rem 0;
        }

        .blog-content-wrapper a {
          color: #2563eb;
          text-decoration: underline;
          word-break: break-word;
        }

        .blog-content-wrapper a:hover {
          color: #1d4ed8;
        }

        .blog-content-wrapper a.affiliate-link {
          color: #dc2626;
          font-weight: 600;
        }

        .blog-content-wrapper a.affiliate-link::after {
          content: ' 🔗';
          font-size: 0.85em;
          margin-left: 2px;
        }

        .blog-content-wrapper blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1.5rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #6b7280;
        }

        .blog-content-wrapper code {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #1f2937;
        }

        .blog-content-wrapper pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1.5rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.5rem 0;
          line-height: 1.4;
        }

        .blog-content-wrapper pre code {
          background: transparent;
          padding: 0;
          color: inherit;
        }

        .blog-content-wrapper table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
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
          color: #1f2937;
        }

        .blog-content-wrapper tr:nth-child(even) {
          background: #f9fafb;
        }

        .blog-content-wrapper .product-review-box {
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1.5rem 0;
          background: #f0f9ff;
          page-break-inside: avoid;
        }

        .blog-content-wrapper .product-review-box h3 {
          margin-top: 0;
          color: #1e40af;
        }

        .blog-content-wrapper .product-review-box h4 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .blog-content-wrapper .review-rating {
          font-size: 1.1em;
          margin: 1rem 0;
        }

        .blog-content-wrapper .review-section ul {
          margin: 0.5rem 0;
        }

        .blog-content-wrapper .review-verdict {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
        }

        /* Enhanced Math equation styling */
        .blog-content-wrapper .math-equation {
          display: inline-block;
          padding: 0.5rem 0.75rem;
          margin: 0.25rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 6px;
          font-family: 'Times New Roman', serif;
          transition: all 0.2s ease;
        }

        .blog-content-wrapper .math-equation:hover {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border-color: #7dd3fc;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
        }

        .blog-content-wrapper .math-equation[data-type="inline"] {
          display: inline;
          padding: 0.15rem 0.4rem;
          margin: 0 0.15rem;
          vertical-align: middle;
        }

        .blog-content-wrapper .math-equation[data-type="display"] {
          display: block;
          margin: 1.5rem auto;
          padding: 1.25rem;
          text-align: center;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-left: 4px solid #3b82f6;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
          max-width: 95%;
        }

        .blog-content-wrapper .math-equation[data-type="display"]:hover {
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        /* MathJax rendered content styling */
        .blog-content-wrapper mjx-container {
          display: inline !important;
          margin: 0 0.25em;
        }

        .blog-content-wrapper mjx-container[display="true"] {
          display: block !important;
          text-align: center;
          margin: 1.5rem auto;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .blog-content-wrapper mjx-container svg {
          max-width: 100%;
          height: auto;
        }

        /* Video styling */
        .blog-content-wrapper iframe {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        /* HR styling */
        .blog-content-wrapper hr {
          border: none;
          border-top: 2px solid #d1d5db;
          margin: 1.5rem 0;
        }

        /* Print styles */
        @media print {
          .blog-content-wrapper .math-equation {
            background: transparent;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  );
}
