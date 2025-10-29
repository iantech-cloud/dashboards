// app/components/MathJaxRenderer.tsx
'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    MathJax: {
      typesetPromise?: () => Promise<void>;
      startup?: {
        promise: Promise<void>;
      };
      tex?: {
        inlineMath: [string, string][];
        displayMath: [string, string][];
        processEscapes: boolean;
      };
      svg?: {
        fontCache: string;
      };
    };
  }
}

interface MathJaxRendererProps {
  children?: React.ReactNode;
}

export default function MathJaxRenderer({ children }: MathJaxRendererProps) {
  useEffect(() => {
    const initializeMathJax = async () => {
      if (!window.MathJax) {
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true,
          },
          svg: { fontCache: 'global' },
        };
      }

      if (!document.getElementById('MathJax-script')) {
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.id = 'MathJax-script';
          script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
          script.async = true;
          
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load MathJax'));
          
          document.head.appendChild(script);
        });
      }
      
      return Promise.resolve();
    };

    const typesetMath = async () => {
      try {
        await initializeMathJax();
        
        if (window.MathJax && window.MathJax.typesetPromise) {
          await window.MathJax.typesetPromise();
        } else if (window.MathJax && window.MathJax.startup) {
          await window.MathJax.startup.promise;
          if (window.MathJax.typesetPromise) {
            await window.MathJax.typesetPromise();
          }
        }
      } catch (error) {
        console.error('Error initializing MathJax:', error);
      }
    };

    typesetMath();

    const observer = new MutationObserver((mutations) => {
      let shouldRetypeset = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          shouldRetypeset = true;
          break;
        }
      }
      
      if (shouldRetypeset && window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise().catch(console.error);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise().catch(console.error);
    }
  }, [children]);

  return <>{children}</>;
}
