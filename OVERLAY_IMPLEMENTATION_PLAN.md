# Image + Chatlog Overlay Implementation Plan

## Executive Summary

This plan outlines the implementation of an **Image + Chatlog Overlay feature** for GTAW Chatlog Magician, enabling users to overlay formatted chat text onto uploaded screenshots with precise positioning and scaling controls. The implementation leverages the existing vanilla JS + jQuery + Foundation architecture while adding a new dual-rendering pipeline (DOM preview + Canvas export).

---

## 1. Current State Analysis

### Existing Architecture

- **Stack**: Vanilla JS + jQuery 4.0.0-beta + Foundation 6.9.0
- **Export**: Uses `dom-to-image-more` for DOM-to-Canvas conversion
- **Parsing**: `chatlog-parser.js` handles text formatting and color detection
- **Styling**: CSS custom properties, Foundation grid, responsive design
- **Size**: 29 files, ~563 KB total
- **Build**: Zero build step, deploy-ready static assets

### Current Features

✅ Chat log text input and formatting  
✅ Color parsing (regex-based pattern matching)  
✅ Line wrapping and text styling  
✅ Export to PNG (DOM-based)  
✅ Character filtering  
✅ History panel  
✅ Changelog panel

### Missing Features (To Be Added)

❌ Image upload/display  
❌ Image + chat overlay preview  
❌ Independent positioning/scaling for image and chat  
❌ Canvas-based export with dual-layer rendering

---

## 2. Architecture Decisions

### Framework Approach: Stay Vanilla

**Decision**: Keep the vanilla JS + jQuery + Foundation stack  
**Rationale**:

- Current architecture is already optimized (563 KB, zero build friction)
- No need for React/Vue/Astro overhead (single-page tool use case)
- jQuery provides sufficient DOM manipulation capabilities
- Foundation grid handles layout cleanly
- Canvas API is native—no framework needed

### Rendering Strategy: Dual Pipeline

**Preview**: DOM-based (HTML/CSS) for real-time interactivity  
**Export**: Canvas-based for pixel-perfect output

**Why Dual Pipeline?**

- DOM preview enables interactive transforms (drag/zoom)
- Canvas export ensures 1:1 preview-to-export matching
- Matches existing pattern (DOM rendering + `dom-to-image-more`)

---

## 3. Component Architecture

### 3.1 State Management (Global Objects)

```javascript
// Image manipulation state
const ImageOverlayState = {
  isImageDraggingEnabled: false,
  imageTransform: { x: 0, y: 0, scale: 1 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  panStartImagePos: { x: 0, y: 0 },

  // Image data
  droppedImageSrc: null,
  droppedImageElement: null,

  // Drop zone dimensions
  dropZoneWidth: 800,
  dropZoneHeight: 600,
};

// Chat overlay state
const ChatOverlayState = {
  isChatDraggingEnabled: false,
  chatTransform: { x: 0, y: 0, scale: 1 },
  isChatPanning: false,
  chatPanStart: { x: 0, y: 0 },
  chatPanStartPos: { x: 0, y: 0 },

  // Chat dimensions
  chatLineWidth: 640, // Should match existing output width
};
```

### 3.2 New Files to Create

```
js/
  ├── image-overlay.js         # Main overlay state and interaction handlers
  ├── image-renderer.js        # Canvas rendering for export
  └── image-dropzone.js        # Drag-and-drop UI handlers

css/
  └── overlay.css              # New styles for overlay system
```

### 3.3 Modified Files

```
index.html                     # Add drop zone UI, new buttons
js/app.js                      # Integrate overlay export with existing download flow
```

---

## 4. Implementation Phases

### Phase 1: Foundation (UI/UX)

**Goal**: Add basic UI for image upload and display

**Tasks**:

1. Create `index.html` section for image drop zone
   - 800×600px drop zone container
   - File input + drag-and-drop support
   - Visual feedback (hover states, loading indicators)
2. Add CSS for overlay system (`css/overlay.css`)
   - `.image-dropzone` styles
   - `.image-overlay` positioning
   - `.chat-overlay` positioning with `transform-origin: top left`
   - Black bar backgrounds (if enabled)
3. Create `js/image-dropzone.js`
   - File input handler
   - Drag-and-drop handlers
   - Image preview rendering
   - Error handling

**Files**: `index.html`, `css/overlay.css`, `js/image-dropzone.js`

**Success Criteria**:

- User can upload an image and see it displayed
- Drop zone shows proper feedback
- Image maintains aspect ratio

---

