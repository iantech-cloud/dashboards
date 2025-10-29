// app/admin/blogs/create/components/SummernoteEditor.tsx
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    $: any;
    jQuery: any;
    Summernote: any;
    MathJax: any;
  }
}

interface SummernoteEditorProps {
  value: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  height?: number;
  placeholder?: string;
  onImageUpload?: (file: File, altText: string) => Promise<string>;
}

export default function SummernoteEditor({
  value,
  onChange,
  readOnly = false,
  height = 500,
  placeholder = 'Write your blog post content here...',
  onImageUpload,
}: SummernoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [uploading, setUploading] = useState(false);
  const jQueryRef = useRef<any>(null);
  const mathRenderTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize MathJax globally first
  useEffect(() => {
    if (!window.MathJax) {
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
          processEscapes: true,
          processEnvironments: true,
        },
        svg: {
          fontCache: 'global',
          scale: 1.2,
        },
        startup: {
          pageReady: () => {
            return Promise.resolve();
          },
        },
        options: {
          ignoreHtmlClass: 'tex2jax_ignore',
          processHtmlClass: 'tex2jax_process',
          enableMenu: false,
        },
      };
    }
  }, []);

  // Load all required libraries
  useEffect(() => {
    const loadLibraries = async () => {
      // Check if jQuery and Summernote are already loaded
      if (window.$ && window.$.fn.summernote) {
        setTimeout(initEditor, 100);
        return;
      }

      // Load Bootstrap CSS
      if (!document.querySelector('link[href*="bootstrap.min.css"][data-summernote]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css';
        link.setAttribute('data-summernote', 'true');
        document.head.appendChild(link);
      }

      // Load Summernote CSS
      if (!document.querySelector('link[href*="summernote-bs4.css"][data-summernote]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/summernote@0.8.20/dist/summernote-bs4.css';
        link.setAttribute('data-summernote', 'true');
        document.head.appendChild(link);
      }

      // Load Prism.js CSS for code syntax highlighting
      if (!document.querySelector('link[href*="prism"]')) {
        const prismCSS = document.createElement('link');
        prismCSS.rel = 'stylesheet';
        prismCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
        prismCSS.setAttribute('data-summernote', 'true');
        document.head.appendChild(prismCSS);
      }

      // Load jQuery
      const jqueryScript = document.createElement('script');
      jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
      jqueryScript.setAttribute('data-summernote', 'true');
      jqueryScript.onload = loadPopper;
      document.head.appendChild(jqueryScript);

      function loadPopper() {
        const popperScript = document.createElement('script');
        popperScript.src = 'https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js';
        popperScript.setAttribute('data-summernote', 'true');
        popperScript.onload = loadBootstrap;
        document.head.appendChild(popperScript);
      }

      function loadBootstrap() {
        const bootstrapScript = document.createElement('script');
        bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.min.js';
        bootstrapScript.setAttribute('data-summernote', 'true');
        bootstrapScript.onload = loadSummernote;
        document.head.appendChild(bootstrapScript);
      }

      function loadSummernote() {
        const summernoteScript = document.createElement('script');
        summernoteScript.src = 'https://cdn.jsdelivr.net/npm/summernote@0.8.20/dist/summernote-bs4.js';
        summernoteScript.setAttribute('data-summernote', 'true');
        summernoteScript.onload = loadPrism;
        document.head.appendChild(summernoteScript);
      }

      function loadPrism() {
        // Load Prism.js for syntax highlighting
        const prismScript = document.createElement('script');
        prismScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
        prismScript.setAttribute('data-summernote', 'true');
        prismScript.onload = loadPrismLanguages;
        document.head.appendChild(prismScript);
      }

      function loadPrismLanguages() {
        // Load additional language support
        const languages = [
          'markup', 'css', 'javascript', 'python', 'java', 'php', 
          'c', 'cpp', 'csharp', 'ruby', 'go', 'rust', 'typescript'
        ];
        
        const baseUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
        let loaded = 0;
        
        languages.forEach(lang => {
          const script = document.createElement('script');
          script.src = `${baseUrl}prism-${lang}.min.js`;
          script.setAttribute('data-summernote', 'true');
          script.onload = () => {
            loaded++;
            if (loaded === languages.length) {
              loadMathJax();
            }
          };
          document.head.appendChild(script);
        });
      }

      function loadMathJax() {
        // Check if MathJax script is already loaded
        if (document.getElementById('MathJax-script')) {
          setTimeout(initEditor, 100);
          return;
        }

        const mathScript = document.createElement('script');
        mathScript.id = 'MathJax-script';
        mathScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        mathScript.async = true;
        mathScript.setAttribute('data-summernote', 'true');
        mathScript.onload = () => {
          setTimeout(initEditor, 150);
        };
        document.head.appendChild(mathScript);
      }
    };

    loadLibraries();

    return () => {
      // Cleanup on unmount
      if (mathRenderTimeout.current) {
        clearTimeout(mathRenderTimeout.current);
      }
      if (isInitialized.current && editorRef.current && window.$) {
        try {
          window.$(editorRef.current).summernote('destroy');
          isInitialized.current = false;
        } catch (e) {
          console.warn('Error destroying Summernote:', e);
        }
      }
    };
  }, []);

  const typesetMath = useCallback(() => {
    if (mathRenderTimeout.current) {
      clearTimeout(mathRenderTimeout.current);
    }

    mathRenderTimeout.current = setTimeout(() => {
      if (window.MathJax?.typesetPromise) {
        const editable = editorRef.current
          ? window.$(editorRef.current).next('.note-editor').find('.note-editable')[0]
          : null;
        if (editable) {
          window.MathJax.typesetPromise([editable]).catch((e: any) => {
            console.warn('MathJax error:', e);
          });
        }
      }
    }, 100);
  }, []);

  // Function to detect and wrap LaTeX in proper delimiters
  const processLatexContent = useCallback((html: string): string => {
    // Don't process if already wrapped in math delimiters
    if (html.includes('class="math-equation"')) {
      return html;
    }

    // Detect display math patterns ($$...$$, \[...\])
    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
      return `<div class="math-equation" data-type="display">$$${latex.trim()}$$</div>`;
    });

    html = html.replace(/\\\[([\s\S]+?)\\\]/g, (match, latex) => {
      return `<div class="math-equation" data-type="display">\\[${latex.trim()}\\]</div>`;
    });

    // Detect inline math patterns ($...$, \(...\))
    html = html.replace(/\$([^\$\n]+?)\$/g, (match, latex) => {
      // Avoid matching display math
      if (match.includes('$$')) return match;
      return `<span class="math-equation" data-type="inline">$${latex.trim()}$</span>`;
    });

    html = html.replace(/\\\(([^\)]+?)\\\)/g, (match, latex) => {
      return `<span class="math-equation" data-type="inline">\\(${latex.trim()}\\)</span>`;
    });

    return html;
  }, []);

  const initEditor = useCallback(() => {
    if (!window.$ || !window.$.fn.summernote || isInitialized.current) {
      return;
    }

    if (!editorRef.current) return;

    jQueryRef.current = window.$;
    const $ = window.$;

    // Custom button for affiliate links
    const AffiliateButton = function (context: any) {
      const ui = $.summernote.ui;
      const button = ui.button({
        contents: '<i class="note-icon-link"/> Affiliate',
        tooltip: 'Insert Affiliate Link',
        click: function () {
          const url = prompt('Enter affiliate URL (e.g., https://amazon.com/...):');
          if (!url) return;

          const text = prompt('Enter link text (leave blank to use URL):') || url;

          context.invoke('createLink', {
            text: text,
            url: url,
            isNewWindow: true,
          });

          // Add affiliate attributes
          setTimeout(() => {
            const editable = $(editorRef.current).next('.note-editor').find('.note-editable');
            const links = editable.find(`a[href="${url}"]`);
            links.each(function () {
              $(this)
                .attr('rel', 'nofollow noopener sponsored')
                .attr('data-affiliate', 'true')
                .addClass('affiliate-link');
            });
          }, 50);
        },
      });
      return button.render();
    };

    // Enhanced Math button with better LaTeX handling
    const MathButton = function (context: any) {
      const ui = $.summernote.ui;
      const button = ui.button({
        contents: '<span style="font-weight:bold;">∑</span>',
        tooltip: 'Insert Math Equation (Ctrl+M)',
        click: function () {
          const latex = prompt(
            'Enter LaTeX equation:\n\nExamples:\n• E = mc^2\n• \\frac{a}{b}\n• \\int_{0}^{\\infty} e^{-x} dx\n• x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
          );
          if (!latex) return;

          const isInline = confirm(
            'Click OK for inline equation (within text)\nClick Cancel for display equation (centered block)'
          );
          
          let html: string;
          if (isInline) {
            html = `<span class="math-equation" data-type="inline" contenteditable="false">$${latex.trim()}$</span>&nbsp;`;
          } else {
            html = `<div class="math-equation" data-type="display" contenteditable="false">$$${latex.trim()}$$</div><p><br></p>`;
          }

          context.invoke('pasteHTML', html);

          setTimeout(() => {
            typesetMath();
          }, 100);
        },
      });
      return button.render();
    };

    // Custom button for product review box
    const ProductReviewButton = function (context: any) {
      const ui = $.summernote.ui;
      const button = ui.button({
        contents: '<i class="note-icon-star"/> Review',
        tooltip: 'Insert Product Review Box',
        click: function () {
          const productName = prompt('Product name:');
          if (!productName) return;

          const template = `
            <div class="product-review-box" style="border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0; background: #f0f9ff; page-break-inside: avoid;">
              <h3 style="margin-top: 0; color: #1e40af; font-size: 1.25rem;">${productName}</h3>
              <div class="review-rating" style="margin: 15px 0; font-size: 1.1em;">
                <strong>Rating:</strong> ★★★★★ (5/5)
              </div>
              <div class="review-section" style="margin: 15px 0;">
                <h4 style="color: #059669; margin-bottom: 8px;"><strong>✓ Pros:</strong></h4>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Benefit or feature 1</li>
                  <li>Benefit or feature 2</li>
                  <li>Benefit or feature 3</li>
                </ul>
              </div>
              <div class="review-section" style="margin: 15px 0;">
                <h4 style="color: #dc2626; margin-bottom: 8px;"><strong>✗ Cons:</strong></h4>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Limitation 1</li>
                  <li>Limitation 2</li>
                </ul>
              </div>
              <div class="review-verdict" style="margin-top: 15px; padding: 12px; background: white; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <strong style="color: #1e40af;">Verdict:</strong> <em>Your final recommendation here...</em>
              </div>
            </div>
            <p><br></p>
          `;
          context.invoke('pasteHTML', template);
        },
      });
      return button.render();
    };

    // Custom button for code blocks with syntax highlighting
    const CodeBlockButton = function (context: any) {
      const ui = $.summernote.ui;
      const button = ui.button({
        contents: '<i class="note-icon-code"/> Code',
        tooltip: 'Insert Code Block with Syntax Highlighting',
        click: function () {
          const languages = [
            'html', 'css', 'javascript', 'typescript', 'python', 'java', 
            'php', 'c', 'cpp', 'csharp', 'ruby', 'go', 'rust', 'sql', 'bash'
          ];
          
          let languageOptions = languages.map(lang => 
            `<option value="${lang}">${lang.toUpperCase()}</option>`
          ).join('');
          
          const modalHTML = `
            <div class="modal fade" id="codeBlockModal" tabindex="-1">
              <div class="modal-dialog modal-lg">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Insert Code Block</h5>
                    <button type="button" class="close" data-dismiss="modal">
                      <span>&times;</span>
                    </button>
                  </div>
                  <div class="modal-body">
                    <div class="form-group">
                      <label for="codeLanguage">Language:</label>
                      <select class="form-control" id="codeLanguage">
                        ${languageOptions}
                      </select>
                    </div>
                    <div class="form-group">
                      <label for="codeContent">Code:</label>
                      <textarea class="form-control" id="codeContent" rows="15" 
                        placeholder="Paste your code here..." 
                        style="font-family: 'Courier New', monospace; font-size: 14px;"></textarea>
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="insertCodeBtn">Insert Code</button>
                  </div>
                </div>
              </div>
            </div>
          `;
          
          // Remove existing modal if any
          $('#codeBlockModal').remove();
          
          // Add modal to body
          $('body').append(modalHTML);
          
          // Show modal
          $('#codeBlockModal').modal('show');
          
          // Handle insert button
          $('#insertCodeBtn').off('click').on('click', function() {
            const language = $('#codeLanguage').val();
            const code = $('#codeContent').val();
            
            if (!code.trim()) {
              alert('Please enter some code');
              return;
            }
            
            // Escape HTML entities
            const escapedCode = code
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
            
            const codeBlock = `
              <pre class="language-${language}" style="margin: 20px 0; border-radius: 8px; overflow-x: auto;"><code class="language-${language}">${escapedCode}</code></pre>
              <p><br></p>
            `;
            
            context.invoke('pasteHTML', codeBlock);
            
            // Highlight the code
            setTimeout(() => {
              if (window.Prism) {
                window.Prism.highlightAll();
              }
            }, 100);
            
            $('#codeBlockModal').modal('hide');
          });
        },
      });
      return button.render();
    };

    // Configure Summernote
    try {
      $(editorRef.current).summernote({
        placeholder: placeholder,
        tabsize: 2,
        height: height,
        minHeight: 300,
        maxHeight: 800,
        focus: true,
        toolbar: readOnly
          ? false
          : [
              ['style', ['style', 'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
              ['font', ['fontname', 'fontsize', 'color']],
              ['para', ['ul', 'ol', 'paragraph']],
              ['insert', ['link', 'picture', 'video', 'table', 'hr']],
              ['custom', ['codeBlock', 'affiliate', 'math', 'productReview']],
              ['misc', ['fullscreen', 'codeview', 'undo', 'redo', 'help']],
            ],
        buttons: {
          codeBlock: CodeBlockButton,
          affiliate: AffiliateButton,
          math: MathButton,
          productReview: ProductReviewButton,
        },
        fontNames: ['Arial', 'Comic Sans MS', 'Courier New', 'Georgia', 'Helvetica', 'Roboto', 'Open Sans', 'Times New Roman', 'Verdana'],
        fontNamesIgnoreCheck: ['Roboto', 'Open Sans'],
        fontSizes: ['8', '9', '10', '11', '12', '13', '14', '16', '18', '20', '24', '28', '32', '36', '48'],
        codeviewFilter: false,
        codeviewIframeFilter: true,
        disableDragAndDrop: false,
        shortcuts: !readOnly,
        prettifyHtml: true,
        spellCheck: true,
        lang: 'en-US',
        imageShape: [],
        imageAttributes: {
          imageDialogLabel: 'Image Attributes',
          imageBackendUrl: '/api/upload/image',
        },
        popover: {
          image: [
            ['imagesize', ['imageSize100', 'imageSize50', 'imageSize25']],
            ['float', ['floatLeft', 'floatRight', 'floatNone']],
            ['remove', ['removeMedia']],
          ],
          link: [['link', ['linkDialogShow', 'unlink']]],
          table: [
            ['add', ['addRowDown', 'addRowRight']],
            ['delete', ['deleteRow', 'deleteColumn', 'deleteTable']],
          ],
        },
        callbacks: {
          onInit: function () {
            const editable = $(editorRef.current).next('.note-editor').find('.note-editable');
            editable.css({
              'font-family': 'system-ui, -apple-system, sans-serif',
              'font-size': '1rem',
              'line-height': '1.6',
              'color': '#374151',
            });
            
            // Add keyboard shortcut for math
            editable.on('keydown', function(e: KeyboardEvent) {
              if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                const mathBtn = $(editorRef.current).next('.note-editor').find('.note-btn[data-name="math"]');
                if (mathBtn.length) {
                  mathBtn.click();
                }
              }
            });
            
            console.log('Summernote initialized');
          },
          onChange: function (contents: string) {
            if (onChange && contents !== undefined) {
              onChange(contents);
            }
            typesetMath();
          },
          onImageUpload: function (files: FileList) {
            handleImageUpload(files);
          },
          onPaste: function (e: any) {
            // Get pasted content
            const clipboardData = e.originalEvent.clipboardData || (window as any).clipboardData;
            const pastedData = clipboardData.getData('text/html') || clipboardData.getData('text/plain');
            
            // Check if it contains LaTeX
            if (pastedData && (pastedData.includes('$$') || pastedData.includes('$') || pastedData.includes('\\['))) {
              e.preventDefault();
              
              // Process the LaTeX content
              const processedContent = processLatexContent(pastedData);
              
              // Insert the processed content
              const $editable = $(editorRef.current);
              $editable.summernote('pasteHTML', processedContent);
              
              // Render math
              setTimeout(() => {
                typesetMath();
              }, 150);
            } else {
              // Normal paste - still render math after
              setTimeout(() => {
                typesetMath();
              }, 150);
            }
          },
          onKeyup: function (e: KeyboardEvent) {
            // Auto-detect and wrap LaTeX on certain keys
            if (e.key === '$' || e.key === ')' || e.key === ']') {
              setTimeout(() => {
                const contents = $(editorRef.current).summernote('code');
                const processed = processLatexContent(contents);
                if (processed !== contents) {
                  $(editorRef.current).summernote('code', processed);
                  typesetMath();
                }
              }, 100);
            }
          },
        },
      });

      isInitialized.current = true;

      // Set initial value and render math
      if (value) {
        const processedValue = processLatexContent(value);
        $(editorRef.current).summernote('code', processedValue);
        setTimeout(() => {
          typesetMath();
        }, 300);
      }

      if (readOnly) {
        $(editorRef.current).summernote('disable');
      }
    } catch (error) {
      console.error('Error initializing Summernote:', error);
    }
  }, [height, placeholder, readOnly, onChange, typesetMath, processLatexContent]);

  // Update content when value changes externally
  useEffect(() => {
    if (isInitialized.current && editorRef.current && window.$) {
      const currentContent = window.$(editorRef.current).summernote('code');
      if (value !== currentContent) {
        const processedValue = processLatexContent(value);
        window.$(editorRef.current).summernote('code', processedValue);
        setTimeout(() => {
          typesetMath();
        }, 200);
      }
    }
  }, [value, processLatexContent, typesetMath]);

  const handleImageUpload = useCallback(
    async (files: FileList) => {
      if (!files || files.length === 0 || !onImageUpload) {
        return;
      }

      const file = files[0];

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPG, PNG, GIF, WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should not exceed 5MB. Please compress your image.');
        return;
      }

      const altText = prompt(
        'Enter alt text for accessibility (important for SEO):'
      ) || 'Image';

      if (!altText) {
        alert('Alt text is required for accessibility');
        return;
      }

      setUploading(true);

      try {
        const imageUrl = await onImageUpload(file, altText);

        if (editorRef.current && window.$) {
          const $ = window.$;
          const img = $('<img>')
            .attr('src', imageUrl)
            .attr('alt', altText)
            .attr('loading', 'lazy')
            .css({
              'max-width': '100%',
              'height': 'auto',
              'border-radius': '8px',
              'margin': '10px 0',
            });

          $(editorRef.current).summernote('insertNode', img[0]);
        }
      } catch (error) {
        console.error('Image upload error:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [onImageUpload]
  );

  return (
    <div ref={containerRef} className="summernote-wrapper">
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded">
          <div className="bg-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-gray-700 font-medium">Uploading image...</span>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className="note-editable"
        style={{
          minHeight: `${height}px`,
          border: '1px solid #d1d5db',
          borderRadius: '0.5rem',
        }}
      />

      <style jsx global>{`
        .summernote-wrapper {
          width: 100%;
        }

        /* Summernote Editor Styling */
        .note-editor {
          border: 1px solid #d1d5db !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .note-editor.note-frame {
          border: 1px solid #d1d5db !important;
        }

        .note-editor .note-toolbar {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-bottom: 1px solid #e5e7eb !important;
          padding: 0.5rem 0.5rem;
          border-radius: 0.5rem 0.5rem 0 0;
          flex-wrap: wrap;
        }

        .note-editor .note-editing-area {
          border-radius: 0;
        }

        .note-editor .note-editable {
          padding: 1.5rem;
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
          font-size: 1rem;
          line-height: 1.75;
          color: #374151;
          background: white;
        }

        .note-editor .note-editable:focus {
          outline: none;
          background: white;
        }

        .note-editor .note-statusbar {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb !important;
          border-radius: 0 0 0.5rem 0.5rem;
        }

        /* Toolbar buttons */
        .note-btn-group {
          margin: 0.25rem 0.25rem;
        }

        .note-btn {
          background: white !important;
          border: 1px solid #d1d5db !important;
          color: #374151 !important;
          padding: 0.5rem 0.75rem !important;
          border-radius: 0.375rem !important;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .note-btn:hover {
          background: #f3f4f6 !important;
          border-color: #9ca3af !important;
        }

        .note-btn.active {
          background: #3b82f6 !important;
          color: white !important;
          border-color: #3b82f6 !important;
        }

        .note-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Dropdown menus */
        .note-dropdown-menu {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .note-dropdown-menu .note-dropdown-item {
          padding: 0.5rem 1rem;
          color: #374151;
        }

        .note-dropdown-menu .note-dropdown-item:hover {
          background: #f3f4f6;
          color: #1f2937;
        }

        /* Lists styling */
        .note-editable ul,
        .note-editable ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .note-editable ul {
          list-style-type: disc;
        }

        .note-editable ol {
          list-style-type: decimal;
        }

        .note-editable li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .note-editable ul ul,
        .note-editable ol ol {
          margin: 0.5rem 0;
          padding-left: 2rem;
        }

        .note-editable ul ul {
          list-style-type: circle;
        }

        .note-editable ol ol {
          list-style-type: lower-alpha;
        }

        /* Image styling */
        .note-editable img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Link styling */
        .note-editable a {
          color: #2563eb;
          text-decoration: underline;
          word-break: break-word;
        }

        .note-editable a:hover {
          color: #1d4ed8;
        }

        .note-editable a.affiliate-link {
          color: #dc2626;
          font-weight: 500;
        }

        .note-editable a.affiliate-link::after {
          content: ' 🔗';
          font-size: 0.85em;
          margin-left: 2px;
        }

        /* Enhanced Math equations styling */
        .note-editable .math-equation {
          display: inline-block;
          padding: 0.5rem 0.75rem;
          margin: 0.25rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 6px;
          font-family: 'Times New Roman', serif;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .note-editable .math-equation:hover {
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          border-color: #7dd3fc;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
        }

        .note-editable .math-equation[data-type="inline"] {
          display: inline;
          padding: 0.15rem 0.4rem;
          margin: 0 0.15rem;
          vertical-align: middle;
        }

        .note-editable .math-equation[data-type="display"] {
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

        .note-editable .math-equation[data-type="display"]:hover {
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        /* MathJax rendered content styling */
        .note-editable mjx-container {
          display: inline !important;
          margin: 0 0.25em;
        }

        .note-editable mjx-container[display="true"] {
          display: block !important;
          text-align: center;
          margin: 1.5rem auto;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .note-editable mjx-container svg {
          max-width: 100%;
          height: auto;
        }

        /* Make math equations non-editable */
        .note-editable .math-equation[contenteditable="false"] {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        /* Product review box */
        .note-editable .product-review-box {
          border: 2px solid #3b82f6;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin: 1.5rem 0;
          background: #f0f9ff;
          page-break-inside: avoid;
        }

        .note-editable .product-review-box h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #1e40af;
          font-size: 1.25rem;
        }

        .note-editable .product-review-box h4 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .note-editable .review-rating {
          font-size: 1.1rem;
          margin: 1rem 0;
        }

        .note-editable .review-section ul {
          margin: 0.5rem 0;
        }

        .note-editable .review-verdict {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-left: 4px solid #3b82f6;
          border-radius: 0.375rem;
        }

        /* Code styling - Enhanced for syntax highlighting */
        .note-editable code {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
          font-size: 0.9em;
        }

        .note-editable pre {
          background: #2d2d2d;
          color: #f8f8f2;
          padding: 1.5rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
          line-height: 1.5;
          border: 1px solid #404040;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .note-editable pre code {
          background: transparent;
          color: inherit;
          padding: 0;
          border-radius: 0;
          display: block;
        }

        /* Prism.js theme integration */
        .note-editable pre[class*="language-"],
        .note-editable code[class*="language-"] {
          color: #f8f8f2;
          background: #2d2d2d;
          text-shadow: 0 1px rgba(0, 0, 0, 0.3);
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
          font-size: 14px;
          line-height: 1.5;
          tab-size: 4;
        }

        .note-editable pre[class*="language-"] {
          padding: 1.5rem;
          margin: 1rem 0;
          overflow: auto;
          border-radius: 0.5rem;
        }

        /* Syntax highlighting colors */
        .note-editable .token.comment,
        .note-editable .token.prolog,
        .note-editable .token.doctype,
        .note-editable .token.cdata {
          color: #999;
        }

        .note-editable .token.punctuation {
          color: #ccc;
        }

        .note-editable .token.property,
        .note-editable .token.tag,
        .note-editable .token.boolean,
        .note-editable .token.number,
        .note-editable .token.constant,
        .note-editable .token.symbol,
        .note-editable .token.deleted {
          color: #f92672;
        }

        .note-editable .token.selector,
        .note-editable .token.attr-name,
        .note-editable .token.string,
        .note-editable .token.char,
        .note-editable .token.builtin,
        .note-editable .token.inserted {
          color: #a6e22e;
        }

        .note-editable .token.operator,
        .note-editable .token.entity,
        .note-editable .token.url,
        .note-editable .language-css .token.string,
        .note-editable .style .token.string {
          color: #f8f8f2;
        }

        .note-editable .token.atrule,
        .note-editable .token.attr-value,
        .note-editable .token.keyword {
          color: #66d9ef;
        }

        .note-editable .token.function,
        .note-editable .token.class-name {
          color: #e6db74;
        }

        .note-editable .token.regex,
        .note-editable .token.important,
        .note-editable .token.variable {
          color: #fd971f;
        }

        /* Blockquote styling */
        .note-editable blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }

        /* Table styling */
        .note-editable table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .note-editable th,
        .note-editable td {
          border: 1px solid #d1d5db;
          padding: 0.75rem;
          text-align: left;
        }

        .note-editable th {
          background: #f3f4f6;
          font-weight: 600;
          color: #1f2937;
        }

        .note-editable tr:nth-child(even) {
          background: #f9fafb;
        }

        /* Video styling */
        .note-editable iframe {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        /* HR styling */
        .note-editable hr {
          border: none;
          border-top: 2px solid #d1d5db;
          margin: 1.5rem 0;
        }

        /* Popover styling */
        .note-popover {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .note-popover .note-popover-inner {
          padding: 0.5rem;
        }

        /* Modal styling */
        .note-modal-backdrop {
          background: rgba(0, 0, 0, 0.5);
        }

        .note-modal {
          border-radius: 0.5rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        /* Help dialog */
        .note-help-dialog {
          border-radius: 0.5rem;
        }

        /* Fullscreen mode */
        .note-editor.fullscreen {
          border-radius: 0;
        }

        /* Placeholder text */
        .note-placeholder {
          color: #9ca3af;
          font-style: italic;
        }

        /* Selection highlighting */
        .note-editable ::selection {
          background: #3b82f6;
          color: white;
        }

        /* Focus state */
        .note-editor.note-frame.focused {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Disable drag overlay */
        .note-drag-n-drop-overlay {
          background: rgba(59, 130, 246, 0.1);
          border: 2px dashed #3b82f6;
          border-radius: 0.5rem;
        }

        /* Print styles */
        @media print {
          .note-editor,
          .note-toolbar {
            border: none;
            box-shadow: none;
          }

          .note-toolbar,
          .note-statusbar {
            display: none;
          }

          .note-editable {
            padding: 0;
          }
          
          .note-editable .math-equation {
            background: transparent;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
