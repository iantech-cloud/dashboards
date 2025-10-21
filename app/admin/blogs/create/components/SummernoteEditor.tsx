// app/admin/blogs/create/components/SummernoteEditor.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    $: any;
  }
}

interface SummernoteEditorProps {
  value: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  height?: number;
  placeholder?: string;
}

export default function SummernoteEditor({ 
  value, 
  onChange, 
  readOnly = false, 
  height = 400,
  placeholder 
}: SummernoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialized = useRef(false);

  // Stable callback reference
  const handleChange = useCallback((content: string) => {
    if (onChange) {
      onChange(content);
    }
  }, [onChange]);

  useEffect(() => {
    const loadSummernote = () => {
      if (typeof window === 'undefined') return;

      // Clean up any existing instance
      if (isInitialized.current && window.$ && textareaRef.current) {
        try {
          window.$(textareaRef.current).summernote('destroy');
        } catch (error) {
          console.error('Error destroying Summernote:', error);
        }
        isInitialized.current = false;
      }

      // Check if all scripts are already loaded
      const scriptsLoaded = 
        document.querySelector('script[src*="jquery"]') &&
        document.querySelector('script[src*="popper"]') &&
        document.querySelector('script[src*="bootstrap"]') &&
        document.querySelector('script[src*="summernote"]');

      if (scriptsLoaded) {
        initializeSummernote();
        return;
      }

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

      // Load jQuery
      if (typeof window.$ === 'undefined') {
        const jqueryScript = document.createElement('script');
        jqueryScript.src = 'https://code.jquery.com/jquery-3.5.1.min.js';
        jqueryScript.crossOrigin = 'anonymous';
        jqueryScript.onload = loadPopper;
        document.head.appendChild(jqueryScript);
      } else {
        loadPopper();
      }

      function loadPopper() {
        const popperScript = document.createElement('script');
        popperScript.src = 'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js';
        popperScript.integrity = 'sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo';
        popperScript.crossOrigin = 'anonymous';
        popperScript.onload = loadBootstrap;
        document.head.appendChild(popperScript);
      }

      function loadBootstrap() {
        const bootstrapScript = document.createElement('script');
        bootstrapScript.src = 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/js/bootstrap.min.js';
        bootstrapScript.integrity = 'sha384-wfSDF2E50Y2D1uUdj0O3uMBJnjuUD4Ih7YwaYd1iqfktj0Uod8GCExl3Og8ifwB6';
        bootstrapScript.crossOrigin = 'anonymous';
        bootstrapScript.onload = loadSummernoteJS;
        document.head.appendChild(bootstrapScript);
      }

      function loadSummernoteJS() {
        const summernoteScript = document.createElement('script');
        summernoteScript.src = 'https://cdn.jsdelivr.net/npm/summernote@0.9.0/dist/summernote-bs4.min.js';
        summernoteScript.onload = initializeSummernote;
        document.head.appendChild(summernoteScript);
      }

      function initializeSummernote() {
        if (textareaRef.current && window.$ && !isInitialized.current) {
          const summernoteConfig: any = {
            placeholder: placeholder || 'Enter content here...',
            tabsize: 2,
            height: height,
            toolbar: readOnly ? false : [
              ['style', ['style']],
              ['font', ['bold', 'italic', 'underline', 'clear']],
              ['fontname', ['fontname']],
              ['color', ['color']],
              ['para', ['ul', 'ol', 'paragraph']],
              ['table', ['table']],
              ['insert', ['link', 'picture', 'video']],
              ['view', ['fullscreen', 'codeview', 'help']]
            ],
            disableDragAndDrop: readOnly,
            shortcuts: !readOnly
          };

          // Always add callbacks, but handle onChange conditionally
          summernoteConfig.callbacks = {
            onInit: () => {
              console.log('Summernote initialized successfully');
            }
          };

          // Only add onChange if not read-only and onChange prop is provided
          if (!readOnly) {
            summernoteConfig.callbacks.onChange = (content: string) => {
              handleChange(content);
            };
          }

          window.$(textareaRef.current).summernote(summernoteConfig);

          isInitialized.current = true;

          // Set initial value
          if (value) {
            window.$(textareaRef.current).summernote('code', value);
          }

          // Disable editing if read-only
          if (readOnly) {
            window.$(textareaRef.current).summernote('disable');
          }
        }
      }
    };

    loadSummernote();

    return () => {
      // Cleanup on unmount
      if (isInitialized.current && window.$ && textareaRef.current) {
        try {
          window.$(textareaRef.current).summernote('destroy');
        } catch (error) {
          console.error('Error destroying Summernote:', error);
        }
        isInitialized.current = false;
      }
    };
  }, [placeholder, height, readOnly, handleChange]); // Stable dependencies

  useEffect(() => {
    // Update content when value changes
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
        .note-modal .modal-dialog {
          max-width: 500px;
        }
        .note-popover .popover-content .note-color .dropdown-toggle,
        .note-toolbar .note-color .dropdown-toggle {
          width: 30px;
          padding-left: 5px;
        }
        
        /* Read-only styles */
        .note-editor.note-frame.read-only .note-editable {
          background-color: #f9fafb;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