### Phase 2: Image Manipulation

**Goal**: Enable independent image positioning and scaling

**Tasks**:

1. Create `js/image-overlay.js` with image state management
2. Add mouse/touch handlers for image dragging
3. Implement zoom controls (wheel + buttons)
4. Apply CSS transforms to image element
   ```javascript
   const imageStyle = {
     position: 'absolute',
     top: '0',
     left: '0',
     transform: `translate(${x}px, ${y}px) scale(${scale})`,
     transformOrigin: 'center center',
   };
   ```
5. Implement `object-fit: contain` equivalent logic
   - Calculate letterbox/pillarbox offsets
   - Maintain aspect ratio

**Files**: `js/image-overlay.js`

**Success Criteria**:

- Image can be dragged and zoomed independently
- Zoom centers on image center
- Transform state persists during session

---

### Phase 3: Chat Overlay Rendering (Preview)

**Goal**: Display formatted chat text over image with transforms

**Tasks**:

1. Integrate existing `processOutput()` from `chatlog-parser.js`
2. Create chat overlay DOM element with transformed positioning
3. Apply chat-specific CSS transforms
   ```javascript
   const chatStyle = {
     position: 'absolute',
     top: '0',
     left: '0',
     width: '100%',
     transform: `translate(${x}px, ${y}px) scale(${scale})`,
     transformOrigin: 'top left', // Different from image!
   };
   ```
4. Reuse existing color parsing from `chatlog-parser.js`
5. Implement text rendering with black bar backgrounds
6. Add text outline (8-directional shadow via CSS)

**Files**: `js/image-overlay.js` (extend)

**Success Criteria**:

- Chat overlay appears over image
- Text formatting matches existing output
- Chat can be positioned/scaled independently from image
- Black bars render correctly on wrapped lines

---

### Phase 4: Canvas Export System

**Goal**: Generate pixel-perfect image with overlay via Canvas

**Tasks**:

1. Create `js/image-renderer.js`
2. Implement `renderOverlayImage()` function

   ```javascript
   async function renderOverlayImage() {
     const canvas = document.createElement('canvas');
     canvas.width = ImageOverlayState.dropZoneWidth;
     canvas.height = ImageOverlayState.dropZoneHeight;
     const ctx = canvas.getContext('2d');

     // 1. Draw black background
     ctx.fillStyle = '#000000';
     ctx.fillRect(0, 0, canvas.width, canvas.height);

     // 2. Draw image with transforms
     await drawImageWithTransforms(ctx);

     // 3. Draw chat overlay with transforms
     await drawChatOverlay(ctx);

     // 4. Return blob for download
     return canvas.toBlob();
   }
   ```

3. Implement `drawImageWithTransforms(ctx)`
   - Load image, calculate `object-fit: contain` dimensions
   - Apply transforms: translate to center → scale → translate offset
   - Match preview rendering exactly
4. Implement `drawChatOverlay(ctx)`
   - Use existing `parsedChatLines` from parser
   - Width-based text wrapping with `ctx.measureText()`
   - Render text with 8-directional outline
   - Apply black bars if enabled
   - Handle censoring if needed
5. Integrate with existing `downloadOutputImage()` in `app.js`
   - Add new "Download Overlay" button
   - Route to new renderer when overlay mode active

**Files**: `js/image-renderer.js`, `js/app.js`

**Success Criteria**:

- Export matches preview pixel-perfect
- Text wrapping identical to DOM rendering
- Image transforms preserved in export
- File downloads successfully

---

### Phase 5: Advanced Features (Optional)

**Goal**: Add polish and edge cases

**Tasks**:

1. Add censoring support in canvas rendering
   - Invisible, black bar, blur effects
   - Match preview censoring behavior
2. Add zoom controls UI
   - Buttons for 50%/100%/150%/200%
   - Mouse wheel zoom with center-focus
3. Add position reset buttons
   - "Reset Image Position"
   - "Reset Chat Position"
4. Add localStorage persistence
   - Save last used image URL
   - Save transform states
5. Add keyboard shortcuts
   - WASD for image movement
   - Q/E for zoom
   - Arrow keys for chat movement

---

## 5. Technical Implementation Details

### 5.1 Transform System

**Image Transform Order** (CSS + Canvas):

```javascript
// CSS (preview)
transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`;
transformOrigin: 'center center';

