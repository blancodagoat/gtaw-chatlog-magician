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
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  const SHADOW_COLOR = '#000000';
  const BACKGROUND_COLOR = '#000000';

  // Expose to global scope
  window.OverlayRenderer = {
    /**
     * Render and download overlay image
     */
    renderAndDownload: async function () {
      try {
        // Validate prerequisites
        if (!window.ImageOverlayState) {
          throw new Error('Image overlay system not initialized');
        }
        if (!window.ImageDropZone?.state?.droppedImageSrc) {
          throw new Error('No image loaded. Please upload an image first.');
        }
        if (!document.getElementById('output')?.querySelector('.generated')) {
          throw new Error('No chat messages to render. Please generate some chat first.');
        }

        showLoadingIndicator();

        const blob = await this.renderOverlayImage();

        if (blob) {
          const filename = this.generateFilename();
          window.saveAs(blob, filename);
        } else {
          throw new Error('Failed to generate image blob');
        }
      } catch (error) {
        console.error('Error rendering overlay:', error);
        const userMessage = error.message || 'There was an error generating the overlay image. Please try again.';
        alert(userMessage);
      } finally {
        hideLoadingIndicator();
      }
    },

    /**
     * Render overlay image to canvas and return blob
     */
    renderOverlayImage: async function () {
      if (!window.ImageOverlayState || !window.ImageDropZone) {
        throw new Error('Image overlay system not initialized');
      }

      // Get custom dimensions from inputs
      const exportWidthInput = document.getElementById('exportWidth');
      const exportHeightInput = document.getElementById('exportHeight');
      const exportPPIInput = document.getElementById('exportPPI');

      const exportWidth = exportWidthInput ? parseInt(exportWidthInput.value) || 1600 : 1600;
      const exportHeight = exportHeightInput ? parseInt(exportHeightInput.value) || 1200 : 1200;
      const exportPPI = exportPPIInput ? parseInt(exportPPIInput.value) || 96 : 96;

      // The dropzone might be scaled down for display, but export uses full dimensions
      // Calculate the scale ratio between export and display
      const dropZoneWidth = window.ImageOverlayState.dropZoneWidth;
      const dropZoneHeight = window.ImageOverlayState.dropZoneHeight;

      const scaleRatioX = exportWidth / dropZoneWidth;
      const scaleRatioY = exportHeight / dropZoneHeight;

      console.log('[Renderer] Export settings:', {
        exportWidth,
        exportHeight,
        exportPPI,
        dropZoneWidth,
        dropZoneHeight,
        scaleRatioX,
        scaleRatioY
      });

      // Create canvas with export dimensions
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Pass scale ratios to drawing functions so they can scale transforms manually
      const baseWidth = exportWidth;
      const baseHeight = exportHeight;

      // 1. Draw black background
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, baseWidth, baseHeight);

      // 2. Draw image with transforms
      await this.drawImageWithTransforms(ctx, baseWidth, baseHeight, scaleRatioX, scaleRatioY);

      // 3. Draw chat overlay with transforms
      await this.drawChatOverlay(ctx, baseWidth, baseHeight, scaleRatioX, scaleRatioY);

      // 4. Return as blob with PPI metadata
      return this.canvasToBlobWithPPI(canvas, exportPPI);
    },

    /**
     * Draw image with transforms
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width in pixels
     * @param {number} canvasHeight - Canvas height in pixels
     * @param {number} scaleRatioX - Scale ratio for width (export/display)
     * @param {number} scaleRatioY - Scale ratio for height (export/display)
     */
    drawImageWithTransforms: async function (ctx, canvasWidth, canvasHeight, scaleRatioX = 1.0, scaleRatioY = 1.0) {
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
        throw new Error('Failed to load image. The image may be too large or corrupted.');
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
    drawChatOverlay: async function (ctx, canvasWidth, canvasHeight, scaleRatioX = 1.0, scaleRatioY = 1.0) {
      const state = window.ImageOverlayState;

      // Get chat lines from output
      const output = document.getElementById('output');
      if (!output) return;

      const generatedLines = output.querySelectorAll('.generated');
      if (generatedLines.length === 0) return;

      console.log('[Renderer] Found', generatedLines.length, 'chat lines to render');

      // Get text padding from input fields
      const textPaddingHorizontal = document.getElementById('textPaddingHorizontal');
      const textPaddingVertical = document.getElementById('textPaddingVertical');
      const paddingH = parseInt(textPaddingHorizontal?.value) || 0;
      const paddingV = parseInt(textPaddingVertical?.value) || 0;

      // Apply transforms scaled to export dimensions (WYSIWYG)
      ctx.save();

      // Scale the user's chat transforms by the ratio between export and display
      const scaledChatX = state.chatTransform.x * scaleRatioX;
      const scaledChatY = state.chatTransform.y * scaleRatioY;

      ctx.translate(scaledChatX, scaledChatY);
      ctx.scale(state.chatTransform.scale, state.chatTransform.scale);

      // Get font size from input field (matches actual chat display)
      const fontSizeInput = document.getElementById('font-label');
      const fontSize = fontSizeInput ? parseInt(fontSizeInput.value) || TEXT_FONT_SIZE : TEXT_FONT_SIZE;

      console.log('[Renderer] Font size for canvas export:', fontSize);

      // Setup text rendering
      ctx.font = `${TEXT_FONT_WEIGHT} ${fontSize}px ${TEXT_FONT_FAMILY}`;
      ctx.textBaseline = TEXT_BASELINE;

      console.log('[Renderer] Canvas font set to:', ctx.font);

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
          LINE_HEIGHT = lineHeightStr.includes('px')
            ? lineHeightValue
            : lineHeightValue * fontSize;
        }
        console.log('[Renderer] Line height calculated:', LINE_HEIGHT, 'from', lineHeightStr, 'fontSize:', fontSize);
      }

      // Color mapping - extract from CSS custom properties
      const getCSSVariable = (varName) => {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      };

      const colors = {
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
            const color = parentSpan && parentSpan.tagName === 'SPAN' ? getColor(parentSpan) : '#f1f1f1';
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
              reject(new Error('Failed to create blob from canvas'));
              return;
            }

            try {
              // Read the blob as ArrayBuffer to inject PPI metadata
              const arrayBuffer = await blob.arrayBuffer();
              const pngWithPPI = this.injectPNGPPI(arrayBuffer, ppi);
              const finalBlob = new Blob([pngWithPPI], { type: CANVAS_IMAGE_FORMAT });
              resolve(finalBlob);
            } catch (error) {
              console.warn('[Renderer] Failed to inject PPI metadata, returning blob without it:', error);
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
        if (data[i] === 0x49 && data[i + 1] === 0x48 && data[i + 2] === 0x44 && data[i + 3] === 0x52) {
          // IHDR found at i, chunk length is 4 bytes before
          const chunkLength = (data[i - 4] << 24) | (data[i - 3] << 16) | (data[i - 2] << 8) | data[i - 1];
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
      phys[8] = (pixelsPerMeter >> 24) & 0xFF;
      phys[9] = (pixelsPerMeter >> 16) & 0xFF;
      phys[10] = (pixelsPerMeter >> 8) & 0xFF;
      phys[11] = pixelsPerMeter & 0xFF;

      // Y pixels per meter (big-endian)
      phys[12] = (pixelsPerMeter >> 24) & 0xFF;
      phys[13] = (pixelsPerMeter >> 16) & 0xFF;
      phys[14] = (pixelsPerMeter >> 8) & 0xFF;
      phys[15] = pixelsPerMeter & 0xFF;

      // Unit: 1 = meter
      phys[16] = 0x01;

      // Calculate CRC for chunk type + data
      const crc = this.crc32(phys.slice(4, 17));
      phys[17] = (crc >> 24) & 0xFF;
      phys[18] = (crc >> 16) & 0xFF;
      phys[19] = (crc >> 8) & 0xFF;
      phys[20] = crc & 0xFF;

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
      let crc = 0xFFFFFFFF;

      for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
        }
      }

      return (crc ^ 0xFFFFFFFF) >>> 0;
    },
  };

  console.log('Overlay renderer initialized');
})();
