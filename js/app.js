$(document).foundation();

// Debug mode - set to false for production
const DEBUG_MODE = false;

// Configuration constants
const CONFIG = {
    FONT_SIZE_SMALL_THRESHOLD: 13,      // Font sizes <= this get smoothing
    FONT_SIZE_MIN: 8,                   // Minimum allowed font size
    FONT_SIZE_MAX: 24,                  // Maximum allowed font size
    FONT_SIZE_DEFAULT: 12,              // Default font size
    LINE_LENGTH_MIN: 1,                 // Minimum line length
    LINE_LENGTH_DEFAULT: 77,            // Default line length
    MAX_HISTORY_ITEMS: 20,              // Maximum history items to store
    PROCESSING_DEBOUNCE_MS: 300,        // Debounce delay for text processing
    COPY_FEEDBACK_DURATION_MS: 1500,    // How long to show copy feedback
    AUTO_SAVE_INDICATOR_MS: 2000,       // How long to show auto-save indicator
    DRAG_FLAG_RESET_MS: 150,            // Delay before resetting drag flag
    LINE_HEIGHT_SMALL: 1.5,             // Line height for small fonts
    LINE_HEIGHT_DEFAULT: 1.45,          // Default line height
    LINE_HEIGHT_LARGE: 1.35,            // Line height for large fonts
    FONT_SIZE_LARGE_THRESHOLD: 20,      // Font sizes >= this are considered large
    BMC_NUDGE_INITIAL_DELAY_MS: 15000,  // Initial delay for BMC button nudge
    BMC_NUDGE_MIN_INTERVAL_MS: 20000,   // Min time between BMC nudges
    BMC_NUDGE_MAX_INTERVAL_MS: 60000,   // Max time between BMC nudges
    BMC_NUDGE_ANIMATION_MS: 800         // Duration of BMC nudge animation
};

// Typographic Golden Scale - Hand-picked sizes optimized for readability
const TYPOGRAPHIC_SCALE = [8, 10, 12, 15, 19, 24];

let scaleEnabled = false;
let lastProcessedText = '';
let processingTimeout = null;

/**
 * Updates the font size of the output display and applies appropriate styling
 * Stores the font size in localStorage for persistence
 * @returns {void}
 */
function updateFontSize() {
  const fontSize = parseInt($('#font-label').val());
  $('#output').css('font-size', fontSize + 'px');
  
  // Apply font smoothing for smaller sizes to make them more rounded
  if (fontSize <= CONFIG.FONT_SIZE_SMALL_THRESHOLD) {
    $('#output').addClass('font-smoothed');
  } else {
    $('#output').removeClass('font-smoothed');
  }
  
  // Apply size-aware line-height classes
  applySizeClasses(fontSize);
  
  // Store the font size in localStorage
  localStorage.setItem('chatlogFontSize', fontSize.toString());
}


/**
 * Checks if a font size is part of the typographic golden scale
 * @param {number} fontSize - The font size to check
 * @returns {boolean} True if the size is in the golden scale
 */
function isTypographicGolden(fontSize) {
  return TYPOGRAPHIC_SCALE.includes(fontSize);
}

/**
 * Gets the next size in the typographic golden scale
 * @param {number} currentSize - The current font size
 * @param {string} direction - Direction to move ('up' or 'down')
 * @returns {number} The next golden size, or current size if at boundary
 */
function getNextGoldenSize(currentSize, direction = 'up') {
  const index = TYPOGRAPHIC_SCALE.indexOf(currentSize);
  if (index === -1) return currentSize; // Not a golden size
  
  if (direction === 'up' && index < TYPOGRAPHIC_SCALE.length - 1) {
    return TYPOGRAPHIC_SCALE[index + 1];
  } else if (direction === 'down' && index > 0) {
    return TYPOGRAPHIC_SCALE[index - 1];
  }
  return currentSize;
}

/**
 * Finds the nearest typographic golden size to a given number
 * @param {number} n - The number to find nearest golden size for
 * @returns {number} The closest golden scale size
 */
function nearestGolden(n) {
  return TYPOGRAPHIC_SCALE.reduce((best, v) =>
    Math.abs(v - n) < Math.abs(best - n) ? v : best
  , TYPOGRAPHIC_SCALE[0]);
}

