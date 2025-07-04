(function() {
  'use strict';

  // CORS Handler for dom-to-image compatibility
  const CORSHandler = {
    
    // Track external resources that cause CORS issues
    problematicResources: new Set(),
    
    // Initialize CORS handling
    init: function() {
      this.setupStyleSheetHandling();
      this.setupImageHandling();
      this.setupFontHandling();
    },

    // Handle external stylesheets that cause CORS issues
    setupStyleSheetHandling: function() {
      // Monitor for stylesheet loading errors
      const originalAddEventListener = HTMLLinkElement.prototype.addEventListener;
      HTMLLinkElement.prototype.addEventListener = function(type, listener, options) {
        if (type === 'error') {
          const originalListener = listener;
          listener = function(event) {
            const link = event.target;
            if (link.href && (link.href.includes('cdnjs.cloudflare.com') || 
                             link.href.includes('fonts.googleapis.com'))) {
              CORSHandler.problematicResources.add(link.href);
              console.log('CORS issue detected with stylesheet:', link.href);
            }
            return originalListener.call(this, event);
          };
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    },

    // Handle external images that might cause CORS issues
    setupImageHandling: function() {
      const originalImage = window.Image;
      window.Image = function() {
        const img = new originalImage();
        img.crossOrigin = 'anonymous';
        return img;
      };
      window.Image.prototype = originalImage.prototype;
    },

    // Handle external fonts that might cause CORS issues
    setupFontHandling: function() {
      if ('fonts' in document) {
        const originalLoad = document.fonts.load;
        document.fonts.load = function(fontSpec, text) {
          return originalLoad.call(this, fontSpec, text).catch(error => {
            console.log('Font loading failed, using fallback:', error);
            return Promise.resolve([]);
          });
        };
      }
    },

    // Get dom-to-image options with CORS handling
    getDomToImageOptions: function(baseOptions = {}) {
      return {
        ...baseOptions,
        filter: function(node) {
          // Skip problematic external resources
          if (node.tagName === 'LINK' && node.href) {
            if (CORSHandler.problematicResources.has(node.href) ||
                node.href.includes('cdnjs.cloudflare.com') ||
                node.href.includes('fonts.googleapis.com')) {
              return false;
            }
          }
          
          // Skip external images that might cause issues
          if (node.tagName === 'IMG' && node.src && 
              !node.src.startsWith('data:') && 
              !node.src.startsWith('blob:')) {
            try {
              const url = new URL(node.src);
              if (url.origin !== window.location.origin) {
                node.crossOrigin = 'anonymous';
              }
            } catch (e) {
              // Invalid URL, skip
              return false;
            }
          }
          
          return true;
        },
        
        // Use fallback for images that can't be loaded
        imagePlaceholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y0ZjRmNCIvPjwvc3ZnPg==',
        
        // Handle CSS rules access
        onCloneNode: function(clonedNode) {
          // Remove external stylesheets from cloned node
          const links = clonedNode.querySelectorAll('link[rel="stylesheet"]');
          links.forEach(link => {
            if (link.href && (link.href.includes('cdnjs.cloudflare.com') || 
                             link.href.includes('fonts.googleapis.com'))) {
              link.remove();
            }
          });
          return clonedNode;
        }
      };
    },

    // Create a clean version of the output for image generation
    createCleanOutput: function(originalOutput) {
      const clone = originalOutput.cloneNode(true);
      
      // Remove external stylesheets
      const externalLinks = clone.querySelectorAll('link[rel="stylesheet"]');
      externalLinks.forEach(link => {
        if (link.href && (link.href.includes('cdnjs.cloudflare.com') || 
                         link.href.includes('fonts.googleapis.com'))) {
          link.remove();
        }
      });
      
      // Ensure all images have crossOrigin set
      const images = clone.querySelectorAll('img');
      images.forEach(img => {
        if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
          img.crossOrigin = 'anonymous';
        }
      });
      
      return clone;
    }
  };

  // Expose to global scope
  window.CORSHandler = CORSHandler;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CORSHandler.init());
  } else {
    CORSHandler.init();
  }

  // Performance tracking
  if (window.performance && window.performance.mark) {
    window.addEventListener('load', () => {
      performance.mark('cors-handler-initialized');
      performance.measure('cors-handler-setup', 'cors-handler-initialized');
    });
  }
})(); 