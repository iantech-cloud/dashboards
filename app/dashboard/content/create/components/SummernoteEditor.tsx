// app/dashboard/content/create/components/SummernoteEditor.tsx
'use client';

import { useEffect, useRef } from 'react';

// Extend the Window interface to include jQuery's global '$'
declare global {
  interface Window {
    $: any;
  }
}

interface SummernoteEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number; // Added height prop
}

export default function SummernoteEditor({ value, onChange, placeholder, height = 400 }: SummernoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const loadSummernote = () => {
      if (typeof window === 'undefined') return;

      // Clean up any existing instance
      if (isInitialized.current && window.$ && textareaRef.current) {
        try {
          // Check if summernote is attached before trying to destroy
          if (typeof window.$(textareaRef.current).summernote === 'function') {
            window.$(textareaRef.current).summernote('destroy');
          }
        } catch (error) {
          console.error('Error destroying Summernote during load:', error);
        }
        isInitialized.current = false;
      }

      // Check for scripts, including jQuery/Summernote, using a reliable indicator
      const summernoteScriptLoaded = document.querySelector('script[src*="summernote"]');

      // --- 1. Load CSS Dependencies ---

      // Load Bootstrap 4 CSS
      if (!document.querySelector('link[href*="bootstrap"]')) {
        const bootstrapCSS = document.createElement('link');
        bootstrapCSS.rel = 'stylesheet';
        bootstrapCSS.href = 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css';
        bootstrapCSS.integrity = 'sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh';
        bootstrapCSS.crossOrigin = 'anonymous';
        document.head.appendChild(bootstrapCSS);
      }

      // Load Summernote CSS
      if (!document.querySelector('link[href*="summernote-bs4"]')) {
        const summernoteCSS = document.createElement('link');
        summernoteCSS.rel = 'stylesheet';
        summernoteCSS.href = 'https://cdn.jsdelivr.net/npm/summernote@0.9.0/dist/summernote-bs4.min.css';
        document.head.appendChild(summernoteCSS);
      }
      
      // --- 2. Load JS Dependencies Sequentially ---
      
      if (typeof window.$ === 'undefined' || !summernoteScriptLoaded) {
          
        // Load jQuery
        function loadJQuery() {
          const jqueryScript = document.createElement('script');
          jqueryScript.src = 'https://code.jquery.com/jquery-3.5.1.min.js';
          jqueryScript.crossOrigin = 'anonymous';
          jqueryScript.onload = loadPopper;
          document.body.appendChild(jqueryScript);
        }

        // Load Popper
        function loadPopper() {
          const popperScript = document.createElement('script');
          popperScript.src = 'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js';
          popperScript.integrity = 'sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo';
          popperScript.crossOrigin = 'anonymous';
          popperScript.onload = loadBootstrap;
          document.body.appendChild(popperScript);
        }

        // Load Bootstrap
        function loadBootstrap() {
          const bootstrapScript = document.createElement('script');
          bootstrapScript.src = 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js';
          bootstrapScript.integrity = 'sha384-wfSDF2E50Y2D1uUdj0O3uMBJnjuUD4Ih7YwaYd1iqfktj0Uod8GCExl3Og8ifwB6';
          bootstrapScript.crossOrigin = 'anonymous';
          bootstrapScript.onload = loadSummernoteJS;
          document.body.appendChild(bootstrapScript);
        }

        // Load Summernote JS
        function loadSummernoteJS() {
          const summernoteScript = document.createElement('script');
          summernoteScript.src = 'https://cdn.jsdelivr.net/npm/summernote@0.9.0/dist/summernote-bs4.min.js';
          summernoteScript.onload = () => {
             // Add a small delay after final script load
             setTimeout(initializeSummernote, 50);
          };
          document.body.appendChild(summernoteScript);
        }
        
        // Initiate load sequence
        if (typeof window.$ === 'undefined') {
            loadJQuery();
        } else if (!summernoteScriptLoaded) {
            loadPopper(); // Assuming jQuery is loaded but not Summernote/Bootstrap chain
        } else {
            // Should be covered by the initial check, but as a fallback
            initializeSummernote(); 
        }

      } else {
        // Dependencies are already loaded, just initialize
        initializeSummernote();
      }
    };

    const initializeSummernote = () => {
      // Check for dependencies before initializing
      if (textareaRef.current && typeof window.$ !== 'undefined' && typeof window.$(textareaRef.current).summernote === 'function' && !isInitialized.current) {
        
        window.$(textareaRef.current).summernote({
          placeholder: placeholder || 'Write your content here...',
          tabsize: 2,
          height: height, // Use the passed height prop
          toolbar: [
            ['style', ['style']],
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['fontname', ['fontname']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'video']],
            ['view', ['fullscreen', 'codeview', 'help']]
          ],
          callbacks: {
            onChange: (content: string) => {
              onChange(content);
            },
            onInit: () => {
              // Set initial value
              if (value) {
                window.$(textareaRef.current).summernote('code', value);
              }
              isInitialized.current = true;
            }
          }
        });
      }
    };
    
    loadSummernote();

    return () => {
      // Cleanup on unmount
      if (isInitialized.current && window.$ && textareaRef.current) {
        try {
          if (typeof window.$(textareaRef.current).summernote === 'function') {
            window.$(textareaRef.current).summernote('destroy');
          }
        } catch (error) {
          console.error('Error destroying Summernote:', error);
        }
        isInitialized.current = false;
      }
    };
  }, [placeholder, onChange, height]);

  useEffect(() => {
    // Update content when value changes from outside
    if (isInitialized.current && window.$ && textareaRef.current) {
      const currentContent = window.$(textareaRef.current).summernote('code');
      if (currentContent !== value) {
        window.$(textareaRef.current).summernote('code', value);
      }
    }
  }, [value]);

  return (
    <div className="summernote-wrapper">
      <textarea
        ref={textareaRef}
        className="summernote"
        style={{ display: 'none' }}
      />
      {/* Global styles to override Bootstrap 4 appearance with Tailwind styling */}
      <style jsx global>{`
        .note-editor.note-frame {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          margin: 0;
        }
        .note-editor.note-frame .note-toolbar {
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 0.5rem 0.5rem 0 0;
          padding: 0.5rem;
        }
        .note-editor.note-frame .note-statusbar {
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
          border-radius: 0 0 0.5rem 0.5rem;
        }
        .note-editor.note-frame .note-editing-area {
          border-radius: 0;
        }
        .note-editor.note-frame .note-editable {
          padding: 1rem;
          min-height: ${height}px; /* Adjusted to use prop for min-height */
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #374151;
        }
        .note-btn-group .note-btn {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        .note-btn-group .note-btn:hover {
          background: #f3f4f6;
        }
        .note-btn-group .note-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .note-modal .modal-dialog {
          max-width: 500px;
        }
        .note-popover .popover-content .note-color .dropdown-toggle,
        .note-toolbar .note-color .dropdown-toggle {
          width: 30px;
          padding-left: 5px;
        }
      `}</style>
    </div>
  );
}
