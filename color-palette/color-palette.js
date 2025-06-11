(function($) {
    'use strict';

    let coloringMode = false;
    let selectedElements = [];
    let isDragging = false;
    let dragStartElement = null;

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
            isDragging = false;
            dragStartElement = null;

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
            clearAllSelections();
            selectedElements.push(clickedElement);
            $(clickedElement).addClass("selected-for-coloring");
        }
    }

    function handleDragStart(e) {
        if (!coloringMode) return;

        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        dragStartElement = e.currentTarget;

        if (!e.ctrlKey) {
            clearAllSelections();
        }

        if (!selectedElements.includes(dragStartElement)) {
            selectedElements.push(dragStartElement);
            $(dragStartElement).addClass("selected-for-coloring");
        }
    }

    function handleDragOver(e) {
        if (!isDragging || !coloringMode) return;

        e.preventDefault();
        e.stopPropagation();

        const currentElement = e.currentTarget;
        if (!selectedElements.includes(currentElement)) {
            selectedElements.push(currentElement);
            $(currentElement).addClass("selected-for-coloring");
        }
    }

    function handleDragEnd(e) {
        if (!coloringMode) return;

        e.preventDefault();
        e.stopPropagation();

        isDragging = false;
        dragStartElement = null;
    }

    function clearAllSelections() {
        selectedElements.forEach(element => {
            $(element).removeClass("selected-for-coloring");
        });
        selectedElements = [];
    }

    const COLOR_CLASSES = [
        'me', 'ame', 'darkgrey', 'grey', 'lightgrey', 'death', 'yellow',
        'green', 'orange', 'blue', 'white', 'radioColor', 'radioColor2',
        'depColor', 'vesseltraffic', 'toyou'
    ];

    function applyColorToSelection(e) {
        if (!coloringMode || selectedElements.length === 0) return;

        const colorClass = $(e.currentTarget).data('color');
        selectedElements.forEach(element => {
            $(element)
                .removeClass(COLOR_CLASSES.join(' '))
                .addClass('colorable')
                .addClass(colorClass)
                .removeClass('selected-for-coloring');
        });

        clearAllSelections();
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
        $output.find('span').addClass('colorable');
    }

    window.ColorPalette = {
        init: init,
        toggleColoringMode: toggleColoringMode
    };

})(jQuery);