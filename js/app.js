$(document).foundation();

let scaleEnabled = false;
let lastProcessedText = '';
let processingTimeout = null;

function updateFontSize() {
    const fontSize = $('#font-label').val() + 'px';
    $('#output').css('font-size', fontSize);
}

function trimCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    let top = null,
        bottom = null,
        left = null,
        right = null;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = pixels[(y * canvas.width + x) * 4 + 3];
            if (alpha > 10) { 
                top = y;
                break;
            }
        }
        if (top !== null) break;
    }

    for (let y = canvas.height - 1; y >= 0; y--) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = pixels[(y * canvas.width + x) * 4 + 3];
            if (alpha > 10) {
                bottom = y;
                break;
            }
        }
        if (bottom !== null) break;
    }

    for (let x = 0; x < canvas.width; x++) {
        for (let y = 0; y < canvas.height; y++) {
            const alpha = pixels[(y * canvas.width + x) * 4 + 3];
            if (alpha > 10) {
                left = x;
                break;
            }
        }
        if (left !== null) break;
    }

    for (let x = canvas.width - 1; x >= 0; x--) {
        for (let y = 0; y < canvas.height; y++) {
            const alpha = pixels[(y * canvas.width + x) * 4 + 3];
            if (alpha > 10) {
                right = x;
                break;
            }
        }
        if (right !== null) break;
    }

    const padding = 20;
    if (top !== null && bottom !== null && left !== null && right !== null) {
        top = Math.max(0, top - padding);
        bottom = Math.min(canvas.height - 1, bottom + padding);
        left = Math.max(0, left - padding);
        right = Math.min(canvas.width - 1, right + padding);

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

    const scale = scaleEnabled ? 2 : 1;
    const output = $("#output");
    $(".censored-content").addClass("pixelated");

    showLoadingIndicator();

    const outputNode = output[0];
    const contentContainer = outputNode.cloneNode(true);

    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '-9999px';
    wrapper.style.backgroundColor = 'transparent';
    wrapper.style.padding = '0';
    wrapper.style.margin = '0';

    wrapper.style.width = output.outerWidth() + 'px';

    wrapper.style.fontSize = output.css('fontSize');
    wrapper.style.fontFamily = output.css('fontFamily');
    wrapper.style.lineHeight = output.css('lineHeight');
    wrapper.style.color = output.css('color');
    wrapper.style.textShadow = output.css('textShadow');
    wrapper.style.letterSpacing = output.css('letterSpacing');
    wrapper.style.fontWeight = output.css('fontWeight');

    wrapper.appendChild(contentContainer);
    document.body.appendChild(wrapper);

    $(contentContainer).find('.censored-content').each(function() {
        $(this).css({
            'background-color': 'black',
            'color': 'black',
            'text-shadow': 'none',
            'display': 'inline'
        });
    });

    const contentHeight = wrapper.scrollHeight;
    const height = contentHeight * scale;
    const width = wrapper.scrollWidth * scale;

    domtoimage.toBlob(wrapper, {
        width: width,
        height: height,
        style: {
            transform: `scale(${scale})`,
            transformOrigin: "top left",
        },
        bgcolor: null,
        quality: 1
    }).then(function (blob) {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const trimmedCanvas = trimCanvas(canvas);
            trimmedCanvas.toBlob(function (trimmedBlob) {
                window.saveAs(trimmedBlob, generateFilename());
                $(".censored-content").removeClass("pixelated");
                document.body.removeChild(wrapper);
                hideLoadingIndicator();
            });
        };
    }).catch(function (error) {
        console.error("Error generating image:", error);

        html2canvas(wrapper, {
            scale: scale,
            backgroundColor: null,
            logging: false,
            useCORS: true,
            allowTaint: true
        }).then(canvas => {
            canvas.toBlob(function(blob) {
                window.saveAs(blob, generateFilename());
                $(".censored-content").removeClass("pixelated");
                document.body.removeChild(wrapper);
                hideLoadingIndicator();
            });
        }).catch(function(fallbackError) {
            console.error("Fallback error:", fallbackError);
            alert("There was an error generating the image. Please try again.");
            $(".censored-content").removeClass("pixelated");
            document.body.removeChild(wrapper);
            hideLoadingIndicator();
        });
    });
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
        function () {
            $(this).find('.tooltip-text').fadeIn(200);
        },
        function () {
            $(this).find('.tooltip-text').fadeOut(200);
        }
    );
}

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

function toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    panel.classList.toggle('open');

    const bmc = document.querySelector('.bmc-btn-container');
    if (bmc) {
        if (panel.classList.contains('open')) {
            bmc.style.display = 'none';
        } else {
            bmc.style.display = '';
        }
    }
}

function refreshHistoryPanel() {
    setTimeout(function () {
        const clearBtn = document.getElementById('clearHistoryBtn');
        if (clearBtn && !clearBtn.dataset.bound) {
            clearBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (confirm('Clear all chatlog history?')) {
                    localStorage.removeItem('chatlogHistory');
                    refreshHistoryPanel();
                }
            });
            clearBtn.dataset.bound = 'true';
        }
    }, 0);
    const itemsContainer = $('.history-items');
    itemsContainer.empty();

    const history = loadHistory();

    if (history.length === 0) {
        itemsContainer.append('<div class="history-item">No history yet</div>');
    } else {
        history.forEach((text, index) => {
            let previewLines = text.split(/\r?\n/).slice(0, 3);
            let preview = previewLines.join("\n");
            if (preview.length > 180) preview = preview.substring(0, 180) + '...';
            if (text.split(/\r?\n/).length > 3 || text.length > 180) preview += '\n...';
            itemsContainer.append(
                `<div class="history-item" data-index="${index}">
          <pre class="history-preview" style="white-space:pre-line; margin:0 0 2px 0; font-size:0.98em; line-height:1.3;">${escapeHtml(preview)}</pre>
          <small>Click to load</small>
        </div>`
            );
        });
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

$(document).ready(function () {

    let canvasMode = false;
    let uploadedImage = null;
    let canvasZoom = 1,
        canvasPanX = 0,
        canvasPanY = 0;
    let chatPosition = 'bottom-left';
    let chatPaddingH = 2;
    let chatPaddingV = 2;
    let cropping = false;

    const $canvasModeToggle = $('#canvasModeToggle');
    const $canvasModeContainer = $('#canvasModeContainer');
    const $output = $('#output');
    const $downloadBtn = $('#downloadOutputTransparent');
    const $scaleToggle = $('#scaleToggle');

    $('#canvasPaddingH').val(2);
    $('#canvasPaddingV').val(2);

    $canvasModeToggle.on('change', function () {
        canvasMode = this.checked;
        if (canvasMode) {
            $canvasModeContainer.show();
            $output.hide();
            $downloadBtn.hide();

            $scaleToggle.closest('.cell').hide();
        } else {
            $canvasModeContainer.hide();
            $output.show();
            $downloadBtn.show();
            $scaleToggle.closest('.cell').show();
        }
    });

    $('#canvasImageUploadBtn').on('click', function () {
        $('#canvasImageInput').click();
    });
    $('#canvasImageInput').on('change', function (e) {
        handleCanvasImageUpload(e.target.files[0]);
    });
    $('#canvasImageDrop').on('dragover', function (e) {
        e.preventDefault();
        $(this).addClass('dragover');
    }).on('dragleave', function () {
        $(this).removeClass('dragover');
    }).on('drop', function (e) {
        e.preventDefault();
        $(this).removeClass('dragover');
        if (e.originalEvent.dataTransfer.files.length > 0) {
            handleCanvasImageUpload(e.originalEvent.dataTransfer.files[0]);
        }
    });

    function handleCanvasImageUpload(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            uploadedImage = new window.Image();
            uploadedImage.onload = function () {
                centerAndFitImage();
                renderCanvasImage();
            };
            uploadedImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function renderCanvasImage() {
        const canvas = document.getElementById('canvasImage');
        const ctx = canvas.getContext('2d');

        const width = parseInt($('#canvasWidthInput').val(), 10) || 800;
        const height = parseInt($('#canvasHeightInput').val(), 10) || 600;
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (uploadedImage) {
            ctx.save();
            const imgW = uploadedImage.width;
            const imgH = uploadedImage.height;
            if (!canvasZoom || isNaN(canvasZoom)) {
                const scaleX = width / imgW;
                const scaleY = height / imgH;
                canvasZoom = Math.min(scaleX, scaleY, 1);
            }

            if (typeof canvasPanX === 'undefined' || typeof canvasPanY === 'undefined') {
                canvasPanX = (width - imgW * canvasZoom) / 2;
                canvasPanY = (height - imgH * canvasZoom) / 2;
            }

            const minPanX = Math.min(0, width - imgW * canvasZoom);
            const maxPanX = Math.max(0, width - imgW * canvasZoom);
            const minPanY = Math.min(0, height - imgH * canvasZoom);
            const maxPanY = Math.max(0, height - imgH * canvasZoom);

            canvasPanX = Math.max(minPanX, Math.min(canvasPanX, maxPanX));
            canvasPanY = Math.max(minPanY, Math.min(canvasPanY, maxPanY));
            ctx.setTransform(canvasZoom, 0, 0, canvasZoom, canvasPanX, canvasPanY);
            ctx.drawImage(uploadedImage, 0, 0);
            ctx.restore();
        }
        $(canvas).show();
        renderCanvasChatOverlay();
    }

    function centerAndFitImage() {
        const width = parseInt($('#canvasWidthInput').val(), 10) || 800;
        const height = parseInt($('#canvasHeightInput').val(), 10) || 600;
        if (uploadedImage) {
            let imgW = uploadedImage.width;
            let imgH = uploadedImage.height;
            const scaleX = width / imgW;
            const scaleY = height / imgH;
            canvasZoom = Math.min(scaleX, scaleY, 1);
            canvasPanX = (width - imgW * canvasZoom) / 2;
            canvasPanY = (height - imgH * canvasZoom) / 2;
        }
    }

    let isPanning = false;
    let panStart = {
        x: 0,
        y: 0
    };
    $('#canvasImage').on('mousedown', function (e) {
        if (cropping) return;
        isPanning = true;
        panStart.x = e.clientX - canvasPanX;
        panStart.y = e.clientY - canvasPanY;
        $(document).on('mousemove.canvasPan', function (ev) {
            if (!isPanning) return;

            let newPanX = ev.clientX - panStart.x;
            let newPanY = ev.clientY - panStart.y;

            if (uploadedImage) {
                const canvas = document.getElementById('canvasImage');
                const width = canvas.width;
                const height = canvas.height;
                const imgW = uploadedImage.width * canvasZoom;
                const imgH = uploadedImage.height * canvasZoom;

                if (imgW <= width) {
                    newPanX = (width - imgW) / 2;
                } else {
                    newPanX = Math.min(0, Math.max(width - imgW, newPanX));
                }

                if (imgH <= height) {
                    newPanY = (height - imgH) / 2;
                } else {
                    newPanY = Math.min(0, Math.max(height - imgH, newPanY));
                }
            }
            canvasPanX = newPanX;
            canvasPanY = newPanY;
            renderCanvasImage();
        });
        $(document).on('mouseup.canvasPan', function () {
            isPanning = false;
            $(document).off('.canvasPan');
        });
    });
    $('#canvasImage').on('wheel', function (e) {
        e.preventDefault();
        const scale = (e.originalEvent.deltaY < 0) ? 1.1 : 0.9;

        const rect = this.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - canvasPanX) / canvasZoom;
        const mouseY = (e.clientY - rect.top - canvasPanY) / canvasZoom;
        let newZoom = canvasZoom * scale;

        if (uploadedImage) {
            const canvas = document.getElementById('canvasImage');
            const width = canvas.width;
            const height = canvas.height;
            const minZoomX = width / uploadedImage.width;
            const minZoomY = height / uploadedImage.height;
            const minZoom = Math.min(minZoomX, minZoomY, 1e10);
            newZoom = Math.max(newZoom, minZoom);

            const imgW = uploadedImage.width * newZoom;
            const imgH = uploadedImage.height * newZoom;
            let newPanX = canvasPanX - mouseX * (newZoom - canvasZoom);
            let newPanY = canvasPanY - mouseY * (newZoom - canvasZoom);
            if (imgW <= width) {
                newPanX = (width - imgW) / 2;
            } else {
                newPanX = Math.min(0, Math.max(width - imgW, newPanX));
            }
            if (imgH <= height) {
                newPanY = (height - imgH) / 2;
            } else {
                newPanY = Math.min(0, Math.max(height - imgH, newPanY));
            }
            canvasZoom = newZoom;
            canvasPanX = newPanX;
            canvasPanY = newPanY;
        }
        renderCanvasImage();
    });

    $('#canvasWidthInput, #canvasHeightInput').on('input', function () {
        const w = parseInt($('#canvasWidthInput').val(), 10) || 800;
        const h = parseInt($('#canvasHeightInput').val(), 10) || 600;
        const wrapper = document.getElementById('canvasImageWrapper');
        if (wrapper) {
            wrapper.style.width = w + 'px';
            wrapper.style.height = h + 'px';
        }
        renderCanvasImage();
    });

    function updateChatPosButtons() {
        $('.chat-pos-btn').removeClass('active');
        $('.chat-pos-btn').each(function () {
            if ($(this).data('pos') === chatPosition) {
                $(this).addClass('active');
            }
        });
    }
    $('.chat-pos-btn').on('click', function () {
        chatPosition = $(this).data('pos');
        updateChatPosButtons();
        if (canvasMode) renderCanvasChatOverlay();
    });

    $canvasModeToggle.on('change', function () {
        if (this.checked) {
            renderCanvasChatOverlay();
        }
    });

    $('#canvasPaddingH').on('input', function () {
        chatPaddingH = parseInt($(this).val(), 10) || 0;
        renderCanvasChatOverlay();
    });
    $('#canvasPaddingV').on('input', function () {
        chatPaddingV = parseInt($(this).val(), 10) || 0;
        renderCanvasChatOverlay();
    });

    $canvasModeToggle.on('change', function () {
        if (this.checked) {
            updateChatPosButtons();
            $('#canvasPaddingH').val(chatPaddingH);
            $('#canvasPaddingV').val(chatPaddingV);
        } else {
            $('.chat-pos-btn').removeClass('active');
        }
    });

    function renderCanvasChatOverlay() {
        const overlay = document.getElementById('canvasChatOverlay');
        const output = document.getElementById('output');
        if (!output || !overlay) return;

        const fontSizePx = parseInt(output.style.fontSize || document.getElementById('font-label').value, 10) || 12;
        const lineLength = parseInt(document.getElementById('lineLengthInput').value, 10) || 77;
        let maxWidth = fontSizePx * lineLength;
        const hPad = parseInt(document.getElementById('canvasPaddingH').value, 10) || 0;
        const vPad = parseInt(document.getElementById('canvasPaddingV').value, 10) || 0;
        const wrapper = document.getElementById('canvasImageWrapper');

        if (wrapper) {
            maxWidth = Math.min(maxWidth, wrapper.offsetWidth - 2 * hPad);
        }

        const font = window.getComputedStyle(output).font;

        const finalDiv = document.createElement('div');
        finalDiv.innerHTML = output.innerHTML;
        finalDiv.style.fontSize = fontSizePx + 'px';
        finalDiv.querySelectorAll('.generated').forEach(div => {
            if (window.addPixelLineBreaksAndHandleSpans) {
                div.innerHTML = window.addPixelLineBreaksAndHandleSpans(div.innerHTML, maxWidth, font, output);
            }
        });
        overlay.innerHTML = finalDiv.innerHTML;
        overlay.style.fontSize = fontSizePx + 'px';
        switch (chatPosition) {
        case 'top-left':
            overlay.style.top = vPad + 'px';
            overlay.style.left = hPad + 'px';
            overlay.style.right = '';
            overlay.style.bottom = '';
            overlay.style.transform = 'none';
            break;
        case 'top-center':
            overlay.style.top = vPad + 'px';
            overlay.style.left = '';
            overlay.style.right = '';
            overlay.style.bottom = '';
            overlay.style.transform = 'translateX(' + (wrapper.offsetWidth - overlay.offsetWidth) / 2 + 'px)';
            break;
        case 'top-right':
            overlay.style.top = vPad + 'px';
            overlay.style.left = '';
            overlay.style.right = hPad + 'px';
            overlay.style.bottom = '';
            overlay.style.transform = 'none';
            break;
        case 'bottom-left':
            overlay.style.top = '';
            overlay.style.left = hPad + 'px';
            overlay.style.right = '';
            overlay.style.bottom = vPad + 'px';
            overlay.style.transform = 'none';
            break;
        case 'bottom-center':
            overlay.style.top = '';
            overlay.style.left = '';
            overlay.style.right = '';
            overlay.style.bottom = vPad + 'px';
            overlay.style.transform = 'translateX(' + (wrapper.offsetWidth - overlay.offsetWidth) / 2 + 'px)';
            break;
        case 'bottom-right':
            overlay.style.top = '';
            overlay.style.left = '';
            overlay.style.right = hPad + 'px';
            overlay.style.bottom = vPad + 'px';
            overlay.style.transform = 'none';
            break;
        default:
            overlay.style.top = vPad + 'px';
            overlay.style.left = hPad + 'px';
            overlay.style.right = '';
            overlay.style.bottom = '';
            overlay.style.transform = 'none';
        }
    }

    $('#font-label, #lineLengthInput, #characterNameInput, #canvasPaddingH, #canvasPaddingV').on('input', function () {
        renderCanvasChatOverlay();
    });

    $('#canvasExportBtn').on('click', function () {
        renderCanvasChatOverlay();
        const canvas = document.getElementById('canvasImage');
        const overlay = document.getElementById('canvasChatOverlay');
        if (!canvas || !overlay) return;
        const wrapper = document.getElementById('canvasImageWrapper');
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const ctx = exportCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        exportCanvas.width = canvas.width * dpr;
        exportCanvas.height = canvas.height * dpr;
        exportCanvas.style.width = canvas.width + 'px';
        exportCanvas.style.height = canvas.height + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, exportCanvas.width, exportCanvas.height);
        if (window.domtoimage && window.domtoimage.toBlob) {
            // Create a temporary container for the overlay with proper width
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '-9999px';
            tempContainer.style.width = (overlay.offsetWidth + 40) + 'px'; // Add padding
            tempContainer.style.fontSize = overlay.style.fontSize;
            tempContainer.style.fontFamily = window.getComputedStyle(overlay).fontFamily;
            tempContainer.style.lineHeight = '1.3';
            tempContainer.style.color = window.getComputedStyle(overlay).color;
            tempContainer.style.textShadow = window.getComputedStyle(overlay).textShadow;
            tempContainer.style.letterSpacing = window.getComputedStyle(overlay).letterSpacing;
            tempContainer.style.fontWeight = window.getComputedStyle(overlay).fontWeight;
            tempContainer.style.whiteSpace = 'pre-line';
            tempContainer.innerHTML = overlay.innerHTML;
            document.body.appendChild(tempContainer);

            // Calculate the actual height needed for the content
            const contentHeight = tempContainer.scrollHeight;
            const contentWidth = tempContainer.scrollWidth;

            window.domtoimage.toBlob(tempContainer, {
                width: contentWidth * dpr,
                height: contentHeight * dpr,
                style: {
                    transform: 'scale(' + dpr + ')',
                    transformOrigin: 'top left',
                },
                filter: () => true,
                bgcolor: null,
                quality: 1
            }).then(blob => {
                const img = new window.Image();
                img.onload = function () {
                    const wrapperRect = wrapper.getBoundingClientRect();
                    const overlayRect = overlay.getBoundingClientRect();
                    const domRect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / domRect.width;
                    const scaleY = canvas.height / domRect.height;
                    const offsetX = (overlayRect.left - wrapperRect.left) * scaleX;
                    const offsetY = (overlayRect.top - wrapperRect.top) * scaleY;
                    
                    // Calculate the correct dimensions while maintaining aspect ratio
                    const aspectRatio = img.width / img.height;
                    const overlayW = overlay.offsetWidth * scaleX;
                    const overlayH = overlayW / aspectRatio;
                    
                    ctx.drawImage(img, offsetX * dpr, offsetY * dpr, overlayW * dpr, overlayH * dpr);
                    exportCanvas.toBlob(function (finalBlob) {
                        saveAs(finalBlob, generateFilename());
                        document.body.removeChild(tempContainer);
                    });
                };
                img.src = URL.createObjectURL(blob);
            });
        } else {
            alert('html2canvas is required for screenshot export. Please include html2canvas.js');
        }
    });

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

    $('#addCharacterBtn').on('click', function () {
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

    $('#showCharacterListBtn').on('click', function (e) {
        e.stopPropagation();
        const dropdown = $('#characterNameDropdown');
        if (dropdown.is(':visible')) {
            dropdown.hide();
        } else {
            renderCharacterDropdown();
            dropdown.show();
        }
    });

    $(document).on('click', '.character-name-select', function () {
        const name = $(this).text();
        $('#characterNameInput').val(name);
        $('#characterNameDropdown').hide();
        localStorage.setItem('chatlogCharacterName', name);
        if (typeof applyFilter === 'function') applyFilter();
    });

    $(document).on('click', '.remove-character-btn', function (e) {
        e.stopPropagation();
        const name = $(this).data('name');
        let list = getCharacterList().filter(n => n !== name);
        saveCharacterList(list);
        renderCharacterDropdown();
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('.input-group').length) {
            $('#characterNameDropdown').hide();
        }
    });

    $('#characterNameInput').on('keydown', function (e) {
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

    $('#font-label').on('input', function () {
        localStorage.setItem('chatlogFontSize', $(this).val());
        updateFontSize();

        document.getElementById('canvasChatOverlay').style.fontSize = this.value + 'px';
        if (canvasMode) renderCanvasChatOverlay();
    });

    $('#lineLengthInput').on('input', function () {
        localStorage.setItem('chatlogLineLength', $(this).val());
        if (canvasMode) renderCanvasChatOverlay();
    });

    $('#characterNameInput').on('input', function () {
        localStorage.setItem('chatlogCharacterName', $(this).val());
        if (typeof applyFilter === 'function') applyFilter();
    });

    $('#chatlogInput').on('input', function () {
        const text = $(this).val().trim();
        if (text) {
            saveToHistory(text);
        }
    });

    $(document).on('chatlogProcessed', function (event, text) {
        saveToHistory(text);
    });

    $("#scaleToggle").change(function () {
        scaleEnabled = $(this).is(":checked");
    });

    $("#downloadOutputTransparent").click(downloadOutputImage);
    $("#toggleBackground").click(toggleBackground);

    const textarea = document.querySelector('.textarea-input');
    textarea.addEventListener('input', autoResizeTextarea);

    document.addEventListener('keydown', handleKeyboardShortcuts);

    if (textarea.value) {
        autoResizeTextarea.call(textarea);
    }

    $('#censorCharButton').click(function () {
        copyToClipboard('÷', this);
    });

    $('.button').hover(
        function () {
            $(this).css('transform', 'translateY(-2px)');
        },
        function () {
            $(this).css('transform', 'translateY(0)');
        }
    );

    $(document).on('click', function (e) {
        if (!$(e.target).closest('#historyPanel, #chatlogInput').length) {
            $('#historyPanel').hide();
        }
    });

    $(document).on('click', '.history-item', function () {
        const index = $(this).data('index');
        const history = loadHistory();
        if (history[index]) {
            $('#chatlogInput').val(history[index]).trigger('input');
            $('#historyPanel').hide();
        }
    });
});