(function(global, factory) {
  if (typeof define === 'function' && define.amd) {
      define(['jquery'], factory);
  } else if (typeof exports === 'object' && typeof module === 'object') {
      module.exports = factory;
  } else {
      factory(jQuery);
  }
})(this, function($) {
  'use strict';

  const DEFAULT_OPTIONS = {
      beforeShow: noop,
      move: noop,
      change: noop,
      show: noop,
      hide: noop,
      color: false,
      flat: false,
      showInput: false,
      allowEmpty: false,
      showButtons: true,
      clickoutFiresChange: true,
      showInitial: false,
      showPalette: false,
      showPaletteOnly: false,
      hideAfterPaletteSelect: false,
      togglePaletteOnly: false,
      showSelectionPalette: true,
      localStorageKey: false,
      appendTo: 'body',
      maxSelectionSize: 7,
      cancelText: 'cancel',
      chooseText: 'choose',
      togglePaletteMoreText: 'more',
      togglePaletteLessText: 'less',
      clearText: 'Clear Color Selection',
      noColorSelectedText: 'No Color Selected',
      preferredFormat: false,
      className: '',
      containerClassName: '',
      replacerClassName: '',
      showAlpha: false,
      theme: 'sp-light',
      palette: [
        [
              '#ffffff', '#000000', '#ff0000', '#ff8000', '#ffff00',
              '#008000', '#0000ff', '#4b0082', '#9400d3'
          ]
      ],
      selectionPalette: [],
      disabled: false,
      offset: null
  };

  const instances = new Map();
  const isIE = /msie/i.test(navigator.userAgent);
  const supportsRGBA = (() => {
      const div = document.createElement('div');
      div.style.cssText = 'background-color:rgba(0,0,0,.5)';
      return /rgba|hsla/.test(div.style.backgroundColor);
    })();

  const replacerTemplate = `
      <div class='sp-replacer'>
          <div class='sp-preview'><div class='sp-preview-inner'></div></div>
          <div class='sp-dd'>&#9660;</div>
      </div>
  `;

  const pickerTemplate = (() => {
      const ieDivs = isIE ? Array.from({length: 6}, (_, i) => 
          `<div class='sp-${i + 1}'></div>`
      ).join('') : '';

      return `
          <div class='sp-container sp-hidden'>
              <div class='sp-palette-container'>
                  <div class='sp-palette sp-thumb sp-cf'></div>
                  <div class='sp-palette-button-container sp-cf'>
                      <button type='button' class='sp-palette-toggle'></button>
                  </div>
              </div>
              <div class='sp-picker-container'>
                  <div class='sp-top sp-cf'>
                      <div class='sp-fill'></div>
                      <div class='sp-top-inner'>
                          <div class='sp-color'>
                              <div class='sp-sat'>
                                  <div class='sp-val'>
                                      <div class='sp-dragger'></div>
                                  </div>
                              </div>
                          </div>
                          <div class='sp-clear sp-clear-display'></div>
                          <div class='sp-hue'>
                              <div class='sp-slider'></div>
                              ${ieDivs}
                          </div>
                      </div>
                      <div class='sp-alpha'>
                          <div class='sp-alpha-inner'>
                              <div class='sp-alpha-handle'></div>
                          </div>
                      </div>
                  </div>
                  <div class='sp-input-container sp-cf'>
                      <input class='sp-input' type='text' spellcheck='false' />
                  </div>
              </div>
          </div>
      `;
  })();

  function noop() {}

  function debounce(fn, delay) {
      let timeout;
      return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => fn.apply(this, args), delay);
      };
  }

  function throttle(fn, delay) {
      let lastCall = 0;
      return function(...args) {
          const now = Date.now();
          if (now - lastCall >= delay) {
              lastCall = now;
              return fn.apply(this, args);
          }
      };
  }

  function createPalette(colors, selectedColor, className, options) {
      if (!Array.isArray(colors)) return '';

      return colors.map(color => {
          if (!color) {
              return `
                  <div>
                      <span data-color="" 
                            style="background-color:transparent;" 
                            class="sp-clear-display"
                            title="${options.noColorSelectedText}">
                      </span>
                  </div>
              `;
          }

          const tinyColor = tinycolor(color);
          const isDark = tinyColor.toHsl().l < 0.5;
          const isSelected = tinycolor.equals(selectedColor, color);
          const colorString = tinyColor.toString(options.preferredFormat || 'rgb');
          const style = supportsRGBA 
              ? `background-color:${tinyColor.toRgbString()}`
              : `filter:${tinyColor.toFilter()}`;

          return `
              <span title="${colorString}" 
                    data-color="${tinyColor.toRgbString()}" 
                    class="sp-thumb-el sp-thumb-${isDark ? 'dark' : 'light'}${isSelected ? ' sp-thumb-active' : ''}">
                  <span class="sp-thumb-inner" style="${style};"></span>
              </span>
          `;
      }).join('');
  }

  function hideAll() {
      instances.forEach(instance => {
          if (instance) instance.hide();
      });
  }

  function mergeOptions(options, element) {
      const merged = {...DEFAULT_OPTIONS, ...options};
      merged.callbacks = {
          move: debounce(merged.move, 10),
          change: debounce(merged.change, 10),
          show: merged.show,
          hide: merged.hide,
          beforeShow: merged.beforeShow
      };
      return merged;
  }

  class ColorPicker {
      constructor(element, options) {
          this.element = element;
          this.options = mergeOptions(options, element);
          this.state = {
              isDragging: false,
              isInitialized: false,
              isVisible: false,
              currentColor: null,
              previousColor: null
          };

          this.initialize();
          this.bindEvents();
      }

      initialize() {
          const doc = this.element.ownerDocument;
          const $element = $(this.element);
          const isInput = $element.is('input');
          const isColorInput = isInput && $element.attr('type') === 'color' && this.supportsColorInput();
          const isReplacer = isInput && !this.options.flat;

          this.$container = $(pickerTemplate, doc)
              .addClass(this.options.theme)
              .addClass(this.options.containerClassName);

          this.$picker = this.$container.find('.sp-picker-container');
          this.$color = this.$container.find('.sp-color');
          this.$dragger = this.$container.find('.sp-dragger');
          this.$hue = this.$container.find('.sp-hue');
          this.$slider = this.$container.find('.sp-slider');
          this.$alpha = this.$container.find('.sp-alpha');
          this.$alphaInner = this.$container.find('.sp-alpha-inner');
          this.$alphaHandle = this.$container.find('.sp-alpha-handle');
          this.$input = this.$container.find('.sp-input');
          this.$palette = this.$container.find('.sp-palette');
          this.$initial = this.$container.find('.sp-initial');
          this.$cancel = this.$container.find('.sp-cancel');
          this.$clear = this.$container.find('.sp-clear');
          this.$choose = this.$container.find('.sp-choose');
          this.$paletteToggle = this.$container.find('.sp-palette-toggle');

          if (isReplacer) {
              this.$replacer = $(replacerTemplate, doc)
                  .addClass(this.options.theme)
                  .addClass(this.options.className)
                  .addClass(this.options.replacerClassName);
              this.$preview = this.$replacer.find('.sp-preview-inner');
          }

          this.setColor(this.options.color || (isInput && $element.val()));

          if (isReplacer) {
              $element.after(this.$replacer);
          }

          $(this.options.appendTo).append(this.$container);

          this.state.isInitialized = true;
          this.updateUI();
      }

      bindEvents() {

          this.$dragger.on('mousedown touchstart', this.startDragging.bind(this));
          this.$slider.on('mousedown touchstart', this.startHueDragging.bind(this));
          this.$alphaHandle.on('mousedown touchstart', this.startAlphaDragging.bind(this));
          this.$input.on('change', this.handleInputChange.bind(this));
          this.$palette.on('click', '.sp-thumb-el', this.handlePaletteClick.bind(this));
          this.$clear.on('click', this.clear.bind(this));
          this.$choose.on('click', this.choose.bind(this));
          this.$cancel.on('click', this.cancel.bind(this));
          this.$paletteToggle.on('click', this.togglePalette.bind(this));

          $(document).on('mousemove touchmove', this.handleDrag.bind(this));
          $(document).on('mouseup touchend', this.stopDragging.bind(this));
          $(document).on('click', this.handleDocumentClick.bind(this));

          $(window).on('resize', debounce(this.updatePosition.bind(this), 100));
      }

      setColor(color) {
          if (!color && !this.options.allowEmpty) return;

          this.state.previousColor = this.state.currentColor;
          this.state.currentColor = color ? tinycolor(color) : null;

          this.updateUI();
          this.options.callbacks.change(this.state.currentColor);
      }

      getColor() {
          return this.state.currentColor;
      }

      show() {
          if (this.state.isVisible) return;

          this.options.callbacks.beforeShow(this);
          this.$container.removeClass('sp-hidden');
          this.updatePosition();
          this.state.isVisible = true;
          this.options.callbacks.show(this);
      }

      hide() {
          if (!this.state.isVisible) return;

          this.$container.addClass('sp-hidden');
          this.state.isVisible = false;
          this.options.callbacks.hide(this);
      }

      toggle() {
          this.state.isVisible ? this.hide() : this.show();
      }

      updateUI() {
          if (!this.state.isInitialized) return;

          const color = this.state.currentColor;
          if (!color) {
              this.$preview?.css('background-color', 'transparent');
              this.$input.val('');
              return;
          }

          this.$preview?.css('background-color', color.toRgbString());

          this.$input.val(color.toString(this.options.preferredFormat || 'rgb'));

          this.updatePickerUI();
      }

      updatePickerUI() {
          const color = this.state.currentColor;
          if (!color) return;

          const hsl = color.toHsl();
          const rgb = color.toRgb();

          this.$color.css('background-color', `hsl(${hsl.h}, 100%, 50%)`);
          this.$dragger.css({
              left: `${hsl.s * 100}%`,
              top: `${100 - hsl.l * 100}%`
          });

          this.$slider.css('left', `${(hsl.h / 360) * 100}%`);

          if (this.options.showAlpha) {
              this.$alphaInner.css('background-color', color.toRgbString());
              this.$alphaHandle.css('left', `${color.getAlpha() * 100}%`);
          }
      }

      updatePosition() {
          if (!this.state.isVisible) return;

          const $target = this.$replacer || $(this.element);
          const offset = $target.offset();
          const containerOffset = this.$container.offset();
          const containerWidth = this.$container.outerWidth();
          const containerHeight = this.$container.outerHeight();
          const targetWidth = $target.outerWidth();
          const targetHeight = $target.outerHeight();

          let left = offset.left;
          let top = offset.top + targetHeight;

          if (left + containerWidth > $(window).width()) {
              left = $(window).width() - containerWidth;
          }
          if (top + containerHeight > $(window).height()) {
              top = offset.top - containerHeight;
          }

          this.$container.css({
              left: `${left}px`,
              top: `${top}px`
          });
      }

      startDragging(e) {
          e.preventDefault();
          this.state.isDragging = true;
          this.handleDrag(e);
      }

      startHueDragging(e) {
          e.preventDefault();
          this.state.isDragging = true;
          this.handleHueDrag(e);
      }

      startAlphaDragging(e) {
          e.preventDefault();
          this.state.isDragging = true;
          this.handleAlphaDrag(e);
      }

      handleDrag(e) {
          if (!this.state.isDragging) return;

          const $color = this.$color;
          const offset = $color.offset();
          const x = (e.pageX || e.touches[0].pageX) - offset.left;
          const y = (e.pageY || e.touches[0].pageY) - offset.top;
          const width = $color.width();
          const height = $color.height();

          const s = Math.max(0, Math.min(1, x / width));
          const v = Math.max(0, Math.min(1, 1 - y / height));

          const color = this.state.currentColor;
          if (!color) return;

          const hsl = color.toHsl();
          this.setColor(tinycolor({ h: hsl.h, s, v }));
      }

      handleHueDrag(e) {
          if (!this.state.isDragging) return;

          const $hue = this.$hue;
          const offset = $hue.offset();
          const x = (e.pageX || e.touches[0].pageX) - offset.left;
          const width = $hue.width();

          const h = Math.max(0, Math.min(360, (x / width) * 360));

          const color = this.state.currentColor;
          if (!color) return;

          const hsl = color.toHsl();
          this.setColor(tinycolor({ h, s: hsl.s, l: hsl.l }));
      }

      handleAlphaDrag(e) {
          if (!this.state.isDragging || !this.options.showAlpha) return;

          const $alpha = this.$alpha;
          const offset = $alpha.offset();
          const x = (e.pageX || e.touches[0].pageX) - offset.left;
          const width = $alpha.width();

          const alpha = Math.max(0, Math.min(1, x / width));

          const color = this.state.currentColor;
          if (!color) return;

          this.setColor(color.setAlpha(alpha));
      }

      handleInputChange(e) {
          const value = e.target.value;
          if (!value && this.options.allowEmpty) {
              this.setColor(null);
        return;
      }

          const color = tinycolor(value);
          if (color.isValid()) {
              this.setColor(color);
          }
      }

      handlePaletteClick(e) {
          const $thumb = $(e.target).closest('.sp-thumb-el');
          if (!$thumb.length) return;

          const color = $thumb.data('color');
          this.setColor(color);

          if (this.options.hideAfterPaletteSelect) {
              this.hide();
          }
      }

      handleDocumentClick(e) {
          if (!this.state.isVisible) return;

          const $target = $(e.target);
          if (!$target.closest(this.$container).length && 
              !$target.closest(this.$replacer).length) {
              if (this.options.clickoutFiresChange) {
                  this.choose();
      } else {
                  this.cancel();
              }
          }
      }

      stopDragging() {
          this.state.isDragging = false;
      }

      clear() {
          if (this.options.allowEmpty) {
              this.setColor(null);
          }
      }

      choose() {
          this.options.callbacks.change(this.state.currentColor);
          this.hide();
      }

      cancel() {
          this.setColor(this.state.previousColor);
          this.hide();
      }

      togglePalette() {
          this.$palette.toggleClass('sp-hidden');
          const $button = this.$paletteToggle;
          const isHidden = this.$palette.hasClass('sp-hidden');
          $button.text(isHidden ? this.options.togglePaletteMoreText : this.options.togglePaletteLessText);
      }

      supportsColorInput() {
          const input = document.createElement('input');
          input.type = 'color';
          return input.type === 'color';
      }

      destroy() {
          this.$container.remove();
          this.$replacer?.remove();
          instances.delete(this.element);
      }
  }

  $.fn.spectrum = function(options) {
      return this.each(function() {
          const instance = new ColorPicker(this, options);
          instances.set(this, instance);
    });
  };

  $.fn.spectrum.defaults = DEFAULT_OPTIONS;
  $.fn.spectrum.inputTypeColorSupport = function() {
      const input = document.createElement('input');
      input.type = 'color';
      return input.type === 'color';
  };

  if (window.performance && window.performance.mark) {
      window.addEventListener('load', () => {
          performance.mark('color-picker-initialized');
          performance.measure('color-picker-setup', 'color-picker-initialized');
      });
  }
});