function percentDelta(a, b) { 
  return ((b - a) / a * 100).toFixed(1); 
}

function goldenHintHTML(scale) {
  return scale.map(s => `${s}px`).join(' → ');
}

function applySizeClasses(px) {
  $('#output').toggleClass('is-small', px <= CONFIG.FONT_SIZE_DEFAULT);
  $('#output').toggleClass('is-large', px >= CONFIG.FONT_SIZE_LARGE_THRESHOLD);
}

// Debug function to print scale's % deltas (handy for meta inspection)
function printScaleDeltas() {
  console.table(
    TYPOGRAPHIC_SCALE.slice(0, -1).map((s, i) => {
      const t = TYPOGRAPHIC_SCALE[i+1];
      return { from: s, to: t, percent: +(((t-s)/s)*100).toFixed(1) };
    })
  );
}

/**
 * Trims transparent pixels from the edges of a canvas
 * Used to create tighter crops of the generated chat log images
 * @param {HTMLCanvasElement} canvas - The canvas to trim
 * @returns {HTMLCanvasElement} A new canvas with trimmed content
 */
function trimCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imgData.data;
  let top = null,
    bottom = null,
    left = null,
    right = null;

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

  if (top !== null && bottom !== null && left !== null && right !== null) {
    let trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = right - left + 1;
    trimmedCanvas.height = bottom - top + 1;
    trimmedCanvas.getContext("2d", { willReadFrequently: true }).putImageData(
      ctx.getImageData(left, top, trimmedCanvas.width, trimmedCanvas.height),
      0, 0
    );
    return trimmedCanvas;
  } else {
    return canvas;
  }
}

/**
 * Generates a filename for the downloaded chat log image
 * Format: MM-DD-YYYY_HH-MM-SS_chatlog.png
 * @returns {string} The generated filename
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
 * Exports the formatted chat log as a PNG image
 * Handles cleanup of UI elements, canvas generation, and file download
 * Saves the current chat log to history automatically
 * @returns {void}
 */
