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
    if (html.includes('class="math-equation"')) {
      return html;
    }

    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
      return `<div class="math-equation" data-type="display">$$${latex.trim()}$$</div>`;
    });

    html = html.replace(/\\\[([\s\S]+?)\\\]/g, (match, latex) => {
      return `<div class="math-equation" data-type="display">\\[${latex.trim()}\\]</div>`;
    });

    html = html.replace(/\$([^\$\n]+?)\$/g, (match, latex) => {
      if (match.includes('$$')) return match;
      return `<span class="math-equation" data-type="inline">$${latex.trim()}$</span>`;
    });

    html = html.replace(/\\\(([^\)]+?)\\\)/g, (match, latex) => {
      return `<span class="math-equation" data-type="inline">\\(${latex.trim()}\\)</span>`;
    });

    return html;
  }, []);

  // Function to clean and validate links in content
  const cleanLinksInContent = useCallback((html: string): string => {
    if (!html) return html;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const links = tempDiv.querySelectorAll('a');
    
    links.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();
      
      // Fix 1: Remove links without href
      if (!href || href === '' || href === '#') {
        console.warn('Removing link without href:', link.outerHTML);
        const textNode = document.createTextNode(text || '');
        link.parentNode?.replaceChild(textNode, link);
        return;
      }
      
      // Fix 2: Add text to empty links (use href as text)
      if (!text || text === '') {
        console.warn('Adding text to empty link:', href);
        link.textContent = href;
      }
      
      // Fix 3: Fix target="_new" to target="_blank"
      const target = link.getAttribute('target');
      if (target === '_new' || target === 'new') {
        link.setAttribute('target', '_blank');
      }
      
      // Fix 4: Ensure proper rel attributes for external links
      if (target === '_blank' || link.getAttribute('target') === '_blank') {
        const currentRel = link.getAttribute('rel') || '';
        const relParts = currentRel.split(' ').filter(Boolean);
        
        if (!relParts.includes('noopener')) relParts.push('noopener');
        if (!relParts.includes('noreferrer')) relParts.push('noreferrer');
        
        link.setAttribute('rel', relParts.join(' '));
      }
      
      // Fix 5: Remove data-start and data-end attributes
      link.removeAttribute('data-start');
      link.removeAttribute('data-end');
      
      // Fix 6: Remove cursor-pointer class
      if (link.classList.contains('cursor-pointer')) {
        link.classList.remove('cursor-pointer');
      }
      
      // Fix 7: Ensure href has protocol
      let cleanHref = href.trim();
      if (cleanHref && !cleanHref.match(/^(https?|mailto|tel):/i)) {
        cleanHref = 'https://' + cleanHref;
        link.setAttribute('href', cleanHref);
      }
    });
    
    return tempDiv.innerHTML;
  }, []);

  // Custom link dialog with proper validation
  const showCustomLinkDialog = useCallback(() => {
    if (!editorRef.current || !window.$) return;
    
    const $ = window.$;
    
    // Get selected text
    const selectedText = window.getSelection()?.toString() || '';
    
    // Remove existing modal if any
    $('#customLinkModal').remove();
    
    // Create modal HTML
    const modalHTML = `
      <div class="modal fade" id="customLinkModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Insert Link</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label for="linkText">Link Text * <small class="text-muted">(Required for accessibility)</small></label>
                <input type="text" class="form-control" id="linkText" 
                  placeholder="Enter visible link text" 
                  value="${selectedText.replace(/"/g, '&quot;')}" required>
                <small class="form-text text-muted">This text will be visible to users and screen readers</small>
              </div>
              <div class="form-group">
                <label for="linkUrl">URL * <small class="text-muted">(Must start with http:// or https://)</small></label>
                <input type="url" class="form-control" id="linkUrl" 
                  placeholder="https://example.com" required>
                <small class="form-text text-muted">The web address this link points to</small>
              </div>
              <div class="form-group">
                <label for="linkTarget">Open Link:</label>
                <select class="form-control" id="linkTarget">
                  <option value="_self">Same window</option>
                  <option value="_blank" selected>New window/tab</option>
                </select>
              </div>
              <div class="form-check">
                <input type="checkbox" class="form-check-input" id="linkNofollow">
                <label class="form-check-label" for="linkNofollow">
                  Add nofollow (for external/sponsored links)
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="insertLinkBtn">Insert Link</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to body
    $('body').append(modalHTML);
    
    // Show modal
    $('#customLinkModal').modal('show');
    
    // Focus on text input if empty, otherwise URL input
    $('#customLinkModal').on('shown.bs.modal', function () {
      if (!selectedText) {
        $('#linkText').focus();
      } else {
        $('#linkUrl').focus();
      }
    });
    
    // Handle Enter key in inputs
    $('#linkText, #linkUrl').on('keypress', function(e: any) {
      if (e.which === 13) {
        e.preventDefault();
        $('#insertLinkBtn').click();
      }
    });
    
    // Handle insert button
    $('#insertLinkBtn').off('click').on('click', function() {
      const text = $('#linkText').val() as string;
      const url = $('#linkUrl').val() as string;
      const target = $('#linkTarget').val() as string;
      const nofollow = $('#linkNofollow').is(':checked');
      
      // Validate link text
      if (!text || !text.trim()) {
        alert('Link text is required for accessibility and SEO.\n\nScreen readers need descriptive text to announce links to users.');
        $('#linkText').focus();
        return;
      }
      
      // Validate URL
      if (!url || !url.trim()) {
        alert('URL is required');
        $('#linkUrl').focus();
        return;
      }
      
      let validUrl = url.trim();
      
      // Add protocol if missing
      if (!validUrl.match(/^https?:\/\//i)) {
        validUrl = 'https://' + validUrl;
      }
      
      // Validate URL format
      try {
        new URL(validUrl);
      } catch (e) {
        alert('Invalid URL format.\n\nPlease enter a valid URL like:\nhttps://example.com\nhttps://www.google.com');
        $('#linkUrl').focus();
        return;
      }
      
      // Build rel attribute
      let relParts = [];
      if (target === '_blank') {
        relParts.push('noopener', 'noreferrer');
      }
      if (nofollow) {
        relParts.push('nofollow');
      }
      const relAttr = relParts.length > 0 ? ` rel="${relParts.join(' ')}"` : '';
      
      // Create link HTML
      const linkHtml = `<a href="${validUrl.replace(/"/g, '&quot;')}" target="${target}"${relAttr}>${text.trim()}</a>`;
      
      // Insert the link
      $(editorRef.current).summernote('pasteHTML', linkHtml);
      
      // Close modal
      $('#customLinkModal').modal('hide');
      
      // Remove modal from DOM after it's hidden
      $('#customLinkModal').on('hidden.bs.modal', function () {
        $(this).remove();
      });
    });
    
    // Clean up modal on close
    $('#customLinkModal').on('hidden.bs.modal', function () {
      $(this).remove();
    });
  }, []);

  // Load all required libraries
  useEffect(() => {
    const loadLibraries = async () => {
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

      // Load Prism.js CSS
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
        const prismScript = document.createElement('script');
        prismScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
        prismScript.setAttribute('data-summernote', 'true');
        prismScript.onload = loadPrismLanguages;
        document.head.appendChild(prismScript);
      }

      function loadPrismLanguages() {
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
        tooltip: 'Insert Affiliate Link (with nofollow)',
        click: function () {
          $('#affiliateLinkModal').remove();
          
          const modalHTML = `
            <div class="modal fade" id="affiliateLinkModal" tabindex="-1">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header bg-warning">
                    <h5 class="modal-title">🔗 Insert Affiliate Link</h5>
                    <button type="button" class="close" data-dismiss="modal">
                      <span>&times;</span>
                    </button>
                  </div>
                  <div class="modal-body">
                    <div class="alert alert-info">
                      <strong>Note:</strong> Affiliate links will automatically include "nofollow" and "sponsored" attributes for SEO compliance.
                    </div>
                    <div class="form-group">
                      <label for="affiliateText">Link Text * <small>(Required)</small></label>
                      <input type="text" class="form-control" id="affiliateText" 
                        placeholder="e.g., Buy on Amazon" required>
                    </div>
                    <div class="form-group">
                      <label for="affiliateUrl">Affiliate URL *</label>
                      <input type="url" class="form-control" id="affiliateUrl" 
                        placeholder="https://amazon.com/..." required>
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-warning" id="insertAffiliateBtn">Insert Affiliate Link</button>
                  </div>
                </div>
              </div>
            </div>
          `;
          
          $('body').append(modalHTML);
          $('#affiliateLinkModal').modal('show');
          
          $('#affiliateLinkModal').on('shown.bs.modal', function () {
            $('#affiliateText').focus();
          });
          
          $('#insertAffiliateBtn').off('click').on('click', function() {
            const text = $('#affiliateText').val() as string;
            const url = $('#affiliateUrl').val() as string;
            
            if (!text || !text.trim()) {
              alert('Link text is required for accessibility');
              $('#affiliateText').focus();
              return;
            }
            
            if (!url || !url.trim()) {
              alert('Affiliate URL is required');
              $('#affiliateUrl').focus();
              return;
            }
            
            let validUrl = url.trim();
            if (!validUrl.match(/^https?:\/\//i)) {
              validUrl = 'https://' + validUrl;
            }
            
            try {
              new URL(validUrl);
            } catch (e) {
              alert('Invalid URL format');
              $('#affiliateUrl').focus();
              return;
            }
            
            const linkHtml = `<a href="${validUrl.replace(/"/g, '&quot;')}" rel="nofollow noopener noreferrer sponsored" target="_blank" class="affiliate-link" data-affiliate="true">${text.trim()}</a>`;
            
            context.invoke('pasteHTML', linkHtml);
            $('#affiliateLinkModal').modal('hide');
            
            $('#affiliateLinkModal').on('hidden.bs.modal', function () {
              $(this).remove();
            });
          });
          
          $('#affiliateLinkModal').on('hidden.bs.modal', function () {
            $(this).remove();
          });
        },
      });
      return button.render();
    };

    // Enhanced Math button
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

    // Product Review button
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

    // Code Block button
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
          
          $('#codeBlockModal').remove();
          $('body').append(modalHTML);
          $('#codeBlockModal').modal('show');
          
          $('#insertCodeBtn').off('click').on('click', function() {
            const language = $('#codeLanguage').val();
            const code = $('#codeContent').val();
            
            if (!code.trim()) {
              alert('Please enter some code');
              return;
            }
            
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
        dialogsInBody: true,
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
            
            // Override the link button to use custom dialog
            const $editor = $(editorRef.current).next('.note-editor');
            $editor.find('.note-btn[data-event="showLinkDialog"]').off('click').on('click', function(e: any) {
              e.preventDefault();
              showCustomLinkDialog();
            });
            
            // Add keyboard shortcut for math
            editable.on('keydown', function(e: any) {
              if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                const mathBtn = $(editorRef.current).next('.note-editor').find('.note-btn').filter(function() {
                  return $(this).attr('data-original-title') === 'Insert Math Equation (Ctrl+M)';
                });
                if (mathBtn.length) {
                  mathBtn.click();
                }
              }
            });
            
            console.log('✅ Summernote initialized with custom link validation');
          },
          
          onCreateLink: function(url: string) {
            console.log('Link being created:', url);
            
            if (!url || !url.trim()) {
              alert('Please enter a valid URL');
              return '';
            }
            
            let validUrl = url.trim();
            if (!validUrl.match(/^https?:\/\//i)) {
              validUrl = 'https://' + validUrl;
            }
            
            try {
              new URL(validUrl);
              return validUrl;
            } catch (e) {
              alert('Invalid URL format. Please enter a valid URL.');
              return '';
            }
          },
          
          onChange: function (contents: string) {
            const cleanedContent = cleanLinksInContent(contents);
            
            if (onChange && cleanedContent !== undefined) {
              onChange(cleanedContent);
            }
            typesetMath();
          },
          
          onImageUpload: function (files: FileList) {
            handleImageUpload(files);
          },
          
          onPaste: function (e: any) {
            const clipboardData = e.originalEvent.clipboardData || (window as any).clipboardData;
            const pastedData = clipboardData.getData('text/html') || clipboardData.getData('text/plain');
            
            if (pastedData && (pastedData.includes('$') || pastedData.includes('\\(') || pastedData.includes('\\['))) {
              e.preventDefault();
              const processedContent = processLatexContent(pastedData);
              const $editable = $(editorRef.current);
              $editable.summernote('pasteHTML', processedContent);
              setTimeout(() => typesetMath(), 150);
            } else {
              setTimeout(() => typesetMath(), 150);
            }
          },
          
          onKeyup: function (e: KeyboardEvent) {
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
  }, [height, placeholder, readOnly, onChange, typesetMath, processLatexContent, cleanLinksInContent, showCustomLinkDialog]);

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

        /* CRITICAL: Visual indicators for broken links during editing */
        .note-editable a:not([href])::before {
          content: '⚠️ NO URL: ';
          color: red;
          font-weight: bold;
          background: #fee;
          padding: 2px 4px;
          border-radius: 3px;
        }

        .note-editable a[href="#"]::before,
        .note-editable a[href=""]::before {
          content: '⚠️ EMPTY: ';
          color: orange;
          font-weight: bold;
          background: #ffc;
          padding: 2px 4px;
          border-radius: 3px;
        }

        .note-editable a:empty::after {
          content: '[No Text]';
          color: red;
          font-weight: bold;
          background: #fee;
          padding: 2px 4px;
          border-radius: 3px;
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

        /* Code styling */
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
