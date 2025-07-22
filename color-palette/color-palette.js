(function($) {
    'use strict';

    let coloringMode = false;
    let selectedElements = [];
    let isDragging = false;
    let dragStartElement = null;
    let dragDistance = 0; // Track if we actually moved during drag
    let dragStartPosition = null; // Track starting position
    let justFinishedDragging = false; // Flag to prevent click from clearing selection after drag
    let mouseDownTime = 0; // Track when mouse was pressed
    let mouseUpTime = 0; // Track when mouse was released

    let $colorPalette;
    let $output;
    let $toggleColorPaletteBtn;

    function init() {
        $colorPalette = $("#colorPalette");
        $output = $("#output");
        $toggleColorPaletteBtn = $("#toggleColorPalette");

        $toggleColorPaletteBtn.click(toggleColoringMode);
        $colorPalette.on("click", ".color-item", applyColorToSelection);
        $output.on("click", ".colorable", handleTextElementClick);
        $output.on("mousedown", ".colorable", handleDragStart);
        $output.on("mouseup", ".colorable", handleDragEnd);
        $output.on("mouseover", ".colorable", handleDragOver);
        
        // Add global mouse up handler to ensure drag state is reset
        $(document).on("mouseup", handleGlobalMouseUp);

        // Add click handler to clear selections when clicking outside selected elements
        $output.on("click", function(e) {
            if (!coloringMode) return;
            
            // Don't clear selections if we just finished dragging
            if (justFinishedDragging) {
                console.log('Preventing selection clear due to recent drag');
                return;
            }
            
            // If clicking on the output area but not on a colorable element, clear selections
            if (!$(e.target).hasClass('colorable') && !$(e.target).closest('.colorable').length) {
                console.log('Clearing selections due to click outside colorable elements');
                clearAllSelections();
            }
        });
        
        // Add mouseleave handler to reset drag state if mouse leaves the output area
        $output.on("mouseleave", function(e) {
            if (!coloringMode) return;
            
            if (isDragging) {
                console.log('Mouse left output area while dragging, resetting state');
                isDragging = false;
                dragStartElement = null;
                dragDistance = 0;
                dragStartPosition = null;
                justFinishedDragging = false;
            }
        });

        // Add keyboard shortcuts
        $(document).on("keydown", function(e) {
            if (!coloringMode) return;
            
            if (e.key === "Escape") {
                clearAllSelections();
            }
            
            // Number keys 1-9 for quick color selection
            if (e.key >= '1' && e.key <= '9' && selectedElements.length > 0) {
                const colorIndex = parseInt(e.key) - 1;
                const colorItems = $('.color-item');
                if (colorIndex < colorItems.length) {
                    const colorClass = colorItems.eq(colorIndex).data('color');
                    applyColorToSelectionByClass(colorClass);
                }
            }
        });

        // Prevent default text selection in coloring mode
        $output.on("selectstart", ".colorable", function(e) {
            if (coloringMode) {
                e.preventDefault();
                return false;
            }
        });

        setupClosePaletteHandler();
        $(window).on('resize', updateColorPalettePosition);
    }

    function toggleColoringMode() {
        coloringMode = !coloringMode;
        $toggleColorPaletteBtn.toggleClass("btn-dark", coloringMode);

        if (coloringMode) {
            $output.addClass("coloring-mode");
            clearAllSelections();
            isDragging = false;
            dragStartElement = null;
            $colorPalette.show();

            // Disable text selection globally while in coloring mode
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.mozUserSelect = 'none';
            document.body.style.msUserSelect = 'none';

            alert("Click on text to select it. Use Ctrl+click for multiple selections or drag to select multiple items. Click 'Color Text' button again to exit coloring mode.");

            setTimeout(function() {
                makeTextColorable();
                updateColorPalettePosition();
            }, 100);

            $(document).off('click.closePalette');
        } else {
            $output.removeClass("coloring-mode");
            $colorPalette.hide();
            clearAllSelections();
            
            // Reset all drag state
            isDragging = false;
            dragStartElement = null;
            dragDistance = 0;
            dragStartPosition = null;
            justFinishedDragging = false;
            mouseDownTime = 0;
            mouseUpTime = 0;

            // Re-enable text selection
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.body.style.mozUserSelect = '';
            document.body.style.msUserSelect = '';

            setupClosePaletteHandler();
        }
    }

    function setupClosePaletteHandler() {
        $(document).off('click.closePalette').on('click.closePalette', function(e) {
            if (!coloringMode) return;
            if (!$(e.target).closest('#colorPalette, #toggleColorPalette').length) {
                if (!coloringMode) {
                    $colorPalette.hide();
                }
            }
        });
    }

    function handleTextElementClick(e) {
        if (!coloringMode) return;

        e.preventDefault();
        e.stopPropagation();

        const clickedElement = e.currentTarget;

        if (e.ctrlKey) {
            const index = selectedElements.indexOf(clickedElement);
            if (index > -1) {
                selectedElements.splice(index, 1);
                $(clickedElement).removeClass("selected-for-coloring");
            } else {
                selectedElements.push(clickedElement);
                $(clickedElement).addClass("selected-for-coloring");
            }
        } else {
            // Don't clear selections if we just finished dragging
            if (!justFinishedDragging) {
                clearAllSelections();
            }
            selectedElements.push(clickedElement);
            $(clickedElement).addClass("selected-for-coloring");
        }
        updateSelectionCounter();
    }

    function handleDragStart(e) {
        if (!coloringMode) return;

        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        dragStartElement = e.currentTarget;
        dragStartPosition = { x: e.clientX, y: e.clientY };
        mouseDownTime = Date.now();

        if (!e.ctrlKey) {
            clearAllSelections();
        }

        if (!selectedElements.includes(dragStartElement)) {
            selectedElements.push(dragStartElement);
            $(dragStartElement).addClass("selected-for-coloring");
        }
        updateSelectionCounter();
    }

    function handleDragOver(e) {
        if (!isDragging || !coloringMode) return;

        e.preventDefault();
        e.stopPropagation();

        // Track drag distance
        if (dragStartPosition) {
            const dx = e.clientX - dragStartPosition.x;
            const dy = e.clientY - dragStartPosition.y;
            dragDistance = Math.sqrt(dx * dx + dy * dy);
        }

        const currentElement = e.currentTarget;
        if (!selectedElements.includes(currentElement)) {
            selectedElements.push(currentElement);
            $(currentElement).addClass("selected-for-coloring");
        }
        updateSelectionCounter();
    }

    function handleDragEnd(e) {
        if (!coloringMode) return;

        e.preventDefault();
        e.stopPropagation();

        mouseUpTime = Date.now();
        const clickDuration = mouseUpTime - mouseDownTime;
        
        console.log('Drag ended, selected elements:', selectedElements.length, 'drag distance:', dragDistance, 'click duration:', clickDuration);
        
        isDragging = false;
        dragStartElement = null;
        
        // Only set the flag if we actually moved during the drag (not just a click)
        if (dragDistance > 5) { // Threshold of 5 pixels
            justFinishedDragging = true;
            setTimeout(() => {
                justFinishedDragging = false;
                console.log('Drag flag reset, selected elements:', selectedElements.length);
            }, 150); // Increased timeout to 150ms
        } else if (clickDuration < 200) {
            // Short click, ensure we're not in a drag state
            justFinishedDragging = false;
        }
        
        // Reset drag tracking
        dragDistance = 0;
        dragStartPosition = null;
    }

    function clearAllSelections() {
        selectedElements.forEach(element => {
            $(element).removeClass("selected-for-coloring");
        });
        selectedElements = [];
        updateSelectionCounter();
    }

    function updateSelectionCounter() {
        const count = selectedElements.length;
        $('.selection-counter').text(count + ' selected');
    }

    function handleGlobalMouseUp(e) {
        if (!coloringMode) return;
        
        // If we're still in a dragging state but mouse is up, reset everything
        if (isDragging) {
            console.log('Global mouse up detected while dragging, resetting state');
            isDragging = false;
            dragStartElement = null;
            dragDistance = 0;
            dragStartPosition = null;
            justFinishedDragging = false;
        }
    }

    function getElementsBetween(startEl, endEl) {
        const allSpans = $output.find('span.colorable').toArray();

        const startIndex = allSpans.indexOf(startEl);
        const endIndex = allSpans.indexOf(endEl);

        if (startIndex === -1 || endIndex === -1) return [];

        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        return allSpans.slice(start, end + 1);
    }

    const COLOR_CLASSES = [
        'me', 'ame', 'darkgrey', 'grey', 'lightgrey', 'death', 'yellow',
        'green', 'orange', 'blue', 'white', 'radioColor', 'radioColor2',
        'depColor', 'vesseltraffic', 'toyou'
    ];

    function applyColorToSelection(e) {
        if (!coloringMode || selectedElements.length === 0) return;

        const colorClass = $(e.currentTarget).data('color');
        applyColorToSelectionByClass(colorClass);
    }

    function applyColorToSelectionByClass(colorClass) {
        if (!coloringMode || selectedElements.length === 0) return;

        selectedElements.forEach(element => {
            $(element)
                .removeClass(COLOR_CLASSES.join(' '))
                .addClass('colorable')
                .addClass(colorClass);
        });
        
        // Show brief feedback
        showColorAppliedFeedback(colorClass);
    }

    function showColorAppliedFeedback(colorClass) {
        // Remove existing feedback
        $('.color-applied-feedback').remove();
        
        // Create feedback element
        const feedback = $(`<div class="color-applied-feedback">Applied ${colorClass}</div>`);
        $('body').append(feedback);
        
        // Remove after 1 second
        setTimeout(() => {
            feedback.fadeOut(300, function() {
                $(this).remove();
            });
        }, 1000);
    }

    function updateColorPalettePosition() {
        const windowHeight = $(window).height();
        const paletteHeight = $colorPalette.outerHeight();

        if (paletteHeight + 20 > windowHeight) {
            $colorPalette.css({
                'max-height': (windowHeight - 40) + 'px',
                'bottom': '20px'
            });
        } else {
            $colorPalette.css({
                'bottom': '20px'
            });
        }
    }

    function makeTextColorable() {
        // Use the main chatlog parser's makeTextColorable function if it exists
        if (typeof window.makeTextColorable === 'function') {
            window.makeTextColorable();
        } else {
            // Fallback to simple implementation
            $output.find('span').addClass('colorable');
        }
    }

    window.ColorPalette = {
        init: init,
        toggleColoringMode: toggleColoringMode
    };

})(jQuery);