function downloadOutputImage() {
  // QoL: clear any active selections before generating the image
  let hadColoringMode = false;
  try {
    if (window.ColorPalette && typeof window.ColorPalette.clearSelections === 'function') {
      window.ColorPalette.clearSelections();
    } else {
      // Fallback: remove selection class directly
      document.querySelectorAll('.selected-for-coloring').forEach(el => el.classList.remove('selected-for-coloring'));
    }
    const $out = $("#output");
    hadColoringMode = $out.hasClass('coloring-mode');
    if (hadColoringMode) {
      $out.removeClass('coloring-mode');
    }
  } catch (e) {
    // Non-fatal; continue with export
  }

  // Defer the actual export to the next frame so DOM updates (class removals) are applied
  setTimeout(() => {
    const text = $('#chatlogInput').val().trim();
    if (text) {
      saveToHistory(text);
      refreshHistoryPanel();
    }

    const output = $("#output");

    showLoadingIndicator();

  const height = output.prop('scrollHeight') + 100;
  const width = output.width();
  const originalPadding = output.css('padding-bottom');

  output.css('padding-bottom', '100px');

  // Configure dom-to-image with CORS handling
  const domtoimageOptions = window.CORSHandler ? 
    window.CORSHandler.getDomToImageOptions({
      width: width,
      height: height,
      style: {
        transform: 'scale(1)',
        transformOrigin: "top left",
      },
      filter: function(node) {
        if (node.classList && node.classList.contains('selected-for-coloring')) return false;
        return true;
      }
    }) : {
      width: width,
      height: height,
      style: {
        transform: 'scale(1)',
        transformOrigin: "top left",
      },
      filter: function(node) {
        if (node.tagName === 'LINK' && node.href && 
            (node.href.includes('cdnjs.cloudflare.com') || 
             node.href.includes('fonts.googleapis.com'))) {
          return false;
        }
        if (node.classList && node.classList.contains('selected-for-coloring')) return false;
        return true;
      },
      imagePlaceholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y0ZjRmNCIvPjwvc3ZnPg=='
    };

  // Try with original output first
  if (typeof domtoimage === 'undefined') {
    console.error('domtoimage library not loaded');
    alert('Image generation library not available. Please refresh the page and try again.');
    hideLoadingIndicator();
    if (hadColoringMode) output.addClass('coloring-mode');
    return;
  }
  
  domtoimage.toBlob(output[0], domtoimageOptions).then(function(blob) {
    output.css('padding-bottom', originalPadding);
    processGeneratedBlob(blob);
  }).catch(function(error) {
    console.error("Error generating image with original output:", error);
    
    // If CORS issues persist, try with a clean version
    if (error.message && (error.message.includes('SecurityError') || 
                          error.message.includes('cssRules') || 
                          error.message.includes('Cannot access rules'))) {
      
      console.log("Attempting fallback with clean output...");
      
      // Create a clean version without external resources
      const cleanOutput = window.CORSHandler ? 
        window.CORSHandler.createCleanOutput(output[0]) : 
        output[0].cloneNode(true);
      
      // Remove external stylesheets from the clone
      const externalLinks = cleanOutput.querySelectorAll('link[rel="stylesheet"]');
      externalLinks.forEach(link => {
        if (link.href && (link.href.includes('cdnjs.cloudflare.com') || 
                         link.href.includes('fonts.googleapis.com'))) {
          link.remove();
        }
      });
      
      if (typeof domtoimage === 'undefined') {
        console.error('domtoimage library not loaded');
        alert('Image generation library not available. Please refresh the page and try again.');
        hideLoadingIndicator();
        if (hadColoringMode) output.addClass('coloring-mode');
        return;
      }
      
      domtoimage.toBlob(cleanOutput, domtoimageOptions).then(function(blob) {
        output.css('padding-bottom', originalPadding);
        processGeneratedBlob(blob);
      }).catch(function(fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        handleImageGenerationError(error);
      });
    } else {
      handleImageGenerationError(error);
    }
  });

  function processGeneratedBlob(blob) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = URL.createObjectURL(blob);

    img.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      // Set willReadFrequently to true for better performance with multiple readback operations
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      const trimmedCanvas = trimCanvas(canvas);
      trimmedCanvas.toBlob(function(trimmedBlob) {
        window.saveAs(trimmedBlob, generateFilename());
        hideLoadingIndicator();
        if (hadColoringMode) output.addClass('coloring-mode');
      });
    };

    img.onerror = function() {
      console.error("Error loading generated image");
      alert("There was an error processing the generated image. Please try again.");
      hideLoadingIndicator();
      if (hadColoringMode) output.addClass('coloring-mode');
    };
  }

  function handleImageGenerationError(error) {
    console.error("Error generating image:", error);
    
    // Provide more specific error messages
    let errorMessage = "There was an error generating the image. Please try again.";
    
    if (error.message && error.message.includes('SecurityError')) {
      errorMessage = "Unable to access external resources. The image may be generated without some styling.";
    } else if (error.message && error.message.includes('cssRules')) {
      errorMessage = "Some external styles could not be loaded. The image will be generated with available styles.";
    }
    
    alert(errorMessage);
    hideLoadingIndicator();
    const output = $("#output");
    if (hadColoringMode) output.addClass('coloring-mode');
  }
  }, 0);
}

function showLoadingIndicator() {
  if ($('#loadingIndicator').length === 0) {
    $('body').append(`
      <div id="loadingIndicator" class="loading-overlay">
        <div class="loading-dialog">
          <div class="spinner"></div>
          <p class="loading-text">Generating image...</p>
        </div>
      </div>
    `);
  } else {
    $('#loadingIndicator').show();
  }
}

function hideLoadingIndicator() {
  $('#loadingIndicator').hide();
}

function showAutoSaveIndicator() {
  // Remove existing indicator
  $('.auto-save-indicator').remove();
  
  // Create and show new indicator
  const indicator = $('<div class="auto-save-indicator">Settings saved</div>');
  $('body').append(indicator);
  
  // Remove after 2 seconds
  setTimeout(() => {
    indicator.fadeOut(300, function() {
      $(this).remove();
    });
  }, 2000);
}

/**
 * Toggles the black background on the output display
 * @returns {void}
 */
function toggleBackground() {
  $("#output").toggleClass("background-active");
  if (typeof processOutput === 'function') {
    processOutput();
  }
}

