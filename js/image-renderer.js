// Canvas Renderer for Image + Chat Overlay Export
// Generates pixel-perfect PNG with overlay

(function () {
  'use strict';

  // Constants
  const IMAGE_LOAD_TIMEOUT_MS = 10000; // 10 seconds
  const CANVAS_IMAGE_FORMAT = 'image/png';
  const CANVAS_IMAGE_QUALITY = 1.0;
  const TEXT_FONT_SIZE = 12; // pixels
  const TEXT_FONT_WEIGHT = 700;
  const TEXT_FONT_FAMILY = 'Arial, sans-serif';
  const TEXT_LINE_HEIGHT_FALLBACK = 16; // pixels
  const TEXT_BASELINE = 'top';
  const TEXT_OFFSET_Y = 1; // pixel offset for text rendering
  const SHADOW_DIRECTIONS = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  const SHADOW_COLOR = '#000000';
  const BACKGROUND_COLOR = '#000000';

  // Canvas safety limits
  const MAX_CANVAS_PIXELS = 268435456; // 16384 x 16384 (common browser limit)
  const MAX_CANVAS_DIMENSION = 32767; // Maximum dimension per side
  const MAX_CANVAS_MEMORY_MB = 512; // Warn if estimated memory > 512MB
  const BYTES_PER_PIXEL = 4; // RGBA

  /**
   * Validate canvas dimensions and estimate memory usage
   * @param {number} width - Canvas width in pixels
   * @param {number} height - Canvas height in pixels
   * @returns {Object} - Validation result {valid: boolean, error: string, warning: string}
   */
  function validateCanvasDimensions(width, height) {
    const result = {
      valid: true,
      error: null,
      warning: null,
    };

    // Check for invalid dimensions
    if (!width || !height || width <= 0 || height <= 0) {
      result.valid = false;
      result.error = `Invalid canvas dimensions: ${width}x${height}. Dimensions must be positive numbers.`;
      return result;
    }

    // Check if dimensions exceed maximum per side
    if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
      result.valid = false;
      result.error = `Canvas dimensions exceed maximum allowed size. Maximum dimension per side is ${MAX_CANVAS_DIMENSION}px. You specified ${width}x${height}.`;
      return result;
    }

    // Check total pixel count
    const totalPixels = width * height;
    if (totalPixels > MAX_CANVAS_PIXELS) {
      result.valid = false;
      result.error = `Canvas dimensions too large. Total pixels (${totalPixels.toLocaleString()}) exceeds maximum (${MAX_CANVAS_PIXELS.toLocaleString()}). Try reducing the export dimensions.`;
      return result;
    }

    // Estimate memory usage (RGBA = 4 bytes per pixel)
    const estimatedMemoryBytes = totalPixels * BYTES_PER_PIXEL;
    const estimatedMemoryMB = Math.round(estimatedMemoryBytes / (1024 * 1024));

    // Warn if memory usage is high
    if (estimatedMemoryMB > MAX_CANVAS_MEMORY_MB) {
      result.warning = `Large canvas detected (${width}x${height}). Estimated memory usage: ${estimatedMemoryMB}MB. This may cause performance issues or fail on some devices.`;
    }

    return result;
  }

  // Expose to global scope
  window.OverlayRenderer = {
    /**
     * Render and download overlay image
     */
    renderAndDownload: async function () {
      try {
        // Validate prerequisites
        if (!window.ImageOverlayState) {
          const error = new Error('Image overlay system not initialized');
          if (window.ErrorLogger) {
            window.ErrorLogger.logError('Overlay renderer prerequisite check failed', {
              error: error.message,
              imageOverlayState: !!window.ImageOverlayState,
              context: 'renderAndDownload validation',
            });
          }
          throw error;
        }

        if (!window.ImageDropZone?.state?.droppedImageSrc) {
          const error = new Error('No image loaded. Please upload an image first.');
          if (window.ErrorLogger) {
            window.ErrorLogger.logError('No image loaded for overlay rendering', {
              error: error.message,
              imageDropZone: !!window.ImageDropZone,
              droppedImageSrc: !!window.ImageDropZone?.state?.droppedImageSrc,
              context: 'renderAndDownload validation',
            });
          }
          throw error;
        }

        if (!document.getElementById('output')?.querySelector('.generated')) {
          const error = new Error('No chat messages to render. Please generate some chat first.');
          if (window.ErrorLogger) {
            window.ErrorLogger.logError('No chat messages for overlay rendering', {
              error: error.message,
              outputElement: !!document.getElementById('output'),
              generatedCount:
                document.getElementById('output')?.querySelectorAll('.generated').length || 0,
              context: 'renderAndDownload validation',
            });
          }
          throw error;
        }

        showLoadingIndicator();

        const blob = await this.renderOverlayImage();

        if (!blob) {
          const error = new Error('Failed to generate image blob');
          if (window.ErrorLogger) {
            window.ErrorLogger.logError('Blob generation failed', {
              error: error.message,
              blobType: typeof blob,
              context: 'renderAndDownload blob check',
            });
          }
          throw error;
        }

        const filename = this.generateFilename();
        window.saveAs(blob, filename);

        if (window.ErrorLogger) {
          window.ErrorLogger.logInfo('Overlay image rendered successfully', {
            filename,
            blobSize: blob.size,
            blobType: blob.type,
          });
        }
      } catch (error) {
        if (window.ErrorLogger) {
          window.ErrorLogger.logError('Overlay render and download failed', {
            error: error.message,
            stack: error.stack,
            context: 'renderAndDownload main',
          });
        }
        const userMessage =
          error.message || 'There was an error generating the overlay image. Please try again.';
        alert(userMessage);
      } finally {
        hideLoadingIndicator();
      }
    },

    /**
     * Render overlay image to canvas and return blob
     * Uses dom-to-image to capture the dropzone with all CSS styling intact
     */
    renderOverlayImage: async function () {
      try {
        if (!window.ImageOverlayState || !window.ImageDropZone) {
          const error = new Error('Image overlay system not initialized');
          if (window.ErrorLogger) {
            window.ErrorLogger.logError('Overlay system check failed', {
              error: error.message,
              imageOverlayState: !!window.ImageOverlayState,
              imageDropZone: !!window.ImageDropZone,
              context: 'renderOverlayImage initialization',
            });
          }
          throw error;
        }

        // Get the dropzone element that contains both image and overlay
        const dropzone = document.getElementById('imageDropzone');
        if (!dropzone) {
          const error = new Error('Image dropzone not found');
          if (window.ErrorLogger) {
            window.ErrorLogger.logError('Dropzone element not found', {
              error: error.message,
              context: 'renderOverlayImage dropzone lookup',
            });
          }
          throw error;
        }

        // Get custom dimensions from inputs
        const exportWidthInput = document.getElementById('exportWidth');
        const exportHeightInput = document.getElementById('exportHeight');
        const exportPPIInput = document.getElementById('exportPPI');

        const exportWidth = exportWidthInput ? parseInt(exportWidthInput.value) || 1600 : 1600;
        const exportHeight = exportHeightInput ? parseInt(exportHeightInput.value) || 1200 : 1200;
        const exportPPI = exportPPIInput ? parseInt(exportPPIInput.value) || 96 : 96;

        if (window.ErrorLogger) {
          window.ErrorLogger.logInfo('Starting overlay image render', {
            exportWidth,
            exportHeight,
            exportPPI,
            context: 'renderOverlayImage dimensions',
          });
        }

        // Validate canvas dimensions
        const validation = validateCanvasDimensions(exportWidth, exportHeight);
        if (!validation.valid) {
          const error = new Error(validation.error);
          if (window.ErrorLogger) {
            window.ErrorLogger.logError('Canvas dimension validation failed', {
              error: error.message,
              exportWidth,
              exportHeight,
              context: 'renderOverlayImage validation',
            });
          }
          throw error;
        }

        if (validation.warning && window.ErrorLogger) {
          window.ErrorLogger.logWarning('Canvas dimension warning', {
            warning: validation.warning,
            exportWidth,
            exportHeight,
            context: 'renderOverlayImage validation',
          });
        }

        // Use manual canvas rendering to capture exactly what's on screen
        // This respects all CSS transforms applied to the overlay
        const canvas = document.createElement('canvas');
        canvas.width = exportWidth;
        canvas.height = exportHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Calculate scale ratios
        const dropzoneRect = dropzone.getBoundingClientRect();
        const scaleRatioX = exportWidth / dropzoneRect.width;
        const scaleRatioY = exportHeight / dropzoneRect.height;

        // 1. Draw black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, exportWidth, exportHeight);

        // 2. Draw the background image with its transforms
        await this.drawImageWithTransforms(
          ctx,
          exportWidth,
          exportHeight,
          scaleRatioX,
          scaleRatioY
        );

        // 3. Draw the chat overlay - use dom-to-image to capture CSS-styled overlay
        const overlayContainer = document.querySelector('.chat-overlay-container');
        if (overlayContainer) {
          try {
            // Capture the overlay container as an image (preserves all CSS styling)
            const overlayBlob = await domtoimage.toBlob(overlayContainer, {
              fontEmbedFn: () => Promise.resolve(null),
            });

            // Convert blob to image
            const overlayImg = await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = URL.createObjectURL(overlayBlob);
            });

            // Get overlay transform from state
            const state = window.ImageOverlayState;
            const scaledChatX = state.chatTransform.x * scaleRatioX;
            const scaledChatY = state.chatTransform.y * scaleRatioY;

            // Draw the overlay image with transforms
            ctx.save();
            ctx.translate(scaledChatX, scaledChatY);
            ctx.scale(state.chatTransform.scale, state.chatTransform.scale);
            ctx.drawImage(overlayImg, 0, 0);
            ctx.restore();

            // Clean up
            URL.revokeObjectURL(overlayImg.src);
          } catch (error) {
            // Fallback to manual drawing if dom-to-image fails
            if (window.ErrorLogger) {
              window.ErrorLogger.logWarning('Overlay capture failed, using fallback', {
                error: error.message,
                context: 'renderOverlayImage overlay capture',
              });
            }
            await this.drawChatOverlay(ctx, exportWidth, exportHeight, scaleRatioX, scaleRatioY);
          }
        } else {
          // No overlay container, use manual drawing
          await this.drawChatOverlay(ctx, exportWidth, exportHeight, scaleRatioX, scaleRatioY);
        }

        // Convert canvas to blob
        let blob;
        try {
          blob = await new Promise((resolve, reject) => {
            canvas.toBlob((b) => {
              if (!b) reject(new Error('Failed to create blob from canvas'));
              else resolve(b);
            }, 'image/png');
          });

          if (window.ErrorLogger) {
            window.ErrorLogger.logInfo('Canvas blob created', {
              blobSize: blob?.size,
              blobType: blob?.type,
              exportWidth,
              exportHeight,
              context: 'renderOverlayImage canvas',
            });
          }
        } catch (error) {
          if (window.ErrorLogger) {
            window.ErrorLogger.logError('Canvas blob creation failed', {
              error: error.message,
              stack: error.stack,
              exportWidth,
              exportHeight,
              context: 'renderOverlayImage canvas',
            });
          }
          throw new Error(`Failed to create canvas blob: ${error.message}`);
        }

        // Add PPI metadata to the blob
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const pngWithPPI = this.injectPNGPPI(arrayBuffer, exportPPI);
          const finalBlob = new Blob([pngWithPPI], { type: 'image/png' });

          if (window.ErrorLogger) {
            window.ErrorLogger.logInfo('PPI metadata injected successfully', {
              originalSize: blob.size,
              finalSize: finalBlob.size,
              ppi: exportPPI,
              context: 'renderOverlayImage PPI injection',
            });
          }

          return finalBlob;
        } catch (error) {
          if (window.ErrorLogger) {
            window.ErrorLogger.logWarning('PPI metadata injection failed, using original blob', {
              error: error.message,
              blobSize: blob.size,
              context: 'renderOverlayImage PPI injection',
            });
          }
          return blob;
        }
      } catch (error) {
        if (window.ErrorLogger) {
          window.ErrorLogger.logError('renderOverlayImage failed', {
            error: error.message,
            stack: error.stack,
            context: 'renderOverlayImage main',
          });
        }
        throw error;
      }
    },

    /**
     * Draw image with transforms
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width in pixels
     * @param {number} canvasHeight - Canvas height in pixels
     * @param {number} scaleRatioX - Scale ratio for width (export/display)
     * @param {number} scaleRatioY - Scale ratio for height (export/display)
     */
    drawImageWithTransforms: async function (
      ctx,
      canvasWidth,
      canvasHeight,
      scaleRatioX = 1.0,
      scaleRatioY = 1.0
    ) {
      const state = window.ImageOverlayState;
      const imgSrc = window.ImageDropZone?.state?.droppedImageSrc;

      if (!imgSrc || !state?.imageElement) {
        console.warn('[Renderer] Skipping image draw - no image source or element');
        return;
      }

      if (!state.imageTransform) {
        console.warn('[Renderer] Skipping image draw - no transform data');
        return;
      }

      // Load image with error handling
      const img = new Image();
      img.src = imgSrc;

      try {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load image for rendering'));
          // Timeout after configured time
          setTimeout(() => reject(new Error('Image load timeout')), IMAGE_LOAD_TIMEOUT_MS);
        });
      } catch (error) {
        console.error('[Renderer] Image load failed:', error);

        const errorInfo = {
          message: error.message,
          context: 'Image loading for canvas rendering',
          timeout: IMAGE_LOAD_TIMEOUT_MS,
          imageSource: imgSrc?.substring(0, 100) + '...', // Log first 100 chars
        };

        if (window.ImageErrorHandler) {
          window.ImageErrorHandler.logImageError(errorInfo);
        }

        throw new Error(
          'Failed to load image. The image may be too large or corrupted. Please try uploading a smaller image or refresh the page.'
        );
      }

      // Calculate object-fit: contain dimensions
      const imageAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = canvasWidth / canvasHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imageAspect > canvasAspect) {
        // Image is wider (letterbox)
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imageAspect;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
      } else {
        // Image is taller (pillarbox)
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imageAspect;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
      }

      // Apply transforms scaled to export dimensions (WYSIWYG)
      ctx.save();

      // Scale the user's transforms by the ratio between export and display
      const scaledTransformX = state.imageTransform.x * scaleRatioX;
      const scaledTransformY = state.imageTransform.y * scaleRatioY;

      // Calculate where the image center ends up after base positioning and translation
      const centerX = offsetX + drawWidth / 2 + scaledTransformX;
      const centerY = offsetY + drawHeight / 2 + scaledTransformY;

      // Move to the final center position
      ctx.translate(centerX, centerY);

      // Apply scaling (scale value stays the same regardless of export/display ratio)
      ctx.scale(state.imageTransform.scale, state.imageTransform.scale);

      // Draw image centered on the current point
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      ctx.restore();
    },

    /**
     * Draw chat overlay with transforms
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width in pixels
     * @param {number} canvasHeight - Canvas height in pixels
     * @param {number} scaleRatioX - Scale ratio for width (export/display)
     * @param {number} scaleRatioY - Scale ratio for height (export/display)
     */
    drawChatOverlay: async function (
      ctx,
      canvasWidth,
      canvasHeight,
      scaleRatioX = 1.0,
      scaleRatioY = 1.0
    ) {
      const state = window.ImageOverlayState;

      // Get chat lines from output
      const output = document.getElementById('output');
      if (!output) return;

      const generatedLines = output.querySelectorAll('.generated');
      if (generatedLines.length === 0) return;

      // Get text padding from input fields
      const textPaddingHorizontal = document.getElementById('textPaddingHorizontal');
      const textPaddingVertical = document.getElementById('textPaddingVertical');
      const paddingH = parseInt(textPaddingHorizontal?.value) || 0;
      const paddingV = parseInt(textPaddingVertical?.value) || 0;

      // Check if background is active - use global state variable set by chatlog-parser
      const hasBackground = ChatlogParser.backgroundActive || false;

      // Apply transforms scaled to export dimensions (WYSIWYG)
      ctx.save();

      // Scale the user's chat transforms by the ratio between export and display
      const scaledChatX = state.chatTransform.x * scaleRatioX;
      const scaledChatY = state.chatTransform.y * scaleRatioY;

      ctx.translate(scaledChatX, scaledChatY);
      ctx.scale(state.chatTransform.scale, state.chatTransform.scale);

      // Get font size from input field (matches actual chat display)
      const fontSizeInput = document.getElementById('font-label');
      const fontSize = fontSizeInput
        ? parseInt(fontSizeInput.value) || TEXT_FONT_SIZE
        : TEXT_FONT_SIZE;

      // Setup text rendering
      ctx.font = `${TEXT_FONT_WEIGHT} ${fontSize}px ${TEXT_FONT_FAMILY}`;
      ctx.textBaseline = TEXT_BASELINE;

      // Get computed style from actual chat element for accurate rendering
      const chatElement = document.querySelector('.chat-overlay-container');
      const computedStyle = chatElement ? window.getComputedStyle(chatElement) : null;
      let LINE_HEIGHT = TEXT_LINE_HEIGHT_FALLBACK;
      if (computedStyle) {
        const lineHeightStr = computedStyle.lineHeight;
        const lineHeightValue = parseFloat(lineHeightStr);
        if (!isNaN(lineHeightValue)) {
          // If it's a unitless value like "1.3", multiply by font size
          // If it's already in pixels like "15.6px", parseFloat returns 15.6
          LINE_HEIGHT = lineHeightStr.includes('px') ? lineHeightValue : lineHeightValue * fontSize;
        }
      }

      // Color mapping - extract from CSS custom properties
      const getCSSVariable = (varName) => {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      };

      // Reserved for future use - color mapping from CSS variables
      const _colors = {
        white: getCSSVariable('--white-color') || '#f1f1f1',
        grey: getCSSVariable('--grey-color') || '#939799',
        lightgrey: getCSSVariable('--lightgrey-color') || '#c6c4c4',
        yellow: getCSSVariable('--yellow-color') || '#fbf724',
        green: getCSSVariable('--green-color') || '#56d64b',
        orange: getCSSVariable('--orange-color') || '#eda841',
        blue: getCSSVariable('--blue-color') || '#3896f3',
        darkgrey: getCSSVariable('--darkgrey-color') || '#5a5a5b',
        me: getCSSVariable('--me-color') || '#c2a3da',
        ame: getCSSVariable('--ame-color') || '#c2a3da',
        toyou: getCSSVariable('--toyou-color') || '#ff00bc',
        death: getCSSVariable('--death-color') || '#f00000',
      };

      let currentY = paddingV;

      // Process each .generated element - these already have <br> tags from chatlog-parser.js
      generatedLines.forEach((line) => {
        // Parse the HTML structure to extract visual lines (separated by <br>)
        // This reuses the existing line break logic from addLineBreaksAndHandleSpans()
        const visualLines = this.parseHTMLToVisualLines(line);

        // Draw each visual line
        visualLines.forEach((visualLine) => {
          let currentX = paddingH;

          // If background is active, measure the line width first and draw black rectangle
          if (hasBackground) {
            let lineWidth = 0;
            visualLine.forEach((segment) => {
              lineWidth += ctx.measureText(segment.text).width;
            });

            // Draw black background bar with padding (matching CSS: padding: 1px 4px)
            const bgPaddingH = 4; // horizontal padding
            const bgPaddingTop = 1; // padding-top
            const bgPaddingBottom = 1; // padding-bottom
            ctx.fillStyle = BACKGROUND_COLOR;
            const rectX = currentX - bgPaddingH;
            const rectY = currentY - bgPaddingTop; // Shift up to account for top padding
            const rectW = lineWidth + bgPaddingH * 2;
            const rectH = LINE_HEIGHT + bgPaddingTop + bgPaddingBottom; // Include both paddings
            ctx.fillRect(rectX, rectY, rectW, rectH);
          }

          // Draw each text segment in this visual line
          visualLine.forEach((segment) => {
            this.drawTextWithOutline(ctx, segment.text, currentX, currentY, segment.color);
            currentX += ctx.measureText(segment.text).width;
          });

          currentY += LINE_HEIGHT;
        });
      });

      ctx.restore();
    },

    /**
     * Parse HTML structure to extract visual lines (separated by <br> tags)
     * This reuses the existing line break logic from chatlog-parser.js
     * @param {HTMLElement} element - The .generated element with HTML and <br> tags
     * @returns {Array} Array of visual lines, each containing {text, color} segments
     */
    parseHTMLToVisualLines: function (element) {
      const visualLines = [];
      let currentLine = [];

      // Helper function to get computed color from an element
      const getColor = (el) => {
        const style = window.getComputedStyle(el);
        return style.color || '#f1f1f1';
      };

      // Recursively process nodes
      const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text) {
            // Get color from parent span
            const parentSpan = node.parentElement;
            const color =
              parentSpan && parentSpan.tagName === 'SPAN' ? getColor(parentSpan) : '#f1f1f1';
            currentLine.push({ text, color });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'BR') {
            // Line break - save current line and start new one
            if (currentLine.length > 0) {
              visualLines.push(currentLine);
              currentLine = [];
            }
          } else if (node.tagName === 'SPAN') {
            // Process children of span
            node.childNodes.forEach(processNode);
          } else {
            // Process other elements recursively
            node.childNodes.forEach(processNode);
          }
        }
      };

      // Start processing from the element
      element.childNodes.forEach(processNode);

      // Add the last line if it has content
      if (currentLine.length > 0) {
        visualLines.push(currentLine);
      }

      return visualLines;
    },

    /**
     * Draw text with 8-directional outline
     */
    drawTextWithOutline: function (ctx, text, x, y, color) {
      // Draw shadows first
      ctx.fillStyle = SHADOW_COLOR;
      SHADOW_DIRECTIONS.forEach(([dx, dy]) => {
        ctx.fillText(text, x + dx, y + TEXT_OFFSET_Y + dy);
      });

      // Draw main text on top
      ctx.fillStyle = color;
      ctx.fillText(text, x, y + TEXT_OFFSET_Y);
    },

    /**
     * Generate filename for downloaded image
     */
    generateFilename: function () {
      const date = new Date();
      return (
        date
          .toLocaleString()
          .replaceAll(',', '_')
          .replaceAll(' ', '_')
          .replaceAll('/', '-')
          .replace('__', '_')
          .replaceAll(':', '-') + '_overlay.png'
      );
    },

    /**
     * Convert canvas to blob with PPI metadata embedded
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {number} ppi - Pixels per inch value to embed
     */
    canvasToBlobWithPPI: async function (canvas, ppi) {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              const errorInfo = {
                message: 'Failed to create blob from canvas',
                context: 'Canvas blob creation',
                canvasSize: `${canvas.width}x${canvas.height}`,
              };

              if (window.ImageErrorHandler) {
                window.ImageErrorHandler.logImageError(errorInfo);
              }

              reject(
                new Error(
                  'Failed to create blob from canvas. The canvas may be too large or the browser ran out of memory.'
                )
              );
              return;
            }

            try {
              // Read the blob as ArrayBuffer to inject PPI metadata
              const arrayBuffer = await blob.arrayBuffer().catch((error) => {
                console.warn('[Renderer] Failed to read blob as ArrayBuffer:', error);
                if (window.ErrorLogger) {
                  window.ErrorLogger.logWarning('Failed to read blob as ArrayBuffer', {
                    error: error.message,
                    blobSize: blob.size,
                    context: 'ArrayBuffer conversion',
                  });
                }
                throw error;
              });

              const pngWithPPI = this.injectPNGPPI(arrayBuffer, ppi);
              const finalBlob = new Blob([pngWithPPI], { type: CANVAS_IMAGE_FORMAT });
              resolve(finalBlob);
            } catch (error) {
              console.warn(
                '[Renderer] Failed to inject PPI metadata, returning blob without it:',
                error
              );
              if (window.ErrorLogger) {
                window.ErrorLogger.logWarning(
                  'PPI metadata injection failed, using original blob',
                  {
                    error: error.message,
                    blobSize: blob.size,
                    context: 'PPI injection',
                  }
                );
              }
              // Fall back to original blob without PPI if injection fails
              resolve(blob);
            }
          },
          CANVAS_IMAGE_FORMAT,
          CANVAS_IMAGE_QUALITY
        );
      });
    },

    /**
     * Inject pHYs chunk into PNG data to set PPI
     * @param {ArrayBuffer} pngData - Original PNG data
     * @param {number} ppi - Pixels per inch
     * @returns {Uint8Array} - PNG data with pHYs chunk
     */
    injectPNGPPI: function (pngData, ppi) {
      const data = new Uint8Array(pngData);

      // PNG signature: 89 50 4E 47 0D 0A 1A 0A (8 bytes)
      // Then comes IHDR chunk
      // We need to insert pHYs chunk after IHDR

      // Find IHDR chunk end (search for IHDR signature)
      let ihdrEnd = -1;
      for (let i = 8; i < data.length - 4; i++) {
        if (
          data[i] === 0x49 &&
          data[i + 1] === 0x48 &&
          data[i + 2] === 0x44 &&
          data[i + 3] === 0x52
        ) {
          // IHDR found at i, chunk length is 4 bytes before
          const chunkLength =
            (data[i - 4] << 24) | (data[i - 3] << 16) | (data[i - 2] << 8) | data[i - 1];
          // Skip: chunk type (4) + data (chunkLength) + CRC (4)
          ihdrEnd = i + 4 + chunkLength + 4;
          break;
        }
      }

      if (ihdrEnd === -1) {
        console.warn('[Renderer] Could not find IHDR chunk in PNG');
        return data; // Return original data
      }

      // Create pHYs chunk
      // pHYs chunk format:
      // - 4 bytes: chunk length (9)
      // - 4 bytes: chunk type "pHYs" (0x70485973)
      // - 4 bytes: pixels per unit, X axis
      // - 4 bytes: pixels per unit, Y axis
      // - 1 byte: unit specifier (1 = meter)
      // - 4 bytes: CRC

      // Convert PPI to pixels per meter (1 inch = 0.0254 meters)
      const pixelsPerMeter = Math.round(ppi / 0.0254);

      const phys = new Uint8Array(21);

      // Chunk length: 9
      phys[0] = 0x00;
      phys[1] = 0x00;
      phys[2] = 0x00;
      phys[3] = 0x09;

      // Chunk type: "pHYs"
      phys[4] = 0x70; // p
      phys[5] = 0x48; // H
      phys[6] = 0x59; // Y
      phys[7] = 0x73; // s

      // X pixels per meter (big-endian)
      phys[8] = (pixelsPerMeter >> 24) & 0xff;
      phys[9] = (pixelsPerMeter >> 16) & 0xff;
      phys[10] = (pixelsPerMeter >> 8) & 0xff;
      phys[11] = pixelsPerMeter & 0xff;

      // Y pixels per meter (big-endian)
      phys[12] = (pixelsPerMeter >> 24) & 0xff;
      phys[13] = (pixelsPerMeter >> 16) & 0xff;
      phys[14] = (pixelsPerMeter >> 8) & 0xff;
      phys[15] = pixelsPerMeter & 0xff;

      // Unit: 1 = meter
      phys[16] = 0x01;

      // Calculate CRC for chunk type + data
      const crc = this.crc32(phys.slice(4, 17));
      phys[17] = (crc >> 24) & 0xff;
      phys[18] = (crc >> 16) & 0xff;
      phys[19] = (crc >> 8) & 0xff;
      phys[20] = crc & 0xff;

      // Combine: PNG signature + IHDR + pHYs + rest of PNG
      const result = new Uint8Array(data.length + 21);
      result.set(data.slice(0, ihdrEnd), 0);
      result.set(phys, ihdrEnd);
      result.set(data.slice(ihdrEnd), ihdrEnd + 21);

      return result;
    },

    /**
     * Calculate CRC32 checksum (for PNG chunks)
     * @param {Uint8Array} data - Data to calculate CRC for
     * @returns {number} - CRC32 checksum
     */
    crc32: function (data) {
      let crc = 0xffffffff;

      for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
      }

      return (crc ^ 0xffffffff) >>> 0;
    },
  };

  console.log('Overlay renderer initialized');
})();
