$(document).foundation();

let scaleEnabled = false;
let lastProcessedText = '';
let processingTimeout = null;

function updateFontSize() {
  const fontSize = $('#font-label').val() + 'px';
  $('#output').css('font-size', fontSize);
}

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

function generateFilename() {
  return new Date()
    .toLocaleString()
    .replaceAll(",", "_")
    .replaceAll(" ", "_")
    .replaceAll("/", "-")
    .replace("__", "_")
    .replaceAll(":", "-") + "_chatlog.png";
}

function downloadOutputImage() {
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
        return true;
      },
      imagePlaceholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y0ZjRmNCIvPjwvc3ZnPg=='
    };

  // Try with original output first
  if (typeof domtoimage === 'undefined') {
    console.error('domtoimage library not loaded');
    alert('Image generation library not available. Please refresh the page and try again.');
    hideLoadingIndicator();
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
      });
    };

    img.onerror = function() {
      console.error("Error loading generated image");
      alert("There was an error processing the generated image. Please try again.");
      hideLoadingIndicator();
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
  }
}

function showLoadingIndicator() {

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

function hideLoadingIndicator() {
  $('#loadingIndicator').hide();
}

function toggleBackground() {
  $("#output").toggleClass("background-active");
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
  }, 300);
}

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
  }, 1500);
}

function showCopyError(button) {
  const $btn = $(button);
  const originalBg = $btn.css("background-color");
  const originalText = $btn.text();

  $btn.css("background-color", "#f0a8a8").text("Failed!");

  setTimeout(() => {
    $btn.css("background-color", originalBg).text(originalText);
  }, 1500);
}

function handleKeyboardShortcuts(e) {

  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    downloadOutputImage();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    toggleBackground();
  }
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

    const MAX_HISTORY = 20;
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
  panel.setAttribute('aria-hidden', !isOpen);

  const tab = document.querySelector('.history-tab');
  tab.setAttribute('aria-expanded', !isOpen);
  tab.setAttribute('aria-label', isOpen ? 'Open chat history' : 'Close chat history');

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

function clearHistory() {
  if (confirm('Are you sure you want to clear all chat history?')) {
    localStorage.removeItem('chatlogHistory');
    refreshHistoryPanel();
  }
}

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
    panel.setAttribute('aria-hidden', !isOpen);

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

  $('#font-label').val(localStorage.getItem('chatlogFontSize') || 12);
  $('#lineLengthInput').val(localStorage.getItem('chatlogLineLength') || 77);
  $('#characterNameInput').val(localStorage.getItem('chatlogCharacterName') || '');

  updateFontSize();

  initTooltips();

  refreshHistoryPanel();

  function toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    panel.classList.toggle('open');
  }

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

  $('#chatlogInput').on('input', function() {

    const text = $(this).val().trim();
  });

  $(document).on('chatlogProcessed', function(event, text) {

  });

  $("#downloadOutputTransparent").click(downloadOutputImage);
  $("#toggleBackground").click(toggleBackground);

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
});