function autoResizeTextarea() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';

  const currentText = $(this).val();
  if (currentText === lastProcessedText) return;

  clearTimeout(processingTimeout);
  processingTimeout = setTimeout(() => {
    lastProcessedText = currentText;
    if (typeof processOutput === 'function') {
      processOutput();
    }
  }, CONFIG.PROCESSING_DEBOUNCE_MS);
}

/**
 * Copies text to clipboard with fallback for older browsers
 * Shows visual feedback on the button element
 * @param {string} text - The text to copy to clipboard
 * @param {HTMLElement} button - The button element to show feedback on
 * @returns {void}
 */
function copyToClipboard(text, button) {

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

    copyUsingFallback(text, button);
  }
}

function copyUsingFallback(text, button) {
  try {

    const textarea = document.createElement('textarea');
    textarea.value = text;

    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);

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

function showCopySuccess(button) {
  const $btn = $(button);
  const originalBg = $btn.css("background-color");
  const originalText = $btn.text();

  $btn.css("background-color", "#a8f0c6").text("Copied!");

  setTimeout(() => {
    $btn.css("background-color", originalBg).text(originalText);
  }, CONFIG.COPY_FEEDBACK_DURATION_MS);
}

function showCopyError(button) {
  const $btn = $(button);
  const originalBg = $btn.css("background-color");
  const originalText = $btn.text();

  $btn.css("background-color", "#f0a8a8").text("Failed!");

  setTimeout(() => {
    $btn.css("background-color", originalBg).text(originalText);
  }, CONFIG.COPY_FEEDBACK_DURATION_MS);
}

function handleKeyboardShortcuts(e) {
  // Keyboard shortcuts removed as requested
}

function initTooltips() {

  $('.info-bracket').hover(
    function() {
      $(this).find('.tooltip-text').fadeIn(200);
    },
    function() {
      $(this).find('.tooltip-text').fadeOut(200);
    }
  );
}

/**
 * Saves a chat log to local storage history
 * Maintains a maximum of CONFIG.MAX_HISTORY_ITEMS entries
 * Handles quota exceeded errors gracefully
 * @param {string} text - The chat log text to save
 * @returns {void}
 */
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

    history = history.filter(item => item !== text);
    history.unshift(text);

    const MAX_HISTORY = CONFIG.MAX_HISTORY_ITEMS;
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }

    try {
      localStorage.setItem('chatlogHistory', JSON.stringify(history));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {

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

/**
 * Loads chat log history from local storage
 * @returns {Array<string>} Array of historical chat log texts
 */
function loadHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('chatlogHistory') || '[]');
    return Array.isArray(history) ? history : [];
  } catch (e) {
    console.error('Error loading history:', e);
    return [];
  }
}

function toggleHistoryPanel() {
  const panel = document.getElementById('historyPanel');
  const isOpen = panel.classList.contains('open');

  panel.classList.toggle('open');
  // After toggle, the state is opposite of isOpen, so aria-hidden should match the old state
  panel.setAttribute('aria-hidden', isOpen);

  const tab = document.querySelector('.history-tab');
  tab.setAttribute('aria-expanded', !isOpen);
  tab.setAttribute('aria-label', isOpen ? 'Open chat history' : 'Close chat history');

  // Hide/show the history tab when panel is open/closed
  if (!isOpen) {
    tab.classList.add('hidden');
  } else {
    tab.classList.remove('hidden');
  }

  const bmcContainer = document.getElementById('bmc-container');
  if (bmcContainer) {
    bmcContainer.style.display = isOpen ? 'none' : 'block';
    bmcContainer.style.opacity = isOpen ? '0' : '1';
    bmcContainer.style.visibility = isOpen ? 'hidden' : 'visible';
    bmcContainer.style.pointerEvents = isOpen ? 'none' : 'auto';
  }

  if (!isOpen) {
    const firstItem = panel.querySelector('.history-item');
    if (firstItem) firstItem.focus();
  }
}

// Add click-outside-to-close functionality for history panel
document.addEventListener('click', (e) => {
  const historyPanel = document.getElementById('historyPanel');
  const historyTab = document.querySelector('.history-tab');
  
  if (!e.target.closest('#historyPanel, .history-tab') && historyPanel.classList.contains('open')) {
    // Close the history panel by calling the toggle function
    toggleHistoryPanel();
  }
});

