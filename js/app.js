/**
 * Chatlog Magician - Main Application Script
 * This file contains the core functionality for the Chatlog Magician application.
 */

// Initialize Foundation
$(document).foundation();

// Global variables
let scaleEnabled = false;
let lastProcessedText = '';
let processingTimeout = null;

/**
 * Updates the font size of the output based on the input value
 */
function updateFontSize() {
  const fontSize = $('#font-label').val() + 'px';
  $('#output').css('font-size', fontSize);
}

/**
 * Trims empty space from a canvas
 * @param {HTMLCanvasElement} canvas - The canvas to trim
 * @returns {HTMLCanvasElement} - The trimmed canvas
 */
function trimCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imgData.data;
  let top = null,
    bottom = null,
    left = null,
    right = null;

  // Find top
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      let alpha = pixels[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        top = y;
        break;
      }
    }
    if (top !== null) break;
  }

  // Find bottom
  for (let y = canvas.height - 1; y >= 0; y--) {
    for (let x = 0; x < canvas.width; x++) {
      let alpha = pixels[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        bottom = y;
        break;
      }
    }
    if (bottom !== null) break;
  }

  // Find left
  for (let x = 0; x < canvas.width; x++) {
    for (let y = 0; y < canvas.height; y++) {
      let alpha = pixels[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        left = x;
        break;
      }
    }
    if (left !== null) break;
  }

  // Find right
  for (let x = canvas.width - 1; x >= 0; x--) {
    for (let y = 0; y < canvas.height; y++) {
      let alpha = pixels[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        right = x;
        break;
      }
    }
    if (right !== null) break;
  }

  // Create trimmed canvas if bounds were found
  if (top !== null && bottom !== null && left !== null && right !== null) {
    let trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = right - left + 1;
    trimmedCanvas.height = bottom - top + 1;
    trimmedCanvas.getContext("2d").putImageData(
      ctx.getImageData(left, top, trimmedCanvas.width, trimmedCanvas.height),
      0, 0
    );
    return trimmedCanvas;
  } else {
    return canvas;
  }
}

/**
 * Generates a filename based on current date and time
 * @returns {string} - Formatted filename
 */
function generateFilename() {
  return new Date()
    .toLocaleString()
    .replaceAll(",", "_")
    .replaceAll(" ", "_")
    .replaceAll("/", "-")
    .replace("__", "_")
    .replaceAll(":", "-") + "_chatlog.png";
}

/**
 * Handles the download of the output as an image
 */
function downloadOutputImage() {
  const text = $('#chatlogInput').val().trim();
  if (text) {
    saveToHistory(text);
    refreshHistoryPanel();
  }
  
  const scale = scaleEnabled ? 2 : 1;
  const output = $("#output");
  $(".censored-content").addClass("pixelated");
  
  // Show loading indicator
  showLoadingIndicator();
  
  const height = (output.prop('scrollHeight') + 100) * scale;
  const width = output.width() * scale;
  const originalPadding = output.css('padding-bottom');
  
  // Add extra padding to ensure content is fully captured
  output.css('padding-bottom', '100px');
  
  domtoimage.toBlob(output[0], {
    width: width,
    height: height,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: "top left",
    }
  }).then(function(blob) {
    // Restore original padding
    output.css('padding-bottom', originalPadding);
    
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    
    img.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      
      const trimmedCanvas = trimCanvas(canvas);
      trimmedCanvas.toBlob(function(trimmedBlob) {
        window.saveAs(trimmedBlob, generateFilename());
        $(".censored-content").removeClass("pixelated");
        hideLoadingIndicator();
      });
    };
  }).catch(function(error) {
    console.error("Error generating image:", error);
    alert("There was an error generating the image. Please try again.");
    $(".censored-content").removeClass("pixelated");
    hideLoadingIndicator();
  });
}

/**
 * Shows a loading indicator during image processing
 */
function showLoadingIndicator() {
  // Create loading indicator if it doesn't exist
  if ($('#loadingIndicator').length === 0) {
    $('body').append(`
      <div id="loadingIndicator" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      ">
        <div style="
          background-color: #fff;
          padding: 20px;
          border-radius: 5px;
          text-align: center;
        ">
          <div class="spinner" style="
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 2s linear infinite;
            margin: 0 auto 10px;
          "></div>
          <p style="margin: 0; color: #333;">Generating image...</p>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `);
  } else {
    $('#loadingIndicator').show();
  }
}

/**
 * Hides the loading indicator
 */
function hideLoadingIndicator() {
  $('#loadingIndicator').hide();
}

/**
 * Toggles the background of the output
 */
function toggleBackground() {
  $("#output").toggleClass("background-active");
}

/**
 * Auto-resizes the textarea based on content
 */
function autoResizeTextarea() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
  
  // Debounce processing for better performance
  const currentText = $(this).val();
  if (currentText === lastProcessedText) return;
  
  clearTimeout(processingTimeout);
  processingTimeout = setTimeout(() => {
    lastProcessedText = currentText;
    if (typeof processOutput === 'function') {
      processOutput();
    }
  }, 300);
}

/**
 * Copies text to clipboard with fallback methods
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button element for visual feedback
 */
function copyToClipboard(text, button) {
  // Try the modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showCopySuccess(button);
      })
      .catch(err => {
        console.log('Clipboard API failed, trying fallback', err);
        copyUsingFallback(text, button);
      });
  } else {
    // Fallback for browsers without clipboard API
    copyUsingFallback(text, button);
  }
}

/**
 * Fallback method for copying text using document.execCommand
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button element for visual feedback
 */
