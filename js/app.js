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
  
  const output = $("#output");
  $(".censored-content").addClass("pixelated");
  
  // Show loading indicator
  showLoadingIndicator();
  
  const height = output.prop('scrollHeight') + 100;
  const width = output.width();
  const originalPadding = output.css('padding-bottom');
  
  // Add extra padding to ensure content is fully captured
  output.css('padding-bottom', '100px');
  
  domtoimage.toBlob(output[0], {
    width: width,
    height: height,
    style: {
      transform: 'scale(1)',
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
    if (!text || !text.trim()) return;
    
    let history = [];
    try {
      const storedHistory = localStorage.getItem('chatlogHistory');
      if (storedHistory) {
        history = JSON.parse(storedHistory);
        if (!Array.isArray(history)) {
          console.warn('Invalid history format, resetting...');
          history = [];
        }
      }
    } catch (e) {
      console.error('Error reading history:', e);
      history = [];
    }
    
    // Remove duplicates and add new item
    history = history.filter(item => item !== text);
    history.unshift(text);
    
    // Limit history size and clean up old items
    const MAX_HISTORY = 20;
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    
    try {
      localStorage.setItem('chatlogHistory', JSON.stringify(history));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // If storage is full, remove oldest items
        history = history.slice(0, Math.floor(MAX_HISTORY / 2));
        try {
          localStorage.setItem('chatlogHistory', JSON.stringify(history));
        } catch (e2) {
          console.error('Failed to save history after cleanup:', e2);
        }
      } else {
        console.error('Error saving history:', e);
      }
    }
  } catch (e) {
    console.error('Error in saveToHistory:', e);
  }
}

function loadHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('chatlogHistory') || '[]');
    return Array.isArray(history) ? history : [];
  } catch (e) {
    console.error('Error loading history:', e);
    return [];
  }
}

// Toggle history panel
function toggleHistoryPanel() {
  const panel = document.getElementById('historyPanel');
  const isOpen = panel.classList.contains('open');
  
  panel.classList.toggle('open');
  panel.setAttribute('aria-hidden', !isOpen);
  
  // Update tab button state
  const tab = document.querySelector('.history-tab');
  tab.setAttribute('aria-expanded', !isOpen);
  tab.setAttribute('aria-label', isOpen ? 'Open chat history' : 'Close chat history');
  
  // Toggle Buy Me a Coffee button visibility
  const bmcContainer = document.querySelector('.bmc-btn-container');
  if (bmcContainer) {
    bmcContainer.style.display = !isOpen ? 'none' : 'block';
  }
  
  // Focus management
  if (!isOpen) {
    // When opening, focus the first history item
    const firstItem = panel.querySelector('.history-item');
    if (firstItem) firstItem.focus();
  }
}

// Clear all history
function clearHistory() {
  if (confirm('Are you sure you want to clear all chat history?')) {
    localStorage.removeItem('chatlogHistory');
    refreshHistoryPanel();
  }
}

// Refresh history panel content
function refreshHistoryPanel() {
  const $historyItems = $('.history-items');
  const $loading = $('<div class="history-loading">Loading history...</div>');
  const $empty = $('<div class="history-empty">No history items</div>');
  
  // Show loading state
  $historyItems.empty().append($loading.addClass('active'));
  
  try {
    const history = loadHistory();
    
    if (history.length === 0) {
      $loading.removeClass('active');
      $historyItems.append($empty.addClass('active'));
      return;
    }
    
    // Create history items
    const $items = history.map((text, index) => {
      const $item = $('<div class="history-item" role="button" tabindex="0" aria-label="Load chatlog from history"></div>');
      $item.data('index', index);
      
      // Create container for the full text
      const $textContainer = $('<div class="history-item-text"></div>');
      
      // Split text into lines and create formatted content
      const lines = text.split('\n');
      const formattedLines = lines.map(line => {
        // Apply the same formatting as the main chatlog
        if (typeof processLine === 'function') {
          return processLine(line);
        }
        return line;
      });
      
      $textContainer.html(formattedLines.join('<br>'));
      $item.append($textContainer);
      
      return $item;
    });
    
    // Update panel
    $loading.removeClass('active');
    $historyItems.append($items);
    
  } catch (e) {
    console.error('Error refreshing history panel:', e);
    $loading.removeClass('active');
    $historyItems.append($('<div class="history-error">Error loading history</div>'));
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
  // --- Character Name List Logic ---
  function getCharacterList() {
    return JSON.parse(localStorage.getItem('characterNameList') || '[]');
  }
  function saveCharacterList(list) {
    localStorage.setItem('characterNameList', JSON.stringify(list));
  }
  function renderCharacterDropdown() {
    const dropdown = $('#characterNameDropdown');
    const list = getCharacterList();
    if (list.length === 0) {
      dropdown.html('<div style="padding: 8px; color: #888;">No characters saved</div>');
      return;
    }
    dropdown.html(list.map(name =>
      `<div class="character-dropdown-item" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; cursor: pointer;">
        <span class="character-name-select">${$('<div>').text(name).html()}</span>
        <button class="remove-character-btn" data-name="${$('<div>').text(name).html()}" style="background: none; border: none; color: #c00; font-size: 16px; cursor: pointer;">&times;</button>
      </div>`
    ).join(''));
  }
  // Add character
  $('#addCharacterBtn').on('click', function() {
    const val = $('#characterNameInput').val().trim();
    if (!val) return;
    let list = getCharacterList();
    if (!list.includes(val)) {
      list.push(val);
      saveCharacterList(list);
      renderCharacterDropdown();
    }
    $('#characterNameInput').val('');
  });
  // Show/hide dropdown
  $('#showCharacterListBtn').on('click', function(e) {
    e.stopPropagation();
    const dropdown = $('#characterNameDropdown');
    if (dropdown.is(':visible')) {
      dropdown.hide();
    } else {
      renderCharacterDropdown();
      dropdown.show();
    }
  });
  // Select from dropdown
  $(document).on('click', '.character-name-select', function() {
    const name = $(this).text();
    $('#characterNameInput').val(name);
    $('#characterNameDropdown').hide();
    localStorage.setItem('chatlogCharacterName', name);
    if (typeof applyFilter === 'function') applyFilter();
  });
  // Remove character
  $(document).on('click', '.remove-character-btn', function(e) {
    e.stopPropagation();
    const name = $(this).data('name');
    let list = getCharacterList().filter(n => n !== name);
    saveCharacterList(list);
    renderCharacterDropdown();
  });
  // Hide dropdown when clicking outside
  $(document).on('click', function(e) {
    if (!$(e.target).closest('.input-group').length) {
      $('#characterNameDropdown').hide();
    }
  });
  // Hide dropdown on Escape
  $('#characterNameInput').on('keydown', function(e) {
    if (e.key === 'Escape') {
      $('#characterNameDropdown').hide();
    }
  });
  // --- End Character Name List Logic ---
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
    if (typeof applyFilter === 'function') applyFilter();
  });
  
  // Save chatlog to history when changed
  $('#chatlogInput').on('input', function() {
    // Remove automatic history saving on input
    const text = $(this).val().trim();
  });
  
  // Save chatlog to history when processed
  $(document).on('chatlogProcessed', function(event, text) {
    // Remove automatic history saving on processing
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
  
  // (Removed) Toggle history panel on input focus
  // $('#chatlogInput').on('focus', function() {
  //   toggleHistoryPanel();
  // });
  
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
  
  // Add clear history button to header
  $('.history-header').append(
    $('<button class="clear-history-btn" onclick="clearHistory()" aria-label="Clear all history">Clear All</button>')
  );
});
