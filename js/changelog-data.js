const CHANGELOG_ENTRIES = [
    {
        date: '2025-08-11',
        title: 'UI: Output font toggle, lighter background, outline fix',
        categories: {
            'User Experience': [
                'Added output font toggle (Default ↔ Trebuchet MS Bold) with local preference'
            ],
            'Theme & UI': [
                'Lightened site background to improve visibility of line breaks in black text mode'
            ],
            'Typography': [
                'Improved output text outline to prevent small gaps (8-direction text-shadow)'
            ]
        }
    },
    {
        date: '2025-08-10',
        title: 'UX: Word-based Text Selection for Coloring',
        categories: {
            'User Experience': [
                'Switched selection granularity from character-by-character to word-by-word for easier selection and coloring',
                'Drag-select now selects entire words, improving speed and accuracy when applying colors',
                'Selections are now automatically cleared when downloading an image to avoid selection highlights in exports',
                'Added output font toggle (Default ↔ Trebuchet MS Bold) with preference saved locally'
            ],
            'Image Export': [
                'Temporarily disables coloring mode and removes selection outlines before export, restoring them after the image is saved',
                'Defers export by one frame to ensure DOM updates are applied before capture (prevents visual artifacts)'
            ],
            'Theme & UI': [
                'Changed site background to a solid dark color for maximum text clarity (removed gradients)',
                'Removed blurred logo from inside the input; disabled legacy .logo-overlay styles',
                'Reordered stylesheet loading so app.css overrides modern.css correctly',
                'Slightly stronger button hover and selection visuals for better affordance',
                'Lightened global background and output surface to improve visibility of line breaks'
            ],
            'Text Coloring System': [
                'Updated makeTextColorable to generate word-level .colorable spans for both existing spans and plain text nodes',
                'Adjusted fallback processing to wrap unrecognized text by word while preserving whitespace and line breaks',
                'Fixed narrative lines being colored lightgrey by only applying character-name says-coloring when a "says" pattern is present'
            ],
            'Censorship & Formatting': [
                'Preserved censorship handling (÷…÷) while grouping visible text into single word spans',
                'Maintained existing formatting and line-breaking behavior with addLineBreaksAndHandleSpans'
            ],
            'Maintenance': [
                'Fixed invalid nested CSS in color palette export styles',
                'Namespaced and deduplicated event listeners for coloring UI',
                'Replaced blocking alerts with non-blocking toast',
                'Moved loading overlay styles from inline to CSS classes',
                'Excluded selection elements from dom-to-image capture via filter',
                'Escaped raw HTML in wrapping to prevent tag injection in spans',
                'Improved output text outline using 8-direction text-shadow to prevent small gaps',
                'Avoided intrusive native text-stroke to keep the outline outside the glyph fill',
                'Map Trebuchet MS Bold via local() only; no external font files included'
            ]
        }
    },
    {
        date: '2025-08-07',
        title: 'New Feature: Character Name Coloring Toggle & Enhanced Low Voice Logic',
        categories: {
                         'New Features': [
                 'Added "Name Colors" toggle button to disable character name detection coloring even when character name is inputted',
                 'Users can now choose simplified coloring for all voice lines (normal says, low, lower) regardless of character name presence',
                 'Toggle provides visual feedback with button styling changes to indicate current state',
                 'Enhanced accessibility with proper ARIA labels and tooltips for the new toggle feature'
             ],
                         'Character Name Detection': [
                 'Refined low voice coloring logic: "low" lines now use lightgrey when no character name is inputted',
                 'Updated lower voice coloring logic: "lower" lines now use grey when no character name is inputted',
                 'Improved character name detection for "lower" lines: grey when character name is detected, darkgrey otherwise',
                 'Maintained existing logic for "low" lines: lightgrey when character name is detected, grey otherwise',
                 'Enhanced normal "says" line coloring: white when character name is detected, lightgrey otherwise',
                 'Enhanced consistency across all voice line types (normal says, low, lower) with unified coloring behavior'
             ],
                         'User Experience': [
                 'Added toggle functionality that respects user preferences for character name coloring',
                 'Toggle state persists during session and affects all voice line processing (normal says, low, lower)',
                 'Improved button placement in the main control panel for easy access',
                 'Maintained backward compatibility with existing character name detection functionality'
             ],
            'Code Quality': [
                'Added disableCharacterNameColoring variable to track toggle state',
                'Implemented toggleCharacterNameColoring function with proper state management',
                'Enhanced conditional logic in low/lower line processing to respect toggle state',
                'Integrated new toggle with existing UI patterns and styling conventions'
            ]
        }
    },
    {
        date: '2025-08-04',
        title: 'Bug Fixes: Excessive Span Generation, Unrecognized Text Styling & Line Break Issues',
        categories: {
            'Critical Bug Fixes': [
                'Fixed excessive <span> tag generation in coloring mode that was causing deeply nested HTML structures',
                'Resolved issue where makeTextColorable function was repeatedly processing already-converted single-character spans',
                'Updated conditional logic in makeTextColorable to properly detect and skip already-processed colorable spans',
                'Prevented redundant wrapping of text elements that were already converted to single-character colorable spans',
                'Fixed line break functionality for unrecognized text - now properly breaks long lines of unrecognized content',
                'Resolved order of operations issue where line breaks were applied before character spans were created'
            ],
            'UI Improvements': [
                'Removed visual styling for .colorable.unrecognized elements to prevent different appearance from regular text',
                'Unrecognized text now appears identical to regular text without background highlighting or special styling',
                'Maintained coloring functionality for unrecognized text while removing visual distinction',
                'Improved text consistency across all output content regardless of recognition status',
                'Enhanced line break handling for unrecognized text to respect line length settings'
            ],
            'Code Quality': [
                'Enhanced conditional checks in makeTextColorable function with more robust logic',
                'Improved span processing efficiency by preventing duplicate wrapping operations',
                'Maintained backward compatibility with existing coloring system functionality',
                'Modified makeTextColorable to apply line breaks after creating individual character spans for unrecognized text',
                'Enhanced addLineBreaksAndHandleSpans function to better handle existing <br> tags and span elements'
            ]
        }
    },
    {
        date: '2025-07-22',
        title: 'Major Update: Automatic Processing & Enhanced Color System',
        categories: {
            'Core Features': [
                'Added automatic output updates - no more manual typing required!',
                'Character name, line length, and font size changes now update instantly',
                'Background toggle now refreshes output automatically'
            ],
            'User Experience': [
                'Added processing indicator for large chat logs',
                'Added auto-save notifications when settings change',
                'Added input validation to prevent invalid values',
                'Enhanced tooltips for better user guidance'
            ],
            'Color Palette': [
                'Enhanced color palette with descriptive tooltips for each color',
                'Added selection counter showing number of selected elements',
                'Added keyboard shortcuts (1-9) for quick color application',
                'Improved visual feedback for selected text elements',
                'Added color application feedback notifications',
                'Fixed tooltip visibility issues with improved z-index and styling',
                'Fixed stuck left-click selection issue with improved drag state handling'
            ],
            'Content Filtering': [
                'Added filtering for common system messages (unfreeze, vehicle teleport, hat info, animation errors, phone errors, etc.)'
            ],
            'Bug Fixes': [
                'Fixed history panel not closing automatically when clicking outside - now matches changelog behavior',
                'Fixed changelog scrolling confusion - removed nested scrollable areas for better UX',
                'Fixed history panel scrolling confusion - removed triple nested scrollable areas for better UX',
                'Fixed changelog panel not scrolling - resolved CSS display property conflict'
            ],
            'UI Improvements': [
                'Made changelog panel behavior consistent with history panel - tab remains visible and clickable',
                'Removed tab hiding functionality for changelog to match history panel behavior',
                'Simplified changelog interaction - no click-outside handler, just tab toggle like history',
                'Fixed changelog panel z-index - panel now appears in front of the tab like history panel',
                'Smooth tab animations with opacity and scale transitions for better visual feedback'
            ],
            'Major Improvements': [
                'Enhanced text coloring system - now ALL text can be colored, not just recognized roleplay formats',
                'Added visual indicators for unrecognized text with subtle background highlighting',
                'Improved character-by-character selection for any text content in the output'
            ]
        }
    },
    {
        date: '2025-07-05',
        changes: [
            'Fixed SMS message bracket removal issue - now preserves brackets in message content like [LOCATION]'
        ]
    },
    {
        date: '2025-07-04',
        changes: [
            'Added comprehensive CORS handling for dom-to-image compatibility',
            'Created js/cors-handler.js to manage external resource access issues',
            'Enhanced image export with fallback mechanisms for external CDN resources',
            'Improved error handling for SecurityError and cssRules access issues',
            'Optimized canvas operations with willReadFrequently attribute for better performance',
            'Updated error-handler.js to filter dom-to-image and CORS-related console errors',
            'Enhanced chatlog-parser.js with curly apostrophe normalization',
            'Made filter functions globally accessible for better modularity',
            'Added robust two-tier image generation with clean output fallback'
        ]
    },
    {
        date: '2025-01-27',
        changes: [
            'Simplified censorship functionality to only use hidden style',
            'Removed censorship style toggle button and pixelated option',
            'Censorship now always uses opacity: 0 for clean hidden text',
            'Fixed censorship functionality HTML structure breaking when line breaks are applied',
            'Added censorship detection in formatLineWithFilter to prevent HTML from being processed by wrapSpan',
            'Enhanced addLineBreaksAndHandleSpans to properly handle spans without breaking them',
            'Improved text coloring to work alongside censorship without breaking HTML structure',
            'Fixed censorship style toggle to update existing spans in the DOM when style is changed'
        ]
    },
    {
        date: '2025-06-24',
        changes: [
            'Fixed colorable span functionality for text selection',
            'Fixed censorship functionality (÷ symbol) that was duplicating lines in some browsers'
        ]
    },
    {
        date: '2025-06-22',
        changes: [
            'Added weather information formatting with specific color coding',
            'Temperature values, weather conditions, wind speeds, humidity, and precipitation now display in green',
            'Brackets around Fahrenheit and mph values display in white',
            'Current time information displays in white',
            'Improved makeTextColorable function to prevent overriding custom formatted content'
        ]
    },
    {
        date: '2025-06-11',
        changes: [
            'Improved color class handling - now preserves "colorable" class while removing only color classes, making colored text remain selectable for further coloring',
            'Added panic alarm message formatting',
            'Fixed shouting message colors to always be white regardless of character name'
        ]
    },
    {
        date: '2025-06-02',
        changes: [
            'Added coloring for total items purchase messages',
            'Added coloring for PAYG Credit purchase messages'
        ]
    },
    {
        date: '2025-06-01',
        changes: [
            'Fixed character name detection to properly handle (to CharacterName) format - now correctly colors lines white when your character is speaking and lightgrey when others are speaking to you'
        ]
    },
    {
        date: '2025-05-31',
        changes: [
            'Removed exclamation mark coloring for phone messages',
            'Added character name-based coloring for phone messages (white for matching character, yellow for others)',
            'Improved phone message detection to handle both "says [low] (phone):" and "says (phone):" formats'
        ]
    },
    {
        date: '2025-05-20',
        changes: [
            'Reimplemented and modularized the coloring function for better maintainability',
            'Fixed various coloring issues and edge cases',
            'Added changelog panel with click-away functionality',
            'Improved changelog organization and readability',
            'Added comprehensive update history from September 2024'
        ]
    },
    {
        date: '2025-05-15',
        changes: [
            'Added logic to color lines containing says [low] (phone)',
            'Improved image export logic to preserve structure and styles',
            'Fixed styling issues in exported images'
        ]
    },
    {
        date: '2025-05-07',
        changes: [
            'Added alternate character name support',
            'Removed Apply button, character name now auto-applies on selection'
        ]
    },
    {
        date: '2025-04-14',
        changes: [
            'Added history tab',
            'Added session persistence for font size, line break length, and character name'
        ]
    },
    {
        date: '2025-04-03',
        changes: [
            'Added blue formatting for "[ALERT] Lockdown activated!" messages',
            'Added green formatting for "You seized Item" messages',
            'Added proper handling for /ame messages with "CHAT LOG: " prefix',
            'Fixed Prison PA color from purple to blue',
            'Fixed color persistence after using censorship symbol'
        ]
    },
    {
        date: '2025-03-23',
        changes: [
            'Added Text Coloring System'
        ]
    },
    {
        date: '2025-03-09',
        changes: [
            'Added Error Handling System',
            'Added Cross-origin protection script',
            'Added local Font Awesome files',
            'Improved clipboard functionality',
            'Fixed various bugs and improved character name filter'
        ]
    },
    {
        date: '2025-02-07',
        changes: [
            'Fixed CIM styling',
            'Added property and bank related money lines',
            'Added exclamation mark coloring for loudspeaker lines'
        ]
    },
    {
        date: '2025-01-26',
        changes: [
            'Added [STREET] styling',
            'Added chance, microphone, and injuries styling',
            'Changed automatic date removal from /pay lines'
        ]
    },
    {
        date: '2025-01-18',
        changes: [
            'Added useful card reader lines'
        ]
    },
    {
        date: '2025-01-16',
        changes: [
            'Added faction invite style'
        ]
    },
    {
        date: '2025-01-11',
        changes: [
            'Added inventory styling',
            'Added equipped weapon styling',
            'Added [!] coloring',
            'Added "was seized by" style',
            'Added "You were frisked by" style'
        ]
    },
    {
        date: '2025-01-05',
        changes: [
            'Added "you\'ve used" style'
        ]
    },
    {
        date: '2024-12-27',
        changes: [
            'Fixed whisper detection for all whisper types',
            'Added jail time message formatting'
        ]
    },
    {
        date: '2024-11-20',
        changes: [
            'Added style for "Equipped Weapons"',
            'Added style for group whispers',
            'Added style for corpse damage check',
            'Added style for "You\'ve been shot"',
            'Reworked censoring system'
        ]
    },
    {
        date: '2024-10-20',
        changes: [
            'Changed lineLengthInput to number type',
            'Added \'you dropped\' coloring',
            'Added \'emergencyCallPattern\''
        ]
    },
    {
        date: '2024-10-13',
        changes: [
            'Added changeable line break length',
            'Added "you\'ve just taken" logic',
            'Added Prison PA logic',
            'Added CASHTAP coloring'
        ]
    },
    {
        date: '2024-10-03',
        changes: [
            'Changed logic and coloring for new phone system'
        ]
    },
    {
        date: '2024-09-25',
        changes: [
            'Added phone /me coloring',
            'Added [lower] coloring'
        ]
    },
    {
        date: '2024-09-18',
        changes: [
            'Added censoring option for monetary values and identifiers',
            'Fixed SMS coloring'
        ]
    },
    {
        date: '2024-09-17',
        changes: [
            'Added [low] recognition in character filter',
            'Fixed font-smoothing browser compatibility'
        ]
    },
    {
        date: '2024-09-15',
        changes: [
            'Added PropertyRobbery coloring',
            'Added Vessel Traffic Service coloring',
            'Improved UI with better hover states and transitions',
            'Adjusted logo and input styling'
        ]
    },
    {
        date: '2024-09-13',
        changes: [
            'Added "you paid" coloring',
            'Added "ame" coloring',
            'Updated "me" and "ame" coloring',
            'Added Department Radio coloring',
            'Added various new coloring patterns'
        ]
    }
]; 