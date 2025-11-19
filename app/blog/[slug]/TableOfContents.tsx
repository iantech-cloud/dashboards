// app/blog/[slug]/TableOfContents.tsx
'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { List, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: TOCItem[];
}

const TableOfContents = memo(function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile and set initial collapsed state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, start collapsed
      if (mobile && isCollapsed === false) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle URL hash on page load and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && headings.some(h => h.id === hash)) {
        setActiveId(hash);
        // Scroll to the element if it exists
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            const offset = 100;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth',
            });
          }
        }, 100);
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [headings]);

  // Intersection Observer for active heading tracking
  useEffect(() => {
    if (headings.length === 0) return;

    const observerOptions = {
      rootMargin: '-100px 0px -66% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Find the most visible entry
      let mostVisible: IntersectionObserverEntry | null = null;
      let maxRatio = 0;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          mostVisible = entry;
        }
      });

      if (mostVisible) {
        setActiveId(mostVisible.target.id);
        // Update URL hash without scrolling
        if (window.history.replaceState) {
          window.history.replaceState(null, '', `#${mostVisible.target.id}`);
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all headings
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  // Smooth scroll to heading with proper offset
  const scrollToHeading = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    const element = document.getElementById(id);
    if (!element) return;

    // Set active immediately for instant feedback
    setActiveId(id);
    
    const offset = 100;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });

    // Update URL hash
    if (window.history.pushState) {
      window.history.pushState(null, '', `#${id}`);
    }

    // On mobile, collapse after clicking
    if (isMobile) {
      setTimeout(() => setIsCollapsed(true), 300);
    }
  }, [isMobile]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="toc-container" aria-label="Table of contents">
      {/* Header - Always visible, clickable to collapse/expand */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="toc-header"
        aria-expanded={!isCollapsed}
        aria-controls="toc-content"
      >
        <div className="toc-icon">
          <List className="w-5 h-5" />
        </div>
        <h2 className="toc-title">Table of Contents</h2>
        <div className="toc-toggle">
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      <div 
        id="toc-content"
        className={`toc-content ${isCollapsed ? 'toc-collapsed' : 'toc-expanded'}`}
        aria-hidden={isCollapsed}
      >
        <ul className="toc-list">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={`toc-item toc-level-${heading.level} ${
                activeId === heading.id ? 'toc-active' : ''
              }`}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => scrollToHeading(heading.id, e)}
                className="toc-link"
                title={heading.text}
              >
                <ChevronRight className="toc-chevron" />
                <span className="toc-text">{heading.text}</span>
              </a>
            </li>
          ))}
        </ul>

        {/* Progress Indicator */}
        <div className="toc-footer">
          <div className="toc-progress-bar">
            <div
              className="toc-progress-fill"
              style={{
                width: `${
                  headings.length > 0
                    ? ((headings.findIndex((h) => h.id === activeId) + 1) /
                        headings.length) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="toc-progress-text">
            Section {Math.max(1, headings.findIndex((h) => h.id === activeId) + 1)} of {headings.length}
          </p>
        </div>
      </div>

      <style jsx>{`
        .toc-container {
          margin: 2.5rem 0;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px solid #bae6fd;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          page-break-inside: avoid;
        }

        /* Header - Now a button */
        .toc-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          border-bottom: 2px solid #1e40af;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toc-header:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        }

        .toc-header:active {
          transform: scale(0.98);
        }

        .toc-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          color: white;
          flex-shrink: 0;
        }

        .toc-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          margin: 0;
          flex: 1;
          text-align: left;
        }

        .toc-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: transform 0.2s ease;
        }

        /* Collapsible Content */
        .toc-content {
          overflow: hidden;
          transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, padding 0.3s ease-in-out;
        }

        .toc-expanded {
          max-height: 2000px;
          opacity: 1;
          padding: 1.5rem;
        }

        .toc-collapsed {
          max-height: 0;
          opacity: 0;
          padding: 0 1.5rem;
        }

        .toc-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.25rem 0;
        }

        .toc-item {
          margin: 0;
          transition: all 0.2s ease;
        }

        .toc-level-2 {
          margin-left: 0;
        }

        .toc-level-3 {
          margin-left: 1.5rem;
        }

        .toc-level-4 {
          margin-left: 3rem;
        }

        .toc-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          text-decoration: none;
          font-size: 0.9375rem;
          line-height: 1.5;
          color: #1e40af;
          background: transparent;
          border-radius: 0.5rem;
          border-left: 3px solid transparent;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .toc-link:hover {
          background: rgba(59, 130, 246, 0.1);
          border-left-color: #3b82f6;
          padding-left: 1.25rem;
          transform: translateX(2px);
        }

        .toc-active .toc-link {
          background: rgba(59, 130, 246, 0.15);
          border-left-color: #2563eb;
          color: #1e3a8a;
          font-weight: 600;
          padding-left: 1.25rem;
        }

        .toc-chevron {
          flex-shrink: 0;
          width: 1rem;
          height: 1rem;
          color: #60a5fa;
          transition: transform 0.2s ease, color 0.2s ease;
        }

        .toc-link:hover .toc-chevron {
          transform: translateX(4px);
          color: #3b82f6;
        }

        .toc-active .toc-chevron {
          transform: translateX(4px);
          color: #2563eb;
        }

        .toc-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .toc-footer {
          padding-top: 1rem;
          border-top: 2px solid rgba(59, 130, 246, 0.2);
        }

        .toc-progress-bar {
          width: 100%;
          height: 0.5rem;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 0.25rem;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .toc-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%);
          border-radius: 0.25rem;
          transition: width 0.3s ease;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }

        .toc-progress-text {
          font-size: 0.75rem;
          color: #0369a1;
          text-align: center;
          margin: 0;
          font-weight: 600;
        }

        /* Responsive Design */
        @media (max-width: 640px) {
          .toc-container {
            margin: 2rem 0;
            border-radius: 0.75rem;
          }

          .toc-header {
            padding: 1rem 1.25rem;
          }

          .toc-icon {
            width: 2rem;
            height: 2rem;
          }

          .toc-title {
            font-size: 1rem;
          }

          .toc-expanded {
            padding: 1.25rem;
          }

          .toc-link {
            font-size: 0.875rem;
            padding: 0.625rem 0.75rem;
          }

          .toc-level-3 {
            margin-left: 1rem;
          }

          .toc-level-4 {
            margin-left: 2rem;
          }
        }

        /* Print Styles */
        @media print {
          .toc-container {
            background: white;
            border: 1px solid #e5e7eb;
            box-shadow: none;
          }

          .toc-header {
            background: #f3f4f6;
            color: #1f2937;
          }

          .toc-icon {
            background: #e5e7eb;
            color: #1f2937;
          }

          .toc-toggle {
            display: none;
          }

          .toc-content {
            display: block !important;
            max-height: none !important;
            opacity: 1 !important;
            padding: 1rem !important;
          }

          .toc-footer {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
});

export default TableOfContents;