/**
 * Clears all chat log history after user confirmation
 * @returns {void}
 */
function clearHistory() {
  if (confirm('Are you sure you want to clear all chat history?')) {
    localStorage.removeItem('chatlogHistory');
    refreshHistoryPanel();
  }
}

/**
 * Refreshes the history panel UI with current history items
 * Applies formatting to each history item for preview
 * @returns {void}
 */
function refreshHistoryPanel() {
  const $historyItems = $('.history-items');
  const $loading = $('<div class="history-loading">Loading history...</div>');
  const $empty = $('<div class="history-empty">No history items</div>');

  $historyItems.empty().append($loading.addClass('active'));

  try {
    const history = loadHistory();

    if (history.length === 0) {
      $loading.removeClass('active');
      $historyItems.append($empty.addClass('active'));
      return;
    }

    const $items = history.map((text, index) => {
      const $item = $('<div class="history-item" role="button" tabindex="0" aria-label="Load chatlog from history"></div>');
      $item.data('index', index);

      const $textContainer = $('<div class="history-item-text"></div>');

      const lines = text.split('\n');
      const formattedLines = lines.map(line => {

        if (typeof processLine === 'function') {
          return processLine(line);
        }
        return line;
      });

      $textContainer.html(formattedLines.join('<br>'));
      $item.append($textContainer);

      return $item;
    });

    $loading.removeClass('active');
    $historyItems.append($items);

  } catch (e) {
    console.error('Error refreshing history panel:', e);
    $loading.removeClass('active');
    $historyItems.append($('<div class="history-error">Error loading history</div>'));
  }
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} unsafe - The string containing potentially unsafe HTML
 * @returns {string} The escaped string safe for HTML insertion
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toggleChangelogPanel() {
    const panel = document.getElementById('changelogPanel');
    const isOpen = panel.classList.contains('open');

    panel.classList.toggle('open');
    // After toggle, the state is opposite of isOpen, so aria-hidden should match the old state
    panel.setAttribute('aria-hidden', isOpen);

    const tab = document.querySelector('.changelog-tab');
    tab.setAttribute('aria-expanded', !isOpen);
    tab.setAttribute('aria-label', isOpen ? 'Open changelog' : 'Close changelog');

    if (!isOpen) {
        const firstItem = panel.querySelector('.changelog-item');
        if (firstItem) firstItem.focus();
    }
}

