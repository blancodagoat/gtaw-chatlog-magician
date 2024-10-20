$(document).ready(function() {
    let applyBackground = false;
    let applyCensorship = false;
    let censorshipStyle = 'pixelated';
    let characterName = "";
    const $textarea = $("#chatlogInput");
    const $output = $("#output");
    const $toggleBackgroundBtn = $("#toggleBackground");
    const $toggleCensorshipBtn = $("#toggleCensorship");
    const $toggleCensorshipStyleBtn = $("#toggleCensorshipStyle");

    $toggleBackgroundBtn.click(toggleBackground);
    $toggleCensorshipBtn.click(toggleCensorship);
    $toggleCensorshipStyleBtn.click(toggleCensorshipStyle);

    // Add listener for lineLengthInput within the existing ready function
    $("#lineLengthInput").on("input", processOutput);

    $("#characterNameInput").on("input", debounce(applyFilter, 300));

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

    function toggleCensorshipStyle() {
        censorshipStyle = (censorshipStyle === 'pixelated') ? 'hidden' : 'pixelated';
        $toggleCensorshipStyleBtn.text(`Censor Style: ${censorshipStyle.charAt(0).toUpperCase() + censorshipStyle.slice(1)}`);
        processOutput();
    }

    function applyFilter() {
        characterName = $("#characterNameInput").val().toLowerCase();
        processOutput();
    }

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

    $textarea.off("input").on("input", throttle(processOutput, 200));

    function replaceDashes(text) {
        return text.replace(/(\.{2,3}-|-\.{2,3})/g, '—');
    }

    function processOutput() {
        const chatText = $textarea.val();
        const chatLines = chatText.split("\n")
                                  .map(removeTimestamps)
                                  .map(replaceDashes); // Apply dash replacement
        let fragment = document.createDocumentFragment();

        chatLines.forEach((line) => {
            const div = document.createElement("div");
            div.className = "generated";

            let formattedLine = formatLineWithFilter(line);

            if (applyCensorship) {
                formattedLine = applyCensorshipToLine(formattedLine, line);
            }

            div.innerHTML = addLineBreaksAndHandleSpans(formattedLine);
            fragment.appendChild(div);

            const clearDiv = document.createElement("div");
            clearDiv.className = "clear";
            fragment.appendChild(clearDiv);
        });

        $output.html('');
        $output.append(fragment);
        cleanUp();
    }

    function applyCensorshipToLine(formattedLine, originalLine) {
        const exclusionPatterns = [
            /\[S:\s*\d+\s*\|\s*CH:.*\]/,
            /\[\d{2}\/[A-Z]{3}\/\d{4}\]/,
            /intercom/i
        ];

        if (exclusionPatterns.some((pattern) => pattern.test(originalLine))) {
            return formattedLine;
        }

        const censorshipRules = [{
                regex: /(?<!K)\$\d+(?:,\d{3})*\.\d{1,3}/g,
                replacement: (match) => `<span class="${censorshipStyle}">${match}</span>`
            },
            {
                regex: /(?<!K)\[\$\d+(?:,\d{3})*\.\d{1,3}\]/g,
                replacement: (match) => `<span class="${censorshipStyle}">${match}</span>`
            },
            {
                regex: /(?<!K)\$\d+(?:,\d{3})*(?:\.\d{1,3})?/g,
                replacement: (match) => `<span class="${censorshipStyle}">${match}</span>`
            },
            {
                regex: /(?<!K)\(\d+(g)?\)/g,
                replacement: (match) => `<span class="${censorshipStyle}">${match}</span>`
            },
            {
                regex: /(?<!K)(?<!<span class="me">[^<]*\s)\d+(?=\s[a-zA-Z]+\b)/g,
                replacement: (match) => `<span class="${censorshipStyle}">${match}</span>`
            },
            {
                regex: /(?<!K)#\d+/g,
                replacement: (match) => `<span class="${censorshipStyle}">${match}</span>`
            },
            {
                regex: /(?<!K)\[#\d+\]/g,
                replacement: (match) => `<span class="${censorshipStyle}">[#${match.match(/#\d+/)[0].slice(1)}]</span>`
            },
            {
                regex: /(?<!K)(?=.*<span class="blue">)x(\d+)/g,
                replacement: (_match, p1) => `x<span class="${censorshipStyle}">${p1}</span>`
            }
        ];

        let censoredLine = formattedLine;
        censorshipRules.forEach(rule => {
            censoredLine = censoredLine.replace(rule.regex, rule.replacement);
        });

        return censoredLine;
    }

    function removeTimestamps(line) {
        return line.replace(/\[\d{2}:\d{2}:\d{2}\] /g, "");
    }

    function formatLineWithFilter(line) {
        const lowerLine = line.toLowerCase();
        const toSectionPattern = /\(to [^)]+\)/i;
        const lineWithoutToSection = line.replace(toSectionPattern, "");

        if (isRadioLine(line)) {
            if (!characterName) {
                return wrapSpan("radioColor", line);
            }
            return lineWithoutToSection.toLowerCase().includes(characterName) ?
                wrapSpan("radioColor", line) :
                wrapSpan("radioColor2", line);
        }

        if (lowerLine.includes("says [lower]")) {
            if (!characterName) {
                return wrapSpan("darkgrey", line);
            }
            return lineWithoutToSection.toLowerCase().includes(characterName) ?
                wrapSpan("grey", line) :
                wrapSpan("darkgrey", line);
        }

        if (lowerLine.includes("says [low]")) {
            if (!characterName) {
                return wrapSpan("grey", line);
            }
            return lineWithoutToSection.toLowerCase().includes(characterName) ?
                wrapSpan("lightgrey", line) :
                wrapSpan("grey", line);
        }

        if (lowerLine.includes("says:") || lowerLine.includes("shouts:")) {
            if (!characterName) {
                return wrapSpan("white", line);
            }
            return lineWithoutToSection.toLowerCase().includes(characterName) ?
                wrapSpan("white", line) :
                wrapSpan("lightgrey", line);
        }

        return formatLine(line);
    }

    function isRadioLine(line) {
        return /\[S: \d+ \| CH: .+\]/.test(line);
    }

    function formatLine(line) {
        const lowerLine = line.toLowerCase();

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
        if (lowerLine.includes("whispers:")) return handleWhispers(line);
        if (lowerLine.includes("says (phone):")) return handleCellphone(line);
        if (
            lowerLine.includes("(goods)") ||
            lowerLine.match(/(.+?)\s+x(\d+)\s+\((\d+g)\)/)
        )
            return handleGoods(line);
        if (lowerLine.includes("[megaphone]:")) return wrapSpan("yellow", line);
        if (lowerLine.startsWith("info:")) return formatInfo(line);
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
        if (lowerLine.startsWith("you've cut")) return formatDrugCut(line);
        if (lowerLine.includes("[property robbery]")) return formatPropertyRobbery(line);
        if (/You've just taken .+?! You will feel the effects of the drug soon\./.test(line)) {
            return formatDrugEffect(line);
        }
        if (line.includes("[CASHTAP]")) {
            return formatCashTap(line);
        }
        return replaceColorCodes(line);
    }

    function wrapSpan(className, content) {
        return `<span class="${className}">${content}</span>`;
    }

    function handleWhispers(line) {
        return line.startsWith("(Car)") ?
            wrapSpan("yellow", line) :
            wrapSpan("whisper", line);
    }

    function handleCellphone(line) {
        return line.startsWith("!") ?
            wrapSpan('yellow', line.slice(1)) :
            wrapSpan("white", line);
    }

    function handleGoods(line) {
        return wrapSpan(
            "yellow",
            line.replace(/(\$\d+)/, '<span class="green">$1</span>')
        );
    }

    function handleTransaction(line) {
        return (
            '<span class="green">' +
            line.replace(/(\$\d+(?:,\d{3})*(?:\.\d{1,3})?)/g, '<span class="green">$1</span>') +
            "</span>"
        );
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
        // Remove any square brackets
        line = line.replace(/[\[\]]/g, '');
        // Wrap the entire line in yellow
        return wrapSpan('yellow', line);
    }

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
            // If it doesn't match, just remove square brackets and wrap in white
            return '<span class="white">' + line + '</span>';
        }
    }

    function colorInfoLine(line) {
        // Check if line matches [INFO]: [date] message
        const datePattern = /\[INFO\]:\s*\[\d{2}\/[A-Z]{3}\/\d{4}\]\s.+/;
        if (datePattern.test(line)) {
            return applyDatePattern(line);
        }

        // Remove any square brackets except [INFO]
        line = line.replace(/\[(?!INFO\])|\](?!)/g, '');
        line = line.replace('[INFO]', '<span class="green">[INFO]</span>');

        // Now, check for different patterns
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
        } else {
            // The rest is white
            return '<span class="white">' + line + '</span>';
        }
    }

    function applyDatePattern(line) {
        return line.replace(
            /\[INFO\]:\s*(\[\d{2}\/[A-Z]{3}\/\d{4}\])\s(.+)/,
            '<span class="blue">[INFO]:</span> <span class="orange">$1</span> <span class="white">$2</span>'
        );
    }

    function applyPhoneRequestFormatting(line) {
        // Pattern: [INFO] You have received a contact ([anything here], [numbers here]) from [anything here]. Use /acceptnumber to accept it.
        const pattern = /\[INFO\] You have received a contact \((.+), ([^\)]+)\) from (.+)\. Use (\/acceptnumber) to accept it\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const sender = match[3];
            const acceptCommand = match[4];

            return '<span class="green">[INFO]</span> <span class="white">You have received a contact (' + contactName + ', ' + numbers + ') from ' + sender + '. Use ' + acceptCommand + ' to accept it.</span>';
        } else {
            // If no match, just return line
            return line;
        }
    }

    function applyContactShareFormatting(line) {
        // Pattern: [INFO] You have received a contact ([anything here], [numbers here]) from [anything here]. Use /acceptcontact to accept it.
        const pattern = /\[INFO\] You have received a contact \((.+), ([^\)]+)\) from (.+)\. Use (\/acceptcontact) to accept it\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const sender = match[3];
            const acceptCommand = match[4];

            return '<span class="green">[INFO]</span> <span class="white">You have received a contact (' + contactName + ', ' + numbers + ') from ' + sender + '. Use ' + acceptCommand + ' to accept it.</span>';
        } else {
            // If no match, just return line
            return line;
        }
    }

    function applyNumberShareFormatting(line) {
        // Pattern: [INFO] You have shared your number with [anything here] under the name [anything here].
        const pattern = /\[INFO\] You have shared your number with (.+) under the name (.+)\./;

        const match = line.match(pattern);

        if (match) {
            const receiver = match[1];
            const name = match[2];

            return '<span class="green">[INFO]</span> <span class="white">You have shared your number with ' + receiver + ' under the name ' + name + '.</span>';
        } else {
            return line;
        }
    }

    function applyContactSharedFormatting(line) {
        // Pattern: [INFO] You have shared [anything here] ([numbers here]) with [anything here].
        const pattern = /\[INFO\] You have shared (.+) \(([^\)]+)\) with (.+)\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const receiver = match[3];

            return '<span class="green">[INFO]</span> <span class="white">You have shared ' + contactName + ' (' + numbers + ') with ' + receiver + '.</span>';
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

    processOutput();
});