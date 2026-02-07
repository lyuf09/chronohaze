(function () {
  "use strict";

  var MEDIA_SELECTOR = "img, audio, video";

  function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  function isMediaTarget(target) {
    if (!target || typeof target.closest !== "function") {
      return false;
    }
    return !!target.closest(MEDIA_SELECTOR);
  }

  function protectElement(element) {
    if (!element || element.dataset.mediaProtected === "1") {
      return;
    }

    element.dataset.mediaProtected = "1";

    if (element.tagName === "IMG") {
      element.setAttribute("draggable", "false");
      element.style.webkitUserDrag = "none";
      element.style.userSelect = "none";
      element.addEventListener("dragstart", stopEvent);
      element.addEventListener("contextmenu", stopEvent);
    }

    if (element.tagName === "AUDIO" || element.tagName === "VIDEO") {
      element.setAttribute(
        "controlslist",
        "nodownload noplaybackrate noremoteplayback"
      );
      element.setAttribute("disablepictureinpicture", "");
      element.setAttribute("oncontextmenu", "return false");
      element.addEventListener("contextmenu", stopEvent);
      element.addEventListener("dragstart", stopEvent);
    }
  }

  function protectAllMedia() {
    document.querySelectorAll(MEDIA_SELECTOR).forEach(protectElement);
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, "");
  }

  function findSectionText(article, headingLabel) {
    var headings = Array.from(article.querySelectorAll("h2"));
    var target = headings.find(function (heading) {
      return normalizeText(heading.textContent) === normalizeText(headingLabel);
    });

    if (!target) {
      return "";
    }

    var content = target.nextElementSibling;
    if (!content || content.tagName !== "P") {
      return "";
    }

    return content.textContent || "";
  }

  function clampChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function rgbToHex(rgb) {
    function toHex(channel) {
      return clampChannel(channel).toString(16).padStart(2, "0");
    }

    return "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
  }

  function hexToRgb(hex) {
    if (!hex || typeof hex !== "string") {
      return null;
    }

    var clean = hex.trim().replace(/^#/, "");
    if (clean.length === 3) {
      clean =
        clean.charAt(0) +
        clean.charAt(0) +
        clean.charAt(1) +
        clean.charAt(1) +
        clean.charAt(2) +
        clean.charAt(2);
    }

    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
      return null;
    }

    var num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function mixColors(colors) {
    if (!colors.length) {
      return "#393c42";
    }

    var sum = colors.reduce(
      function (acc, rgb) {
        acc.r += rgb.r;
        acc.g += rgb.g;
        acc.b += rgb.b;
        return acc;
      },
      { r: 0, g: 0, b: 0 }
    );

    return rgbToHex({
      r: sum.r / colors.length,
      g: sum.g / colors.length,
      b: sum.b / colors.length,
    });
  }

  function toLinearChannel(channel) {
    var value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(rgb) {
    var r = toLinearChannel(rgb.r);
    var g = toLinearChannel(rgb.g);
    var b = toLinearChannel(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function buildLyricsPalette(descriptionText) {
    var text = (descriptionText || "").toLowerCase();
    var paletteRules = [
      { pattern: /(深蓝|海蓝|blue|navy)/i, color: "#2f3e59" },
      { pattern: /(蓝灰|灰蓝|steel blue|slate)/i, color: "#46546a" },
      { pattern: /(灰白|银灰|mist|fog|雾)/i, color: "#7d838f" },
      { pattern: /(深灰|炭灰|graphite|charcoal)/i, color: "#35383f" },
      { pattern: /(灰|gray|grey)/i, color: "#555963" },
      { pattern: /(黑|black)/i, color: "#24272d" },
      { pattern: /(白|white)/i, color: "#b3b7bf" },
      { pattern: /(红|赤|crimson|red)/i, color: "#5a3f46" },
      { pattern: /(粉|pink|rose)/i, color: "#6a5561" },
      { pattern: /(紫|purple|violet)/i, color: "#4e4a66" },
      { pattern: /(绿|green)/i, color: "#46584d" },
      { pattern: /(黄|gold|amber)/i, color: "#6a6148" },
      { pattern: /(棕|brown|sepia)/i, color: "#5b4f45" },
    ];

    var matched = [];
    paletteRules.forEach(function (rule) {
      if (rule.pattern.test(text)) {
        var rgb = hexToRgb(rule.color);
        if (rgb) {
          matched.push(rgb);
        }
      }
    });

    var backgroundHex = mixColors(matched);
    var backgroundRgb = hexToRgb(backgroundHex) || { r: 57, g: 60, b: 66 };
    var luminance = relativeLuminance(backgroundRgb);
    var useDarkText = luminance > 0.55;

    return {
      background: backgroundHex,
      text: useDarkText ? "rgba(34, 39, 47, 0.9)" : "rgba(242, 245, 252, 0.95)",
      title: useDarkText ? "rgba(23, 28, 35, 0.94)" : "rgba(248, 250, 255, 0.96)",
    };
  }

  function removeMusicDetailImages() {
    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article || article.dataset.detailImagesRemoved === "1") {
      return;
    }

    Array.from(article.querySelectorAll("img")).forEach(function (img) {
      var wrapper = img.closest(".music-detail-cover");
      if (wrapper) {
        wrapper.remove();
      } else {
        img.remove();
      }
    });

    Array.from(article.querySelectorAll(".music-detail-cover")).forEach(function (cover) {
      cover.remove();
    });

    article.dataset.detailImagesRemoved = "1";
  }

  function findLyricHeading(headings, partNumber) {
    var partTagA = "歌词（Part" + partNumber + "）";
    var partTagB = "歌词(Part" + partNumber + ")";

    return (
      headings.find(function (heading) {
        var text = normalizeText(heading.textContent);
        return text === partTagA || text === partTagB;
      }) || null
    );
  }

  function buildLyricColumn(html, extraClass) {
    var column = document.createElement("div");
    column.className = "lyrics-column " + extraClass;

    var text = document.createElement("p");
    text.className = "lyrics-text";
    text.innerHTML = html;

    column.appendChild(text);
    return column;
  }

  function enhanceMusicLyricsLayout() {
    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article || article.dataset.lyricsEnhanced === "1") {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var part1Heading = findLyricHeading(headings, 1);
    var part2Heading = findLyricHeading(headings, 2);

    if (!part1Heading || !part2Heading) {
      return;
    }

    var part1Text = part1Heading.nextElementSibling;
    var part2Text = part2Heading.nextElementSibling;

    if (!part1Text || !part2Text || part1Text.tagName !== "P" || part2Text.tagName !== "P") {
      return;
    }

    var section = document.createElement("section");
    section.className = "lyrics-showcase";
    section.setAttribute("aria-label", "歌词");

    var inner = document.createElement("div");
    inner.className = "lyrics-showcase-inner";

    var title = document.createElement("h2");
    title.className = "lyrics-showcase-title";
    title.textContent = "歌词";

    var columns = document.createElement("div");
    columns.className = "lyrics-columns";
    columns.appendChild(buildLyricColumn(part1Text.innerHTML, "lyrics-column-left"));
    columns.appendChild(buildLyricColumn(part2Text.innerHTML, "lyrics-column-right"));

    var introText = findSectionText(article, "作品介绍");
    var palette = buildLyricsPalette(introText);

    section.style.setProperty("--lyrics-bg", palette.background);
    section.style.setProperty("--lyrics-fg", palette.text);
    section.style.setProperty("--lyrics-title", palette.title);

    inner.appendChild(title);
    inner.appendChild(columns);
    section.appendChild(inner);

    article.insertBefore(section, part1Heading);

    part1Heading.remove();
    part1Text.remove();
    part2Heading.remove();
    part2Text.remove();

    article.dataset.lyricsEnhanced = "1";
  }

  function boot() {
    protectAllMedia();
    removeMusicDetailImages();
    enhanceMusicLyricsLayout();
  }

  document.addEventListener(
    "contextmenu",
    function (event) {
      if (isMediaTarget(event.target)) {
        stopEvent(event);
      }
    },
    true
  );

  document.addEventListener(
    "dragstart",
    function (event) {
      if (isMediaTarget(event.target)) {
        stopEvent(event);
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    function (event) {
      var key = (event.key || "").toLowerCase();
      var hasModifier = event.ctrlKey || event.metaKey;

      if (hasModifier && (key === "s" || key === "u")) {
        stopEvent(event);
        return;
      }

      if (hasModifier && event.shiftKey && (key === "i" || key === "j")) {
        stopEvent(event);
        return;
      }

      if (event.key === "F12") {
        stopEvent(event);
      }
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, {
      once: true,
    });
  } else {
    boot();
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (!node || node.nodeType !== 1) {
          return;
        }

        if (typeof node.matches === "function" && node.matches(MEDIA_SELECTOR)) {
          protectElement(node);
        }

        if (typeof node.querySelectorAll === "function") {
          node.querySelectorAll(MEDIA_SELECTOR).forEach(protectElement);
        }
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
