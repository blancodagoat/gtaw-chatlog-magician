# Image + Chatlog Overlay Function - Comprehensive Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Image Rendering System](#image-rendering-system)
5. [Chat Overlay Rendering (Preview)](#chat-overlay-rendering-preview)
6. [Canvas Export System](#canvas-export-system)
7. [Transform System](#transform-system)
8. [Positioning and Styling](#positioning-and-styling)
9. [Text Processing and Parsing](#text-processing-and-parsing)
10. [Censoring System](#censoring-system)
11. [Code Flow Diagrams](#code-flow-diagrams)

---

## Overview

The Image + Chatlog Overlay function is the core feature of Screenshot Magician, enabling users to overlay formatted chat text onto screenshots with precise positioning, scaling, and styling control. The system provides both a live preview overlay and pixel-perfect canvas export functionality.

### Key Features

- **Independent positioning**: Image and chat overlay can be moved and scaled independently
- **Real-time preview**: Live overlay preview matching the final export
- **Precise export**: Canvas-based rendering ensures 1:1 pixel accuracy
- **Text wrapping**: Width-based text wrapping matching CSS behavior
- **Color parsing**: Automatic color detection based on chat patterns
- **Censoring support**: Multiple censoring types (invisible, black bar, blur)

---

## Architecture

The overlay system consists of two main rendering pipelines:

1. **Preview Pipeline (DOM-based)**: Real-time overlay using HTML/CSS for interactive editing
2. **Export Pipeline (Canvas-based)**: High-fidelity rendering for final output

Both pipelines use the same transform and positioning system to ensure consistency.

### Component Structure

```672:691:frontend/src/components/Magician.vue
// Update chat overlay styles
const chatStyles = computed(() => {
  return {
    position: 'absolute' as const,
    top: '0',
    left: '0',
    width: '100%',
    height: 'auto',
    // Force the width to be constrained to enforce wrapping at same break points
    maxWidth: `${dropZoneWidth.value}px`, // Match the exact dropzone width
    fontFamily: '"Arial Black", Arial, sans-serif',
    fontSize: '12px',
    lineHeight: '16px',
    transform: `translate(${chatTransform.x}px, ${chatTransform.y}px) scale(${chatTransform.scale})`,
    transformOrigin: 'top left',
    pointerEvents: (isChatDraggingEnabled.value ? 'auto' : 'none') as 'auto' | 'none',
    wordWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
  };
});
```

---

## Core Components

### State Management

The overlay system maintains several reactive state objects:

#### Image Transform State

```36:41:frontend/src/components/Magician.vue
// --- Image Manipulation State ---
const isImageDraggingEnabled = ref(false);
const imageTransform = reactive({ x: 0, y: 0, scale: 1 });
const isPanning = ref(false);
const panStart = reactive({ x: 0, y: 0 });
const panStartImagePos = reactive({ x: 0, y: 0 });
```

#### Chat Transform State

```43:48:frontend/src/components/Magician.vue
// --- Chat Manipulation State ---
const isChatDraggingEnabled = ref(false);
const chatTransform = reactive({ x: 0, y: 0, scale: 1 });
const isChatPanning = ref(false);
const chatPanStart = reactive({ x: 0, y: 0 });
const chatPanStartPos = reactive({ x: 0, y: 0 });
```

#### Parsed Chat Lines

```28:34:frontend/src/components/Magician.vue
// --- Parsed Chat State ---
interface ParsedLine {
  id: number;
  text: string;
  color?: string;
}
const parsedChatLines = ref<ParsedLine[]>([]);
```

---

## Image Rendering System

### Image Style Computation

The image is rendered with absolute positioning and CSS transforms:

```255:265:frontend/src/components/Magician.vue
const imageStyle = computed(() => ({
  maxWidth: 'none', // Allow image to be larger than container for zoom
  maxHeight: 'none',
  position: 'absolute', // Position relative to the drop zone sheet
  top: '0', // Start at top-left before transform
  left: '0',
  transformOrigin: 'center center', // Zoom from the center
  transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
  cursor: isImageDraggingEnabled.value ? (isPanning.value ? 'grabbing' : 'grab') : 'default',
  transition: isPanning.value ? 'none' : 'transform 0.1s ease-out' // Smooth transition only when not panning
}));
```

### Image Rendering in Canvas (Export)

During export, the image is drawn using the HTML5 Canvas API with precise transform matching:

```715:753:frontend/src/components/Magician.vue
    // Draw the image with correct positioning and transform origin
    ctx.save();
    const img = new Image();
    img.src = droppedImageSrc.value;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // --- Match CSS object-fit: contain ---
    const viewportRatio = canvas.width / canvas.height;
    const imageRatio = img.naturalWidth / img.naturalHeight;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imageRatio > viewportRatio) {
      // Image is wider than canvas aspect ratio (letterboxed top/bottom)
      drawWidth = canvas.width;
      drawHeight = canvas.width / imageRatio;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      // Image is taller than canvas aspect ratio (pillarboxed left/right)
      drawHeight = canvas.height;
      drawWidth = canvas.height * imageRatio;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    }

    // --- Apply CSS-like transform (translate + scale) with center origin ---
    // 1. Translate context to the center of the drawing area (where the image is placed by object-fit: contain)
    ctx.translate(offsetX + drawWidth / 2, offsetY + drawHeight / 2);
    // 2. Apply scaling relative to the center
    ctx.scale(imageTransform.scale, imageTransform.scale);
    // 3. Apply translation relative to the now scaled and centered origin
    ctx.translate(imageTransform.x, imageTransform.y);
    // 4. Draw the image centered at the origin (0,0) of the transformed context
    // The image itself is drawn from its top-left corner (-drawWidth / 2, -drawHeight / 2)
    // relative to the transformed origin, filling the calculated drawWidth/drawHeight.
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore(); // Restore context after drawing image
```

**Key Points:**

- Uses `object-fit: contain` behavior to maintain aspect ratio
- Calculates proper offsets for letterboxing/pillarboxing
- Applies transforms in the correct order: translate to center → scale → translate offset
- Draws image centered at origin to match CSS `transform-origin: center center`

---

## Chat Overlay Rendering (Preview)

### HTML Structure

The chat overlay is rendered as an absolutely positioned div containing chat lines:

```1693:1719:frontend/src/components/Magician.vue
            <!-- Chat Overlay with fixed-width wrapping -->
            <div v-if="parsedChatLines.length > 0 && droppedImageSrc"
                class="chat-overlay"
                :key="renderKey"
                @mousedown="handleChatMouseDown"
                @mousemove="handleChatMouseMove"
                @mouseup="handleChatMouseUpOrLeave"
                @mouseleave="handleChatMouseUpOrLeave"
                @wheel="handleChatWheel"
                :style="chatStyles"
            >
              <div class="chat-lines-container">
                <div
                  v-for="(line, index) in parsedChatLines"
                  :key="line.id"
                  class="chat-line"
                  :style="{ color: line.color }"
                >
                  <!-- Conditionally wrap the text span for black bars -->
                  <span v-if="showBlackBars" class="with-black-bar">
                    <span class="chat-text" v-html="applyCensoring(line.text, index)" @mouseup="handleTextSelection"></span>
                  </span>
                  <!-- Render text directly if black bars are off -->
                  <span v-else class="chat-text" v-html="applyCensoring(line.text, index)" @mouseup="handleTextSelection"></span>
                </div>
              </div>
            </div>
```

### CSS Styling

The chat overlay uses CSS to match the game's text styling:

```1788:1823:frontend/src/components/Magician.vue
.chat-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: auto;
  pointer-events: auto;
  overflow: visible;
  transform-origin: top left;
  will-change: transform;
}

.chat-line {
  position: relative;
  display: block;
  font-family: Arial, sans-serif;
  font-size: 12px;
  line-height: 1.3;
  padding: 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  width: v-bind('chatLineWidth + "px"');
  margin: 0;
  text-shadow:
    -1px -1px 0 #000,
    -1px 0 0 #000,
    -1px 1px 0 #000,
    0 -1px 0 #000,
    0 1px 0 #000,
    1px -1px 0 #000,
    1px 0 0 #000,
    1px 1px 0 #000;
  -webkit-font-smoothing: none !important;
  font-weight: 700;
  letter-spacing: 0;
}
```

**Styling Details:**

- **Text Shadow**: 8-directional black outline (simulating game's text rendering)
- **Font**: Arial Black, 12px, 700 weight
- **Line Height**: 1.3 (approximately 16px for 12px font)
- **Width**: Dynamic based on `chatLineWidth` reactive value
- **White Space**: `pre-wrap` to preserve formatting while allowing wrapping

### Black Bar Background

When enabled, black bars are rendered behind text:

```1834:1840:frontend/src/components/Magician.vue
.with-black-bar {
  background-color: #000000;
  padding: 0 4px;
  display: inline; /* Changed from block to inline */
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
```

The `box-decoration-break: clone` ensures black bars appear correctly when text wraps across multiple lines.

---

## Canvas Export System

The export system recreates the preview exactly using Canvas API. This ensures pixel-perfect matching between preview and export.

### Canvas Setup

```693:714:frontend/src/components/Magician.vue
// Update the saveImage function to ensure 1:1 positioning match with preview
const saveImage = async () => {
  if (!droppedImageSrc.value) {
    console.warn('No image to save');
    return;
  }

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas size to match the drop zone exactly
    canvas.width = dropZoneWidth.value || 800;
    canvas.height = dropZoneHeight.value || 600;

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
```

### Chat Overlay Rendering in Canvas

The chat overlay is rendered after the image, using the same transforms:

```757:771:frontend/src/components/Magician.vue
    // If there are chat lines, render them
    if (parsedChatLines.value.length > 0) {
      ctx.save();

      // FIXED: Apply chat transform directly without offset
      // The previous implementation added drop zone position offsets which caused misalignment
      ctx.translate(chatTransform.x, chatTransform.y);
      ctx.scale(chatTransform.scale, chatTransform.scale);

      // Set up text rendering to match exactly with the preview
      ctx.font = '700 12px Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.textRendering = 'geometricPrecision';
      ctx.letterSpacing = '0px';

      let currentY = 0;
      const TEXT_OFFSET_Y = 1; // Consistent with preview
      const MAX_LINE_CHARS = 80; // Same as preview
```

### Text Rendering with Outline

The canvas text rendering mimics CSS text-shadow using multiple draw calls:

```857:872:frontend/src/components/Magician.vue
        // Normal text rendering - mimic CSS text-shadow using multiple fillText calls
        const shadowOffsets = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1], [1, 0], [1, 1]
        ];
        ctx.fillStyle = '#000000'; // Shadow color
        shadowOffsets.forEach(([dx, dy]) => {
          // Apply the same TEXT_OFFSET_Y to shadows as well for consistency
          ctx.fillText(text, x + dx, y + TEXT_OFFSET_Y + dy);
        });

        // Draw the main text on top
        ctx.fillStyle = color;
        ctx.fillText(text, x, y + TEXT_OFFSET_Y);
```

**Implementation Details:**

- Draws 8 shadow positions around the text (excluding center)
- Uses black (`#000000`) for all shadows
- Draws main text on top with the appropriate color
- Uses `TEXT_OFFSET_Y = 1` for vertical alignment consistency

### Text Wrapping Logic

Width-based wrapping matches CSS behavior exactly:

```971:1033:frontend/src/components/Magician.vue
      // Process each line using width-based wrapping to match CSS behavior
      let lineIndex = 0;
      // FIXED: Use the explicit width from the CSS rule (.chat-line { width: 640px; })
      // minus horizontal padding (4px each side) for accurate wrapping.
      const maxTextWidth = chatLineWidth.value - 8;

      for (const line of parsedChatLines.value) {
        // Get the raw text content, ensuring HTML entities are decoded for measurement
        const parser = new DOMParser();
        const doc = parser.parseFromString(line.text, 'text/html');
        const textContent = doc.body ? doc.body.textContent || '' : line.text; // Use fallback

        // Get the color for this line (using original logic)
        const textColor = getTextColor(textContent);

        // --- Width-based wrapping logic ---
        const words = textContent.split(' ');
        let currentLineText = '';
        let lineStartPosition = 0; // Track character offset within the original line for censoring

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          // Build the potential next line text (current + space + new word)
          const testLine = currentLineText ? currentLineText + ' ' + word : word;
          const metrics = ctx.measureText(testLine);

          // Check if adding the next word exceeds the max width
          if (metrics.width > maxTextWidth && currentLineText) {
            // The current line is full (without the new word). Draw it.
            const currentLineWidth = ctx.measureText(currentLineText).width;
            drawBlackBar(currentY, currentLineWidth); // Draw bar based on measured width

            // Draw the text segment, handling special lines and censoring
            if (!drawSpecialLine(currentLineText, 4, currentY, lineIndex)) {
              await drawTextSegment(currentLineText, 4, currentY, textColor, lineStartPosition, lineIndex);
            }

            // Move to the next line position on the canvas
            currentY += 16; // Increment Y position based on line height

            // Update the starting character position for the next segment
            // Length of the drawn line + 1 for the space character that caused the wrap
            lineStartPosition += currentLineText.length + 1;

            // Start the new line with the word that didn't fit
            currentLineText = word;

          } else {
            // The word fits, add it to the current line
            currentLineText = testLine;
          }
        }

        // After the loop, draw any remaining text in currentLineText
        if (currentLineText) {
          const currentLineWidth = ctx.measureText(currentLineText).width;
          drawBlackBar(currentY, currentLineWidth);
          if (!drawSpecialLine(currentLineText, 4, currentY, lineIndex)) {
            await drawTextSegment(currentLineText, 4, currentY, textColor, lineStartPosition, lineIndex);
          }
          currentY += 16; // Increment Y for the last line
        }
        // --- End width-based wrapping logic ---

        lineIndex++; // Move to the next original line index (for censoring mapping)
      }
```

**Wrapping Algorithm:**

1. Split text into words
2. For each word, test if adding it to current line exceeds `maxTextWidth`
3. If it exceeds, draw the current line and start a new line with the word
4. Use `ctx.measureText()` for accurate width calculation
5. Track character positions for censoring support across wrapped lines

---

## Transform System

### Transform Application Order

Both preview and export use the same transform order:

1. **Translate** to origin point (center for image, top-left for chat)
2. **Scale** from origin
3. **Translate** with user offset (x, y)

This order ensures:

- Scaling happens from the correct origin point
- User translation is applied after scaling (so pixels match)

### Chat Transform Application

```763:764:frontend/src/components/Magician.vue
      ctx.translate(chatTransform.x, chatTransform.y);
      ctx.scale(chatTransform.scale, chatTransform.scale);
```

**Note**: For chat overlay, translate is applied first, then scale. This differs from the image transform because chat uses `transform-origin: top left` instead of `center center`.

### Image Transform Application

```745:749:frontend/src/components/Magician.vue
    // 1. Translate context to the center of the drawing area (where the image is placed by object-fit: contain)
    ctx.translate(offsetX + drawWidth / 2, offsetY + drawHeight / 2);
    // 2. Apply scaling relative to the center
    ctx.scale(imageTransform.scale, imageTransform.scale);
    // 3. Apply translation relative to the now scaled and centered origin
    ctx.translate(imageTransform.x, imageTransform.y);
```

**Note**: Image transform uses center origin, requiring translation to center before scaling.

---

## Positioning and Styling

### Drop Zone Styling

The drop zone acts as the coordinate system for both image and chat:

```218:238:frontend/src/components/Magician.vue
// Computed style for the drop zone
const dropZoneStyle = computed(() => {
  // Calculate scale if needed
  const scale = isScaledDown.value ? dropzoneScale.value : 1;

  return {
    width: dropZoneWidth.value ? `${dropZoneWidth.value}px` : '800px',
    height: dropZoneHeight.value ? `${dropZoneHeight.value}px` : '600px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: `translate(-50%, -50%) scale(${scale})`,
    transformOrigin: 'center center',
    overflow: 'hidden',
    cursor: isImageDraggingEnabled.value ? (isPanning.value ? 'grabbing' : 'grab') : 'default',
    transition: 'transform 0.2s ease',
    border: isScaledDown.value ? '2px solid #42a5f5' : '2px dashed transparent' // Blue border when scaled
  };
});
```

### Coordinate System

- **Origin**: Top-left corner of the drop zone (0, 0)
- **Image Origin**: Center of image (uses `transform-origin: center center`)
- **Chat Origin**: Top-left of chat overlay (uses `transform-origin: top left`)
- **Canvas Coordinates**: Match drop zone dimensions exactly

---

## Text Processing and Parsing

### Chat Parsing Function

The `parseChatlog` function processes raw text and applies color mapping:

```272:340:frontend/src/components/Magician.vue
const parseChatlog = () => {
  const lines = chatlogText.value.split('\n').filter(line => line.trim() !== '');
  parsedChatLines.value = lines.map((line, index) => {
    let processedText = line;

    // Strip timestamps if the option is enabled
    if (stripTimestamps.value) {
      processedText = processedText.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
    }

    let color: string | undefined = undefined;

    // First check for cellphone messages
    const cellphonePattern = colorMappings.find(mapping =>
      mapping.checkPlayerName && mapping.pattern.test(processedText)
    );

    if (cellphonePattern && characterName.value) {
      // If it's the player's message, use white color
      if (processedText.startsWith(characterName.value)) {
        color = 'rgb(255, 255, 255)';
      } else {
        // Otherwise use yellow for incoming calls
        color = cellphonePattern.color;
      }
    } else {
      // Check for patterns that should color the entire line
      const fullLinePattern = colorMappings.find(mapping =>
        mapping.fullLine && !mapping.checkPlayerName && mapping.pattern.test(processedText)
      );

      if (fullLinePattern) {
        color = fullLinePattern.color;
      } else {
        // Check for split patterns
        const splitPattern = colorMappings.find(mapping =>
          mapping.splitPattern && mapping.pattern.test(processedText)
        );

        if (splitPattern && splitPattern.splitPattern && splitPattern.markerColor) {
          const parts = processedText.split(splitPattern.splitPattern);
          if (parts.length > 1) {
            processedText = parts.map((part, i) => {
              if (splitPattern.splitPattern?.test(part)) {
                return `<span style="color: ${splitPattern.markerColor}">${part}</span>`;
              }
              return `<span style="color: ${splitPattern.color}">${part}</span>`;
            }).join('');
            color = 'white'; // Base color doesn't matter as we're using inline styles
          }
        } else {
          // Check other patterns
          for (const mapping of colorMappings) {
            if (mapping.pattern.test(processedText)) {
              color = mapping.color;
              break;
            }
          }
        }
      }
    }

    return {
      id: index,
      text: processedText,
      color: color || 'white'
    };
  });
};
```

### Color Mapping System

The system uses regex patterns to detect chat message types:

```150:216:frontend/src/components/Magician.vue
// Update color mappings to handle all GTA World patterns
const colorMappings: ColorMapping[] = [
  // Radio messages - top priority
  {
    pattern: /^\*\* \[S: .+? \| CH: .+?\]/i,
    color: 'rgb(214, 207, 140)',
    fullLine: true
  },

  // Add cellphone pattern with higher priority
  {
    pattern: /\(cellphone\)/i,
    color: 'rgb(251, 247, 36)',
    fullLine: true,
    checkPlayerName: true  // New flag to check if it's the player's message
  },

  // Basic chat patterns
  { pattern: /says:|shouts:/i, color: 'rgb(241, 241, 241)' },
  { pattern: /\(Car\)/i, color: 'rgb(251, 247, 36)' },
  { pattern: /^\*/, color: 'rgb(194, 163, 218)' },
  { pattern: /\bwhispers\b/i, color: 'rgb(237, 168, 65)' },
  { pattern: /\bYou paid\b|\bpaid you\b|\byou gave\b|\bgave you\b|\bYou received\b/i, color: 'rgb(86, 214, 75)' },
  { pattern: /g\)/i, color: 'rgb(255, 255, 0)' },
  { pattern: /\[low\]:|\[lower\]:/i, color: 'rgb(150, 149, 149)' },

  // New patterns from the provided code
  {
    pattern: /\[!]/,
    color: 'rgb(255, 255, 255)',
    splitPattern: /(\[!])/,
    markerColor: 'rgb(255, 0, 195)'
  },
  { pattern: /\[INFO]:/, color: 'rgb(255, 255, 255)', splitPattern: /(\[INFO]:)/, markerColor: 'rgb(27, 124, 222)' },
  { pattern: /\[ALERT]/, color: 'rgb(255, 255, 255)', splitPattern: /(\[ALERT])/, markerColor: 'rgb(27, 124, 222)' },
  { pattern: /\[GYM]/, color: 'rgb(255, 255, 255)', splitPattern: /(\[GYM])/, markerColor: 'rgb(22, 106, 189)' },
  { pattern: /\[advertisement]/i, color: 'rgb(127, 239, 43)' },
  { pattern: /\(\( \(PM/i, color: 'rgb(239, 227, 0)' },
  { pattern: /\(\( \(/i, color: 'rgb(139, 138, 138)' },
  { pattern: /\[megaphone]/i, color: 'rgb(241, 213, 3)' },
  { pattern: /\[microphone]/i, color: 'rgb(246, 218, 3)' },
  { pattern: /\[intercom]/i, color: 'rgb(26, 131, 232)' },

  // Character kill pattern
  { pattern: /\[Character kill]/, color: 'rgb(240, 0, 0)', splitPattern: /(\[Character kill])/, markerColor: 'rgb(56, 150, 243)' },

  // Money patterns
  {
    pattern: /\[\$.*g\)/,
    color: 'rgb(255, 255, 0)',
    splitPattern: /(\[\$[^\]]*\])/,
    markerColor: 'rgb(86, 214, 75)'
  },
  {
    pattern: /\(\$.*g\)/,
    color: 'rgb(255, 255, 0)',
    splitPattern: /(\(\$[^\)]*\))/,
    markerColor: 'rgb(86, 214, 75)'
  },

  // Phone number pattern
  {
    pattern: / PH: .*g\)/,
    color: 'rgb(255, 255, 0)',
    splitPattern: /( PH: .*)/,
    markerColor: 'rgb(86, 214, 75)'
  }
];
```

**Pattern Types:**

- **Full Line**: Patterns that color the entire message
- **Split Pattern**: Patterns with special markers (e.g., `[!]`) that need different colors
- **Player Name Check**: Patterns that change color based on sender (e.g., cellphone messages)

---

## Censoring System

The censoring system allows users to selectively hide text with three methods:

### Censor Types

```1108:1114:frontend/src/components/Magician.vue
// Censor types enum
enum CensorType {
  None = 'none',
  Invisible = 'invisible',
  BlackBar = 'blackbar',
  Blur = 'blur'
}
```

### Censor Region Storage

```1116:1131:frontend/src/components/Magician.vue
// Interface for censored regions
interface CensoredRegion {
  lineIndex: number;
  startOffset: number;
  endOffset: number;
  type: CensorType;
}

// State for censored regions
const censoredRegions = ref<CensoredRegion[]>([]);
const selectedText = reactive({
  lineIndex: -1,
  startOffset: 0,
  endOffset: 0,
  text: ''
});
```

### Canvas Blur Implementation

The blur effect uses a temporary canvas with filter effects:

```828:855:frontend/src/components/Magician.vue
        if (censorType) {
          // Define tempCanvas and context locally for blur effect
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) return; // Guard against null context

          // Set temp canvas size slightly larger to accommodate blur filter
          tempCanvas.width = width + 20; // Add padding for blur
          tempCanvas.height = 16 + 20;

          // Draw the text onto the temporary canvas (offset to center it)
          tempCtx.font = ctx.font;
          tempCtx.fillStyle = color;
          tempCtx.fillText(text, 10, 10 + TEXT_OFFSET_Y); // Draw text with offset

          // Apply blur filter to the temporary canvas
          tempCtx.globalCompositeOperation = 'source-in'; // Keep original text shape
          tempCtx.filter = 'blur(4px)';
          tempCtx.fillStyle = 'black'; // Or use original color if preferred
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.filter = 'none'; // Reset filter
          tempCtx.globalCompositeOperation = 'source-over'; // Reset composite operation

          // Draw the blurred result back to main canvas
          // Adjust draw position to account for the padding added to tempCanvas
          ctx.drawImage(tempCanvas, x - 10, y - 10);
          return; // Make sure to return after drawing blur
        }
```

### Censoring Application in Preview

```1180:1227:frontend/src/components/Magician.vue
// Update applyCensoring to handle partial text censoring
const applyCensoring = (text: string, lineIndex: number) => {
  const regions = censoredRegions.value
    .filter(region => region.lineIndex === lineIndex)
    .sort((a, b) => a.startOffset - b.startOffset);

  console.log(`Applying censoring to line ${lineIndex}, found ${regions.length} regions`);

  if (regions.length === 0) return text;

  let result = '';
  let lastIndex = 0;

  for (const region of regions) {
    // Add uncensored text before this region
    result += text.slice(lastIndex, region.startOffset);

    // Add censored text
    const censoredText = text.slice(region.startOffset, region.endOffset);
    console.log('Censoring text:', censoredText, 'with type:', region.type);

    // Ensure the text is properly escaped for HTML
    const escapedText = censoredText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    switch (region.type) {
      case CensorType.Invisible:
        result += `<span class="censored-invisible">${escapedText}</span>`;
        break;
      case CensorType.BlackBar:
        result += `<span class="censored-blackbar">${escapedText}</span>`;
        break;
      case CensorType.Blur:
        result += `<span class="censored-blur">${escapedText}</span>`;
        break;
    }

    lastIndex = region.endOffset;
  }

  // Add remaining uncensored text
  result += text.slice(lastIndex);
  return result;
};
```

### Censoring in Canvas Export

Censoring is handled during text segment drawing:

```928:969:frontend/src/components/Magician.vue
      const drawTextSegment = async (text: string, xPos: number, yPos: number, color: string, lineStartPos: number, lineIndex: number) => {
        // Split text into censored and uncensored segments
        let currentX = xPos;
        let remainingText = text;
        let currentOffset = lineStartPos;

        while (remainingText.length > 0) {
          // Find the next censored region that intersects with our current position
          const censorRegion = censoredRegions.value.find(r =>
            r.lineIndex === lineIndex &&
            r.startOffset <= currentOffset + remainingText.length &&
            r.endOffset > currentOffset
          );

          if (!censorRegion) {
            // No more censoring in this segment, draw the rest normally
            await drawTextWithOutline(remainingText, currentX, yPos, color);
            break;
          }

          // Draw uncensored portion before the censored region
          const uncensoredLength = Math.max(0, censorRegion.startOffset - currentOffset);
          if (uncensoredLength > 0) {
            const uncensoredText = remainingText.substring(0, uncensoredLength);
            await drawTextWithOutline(uncensoredText, currentX, yPos, color);
            currentX += ctx.measureText(uncensoredText).width;
            remainingText = remainingText.substring(uncensoredLength);
            currentOffset += uncensoredLength;
          }

          // Draw censored portion
          const censorLength = Math.min(
            remainingText.length,
            censorRegion.endOffset - currentOffset
          );
          const censoredText = remainingText.substring(0, censorLength);
          drawTextWithOutline(censoredText, currentX, yPos, color, censorRegion.type);
          currentX += ctx.measureText(censoredText).width;
          remainingText = remainingText.substring(censorLength);
          currentOffset += censorLength;
        }
      };
```

---

## Code Flow Diagrams

### Preview Rendering Flow

```
User Input (Chat Text)
    ↓
parseChatlog()
    ↓
Split into lines → Apply regex patterns → Assign colors
    ↓
parsedChatLines.value (reactive array)
    ↓
Vue Template Rendering
    ↓
<div class="chat-overlay" :style="chatStyles">
    ↓
Transform: translate(x, y) scale(scale)
    ↓
Rendered HTML with CSS styling
```

### Export Rendering Flow

```
saveImage() called
    ↓
Create Canvas (size = dropZoneWidth × dropZoneHeight)
    ↓
Draw Black Background
    ↓
Load Image → Calculate object-fit: contain dimensions
    ↓
Apply Image Transform (center origin)
    ↓
Draw Image on Canvas
    ↓
Apply Chat Transform (top-left origin)
    ↓
For each parsedChatLine:
    ↓
    Get text content → Apply color mapping
    ↓
    Width-based word wrapping
    ↓
    For each wrapped line:
        ↓
        Draw black bar (if enabled)
        ↓
        Check for censoring regions
        ↓
        Draw text segments (normal or censored)
        ↓
        Draw text outline (8-directional shadow)
        ↓
        Draw main text
    ↓
    Increment Y position (+16px)
    ↓
Convert Canvas to Blob
    ↓
Trigger Download
```

### Transform System Flow

**Image Transform:**

```
CSS: transform-origin: center center
    ↓
Canvas:
    translate(centerX, centerY)  // Move to image center
    ↓
    scale(scale, scale)         // Scale from center
    ↓
    translate(x, y)             // Apply user offset
```

**Chat Transform:**

```
CSS: transform-origin: top left
    ↓
Canvas:
    translate(x, y)             // Apply user offset first
    ↓
    scale(scale, scale)         // Scale from top-left
```

---

## Key Implementation Details

### 1:1 Preview-to-Export Matching

To ensure perfect matching between preview and export:

1. **Font Matching**: Both use `'700 12px Arial, sans-serif'` (Arial Black)
2. **Text Shadow**: Canvas mimics CSS with 8 shadow positions
3. **Line Height**: Fixed at 16px (12px font × 1.3 line-height)
4. **Text Offset**: `TEXT_OFFSET_Y = 1` applied consistently
5. **Wrapping Width**: Uses same `chatLineWidth` minus 8px padding
6. **Transform Order**: Identical transform application in both systems

### Coordinate System Alignment

- **Drop Zone**: Defines the coordinate space (default 800×600)
- **Canvas Size**: Matches drop zone dimensions exactly
- **Transform Origins**: Different for image (center) vs chat (top-left)
- **Pixel Alignment**: All measurements use `ctx.measureText()` for accuracy

### Performance Considerations

- **Canvas Rendering**: Done only on export (not during editing)
- **Reactive Updates**: Preview uses efficient Vue reactivity
- **Text Measurement**: Cached during wrapping calculations
- **Blur Effect**: Uses temporary canvas to isolate filter application

---

## Conclusion

The Image + Chatlog Overlay system is a sophisticated dual-rendering pipeline that provides real-time preview editing with pixel-perfect export capability. The system's strength lies in its careful matching of CSS preview rendering with Canvas API export rendering, ensuring users see exactly what they get in the final image.

Key achievements:

- ✅ Independent image and chat positioning/scaling
- ✅ Real-time preview with instant updates
- ✅ 1:1 pixel matching between preview and export
- ✅ Advanced text wrapping with width-based calculations
- ✅ Comprehensive color pattern recognition
- ✅ Multi-type censoring system with blur support

The implementation demonstrates careful attention to coordinate system alignment, transform ordering, and font rendering consistency across both rendering pipelines.
