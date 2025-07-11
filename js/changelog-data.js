const CHANGELOG_ENTRIES = [
    {
        date: '2025-07-11',
        changes: [
            'Skipped kick/ban messages in chatlog parser to hide administrative notifications'
        ]
    },
    {
        date: '2025-07-09',
        changes: [
            'Refactored speech line handling and speaker color detection for greater accuracy',
            'Specially formatted [!] lines and filtered certain system messages'
        ]
    },
    {
        date: '2025-07-08',
        changes: [
            'Added orange coloring for lines beginning with "You took"'
        ]
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