$(document).ready(function() {
    /**
     * Chatlog Magician - Parser Module
     * Handles the parsing and formatting of chat logs
     */

    // State variables
    let applyBackground = false;
    let applyCensorship = false;
    let censorshipStyle = 'pixelated';
    let characterName = "";
    
    // Cache DOM elements
    const $textarea = $("#chatlogInput");
    const $output = $("#output");
    const $toggleBackgroundBtn = $("#toggleBackground");
    const $toggleCensorshipBtn = $("#toggleCensorship");
    const $toggleCensorshipStyleBtn = $("#toggleCensorshipStyle");
    const $censorCharButton = $("#censorCharButton");
    const $lineLengthInput = $("#lineLengthInput");
    const $characterNameInput = $("#characterNameInput");

    // Initialize event listeners
    $toggleBackgroundBtn.click(toggleBackground);
    $toggleCensorshipBtn.click(toggleCensorship);
    $toggleCensorshipStyleBtn.click(toggleCensorshipStyle);
    $censorCharButton.click(copyCensorChar);
    $lineLengthInput.on("input", processOutput);
    $characterNameInput.on("input", debounce(applyFilter, 300));
    $textarea.off("input").on("input", throttle(processOutput, 200));

    /**
     * Toggles the background of the output
     */
    function toggleBackground() {
        applyBackground = !applyBackground;
        $output.toggleClass("background-active", applyBackground);

        $toggleBackgroundBtn
            .toggleClass("btn-dark", applyBackground)
            .toggleClass("btn-outline-dark", !applyBackground);

        processOutput();
    }

    /**
     * Toggles censorship on/off
     */
    function toggleCensorship() {
        applyCensorship = !applyCensorship;
        $toggleCensorshipBtn
            .toggleClass("btn-dark", applyCensorship)
            .toggleClass("btn-outline-dark", !applyCensorship);
        processOutput();
    }

    /**
     * Toggles between censorship styles (pixelated/hidden)
     */
    function toggleCensorshipStyle() {
        censorshipStyle = (censorshipStyle === 'pixelated') ? 'hidden' : 'pixelated';
        $toggleCensorshipStyleBtn.text(`Censor Style: ${censorshipStyle.charAt(0).toUpperCase() + censorshipStyle.slice(1)}`);
        processOutput();
    }

    /**
     * Applies character name filter
     */
    function applyFilter() {
        characterName = $characterNameInput.val().toLowerCase();
        processOutput();
    }

    /**
     * Debounce function to limit the rate at which a function can fire
     * @param {Function} func - The function to debounce
     * @param {number} wait - The debounce delay in milliseconds
     * @returns {Function} - Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Throttle function to limit the rate at which a function can fire
     * @param {Function} func - The function to throttle
     * @param {number} limit - The throttle limit in milliseconds
     * @returns {Function} - Throttled function
     */
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

    /**
     * Replaces dashes with em dashes
     * @param {string} text - The text to process
     * @returns {string} - Processed text
     */
    function replaceDashes(text) {
        return text.replace(/(\.{2,3}-|-\.{2,3})/g, '—');
    }

    /**
     * Main function to process and format the chat log
     */
    function processOutput() {
        const chatText = $textarea.val();
        const chatLines = chatText.split("\n")
                                  .map(removeTimestamps)
                                  .map(replaceDashes);
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();

        chatLines.forEach((line) => {
            const div = document.createElement("div");
            div.className = "generated";

            let formattedLine = formatLineWithFilter(line);

            // Apply user-based censorship
            formattedLine = applyUserCensorship(formattedLine);

            // Color [!] after all other formatting
            if (line.includes("[!]")) {
                formattedLine = formattedLine.replace(/\[!\]/g, '<span class="toyou">[!]</span>');
            }

            div.innerHTML = addLineBreaksAndHandleSpans(formattedLine);
            fragment.appendChild(div);

            const clearDiv = document.createElement("div");
            clearDiv.className = "clear";
            fragment.appendChild(clearDiv);
        });

        // Update DOM once with all changes
        $output.html('');
        $output.append(fragment);
        cleanUp();
    }

    /**
     * Applies user-defined censorship to text
     * @param {string} line - The line to censor
     * @returns {string} - Censored line
     */
    function applyUserCensorship(line) {
        return line.replace(/÷(.*?)÷/g, (match, p1) => `<span class="${censorshipStyle}">${p1}</span>`);
    }

    /**
     * Removes timestamps from lines
     * @param {string} line - The line to process
     * @returns {string} - Line without timestamps
     */
    function removeTimestamps(line) {
        return line.replace(/\[\d{2}:\d{2}:\d{2}\] /g, "").trim();
    }

    /**
     * Formats a line with filters applied
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatLineWithFilter(line) {
        // Handle attempt messages first (before any other patterns)
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

        // Handle [INFO] date messages before other patterns
        if (line.startsWith("[INFO]:") && line.includes("[") && line.includes("/")) {
            const match = line.match(/^(\[INFO\]:)\s*(\[\d{2}\/[A-Z]{3}\/\d{4}\])\s*(.+)$/);
            if (match) {
                const [_, info, date, message] = match;
                return wrapSpan("blue", info) + " " + wrapSpan("orange", date) + " " + wrapSpan("white", message);
            }
        }

        // Handle property money collection/addition
        if (line.startsWith("You collected") || line.startsWith("You added")) {
            const match = line.match(/^(You (?:collected|added) )(\$\d+(?:,\d{3})*)((?:\s+from|\s+in) the property\.)$/);
            if (match) {
                const [_, prefix, amount, suffix] = match;
                return wrapSpan("white", prefix) + wrapSpan("green", amount) + wrapSpan("white", suffix);
            }
        }

        // Handle interview lines
        if (line.startsWith("[INTERVIEW]")) {
            return wrapSpan("green", line);
        }

        // Handle bank withdrawals (with dot)
        if (line.startsWith("You have withdrawn")) {
            const match = line.match(/^You have withdrawn \$\d+(?:,\d{3})*\.?$/);
            if (match) {
                return wrapSpan("green", line.endsWith(".") ? line : line + ".");
            }
        }

        // Handle bank deposits (add missing dot)
        if (line.startsWith("You have deposited")) {
            const match = line.match(/^You have deposited \$\d+(?:,\d{3})*\.?$/);
            if (match) {
                return wrapSpan("green", line.endsWith(".") ? line : line + ".");
            }
        }

        // Check for car whispers first
        if (line.startsWith("(Car)")) {
            return wrapSpan("yellow", line);
        }

        const lowerLine = line.toLowerCase();
        const toSectionPattern = /\(to [^)]+\)/i;
        const lineWithoutToSection = line.replace(toSectionPattern, "");

        // Check if the line is someone speaking to the character
        const speakingToPattern = new RegExp(`says \\(to ${characterName}\\):`, 'i');
        const isSpeakingToCharacter = characterName && speakingToPattern.test(line);

        if (isRadioLine(line)) {
            if (!characterName) {
                return wrapSpan("radioColor", line);
            }
            // Check if line starts with character name
            const startsWithCharName = new RegExp(`^${characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line);
            return startsWithCharName ?
                wrapSpan("radioColor", line) :
                wrapSpan("radioColor2", line);
        }

        if (lowerLine.includes("says [lower]")) {
            if (!characterName) {
                return wrapSpan("darkgrey", line);
            }
            
            // Check if line starts with character name
            const startsWithCharName = new RegExp(`^${characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line);
            return startsWithCharName ?
                wrapSpan("grey", line) :
                wrapSpan("darkgrey", line);
        }

        if (lowerLine.includes("says [low]")) {
            if (!characterName) {
                return wrapSpan("grey", line);
            }
            
            // Check if line starts with character name
            const startsWithCharName = new RegExp(`^${characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line);
            return startsWithCharName ?
                wrapSpan("lightgrey", line) :
                wrapSpan("grey", line);
        }

        if (lowerLine.includes("says:") || lowerLine.includes("shouts:")) {
            if (!characterName) {
                return wrapSpan("white", line);
            }
            
            // Check if line starts with character name (speaking)
            const startsWithCharName = new RegExp(`^${characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line);
            
            return startsWithCharName ?
                wrapSpan("white", line) :
                wrapSpan("lightgrey", line);
        }

        if (line.startsWith("you were frisked by")) {
            return wrapSpan("green", line);
        }

        // Description styling
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

        // [CASHTAP] messages
        if (line.startsWith("[CASHTAP]")) {
            const parts = line.split("[CASHTAP]");
            return wrapSpan("green", "[CASHTAP]") + wrapSpan("white", parts[1]);
        }

        if (line.match(/\|------ .+'s Items \d{2}\/[A-Z]{3}\/\d{4} - \d{2}:\d{2}:\d{2} ------\|/)) {
            return wrapSpan("green", line);
        }

        if (line.match(/^(?:\[\d{2}:\d{2}:\d{2}\]\s+)?\d+: .+/)) {
            // Skip phone number items, let formatLine handle them
            if (line.includes("PH:")) {
                return formatLine(line);
            }
            // Handle money items
            if (line.includes("Money ($")) {
                return formatLine(line);
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

        const emergencyCallPattern = /^(Log Number|Phone Number|Location|Situation):\s*(.*)$/;

        const match = line.match(emergencyCallPattern);

        if (match) {
            const key = match[1];
            const value = match[2];
            return '<span class="blue">' + key + ': </span><span class="white">' + value + '</span>';
        }
        if (/^\*\* \[PRISON PA\].*\*\*$/.test(line)) {
            return formatPrisonPA(line);
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

        // Handle microphone messages
        if (line.includes("[Microphone]:")) {
            return wrapSpan("yellow", line);
        }

        // Handle injuries header
        if (line === "Injuries:") {
            return wrapSpan("blue", line);
        }

        // Handle street names
        if (line.includes("[STREET]")) {
            if (line.includes(" / ")) {
                // Handle intersection of two streets
                const parts = line.match(/\[STREET\] Street name: (.+?) \/ (.+?) \| Zone: ([^.]+)(\.)/);
                if (parts) {
                    const [_, street1, street2, zone, dot] = parts;
                    return `${wrapSpan("blue", "[STREET]")} Street name: ${wrapSpan("orange", street1)} / ${wrapSpan("orange", street2)} | Zone: ${wrapSpan("orange", zone)}${dot}`;
                }
            } else {
                // Handle single street
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
        if (lowerLine.includes("from the property")) return wrapSpan("death", line);
        if (lowerLine.startsWith("you dropped")) return wrapSpan("death", line);
        if (lowerLine.startsWith("use /phonecursor")) return formatPhoneCursor(line);
        if (lowerLine.includes("has shown you their")) return formatShown(line);
        if (
            lowerLine.includes("you have successfully sent your current location")
        )
            return wrapSpan("green", line);
        if (lowerLine.includes("you received a location from"))
            return colorLocationLine(line);
        if (
            lowerLine.includes("you gave") ||
            lowerLine.includes("paid you") ||
            lowerLine.includes("you paid") ||
            lowerLine.includes("you received")
        )
            return handleTransaction(line);
        if (lowerLine.includes("you are now masked")) return wrapSpan("green", line);
        if (lowerLine.includes("you have shown your inventory")) return wrapSpan("green", line);
        if (lowerLine.includes("you are not masked anymore")) return wrapSpan("death", line);
        if (lowerLine.includes("you're being robbed, use /arob")) return formatRobbery(line);

        // Faction messages
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
        if (
            lowerLine.includes("(goods)") ||
            lowerLine.match(/(.+?)\s+x(\d+)\s+\((\d+g)\)/)
        )
            return handleGoods(line);
        return formatLine(line);
    }

    /**
     * Checks if a line is a radio line
     * @param {string} line - The line to check
     * @returns {boolean} - True if the line is a radio line, false otherwise
     */
    function isRadioLine(line) {
        return /\[S: \d+ \| CH: .+\]/.test(line);
    }

    /**
     * Formats a line
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatLine(line) {
        const lowerLine = line.toLowerCase();

        if (line.includes("Equipped Weapons")) {
            return wrapSpan("green", line);
        }

        // Handle money items first
        if (line.includes("Money ($")) {
            const moneyMatch = line.match(/^(\d+: Money \()(\$\d+(?:,\d{3})*)(\) \(\d+g\))$/);
            if (moneyMatch) {
                const [_, prefix, amount, suffix] = moneyMatch;
                return wrapSpan("yellow", prefix + wrapSpan("green", amount) + suffix);
            }
        }

        if (lowerLine.startsWith("you've used")) {
            return wrapSpan("green", line);
        }

        if (lowerLine.includes("was seized by")) {
            return wrapSpan("death", line);
        }

        if (lowerLine.startsWith("you were frisked by")) {
            return wrapSpan("green", line);
        }

        // Inventory header pattern
        if (line.match(/\|------ .+'s Items \d{2}\/[A-Z]{3}\/\d{4} - \d{2}:\d{2}:\d{2} ------\|/)) {
            return wrapSpan("green", line);
        }

        // Equipped weapons header pattern
        if (line.match(/\|------ .+'s Equipped Weapons ------\|/)) {
            return wrapSpan("green", line);
        }

        // Inventory item with phone number
        const phoneMatch = line.trim().match(/^(\d+: .+? x\d+ \(.+?\) -) (PH: \d+)$/);
        if (phoneMatch) {
            const [_, itemPart, phonePart] = phoneMatch;
            return wrapSpan("yellow", itemPart) + " " + wrapSpan("green", phonePart);
        }

        // Regular inventory item (with or without timestamp)
        if (line.match(/^(?:\[\d{2}:\d{2}:\d{2}\]\s+)?\d+: .+/)) {
            // Skip phone number items, let formatLine handle them
            if (line.includes("PH:")) {
                return formatLine(line);
            }
            // Handle money items
            if (line.includes("Money ($")) {
                const moneyMatch = line.match(/^(\d+: Money \()(\$\d+(?:,\d{3})*)(\) \(\d+g\))$/);
                if (moneyMatch) {
                    const [_, prefix, amount, suffix] = moneyMatch;
                    return wrapSpan("yellow", prefix + wrapSpan("green", amount) + suffix);
                }
            }
            return wrapSpan("yellow", line);
        }

        // Total weight line
        if (lowerLine.startsWith("total weight:")) {
            return wrapSpan("yellow", line);
        }

        if (lowerLine.startsWith("money on hand:")) {
            return wrapSpan("green", line);
        }

        if (lowerLine.includes("left in jail")) {
            return formatJailTime(line);
        }

        return replaceColorCodes(line);
    }

    /**
     * Formats jail time
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatJailTime(line) {
        const pattern = /(You have) (.*?) (left in jail\.)/;
        const match = line.match(pattern);
        if (match) {
            return `<span class="white">${match[1]}</span> <span class="green">${match[2]}</span> <span class="white">${match[3]}</span>`;
        }
        return line;
    }

    /**
     * Wraps a span around a piece of text
     * @param {string} className - The class name for the span
     * @param {string} content - The content to wrap
     * @returns {string} - Wrapped content
     */
    function wrapSpan(className, content) {
        return `<span class="${className}">${content}</span>`;
    }

    /**
     * Handles whispers
     * @param {string} line - The line to handle
     * @returns {string} - Handled line
     */
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

    /**
     * Handles cellphone lines
     * @param {string} line - The line to handle
     * @returns {string} - Handled line
     */
    function handleCellphone(line) {
        const hasExclamation = line.startsWith("!");
        const cleanLine = hasExclamation ? line.slice(1) : line;
        return wrapSpan(hasExclamation ? "yellow" : "white", cleanLine);
    }

    /**
     * Handles goods
     * @param {string} line - The line to handle
     * @returns {string} - Handled line
     */
    function handleGoods(line) {
        return wrapSpan(
            "yellow",
            line.replace(/(\$\d+)/, '<span class="green">$1</span>')
        );
    }

    /**
     * Handles transactions
     * @param {string} line - The line to handle
     * @returns {string} - Handled line
     */
    function handleTransaction(line) {
        // If it's a date format, remove it and add dot
        if (line.includes("/")) {
            line = line.replace(/\s*\(\d{2}\/[A-Z]{3}\/\d{4}\s+-\s+\d{2}:\d{2}:\d{2}\)\.?/, "");
            return wrapSpan("green", line + ".");
        }
        // Otherwise just return the line as is (it already has a dot)
        return wrapSpan("green", line);
    }

    /**
     * Formats info lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
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

    /**
     * Formats SMS messages
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatSmsMessage(line) {
        // Remove any square brackets
        line = line.replace(/[\[\]]/g, '');
        // Wrap the entire line in yellow
        return wrapSpan('yellow', line);
    }

    /**
     * Formats phone set lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatPhoneSet(line) {
        // Remove any square brackets except for [INFO]
        line = line.replace(/\[(?!INFO\])|\](?!)/g, '');
        // Replace [INFO] with green
        line = line.replace('[INFO]', '<span class="green">[INFO]</span>');
        // The rest is white
        const infoTag = '<span class="green">[INFO]</span>';
        const restOfLine = line.replace(/\[INFO\]/, '').trim();
        return infoTag + ' <span class="white">' + restOfLine + '</span>';
    }

    /**
     * Formats incoming call lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatIncomingCall(line) {
        // Remove any square brackets
        line = line.replace(/[\[\]]/g, '');

        // Extract the (anything here)
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

    /**
     * Formats info lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function colorInfoLine(line) {
        // For non-date [INFO] messages
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

    /**
     * Applies phone request formatting
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
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

    /**
     * Applies contact share formatting
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
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

    /**
     * Applies number share formatting
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
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

    /**
     * Applies contact shared formatting
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
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

    /**
     * Formats vessel traffic lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatVesselTraffic(line) {
        const vesselTrafficPattern = /\*\*\s*\[CH: VTS - Vessel Traffic Service\]/;

        if (vesselTrafficPattern.test(line)) {
            return `<span class="vesseltraffic">${line}</span>`;
        }

        return line;
    }

    /**
     * Formats intercom lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatIntercom(line) {
        return line.replace(
            /\[(.*?) intercom\]: (.*)/i,
            '<span class="blue">[$1 Intercom]: $2</span>'
        );
    }

    /**
     * Formats phone cursor lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatPhoneCursor(line) {
        return '<span class="white">Use <span class="yellow">/phonecursor (/pc)</span> to activate the cursor to use the phone.</span>';
    }

    /**
     * Formats shown lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatShown(line) {
        return `<span class="green">${line.replace(
            /their (.+)\./,
            'their <span class="white">$1</span>.'
        )}</span>`;
    }

    /**
     * Replaces color codes
     * @param {string} str - The string to replace color codes in
     * @returns {string} - String with color codes replaced
     */
    function replaceColorCodes(str) {
        return str
            .replace(
                /\{([A-Fa-f0-9]{6})\}/g,
                (_match, p1) => '<span style="color: #' + p1 + ';">'
            )
            .replace(/\{\/([A-Fa-f0-9]{6})\}/g, "</span>");
    }

    /**
     * Colors money lines
     * @param {string} line - The line to color
     * @returns {string} - Colored line
     */
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

    /**
     * Colors location lines
     * @param {string} line - The line to color
     * @returns {string} - Colored line
     */
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

    /**
     * Formats robbery lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatRobbery(line) {
        return line
            .replace(/\/arob/, '<span class="blue">/arob</span>')
            .replace(/\/report/, '<span class="death">/report</span>')
            .replace(/You're being robbed, use (.+?) to show your inventory/, '<span class="white">You\'re being robbed, use </span><span class="blue">$1</span><span class="white"> to show your inventory</span>');
    }

    /**
     * Formats drug lab lines
     * @returns {string} - Formatted line
     */
    function formatDrugLab() {
        return '<span class="orange">[DRUG LAB]</span> <span class="white">Drug production has started.</span>';
    }

    /**
     * Formats character kill lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatCharacterKill(line) {
        return (
            '<span class="blue">[Character kill]</span> <span class="death">' +
            line.slice(16) +
            "</span>"
        );
    }

    /**
     * Formats drug cut lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
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

    /**
     * Formats property robbery lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
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

    /**
     * Formats drug effect lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatDrugEffect(line) {
        const pattern = /You've just taken (.+?)! You will feel the effects of the drug soon\./;
        const match = line.match(pattern);
    
        if (match) {
            const drugName = match[1];
            return `<span class="white">You've just taken </span><span class="green">${drugName}</span><span class="white">! You will feel the effects of the drug soon.</span>`;
        }
    
        return line;
    }

    /**
     * Formats prison PA lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatPrisonPA(line) {
        const pattern = /^\*\* \[PRISON PA\].*\*\*$/;
        if (pattern.test(line)) {
            return `<span class="blue">${line}</span>`;
        }
        return line;
    }

    /**
     * Formats cash tap lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
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
     * Formats card reader lines
     * @param {string} line - The line to format
     * @returns {string} - Formatted line
     */
    function formatCardReader(line) {
        const [prefix, rest] = line.split(":");
        const moneyMatch = rest.match(/\$\d+/);
        const money = moneyMatch ? moneyMatch[0] : "";
        
        if (line.includes("offers you a card reader")) {
            // Info:Evelyn Schmidt offers you a card reader for the business Evelyn's Elegance Emporio, the display reads $35000!
            const nameEnd = rest.indexOf(" offers");
            const name = rest.substring(0, nameEnd);
            
            return wrapSpan("orange", "Info:") + wrapSpan("yellow", name) + rest.substring(nameEnd, rest.lastIndexOf(money)) + wrapSpan("green", money) + "!";
        }
        
        if (line.includes("swiped your card through the reader")) {
            // Info: You swiped your card through the reader of Evelyn's Elegance Emporio for an amount of $35000!
            const businessStart = rest.indexOf("reader of ") + "reader of ".length;
            const businessEnd = rest.indexOf(" for an amount");
            const business = rest.substring(businessStart, businessEnd);
            
            return wrapSpan("orange", "Info:") + rest.substring(0, businessStart) + wrapSpan("yellow", business) + " for an amount of " + wrapSpan("green", money) + "!";
        }
        
        if (line.includes("offered your card reader to")) {
            // Info: You offered your card reader to Ryan Bellmont for an amount of $24440. Wait for them to accept!
            const nameStart = rest.indexOf("reader to ") + "reader to ".length;
            const nameEnd = rest.indexOf(" for an amount");
            const name = rest.substring(nameStart, nameEnd);
            
            return wrapSpan("orange", "Info:") + rest.substring(0, nameStart) + wrapSpan("yellow", name) + " for an amount of " + wrapSpan("green", money) + ". Wait for them to accept!";
        }
        
        if (line.includes("accepted the card payment of")) {
            // Info: You accepted the card payment of Ryan Bellmont for an amount of $24440!
            const nameStart = rest.indexOf("payment of ") + "payment of ".length;
            const nameEnd = rest.indexOf(" for an amount");
            const name = rest.substring(nameStart, nameEnd);
            
            return wrapSpan("orange", "Info:") + rest.substring(0, nameStart) + wrapSpan("yellow", name) + " for an amount of " + wrapSpan("green", money) + "!";
        }
    }

    /**
     * Adds line breaks and handles spans
     * @param {string} text - The text to process
     * @returns {string} - Processed text
     */
    function addLineBreaksAndHandleSpans(text) {
        const maxLineLength = document.getElementById("lineLengthInput").value;
        let result = "";
        let currentLineLength = 0;
        let inSpan = false;
        let currentSpan = "";

        function addLineBreak() {
            if (inSpan) {
                const spanClassMatch = currentSpan.match(/class="([^"]+)"/);
                const spanClass = spanClassMatch ? spanClassMatch[1] : "";
                result += `</span><br><span class="${spanClass}">`;
            } else {
                result += "<br>";
            }
            currentLineLength = 0;
        }

        for (let i = 0; i < text.length; i++) {
            if (text[i] === "<" && text.substr(i, 5) === "<span") {
                let spanEnd = text.indexOf(">", i);
                currentSpan = text.substring(i, spanEnd + 1);
                i = spanEnd;
                inSpan = true;
                result += currentSpan;
            } else if (text[i] === "<" && text.substr(i, 7) === "</span>") {
                inSpan = false;
                result += "</span>";
                i += 6;
            } else {
                result += text[i];
                currentLineLength++;

                if (currentLineLength >= maxLineLength && text[i] === " ") {
                    addLineBreak();
                }
            }
        }

        return result;
    }

    /**
     * Cleans up the output
     */
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

    /**
     * Applies styles to the output
     */
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

    /**
     * Copies the censor character to clipboard
     * Uses the improved copyToClipboard function from app.js
     */
    function copyCensorChar() {
        // Use the improved copyToClipboard function from app.js
        if (typeof copyToClipboard === 'function') {
            copyToClipboard("÷", this);
        } else {
            // Fallback if copyToClipboard is not available
            const censorChar = "÷";
            try {
                // Create a temporary textarea element
                const textarea = document.createElement('textarea');
                textarea.value = censorChar;
                
                // Make it invisible but part of the document
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                
                // Select and copy
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

    // Initialize
    processOutput();
});