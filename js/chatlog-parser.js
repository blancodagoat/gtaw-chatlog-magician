$(document).ready(function () {
  let applyBackground = false;
  let characterName = "";
  const $textarea = $("#chatlogInput");
  const $output = $("#output");
  const $toggleBackgroundBtn = $("#toggleBackground");

  $toggleBackgroundBtn.click(toggleBackground);

  function toggleBackground() {
    applyBackground = !applyBackground;
    $output.toggleClass("background-active", applyBackground);

    $toggleBackgroundBtn
      .toggleClass("btn-dark", applyBackground)
      .toggleClass("btn-outline-dark", !applyBackground);

    processOutput();
  }

  $("#characterNameInput").on("input", debounce(applyFilter, 300));

  function applyFilter() {
    characterName = $("#characterNameInput").val().toLowerCase();
    processOutput();
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function throttle(func, limit) {
    let lastFunc, lastRan;
    return function () {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function () {
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
      div.innerHTML = addLineBreaksAndHandleSpans(formatLineWithFilter(line));
      fragment.appendChild(div);

      const clearDiv = document.createElement("div");
      clearDiv.className = "clear";
      fragment.appendChild(clearDiv);
    });

    $output.html('');
    $output.append(fragment);
    cleanUp();
  }

  function removeTimestamps(line) {
    return line.replace(/\[\d{2}:\d{2}:\d{2}\] /g, "");
  }

  function formatLineWithFilter(line) {
    const lowerLine = line.toLowerCase();

    if (isRadioLine(line)) {
        if (!characterName) {
            return wrapSpan("radioColor", line);
        }
        return lowerLine.includes(characterName) ? wrapSpan("radioColor", line) : wrapSpan("radioColor2", line);
    }

    if (lowerLine.includes("说:") || lowerLine.includes("大喊:")) {
        if (!characterName) {
            return wrapSpan("white", line);
        }
        return lowerLine.includes(characterName) ? wrapSpan("white", line) : wrapSpan("grey", line);
    }

    return formatLine(line);
}

  function isRadioLine(line) {
    return /\*\* \[S: \d+ \| CH: .+\]/.test(line);
  }

  function formatLine(line) {
    const lowerLine = line.toLowerCase();

    if (line.startsWith("*")) return wrapSpan("me", line);
    if (lowerLine.includes("密语:")) return handleWhispers(line);
    if (lowerLine.includes("说 (手机):")) return handleCellphone(line);
    if (lowerLine.includes("说 [悄悄地]:")) return wrapSpan("grey", line);
    if (lowerLine.includes("说:") || lowerLine.includes("大喊:"))
      return wrapSpan("white", line);
    if (
      lowerLine.includes("(商品)") ||
      lowerLine.match(/(.+?)\s+x(\d+)\s+\((\d+g)\)/)
    )
      return handleGoods(line);
    if (lowerLine.includes("[扩音器]:")) return wrapSpan("yellow", line);
    if (lowerLine.startsWith("信息:")) return formatInfo(line);
    if (lowerLine.includes("向您的银行账户转账了 $")) return colorMoneyLine(line);
    if (lowerLine.includes("[药品工厂]")) return formatDrugLab();
    if (lowerLine.includes("[character kill]")) return formatCharacterKill(line);
    if (lowerLine.startsWith("[信息]")) return colorInfoLine(line);
    if (/\[.*? 无线电\]/i.test(lowerLine)) return formatIntercom(line);
    if (lowerLine.startsWith("你将")) return wrapSpan("orange", line);
    if (lowerLine.includes("从资产")) return wrapSpan("death", line);
    if (lowerLine.startsWith("[手机]")) return colorPhoneLine(line);
    if (lowerLine.startsWith("使用 /phonecursor")) return formatPhoneCursor(line);
    if (lowerLine.includes("向您出示了他的")) return formatShown(line);
    if (
      lowerLine.includes("您已成功发送当前位置信息")
    )
      return wrapSpan("green", line);
      if (lowerLine.includes("您收到了新的位置信息, 来自"))
        return colorLocationLine(line);
      if (
        lowerLine.includes("您将") ||
        lowerLine.includes("支付了您") ||
        lowerLine.includes("您收到了")
      )
        return handleTransaction(line);

    return replaceColorCodes(line);
  }

  function wrapSpan(className, content) {
    return `<span class="${className}">${content}</span>`;
  }

  function handleWhispers(line) {
    return line.startsWith("(车中)")
      ? wrapSpan("yellow", line)
      : wrapSpan("whisper", line);
  }

  function handleCellphone(line) {
    return line.startsWith("!")
      ? wrapSpan("yellow", line.slice(1))
      : wrapSpan("white", line);
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
      line.replace(/(\$[\d,]+)/, '<span class="green">$1</span>') +
      "</span>"
    );
  }

  function formatInfo(line) {
    const amountMatch = line.match(/\$(\d+)/);
    const objectMatch = line.match(/from the (.+)$/i);
    return amountMatch && objectMatch
      ? `<span class="orange">信息:</span> <span class="white">You took</span> <span class="green">$${amountMatch[1]}</span> <span class="white">from the ${objectMatch[1]}</span>`
      : line;
  }

  function formatDrugLab() {
    return '<span class="orange">[药品工厂]</span> <span class="white">药品已经开始生产.</span>';
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
      /\[(.*?) 无线电\]: (.*)/i,
      '<span class="blue">[$1 无线电]: $2</span>'
    );
  }

  function formatPhoneCursor(line) {
    return '<span class="white">使用 <span class="yellow">/phonecursor (/pc)</span> 激活光标以使用电话.</span>';
  }

  function formatShown(line) {
    return `<span class="green">${line.replace(
      /他的 (.+)\./,
      '他的 <span class="white">$1</span>.'
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
        /向您的银行账户转账了 \$(\d+)/,
        '<span class="white">向您的银行账户转账了 </span><span class="green">$$$1</span>'
      )
      .replace(
        /from (.+) on your bank account\./,
        '<span class="white">from </span><span class="white">$1</span><span class="white"> on your bank account.</span>'
      );
  }

  function colorPhoneLine(line) {
    return line
      .replace(/\[手机\]/, '<span class="white">$&</span>')
      .replace(
        /您的 (.+?) 响了/,
        '<span class="white">您的 </span><span class="yellow">$1</span><span class="white"> 响了</span>'
      )
      .replace(
        /\(来自号码: ([^()]+)\)/,
        '<span class="white">(来自号码: </span><span class="white">$1</span><span class="white">)</span>'
      )
      .replace(/\/pickup/, '<span class="green">$&</span>')
      .replace(/\/hangup/, '<span class="yellow">$&</span>')
      .replace(/(使用手机界面进行操作\.)/, '<span class="white">$1</span>');
  }

  function colorLocationLine(line) {
    return line.replace(
      /(您收到了新的位置信息, 来自) (#\d+)(, 输入 )(\/removelocation)( 来清除地图 GPS 标记\.)/,
      '<span class="green">$1 </span>' +
      '<span class="yellow">$2</span>' +
      '<span class="green">$3</span>' +
      '<span class="death">$4</span>' +
      '<span class="green">$5</span>'
    );
  }

  function colorInfoLine(line) {
    const datePattern = /\[信息\]:\s\[(\d{2})\/([A-Z]{3})\/(\d{4})\]\s(.+)/;
    if (datePattern.test(line)) {
      return applyDatePattern(line);
    }
    let formattedLine = line.replace(
      /^\[信息\]/,
      '<span class="blue">[信息]</span>'
    );
    formattedLine = applyPhoneRequestFormatting(formattedLine);
    formattedLine = applyContactShareFormatting(formattedLine);
    formattedLine = applyNumberShareFormatting(formattedLine);
    formattedLine = applyContactSharedFormatting(formattedLine);

    return formattedLine;
  }

  function applyDatePattern(line) {
    return line.replace(
      /\[信息\]:\s\[(\d{2})\/([A-Z]{3})\/(\d{4})\]\s(.+)/,
      '<span class="blue">[信息]:</span> <span class="orange">[$1/$2/$3]</span> <span class="white">$4</span>'
    );
  }

  function applyPhoneRequestFormatting(line) {
    return line.replace(
      /(.+?)\s请求将他的主手机电话号码\s\(#(.+?)\)\s分享给您,\s署名为:\s(.+?),\s输入\s(\/acceptnumber)\s来将其加入您的通讯录, 或\s(\/declinenumber)\s来拒绝该请求!/,
      '<span class="yellow">$1</span> <span class="white">请求将他的主手机电话号码 (</span><span class="green">#$2</span><span class="white">) 分享给您, 署名为: </span><span class="yellow">$3</span><span class="white">, 输入 </span><span class="blue">$4</span><span class="white"> 来将其加入您的通讯录, 或 </span><span class="blue">$5</span><span class="white"> 来拒绝该请求!</span>'
    );
  }

  function applyContactShareFormatting(line) {
    return line.replace(
      /(.+?)\s分享了他的手机联系人\s(.+?)\s\(#(.+?)\)\s给您!\s输入\s(\/acceptcontact)\s来将该联系人保存至您的手机, 或输入\s(\/declinecontact)\s来拒绝该请求!/,
      '<span class="yellow">$1</span> <span class="white">分享了他的手机联系人 </span><span class="white">$2</span> <span class="white">(</span><span class="yellow">#$3</span><span class="white">)</span><span class="white"> 给您! 输入 </span><span class="yellow">$4</span><span class="white"> 来将该联系人保存至您的手机, 或输入 </span><span class="yellow">$5</span><span class="white"> 来拒绝该请求!</span>'
    );
  }

  function applyNumberShareFormatting(line) {
    return line.replace(
      /您请求将主手机的电话号码\s\(#(.+?)\)\s分享给\s(.+?)\s并署名:\s(.+?)\./,
      '<span class="white">您请求将主手机的电话号码 (</span><span class="green">#$1</span><span class="white">) 分享给 </span><span class="yellow">$2</span><span class="white"> 并署名: </span><span class="yellow">$3</span>'
    );
  }

  function applyContactSharedFormatting(line) {
    return line.replace(
      /您已将手机联系人\s(.+?)\s\(#(.+?)\)\s分享给\s(.+?)!/,
      '<span class="white">您已将手机联系人 </span><span class="yellow">$1</span><span class="white"> (</span><span class="yellow">#$2</span><span class="white">) 分享给 </span><span class="yellow">$3</span><span class="white">!</span>'
    );
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
    $output.find(".generated").each(function () {
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
