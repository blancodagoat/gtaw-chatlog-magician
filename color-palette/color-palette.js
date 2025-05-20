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
        isDragging = true;
        dragStartElement = e.currentTarget;
    }

    function handleDragEnd(e) {
        if (!coloringMode) return;
        isDragging = false;
        dragStartElement = null;
    }

    function handleDragOver(e) {
        if (!coloringMode || !isDragging) return;
        const currentElement = e.currentTarget;
        if (currentElement !== dragStartElement) {
            if (!selectedElements.includes(currentElement)) {
                selectedElements.push(currentElement);
                $(currentElement).addClass("selected-for-coloring");
            }
        }
    }

    function clearAllSelections() {
        selectedElements.forEach(element => {
            $(element).removeClass("selected-for-coloring");
        });
        selectedElements = [];
    }

    function applyColorToSelection(e) {
        if (!coloringMode || selectedElements.length === 0) return;

        const colorClass = $(e.currentTarget).data('color');
        selectedElements.forEach(element => {
            $(element).removeClass().addClass(colorClass);
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