$(document).ready(function () {
  let applyBackground = false;

  $("#toggleBackground").click(function () {
    applyBackground = !applyBackground;
    console.log("Background toggle:", applyBackground);
    $("#output").toggleClass("background-active", applyBackground);

    $(this)
      .toggleClass("btn-dark", applyBackground)
      .toggleClass("btn-outline-dark", !applyBackground);

    processOutput();
  });

  function processOutput() {
    $(".output").empty();
    let chatText = $("textarea").val();
    let chatLines = chatText.split("\n");

    chatLines.forEach((line) => {
      let formattedLine = formatLine(line);
      formattedLine = addLineBreaksAndHandleSpans(formattedLine);
      $(".output").append(
        `<div class="generated">${formattedLine}</div><div class="clear"></div>`,
      );
    });

    cleanUp();
  }

  function formatLine(line) {
    let lowerLine = line.toLowerCase();

    if (line.startsWith("*")) {
      return '<span class="me">' + line + "</span>";
    } else if (lowerLine.includes("whispers:")) {
      if (line.startsWith("(Car)")) {
        return '<span class="yellow">' + line + "</span>";
      } else {
        return '<span class="whisper">' + line + "</span>";
      }
    } else if (lowerLine.includes("says (cellphone):")) {
      return line.startsWith("!")
        ? '<span class="yellow">' + line.slice(1) + "</span>"
        : '<span class="white">' + line + "</span>";
    } else if (lowerLine.includes("says [low]:")) {
      return '<span class="grey">' + line + "</span>";
    } else if (lowerLine.includes("says:") || lowerLine.includes("shouts:")) {
      return '<span class="white">' + line + "</span>";
    } else if (
      lowerLine.includes("(goods)") ||
      lowerLine.match(/(.+?)\s+x(\d+)\s+\((\d+g)\)/)
    ) {
      line = line.replace(/(\$\d+)/, '<span class="green">$1</span>');
      return '<span class="yellow">' + line + "</span>";
    } else if (lowerLine.includes("[megaphone]:")) {
      return '<span class="yellow">' + line + "</span>";
    } else if (lowerLine.startsWith("info:")) {
      const amountMatch = line.match(/\$(\d+)/);
      const objectMatch = line.match(/from the (.+)$/i);
      if (amountMatch && objectMatch) {
        return `<span class="orange">Info:</span> <span class="white">You took</span> <span class="green">$${amountMatch[1]}</span> <span class="white">from the ${objectMatch[1]}</span>`;
      } else {
        return line;
      }
    } else if (lowerLine.includes("you have received $")) {
      return colorMoneyLine(line);
    } else if (lowerLine.includes("[drug lab]")) {
      return '<span class="orange">[DRUG LAB]</span> <span class="white">Drug production has started.</span>';
    } else if (lowerLine.includes("[character kill]")) {
      return (
        '<span class="blue">[Character kill]</span> <span class="death">' +
        line.slice(16) +
        "</span>"
      );
    } else if (lowerLine.startsWith("[info]")) {
      return colorInfoLine(line);
    } else if (/\[.*? intercom\]/i.test(lowerLine)) {
      return line.replace(
        /\[(.*?) intercom\]: (.*)/i,
        '<span class="blue">[$1 Intercom]: $2</span>',
      );
    } else if (lowerLine.startsWith("you placed")) {
      return '<span class="orange">' + line + "</span>";
    } else if (
      lowerLine.startsWith("you gave") ||
      lowerLine.includes("paid you")
    ) {
      return (
        '<span class="green">' +
        line.replace(/(\$[\d,]+)/, '<span class="green">$1</span>') +
        "</span>"
      );
    } else if (lowerLine.includes("from the property")) {
      return '<span class="death">' + line + "</span>";
    } else if (lowerLine.startsWith("[phone]")) {
      return colorPhoneLine(line);
    } else if (lowerLine.startsWith("use /phonecursor")) {
      return '<span class="white">Use <span class="yellow">/phonecursor (/pc)</span> to activate the cursor to use the phone.</span>';
    } else if (lowerLine.includes("has shown you their")) {
      return (
        '<span class="green">' +
        line.replace(/their (.+)\./, 'their <span class="white">$1</span>.') +
        "</span>"
      );
    } else if (
      lowerLine.includes("you have successfully sent your current location")
    ) {
      return '<span class="green">' + line + "</span>";
    } else if (lowerLine.includes("you received a location from")) {
      return colorLocationLine(line);
    }

    return replaceColorCodes(line);
  }

  function replaceColorCodes(str) {
    return str
      .replace(
        /\{([A-Fa-f0-9]{6})\}/g,
        (match, p1) => '<span style="color: #' + p1 + ';">',
      )
      .replace(/\{\/([A-Fa-f0-9]{6})\}/g, "</span>");
  }

  function colorMoneyLine(line) {
    return line
      .replace(
        /You have received \$(\d+)/,
        '<span class="white">You have received </span><span class="green">$$$1</span>',
      )
      .replace(
        /from (.+) on your bank account\./,
        '<span class="white">from </span><span class="white">$1</span><span class="white"> on your bank account.</span>',
      );
  }

  function colorLocationLine(line) {
    return line.replace(
      /You received a location from (#\d+)\. Use (\/removelocation) to delete the marker\./,
      '<span class="green">You received a location from </span><span class="yellow">$1</span><span class="green">. Use </span><span class="death">$2</span><span class="green"> to delete the marker.</span>',
    );
  }

  function colorInfoLine(line) {
    const datePattern = /\[INFO\]:\s\[(\d{2})\/([A-Z]{3})\/(\d{4})\]\s(.+)/;
    if (datePattern.test(line)) {
      return line.replace(
        datePattern,
        '<span class="blue">[INFO]:</span> <span class="orange">[$1/$2/$3]</span> <span class="white">$4</span>',
      );
    }
    let formattedLine = line.replace(
      /^\[INFO\]/,
      '<span class="blue">[INFO]</span>',
    );
    formattedLine = formattedLine.replace(
      /(.+?)\shas sent you a request to share their main phone number\s\(#(.+?)\)\sunder a name:\s(.+?)\sUse\s(\/acceptnumber)\sto add it to your contact list, or\s(\/declinenumber)\sto deny their offer!/,
      '<span class="yellow">$1</span> <span class="white">has sent you a request to share their main phone number (</span><span class="green">#$2</span><span class="white">) under a name: </span><span class="yellow">$3</span><span class="white"> Use </span><span class="blue">$4</span><span class="white"> to add it to your contact list, or </span><span class="blue">$5</span><span class="white"> to deny their offer!</span>',
    );
    formattedLine = formattedLine.replace(
      /(.+?)\sshared their contact called\s(.+?)\s\(#(.+?)\)\sto you!\sUse\s(\/acceptcontact)\sto save this contact on your main phone, or\s(\/declinecontact)\sto decline that offer!/,
      '<span class="yellow">$1</span> <span class="white">shared their contact called </span><span class="white">$2</span> <span class="white">(</span><span class="yellow">#$3</span><span class="white">)</span><span class="white"> to you! Use </span><span class="yellow">$4</span><span class="white"> to save this contact on your main phone, or </span><span class="yellow">$5</span><span class="white"> to decline that offer!</span>',
    );
    formattedLine = formattedLine.replace(
      /You sent a request to share your main phone number\s\(#(.+?)\)\sto\s(.+?)\sunder a name:\s(.+?)\./,
      '<span class="white">You sent a request to share your main phone number (</span><span class="green">#$1</span><span class="white">) to </span><span class="yellow">$2</span><span class="white"> under a name: </span><span class="yellow">$3</span><span class="white">.</span>',
    );
    formattedLine = formattedLine.replace(
      /You've shared your contact called\s(.+?)\s\(#(.+?)\)\sto\s(.+?)!/,
      '<span class="white">You\'ve shared your contact called </span><span class="yellow">$1</span><span class="white"> (</span><span class="yellow">#$2</span><span class="white">) to </span><span class="yellow">$3</span><span class="white">!</span>',
    );

    return formattedLine;
  }

  function colorPhoneLine(line) {
    return line
      .replace(/\[PHONE\]/, '<span class="white">$&</span>')
      .replace(
        /Your (.+?) is ringing/,
        '<span class="white">Your </span><span class="yellow">$1</span><span class="white"> is ringing</span>',
      )
      .replace(
        /\(PH: ([^()]+)\)/,
        '<span class="white">(PH: </span><span class="white">$1</span><span class="white">)</span>',
      )
      .replace(/\/pickup/, '<span class="green">$&</span>')
      .replace(/\/hangup/, '<span class="yellow">$&</span>')
      .replace(/(use the UI buttons\.)/, '<span class="white">$1</span>');
  }

  function addLineBreaksAndHandleSpans(text) {
    const maxLineLength = 100;
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
    $(".output .generated").each(function () {
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
      "padding-top": "0px",
    });
    $(".generated:last").css({
      "padding-bottom": "0px",
      "margin-bottom": "0",
    });
    $(".generated").css("background-color", "transparent");

    if (applyBackground) {
      $(".generated").css("background-color", "#000000");
    }
  }

  $("textarea").on("input", processOutput);

  processOutput();
});
