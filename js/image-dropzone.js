// Image Drop Zone Handler
// Handles file upload and drag-and-drop for overlay images

(function () {
  'use strict';

  // Constants
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ERROR_AUTO_HIDE_MS = 5000;
  const DRAG_EVENTS = ['dragenter', 'dragover', 'dragleave', 'drop'];

  // DOM Element IDs
  const DOM_IDS = {
    dropzone: 'imageDropzone',
    fileInput: 'imageFileInput',
    overlayImage: 'overlayImage',
  };

  // CSS Classes
  const CSS_CLASSES = {
    dragOver: 'drag-over',
    hasImage: 'has-image',
    instructionsHidden: 'hidden',
    imageLoaded: 'loaded',
  };

  // Expose to global scope
  window.ImageDropZone = {
    state: {
      droppedImageSrc: null,
      droppedImageElement: null,
      isProcessing: false,
      maxFileSize: MAX_FILE_SIZE_BYTES,
      allowedTypes: ALLOWED_IMAGE_TYPES,
    },

    /**
     * Initialize the drop zone
     */
    init: function () {
      const dropzone = document.getElementById(DOM_IDS.dropzone);
      if (!dropzone) {
        console.error('[ImageDropZone] Dropzone element not found');
        return;
      }

      const fileInput = document.getElementById(DOM_IDS.fileInput);
      if (!fileInput) {
        console.warn('[ImageDropZone] File input not found - file upload will not work');
      }

      // File input change handler
      if (fileInput) {
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
      }

      // Drag and drop handlers
      dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
      dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
      dropzone.addEventListener('drop', this.handleDrop.bind(this));
      dropzone.addEventListener('dblclick', this.handleDoubleClick.bind(this));

      // Prevent default drag behaviors
      DRAG_EVENTS.forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
    },

    /**
     * Handle file selection from file input
     */
    handleFileSelect: function (event) {
      const file = event.target.files?.[0];
      if (file) {
        this.processFile(file);
      }
    },

    /**
     * Handle double-click on drop zone
     */
    handleDoubleClick: function (event) {
      // Only trigger file input if double-clicking on drop zone itself
      if (
        event.target.classList.contains('image-dropzone') ||
        event.target.classList.contains('dropzone-instructions')
      ) {
        const fileInput = document.getElementById(DOM_IDS.fileInput);
        if (fileInput) {
          fileInput.click();
        } else {
          console.error('[ImageDropZone] File input not found');
          this.showError('File upload is not available. Please refresh the page.');
        }
      }
    },

    /**
     * Handle drag over
     */
    handleDragOver: function (event) {
      const dropzone = event.currentTarget;
      if (dropzone) {
        dropzone.classList.add(CSS_CLASSES.dragOver);
      }
    },

    /**
     * Handle drag leave
     */
    handleDragLeave: function (event) {
      const dropzone = event.currentTarget;
      if (dropzone) {
        dropzone.classList.remove(CSS_CLASSES.dragOver);
      }
    },

    /**
     * Handle file drop
     */
    handleDrop: function (event) {
      const dropzone = event.currentTarget;
      if (dropzone) {
        dropzone.classList.remove(CSS_CLASSES.dragOver);
      }

      const file = event.dataTransfer?.files?.[0];
      if (file) {
        this.processFile(file);
      } else {
        console.warn('[ImageDropZone] No file found in drop event');
        this.showError('No file detected. Please try again.');
      }
    },

    /**
     * Process the uploaded file
     */
    processFile: function (file) {
      // Check if already processing
      if (this.state.isProcessing) {
        console.warn('[ImageDropZone] Already processing a file');
        return;
      }

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        console.warn('[ImageDropZone] File validation failed:', validation.message);
        this.showError(validation.message);
        return;
      }

      // Set processing state
      this.state.isProcessing = true;
      this.showLoading();

      // Read file as data URL
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target?.result) {
          console.error('[ImageDropZone] FileReader returned empty result');

          const errorInfo = {
            message: 'FileReader returned empty result',
            context: 'Image file reading',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          };

          if (window.ImageErrorHandler) {
            window.ImageErrorHandler.logImageError(errorInfo);
          }

          this.state.isProcessing = false;
          this.hideLoading();
          this.showError(`Failed to read file "${file.name}". The file may be empty or corrupted.`);
          return;
        }
        this.state.droppedImageSrc = e.target.result;
        this.loadImage(e.target.result, file);
      };

      reader.onerror = (err) => {
        console.error('[ImageDropZone] FileReader error:', err);

        const errorInfo = {
          message: `FileReader error: ${err.target?.error?.message || 'Unknown error'}`,
          context: 'Image file reading',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: err.target?.error
        };

        if (window.ImageErrorHandler) {
          window.ImageErrorHandler.logImageError(errorInfo);
        }

        this.state.isProcessing = false;
        this.hideLoading();
        this.showError(`Failed to read file "${file.name}". Error: ${err.target?.error?.message || 'Please try again.'}`);
      };

      try {
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('[ImageDropZone] Failed to start file read:', error);

        const errorInfo = {
          message: `Failed to start file read: ${error.message}`,
          context: 'Image file reading initialization',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: error.message
        };

        if (window.ImageErrorHandler) {
          window.ImageErrorHandler.logImageError(errorInfo);
        }

        this.state.isProcessing = false;
        this.hideLoading();
        this.showError(`Failed to process file "${file.name}". ${error.message}`);
      }
    },

    /**
     * Validate uploaded file
     */
    validateFile: function (file) {
      if (!file) {
        return { valid: false, message: 'No file selected.' };
      }

      if (!this.state.allowedTypes.includes(file.type)) {
        const errorInfo = {
          message: 'Invalid file type uploaded',
          context: 'File type validation',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          allowedTypes: this.state.allowedTypes.join(', ')
        };

        if (window.ImageErrorHandler) {
          window.ImageErrorHandler.logImageError(errorInfo);
        }

        return {
          valid: false,
          message: `Invalid file type "${file.type}". Please upload a JPEG, PNG, GIF, or WebP image. File: "${file.name}"`,
        };
      }

      if (file.size > this.state.maxFileSize) {
        const sizeMB = (this.state.maxFileSize / (1024 * 1024)).toFixed(0);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

        const errorInfo = {
          message: 'File size exceeds maximum',
          context: 'File size validation',
          fileName: file.name,
          fileSize: file.size,
          fileSizeMB: fileSizeMB,
          maxSizeMB: sizeMB,
          fileType: file.type
        };

        if (window.ImageErrorHandler) {
          window.ImageErrorHandler.logImageError(errorInfo);
        }

        return {
          valid: false,
          message: `File "${file.name}" is too large (${fileSizeMB}MB). Maximum size is ${sizeMB}MB. Please compress or resize the image.`
        };
      }

      if (file.size === 0) {
        const errorInfo = {
          message: 'Empty file uploaded',
          context: 'File size validation',
          fileName: file.name,
          fileSize: 0,
          fileType: file.type
        };

        if (window.ImageErrorHandler) {
          window.ImageErrorHandler.logImageError(errorInfo);
        }

        return {
          valid: false,
          message: `File "${file.name}" is empty (0 bytes). Please select a valid image file.`
        };
      }

      return { valid: true };
    },

    /**
     * Load image from data URL
     * @param {string} src - Image data URL
     * @param {File} file - Original file object (optional, for error context)
     */
    loadImage: function (src, file = null) {
      const img = new Image();
      img.onload = () => {
        this.state.droppedImageElement = img;
        this.renderImage(img);
        this.state.isProcessing = false;
        this.hideLoading();
        this.hideInstructions();

        // Trigger custom event
        const event = new CustomEvent('imageLoaded', {
          detail: { src, image: img, file },
        });
        document.dispatchEvent(event);

        console.log('[ImageDropZone] Image loaded successfully:', {
          width: img.width,
          height: img.height,
          fileName: file?.name,
          fileSize: file?.size
        });
      };

      img.onerror = () => {
        const errorInfo = {
          message: 'Failed to load image element',
          context: 'Image element loading',
          fileName: file?.name || 'Unknown',
          fileSize: file?.size || 0,
          fileType: file?.type || 'Unknown',
          imageDimensions: `${img.naturalWidth || 0}x${img.naturalHeight || 0}`
        };

        if (window.ImageErrorHandler) {
          window.ImageErrorHandler.logImageError(errorInfo);
        }

        this.state.isProcessing = false;
        this.hideLoading();

        const fileName = file?.name || 'the file';
        const additionalInfo = file ? ` (${(file.size / 1024).toFixed(1)} KB, ${file.type})` : '';
        this.showError(`Failed to load image "${fileName}". The file may be corrupted or in an unsupported format.${additionalInfo}`);

        // Trigger error event
        const errorEvent = new CustomEvent('imageLoadError', {
          detail: { src, error: 'Failed to load image', file },
        });
        document.dispatchEvent(errorEvent);
      };

      img.src = src;
    },

    /**
     * Render image in drop zone
     * @param {HTMLImageElement} img - Image to render
     * @param {Function} callback - Optional callback to run after rendering
     */
    renderImage: function (img, callback) {
      const dropzone = document.getElementById('imageDropzone');
      if (!dropzone) return;

      // Clear existing DOM elements (but preserve droppedImageSrc for rendering)
      this.clearImageDOM();

      // Calculate dimensions for object-fit: contain
      const dropzoneWidth = dropzone.offsetWidth;
      const dropzoneHeight = dropzone.offsetHeight;
      const imageAspect = img.width / img.height;
      const dropzoneAspect = dropzoneWidth / dropzoneHeight;

      let displayWidth, displayHeight, offsetX, offsetY;

      if (imageAspect > dropzoneAspect) {
        // Image is wider (letterbox)
        displayWidth = dropzoneWidth;
        displayHeight = dropzoneWidth / imageAspect;
        offsetX = 0;
        offsetY = (dropzoneHeight - displayHeight) / 2;
      } else {
        // Image is taller (pillarbox)
        displayWidth = dropzoneHeight * imageAspect;
        displayHeight = dropzoneHeight;
        offsetX = (dropzoneWidth - displayWidth) / 2;
        offsetY = 0;
      }

      // Create image element
      const imgEl = document.createElement('img');
      imgEl.id = DOM_IDS.overlayImage;
      imgEl.className = `image-overlay-element ${CSS_CLASSES.imageLoaded}`;
      imgEl.src = img.src;
      imgEl.style.position = 'absolute';
      imgEl.style.top = offsetY + 'px';
      imgEl.style.left = offsetX + 'px';
      imgEl.style.width = displayWidth + 'px';
      imgEl.style.height = displayHeight + 'px';

      // Store dimensions
      imgEl.dataset.naturalWidth = img.width;
      imgEl.dataset.naturalHeight = img.height;
      imgEl.dataset.displayWidth = displayWidth;
      imgEl.dataset.displayHeight = displayHeight;
      imgEl.dataset.baseX = offsetX;
      imgEl.dataset.baseY = offsetY;

      dropzone.appendChild(imgEl);
      dropzone.classList.add(CSS_CLASSES.hasImage);

      // Initialize overlay state if available
      if (window.ImageOverlayState) {
        window.ImageOverlayState.updateImageElement(imgEl);
      }

      // Call callback if provided
      if (typeof callback === 'function') {
        callback();
      }
    },

    /**
     * Clear displayed image DOM elements only (preserves state for rendering)
     */
    clearImageDOM: function () {
      const img = document.getElementById(DOM_IDS.overlayImage);
      const chatOverlay = document.querySelector('.chat-overlay-container');

      if (img) {
        img.remove();
      }
      if (chatOverlay) {
        chatOverlay.remove();
      }
    },

    /**
     * Clear displayed image and reset state
     */
    clearImage: function () {
      const dropzone = document.getElementById(DOM_IDS.dropzone);

      // Clear DOM elements
      this.clearImageDOM();

      if (dropzone) {
        dropzone.classList.remove(CSS_CLASSES.hasImage);
      } else {
        console.warn('[ImageDropZone] Dropzone not found during clear');
      }

      this.showInstructions();
      this.state.droppedImageSrc = null;
      this.state.droppedImageElement = null;

      // Reset overlay state if available
      if (window.ImageOverlayState) {
        window.ImageOverlayState.reset();
      }
    },

    /**
     * Show loading indicator
     */
    showLoading: function () {
      this.hideError();
      const dropzone = document.getElementById(DOM_IDS.dropzone);
      if (!dropzone) {
        console.warn('[ImageDropZone] Cannot show loading - dropzone not found');
        return;
      }

      const existing = dropzone.querySelector('.dropzone-loading');
      if (existing) return;

      const loading = document.createElement('div');
      loading.className = 'dropzone-loading';
      loading.innerHTML =
        '<i class="fas fa-spinner" aria-hidden="true"></i><p>Loading image...</p>';
      dropzone.appendChild(loading);
    },

    /**
     * Hide loading indicator
     */
    hideLoading: function () {
      const dropzone = document.getElementById(DOM_IDS.dropzone);
      const loading = dropzone?.querySelector('.dropzone-loading');
      if (loading) {
        loading.remove();
      }
    },

    /**
     * Show error message
     */
    showError: function (message) {
      this.hideLoading();
      const dropzone = document.getElementById(DOM_IDS.dropzone);
      if (!dropzone) {
        console.error('[ImageDropZone] Cannot show error - dropzone not found:', message);
        return;
      }

      const existing = dropzone.querySelector('.dropzone-error');
      if (existing) {
        existing.textContent = message;
        return;
      }

      const error = document.createElement('div');
      error.className = 'dropzone-error';
      error.textContent = message;
      dropzone.appendChild(error);

      // Auto-hide after configured time
      setTimeout(() => {
        this.hideError();
      }, ERROR_AUTO_HIDE_MS);
    },

    /**
     * Hide error message
     */
    hideError: function () {
      const dropzone = document.getElementById(DOM_IDS.dropzone);
      const error = dropzone?.querySelector('.dropzone-error');
      if (error) {
        error.remove();
      }
    },

    /**
     * Show instructions
     */
    showInstructions: function () {
      const instructions = document.querySelector('.dropzone-instructions');
      if (instructions) {
        instructions.classList.remove(CSS_CLASSES.instructionsHidden);
      }
    },

    /**
     * Hide instructions
     */
    hideInstructions: function () {
      const instructions = document.querySelector('.dropzone-instructions');
      if (instructions) {
        instructions.classList.add(CSS_CLASSES.instructionsHidden);
      }
    },
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.ImageDropZone.init();
    });
  } else {
    window.ImageDropZone.init();
  }
})();
