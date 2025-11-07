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
  height?: number;
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
          if (typeof window.$(textareaRef.current).summernote === 'function') {
            window.$(textareaRef.current).summernote('destroy');
          }
        } catch (error) {
          console.error('Error destroying Summernote during load:', error);
        }
        isInitialized.current = false;
      }

      const summernoteScriptLoaded = document.querySelector('script[src*="summernote"]');

      // --- 1. Load CSS Dependencies ---
      if (!document.querySelector('link[href*="bootstrap"]')) {
        const bootstrapCSS = document.createElement('link');
        bootstrapCSS.rel = 'stylesheet';
        bootstrapCSS.href = 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css';
        bootstrapCSS.integrity = 'sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh';
        bootstrapCSS.crossOrigin = 'anonymous';
        document.head.appendChild(bootstrapCSS);
      }

      if (!document.querySelector('link[href*="summernote-bs4"]')) {
        const summernoteCSS = document.createElement('link');
        summernoteCSS.rel = 'stylesheet';
        summernoteCSS.href = 'https://cdn.jsdelivr.net/npm/summernote@0.9.0/dist/summernote-bs4.min.css';
        document.head.appendChild(summernoteCSS);
      }
      
      // --- 2. Load JS Dependencies Sequentially ---
      if (typeof window.$ === 'undefined' || !summernoteScriptLoaded) {
          
        function loadJQuery() {
          const jqueryScript = document.createElement('script');
          jqueryScript.src = 'https://code.jquery.com/jquery-3.5.1.min.js';
          jqueryScript.crossOrigin = 'anonymous';
          jqueryScript.onload = loadPopper;
          document.body.appendChild(jqueryScript);
        }

        function loadPopper() {
          const popperScript = document.createElement('script');
          popperScript.src = 'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js';
          popperScript.integrity = 'sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo';
          popperScript.crossOrigin = 'anonymous';
          popperScript.onload = loadBootstrap;
          document.body.appendChild(popperScript);
        }

        function loadBootstrap() {
          const bootstrapScript = document.createElement('script');
          bootstrapScript.src = 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js';
          bootstrapScript.integrity = 'sha384-wfSDF2E50Y2D1uUdj0O3uMBJnjuUD4Ih7YwaYd1iqfktj0Uod8GCExl3Og8ifwB6';
          bootstrapScript.crossOrigin = 'anonymous';
          bootstrapScript.onload = loadSummernoteJS;
          document.body.appendChild(bootstrapScript);
        }

        function loadSummernoteJS() {
          const summernoteScript = document.createElement('script');
          summernoteScript.src = 'https://cdn.jsdelivr.net/npm/summernote@0.9.0/dist/summernote-bs4.min.js';
          summernoteScript.onload = () => {
             setTimeout(initializeSummernote, 50);
          };
          document.body.appendChild(summernoteScript);
        }
        
        if (typeof window.$ === 'undefined') {
            loadJQuery();
        } else if (!summernoteScriptLoaded) {
            loadPopper();
        } else {
            initializeSummernote(); 
        }

      } else {
        initializeSummernote();
      }
    };

    const initializeSummernote = () => {
      if (textareaRef.current && typeof window.$ !== 'undefined' && typeof window.$(textareaRef.current).summernote === 'function' && !isInitialized.current) {
        
        window.$(textareaRef.current).summernote({
          placeholder: placeholder || 'Write your content here...',
          tabsize: 2,
          height: height,
          dialogsInBody: true, // FIX: Render dialogs in body to avoid z-index issues
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
              if (value) {
                window.$(textareaRef.current).summernote('code', value);
              }
              isInitialized.current = true;
            },
            // FIX: Ensure modal is properly focused
            onDialogShown: () => {
              console.log('Dialog shown');
            }
          }
        });
      }
    };
    
    loadSummernote();

    return () => {
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
      <style jsx global>{`
        /* Editor Styling */
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
          min-height: ${height}px;
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

        /* FIX: Modal Z-Index and Positioning */
        .note-modal {
          z-index: 10000 !important;
        }
        .note-modal .modal-dialog {
          max-width: 500px;
          margin: 1.75rem auto;
          position: relative;
          z-index: 10001 !important;
        }
        .note-modal .modal-content {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
        .note-modal .modal-header {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .note-modal .modal-body {
          padding: 1.5rem;
        }
        .note-modal .modal-footer {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          padding: 1rem;
          border-radius: 0 0 0.5rem 0.5rem;
        }
        
        /* FIX: Modal Backdrop */
        .modal-backdrop {
          z-index: 9999 !important;
          background-color: rgba(0, 0, 0, 0.5);
        }
        .modal-backdrop.show {
          opacity: 0.5;
        }

        /* FIX: Form inputs in modals */
        .note-modal .form-control {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #374151;
          background-color: #fff;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
        }
        .note-modal .form-control:focus {
          border-color: #3b82f6;
          outline: 0;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* FIX: Buttons in modals */
        .note-modal .btn {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          border-radius: 0.375rem;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
        }
        .note-modal .btn-primary {
          background-color: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }
        .note-modal .btn-primary:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        .note-modal .btn-secondary {
          background-color: #6b7280;
          border-color: #6b7280;
          color: white;
        }
        .note-modal .btn-secondary:hover {
          background-color: #4b5563;
          border-color: #4b5563;
        }

        /* FIX: Ensure modals are clickable */
        .note-modal.show {
          display: block !important;
          pointer-events: auto !important;
        }
        .note-modal .modal-dialog {
          pointer-events: auto !important;
        }

        /* Color picker dropdown */
        .note-popover .popover-content .note-color .dropdown-toggle,
        .note-toolbar .note-color .dropdown-toggle {
          width: 30px;
          padding-left: 5px;
        }

        /* FIX: Prevent body scroll when modal is open */
        body.modal-open {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
