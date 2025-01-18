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
                                  .map(replaceDashes);
        let fragment = document.createDocumentFragment();

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

        $output.html('');
        $output.append(fragment);
        cleanUp();
    }

    function applyUserCensorship(line) {
        return line.replace(/÷(.*?)÷/g, (match, p1) => `<span class="${censorshipStyle}">${p1}</span>`);
    }

    function removeTimestamps(line) {
        return line.replace(/\[\d{2}:\d{2}:\d{2}\] /g, "").trim();
    }

    function formatLineWithFilter(line) {
        // Check for car whispers first
        if (line.startsWith("(Car)")) {
            return wrapSpan("yellow", line);
        }

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

        if (lowerLine.startsWith("you were frisked by")) {
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
        if (lowerLine.includes("says (phone):")) return handleCellphone(line);
        if (/\[[^\]]+ -> [^\]]+\]/.test(line)) return wrapSpan("depColor", line);
        if (lowerLine.includes("[megaphone]:")) return wrapSpan("yellow", line);
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

    function isRadioLine(line) {
        return /\[S: \d+ \| CH: .+\]/.test(line);
    }

    function formatLine(line) {
        const lowerLine = line.toLowerCase();

        if (line.includes("Equipped Weapons")) {
            return wrapSpan("green", line);
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

    function formatJailTime(line) {
        const pattern = /(You have) (.*?) (left in jail\.)/;
        const match = line.match(pattern);
        if (match) {
            return `<span class="white">${match[1]}</span> <span class="green">${match[2]}</span> <span class="white">${match[3]}</span>`;
        }
        return line;
    }

    function wrapSpan(className, content) {
        return `<span class="${className}">${content}</span>`;
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
            return '<span class="white">' + line + '</span>';
        }
    }

    function colorInfoLine(line) {
        const datePattern = /\[INFO\]:\s*\[\d{2}\/[A-Z]{3}\/\d{4}\]\s.+/;
        if (datePattern.test(line)) {
            return applyDatePattern(line);
        }

        line = line.replace(/\[(?!INFO\])|\](?!)/g, '');
        line = line.replace('[INFO]', '<span class="green">[INFO]</span>');

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
        const pattern = /\[INFO\] You have received a contact \((.+), ([^\)]+)\) from (.+)\. Use (\/acceptnumber) to accept it\./;

        const match = line.match(pattern);

        if (match) {
            const contactName = match[1];
            const numbers = match[2];
            const sender = match[3];
            const acceptCommand = match[4];

            return '<span class="green">[INFO]</span> <span class="white">You have received a contact (' + contactName + ', ' + numbers + ') from ' + sender + '. Use ' + acceptCommand + ' to accept it.</span>';
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

            return '<span class="green">[INFO]</span> <span class="white">You have received a contact (' + contactName + ', ' + numbers + ') from ' + sender + '. Use ' + acceptCommand + ' to accept it.</span>';
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

            return '<span class="green">[INFO]</span> <span class="white">You have shared your number with ' + receiver + ' under the name ' + name + '.</span>';
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