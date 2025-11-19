// app/blog/[slug]/BlogContent.tsx - UPDATED WITH TOC INTEGRATION
'use client';

import { useEffect, useRef } from 'react';

interface BlogContentProps {
  content: string;
}

export default function BlogContent({ content }: BlogContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add data attribute for TOC targeting
    if (contentRef.current) {
      contentRef.current.setAttribute('data-blog-content', 'true');
    }

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
          color: #475569;
        }

        /* ===== HEADINGS - UPDATED FOR TOC INTEGRATION ===== */
        .blog-content-wrapper h1,
        .blog-content-wrapper h2,
        .blog-content-wrapper h3,
        .blog-content-wrapper h4,
        .blog-content-wrapper h5,
        .blog-content-wrapper h6 {
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #0f172a;
          line-height: 1.3;
          background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          scroll-margin-top: 100px; /* Added for TOC smooth scrolling */
        }

        .blog-content-wrapper h1 { 
          font-size: 2.5rem;
          border-bottom: 2px solid #e0f2fe;
          padding-bottom: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .blog-content-wrapper h2 { 
          font-size: 2rem;
          border-bottom: 1px solid #f0f9ff;
          padding-bottom: 0.5rem;
          position: relative;
        }
        .blog-content-wrapper h3 { 
          font-size: 1.625rem;
          position: relative;
        }
        .blog-content-wrapper h4 { 
          font-size: 1.375rem;
          position: relative;
        }
        .blog-content-wrapper h5 { font-size: 1.125rem; }
        .blog-content-wrapper h6 { font-size: 1rem; }

        /* Add anchor indicators for headings */
        .blog-content-wrapper h2::before,
        .blog-content-wrapper h3::before,
        .blog-content-wrapper h4::before {
          content: '#';
          position: absolute;
          left: -1.5rem;
          opacity: 0;
          color: #3b82f6;
          font-weight: 400;
          transition: opacity 0.2s ease;
        }

        .blog-content-wrapper h2:hover::before,
        .blog-content-wrapper h3:hover::before,
        .blog-content-wrapper h4:hover::before {
          opacity: 1;
        }

        /* ===== PARAGRAPHS & TEXT ===== */
        .blog-content-wrapper p {
          margin-bottom: 1.25rem;
          color: #475569;
          font-size: 1.0625rem;
        }

        .blog-content-wrapper strong {
          font-weight: 600;
          color: #1e293b;
        }

        .blog-content-wrapper em {
          font-style: italic;
          color: #64748b;
        }

        /* Bold text in lists (like "Steps:", "How to start:") */
        .blog-content-wrapper li strong {
          font-weight: 700;
          color: #1e40af;
          font-size: 1.1em;
        }

        /* Regular bold text (not headings) should use normal color */
        .blog-content-wrapper li p strong,
        .blog-content-wrapper p strong {
          color: #1e293b;
          font-size: 1em;
        }

        /* ===== LISTS - FIXED FOR NESTED ITEMS ===== */
        .blog-content-wrapper ul,
        .blog-content-wrapper ol {
          margin: 1.25rem 0;
          padding-left: 0;
          color: #475569;
        }

        .blog-content-wrapper ul {
          list-style-type: none;
        }

        .blog-content-wrapper ul > li {
          position: relative;
          padding-left: 2rem;
          margin: 0.75rem 0;
          line-height: 1.7;
        }

        .blog-content-wrapper ul > li::before {
          content: "▸";
          color: #3b82f6;
          font-weight: bold;
          position: absolute;
          left: 0.5rem;
          top: 0;
        }

        .blog-content-wrapper ol {
          list-style-type: decimal;
          list-style-position: outside;
          padding-left: 2rem;
        }

        .blog-content-wrapper ol > li {
          padding-left: 0.5rem;
          margin: 0.75rem 0;
          line-height: 1.7;
        }

        /* Nested lists - Second level */
        .blog-content-wrapper ul ul,
        .blog-content-wrapper ol ul {
          margin: 0.5rem 0;
          padding-left: 2rem;
        }

        .blog-content-wrapper ul ul > li {
          padding-left: 2rem;
        }

        .blog-content-wrapper ul ul > li::before {
          content: "◦";
          color: #06b6d4;
          font-size: 1.2em;
          left: 0.5rem;
        }

        /* Nested lists - Third level */
        .blog-content-wrapper ul ul ul,
        .blog-content-wrapper ol ul ul {
          margin: 0.5rem 0;
          padding-left: 2rem;
        }

        .blog-content-wrapper ul ul ul > li::before {
          content: "▪";
          color: #0891b2;
          font-size: 0.8em;
          left: 0.5rem;
        }

        /* Ordered lists nesting */
        .blog-content-wrapper ol ol {
          list-style-type: lower-alpha;
          padding-left: 2rem;
        }
        
        .blog-content-wrapper ol ol ol {
          list-style-type: lower-roman;
        }
        
        /* Mixed nesting - ol inside ul */
        .blog-content-wrapper ul ol {
          list-style-type: decimal;
          padding-left: 2rem;
        }
        
        .blog-content-wrapper ul ol > li {
          padding-left: 0.5rem;
        }
        
        .blog-content-wrapper ul ol > li::before {
          content: none;
        }
        
        /* ol with ul inside */
        .blog-content-wrapper ol ul > li {
          padding-left: 2rem;
        }
        
        .blog-content-wrapper ol ul > li::before {
          content: "▸";
          color: #3b82f6;
          font-weight: bold;
          position: absolute;
          left: 0.5rem;
        }

        /* ===== IMAGES ===== */
        .blog-content-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 1rem;
          margin: 2rem 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .blog-content-wrapper img:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .blog-content-wrapper picture img {
          margin: 2rem 0;
        }

        /* ===== LINKS ===== */
        .blog-content-wrapper a {
          color: #2563eb;
          text-decoration: none;
          word-break: break-word;
          border-bottom: 2px solid #93c5fd;
          transition: all 0.2s ease;
          font-weight: 500;
          padding-bottom: 1px;
        }

        .blog-content-wrapper a:hover {
          color: #1e40af;
          border-bottom-color: #2563eb;
          background-color: #dbeafe;
        }

        /* Make sure links in paragraphs are visible */
        .blog-content-wrapper p a,
        .blog-content-wrapper li a,
        .blog-content-wrapper td a,
        .blog-content-wrapper div a {
          color: #2563eb;
          border-bottom: 2px solid #93c5fd;
        }

        .blog-content-wrapper p a:hover,
        .blog-content-wrapper li a:hover,
        .blog-content-wrapper td a:hover,
        .blog-content-wrapper div a:hover {
          color: #1e40af;
          background-color: #dbeafe;
        }

        .blog-content-wrapper a.affiliate-link {
          color: #dc2626;
          font-weight: 600;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          padding: 0.125rem 0.5rem;
          border-radius: 0.375rem;
          border-bottom: none;
        }

        .blog-content-wrapper a.affiliate-link::after {
          content: ' 🔗';
          font-size: 0.85em;
          margin-left: 2px;
        }

        .blog-content-wrapper a.affiliate-link:hover {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
        }

        /* ===== BLOCKQUOTE ===== */
        .blog-content-wrapper blockquote {
          position: relative;
          border-left: 4px solid #3b82f6;
          padding: 1.25rem 1.5rem;
          margin: 2rem 0;
          font-style: italic;
          color: #64748b;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        .blog-content-wrapper blockquote::before {
          content: '"';
          position: absolute;
          top: -0.25rem;
          left: 0.75rem;
          font-size: 4rem;
          color: #3b82f6;
          opacity: 0.2;
          font-family: Georgia, serif;
        }

        .blog-content-wrapper blockquote p:last-child {
          margin-bottom: 0;
        }

        /* ===== CODE ===== */
        .blog-content-wrapper code {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 0.9em;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          font-weight: 500;
        }

        .blog-content-wrapper pre {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: #f1f5f9;
          padding: 1.5rem;
          border-radius: 1rem;
          overflow-x: auto;
          margin: 2rem 0;
          line-height: 1.6;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border: 1px solid #334155;
        }

        .blog-content-wrapper pre code {
          background: transparent;
          padding: 0;
          color: inherit;
          border: none;
          font-size: 0.875rem;
        }

        /* ===== TABLES ===== */
        .blog-content-wrapper table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 2rem 0;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .blog-content-wrapper th,
        .blog-content-wrapper td {
          border: 1px solid #e2e8f0;
          padding: 1rem;
          text-align: left;
        }

        .blog-content-wrapper th {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          font-weight: 600;
          color: #1e293b;
          border-bottom: 2px solid #cbd5e1;
        }

        .blog-content-wrapper tbody tr {
          transition: background 0.2s ease;
        }

        .blog-content-wrapper tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .blog-content-wrapper tbody tr:hover {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }

        /* ===== PRODUCT REVIEW BOX ===== */
        .blog-content-wrapper .product-review-box {
          border: 2px solid #3b82f6;
          border-radius: 1rem;
          padding: 2rem;
          margin: 2rem 0;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          page-break-inside: avoid;
          position: relative;
          overflow: hidden;
        }

        .blog-content-wrapper .product-review-box::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .blog-content-wrapper .product-review-box h3 {
          margin-top: 0;
          color: #1e40af;
          background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .blog-content-wrapper .product-review-box h4 {
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #0369a1;
        }

        .blog-content-wrapper .review-rating {
          font-size: 1.25em;
          margin: 1.25rem 0;
          padding: 0.75rem 1rem;
          background: white;
          border-radius: 0.5rem;
          border-left: 4px solid #f59e0b;
          font-weight: 600;
          color: #92400e;
        }

        .blog-content-wrapper .review-section ul {
          margin: 0.75rem 0;
        }

        .blog-content-wrapper .review-verdict {
          margin-top: 1.5rem;
          padding: 1.25rem;
          background: white;
          border-left: 4px solid #3b82f6;
          border-radius: 0.75rem;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        /* ===== MATH EQUATIONS ===== */
        .blog-content-wrapper .math-equation {
          display: inline-block;
          padding: 0.625rem 1rem;
          margin: 0.375rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 0.75rem;
          font-family: 'Times New Roman', serif;
          transition: all 0.25s ease;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.08);
        }

        .blog-content-wrapper .math-equation:hover {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border-color: #7dd3fc;
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
          transform: translateY(-2px);
        }

        .blog-content-wrapper .math-equation[data-type="inline"] {
          display: inline;
          padding: 0.25rem 0.5rem;
          margin: 0 0.25rem;
          vertical-align: middle;
        }

        .blog-content-wrapper .math-equation[data-type="display"] {
          display: block;
          margin: 2rem auto;
          padding: 1.5rem;
          text-align: center;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-left: 4px solid #3b82f6;
          border-radius: 1rem;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          max-width: 95%;
        }

        .blog-content-wrapper .math-equation[data-type="display"]:hover {
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.25);
          transform: translateY(-2px);
        }

        /* MathJax rendered content styling */
        .blog-content-wrapper mjx-container {
          display: inline !important;
          margin: 0 0.25em;
        }

        .blog-content-wrapper mjx-container[display="true"] {
          display: block !important;
          text-align: center;
          margin: 2rem auto;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 1rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 0.75rem;
        }

        .blog-content-wrapper mjx-container svg {
          max-width: 100%;
          height: auto;
        }

        /* ===== VIDEO/IFRAME ===== */
        .blog-content-wrapper iframe {
          max-width: 100%;
          height: auto;
          min-height: 400px;
          border-radius: 1rem;
          margin: 2rem 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 2px solid #e2e8f0;
        }

        /* ===== HORIZONTAL RULE ===== */
        .blog-content-wrapper hr {
          border: none;
          height: 2px;
          background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
          margin: 2.5rem 0;
        }

        /* ===== SPECIAL ELEMENTS ===== */
        
        /* Callout boxes */
        .blog-content-wrapper .callout {
          padding: 1.25rem 1.5rem;
          margin: 1.5rem 0;
          border-radius: 0.75rem;
          border-left: 4px solid;
        }

        .blog-content-wrapper .callout.info {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-left-color: #3b82f6;
          color: #1e40af;
        }

        .blog-content-wrapper .callout.warning {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-left-color: #f59e0b;
          color: #92400e;
        }

        .blog-content-wrapper .callout.success {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-left-color: #10b981;
          color: #065f46;
        }

        .blog-content-wrapper .callout.danger {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-left-color: #ef4444;
          color: #991b1b;
        }

        /* Keyboard keys */
        .blog-content-wrapper kbd {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          font-size: 0.875em;
          font-family: 'Courier New', monospace;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          box-shadow: 0 2px 0 #94a3b8;
          font-weight: 600;
        }

        /* Footnote references */
        .blog-content-wrapper sup {
          font-size: 0.75em;
          color: #3b82f6;
          font-weight: 600;
        }

        /* Definition lists */
        .blog-content-wrapper dl {
          margin: 1.5rem 0;
        }

        .blog-content-wrapper dt {
          font-weight: 600;
          color: #1e293b;
          margin-top: 1rem;
        }

        .blog-content-wrapper dd {
          margin-left: 2rem;
          color: #475569;
          margin-bottom: 0.5rem;
        }

        /* ===== TOC INTEGRATION STYLES ===== */
        
        /* TOC insertion point styling */
        .toc-insertion-point {
          position: relative;
        }

        /* Ensure proper spacing when TOC is inserted */
        .blog-content-wrapper h2:first-of-type {
          margin-top: 0;
        }

        /* Highlight headings when TOC links are hovered */
        .blog-content-wrapper h2:hover,
        .blog-content-wrapper h3:hover,
        .blog-content-wrapper h4:hover {
          background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ===== RESPONSIVE DESIGN ===== */
        @media (max-width: 768px) {
          .blog-content-wrapper h1 { font-size: 2rem; }
          .blog-content-wrapper h2 { font-size: 1.75rem; }
          .blog-content-wrapper h3 { font-size: 1.5rem; }
          
          .blog-content-wrapper pre {
            padding: 1rem;
            font-size: 0.85rem;
          }
          
          .blog-content-wrapper table {
            font-size: 0.875rem;
          }
          
          .blog-content-wrapper th,
          .blog-content-wrapper td {
            padding: 0.75rem 0.5rem;
          }

          .blog-content-wrapper .product-review-box {
            padding: 1.5rem;
          }

          .blog-content-wrapper iframe {
            min-height: 250px;
          }

          /* Hide anchor indicators on mobile */
          .blog-content-wrapper h2::before,
          .blog-content-wrapper h3::before,
          .blog-content-wrapper h4::before {
            display: none;
          }
        }

        /* ===== PRINT STYLES ===== */
        @media print {
          .blog-content-wrapper .math-equation,
          .blog-content-wrapper blockquote,
          .blog-content-wrapper .product-review-box {
            background: transparent !important;
            box-shadow: none !important;
          }

          .blog-content-wrapper img {
            box-shadow: none;
            page-break-inside: avoid;
          }

          .blog-content-wrapper pre {
            background: #f8fafc !important;
            color: #1e293b !important;
            border: 1px solid #cbd5e1 !important;
          }

          .blog-content-wrapper a {
            color: #1e293b !important;
            text-decoration: underline !important;
          }

          /* Hide anchor indicators in print */
          .blog-content-wrapper h2::before,
          .blog-content-wrapper h3::before,
          .blog-content-wrapper h4::before {
            display: none;
          }
        }

        /* ===== ANIMATIONS ===== */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .blog-content-wrapper > * {
          animation: fadeInUp 0.5s ease-out;
        }

        /* ===== ACCESSIBILITY ===== */
        .blog-content-wrapper *:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
          border-radius: 0.25rem;
        }

        /* Ensure proper focus for TOC navigation */
        .blog-content-wrapper h2:focus,
        .blog-content-wrapper h3:focus,
        .blog-content-wrapper h4:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 4px;
          border-radius: 0.375rem;
        }
      `}</style>
    </>
  );
}