function copyUsingFallback(text, button) {
  try {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Make it invisible but part of the document
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    
    // Select and copy
    textarea.focus();
    textarea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (successful) {
      showCopySuccess(button);
    } else {
      showCopyError(button);
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showCopyError(button);
  }
}

/**
 * Shows success feedback on button
 * @param {HTMLElement} button - Button element
 */
function showCopySuccess(button) {
  const $btn = $(button);
  const originalBg = $btn.css("background-color");
  const originalText = $btn.text();
  
  $btn.css("background-color", "#a8f0c6").text("Copied!");
  
  setTimeout(() => {
    $btn.css("background-color", originalBg).text(originalText);
  }, 1500);
}

/**
 * Shows error feedback on button
 * @param {HTMLElement} button - Button element
 */
function showCopyError(button) {
  const $btn = $(button);
  const originalBg = $btn.css("background-color");
  const originalText = $btn.text();
  
  $btn.css("background-color", "#f0a8a8").text("Failed!");
  
  setTimeout(() => {
    $btn.css("background-color", originalBg).text(originalText);
  }, 1500);
}

/**
 * Handles keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + S to save image
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    downloadOutputImage();
  }
  
  // Ctrl/Cmd + B to toggle background
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    toggleBackground();
  }
}

/**
 * Initializes tooltips
 */
function initTooltips() {
  // Add hover effect for tooltip elements
  $('.info-bracket').hover(
    function() {
      $(this).find('.tooltip-text').fadeIn(200);
    },
    function() {
      $(this).find('.tooltip-text').fadeOut(200);
    }
  );
}

// Chatlog history functions
function saveToHistory(text) {
  try {
    if (!text.trim()) return;
    
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('chatlogHistory') || '[]');
    } catch (e) {
      console.error('Error reading history:', e);
    }
    
    history = history.filter(item => item !== text);
    history.unshift(text);
    
    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    
    try {
      localStorage.setItem('chatlogHistory', JSON.stringify(history));
    } catch (e) {
      console.error('Error saving history:', e);
    }
  } catch (e) {
    console.error('Error in saveToHistory:', e);
  }
}

function loadHistory() {
  return JSON.parse(localStorage.getItem('chatlogHistory') || '[]');
}

// Toggle history panel
function toggleHistoryPanel() {
  const panel = document.getElementById('historyPanel');
  panel.classList.toggle('open');
}

// Refresh history panel content
function refreshHistoryPanel() {
  const itemsContainer = $('.history-items');
  itemsContainer.empty();
  
  const history = loadHistory();
  
  if (history.length === 0) {
    itemsContainer.append('<div class="history-item">No history yet</div>');
  } else {
    history.forEach((text, index) => {
      const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
      itemsContainer.append(
        `<div class="history-item" data-index="${index}">
          <div class="history-preview">${escapeHtml(preview)}</div>
          <small>Click to load</small>
        </div>`
      );
    });
  }
}

// Basic HTML escaping
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Document ready function
$(document).ready(function() {
  // Load saved values from localStorage or use defaults
  $('#font-label').val(localStorage.getItem('chatlogFontSize') || 12);
  $('#lineLengthInput').val(localStorage.getItem('chatlogLineLength') || 77);
  $('#characterNameInput').val(localStorage.getItem('chatlogCharacterName') || '');
  
  // Initialize font size
  updateFontSize();
  
  // Initialize tooltips
  initTooltips();
  
  // Initialize history panel
  refreshHistoryPanel();
  
  // Panel will be initialized by CSS
  function toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    panel.classList.toggle('open');
  }
  
  // Event listeners
  $('#font-label').on('input', function() {
    localStorage.setItem('chatlogFontSize', $(this).val());
    updateFontSize();
  });
  
  $('#lineLengthInput').on('input', function() {
    localStorage.setItem('chatlogLineLength', $(this).val());
  });
  
  $('#characterNameInput').on('input', function() {
    localStorage.setItem('chatlogCharacterName', $(this).val());
  });
  
  // Save chatlog to history when changed
  $('#chatlogInput').on('input', function() {
    const text = $(this).val().trim();
    if (text) {
      saveToHistory(text);
    }
  });
  
  // Save chatlog to history when processed
  $(document).on('chatlogProcessed', function(event, text) {
    saveToHistory(text);
  });
  
  $("#scaleToggle").change(function() {
    scaleEnabled = $(this).is(":checked");
  });
  
  $("#downloadOutputTransparent").click(downloadOutputImage);
  $("#toggleBackground").click(toggleBackground);
  
  // Auto-resize textarea
  const textarea = document.querySelector('.textarea-input');
  textarea.addEventListener('input', autoResizeTextarea);
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Initialize textarea height
  if (textarea.value) {
    autoResizeTextarea.call(textarea);
  }
  
  // Add copy button functionality
  $('#censorCharButton').click(function() {
    copyToClipboard('÷', this);
  });
  
  // Add visual feedback on button hover
  $('.button').hover(
    function() { $(this).css('transform', 'translateY(-2px)'); },
    function() { $(this).css('transform', 'translateY(0)'); }
  );
  
  // Toggle history panel on input focus
  $('#chatlogInput').on('focus', function() {
    toggleHistoryPanel();
  });
  
  // Hide dropdown when clicking outside
  $(document).on('click', function(e) {
    if (!$(e.target).closest('#historyPanel, #chatlogInput').length) {
      $('#historyPanel').hide();
    }
  });
  
  // Handle history item selection
  $(document).on('click', '.history-item', function() {
    const index = $(this).data('index');
    const history = loadHistory();
    if (history[index]) {
      $('#chatlogInput').val(history[index]).trigger('input');
      $('#historyPanel').hide();
    }
  });
});
