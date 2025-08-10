$(document).ready(function() {

    let applyBackground = false;
    let applyCensorship = false;
    let disableCharacterNameColoring = false;

    const $textarea = $("#chatlogInput");
    const $output = $("#output");
    const $toggleBackgroundBtn = $("#toggleBackground");
    const $toggleCensorshipBtn = $("#toggleCensorship");
    const $toggleCharacterNameColoringBtn = $("#toggleCharacterNameColoring");
    const $censorCharButton = $("#censorCharButton");
    const $lineLengthInput = $("#lineLengthInput");
    const $characterNameInput = $("#characterNameInput");
    const $toggleColorPaletteBtn = $("#toggleColorPalette");
    let $colorPalette = $("#colorPalette");

    $toggleBackgroundBtn.click(toggleBackground);
    $toggleCensorshipBtn.click(toggleCensorship);
    $toggleCharacterNameColoringBtn.click(toggleCharacterNameColoring);
    $censorCharButton.click(copyCensorChar);
    $lineLengthInput.on("input", processOutput);
    $characterNameInput.on("input", applyFilter);
    $textarea.off("input").on("input", throttle(processOutput, 200));

    function toggleBackground() {
        applyBackground = !applyBackground;
        $output.toggleClass("background-active", applyBackground);

        $toggleBackgroundBtn
            .toggleClass("btn-dark", applyBackground)
            .toggleClass("btn-outline-dark", !applyBackground);

        processOutput();
    }

    function toggleCensorship() {
        applyCensorship = !applyCensorship;
        $toggleCensorshipBtn
            .toggleClass("btn-dark", applyCensorship)
            .toggleClass("btn-outline-dark", !applyCensorship);
        processOutput();
    }

    function toggleCharacterNameColoring() {
        disableCharacterNameColoring = !disableCharacterNameColoring;
        $toggleCharacterNameColoringBtn
            .toggleClass("btn-dark", disableCharacterNameColoring)
            .toggleClass("btn-outline-dark", !disableCharacterNameColoring);
        processOutput();
    }

    function applyFilter() {
        processOutput();
    }

    // Make applyFilter globally accessible
    window.applyFilter = applyFilter;

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function throttle(func, limit) {
        let lastFunc, lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if (Date.now() - lastRan >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function formatSaysLine(line, currentCharacterName) {
        if (!currentCharacterName || disableCharacterNameColoring) {
            return wrapSpan("white", line);
        }

        // Check if line starts with [!]
        const hasExclamation = line.startsWith("[!]");
        const lineWithoutExclamation = hasExclamation ? line.substring(3).trim() : line;

        // Extract the speaker's name (before 'says')
        const nameMatch = lineWithoutExclamation.match(/^([^:]+?)\s+says/);
        const speakerName = nameMatch ? nameMatch[1].trim().toLowerCase() : '';

        // Check if the line contains (to CharacterName) format
        const toSectionPattern = /\(to [^)]+\)/i;
        const hasToSection = toSectionPattern.test(lineWithoutExclamation);
        
        // Determine the color for the main content
        let mainColor;
        if (hasToSection) {
            // Extract the target name from (to CharacterName)
            const toSectionMatch = lineWithoutExclamation.match(toSectionPattern);
            const targetName = toSectionMatch ? toSectionMatch[0].match(/\(to ([^)]+)\)/i)[1].toLowerCase() : '';
            
            // If the target is the current character, color as white (directed at you)
            if (targetName === currentCharacterName.toLowerCase()) {
                mainColor = "white";
            } else {
                // If speaker is the current character, color as white, otherwise lightgrey
                mainColor = (speakerName === currentCharacterName.toLowerCase()) ? "white" : "lightgrey";
            }
        } else {
            // No (to CharacterName) format, check if speaker is the current character
            if (speakerName === currentCharacterName.toLowerCase()) {
                mainColor = "white";
            } else {
                mainColor = "lightgrey";
            }
        }

        // If line has [!], format it specially
        if (hasExclamation) {
            // For [!] lines, we need to handle the coloring differently
            // to avoid the wrapSpan function breaking down the HTML
            const restOfLine = lineWithoutExclamation;
            // Return HTML that won't be processed by makeTextColorable
            return `<span class="toyou colorable">[!]</span> <span class="${mainColor} colorable">${restOfLine}</span>`;
        }

        return wrapSpan(mainColor, line);
    }

    function replaceDashes(text) {
        return text.replace(/(\.{2,3}-|-\.{2,3})/g, '—');
    }

    function replaceCurlyApostrophes(text) {
        // More comprehensive approach: replace any character in the curly apostrophe Unicode range
        let result = text;
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            if (charCode >= 8216 && charCode <= 8219 && charCode !== 39) {
                result = result.replace(text[i], "'");
            }
        }
        
        // Also try the regex approach
        result = result.replace(/['''']/g, "'");
        
        return result;
    }

    function processOutput() {
        const chatText = $textarea.val();
        const chatLines = chatText.split("\n")
                                  .map(removeTimestamps)
                                  .map(replaceDashes)
                                  .map(replaceCurlyApostrophes);

        const fragment = document.createDocumentFragment();

        chatLines.forEach((line) => {
            // Skip animation stop messages
            if (line.includes("Use /anim stop to stop animations and remove items from your hands.")) {
                return;
            }

            // Skip abuse warning messages
            if (line.includes("Any abuse of the editor will result in harsh admin punishment.")) {
                return;
            }

            // Skip kick/ban messages
            if (line.includes("was kicked for:") || line.includes("was banned for:")) {
                return;
            }

            // Skip unfreeze instructions
            if (line.includes("⚠️You can now press K to unfreeze yourself. Do not hold W while doing so.")) {
                return;
            }

            // Skip animation stop info
            if (line.includes("[INFO] If this doesn't work, use .stop or /anim stop.")) {
                return;
            }

            // Skip vehicle teleport info
            if (line.includes("You may now use /vget, your vehicle will be automatically teleported on you.")) {
                return;
            }

            // Skip fixveh warning
            if (line.includes("((ANY MISUSAGE OF /FIXVEH IS BANNABLE, YOU MAY ONLY USE IT AFTER A BUG THAT LEFT YOU WITHOUT VEHICLES OOCLY.))")) {
                return;
            }

            // Skip hat info
            if (line.includes("[INFO] You can also use /hat custom1-5 to pick one of your saved favourite hats!")) {
                return;
            }

            // Skip animation error
            if (line.includes("[ERROR] That animation was not found.")) {
                return;
            }

            // Skip phone locked error
            if (line.includes("[ERROR] This phone is locked.")) {
                return;
            }

            // Skip F2/F3 instructions
            if (line.includes("Use F2 to re-enable the chat and use F3 to activate the cursor. You can also use /pc for the cursor.")) {
                return;
            }

            const div = document.createElement("div");
            div.className = "generated";

            // Check if this is a [!] line first, before any other processing
            if (line.startsWith("[!]")) {
                const currentCharacterName = $("#characterNameInput").val().toLowerCase().trim();
                const lineWithoutExclamation = line.substring(3).trim();
                
                // Extract the speaker's name (before 'says')
                const nameMatch = lineWithoutExclamation.match(/^([^:]+?)\s+says/);
                const speakerName = nameMatch ? nameMatch[1].trim().toLowerCase() : '';
                
                // Check if the line contains (to CharacterName) format
                const toSectionPattern = /\(to [^)]+\)/i;
                const hasToSection = toSectionPattern.test(lineWithoutExclamation);
                
                // Determine the color for the main content
                let mainColor;
                if (hasToSection) {
                    // Extract the target name from (to CharacterName)
                    const toSectionMatch = lineWithoutExclamation.match(toSectionPattern);
                    const targetName = toSectionMatch ? toSectionMatch[0].match(/\(to ([^)]+)\)/i)[1].toLowerCase() : '';
                    
                    // If the target is the current character, color as white (directed at you)
                    if (targetName === currentCharacterName) {
                        mainColor = "white";
                    } else {
                        // If speaker is the current character, color as white, otherwise lightgrey
                        mainColor = (speakerName === currentCharacterName) ? "white" : "lightgrey";
                    }
                } else {
                    // No (to CharacterName) format, check if speaker is the current character
                    if (speakerName === currentCharacterName) {
                        mainColor = "white";
                    } else {
                        mainColor = "lightgrey";
                    }
                }
                
                // Create the properly formatted HTML for [!] lines and apply line breaks
                // Add colorable class to make spans selectable for letter-by-letter coloring
                const formattedHTML = `<span class="toyou colorable">[!]</span> <span class="${mainColor} colorable">${lineWithoutExclamation}</span>`;
                div.innerHTML = addLineBreaksAndHandleSpans(formattedHTML);
                // Don't add no-colorable class since we want these spans to be colorable
            } else {
                let formattedLine = formatLineWithFilter(line);

                // Apply censorship after formatting to catch plain lines
                formattedLine = applyUserCensorship(formattedLine);
                div.innerHTML = addLineBreaksAndHandleSpans(formattedLine);
                
                // If the formatted line contains HTML (like [!] lines), mark it to skip makeTextColorable
                if (formattedLine.includes('<span') || formattedLine.includes('<div')) {
                    div.classList.add('no-colorable');
                }
            }
            
            fragment.appendChild(div);

            const clearDiv = document.createElement("div");
            clearDiv.className = "clear";
            fragment.appendChild(clearDiv);
        });

        $output.html('');
        $output.append(fragment);
        cleanUp();

        makeTextColorable();
    }

    // Make processOutput globally accessible
    window.processOutput = processOutput;

    function makeTextColorable() {
        // Process each .generated div individually
        $output.find('.generated').each(function() {
            const generatedDiv = $(this);
            
            // Skip if the div has the no-colorable class
            if (generatedDiv.hasClass('no-colorable')) {
                return;
            }
            
            // Check if the div contains HTML elements (like spans)
            const hasElements = generatedDiv.find('span, div, br').length > 0;
            const hasSpanInHTML = generatedDiv.html().includes('<span');
            const hasDivInHTML = generatedDiv.html().includes('<div');
            const hasBrInHTML = generatedDiv.html().includes('<br');
            
            // If the div contains HTML elements, process them for word-by-word coloring
            if (hasElements || hasSpanInHTML || hasDivInHTML || hasBrInHTML) {
                // Find all text nodes within existing spans and make them colorable word by word
                generatedDiv.find('span').each(function() {
                    const span = $(this);
                    const text = span.text();
                    
                                    // CORREÇÃO: Pula spans que já foram processados para evitar duplicação.
                if ((span.hasClass('colorable') && span.text().length === 1) || span.children().length > 0) {
                    return; // Skip to the next span
                }
                    
                    // Get the existing classes from the span
                    const existingClasses = span.attr('class') || '';
                    const classArray = existingClasses.split(/\s+/).filter(cls => cls !== 'colorable');
                    
                    // Split the text into words and whitespace and wrap each word in a colorable span
                    const tokens = text.split(/(\s+)/g);
                    const html = tokens.map(token => {
                        if (token === '') return '';
                        if (/^\s+$/.test(token)) return token;
                        const normalized = token.replace(/[\u2018\u2019\u2032\u2035]/g, "'");
                        return `<span class="${classArray.join(' ')} colorable">${normalized}</span>`;
                    }).join('');
                    
                    // Replace the span's content with the word-by-word HTML
                    span.html(html);
                });
                return;
            }
            
            // Get all child nodes (both elements and text nodes)
            const childNodes = generatedDiv[0].childNodes;
            const nodesToProcess = [];
            
            // Collect text nodes that should be processed
            for (let i = 0; i < childNodes.length; i++) {
                const node = childNodes[i];
                
                // Only process text nodes
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    
                    // Skip empty text nodes
                    if (text.length === 0) continue;
                    
                    // Skip text nodes that contain HTML-like content
                    if (/<[^>]*>/.test(text) || /&[a-zA-Z0-9#]+;/.test(text)) continue;
                    
                    nodesToProcess.push(node);
                }
            }
            
            // Process the collected text nodes (word-by-word)
            nodesToProcess.forEach(textNode => {
                const text = textNode.textContent;
                const parent = textNode.parentNode;
                
                const temp = document.createElement('div');
                
                // Split into words and whitespace for word-by-word selection
                const tokens = text.split(/(\s+)/g);
                const html = tokens.map(token => {
                    if (token === '') return '';
                    if (/^\s+$/.test(token)) return token;
                    const normalized = token.replace(/[\u2018\u2019\u2032\u2035]/g, "'");
                    return `<span class="colorable">${normalized}</span>`;
                }).join('');
                
                temp.innerHTML = html;
                
                const fragment = document.createDocumentFragment();
                while (temp.firstChild) {
                    fragment.appendChild(temp.firstChild);
                }
                
                parent.replaceChild(fragment, textNode);
            });
        });
        
        // NEW: Make ALL remaining text colorable, word-by-word, even if not recognized by parser
        $output.find('.generated').each(function() {
            const generatedDiv = $(this);
            
            // Skip if already processed or has no-colorable class
            if (generatedDiv.hasClass('no-colorable') || generatedDiv.find('.colorable').length > 0) {
                return;
            }
            
            // Get all text content that hasn't been processed yet
            const textContent = generatedDiv.text().trim();
            if (textContent.length === 0) return;
            
            // Split into words and whitespace for word-by-word selection
            const tokens = textContent.split(/(\s+)/g);
            const html = tokens.map(token => {
                if (token === '') return '';
                if (/^\s+$/.test(token)) return token;
                const normalized = token.replace(/[\u2018\u2019\u2032\u2035]/g, "'");
                return `<span class="colorable unrecognized">${normalized}</span>`;
            }).join('');
            
            // Apply line breaks to the HTML with individual character spans
            const htmlWithLineBreaks = addLineBreaksAndHandleSpans(html);
            
            // Replace the entire content with the character-by-character HTML that has line breaks
            generatedDiv.html(htmlWithLineBreaks);
        });
        
        console.log("Made text colorable - total colorable elements: " + $output.find('.colorable').length);
    }

    // Make makeTextColorable globally accessible for the color palette
    window.makeTextColorable = makeTextColorable;

    function applyUserCensorship(line) {
        // Use a more robust approach that handles browser compatibility issues
        // Replace ÷ with a more reliable delimiter and handle edge cases
        try {
            return line.replace(/÷(.*?)÷/g, (match, p1) => {
                // Ensure we're not duplicating content
                if (p1 && p1.trim()) {
                    return `<span class="hidden censored-content" data-original="${p1.replace(/"/g, '&quot;')}">${p1}</span>`;
                }
                return match; // Return original if no content to censor
            });
        } catch (error) {
            // Fallback for browsers with regex issues
            console.warn('Censorship regex failed, using fallback method:', error);
            return line.replace(/÷/g, '÷'); // Just return the line as-is if regex fails
        }
    }

    function removeTimestamps(line) {
        return line.replace(/\[\d{2}:\d{2}:\d{2}\] /g, "").trim();
    }

    function formatLineWithFilter(line) {
        // Strip censorship markers for formatting logic
        const cleanLine = line.replace(/÷(.*?)÷/g, '$1');
        const lowerLine = cleanLine.toLowerCase();

        const formattedLine = applySpecialFormatting(line, lowerLine);
        if (formattedLine) {
            return formattedLine;
        }

        const currentCharacterName = $("#characterNameInput").val().toLowerCase().trim();
        // Only apply character-name based says coloring when the line actually contains a "says" pattern
        if (currentCharacterName && currentCharacterName !== "" && /\bsays\b/.test(lowerLine)) {
            // Remove [!] if present for name detection
            const lineWithoutExclamation = cleanLine.replace(/^\[!\]\s*/, '');
            
            // Extract the name before "says" and check if it matches the character name
            const nameMatch = lineWithoutExclamation.match(/^([^:]+?)\s+says/);
            const speakerName = nameMatch ? nameMatch[1].trim().toLowerCase() : '';
            
            // Check if the line contains (to CharacterName) format
            const toSectionPattern = /\(to [^)]+\)/i;
            const hasToSection = toSectionPattern.test(lineWithoutExclamation);
            
            // Determine the color based on speaker and target
            let mainColor;
            if (hasToSection) {
                // Extract the target name from (to CharacterName)
                const toSectionMatch = lineWithoutExclamation.match(toSectionPattern);
                const targetName = toSectionMatch ? toSectionMatch[0].match(/\(to ([^)]+)\)/i)[1].toLowerCase() : '';
                
                // If the target is the current character, color as white (directed at you)
                if (targetName === currentCharacterName) {
                    mainColor = "white";
                } else {
                    // If speaker is the current character, color as white, otherwise lightgrey
                    mainColor = (speakerName === currentCharacterName) ? "white" : "lightgrey";
                }
            } else {
                // No (to CharacterName) format, check if speaker is the current character
                if (speakerName === currentCharacterName) {
                    mainColor = "white";
                } else {
                    mainColor = "lightgrey";
                }
            }
            
            return wrapSpan(mainColor, line);
        }

        return formatLine(line);
    }

    function applySpecialFormatting(line, lowerLine) {
        const currentCharacterName = $("#characterNameInput").val().toLowerCase().trim();

        // Check for weather pattern first
        const weatherFormatted = formatWeatherLine(line);
        if (weatherFormatted) {
            return weatherFormatted;
        }

        if (line.startsWith("[ALERT] Lockdown activated!")) {
            return wrapSpan("blue", line);
        }

        if (line.startsWith("You seized")) {
            const match = line.match(/^(You seized )(.+?)( from )(.+)$/);
            if (match) {
                const [_, prefix, item, from, name] = match;
                return wrapSpan("green", line);
            }
        }

        if (/^\*\* \[PRISON PA\].*\*\*$/.test(line)) {
            return wrapSpan("blue", line);
        }

        if (/(?:^\[\d{2}:\d{2}:\d{2}\] )?CHAT LOG: > .+/.test(line)) {

            let cleanMessage = line.replace(/^\[\d{2}:\d{2}:\d{2}\] /, "");

            cleanMessage = cleanMessage.replace(/^CHAT LOG: /, "");
            return wrapSpan("ame", cleanMessage);
        }

        if (line.includes("'s attempt has")) {
            if (line.includes("succeeded")) {
                const parts = line.match(/^(\* .+?'s attempt has )(succeeded\. )(\(\()(\d+%)(\)\))$/);
                if (parts) {
                    const [_, prefix, successWithDot, openParen, percent, closeParen] = parts;
                    return wrapSpan("me", prefix) + 
                           wrapSpan("green", successWithDot) + 
                           wrapSpan("white", openParen + percent + closeParen);
                }
            }
            if (line.includes("failed")) {
                const parts = line.match(/^(\* .+?'s attempt has )(failed\. )(\(\()(\d+%)(\)\))$/);
                if (parts) {
                    const [_, prefix, failWithDot, openParen, percent, closeParen] = parts;
                    return wrapSpan("me", prefix) + 
                           wrapSpan("death", failWithDot) + 
                           wrapSpan("white", openParen + percent + closeParen);
                }
            }
        }

        if (line.startsWith("[INFO]:") && line.includes("[") && line.includes("/")) {
            const match = line.match(/^(\[INFO\]:)\s*(\[\d{2}\/[A-Z]{3}\/\d{4}\])\s*(.+)$/);
            if (match) {
                const [_, info, date, message] = match;
                return wrapSpan("blue", info) + " " + wrapSpan("orange", date) + " " + wrapSpan("white", message);
            }
        }

        if (line.startsWith("You collected") || line.startsWith("You added")) {
            const match = line.match(/^(You (?:collected|added) )(\$\d+(?:,\d{3})*)((?:\s+from|\s+in) the property\.)$/);
            if (match) {
                const [_, prefix, amount, suffix] = match;
                return wrapSpan("white", prefix) + wrapSpan("green", amount) + wrapSpan("white", suffix);
            }
        }

        if (line.startsWith("[INTERVIEW]")) {
            return wrapSpan("green", line);
        }

        if (line.startsWith("You have withdrawn")) {
            const match = line.match(/^You have withdrawn \$\d+(?:,\d{3})*\.?$/);
            if (match) {
                return wrapSpan("green", line.endsWith(".") ? line : line + ".");
            }
        }

        if (line.startsWith("You have deposited")) {
            const match = line.match(/^You have deposited \$\d+(?:,\d{3})*\.?$/);
            if (match) {
                return wrapSpan("green", line.endsWith(".") ? line : line + ".");
            }
        }

        if (isRadioLine(line)) {
            if (!currentCharacterName) {
                return wrapSpan("radioColor", line);
            }
            return lowerLine.includes(currentCharacterName.toLowerCase())
                ? wrapSpan("radioColor", line)
                : wrapSpan("radioColor2", line);
        }

                    if (lowerLine.includes("says [lower]")) {
                if (!currentCharacterName || disableCharacterNameColoring) {
                    return wrapSpan("grey", line);
                }
                return lowerLine.includes(currentCharacterName.toLowerCase())
                    ? wrapSpan("grey", line)
                    : wrapSpan("darkgrey", line);
            }

            if (lowerLine.includes("says [low]:")) {
                if (!currentCharacterName || disableCharacterNameColoring) {
                    return wrapSpan("lightgrey", line);
                }
                return lowerLine.includes(currentCharacterName.toLowerCase())
                    ? wrapSpan("lightgrey", line)
                    : wrapSpan("grey", line);
            }

            if (lowerLine.includes("says [low] (to")) {
                if (!currentCharacterName || disableCharacterNameColoring) {
                    return wrapSpan("lightgrey", line);
                }

                const saysIndex = lowerLine.indexOf("says");
                const nameBeforeSays = lowerLine.substring(0, saysIndex);
                if (nameBeforeSays.includes(currentCharacterName.toLowerCase())) {
                    return wrapSpan("lightgrey", line);
                }
                return wrapSpan("grey", line);
            }

        if (line.includes("says [low] (phone):") || line.includes("says (phone):")) {
            if (currentCharacterName && line.toLowerCase().includes(currentCharacterName.toLowerCase())) {
                return wrapSpan("white", line);
            } else {
                return wrapSpan("yellow", line);
            }
        }

        if (line === "Injuries:") {
            return wrapSpan("blue", line);
        }

        if (lowerLine.includes("says:") && !lowerLine.includes("[low]") && !lowerLine.includes("[lower]") && !lowerLine.includes("whispers") && !lowerLine.includes("(phone)") && !lowerLine.includes("(loudspeaker)")) {
            return formatSaysLine(line, currentCharacterName);
        }

        // Check for shouts before other conditions
        if (lowerLine.includes("shouts:") || lowerLine.includes("shouts (to")) {
            return wrapSpan("white", line);
        }

        // Handle panic alarm messages
        const panicAlarmPattern = /^\[(LSSD|LSPD|PHMC|SADCR) PANIC ALARM\] (.+) activated their panic alarm at (.+)$/i;
        const panicMatch = line.match(panicAlarmPattern);
        if (panicMatch) {
            const [_, department, officer, location] = panicMatch;
            return wrapSpan("blue", `[${department} PANIC ALARM]`) + 
                   wrapSpan("white", ` ${officer} activated their panic alarm at`) + 
                   wrapSpan("blue", ` ${location}`);
        }

        if (line.startsWith("you were frisked by")) {
            return wrapSpan("green", line);
        }

        if (lowerLine.startsWith("you've used")) {
            return wrapSpan("green", line);
        }

        if (line.match(/^___Description of .+___$/)) {
            return wrapSpan("blue", line);
        }

        if (line.startsWith("Age range:")) {
            const parts = line.split("Age range:");
            return wrapSpan("blue", "Age range:") + wrapSpan("white", parts[1]);
        }

        if (line.startsWith("->")) {
            const parts = line.split("->");
            return wrapSpan("blue", "->") + wrapSpan("white", parts[1]);
        }

        if (line.startsWith("[INFO]")) {
            const parts = line.split("[INFO]");
            return wrapSpan("blue", "[INFO]") + wrapSpan("white", parts[1]);
        }

        if (line.match(/^___Tattoos description of .+___$/)) {
            return wrapSpan("blue", line);
        }

        if (line.startsWith("[CASHTAP]")) {
            const parts = line.split("[CASHTAP]");
            return wrapSpan("green", "[CASHTAP]") + wrapSpan("white", parts[1]);
        }

        if (line.match(/\|------ .+'s Items \d{2}\/[A-Z]{3}\/\d{4} - \d{2}:\d{2}:\d{2} ------\|/)) {
            return wrapSpan("green", line);
        }

        if (line.match(/^(?:\[\d{2}:\d{2}:\d{2}\]\s+)?\d+: .+/)) {
            // Handle PH: lines directly without recursion
            if (line.includes("PH:")) {
                const phoneMatch = line.trim().match(/^(\d+: .+? x\d+ \(.+?\) -) (PH: \d+)$/);
                if (phoneMatch) {
                    const [_, itemPart, phonePart] = phoneMatch;
                    return wrapSpan("yellow", itemPart) + " " + wrapSpan("green", phonePart);
                }
            }

            if (line.includes("Money ($")) {
                const moneyMatch = line.match(/^(\d+: Money \()(\$\d+(?:,\d{3})*)(\) \(\d+g\))$/);
                if (moneyMatch) {
                    const [_, prefix, amount, suffix] = moneyMatch;
                    return wrapSpan("yellow", prefix) + wrapSpan("green", amount) + wrapSpan("yellow", suffix);
                }
            }
            return wrapSpan("yellow", line);
        }

        if (lowerLine.startsWith("total weight:")) {
            return wrapSpan("yellow", line);
        }

        if (lowerLine.startsWith("money on hand:")) {
            return wrapSpan("green", line);
        }

        if (lowerLine.includes("left in jail")) {
            return formatJailTime(line);
        }

        const corpseDamagePattern = /^(.+?) \((ID)\) damages:/;
        const corpseDamageMatch = line.match(corpseDamagePattern);
        if (corpseDamageMatch) {
            const namePart = corpseDamageMatch[1];
            const restOfLine = line.slice(namePart.length);
            return `<span class="blue">${namePart}</span><span class="white">${restOfLine}</span>`;
        }

        const youBeenShotPattern = /You've been shot in the (.+?) with a (.+?) for (\d+) damage\. \(\(Health : (\d+)\)\)/;
        const youBeenShotMatch = line.match(youBeenShotPattern);
        if (youBeenShotMatch) {
            const [_, text, text2, numbers, numbers2] = youBeenShotMatch;
            return `<span class="death">You've been shot</span> <span class="white"> in the </span> <span class="death">${text}</span> <span class="white"> with a </span> <span class="death">${text2}</span> <span class="white"> for </span> <span class="death">${numbers}</span> <span class="white"> damage. ((Health : </span> <span class="death">${numbers2}</span> <span class="white">))</span>`;
        }

        if (line === "********** EMERGENCY CALL **********") {
            return '<span class="blue">' + line + '</span>';
        }

        if (line.includes("[POLICE MDC]")) {
            return formatPoliceMDC(line);
        }

        if (/\([^\)]+\) Message from [^:]+: .+/.test(line)) {
            return formatSmsMessage(line);
        }

        if (lowerLine.includes("you've set your main phone to")) return formatPhoneSet(line);

        if (/\([^\)]+\) Incoming call from .+/.test(line)) {
            return formatIncomingCall(line);
        }

        if (lowerLine === 'your call has been picked up.') {
            return wrapSpan('yellow', line);
        }

        if (lowerLine === 'you have hung up the call.') {
            return wrapSpan('white', line);
        }

        if (lowerLine === 'the other party has declined the call.') {
            return wrapSpan('white', line);
        }

        if (lowerLine.startsWith("[info]")) return colorInfoLine(line);

        if (lowerLine.includes("[ch: vts - vessel traffic service]")) return formatVesselTraffic(line);

        if (/\[[^\]]+ -> [^\]]+\]/.test(line)) return wrapSpan("depColor", line);

        if (line.startsWith("*")) return wrapSpan("me", line);

        if (line.startsWith(">")) return wrapSpan("ame", line);

        if (lowerLine.includes("(phone) *")) return wrapSpan("me", line);

        if (lowerLine.includes("whispers") || line.startsWith("(Car)")) {
            return handleWhispers(line);
        }        

        if (lowerLine.includes("says (phone):") || lowerLine.includes("says (loudspeaker):")) {
            return handleCellphone(line);
        }

        if (/\[[^\]]+ -> [^\]]+\]/.test(line)) return wrapSpan("depColor", line);

        if (lowerLine.includes("[megaphone]:")) return wrapSpan("yellow", line);

        if (line.includes("[Microphone]:")) {
            return wrapSpan("yellow", line);
        }

        if (line.includes("[STREET]")) {
            if (line.includes(" / ")) {

                const parts = line.match(/\[STREET\] Street name: (.+?) \/ (.+?) \| Zone: ([^.]+)(\.)/);
                if (parts) {
                    const [_, street1, street2, zone, dot] = parts;
                    return `${wrapSpan("blue", "[STREET]")} Street name: ${wrapSpan("orange", street1)} / ${wrapSpan("orange", street2)} | Zone: ${wrapSpan("orange", zone)}${dot}`;
                }
            } else {

                const parts = line.match(/\[STREET\] Street name: (.+?) \| Zone: ([^.]+)(\.)/);
                if (parts) {
                    const [_, street, zone, dot] = parts;
                    return `${wrapSpan("blue", "[STREET]")} Street name: ${wrapSpan("orange", street)} | Zone: ${wrapSpan("orange", zone)}${dot}`;
                }
            }
        }

        if (lowerLine.startsWith("info:")) {
            if (line.includes("card reader") || line.includes("card payment") || line.includes("swiped your card")) {
                return formatCardReader(line);
            }
            return formatInfo(line);
        }

        if (lowerLine.includes("you have received $")) return colorMoneyLine(line);

        if (lowerLine.includes("[drug lab]")) return formatDrugLab();

        if (lowerLine.includes("[character kill]")) return formatCharacterKill(line);

        if (/\[.*? intercom\]/i.test(lowerLine)) return formatIntercom(line);

        if (lowerLine.startsWith("you placed")) return wrapSpan("orange", line);

        if (/^you took.*from the property\.$/i.test(line))
            return wrapSpan("death", line);

        if (lowerLine.startsWith("you took")) return wrapSpan("orange", line);

        if (lowerLine.includes("from the property")) return wrapSpan("death", line);

        if (lowerLine.startsWith("you dropped")) return wrapSpan("death", line);

        if (lowerLine.startsWith("use /phonecursor")) return formatPhoneCursor(line);

        if (lowerLine.includes("has shown you their")) return formatShown(line);

        if (lowerLine.includes("you have successfully sent your current location")) 
            return wrapSpan("green", line);

        if (lowerLine.includes("you received a location from"))
            return colorLocationLine(line);

        if (lowerLine.includes("you gave") ||
            lowerLine.includes("paid you") ||
            lowerLine.includes("you paid") ||
            lowerLine.includes("you received"))
            return handleTransaction(line);

        if (lowerLine.includes("you are now masked")) return wrapSpan("green", line);

        if (lowerLine.includes("you have shown your inventory")) return wrapSpan("green", line);

        if (lowerLine.includes("you are not masked anymore")) return wrapSpan("death", line);

        if (lowerLine.includes("you're being robbed, use /arob")) return formatRobbery(line);

        if (line.includes("You have received an invitation to join the")) {
            const parts = line.split("join the ");
            const factionPart = parts[1].split(",")[0];
            return parts[0] + "join the " + wrapSpan("yellow", factionPart) + ", type /faccept to confirm";
        }

        if (line.includes("You're now a member of")) {
            const parts = line.split("member of ");
            const factionPart = parts[1].split(" you")[0];
            return parts[0] + "member of " + wrapSpan("yellow", factionPart) + " you may need to /switchfactions to set it as your active faction!";
        }

        if (lowerLine.startsWith("you've cut")) return formatDrugCut(line);

        if (lowerLine.includes("[property robbery]")) return formatPropertyRobbery(line);

        if (/You've just taken .+?! You will feel the effects of the drug soon\./.test(line)) {
            return formatDrugEffect(line);
        }

        if (line.includes("[CASHTAP]")) {
            return formatCashTap(line);
        }

        if (lowerLine.includes("(goods)") || line.match(/(.+?)\s+x(\d+)\s+\((\d+g)\)/)) 
            return handleGoods(line);

        if (lowerLine.includes("says:") && !lowerLine.includes("[low]") && !lowerLine.includes("[lower]") && !lowerLine.includes("whispers") && !lowerLine.includes("(phone)") && !lowerLine.includes("(loudspeaker)")) {
            return formatSaysLine(line, currentCharacterName);
        }

        if (/^\*\* \[PRISON PA\].*\*\*$/.test(line)) {
            return formatPrisonPA(line);
        }

        const emergencyCallPattern = /^(Log Number|Phone Number|Location|Situation):\s*(.*)$/;
        const emergencyMatch = line.match(emergencyCallPattern);
        if (emergencyMatch) {
            const key = emergencyMatch[1];
            const value = emergencyMatch[2];
            return '<span class="blue">' + key + ': </span><span class="white">' + value + '</span>';
        }

        if (line.startsWith("You have bought a total of")) {
            const match = line.match(/^(You have bought a total of )(\d+)( items for )(\$\d+(?:,\d{3})*)( total\.)$/);
            if (match) {
                const [_, prefix, number, middle, amount, suffix] = match;
                return wrapSpan("white", prefix) + 
                       wrapSpan("white", number) + 
                       wrapSpan("white", middle) + 
                       wrapSpan("green", amount) + 
                       wrapSpan("white", suffix);
            }
        }

        if (line.startsWith("You have bought")) {
            const match = line.match(/^(You have bought )(X\d+)( PAYG Credit for )(\$\d+(?:,\d{3})*)(\.)$/i);
            if (match) {
                const [_, prefix, credit, middle, amount, suffix] = match;
                return wrapSpan("white", prefix) + 
                       wrapSpan("blue", credit + " PAYG Credit") + 
                       wrapSpan("white", " for ") + 
                       wrapSpan("green", amount) + 
                       wrapSpan("white", suffix);
            }
        }

        return null;
    }

    function formatLine(line) {
        const lowerLine = line.toLowerCase();

        if (line.includes("Equipped Weapons")) {
            return wrapSpan("green", line);
        }



        if (lowerLine.includes("was seized by")) {
            return wrapSpan("death", line);
        }

        if (line.match(/\|------ .+'s Items \d{2}\/[A-Z]{3}\/\d{4} - \d{2}:\d{2}:\d{2} ------\|/)) {
            return wrapSpan("green", line);
        }



        if (line.match(/^(?:\[\d{2}:\d{2}:\d{2}\]\s+)?\d+: .+/)) {
            if (line.includes("PH:")) {
                const phoneMatch = line.trim().match(/^(\d+: .+? x\d+ \(.+?\) -) (PH: \d+)$/);
                if (phoneMatch) {
                    const [_, itemPart, phonePart] = phoneMatch;
                    return wrapSpan("yellow", itemPart) + " " + wrapSpan("green", phonePart);
                }
            }

            if (line.includes("Money ($")) {
                const moneyMatch = line.match(/^(\d+: Money \()(\$\d+(?:,\d{3})*)(\) \(\d+g\))$/);
                if (moneyMatch) {
                    const [_, prefix, amount, suffix] = moneyMatch;
                    return wrapSpan("yellow", prefix) + wrapSpan("green", amount) + wrapSpan("yellow", suffix);
                }
            }
            return wrapSpan("yellow", line);
        }

        return replaceColorCodes(line);
    }

    function formatJailTime(line) {
        const pattern = /(You have) (.*?) (left in jail\.)/;
        const match = line.match(pattern);
        if (match) {
            return `<span class="white">${match[1]}</span> <span class="green">${match[2]}</span> <span class="white">${match[3]}</span>`;
        }
        return line;
    }

    function escapeHTML(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function wrapSpan(className, content) {
        // Normalize apostrophes and escape HTML to prevent tag injection
        content = escapeHTML(content.replace(/['''']/g, "'"));
        
        const tokens = content.split(/(\s+)/g);
        let html = '';
        let censoring = false;
        let censorBuffer = '';
        let visibleBuffer = '';

        const flushCensor = () => {
            if (censorBuffer.length > 0) {
                html += `<span class="hidden censored-content" data-original="${censorBuffer}">${censorBuffer}</span>`;
                censorBuffer = '';
            }
        };

        const flushVisible = () => {
            if (visibleBuffer.length > 0) {
                html += `<span class="${className} colorable">${visibleBuffer}</span>`;
                visibleBuffer = '';
            }
        };

        tokens.forEach(token => {
            if (token === '') return;
            if (/^\s+$/.test(token)) {
                // On whitespace, flush any visible buffer and pass whitespace through
                if (censoring) {
                    censorBuffer += token;
                } else {
                    flushVisible();
                    html += token;
                }
                return;
            }

            // Process non-whitespace token character-by-character to handle censorship toggles
            for (const char of token) {
                if (char === '÷') {
                    if (censoring) {
                        // closing delimiter
                        flushCensor();
                        censoring = false;
                    } else {
                        // opening delimiter
                        flushVisible();
                        censoring = true;
                    }
                } else if (censoring) {
                    censorBuffer += char;
                } else {
                    visibleBuffer += char;
                }
            }
            // At end of token (word), flush visible as a single word span
            if (!censoring) {
                flushVisible();
            }
        });

        if (censoring) {
            // unmatched delimiter, append as plain text
            html += censorBuffer;
        }

        return html;
    }

    function formatWeatherLine(line) {
        const weatherPattern = /^Temperature:\s*([\d.]+°C)\s*\(([\d.]+°?F)\),\s*it\s*is\s*currently\s*([^.]+)\.\s*Wind:\s*([\d.]+)\s*km\/h\s*\(([\d.]+)\s*mph\),\s*humidity:\s*([\d.]+%),\s*rain\s*precipitation:\s*([\d.]+)\s*mm\.\s*Current\s*time:\s*([\d\/A-Z\s-]+:\d{2}:\d{2}:\d{2})$/;
        
        const match = line.match(weatherPattern);
        if (match) {
            const [_, tempC, tempF, condition, windKmh, windMph, humidity, rain, time] = match;
            
            return wrapSpan("white", "Temperature: ") + 
                   wrapSpan("green", tempC) + " " + 
                   wrapSpan("white", "(") + 
                   wrapSpan("green", tempF) + 
                   wrapSpan("white", ")") + 
                   wrapSpan("white", ", it is currently ") + 
                   wrapSpan("green", condition) + 
                   wrapSpan("white", ". Wind: ") + 
                   wrapSpan("green", windKmh + " km/h") + 
                   " " + 
                   wrapSpan("white", "(") + 
                   wrapSpan("green", windMph + " mph") + 
                   wrapSpan("white", ")") + 
                   wrapSpan("white", ", humidity: ") + 
                   wrapSpan("green", humidity) + 
                   wrapSpan("white", ", rain precipitation: ") + 
                   wrapSpan("green", rain + " mm") + 
                   wrapSpan("white", ". Current time: ") + 
                   wrapSpan("white", time);
        }
        
        if (line.startsWith("Temperature:")) {
            const tempMatch = line.match(/^Temperature:\s*([\d.]+°C)\s*\(([\d.]+°?F)\),\s*it\s*is\s*currently\s*([^.]+)\.?$/);
            if (tempMatch) {
                const [_, tempC, tempF, condition] = tempMatch;
                return wrapSpan("white", "Temperature: ") + 
                       wrapSpan("green", tempC) + " " + 
                       wrapSpan("white", "(") + 
                       wrapSpan("green", tempF) + 
                       wrapSpan("white", ")") + 
                       wrapSpan("white", ", it is currently ") + 
                       wrapSpan("green", condition) + ".";
            }
            return wrapSpan("white", "Temperature: ") + 
                   wrapSpan("green", line.replace("Temperature:", "").trim());
        }
        
        if (line.startsWith("Wind:")) {
            const windMatch = line.match(/^Wind:\s*([\d.]+)\s*km\/h\s*\(([\d.]+)\s*mph\),\s*humidity:\s*([\d.]+%),\s*rain\s*precipitation:\s*([\d.]+)\s*mm\.?$/);
            if (windMatch) {
                const [_, windKmh, windMph, humidity, rain] = windMatch;
                return wrapSpan("white", "Wind: ") + 
                       wrapSpan("green", windKmh + " km/h") + 
                       " " + 
                       wrapSpan("white", "(") + 
                       wrapSpan("green", windMph + " mph") + 
                       wrapSpan("white", ")") + 
                       wrapSpan("white", ", humidity: ") + 
                       wrapSpan("green", humidity) + 
                       wrapSpan("white", ", rain precipitation: ") + 
                       wrapSpan("green", rain + " mm") + ".";
            }
            return wrapSpan("white", "Wind: ") + 
                   wrapSpan("green", line.replace("Wind:", "").trim());
        }
        
        if (line.startsWith("Current time:")) {
            return wrapSpan("white", "Current time: ") + 
                   wrapSpan("white", line.replace("Current time:", "").trim());
        }
        
        return null;
    }

    function isRadioLine(line) {
        return /\[S: \d+ \| CH: .+\]/.test(line);
    }

    function handleWhispers(line) {
        if (line.startsWith("(Car)")) {
            return wrapSpan("yellow", line);
        }

        const groupWhisperPattern = /^[A-Z][a-z]+\s[A-Z][a-z]+\swhispers to \d+\speople/i;
        const match = line.match(groupWhisperPattern);
        if (match) {
            const splitIndex = match.index + match[0].length;
            return `<span class="orange">${line.slice(0, splitIndex)}</span><span class="whisper">${line.slice(splitIndex)}</span>`;
        }

        return wrapSpan("whisper", line);
    }    

    function handleCellphone(line) {
        const hasExclamation = line.startsWith("!");
        const cleanLine = hasExclamation ? line.slice(1) : line;
        return wrapSpan(hasExclamation ? "yellow" : "white", cleanLine);
    }

    function handleGoods(line) {
        return wrapSpan(
            "yellow",
            line.replace(/(\$\d+)/, '<span class="green">$1</span>')
        );
    }

    function handleTransaction(line) {

        if (line.includes("/")) {
            line = line.replace(/\s*\(\d{2}\/[A-Z]{3}\/\d{4}\s+-\s+\d{2}:\d{2}:\d{2}\)\.?/, "");
            return wrapSpan("green", line + ".");
        }

        return wrapSpan("green", line);
    }

    function formatInfo(line) {
        const moneyMatch = line.match(/\$(\d+)/);
        const itemMatch = line.match(/took\s(.+?)\s\((\d+)\)\sfrom\s(the\s.+)\.$/i);

        if (moneyMatch) {
            const objectMatch = line.match(/from the (.+)\.$/i);
            return objectMatch ?
                `<span class="orange">Info:</span> <span class="white">You took</span> <span class="green">$${moneyMatch[1]}</span> <span class="white">from the ${objectMatch[1]}</span>.` :
                line;
        }

        if (itemMatch) {
            const itemName = itemMatch[1];
            const itemQuantity = itemMatch[2];
            const fromObject = itemMatch[3];

            return `<span class="orange">Info:</span> <span class="white">You took</span> <span class="white">${itemName}</span> <span class="white">(${itemQuantity})</span> <span class="white">from ${fromObject}</span>.`;
        }

        return line;
    }

    function formatSmsMessage(line) {
        // Match the pattern: (phone) Message from sender: content
        const match = line.match(/^\(([^)]+)\)\s+Message from ([^:]+):\s*(.+)$/);
        
        if (match) {
            const phone = match[1];
            const sender = match[2];
            const message = match[3];
            
            // Remove brackets only from the phone identifier, preserve them in the message
            const cleanPhone = phone.replace(/[\[\]]/g, '');
            
            return wrapSpan('yellow', `(${cleanPhone}) Message from ${sender}: ${message}`);
        }
        
        // Fallback: if pattern doesn't match, just remove brackets from the whole line
        line = line.replace(/[\[\]]/g, '');
        return wrapSpan('yellow', line);
    }

    function formatPhoneSet(line) {

        line = line.replace(/\[(?!INFO\])|\](?!)/g, '');

        line = line.replace('[INFO]', '<span class="green">[INFO]</span>');

        const infoTag = '<span class="green">[INFO]</span>';
        const restOfLine = line.replace(/\[INFO\]/, '').trim();
        return infoTag + ' <span class="white">' + restOfLine + '</span>';
    }

    function formatIncomingCall(line) {

        line = line.replace(/[\[\]]/g, '');

        const match = line.match(/\(([^)]+)\) Incoming call from (.+)\. Use (.+) to answer or (.+) to decline\./);
        if (match) {
            const parenthetical = match[1];
            const caller = match[2];
            const pickupCommand = match[3];
            const hangupCommand = match[4];

            return '<span class="yellow">(' + parenthetical + ')</span> <span class="white">Incoming call from </span><span class="yellow">' + caller + '</span><span class="white">. Use ' + pickupCommand + ' to answer or ' + hangupCommand + ' to decline.</span>';
        } else {
            return '<span class="white">' + line + '</span>';
        }
    }

    function colorInfoLine(line) {

        line = line.replace(/\[(?!INFO\])|(?<!INFO)\]/g, '');
        line = line.replace('[INFO]', '<span class="blue">[INFO]</span>');

        if (line.includes('You have received a contact')) {
            if (line.includes('/acceptnumber')) {
                return applyPhoneRequestFormatting(line);
            } else if (line.includes('/acceptcontact')) {
                return applyContactShareFormatting(line);
            }
        } else if (line.includes('You have shared your number with')) {
            return applyNumberShareFormatting(line);
        } else if (line.includes('You have shared')) {
            return applyContactSharedFormatting(line);
        }

        return '<span class="white">' + line + '</span>';
    }

    function applyPhoneRequestFormatting(line) {
        const pattern = /\[INFO\] You have received a contact \((.+), ([^\)]+)\) from (.+)\. Use (\/acceptnumber) to accept it\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const sender = match[3];
            const acceptCommand = match[4];

            return '<span class="blue">[INFO]</span> <span class="white">You have received a contact (' + contactName + ', ' + numbers + ') from ' + sender + '. Use ' + acceptCommand + ' to accept it.</span>';
        } else {
            return line;
        }
    }

    function applyContactShareFormatting(line) {
        const pattern = /\[INFO\] You have received a contact \((.+), ([^\)]+)\) from (.+)\. Use (\/acceptcontact) to accept it\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const sender = match[3];
            const acceptCommand = match[4];

            return '<span class="blue">[INFO]</span> <span class="white">You have received a contact (' + contactName + ', ' + numbers + ') from ' + sender + '. Use ' + acceptCommand + ' to accept it.</span>';
        } else {
            return line;
        }
    }

    function applyNumberShareFormatting(line) {
        const pattern = /\[INFO\] You have shared your number with (.+) under the name (.+)\./;

        const match = line.match(pattern);

        if (match) {
            const receiver = match[1];
            const name = match[2];

            return '<span class="blue">[INFO]</span> <span class="white">You have shared your number with ' + receiver + ' under the name ' + name + '.</span>';
        } else {
            return line;
        }
    }

    function applyContactSharedFormatting(line) {
        const pattern = /\[INFO\] You have shared (.+) \(([^\)]+)\) with (.+)\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const receiver = match[3];

            return '<span class="blue">[INFO]</span> <span class="white">You have shared ' + contactName + ' (' + numbers + ') with ' + receiver + '.</span>';
        } else {
            return line;
        }
    }

    function formatVesselTraffic(line) {
        const vesselTrafficPattern = /\*\*\s*\[CH: VTS - Vessel Traffic Service\]/;

        if (vesselTrafficPattern.test(line)) {
            return `<span class="vesseltraffic">${line}</span>`;
        }

        return line;
    }

    function formatIntercom(line) {
        return line.replace(
            /\[(.*?) intercom\]: (.*)/i,
            '<span class="blue">[$1 Intercom]: $2</span>'
        );
    }

    function formatPhoneCursor(line) {
        return '<span class="white">Use <span class="yellow">/phonecursor (/pc)</span> to activate the cursor to use the phone.</span>';
    }

    function formatShown(line) {
        return `<span class="green">${line.replace(
            /their (.+)\./,
            'their <span class="white">$1</span>.'
        )}</span>`;
    }

    function replaceColorCodes(str) {
        return str
            .replace(
                /\{([A-Fa-f0-9]{6})\}/g,
                (_match, p1) => '<span style="color: #' + p1 + ';">'
            )
            .replace(/\{\/([A-Fa-f0-9]{6})\}/g, "</span>");
    }

    function colorMoneyLine(line) {
        return line
            .replace(
                /You have received (\$\d+(?:,\d{3})*(?:\.\d{1,3})?)/,
                '<span class="white">You have received </span><span class="green">$1</span>'
            )
            .replace(
                /from (.+) on your bank account\./,
                '<span class="white">from </span><span class="white">$1</span><span class="white"> on your bank account.</span>'
            );
    }

    function colorLocationLine(line) {
        return line.replace(
            /(You received a location from) (#\d+)(. Use )(\/removelocation)( to delete the marker\.)/,
            '<span class="green">$1 </span>' +
            '<span class="yellow">$2</span>' +
            '<span class="green">$3</span>' +
            '<span class="death">$4</span>' +
            '<span class="green">$5</span>'
        );
    }

    function formatRobbery(line) {
        return line
            .replace(/\/arob/, '<span class="blue">/arob</span>')
            .replace(/\/report/, '<span class="death">/report</span>')
            .replace(/You're being robbed, use (.+?) to show your inventory/, '<span class="white">You\'re being robbed, use </span><span class="blue">$1</span><span class="white"> to show your inventory</span>');
    }

    function formatDrugLab() {
        return '<span class="orange">[DRUG LAB]</span> <span class="white">Drug production has started.</span>';
    }

    function formatCharacterKill(line) {
        return (
            '<span class="blue">[Character kill]</span> <span class="death">' +
            line.slice(16) +
            "</span>"
        );
    }

    function formatDrugCut(line) {
        const drugCutPattern = /You've cut (.+?) x(\d+) into x(\d+)\./i;
        const match = line.match(drugCutPattern);

        if (match) {
            const drugName = match[1];
            const firstAmount = match[2];
            const secondAmount = match[3];

            return (
                `<span class="white">You've cut </span>` +
                `<span class="blue">${drugName}</span>` +
                `<span class="blue"> x${firstAmount}</span>` +
                `<span class="white"> into </span><span class="blue">x${secondAmount}</span>` +
                `<span class="blue">.</span>`
            );
        }
        return line;
    }

    function formatPropertyRobbery(line) {
        const robberyPattern = /\[PROPERTY ROBBERY\](.*?)(\$[\d,]+)(.*)/;
        const match = line.match(robberyPattern);

        if (match) {
            const textBeforeAmount = match[1];
            const amount = match[2];
            const textAfterAmount = match[3];

            return `<span class="green">[PROPERTY ROBBERY]</span>${textBeforeAmount}<span class="green">${amount}</span>${textAfterAmount}`;
        }

        return line;
    }

    function formatDrugEffect(line) {
        const pattern = /You've just taken (.+?)! You will feel the effects of the drug soon\./;
        const match = line.match(pattern);

        if (match) {
            const drugName = match[1];
            return `<span class="white">You've just taken </span><span class="green">${drugName}</span><span class="white">! You will feel the effects of the drug soon.</span>`;
        }

        return line;
    }

    function formatPrisonPA(line) {
        const pattern = /^\*\* \[PRISON PA\].*\*\*$/;
        if (pattern.test(line)) {
            return `<span class="blue">${line}</span>`;
        }
        return line;
    }

    function formatCashTap(line) {
        if (line.includes("[CASHTAP]")) {
            return line.replace(
                /\[CASHTAP\]/g,
                '<span class="green">[CASHTAP]</span>'
            ).replace(
                /^(.*?)(<span class="green">\[CASHTAP\]<\/span>)(.*)$/,
                '<span class="white">$1</span>$2<span class="white">$3</span>'
            );
        }
        return line;
    }

    /**
     * Formats police MDC (Mobile Data Computer) messages with blue highlighting
     * @param {string} line - The line to format
     * @returns {string} The formatted line
     */
    function formatPoliceMDC(line) {
        if (line.includes("[POLICE MDC]")) {
            return line.replace(
                /\[POLICE MDC\]/g,
                '<span class="blue">[POLICE MDC]</span>'
            ).replace(
                /^(.*?)(<span class="blue">\[POLICE MDC\]<\/span>)(.*)$/,
                '<span class="white">$1</span>$2<span class="white">$3</span>'
            );
        }
        return line;
    }

    function formatCardReader(line) {
        const [prefix, rest] = line.split(":");
        const moneyMatch = rest.match(/\$\d+/);
        const money = moneyMatch ? moneyMatch[0] : "";

        if (line.includes("offers you a card reader")) {

            const nameEnd = rest.indexOf(" offers");
            const name = rest.substring(0, nameEnd);

            return wrapSpan("orange", "Info:") + wrapSpan("yellow", name) + rest.substring(nameEnd, rest.lastIndexOf(money)) + wrapSpan("green", money) + "!";
        }

        if (line.includes("swiped your card through the reader")) {

            const businessStart = rest.indexOf("reader of ") + "reader of ".length;
            const businessEnd = rest.indexOf(" for an amount");
            const business = rest.substring(businessStart, businessEnd);

            return wrapSpan("orange", "Info:") + rest.substring(0, businessStart) + wrapSpan("yellow", business) + " for an amount of " + wrapSpan("green", money) + "!";
        }

        if (line.includes("offered your card reader to")) {

            const nameStart = rest.indexOf("reader to ") + "reader to ".length;
            const nameEnd = rest.indexOf(" for an amount");
            const name = rest.substring(nameStart, nameEnd);

            return wrapSpan("orange", "Info:") + rest.substring(0, nameStart) + wrapSpan("yellow", name) + " for an amount of " + wrapSpan("green", money) + ". Wait for them to accept!";
        }

        if (line.includes("accepted the card payment of")) {

            const nameStart = rest.indexOf("payment of ") + "payment of ".length;
            const nameEnd = rest.indexOf(" for an amount");
            const name = rest.substring(nameStart, nameEnd);

            return wrapSpan("orange", "Info:") + rest.substring(0, nameStart) + wrapSpan("yellow", name) + " for an amount of " + wrapSpan("green", money) + "!";
        }
    }

    function addLineBreaksAndHandleSpans(text) {
        const maxLineLength = document.getElementById("lineLengthInput").value;
        const currentFontSize = parseInt($('#font-label').val()) || 12;
        let result = "";
        let currentLineLength = 0;
        const openSpans = [];

        // Calculate font size adjustment factor for better line breaking
        // This compensates for the fact that larger fonts take up more visual space
        // We use a dynamic calculation to handle unlimited font sizes
        let fontSizeAdjustment;
        if (currentFontSize <= 12) {
            fontSizeAdjustment = 1.0; // No adjustment needed for 12px and below
        } else {
            // Dynamic calculation for larger fonts
            // Use a logarithmic approach to handle very large font sizes gracefully
            fontSizeAdjustment = Math.max(0.3, Math.min(1.0, 12 / currentFontSize));
        }
        
        const adjustedMaxLineLength = Math.floor(maxLineLength * fontSizeAdjustment);
        


        function addLineBreak() {
            if (openSpans.length > 0) {
                // Close all open spans, insert a break, then reopen them
                for (let i = openSpans.length - 1; i >= 0; i--) {
                    result += "</span>";
                }
                result += "<br>";
                for (const span of openSpans) {
                    result += span;
                }
            } else {
                result += "<br>";
            }
            currentLineLength = 0;
        }

        for (let i = 0; i < text.length; i++) {
            if (text[i] === "<" && text.substr(i, 5) === "<span") {
                const spanEnd = text.indexOf(">", i);
                const spanTag = text.substring(i, spanEnd + 1);
                openSpans.push(spanTag);
                result += spanTag;
                i = spanEnd;
            } else if (text[i] === "<" && text.substr(i, 7) === "</span>") {
                result += "</span>";
                i += 6;
                openSpans.pop();
            } else if (text[i] === "<" && text.substr(i, 4) === "<br") {
                // Handle existing <br> tags
                const brEnd = text.indexOf(">", i);
                const brTag = text.substring(i, brEnd + 1);
                result += brTag;
                i = brEnd;
                currentLineLength = 0; // Reset line length after a break
            } else {
                result += text[i];
                currentLineLength++;

                if (currentLineLength >= adjustedMaxLineLength && text[i] === " ") {
                    addLineBreak();
                }
            }
        }

        return result;
    }

    function cleanUp() {
        $output.find(".generated").each(function() {
            let html = $(this).html();
            html = html.replace(/<br>\s*<br>/g, "<br>");
            html = html.replace(/^<br>|<br>$/g, "");
            html = html.replace(/<span[^>]*>\s*<\/span>/g, "");
            $(this).html(html);
        });
        applyStyles();
    }

    function applyStyles() {
        $(".generated:first").css({
            "margin-top": "0",
            "padding-top": "1px",
        });
        $(".generated:last").css({
            "padding-bottom": "1px",
            "margin-bottom": "0",
        });
        $(".generated").css("background-color", "transparent");

        if (applyBackground) {
            $(".generated").css("background-color", "#000000");
        }
    }

    function copyCensorChar() {

        if (typeof copyToClipboard === 'function') {
            copyToClipboard("÷", this);
        } else {

            const censorChar = "÷";
            try {

                const textarea = document.createElement('textarea');
                textarea.value = censorChar;

                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);

                textarea.focus();
                textarea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);

                if (successful) {
                    const $btn = $(this);
                    const originalBg = $btn.css("background-color");
                    const originalText = $btn.text();

                    $btn.css("background-color", "#a8f0c6").text("Copied!");

                    setTimeout(() => {
                        $btn.css("background-color", originalBg).text(originalText);
                    }, 800);
                }
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        }
    }

    processOutput(); 
});