$(document).ready(function() {

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

  $(document).on('click', '.character-name-select', function() {
    const name = $(this).text();
    $('#characterNameInput').val(name);
    $('#characterNameDropdown').hide();
    localStorage.setItem('chatlogCharacterName', name);
    if (typeof applyFilter === 'function') applyFilter();
  });

  $(document).on('click', '.remove-character-btn', function(e) {
    e.stopPropagation();
    const name = $(this).data('name');
    let list = getCharacterList().filter(n => n !== name);
    saveCharacterList(list);
    renderCharacterDropdown();
  });

  $(document).on('click', function(e) {
    if (!$(e.target).closest('.input-group').length) {
      $('#characterNameDropdown').hide();
    }
  });

  $('#characterNameInput').on('keydown', function(e) {
    if (e.key === 'Escape') {
      $('#characterNameDropdown').hide();
    }
  });

  // Initialize font size from localStorage or default
  $('#font-label').val(localStorage.getItem('chatlogFontSize') || CONFIG.FONT_SIZE_DEFAULT);
  $('#lineLengthInput').val(localStorage.getItem('chatlogLineLength') || CONFIG.LINE_LENGTH_DEFAULT);
  $('#characterNameInput').val(localStorage.getItem('chatlogCharacterName') || '');

  // Update golden hint
  $('.golden-sizes-hint').html(goldenHintHTML(TYPOGRAPHIC_SCALE));

  updateFontSize();

  initTooltips();

  refreshHistoryPanel();

  // toggleHistoryPanel() is already defined globally above

  $('#font-label').on('input', function() {
    const value = parseInt($(this).val());
    // Ensure value is within valid range
    if (value < CONFIG.FONT_SIZE_MIN) $(this).val(CONFIG.FONT_SIZE_MIN);
    if (value > CONFIG.FONT_SIZE_MAX) $(this).val(CONFIG.FONT_SIZE_MAX);
    
    // Font size is now stored automatically in updateFontSize()
    updateFontSize();
    
    // Reprocess output to recalculate line breaks with new font size
    if (typeof processOutput === 'function') {
      processOutput();
    }
    
    showAutoSaveIndicator();
  });



  $('#lineLengthInput').on('input', function() {
    const value = parseInt($(this).val());
    // Remove line length limitations - allow any positive value
    if (value < CONFIG.LINE_LENGTH_MIN) $(this).val(CONFIG.LINE_LENGTH_MIN);
    
    localStorage.setItem('chatlogLineLength', $(this).val());
    if (typeof processOutput === 'function') {
      processOutput();
    }
    showAutoSaveIndicator();
  });

  $('#characterNameInput').on('input', function() {
    localStorage.setItem('chatlogCharacterName', $(this).val());
    if (typeof applyFilter === 'function') {
      applyFilter();
    }
    showAutoSaveIndicator();
  });

  $('#chatlogInput').on('input', function() {
    const text = $(this).val().trim();
    
    // Show subtle processing indicator for large inputs
    if (text.length > 1000) {
      $('#output').addClass('processing');
      setTimeout(() => {
        $('#output').removeClass('processing');
      }, 100);
    }
  });

  $(document).on('chatlogProcessed', function(event, text) {

  });

  $("#downloadOutputTransparent").click(downloadOutputImage);
  $("#toggleBackground").click(toggleBackground);
  
  // Error report button - Auto-sends to Discord/Email
  $("#copyErrorReport").click(function() {
    if (window.ErrorLogger) {
      window.ErrorLogger.sendReport();
    } else {
      alert('Error logger not loaded. Please refresh the page and try again.');
    }
  });

  const textarea = document.querySelector('.textarea-input');
  textarea.addEventListener('input', autoResizeTextarea);

  document.addEventListener('keydown', handleKeyboardShortcuts);

  if (textarea.value) {
    autoResizeTextarea.call(textarea);
  }

  $('#censorCharButton').click(function() {
    copyToClipboard('÷', this);
  });

  $('.button').hover(
    function() { $(this).css('transform', 'translateY(-2px)'); },
    function() { $(this).css('transform', 'translateY(0)'); }
  );

  $(document).on('click', function(e) {
    if (!$(e.target).closest('#historyPanel, #chatlogInput').length) {
      $('#historyPanel').hide();
    }
  });

  $(document).on('click', '.history-item', function() {
    const index = $(this).data('index');
    const history = loadHistory();
    if (history[index]) {
      $('#chatlogInput').val(history[index]).trigger('input');
      $('#historyPanel').hide();
    }
  });

  $('.history-header').append(
    $('<button class="clear-history-btn" onclick="clearHistory()" aria-label="Clear all history">Clear All</button>')
  );

  // Add click-away functionality for changelog panel
  $(document).on('click', function(e) {
    const panel = document.getElementById('changelogPanel');
    const tab = document.querySelector('.changelog-tab');
    
    if (!$(e.target).closest('#changelogPanel, .changelog-tab').length && panel.classList.contains('open')) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      tab.setAttribute('aria-expanded', 'false');
      tab.setAttribute('aria-label', 'Open changelog');
    }
  });

  // Randomly shake the Buy Me a Coffee button to draw attention (non-intrusive)
  (function initBmcNudge(){
    function nudgeOnce(){
      const btn = document.querySelector('.bmc-btn');
      if (!btn) return;
      btn.classList.add('bmc-attn');
      setTimeout(()=>btn.classList.remove('bmc-attn'), CONFIG.BMC_NUDGE_ANIMATION_MS);
    }
    function scheduleNext(){
      // random between min and max interval
      const ms = CONFIG.BMC_NUDGE_MIN_INTERVAL_MS + 
                 Math.random() * (CONFIG.BMC_NUDGE_MAX_INTERVAL_MS - CONFIG.BMC_NUDGE_MIN_INTERVAL_MS);
      setTimeout(()=>{ nudgeOnce(); scheduleNext(); }, ms);
    }
    // start after initial delay to avoid on-load distraction
    setTimeout(scheduleNext, CONFIG.BMC_NUDGE_INITIAL_DELAY_MS);
  })();
});
