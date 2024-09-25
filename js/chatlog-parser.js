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

	$("#characterNameInput").on("input", debounce(applyFilter, 300));

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

	function processOutput() {
		const chatText = $textarea.val();
		const chatLines = chatText.split("\n").map(removeTimestamps);
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

		if (lowerLine.includes("[ch: vts - vessel traffic service]")) return formatVesselTraffic(line);
		if (/\[[^\]]+ -> [^\]]+\]/.test(line)) return wrapSpan("depColor", line);
		if (line.startsWith("*")) return wrapSpan("me", line);
		if (line.startsWith(">")) return wrapSpan("ame", line);
		if (lowerLine.includes("(phone) *")) return wrapSpan("me", line);
		if (lowerLine.includes("whispers:")) return handleWhispers(line);
		if (lowerLine.includes("says (cellphone):")) return handleCellphone(line);
		if (lowerLine.includes("says [low]")) return wrapSpan("grey", line);
		if (lowerLine.includes("says [lower]")) return wrapSpan("darkgrey", line);
		if (lowerLine.includes("says:") || lowerLine.includes("shouts:"))
			return wrapSpan("white", line);
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
		if (lowerLine.startsWith("[info]")) return colorInfoLine(line);
		if (/\[.*? intercom\]/i.test(lowerLine)) return formatIntercom(line);
		if (lowerLine.startsWith("you placed")) return wrapSpan("orange", line);
		if (lowerLine.includes("from the property")) return wrapSpan("death", line);
		if (lowerLine.startsWith("[phone]")) return colorPhoneLine(line);
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
		if (lowerLine.includes("you've set your main phone to")) return formatPhoneSet(line);
		if (lowerLine.includes("sms sent on")) return formatSmsSent(line);
		if (lowerLine.includes("sms received on your")) return formatSmsReceived(line);
		if (lowerLine.startsWith("you've cut")) return formatDrugCut(line);
		if (lowerLine.includes("[property robbery]")) return formatPropertyRobbery(line);

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
			wrapSpan("yellow", line.slice(1)) :
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

	function colorPhoneLine(line) {
		return line
			.replace(/\[PHONE\]/, '<span class="white">$&</span>')
			.replace(
				/Your (.+?) is ringing/,
				'<span class="white">Your </span><span class="yellow">$1</span><span class="white"> is ringing</span>'
			)
			.replace(
				/\(PH: ([^()]+)\)/,
				'<span class="white">(PH: </span><span class="white">$1</span><span class="white">)</span>'
			)
			.replace(/\/pickup/, '<span class="green">$&</span>')
			.replace(/\/hangup/, '<span class="yellow">$&</span>')
			.replace(/(use the UI buttons\.)/, '<span class="white">$1</span>');
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

	function colorInfoLine(line) {
		const datePattern = /\[INFO\]:\s\[(\d{2})\/([A-Z]{3})\/(\d{4})\]\s(.+)/;
		if (datePattern.test(line)) {
			return applyDatePattern(line);
		}
		let formattedLine = line.replace(
			/^\[INFO\]/,
			'<span class="blue">[INFO]</span>'
		);
		formattedLine = applyPhoneRequestFormatting(formattedLine);
		formattedLine = applyContactShareFormatting(formattedLine);
		formattedLine = applyNumberShareFormatting(formattedLine);
		formattedLine = applyContactSharedFormatting(formattedLine);

		return formattedLine;
	}

	function applyDatePattern(line) {
		return line.replace(
			/\[INFO\]:\s\[(\d{2})\/([A-Z]{3})\/(\d{4})\]\s(.+)/,
			'<span class="blue">[INFO]:</span> <span class="orange">[$1/$2/$3]</span> <span class="white">$4</span>'
		);
	}

	function applyPhoneRequestFormatting(line) {
		return line.replace(
			/(.+?)\shas sent you a request to share their main phone number\s\(#(.+?)\)\sunder a name:\s(.+?)\sUse\s(\/acceptnumber)\sto add it to your contact list, or\s(\/declinenumber)\sto deny their offer!/,
			'<span class="yellow">$1</span> <span class="white">has sent you a request to share their main phone number (</span><span class="green">#$2</span><span class="white">) under a name: </span><span class="yellow">$3</span><span class="white"> Use </span><span class="blue">$4</span><span class="white"> to add it to your contact list, or </span><span class="blue">$5</span><span class="white"> to deny their offer!</span>'
		);
	}

	function applyContactShareFormatting(line) {
		return line.replace(
			/(.+?)\sshared their contact called\s(.+?)\s\(#(.+?)\)\sto you!\sUse\s(\/acceptcontact)\sto save this contact on your main phone, or\s(\/declinecontact)\sto decline that offer!/,
			'<span class="yellow">$1</span> <span class="white">shared their contact called </span><span class="white">$2</span> <span class="white">(</span><span class="yellow">#$3</span><span class="white">)</span><span class="white"> to you! Use </span><span class="yellow">$4</span><span class="white"> to save this contact on your main phone, or </span><span class="yellow">$5</span><span class="white"> to decline that offer!</span>'
		);
	}

	function applyNumberShareFormatting(line) {
		return line.replace(
			/You sent a request to share your main phone number\s\(#(.+?)\)\sto\s(.+?)\sunder a name:\s(.+?)\./,
			'<span class="white">You sent a request to share your main phone number (</span><span class="green">#$1</span><span class="white">) to </span><span class="yellow">$2</span><span class="white"> under a name: </span><span class="yellow">$3</span><span class="white">.</span>'
		);
	}

	function applyContactSharedFormatting(line) {
		return line.replace(
			/You've shared your contact called\s(.+?)\s\(#(.+?)\)\sto\s(.+?)!/,
			'<span class="white">You\'ve shared your contact called </span><span class="yellow">$1</span><span class="white"> (</span><span class="yellow">#$2</span><span class="white">) to </span><span class="yellow">$3</span><span class="white">!</span>'
		);
	}

	function formatRobbery(line) {
		return line
			.replace(/\/arob/, '<span class="blue">/arob</span>')
			.replace(/\/report/, '<span class="death">/report</span>')
			.replace(/You're being robbed, use (.+?) to show your inventory/, '<span class="white">You\'re being robbed, use </span><span class="blue">$1</span><span class="white"> to show your inventory</span>');
	}


	function formatPhoneSet(line) {
		return line.replace(/(#\d+)/, '<span class="blue">$1</span>');
	}

	function formatSmsSent(line) {
		return line
			.replace(/sent/, '<span class="death">sent</span>')
			.replace(/\[([^\]]+)\]/g, '[<span class="green">$1</span>]')
			.replace(/on (.+?) \[/, 'on <span class="yellow">$1</span> [');
	}

	function formatSmsReceived(line) {
		return line
			.replace(/received/, '<span class="green">received</span>')
			.replace(/\[([^\]]+)\]/g, '[<span class="green">$1</span>]')
			.replace(/your (.+?) \[/, 'your <span class="yellow">$1</span> [');
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

	function formatVesselTraffic(line) {
		const vesselTrafficPattern = /\*\*\s*\[CH: VTS - Vessel Traffic Service\]/;

		if (vesselTrafficPattern.test(line)) {
			return `<span class="vesseltraffic">${line}</span>`;
		}

		return line;
	}

	function addLineBreaksAndHandleSpans(text) {
		const maxLineLength = 77;
		let result = "";
		let currentLineLength = 0;
		let inSpan = false;
		let currentSpan = "";

		function addLineBreak() {
			if (inSpan) {
				result +=
					'</span><br><span class="' +
					currentSpan.match(/class="([^"]+)"/)[1] +
					'">';
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