// Canvas (export)
ctx.translate(offsetX + drawWidth / 2, offsetY + drawHeight / 2); // Center
ctx.scale(imageTransform.scale, imageTransform.scale); // Scale
ctx.translate(imageTransform.x, imageTransform.y); // Offset
ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
```

**Chat Transform Order** (CSS + Canvas):

```javascript
// CSS (preview)
transform: `translate(${chatTransform.x}px, ${chatTransform.y}px) scale(${chatTransform.scale})`;
transformOrigin: 'top left';

// Canvas (export)
ctx.translate(chatTransform.x, chatTransform.y); // Offset first
ctx.scale(chatTransform.scale, chatTransform.scale); // Then scale
// Text drawing proceeds from (0, 0) within transformed context
```

### 5.2 Text Wrapping

**Reuse existing parser width**:

- Current parser uses `lineLengthInput` (default 77 chars)
- Calculate `chatLineWidth` from font size and character width
- Apply same wrapping logic in canvas via `ctx.measureText()`

**Example**:

```javascript
function measureTextWidth(text, fontSize) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  return ctx.measureText(text).width;
}

const maxTextWidth = chatLineWidth - 8; // Minus padding
const words = textContent.split(' ');
let currentLine = '';

for (const word of words) {
  const testLine = currentLine ? `${currentLine} ${word}` : word;
  if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
    // Wrap here
    drawLine(currentLine);
    currentLine = word;
  } else {
    currentLine = testLine;
  }
}
```

### 5.3 Text Rendering with Outline

**8-directional shadow**:

```javascript
const shadowOffsets = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

// Draw shadows first
ctx.fillStyle = '#000000';
shadowOffsets.forEach(([dx, dy]) => {
  ctx.fillText(text, x + dx, y + TEXT_OFFSET_Y + dy);
});

// Draw main text on top
ctx.fillStyle = textColor;
ctx.fillText(text, x, y + TEXT_OFFSET_Y);
```

---

## 6. Integration Points

### 6.1 Existing Functions to Reuse

```javascript
// From chatlog-parser.js
processOutput()          // Parse chat and update #output
applyFilter()            // Character name filtering

// From app.js
generateFilename()       // File naming convention
showLoadingIndicator()   // Loading feedback
saveToHistory()          // History persistence

// From chatlog-parser.js
All color mapping logic  // Regex patterns, color assignments
wrapSpan()              // HTML generation for colors
```

### 6.2 New Global Functions

```javascript
// In image-overlay.js
window.ImageOverlayState; // Global state
window.handleImageDrop(); // Drop zone handler
window.toggleImageDrag(); // Enable/disable image dragging
window.toggleChatDrag(); // Enable/disable chat dragging
window.resetImagePosition(); // Reset image transforms
window.resetChatPosition(); // Reset chat transforms

// In image-renderer.js
window.renderOverlayImage(); // Main export function
window.drawImageWithTransforms(ctx);
window.drawChatOverlay(ctx);
```

---

## 7. Testing Strategy

### Unit Tests (Vitest)

```javascript
// tests/image-overlay.test.js
describe('ImageOverlayState', () => {
  it('should initialize with default values', () => {
    expect(ImageOverlayState.imageTransform.scale).toBe(1);
  });

  it('should update transform on drag', () => {
    handleImageDrag(10, 20);
    expect(ImageOverlayState.imageTransform.x).toBe(10);
    expect(ImageOverlayState.imageTransform.y).toBe(20);
  });
});

describe('Transform Math', () => {
  it('should calculate object-fit contain correctly', () => {
    const dims = calculateContainDimensions(1920, 1080, 800, 600);
    expect(dims.drawWidth).toBe(800);
    expect(dims.offsetX).toBe(0);
  });
});
```

### Integration Tests

```javascript
// tests/integration/overlay-export.test.js
describe('Overlay Export', () => {
  it('should generate blob for valid image + chat', async () => {
    const blob = await renderOverlayImage();
    expect(blob instanceof Blob).toBe(true);
    expect(blob.type).toBe('image/png');
  });

  it('should match preview dimensions', async () => {
    const blob = await renderOverlayImage();
    const img = await blobToImage(blob);
    expect(img.width).toBe(800);
    expect(img.height).toBe(600);
  });
});
```

### Manual Testing Checklist

- [ ] Upload image via file input
- [ ] Upload image via drag-and-drop
- [ ] Drag image to reposition
- [ ] Zoom image with mouse wheel
- [ ] Toggle image dragging on/off
- [ ] Drag chat overlay independently
- [ ] Scale chat overlay independently
- [ ] Preview matches export (pixel-perfect)
- [ ] Black bars render correctly
- [ ] Text wrapping matches existing parser
- [ ] Color parsing works on overlay
- [ ] Download generates valid PNG
- [ ] History saves overlay state
- [ ] Mobile/touch interactions work

---

## 8. Migration Path

### Phase-by-Phase Deployment

**Step 1**: Deploy Phase 1 + Phase 2 (image upload + manipulation)

- Users can upload and position images
- No breaking changes to existing features

**Step 2**: Deploy Phase 3 (chat overlay preview)

- Users can see chat over image
- Existing download still works (chat-only)

**Step 3**: Deploy Phase 4 (canvas export)

- Add "Download Overlay" button alongside existing download
- Both download modes coexist

**Step 4**: Deploy Phase 5 (optional features)

- Polish and edge case handling

---

## 9. Performance Considerations

### Optimizations

1. **Debounce Transform Updates**
   - Throttle mouse move events during dragging
   - Only update CSS on frame boundaries

   ```javascript
   function updateImageTransform() {
     requestAnimationFrame(() => {
       $image.css({
         transform: `translate(${ImageOverlayState.imageTransform.x}px, ${ImageOverlayState.imageTransform.y}px) scale(${ImageOverlayState.imageTransform.scale})`,
       });
     });
   }
   ```

2. **Cache Canvas Contexts**
   - Reuse canvas for text measurement
   - Avoid creating new contexts per frame

3. **Lazy Load Large Images**
   - Check image dimensions before rendering
   - Scale down if >2048px wide

### Resource Limits

- **Max image size**: 5 MB
- **Canvas size**: 800×600 (no scaling during export)
- **Memory**: Use `willReadFrequently` for canvas contexts

---

## 10. Risk Assessment & Mitigation

| Risk                                   | Impact | Probability | Mitigation                                       |
| -------------------------------------- | ------ | ----------- | ------------------------------------------------ |
| Canvas rendering doesn't match preview | High   | Medium      | Extensive manual testing, pixel comparison tools |
| CORS issues with user images           | Medium | Low         | Load images via FileReader API (local only)      |
| Performance on large images            | Medium | High        | Add image compression, size limits               |
| Transform state conflicts              | Low    | Low         | Isolate state in separate objects                |
| Breaking existing features             | High   | Low         | Phased deployment, extensive testing             |

---

## 11. Success Metrics

### Functional

- ✅ Users can upload and position images
- ✅ Chat overlay matches existing formatting
- ✅ Export produces pixel-perfect output
- ✅ No regression in existing features

### Technical

- ✅ Bundle size < 650 KB (current: 563 KB)
- ✅ No new dependencies
- ✅ All tests passing
- ✅ Zero build step maintained

### UX

- ✅ Sub-500ms transform response
- ✅ Intuitive drag-and-drop
- ✅ Clear visual feedback
- ✅ Mobile-friendly

---

## 12. Timeline Estimate

| Phase                         | Effort          | Files | Dependencies                 |
| ----------------------------- | --------------- | ----- | ---------------------------- |
| Phase 1: Foundation           | 4-6 hours       | 3     | None                         |
| Phase 2: Image Manipulation   | 6-8 hours       | 1     | Phase 1                      |
| Phase 3: Chat Overlay Preview | 8-10 hours      | 1     | Phase 1, 2 + existing parser |
| Phase 4: Canvas Export        | 10-12 hours     | 2     | Phase 1, 2, 3                |
| Phase 5: Advanced Features    | 6-8 hours       | 1     | All above                    |
| **Total**                     | **34-44 hours** | **8** | Incremental                  |

**Recommendation**: Start with Phases 1-3 (MVP), validate with users, then proceed to Phase 4.

---

## 13. Next Steps

1. **Review** this plan with stakeholders
2. **Validate** approach with quick prototype (Phase 1 only)
3. **Implement** Phases 1-3 (MVP)
4. **Test** thoroughly with real GTAW chat logs
5. **Iterate** based on user feedback
6. **Deploy** Phase 4 (canvas export)
7. **Polish** with Phase 5 features

---

## 14. Conclusion

This implementation plan leverages the existing vanilla JS + jQuery architecture to add sophisticated image + chat overlay functionality without introducing framework overhead or build complexity. The phased approach allows incremental deployment and validation while maintaining zero regression on existing features.

**Key Strengths**:

- Builds on proven architecture (563 KB, zero build friction)
- Reuses existing parsing/rendering logic
- Dual rendering pipeline ensures pixel-perfect output
- Incremental deployment reduces risk
- Native Canvas API for performance

**No React, no Astro, no Tailwind—just vanilla JavaScript that works.**
