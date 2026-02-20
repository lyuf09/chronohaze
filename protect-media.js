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

  function splitSrc(value) {
    var source = String(value || "");
    var match = source.match(/^([^?#]+)([?#].*)?$/);
    return {
      path: match ? match[1] : source,
      suffix: match && match[2] ? match[2] : "",
    };
  }

  function isResponsiveImagePath(path) {
    if (!path) {
      return false;
    }

    if (!/\.(jpe?g)$/i.test(path)) {
      return false;
    }

    if (!/(^|\/)assets\/(images\/wix|template)\//i.test(path)) {
      return false;
    }

    return !/-\d+\.(jpe?g|webp)$/i.test(path);
  }

  function buildVariantPath(path, width, extension) {
    return path.replace(
      /\.(jpe?g)$/i,
      "-" + String(width) + "." + String(extension || "jpg").toLowerCase()
    );
  }

  function ensurePictureWrapper(img) {
    if (!img || !img.parentNode) {
      return null;
    }

    var parent = img.parentNode;
    if (parent.tagName === "PICTURE") {
      return parent;
    }

    var picture = document.createElement("picture");
    picture.className = "responsive-picture";
    picture.style.display = "block";
    picture.style.width = "100%";
    parent.insertBefore(picture, img);
    picture.appendChild(img);
    return picture;
  }

  function defaultImageSizes(img) {
    if (!img || img.getAttribute("sizes")) {
      return;
    }

    if (img.closest(".photo-detail-gallery")) {
      img.setAttribute("sizes", "(max-width: 900px) 92vw, 44vw");
      return;
    }

    if (img.closest(".photo-archive-grid, .photo-index-grid")) {
      img.setAttribute("sizes", "(max-width: 900px) 92vw, 30vw");
      return;
    }

    if (img.closest(".photo-intro-layout, .music-intro-layout")) {
      img.setAttribute("sizes", "(max-width: 900px) 92vw, 42vw");
      return;
    }

    if (img.closest(".welcome-main-grid, .welcome-main, .welcome-image-panel")) {
      img.setAttribute("sizes", "(max-width: 900px) 92vw, 46vw");
      return;
    }

    img.setAttribute("sizes", "100vw");
  }

  function deriveFallbackAltFromFilename(path) {
    var safePath = String(path || "");
    var filename = safePath.split("/").pop() || "";
    filename = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    if (!filename || /^64569d_/i.test(filename)) {
      return "";
    }
    return filename;
  }

  function enrichImageAlt(img) {
    if (!img) {
      return;
    }

    if (img.closest(".floating-site-logo")) {
      return;
    }

    var currentAlt = (img.getAttribute("alt") || "").trim();
    if (currentAlt && !/^(image|photo|img)$/i.test(currentAlt)) {
      return;
    }

    var nextAlt = "";

    if (img.closest(".photo-detail-gallery")) {
      var detailTitleNode = document.querySelector(".photo-detail-header h1");
      var detailTitle = detailTitleNode
        ? (detailTitleNode.textContent || "").trim()
        : "Photography";
      var frames = Array.from(
        document.querySelectorAll(".photo-detail-gallery img")
      );
      var frameIndex = frames.indexOf(img) + 1;
      if (frameIndex > 0) {
        nextAlt = detailTitle + " frame " + frameIndex;
      }
    }

    if (!nextAlt) {
      var archiveCard = img.closest(".photo-archive-item, .photo-archive-card");
      if (archiveCard) {
        var cardTitleNode =
          archiveCard.querySelector("h3, .photo-archive-item-title, .photo-archive-card-title");
        var cardTitle = cardTitleNode
          ? (cardTitleNode.textContent || "").trim()
          : "Photography archive";
        nextAlt = cardTitle + " cover";
      }
    }

    if (!nextAlt && img.closest(".photo-intro-layout")) {
      nextAlt = "Portrait of HazezZ with camera";
    }

    if (!nextAlt && img.closest(".music-intro-layout")) {
      nextAlt = "HazezZ in music session";
    }

    if (!nextAlt) {
      var token = splitSrc(img.getAttribute("src") || "");
      nextAlt = deriveFallbackAltFromFilename(token.path) || "Chronohaze image";
    }

    img.setAttribute("alt", nextAlt);
  }

  function applyResponsiveSourceSet(img) {
    if (!img) {
      return;
    }

    var token = splitSrc(img.getAttribute("src"));
    var path = token.path;
    var suffix = token.suffix || "";

    if (!isResponsiveImagePath(path)) {
      return;
    }

    if (img.dataset.responsiveReady === "1") {
      return;
    }

    defaultImageSizes(img);

    var webpSet = [
      buildVariantPath(path, 960, "webp") + suffix + " 960w",
      buildVariantPath(path, 1600, "webp") + suffix + " 1600w",
    ].join(", ");

    var picture = ensurePictureWrapper(img);
    if (!picture) {
      return;
    }

    var source = picture.querySelector("source[data-responsive-webp='1']");
    if (!source) {
      source = document.createElement("source");
      source.dataset.responsiveWebp = "1";
      source.type = "image/webp";
      picture.insertBefore(source, picture.firstChild);
    }

    source.srcset = webpSet;
    source.sizes = img.getAttribute("sizes") || "100vw";

    img.dataset.responsiveReady = "1";
  }

  function optimizeImages() {
    var images = Array.from(document.querySelectorAll("img"));

    images.forEach(function (img) {
      if (!img || img.dataset.optimizeReady === "1") {
        return;
      }

      img.dataset.optimizeReady = "1";

      var eager = img.hasAttribute("data-eager");

      if (!img.getAttribute("loading")) {
        img.setAttribute("loading", eager ? "eager" : "lazy");
      }

      if (!img.getAttribute("decoding")) {
        img.setAttribute("decoding", "async");
      }

      if (eager && !img.getAttribute("fetchpriority")) {
        img.setAttribute("fetchpriority", "high");
      }

      enrichImageAlt(img);
    });

    images.forEach(function (img) {
      applyResponsiveSourceSet(img);
    });
  }

  function optimizeMediaLoading() {
    var media = Array.from(document.querySelectorAll("audio, video"));

    media.forEach(function (item) {
      if (!item || item.dataset.mediaPreloadReady === "1") {
        return;
      }

      item.dataset.mediaPreloadReady = "1";

      var explicitPreload = (item.getAttribute("preload") || "").toLowerCase();
      var shouldKeepExplicitPreload =
        explicitPreload === "metadata" || explicitPreload === "auto";
      var shouldPreferMetadata =
        item.tagName === "AUDIO" &&
        (item.hasAttribute("data-eager-media") ||
          item.id === "heroAudio" ||
          !!item.closest(".music-detail-article"));

      if (shouldPreferMetadata && !shouldKeepExplicitPreload) {
        item.preload = "metadata";
        shouldKeepExplicitPreload = true;
      }

      if (
        !item.hasAttribute("autoplay") &&
        !item.hasAttribute("data-eager-media") &&
        !shouldKeepExplicitPreload
      ) {
        item.preload = "none";
      }

      if (item.tagName === "VIDEO" && !item.hasAttribute("playsinline")) {
        item.setAttribute("playsinline", "");
      }
    });
  }

  function normalizeFooterMeta() {
    var currentYear = new Date().getFullYear();

    var cityNodes = Array.from(
      document.querySelectorAll(
        ".footer-note, .home-footer-cities, [data-i18n='footerCities']"
      )
    );

    cityNodes.forEach(function (node) {
      if (!node) {
        return;
      }
      var next = String(node.textContent || "")
        .replace(/\bnew york\b/gi, "New York")
        .replace(/\bEDINBURGH\b/g, "Edinburgh");
      if (next !== node.textContent) {
        node.textContent = next;
      }
    });

    var copyNodes = Array.from(
      document.querySelectorAll(
        ".footer-copy, .home-footer-copy, [data-i18n='footerCopy']"
      )
    );

    copyNodes.forEach(function (node) {
      if (!node) {
        return;
      }
      var next = String(node.textContent || "").replace(
        /©\s*20\d{2}/g,
        "© " + String(currentYear)
      );
      if (next !== node.textContent) {
        node.textContent = next;
      }
    });
  }

  function bindFooterMetaSync() {
    if (document.body && document.body.dataset.footerMetaBound === "1") {
      return;
    }
    if (document.body) {
      document.body.dataset.footerMetaBound = "1";
    }

    document.addEventListener("click", function (event) {
      var target = event.target;
      if (
        target &&
        typeof target.closest === "function" &&
        target.closest("[data-lang], .lang-btn, .floating-lang-btn")
      ) {
        window.setTimeout(normalizeFooterMeta, 0);
      }
    });
  }

  function normalizeNavHref(href) {
    if (!href) {
      return "";
    }
    try {
      var url = new URL(href, window.location.href);
      var path = String(url.pathname || "")
        .replace(/\/+/g, "/")
        .replace(/\/index\.html$/i, "/")
        .replace(/\/$/, "");
      return path + String(url.search || "") + String(url.hash || "");
    } catch (_error) {
      return String(href).trim().toLowerCase();
    }
  }

  function dedupeNavLinks() {
    Array.from(document.querySelectorAll(".nav")).forEach(function (nav) {
      var seenByText = new Set();
      var seenByHref = new Set();

      Array.from(nav.querySelectorAll("a")).forEach(function (link) {
        if (!link || !link.parentNode) {
          return;
        }

        var textKey = normalizeText(link.textContent || "").toLowerCase();
        var hrefKey = normalizeNavHref(link.getAttribute("href") || "");

        var duplicateByText = textKey && seenByText.has(textKey);
        var duplicateByHref = hrefKey && seenByHref.has(hrefKey);

        if (duplicateByText || duplicateByHref) {
          link.parentNode.removeChild(link);
          return;
        }

        if (textKey) {
          seenByText.add(textKey);
        }
        if (hrefKey) {
          seenByHref.add(hrefKey);
        }
      });

      var desiredOrder = ["home", "math", "photo", "music", "cv", "search"];
      var links = Array.from(nav.querySelectorAll("a"));
      var keyedFirst = Object.create(null);
      var leftovers = [];

      function getNavKey(link) {
        var hrefKey = normalizeNavHref(link.getAttribute("href") || "");
        if (!hrefKey) {
          return "";
        }
        if (/\/math\.html(?:$|[?#])/i.test(hrefKey) || /#math/i.test(hrefKey)) {
          return "math";
        }
        if (/\/portfolio-1\.html(?:$|[?#])/i.test(hrefKey)) {
          return "photo";
        }
        if (/\/yin-le\.html(?:$|[?#])/i.test(hrefKey)) {
          return "music";
        }
        if (/\/cv\.html(?:$|[?#])/i.test(hrefKey) || /fay_lyu_cv\.pdf/i.test(hrefKey)) {
          return "cv";
        }
        if (/\/search\.html(?:$|[?#])/i.test(hrefKey)) {
          return "search";
        }
        if (/\/index(?:\.html)?(?:$|[?#])/i.test(hrefKey) || /\/chronohaze$/i.test(hrefKey)) {
          return "home";
        }
        return "";
      }

      links.forEach(function (link) {
        var key = getNavKey(link);
        if (key && !keyedFirst[key]) {
          keyedFirst[key] = link;
          return;
        }
        leftovers.push(link);
      });

      var ordered = [];
      desiredOrder.forEach(function (key) {
        if (keyedFirst[key]) {
          ordered.push(keyedFirst[key]);
        }
      });
      ordered = ordered.concat(leftovers);

      ordered.forEach(function (link) {
        nav.appendChild(link);
      });
    });
  }

  function labelPhotoOrientation() {
    var images = Array.from(
      document.querySelectorAll(".photo-detail-gallery img")
    );

    images.forEach(function (img) {
      if (!img || img.dataset.orientationReady === "1") {
        return;
      }

      img.dataset.orientationReady = "1";

      function applyOrientation() {
        if (!img.naturalWidth || !img.naturalHeight) {
          return;
        }

        var ratio = img.naturalWidth / img.naturalHeight;
        var figure = img.closest(".photo-detail-item");
        if (!figure) {
          return;
        }

        figure.classList.remove("is-landscape", "is-portrait", "is-square");

        if (ratio > 1.18) {
          figure.classList.add("is-landscape");
        } else if (ratio < 0.85) {
          figure.classList.add("is-portrait");
        } else {
          figure.classList.add("is-square");
        }
      }

      if (img.complete) {
        applyOrientation();
      } else {
        img.addEventListener("load", applyOrientation, { once: true });
      }
    });
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, "");
  }

  function findSectionParagraph(article, headingLabels) {
    if (!article) {
      return null;
    }

    var labels = Array.isArray(headingLabels) ? headingLabels : [headingLabels];
    var normalizedLabels = labels
      .filter(function (label) {
        return typeof label === "string" && label;
      })
      .map(function (label) {
        return normalizeText(label).toLowerCase();
      });

    if (!normalizedLabels.length) {
      return null;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var target = headings.find(function (heading) {
      var normalized = normalizeText(heading.textContent).toLowerCase();
      return normalizedLabels.indexOf(normalized) >= 0;
    });

    if (!target) {
      return null;
    }

    var content = target.nextElementSibling;
    if (!content || content.tagName !== "P") {
      return null;
    }

    return content;
  }

  function findSectionText(article, headingLabel) {
    var content = findSectionParagraph(article, headingLabel);
    if (!content) {
      return "";
    }

    return content.textContent || "";
  }

  function cacheMusicIntroPaletteSource() {
    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath === "music/track-01.html") {
      article.dataset.lyricsPaletteBg = "#3f8f86";
      article.dataset.lyricsPaletteFg = "rgba(242, 249, 253, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(250, 253, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-14.html") {
      article.dataset.lyricsPaletteBg = "#56685f";
      article.dataset.lyricsPaletteFg = "rgba(241, 246, 243, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(248, 252, 249, 0.97)";
      return;
    }

    if (detailPath === "music/track-18.html") {
      article.dataset.lyricsPaletteBg = "#5a6f93";
      article.dataset.lyricsPaletteFg = "rgba(242, 247, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(250, 253, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-20.html") {
      article.dataset.lyricsPaletteBg = "#182344";
      article.dataset.lyricsPaletteFg = "rgba(236, 242, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(246, 250, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-21.html") {
      article.dataset.lyricsPaletteBg = "#182344";
      article.dataset.lyricsPaletteFg = "rgba(236, 242, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(246, 250, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-28.html") {
      article.dataset.lyricsPaletteBg = "#31343b";
      article.dataset.lyricsPaletteFg = "rgba(236, 238, 243, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(245, 247, 251, 0.97)";
      return;
    }

    if (detailPath === "music/track-29.html") {
      article.dataset.lyricsPaletteBg = "#5b97a5";
      article.dataset.lyricsPaletteFg = "rgba(241, 248, 250, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(249, 253, 254, 0.97)";
      return;
    }

    if (detailPath === "music/track-30.html") {
      article.dataset.lyricsPaletteBg = "#e1a9ba";
      article.dataset.lyricsPaletteFg = "rgba(76, 50, 60, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(61, 39, 47, 0.98)";
      return;
    }

    if (detailPath === "music/track-10.html") {
      article.dataset.lyricsPaletteBg = "#d9bec8";
      article.dataset.lyricsPaletteFg = "rgba(62, 52, 59, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(47, 39, 45, 0.98)";
      return;
    }

    if (detailPath === "music/track-11.html") {
      article.dataset.lyricsPaletteBg = "#f1b544";
      article.dataset.lyricsPaletteFg = "rgba(57, 38, 18, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(45, 29, 12, 0.98)";
      return;
    }

    if (detailPath === "music/track-12.html") {
      article.dataset.lyricsPaletteBg = "#dde8f4";
      article.dataset.lyricsPaletteFg = "rgba(55, 68, 82, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(42, 55, 70, 0.98)";
      return;
    }

    if (detailPath === "music/track-13.html") {
      article.dataset.lyricsPaletteBg = "#7a1e19";
      article.dataset.lyricsPaletteFg = "rgba(255, 241, 239, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(255, 248, 246, 0.97)";
      return;
    }

    if (detailPath === "music/track-15.html") {
      article.dataset.lyricsPaletteBg = "#1f4c7d";
      article.dataset.lyricsPaletteFg = "rgba(239, 245, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(248, 251, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-16.html") {
      article.dataset.lyricsPaletteBg = "#111111";
      article.dataset.lyricsPaletteFg = "rgba(242, 242, 242, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(250, 250, 250, 0.97)";
      return;
    }

    if (detailPath === "music/track-17.html") {
      article.dataset.lyricsPaletteBg = "#4a2d44";
      article.dataset.lyricsPaletteFg = "rgba(248, 240, 246, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(255, 248, 253, 0.97)";
      return;
    }

    if (detailPath === "music/track-02.html") {
      article.dataset.lyricsPaletteBg = "#d9d4c8";
      article.dataset.lyricsPaletteFg = "rgba(60, 52, 42, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(48, 41, 33, 0.98)";
      return;
    }

    if (detailPath === "music/track-03.html") {
      article.dataset.lyricsPaletteBg = "#3e3f84";
      article.dataset.lyricsPaletteFg = "rgba(240, 244, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(248, 250, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-04.html") {
      article.dataset.lyricsPaletteBg = "#161d34";
      article.dataset.lyricsPaletteFg = "rgba(235, 241, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(246, 249, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-06.html") {
      article.dataset.lyricsPaletteBg = "#ddd8d2";
      article.dataset.lyricsPaletteFg = "rgba(67, 73, 84, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(55, 60, 71, 0.98)";
      return;
    }

    if (detailPath === "music/track-07.html") {
      article.dataset.lyricsPaletteBg = "#c9c8b5";
      article.dataset.lyricsPaletteFg = "rgba(74, 70, 57, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(60, 56, 45, 0.98)";
      return;
    }

    if (detailPath === "music/track-09.html") {
      article.dataset.lyricsPaletteBg = "#5ea9dd";
      article.dataset.lyricsPaletteFg = "rgba(241, 248, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(249, 252, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-19.html") {
      article.dataset.lyricsPaletteBg = "#ad1f37";
      article.dataset.lyricsPaletteFg = "rgba(255, 243, 246, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(255, 249, 251, 0.97)";
      return;
    }

    if (detailPath === "music/track-22.html") {
      article.dataset.lyricsPaletteBg = "#80894b";
      article.dataset.lyricsPaletteFg = "rgba(247, 248, 236, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(252, 253, 243, 0.97)";
      return;
    }

    if (detailPath === "music/track-23.html") {
      article.dataset.lyricsPaletteBg = "#d58f87";
      article.dataset.lyricsPaletteFg = "rgba(61, 44, 45, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(49, 34, 35, 0.98)";
      return;
    }

    if (detailPath === "music/track-24.html") {
      article.dataset.lyricsPaletteBg = "#2a4fcf";
      article.dataset.lyricsPaletteFg = "rgba(241, 246, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(249, 252, 255, 0.97)";
      return;
    }

    if (detailPath === "music/track-25.html") {
      article.dataset.lyricsPaletteBg = "#516c75";
      article.dataset.lyricsPaletteFg = "rgba(237, 245, 247, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(246, 250, 252, 0.97)";
      return;
    }

    if (detailPath === "music/track-26.html") {
      article.dataset.lyricsPaletteBg = "#283854";
      article.dataset.lyricsPaletteFg = "rgba(236, 243, 255, 0.95)";
      article.dataset.lyricsPaletteTitle = "rgba(246, 250, 255, 0.97)";
      return;
    }

    var introNode = findSectionParagraph(article, ["作品介绍", "About the work"]);
    if (!introNode) {
      return;
    }

    if (
      article.dataset.lyricsPaletteBg &&
      article.dataset.lyricsPaletteFg &&
      article.dataset.lyricsPaletteTitle
    ) {
      return;
    }

    var basePalette = buildLyricsPalette(introNode.textContent || "");
    article.dataset.lyricsPaletteBg = basePalette.background;
    article.dataset.lyricsPaletteFg = basePalette.text;
    article.dataset.lyricsPaletteTitle = basePalette.title;
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

  var MUSIC_TRACK_TOTAL = 30;

  function formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
      return "00:00";
    }

    var total = Math.floor(seconds);
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var secs = total % 60;

    if (hours > 0) {
      return (
        String(hours) +
        ":" +
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")
      );
    }

    return String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function setRangeProgress(range, value, max) {
    var safeMax = Number(max) > 0 ? Number(max) : 100;
    var safeValue = Math.max(0, Math.min(Number(value) || 0, safeMax));
    var percent = (safeValue / safeMax) * 100;
    range.style.setProperty("--range-progress", percent + "%");
  }

  function findTrackIndexFromPath() {
    var path = window.location.pathname || "";
    var match = path.match(/track-(\d+)\.html$/i);
    if (!match) {
      return null;
    }

    var value = parseInt(match[1], 10);
    return isFinite(value) ? value : null;
  }

  function trackHref(index) {
    return "track-" + String(index).padStart(2, "0") + ".html";
  }

  function buildTrackArtist(article, audioElement) {
    if (audioElement && audioElement.getAttribute("data-track-artist")) {
      return audioElement.getAttribute("data-track-artist");
    }

    var explicit = article.getAttribute("data-track-artist");
    if (explicit) {
      return explicit;
    }

    var metas = Array.from(article.querySelectorAll(".music-detail-meta"));
    var staffMeta = metas.length > 1 ? metas[1].textContent || "" : "";
    var staffText = staffMeta.replace(/\s+/g, " ").trim();

    var byline = staffText.match(/[：:]\s*([A-Za-z][A-Za-z0-9_.\-\/&()]*)/);
    if (byline && byline[1]) {
      return byline[1].trim().toUpperCase();
    }

    var hazezz = staffText.match(/\bHazezZ\b/i);
    if (hazezz) {
      return "HAZEZZ";
    }

    var fallback = staffText.match(/\b([A-Za-z][A-Za-z0-9_.\-]*)\b/);
    if (fallback && fallback[1]) {
      return fallback[1].toUpperCase();
    }

    return "HAZEZZ";
  }

  function buildTrackLabel(article, audioElement) {
    var explicitTitle = audioElement
      ? audioElement.getAttribute("data-track-title")
      : null;
    var titleNode = article.querySelector("h1");
    var title = explicitTitle || (titleNode ? (titleNode.textContent || "").trim() : "TRACK");
    return {
      title: title.toUpperCase(),
      artist: buildTrackArtist(article, audioElement),
    };
  }

  function getSecondaryPageDictionary(lang) {
    var safeLang = lang === "en" ? "en" : "zh";

    return {
      zh: {
        htmlLang: "zh-CN",
        navAria: "主导航",
        navHome: "主页",
        navMath: "数学",
        navPhoto: "摄影",
        navMusic: "音乐",
        navCV: "CV",
        navSearch: "搜索",
        searchPageTitle: "站内搜索",
        searchIntro: "按标题、简介、正文与标签搜索全站内容。",
        searchKeywordLabel: "关键词",
        searchPlaceholder: "输入关键词（例如：Affizieren / 形式化 / 摄影）",
        searchScopeLabel: "范围",
        searchTagLabel: "标签",
        searchScopeAll: "全部",
        searchScopeMath: "数学",
        searchScopePhoto: "摄影",
        searchScopeMusic: "音乐",
        searchScopeCV: "CV",
        searchTagAll: "全部标签",
        searchSubmit: "搜索",
        searchEmptyHint: "输入关键词开始搜索。",
        searchLoading: "正在加载索引…",
        searchLoadingProgress: "正在加载索引（{done}/{total}）…",
        searchLoadError: "搜索索引加载失败，请稍后重试。",
        searchFallbackNotice: "已切换到兜底列表",
        searchFallbackText: "索引加载失败，可先使用以下入口：",
        searchFallbackMath: "浏览数学",
        searchFallbackPhoto: "浏览摄影",
        searchFallbackMusic: "浏览音乐",
        searchFallbackCV: "浏览 CV",
        searchFallbackExternal: "站外搜索（site:chronohaze.space）",
        searchResultZero: "暂无匹配结果。",
        searchResultCount: "共 {count} 条结果",
        siteNotes: "网站说明",
        a11y: "无障碍支持",
        footerContactLead: "辗转不同国家无固定号码 请联系邮箱：",
        footerCities: "重庆 · Edinburgh · New York",
        musicPageTitle: "音乐作品集",
        musicIntro: "声音的纹理、情绪的回声、在时间里缓慢成形的片段。",
        musicLead: "仅收录 21 年开始的部分作品（我需要脸面）",
        musicIATitle: "",
        musicIASubtitle: "",
        musicTabAll: "全部",
        musicTabAlbum: "专辑",
        musicTabSingles: "单曲",
        musicTabWip: "WIP",
        musicFilterYear: "年份",
        musicFilterTag: "Tag",
        musicFilterAudio: "音频",
        musicFilterAllYears: "全部年份",
        musicFilterAllTags: "全部标签",
        musicFilterAudioAll: "全部",
        musicFilterAudioReady: "有音频",
        musicFilterAudioPending: "待上传",
        musicGroupAlbum: "专辑",
        musicGroupSingles: "单曲",
        musicGroupWip: "WIP",
        musicNoResults: "没有匹配结果，试试放宽筛选条件。",
        musicTagAlbum: "专辑",
        musicTagSingle: "单曲",
        musicTagWip: "wip",
        musicTagAudio: "audio",
        musicTagPending: "pending",
        musicTagCollab: "合作曲",
        musicTagInstrumental: "纯音乐",
        musicTagJrock: "日系摇滚",
        musicTagProgcore: "前卫核",
        musicTagMathrock: "数学摇滚",
        musicTagPosthardcore: "后核",
        musicTagJazz: "爵士",
        musicTagHardrock: "硬摇滚",
        musicTagEmorock: "情绪摇滚",
        musicTagPostrock: "后摇",
        musicTagPop: "流行",
        musicTagIndie: "indie",
        mathPageTitle: "数学文章",
        mathIntro: "研究记录、实验笔记与结构化的思考。",
        photoPageTitle: "摄影作品集",
        photoIntro: "光的轨迹、线条的结构、人与空间的关系。",
        readMore: "查看更多",
        backToMusic: "返回音乐栏目",
        backToPhoto: "返回摄影栏目",
        backToMath: "返回数学栏目",
        photoPrevGroup: "上一组",
        photoBackToArchive: "返回摄影栏目",
        photoNextGroup: "下一组",
        detailBack: "< 返回",
        creationLabel: "创作时间：",
        workIntroHeading: "作品介绍",
        lyricsHeading: "歌词",
        lyricsPart1: "歌词（Part 1）",
        lyricsPart2: "歌词（Part 2）",
        playerPrev: "上一首",
        playerNext: "下一首",
        playerPlayAria: "播放",
        playerPauseAria: "暂停",
        playerProgressAria: "播放进度",
      },
      en: {
        htmlLang: "en",
        navAria: "Main navigation",
        navHome: "Main",
        navMath: "Mathematics",
        navPhoto: "Photography",
        navMusic: "Music",
        navCV: "CV",
        navSearch: "Search",
        searchPageTitle: "Site Search",
        searchIntro: "Search across titles, excerpts, body text, and tags.",
        searchKeywordLabel: "Keyword",
        searchPlaceholder:
          "Type keywords (e.g. Affizieren / formalization / photography)",
        searchScopeLabel: "Scope",
        searchTagLabel: "Tag",
        searchScopeAll: "All",
        searchScopeMath: "Mathematics",
        searchScopePhoto: "Photography",
        searchScopeMusic: "Music",
        searchScopeCV: "CV",
        searchTagAll: "All tags",
        searchSubmit: "Search",
        searchEmptyHint: "Type a keyword to start searching.",
        searchLoading: "Loading index…",
        searchLoadingProgress: "Loading index ({done}/{total})…",
        searchLoadError: "Failed to load search index. Please try again later.",
        searchFallbackNotice: "Fallback list enabled",
        searchFallbackText: "Index failed to load. You can use these shortcuts:",
        searchFallbackMath: "Browse math",
        searchFallbackPhoto: "Browse photography",
        searchFallbackMusic: "Browse music",
        searchFallbackCV: "Browse CV",
        searchFallbackExternal: "External search (site:chronohaze.space)",
        searchResultZero: "No matching results.",
        searchResultCount: "{count} results",
        siteNotes: "Privacy Policy",
        a11y: "Accessibility",
        footerContactLead:
          "No fixed phone number while moving across countries. Contact by email:",
        footerCities: "Chongqing · Edinburgh · New York",
        musicPageTitle: "Music Collection",
        musicIntro:
          "Textures of sound, echoes of emotion, fragments shaped slowly in time.",
        musicLead: "Selected works since 2021 (I need dignity).",
        musicIATitle: "",
        musicIASubtitle: "",
        musicTabAll: "All",
        musicTabAlbum: "Album",
        musicTabSingles: "Singles",
        musicTabWip: "WIP",
        musicFilterYear: "Year",
        musicFilterTag: "Tag",
        musicFilterAudio: "Audio",
        musicFilterAllYears: "All years",
        musicFilterAllTags: "All tags",
        musicFilterAudioAll: "All",
        musicFilterAudioReady: "With audio",
        musicFilterAudioPending: "Pending upload",
        musicGroupAlbum: "Album",
        musicGroupSingles: "Singles",
        musicGroupWip: "WIP",
        musicNoResults: "No matching result. Try a wider filter.",
        musicTagAlbum: "album",
        musicTagSingle: "single",
        musicTagWip: "wip",
        musicTagAudio: "audio",
        musicTagPending: "pending",
        musicTagCollab: "collab",
        musicTagInstrumental: "Instrumental",
        musicTagJrock: "J-rock",
        musicTagProgcore: "Prog Metalcore",
        musicTagMathrock: "Math rock",
        musicTagPosthardcore: "Post-hardcore",
        musicTagJazz: "Jazz",
        musicTagHardrock: "Hard rock",
        musicTagEmorock: "Emo rock",
        musicTagPostrock: "Post-rock",
        musicTagPop: "Pop",
        musicTagIndie: "Indie",
        musicLongIntroParagraphs: [
          "Music was the first creative language I found, and the one I’ve stayed with the longest.",
          "I started learning piano before primary school, which gave me my earliest foundation in ear training and harmony. Later I picked up the ukulele, and at twelve I began learning the violin. Working with strings gradually helped me understand melodic lines and contrapuntal structure, and by fourteen I started writing original pieces based on the ABRSM music theory I’d studied systematically.",
          "At fifteen, I began teaching myself composition more independently, learning how to develop a motif into a complete work. At sixteen, I taught myself bass and started to think more deeply about low-end structure and rhythmic backbone. At seventeen, I taught myself electric guitar, which pushed me toward arranging from a full-band perspective, thinking in terms of voicing, interplay between parts, and layers of timbre.",
          "At nineteen, I began teaching myself mixing and production, gradually shifting from \"someone who writes songs\" into a creator who can carry a piece through the entire production process, imperfect, but complete.",
          "Along the way, I’ve also taken part in collaborations: contributing to album projects, creating for others, and recording bass parts for other works. To me, music isn’t only personal expression, it’s also a way of building a shared sonic world with others.",
          "My work often returns to a set of recurring images: summer rain, nighttime, light suspended in humid air, and white flowers that bloom after dark.",
          "Over time, these elements have become the emotional motifs in my writing, time moving slowly, tension growing in stillness, and everything left unsaid.",
        ],
        mathPageTitle: "Mathematics Archive",
        mathIntro: "Research notes, experiments, and structured thoughts.",
        photoPageTitle: "Photography Collection",
        photoIntro:
          "Traces of light, structures of lines, and the relation between people and space.",
        photoLongIntroParagraphs: [
          "Photography is one of the first creative mediums I learned in a structured way. This sunlit portrait was taken by a classmate during a photography trip at seventeen, when we visited Manchester Art Gallery.",
          "During my A-levels, I chose Photography as one of my subjects, and it ended up being my highest-scoring one, very close to full marks. For my final project, I created an experimental short film with an improvised piano soundtrack (recorded after I sneaked into the assembly hall to use the grand piano), and the piece ultimately received full marks.",
          "To me, photography isn’t only about capturing a moment, it’s a way of expressing structure and emotion, and it has become one of the ways I make sense of the world.",
          "After entering university, as my focus shifted more toward coursework and research, I’ve photographed less systematically. But photography has never really left my life, I still find myself pressing the shutter in different cities, in different light, at different times, only now, it feels freer, and quieter.",
        ],
        readMore: "Read More",
        backToMusic: "Back to music",
        backToPhoto: "Back to photography",
        backToMath: "Back to mathematics",
        photoPrevGroup: "Prev set",
        photoBackToArchive: "Back",
        photoNextGroup: "Next set",
        detailBack: "< Back",
        creationLabel: "Creation period:",
        workIntroHeading: "About the work",
        lyricsHeading: "Lyrics",
        lyricsPart1: "Lyrics (Part 1)",
        lyricsPart2: "Lyrics (Part 2)",
        playerPrev: "Previous",
        playerNext: "Next",
        playerPlayAria: "Play",
        playerPauseAria: "Pause",
        playerProgressAria: "Playback position",
      },
    }[safeLang];
  }

  function buildTrackNavigation(dict) {
    var current = findTrackIndexFromPath();
    var nav = document.createElement("div");
    nav.className = "music-player-nav";

    function createNavNode(text, href) {
      var node = href ? document.createElement("a") : document.createElement("span");
      node.className = "music-player-nav-link";
      node.textContent = text;
      if (href) {
        node.href = href;
      } else {
        node.classList.add("is-disabled");
      }
      return node;
    }

    var prevHref = current && current > 1 ? trackHref(current - 1) : null;
    var nextHref =
      current && current < MUSIC_TRACK_TOTAL ? trackHref(current + 1) : null;

    nav.appendChild(createNavNode(dict.playerPrev, prevHref));
    nav.appendChild(createNavNode(dict.playerNext, nextHref));
    return nav;
  }

  function ensureMusicDetailBackLink() {
    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article || article.querySelector(".music-detail-back")) {
      return;
    }

    var heading = article.querySelector("h1");
    if (!heading) {
      return;
    }

    var link = document.createElement("a");
    var dict = getSecondaryPageDictionary(detectPreferredLanguage());
    link.className = "music-detail-back";
    link.href = "../yin-le.html";
    link.textContent = dict.detailBack;
    article.insertBefore(link, heading);
  }

  function enhanceMusicPlayers() {
    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var players = Array.from(
      document.querySelectorAll(".music-detail-article audio")
    );
    var dict = getSecondaryPageDictionary(detectPreferredLanguage());

    players.forEach(function (audio) {
      if (audio.dataset.customPlayer === "1") {
        return;
      }

      audio.dataset.customPlayer = "1";
      audio.classList.add("music-player-native");
      audio.removeAttribute("controls");
      audio.controls = false;

      var shell = document.createElement("div");
      shell.className = "music-player-shell";

      var label = document.createElement("p");
      label.className = "music-player-label";
      var trackData = buildTrackLabel(
        audio.closest(".music-detail-article") || document,
        audio
      );
      var trackTitleSpan = document.createElement("span");
      trackTitleSpan.className = "music-player-track-title";
      trackTitleSpan.textContent = trackData.title;

      var sepSpan = document.createElement("span");
      sepSpan.className = "music-player-track-sep";
      sepSpan.textContent = " - ";

      var artistSpan = document.createElement("span");
      artistSpan.className = "music-player-track-artist";
      artistSpan.textContent = trackData.artist;

      label.appendChild(trackTitleSpan);
      label.appendChild(sepSpan);
      label.appendChild(artistSpan);

      var playButton = document.createElement("button");
      playButton.type = "button";
      playButton.className = "music-player-play";
      playButton.setAttribute("aria-label", dict.playerPlayAria);
      playButton.textContent = "▶";

      var scrubber = document.createElement("input");
      scrubber.type = "range";
      scrubber.className = "music-player-scrubber";
      scrubber.min = "0";
      scrubber.max = "1000";
      scrubber.step = "1";
      scrubber.value = "0";
      scrubber.setAttribute("aria-label", dict.playerProgressAria);
      setRangeProgress(scrubber, 0, 1000);

      var timeLabel = document.createElement("p");
      timeLabel.className = "music-player-time";
      timeLabel.textContent = "00:00 / 00:00";

      var row = document.createElement("div");
      row.className = "music-player-row";

      row.appendChild(playButton);
      row.appendChild(scrubber);
      row.appendChild(timeLabel);
      shell.appendChild(label);
      shell.appendChild(row);
      shell.appendChild(buildTrackNavigation(dict));
      audio.insertAdjacentElement("afterend", shell);

      function syncPlayState() {
        var isPlaying = !audio.paused && !audio.ended;
        playButton.classList.toggle("is-playing", isPlaying);
        playButton.textContent = isPlaying ? "❚❚" : "▶";
        playButton.setAttribute(
          "aria-label",
          isPlaying ? dict.playerPauseAria : dict.playerPlayAria
        );
      }

      function syncTimeState() {
        var duration = isFinite(audio.duration) ? audio.duration : 0;
        var current = isFinite(audio.currentTime) ? audio.currentTime : 0;

        if (duration > 0) {
          var timelineValue = Math.round((current / duration) * 1000);
          scrubber.value = String(timelineValue);
          setRangeProgress(scrubber, timelineValue, 1000);
        } else {
          scrubber.value = "0";
          setRangeProgress(scrubber, 0, 1000);
        }

        timeLabel.textContent =
          formatDuration(current) + " / " + formatDuration(duration);
      }

      playButton.addEventListener("click", function () {
        if (audio.paused || audio.ended) {
          var playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {
              syncPlayState();
            });
          }
        } else {
          audio.pause();
        }
      });

      scrubber.addEventListener("input", function () {
        if (!isFinite(audio.duration) || audio.duration <= 0) {
          return;
        }

        var next = (Number(scrubber.value) / 1000) * audio.duration;
        audio.currentTime = next;
        syncTimeState();
      });

      audio.addEventListener("play", syncPlayState);
      audio.addEventListener("pause", syncPlayState);
      audio.addEventListener("ended", syncPlayState);
      audio.addEventListener("timeupdate", syncTimeState);
      audio.addEventListener("loadedmetadata", syncTimeState);

      syncPlayState();
      syncTimeState();
    });
  }

  function findLyricHeading(headings, partNumber) {
    var partTagA = "歌词（Part" + partNumber + "）";
    var partTagB = "歌词(Part" + partNumber + ")";
    var partTagC = "Lyrics (Part " + partNumber + ")";
    var partTagD = "Lyrics(Part " + partNumber + ")";
    var partTagE = "Lyrics(Part" + partNumber + ")";
    var targets = [
      normalizeText(partTagA).toLowerCase(),
      normalizeText(partTagB).toLowerCase(),
      normalizeText(partTagC).toLowerCase(),
      normalizeText(partTagD).toLowerCase(),
      normalizeText(partTagE).toLowerCase(),
    ];

    return (
      headings.find(function (heading) {
        var text = normalizeText(heading.textContent).toLowerCase();
        return targets.indexOf(text) >= 0;
      }) || null
    );
  }

  function applySincerelySpringIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-01.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "\"Sincerely, Spring\" lives in a world of pale spring greens and clear, blue air. It captures the quiet way I looked at someone truly, impossibly good during my second spring at university, not a blazing emotion, but small moments lifted gently by the breeze.",
      "It’s concrete too, the streets by the Meadows, that corner on the second floor of the main library, the sound of the wind, the dust like grains of light. He loves jazz, just not jazz with electric guitar in it.",
      "This song holds what that “second spring” felt like for me. It wasn’t only the season returning, but an emotional restart. During that time, he stayed close in a soft, unspoken way, and ordinary days suddenly meant something.",
      "Part of the melody and its emotional imagery nods to “Kimi no Kioku (Memories of You)” from Persona 3, a song he recommended to me. That spring, I listened to the Persona 3 soundtrack almost every day, it even ended up as my No. 1 in my year-end stats (sorry Novelists😭).",
      "Musically, “Sincerely, Spring” leans intentionally toward J-rock, light, transparent, with just a hint of progmetal sharpness. Spring’s hesitation and resolve, light, and silence.",
      "He gave me a warmth that felt unmistakably real, patient, caring, understanding, respectful. A kind of presence that lets you stop pushing yourself and finally breathe again.",
      "For me, this track marks a new beginning (and it’s the first song I recorded on a Strandberg Boden Metal NX7). It’s also the first time I fully stepped out of the world of Ipomoea alba to write something that truly belongs to spring. In both the literal season and the arc of my emotions, it feels like a clear rebirth.",
      "A breeze at the edge of spring, perplexing, and strangely reassuring.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applySincerelySpringLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-01.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: [
          "在这里的第二个春天",
          "因为是你 街道才拥有了意义",
          "垂下的发丝掩住了笑意",
          "而我的目光只是跟随着你",
        ],
        en: [
          "In this second spring I found myself in,",
          "the streets learned meaning from you.",
          "Loose strands of hair fell, hiding your smile,",
          "and all my eyes could do was follow.",
        ],
      },
      {
        zh: [
          "微风点缀的日子",
          "你的笑容 闪烁在阳光中飘散",
          "明知徒然却重复的日常",
          "连夏天都失去了期待理由",
        ],
        en: [
          "Days laced with a soft breeze,",
          "your smile flickered, drifting in sunlight.",
          "I knew it was futile, yet the same days repeated,",
          "and even summer lost its reason to be hoped for.",
        ],
      },
      {
        zh: ["光 洒在耳尖", "泛红颜色", "映在眼中"],
        en: [
          "Light—",
          "spilling over the tips of your ears,",
          "a flush of red,",
          "caught in my eyes.",
        ],
      },
      {
        zh: ["明 天该怎样", "该仍让你", "笑出来吗"],
        en: ["Tomorrow—", "what should I do?", "Should I still try", "to make you smile?"],
      },
      {
        zh: [
          "在奋力追赶犹豫 与坚定的春日里",
          "你确确实实的陪伴在我身旁",
          "在有限的时刻里却沉默不语",
          "但只是没来由的想看着你",
        ],
        en: [
          "In a spring I chased through, torn between hesitation and resolve,",
          "you were truly there, right beside me.",
          "In moments that were brief, you stayed silent,",
          "yet for no reason at all, I only wanted to watch you.",
        ],
      },
      {
        zh: [
          "你给予我那不用为了寻找价值",
          "而迷失于这本身的方式里",
          "义无反顾踏向不可见的未来",
          "下次还是约在二楼角落见吧",
        ],
        en: [
          "You gave me a way to live",
          "without getting lost in the act of searching for “worth.”",
          "To step forward, without looking back, into an unseen future—",
          "let’s meet again next time, in that corner on the second floor.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: [
          "你轻声哼唱着的阴天",
          "棉花糖里 巧克力味却轻飘飘",
          "寂寥无声中的那段话",
          "或许比想象的还更加的糟糕",
        ],
        en: [
          "On a cloudy day you hummed so softly,",
          "the chocolate inside the cotton candy felt weightless.",
          "That sentence, spoken in the soundless quiet",
          "maybe it was worse than I’d imagined.",
        ],
      },
      {
        zh: [
          "我们之间也变了呢",
          "想要说出的话却总是找不到",
          "风的声音、光的粒子",
          "下午的你喜欢的旋律",
        ],
        en: [
          "We changed too, didn’t we?",
          "The words I want to say are always out of reach.",
          "The sound of wind, the grains of light,",
          "and the melody you liked in the afternoon.",
        ],
      },
      {
        zh: [
          "「時間を、どうやって巻き戻せばいいの…？」",
          "優しく、あの日と同じ声で。",
          "眠ったままの淡い緑が",
          "静かに、夜明けを待っている。",
          "夢は、何層も重なって",
          "光の向こうの芝生へ落ちていく。",
          "耳に残るのは",
          "君が嫌いだった",
          "あのジャズギターの音だけ。",
        ],
        en: [
          "“How do you rewind time?”—in that gentle voice,",
          "the same as that day.",
          "Pale green, still asleep,",
          "quietly waiting for dawn.",
          "My dream falls, layer by layer,",
          "onto the lawn beyond the light,",
          "and what remains in my ears",
          "is only the jazz guitar sound",
          "you never liked.",
        ],
      },
      {
        zh: [
          "在我早已知晓的 会结束的春日里",
          "仍在寻找着话语背后的意义",
          "见到你后却竟是平凡的话语",
          "明明不愿它沦为普通定义",
        ],
        en: [
          "In a spring I already knew would end,",
          "I still searched for meanings behind every word.",
          "But when I saw you, the words turned ordinary,",
          "and I hated how easily it became a common definition.",
        ],
      },
      {
        zh: [
          "你给予我那不用为了寻找价值",
          "而迷失于这本身的方式里",
          "走过无数次熟悉的十字路口",
          "仿佛将快看不见你静静伫立",
        ],
        en: [
          "You gave me a way to live",
          "without getting lost in the act of searching for “worth.”",
          "Passing that familiar crosswalk countless times,",
          "I could almost see you standing there, quietly,",
          "as you began to fade.",
        ],
      },
      {
        zh: ["不知为何但却闪闪发光的声音", "在春天尽头里"],
        en: [
          "A sound that shines for no reason at all,",
          "at the very end of spring—",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyMoonlitGardenLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-03.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: [
          "每次想到你 都会种下一株",
          "慢慢沉没在 上涨夜幕",
          "时间推着我 你化作的音符",
          "浮在这沉静的风里",
        ],
        en: [
          "Each time I think of you, I plant another one,",
          "slowly sinking into the rising night.",
          "Time keeps pushing me forward,",
          "the notes you became drift in this quiet wind.",
        ],
      },
      {
        zh: [
          "每当我沉睡时 你的笑脸浮现",
          "想共度些时间 好好地说再见",
          "你曾经弹奏过 多少黎明与黑夜",
          "都已然消逝在 你画下的句点",
        ],
        en: [
          "Whenever I fall asleep, your smiling face appears.",
          "I want a little more time, to say goodbye properly.",
          "How many dawns and nights did you once play?",
          "All of them have vanished where you drew the final period.",
        ],
      },
      {
        zh: [
          "清风轻拂过 随手拨弄一束",
          "万籁俱寂时 幻象须臾",
          "裹挟着深夜 怀念那副景色",
          "不知从何时已褪色",
        ],
        en: [
          "A soft breeze passes by, brushing through a handful at random,",
          "in the hush of everything, an illusion lasts only a moment.",
          "Carried by midnight, I miss that scene,",
          "and somehow it’s been fading for a long time.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: [
          "你被时间带走 光阴日月如梭",
          "以前哼唱的歌 如今剩我一个",
          "你曾经弹奏过 多少夕阳与白昼",
          "暗夜始终未明 从离去的那刻",
        ],
        en: [
          "Time took you away, the days and months rushed on.",
          "Songs you used to hum, now I’m the only one left.",
          "How many sunsets and daylight did you once play?",
          "The night has never truly brightened since the moment you left.",
        ],
      },
      {
        zh: ["如果那颗星星能降临在你身旁"],
        en: ["If only that star could fall beside you..."],
      },
      {
        zh: ["月光落入的花园", "请不要让我入眠"],
        en: ["A garden where moonlight settles,", "please don’t let me fall asleep."],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applySiltLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-05.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: [
          "就连声音也仔细回想",
          "雨声连绵不绝",
          "闭上眼后再抽离以往",
          "重复闷热想象",
        ],
        en: [
          "I even replay the sound, carefully,",
          "rainfall without end.",
          "Eyes closed, I pull myself out of the past,",
          "repeating that stifling, humid imagining.",
        ],
      },
      {
        zh: ["遗落下来的话语就是", "加深过的印象", "他的双耳里所记住的", "长长的目光"],
        en: [
          "The words left behind are nothing,",
          "but impressions, darkened with time.",
          "A long, long gaze...",
          "somehow remembered in his ears.",
        ],
      },
      {
        zh: [
          "生锈琴键 发霉的雨 等待在车站",
          "那些不会到来的日子和时间相伴",
          "昏碌的绿 沉默的你 如石上青苔",
          "车轮又压过浅洼声的夜晚",
        ],
        en: [
          "Rusted piano keys, mildewed rain, waiting at the bus stop.",
          "Days that will never arrive keep time company.",
          "Dull, busy green, you in silence, like moss on stone.",
          "And the wheels roll over another night of shallow puddle noise.",
        ],
      },
      {
        zh: ["潮朽木头般气味散落", "牵着我的思绪", "就连你瞳孔中的轮廓", "滴零随风飘落"],
        en: [
          "A scent like tidewet, decaying wood scatters,",
          "tugging at my thoughts.",
          "Even the outline inside your pupils",
          "drips apart, and drifts off with the wind.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["而我驻足廊前", "聆听檐下朦胧淅沥", "而你被雨笼罩", "池塘泛起圈圈涟漪"],
        en: [
          "And I stop beneath the corridor,",
          "listening to the blurred patter under the eaves.",
          "You are veiled by rain,",
          "and the pond opens rings of ripples.",
        ],
      },
      {
        zh: ["目及之处", "荡漾开去"],
        en: ["As far as the eye can reach,", "they spread..."],
      },
      {
        zh: [
          "弦音响起 泣雨沥沥 那炽热的回音",
          "湿润花朵独自摇曳在盛夏雨幕里",
          "撑伞背离 不留痕迹 一寸寸冲刷去",
          "压抑的低潮连着浊辉一并",
        ],
        en: [
          "Strings rise, rain weeping, that fevered echo.",
          "A damp flower sways alone beneath the midsummer rain curtain.",
          "Turning away under an umbrella, leaving no trace,",
          "washed away inch by inch, along with the low, suppressed tide and its muddy light.",
        ],
      },
      {
        zh: [
          "再次落笔 重叠回忆 阴霾过的痕迹",
          "镌刻于指尖处那锈迹斑斑的印记",
          "跌入水底 淹没自己 深青色的呼吸",
          "归咎于属于我落下的水滴",
        ],
        en: [
          "I write again, overlapped memories, the marks of overcast days.",
          "Etched into my fingertips, those rust speckled imprints.",
          "I sink to the bottom, drown myself, breathing a deep teal.",
          "Blaming it all on the drops that fell from me.",
        ],
      },
      {
        zh: ["湿淋淋的月影", "归还于尘埃"],
        en: ["The drenched shadow of the moon", "returned to dust."],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyMrIdiographicLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-06.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["目に映った"],
        en: ["Through my eyes..."],
      },
      {
        zh: [
          "行き交う人々の中に昔の面影を探す",
          "夜の街を歩いてるだけ 適当に",
          "あの、元気ですかって",
          "こんなことも言えないんだ",
          "あの時スクリーンの向こうは",
          "手の届かない距離でした",
          "殴り書きの写真しか残っていない",
        ],
        en: [
          "In the crowd of people passing by, I catch myself looking for an old outline,",
          "but really, I’m just wandering the city at night, aimlessly.",
          "Like… “Hey, how’ve you been?”",
          "I can’t even say something that simple.",
          "Back then, the other side of the screen",
          "was a distance my hands could never reach.",
          "All that’s left now",
          "are a few scribbled photos, nothing else.",
        ],
      },
      {
        zh: ["他の人と比べていないか？私を", "聞かせてよ、昔の話", "あなたのために時間を止める"],
        en: [
          "Have you ever compared me to someone else?",
          "Tell me. Let me hear the old stories.",
          "For you,",
          "I’d pause time, just a little.",
        ],
      },
      {
        zh: [
          "以前あなたに抱いていた疑問が解けました",
          "軒に白く落ちた花びらがまだ揺れていた",
          "でもどんなに頑張ってもあなたにはなれない",
          "今でも覚えてるか、口論のことを",
        ],
        en: [
          "The questions I used to have about you are finally answered now.",
          "White petals that fell onto the eaves are still trembling there.",
          "But no matter how hard I try, I can’t become you.",
          "Do you still remember,",
          "that argument we had?",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: [
          "朝のお茶を飲んで月光をあなたのギターに注ぎる",
          "雨夜に予報を そちらは晴れ",
          "似ているがあの時 気持ちとは重なりない",
          "一人になるとまた浮かんできる",
          "灰色の瞳の失望に戻ったようだ",
          "本当はこんなはずじゃなかったんだ",
        ],
        en: [
          "Morning tea,",
          "moonlight pouring onto your guitar.",
          "On a rainy night I check the forecast,",
          "it’s sunny where you are.",
          "It looks similar,",
          "but it doesn’t overlap with how it felt back then.",
          "And whenever I’m alone, it all comes back,",
          "like I’ve returned to that disappointment in that grey eyes.",
          "Honestly…",
          "it wasn’t supposed to be like this.",
        ],
      },
      {
        zh: ["話から 言外の意味を考えた", "訳も分からずあなたの国のニュースを見ました"],
        en: [
          "I start reading into what you said, what you didn’t say.",
          "Without knowing why,",
          "I end up watching the news from your country.",
        ],
      },
      {
        zh: [
          "「今夜、どうして君について話をしたのかわかない」",
          "最後まで、 神は罰すら下そうとしない",
          "レコードを置いて 大丈夫だ とつぶやいた",
          "今でも覚えてるか、「未来」のことを",
        ],
        en: [
          "“Tonight, I don’t even know why I started talking about you.”",
          "In the end, even God refuses to hand down a punishment.",
          "I put on a record",
          "and whisper, “It’s fine.”",
          "Do you still remember,",
          "the thing we called “the future”?",
        ],
      },
      {
        zh: [
          "以前あなたに抱いていた疑問が解けました",
          "軒に白く落ちた花びらがまだ揺れてた",
          "結局 、 今、誰のせいなのかわからないんだ",
          "灯火、初夏 、なぜ変化し続けるのでしょうか",
        ],
        en: [
          "The questions I used to have about you are finally answered now.",
          "White petals that fell onto the eaves are still trembling there.",
          "And yet, in the end, even now,",
          "I still don’t know whose fault it was.",
          "Streetlights. Early summer.",
          "Why do they keep changing?",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyMrIdiographicIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-06.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Mr. Idiographic” takes place on an early-summer night.",
      "The city is lit in scattered glows, people drift by in the street. I’m just walking, no destination, no urgency.",
      "The “you” in this song feels less like a single person than a blurred, hard to name presence. Maybe the afterimage of a relationship, or maybe just a memory that refuses to let me press pause tonight.",
      "「他の人と比べていないか？私を」<br />Have you ever compared me to someone else?",
      "It isn’t a hysterical interrogation. It’s a faint, almost restrained test, quietly asking, because I do care, but only daring to ask softly, in the end, was I still the better one?",
      "Musically, it’s progressive metalcore with a slight jazz tint: a 12/8 swing that keeps swaying forward. The feel is loose, bright, even a little like I’m “not taking it that seriously.” But the unease in the lyrics never disappears, like walking casually on the outside while the mind keeps circling back to the same place.",
      "The title “Mr. Idiographic” comes from the texture of that kind of relationship. In the end, grand explanations don’t hold. What remains is only an idiographic truth, a case by case truth that can be true only for you, for me, for that specific stretch of time. The “Mr.” is deliberately distant, faintly mocking, a polite step backward, while still unwilling to let go, calling that shadow out with a name that sounds courteous, but is, underneath, cold.",
      "This is a strongly narrative song. Beneath its easy shell lies the care that never got spoken. The early summer lights keep shifting, and together with the question of “whose fault it was,” there is still no answer.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyAffizierenLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-04.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: [
          "我的回忆像无聊的电影",
          "想写下什么却无法动行",
          "季节轮转过筛后的身影",
          "一直住在你目光消失之地",
        ],
        en: [
          "My memories play like a tedious film,",
          "I try to write them down, yet nothing moves.",
          "The seasons sift through the silhouettes,",
          "Still living where your gaze once faded.",
        ],
      },
      {
        zh: [
          "其实一呼一吸毫无意义",
          "天井光影总会把我规避",
          "在最坏的日子沉入灰底",
          "将丑陋一面留在你的眼里",
        ],
        en: [
          "Each breath feels stripped of meaning,",
          "The skylight and its shifting light avoid me.",
          "On the worst of days I sink into the ash,",
          "Leaving my ugliness in your eyes.",
        ],
      },
      {
        zh: [
          "既想回到过去魂牵梦萦的地方",
          "又想被时间推着大步向前走",
          "想看见更多不同的绚烂光景",
          "但是哪里看到的都是你",
        ],
        en: [
          "I long to return to the place my soul still haunts,",
          "Yet I want time to push me forward in great strides.",
          "I wish to see visions in colours I haven't known,",
          "But everywhere I look, it is always you.",
        ],
      },
      {
        zh: [
          "只是在我的生命里破开了缺口",
          "怎样都无法填满那些空",
          "谁能想到那一面竟是最后",
          "只是胃不断抽动 不断疼痛",
        ],
        en: [
          "A crack opened quietly in my life,",
          "No matter how, it cannot be filled.",
          "Who could have known that moment was the last,",
          "Only the stomach twisting, aching without end.",
        ],
      },
      {
        zh: [
          "在沉淀的回忆中一直呆在一起",
          "定格在冗长的无数瞬间里",
          "愿景如纸一般破碎在雨里",
          "而我想不再迷离 不再心悸",
        ],
        en: [
          "We stayed together in memories that settled,",
          "Frozen in countless lingering frames.",
          "Dreamscapes tore like paper in the rain,",
          "And I only wished not to waver, not to tremble.",
        ],
      },
      {
        zh: ["噢…", "尚未停下的雨"],
        en: ["Oh…", "The rain has yet to stop."],
      },
    ];

    var part2Blocks = [
      {
        zh: [
          "又一个做过的梦消失了",
          "那些既视感也是幻觉吗",
          "只是如果转身回头望去",
          "还有什么事能够拥有意义",
        ],
        en: [
          "Another dream I once had disappears,",
          "Were those déjà vus only illusions?",
          "If I were to turn around and look back,",
          "Is there anything left that still holds meaning?",
        ],
      },
      {
        zh: [
          "三个秋天的长度已经足矣",
          "遗憾对转瞬即逝的青春像是梦呓",
          "只能弹奏着你偏爱的曲调",
          "跌跌撞撞跑向未来不知是否有你",
        ],
        en: [
          "Three autumns in length are more than enough.",
          "Regret murmurs through fleeting youth like sleep-talk.",
          "All I can do is play the melody you favoured,",
          "Stumbling toward a future unsure of your shadow.",
        ],
      },
      {
        zh: [
          "呼出灰色气体之后的夜里",
          "像改掉惯用左手一般的将我忘记",
          "总有一天连诞辰也想不起",
          "那种气味可真是令人悲戚",
        ],
        en: [
          "In the night after exhaling gray air,",
          "You forget me like abandoning a habitual left hand.",
          "One day even my birthday will slip your mind,",
          "That scent alone could drown a heart.",
        ],
      },
      {
        zh: [
          "只是在我的生命里破开了缺口",
          "不知何处搁置却肆意翻涌",
          "紧缩的心脏依旧照常聒噪",
          "我却只是低俯着 无视喧闹",
        ],
        en: [
          "A crack opened quietly in my life,",
          "Placed nowhere, yet rising without restraint.",
          "My tightened heart still rattles on,",
          "While I bend low, ignoring the noise.",
        ],
      },
      {
        zh: [
          "在沉淀的回忆中一直呆在一起",
          "在朝思暮想的泛黄照片里",
          "所有遗憾的身旁都没有你",
          "只是很想触碰你 触碰到你",
        ],
        en: [
          "We remained together in memories that settled,",
          "Inside yellowed photos I once thought of daily.",
          "Beside every regret, you were never there,",
          "I only wish to reach you, to reach you once more.",
        ],
      },
      {
        zh: [
          "到最后也拥抱着不成熟的心意",
          "即使已经在最遥远的距离",
          "你是不想放弃的我的败笔",
          "海潮声又淹没了 我的雨季",
        ],
        en: [
          "In the end I hold my childish feelings close,",
          "Even across the greatest distance.",
          "You are the flaw I cannot give up on,",
          "And the tide swallows again my rainy season.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyHeAndMeIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-02.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“He and Me” is a look back in warm whites and pale greys.",
      "Back then, I couldn’t understand the choice he made at all. But as time passed, I slowly grew to resemble him, and in that quiet way time does, I began to understand. It’s a kind of understanding that arrives late, carrying something like body heat.",
      "The song began with a dream.<br />In it, we sat down and talked, calmly, for no clear reason. When I woke up, I forgot everything. All that remained was the strange realism of that conversation, an emptiness that lingered in my chest for a long time. Under the dim afterglow of the dream, I wanted to write a little more.",
      "Harmonically and melodically, I tried progressions I had never used before. I was looking for the feeling of an “adult evening”, not quite closure, but close, understanding, with a faint ache still underneath. In the end, I let the chords fall back into a gentle echo of Ipomoea alba, from IV to iii. Softly slipping between unease and tenderness.",
      "For me, “He and Me” is a small epilogue to a chapter of lived experience, most likely the last track in the Ipomoea alba world.",
      "I rarely think about what emotions listeners are supposed to take from it, for me, technique always serves feeling. But once a piece leaves my hands, I find myself hoping people notice the arrangement, the structure, the architecture of the harmony. As for the emotion, I only hope one particular person sees it. Maybe it’s a trace of embarrassment, or maybe it’s simply that songwriting for me, is throwing my feelings into the air… and, while I’m at it, letting the prog arrangement look a little cool.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyMoonlitGardenIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-03.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "\"Moonlit Garden\" is a lullaby written for the night.",
      "It belongs to Ipomoea alba, yet it arrives in a completely different form. Not with the sharp edges of prog metalcore, and not with violent emotional surges, but with a clear, gentle softness.<br />Moonlight in blue violet tones, tinted with the faintest blush of pink.",
      "While writing it, I kept returning to one image:<br />“In the night, each flower I plant is an emotion from a moment when I thought of him.”",
      "At first, these flowers were intense, an unbearable sadness, bitterness, resistance to his leaving. Over time, they softened into quieter feelings.",
      "A mild, persistent care, occasional gratitude, and when I looked back again, a trace of dislike tangled in with everything else.",
      "I buried those emotions quietly in the soil, and in the end they grew into a garden no one could see, one that exists only inside the night. In reality, my garden at home has never had flowers at all, so this garden is entirely abstract. A private landscape imagined into being.",
      "The song is light and clean, but the emotion stays sharply defined. Clean guitar in a gentle mixed time signature gives the melody a particular emptiness, something you can hear, yet can’t quite hold onto, like thoughts that return again and again, never fully released. It’s a rhythm that almost disappears, and yet leaves its full weight behind.<br />And a small frustration: at the time I was carrying my bass and couldn’t bring my guitar to uni, so the 700pounds Ibanez I bought on the spot never quite produced the harmonics I wanted:(",
      "Although the song points to the same person as the rest of the series, “Moonlit Garden” is almost the gentlest piece I’ve written. It isn’t sharp, and it isn’t an accusation. Instead it’s a kind of understanding that only appears at night, after so many emotions, finally worn down by time into something quiet.",
      "In the final electric piano section, I brought back a motif from Ipomoea alba. In that moment, the feeling is both an echo and a regret. Lifting something unspeakable from deep inside, and then placing it softly back into the night. There is a slight unwillingness to let go, but it settles, in the end, into a small, downward leaning calm.",
      "It’s like a whisper sung from the edge of memory.<br />A song written to help you fall asleep, yet one that makes you not want to.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applySiltIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-05.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Yu” is a damp space in deep green.",
      "It smells like mildewed moss and old wood releasing its humidity in the rainy season, everything gently covered by the sound of rain. A drizzle within green, an atmosphere suspended somewhere between haze and decay.",
      "For a long time, the working filename of this song was simply yu (since I didn't decide which chinese word to use). The initial idea came from the Japanese word 憂い (urei), a kind of melancholy with summer humidity in it, something I never felt the Chinese character for “gloom (pronounced as yù)” could fully hold. And yu also naturally overlaps with the sound and imagery of rain (in chinese rain is yǔ).",
      "As I began writing the piece in earnest, the feeling gradually became more accumulative, more like something gathering and settling. That is why I ultimately chose the title “淤(yù)” (bruise / pooled, stagnant). The thoughts that pile up in the deep green rainy season of early summer are like bruises that return on the body again and again. They do not hurt, yet they cannot be ignored, not sharp, but marked by traces that refuse to fade.",
      "The original inspiration was simple, just a kind of “low-resolution humidity.” A hoarse recording quality, an old-footage texture, something that makes you feel you could almost smell the dampness through the image. This song was written to capture that sensation, it does not depict a real place, does not belong to any memory, and does not carry a private story. It is closer to an air that can be felt. The imagery is only matter corresponding to emotion, wet, cold, soft, decaying.",
      "Unlike many of my other works, which tend to carry personal intention and a concrete subject, “Yu” is almost entirely non private. It stands largely independent from the Ipomoea alba series. Although there is a slight overlap in where the inspiration comes from, I deliberately did not fold it into that system.",
      "It is the kind of damp, cold air that smells unmistakably of rain.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyHakoniwaIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-07.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "\"Hakoniwa\" is, without exaggeration, the best composition I've ever written (or, best melody written by me). It is a song built out of white and a faded, pale yellow, the colour of paper itself.",
      "The Chinese lyrics here are not a translation. I actually wrote two complete sets of lyrics in two languages, matched line by line in structure and meter. Among all my works, this one carries the gentlest and most tender warmth. It isn't exactly sad, it's a softness that flows quietly, almost soundlessly.",
      "The song was born in my first autumn at uni, not long after I turned eighteen. There was a trace of condensation on the window, the wind felt mild, and my emotions matched that atmosphere, gentle, slightly sentimental, quiet, but not sorrowful.",
      "Its earliest title was \"Residual.\" At the time, I imagined \"what remains\" after an intense outpouring before adulthood, the amount left after something has been filtered away. But inside me there was always a small hakoniwa, a miniature enclosed garden holding faded memories, scattered points of light, and calm, muted colors. Phrases in the lyrics like \"faded memories\" and \"fragments casually put away\" faintly echo the emotional world of Ipomoea alba, yet this song also feels like a new beginning.",
      "There is an unobtrusive but important predecessor, \"Hakoniwa\" began as a rework of a piece I wrote in early 2021, \"Hypohyphnotic.\" At first, I thought I simply wanted to revisit an old work and make it more mature. But in the end I only kept the chorus harmonic progression and structure, and I carried over the entire interlude., everything else was discarded. Once I truly started writing, I realized I could no longer return to the original emotional state. Hypohyphnotic belonged to another phase, another texture, while my mind at that time had become lighter, softer, and clearer. I understood that if I kept following the old path, the song would never grow into what it wanted to become.",
      "Musically, the first half is piano alone, like moisture settling gently when you close your eyes. In the chorus, clean guitar enters, making the emotion brighter yet still weightless. After the interlude, acoustic guitar, drums, and bass gradually unfold, giving the hakoniwa a real pulse. The second chorus becomes a full prog metalcore arrangement, yet it remains gentle rather than sharp, more like a natural expansion than an impact. After the solo, it returns to sunlit piano, which feels, to me, like the ideal ending.",
      "One detail I find almost funny now is that, I wrote \"Hakoniwa\" before I owned a 7string, and at a time when I barely knew how to play guitar. So the MIDI fake guitar in the demo sounds genuinely rough to my ears today. Still, whenever I look back, I feel it remains my strongest composition since I started writing music in 2020. That's why I've long planned to record the guitars properly and do a real mix (something I'll be doing soon). I even drafted a non-prog version where acoustic guitar drives the chorus rhythm, more like a dusk coloured hakoniwa, and I'll most likely finish it in the future.",
      "\"Hakoniwa\" doesn't belong to any series, but it carries a faint afterglow from Ipomoea alba. It is a small song about softness, about the quietness and gentle sensitivity of early autumn.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyHakoniwaLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-07.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["雨が降っているような", "浅い窪みに隠れていた", "もう夕日の色は見えない"],
        en: [
          "As if it were raining,",
          "I was hiding in a shallow hollow,",
          "the colour of sunset",
          "is already out of sight.",
        ],
      },
      {
        zh: ["枯れて入れ替わる花", "片隅に放置されていた", "秋の朔に踏み出した"],
        en: [
          "Flowers wither, replaced again and again,",
          "left abandoned in a corner.",
          "Stepping forward",
          "on the first day of autumn,",
          "over fallen leaves.",
        ],
      },
      {
        zh: ["色の重なり合い、曇った玻璃の反射", "カメラの光で振り返ったこと", "夜明け前の輪廓に縋りついていた"],
        en: [
          "Layers of colour,",
          "the reflection on fogged glass,",
          "what I looked back on",
          "in the flash of my camera.",
          "Before dawn,",
          "I clung to that outline,",
          "stubbornly, with my eyes closed.",
        ],
      },
      {
        zh: ["羽よりも軽い心臓", "重くて消えていく事", "感性は水面に浮かんていた"],
        en: [
          "In a heart lighter than a feather,",
          "things that feels heavy slowly fade away.",
          "Sensitivity floated",
          "on the surface of water.",
        ],
      },
      {
        zh: ["色褪せた人たちは", "ほこりのようにどうでもいいんだ", "できると思ったことも"],
        en: [
          "Faded people are just",
          "like dust, they hardly matter.",
          "Even the things",
          "I once thought I could do.",
        ],
      },
      {
        zh: [
          "湿った満開の弁、箱庭の淡い言葉",
          "溶けた唄と冗長な刹那",
          "色の重なり合い、曇った玻璃の反射",
          "夕日に照らされた眠い顔から",
        ],
        en: [
          "Moist petals at full bloom,",
          "the pale words inside this miniature garden;",
          "songs that dissolve,",
          "and an overlong instant behind them...",
          "Layers of colour again,",
          "the reflection on fogged glass,",
          "from the last light of the sun,",
          "until it melted",
          "into my fingertips.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = [
      "空中零星雨点似乎飘落",
      "隐匿于浅洼倒影 反射落寞",
      "已经看不到夕阳的颜色",
      "",
      "时而枯萎后更换的花朵",
      "日日积攒后碎裂 歇于角落",
      "踩着树叶 脚步踏向秋末",
      "",
      "色彩的重叠后 雾气围绕",
      "模糊玻璃反射的夜色",
      "在我镜头下光辉中 谨默的那一刻",
      "黎明到来以前 那个轮廓",
      "闭上眼睛 如此执拗着",
      "",
      "相比羽毛更轻的心脏里",
      "似而沉重却缓慢 消失殆尽",
      "所谓的感性于水面浮起",
      "",
      "已经褪色了许久的回忆",
      "大部分碎片已然 随意收起",
      "即使那时以为自己可以",
      "",
      "潮湿而满开的花瓣",
      "箱庭之中那清淡的话语",
      "溶解的歌谣与那背后冗长的刹那",
      "色彩的重叠后 雾气围绕",
      "模糊玻璃反射的夜色",
      "被夕阳余晖洒下融化在我指尖那一刻",
    ].join("<br />");
  }

  function applyHonkakuMysteryIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-08.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Honkaku Mystery” is a high speed rock/metalcore track, a tribute to the mood of narrative misdirection (and honestly, I rarely write something this fast). On the surface it feels like a clean, efficient investigation, underneath, it’s a reverse interrogation of the self and of memory.",
      "Here, deduction is treated as a posture, not to obtain an answer, but to see clearly what happens when the truth becomes ugly enough for reason itself to fracture.",
      "The “he” in the song is more like a part of my own body, yet he could also be anyoneme, the kind of person who believes the world can be explained, that causality can be connected into a line, that an ending will always arrive. But when he strings clue after clue together with red thread, that thread is both the red line on a detective board and the red line of causality. The tighter it pulls, the closer it gets to “the truth”, and the sooner logic collapses. Because the truth is too ugly, to the point where no elegant structure can keep wrapping it up.",
      "“A room surrounded by screens” is a space enclosed by memory, imagination, information, and self-projection, an absolute information cocoon. Thinking you’re investigating, you’re actually sinking deeper into your own screens and old shadows, thinking you’re unraveling the knot, you’re only repeatedly confirming conclusions that have already been written by emotion.",
      "The cruelest part is that even when the truth is uncovered, nothing follows.",
      "The “god who does not judge” points exactly to that emptiness: no verdict, no finale, no fair gavel coming down. So the laugh at the end isn’t relief, it’s a cold laugh. When deduction reaches its limit, what remains is only the most ordinary human circuitry, habitual awareness and habitual thinking, still running in the ruins.",
      "Musically, the song chooses a more direct drive: fast, pressing, relentless. In the middle, mixed time signatures cut in like editorial jump cuts, making the narrative feel like rapid scene switches. And my favorite parts, the intro and the opening of the chorus, are the evidence the song flashes right from the start, like a camera strobe aimed straight at the pupil on first contact.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyHonkakuMysteryLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-08.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["逃げる理由ない", "目的を否めないはできない", "スクリーンで囲まれた部屋", "行列は跡を描く"],
        en: [
          "No reason to hide,",
          "No reason to deny.",
          "A room surrounded by screens,",
          "A procession sketches its trail.",
        ],
      },
      {
        zh: ["台本通りの出演", "罪と罰を書く", "夜街道の煙", "赤い線で結ばれinvestigation"],
        en: [
          "An appearance, exactly as the script demands,",
          "Writing down crime and punishment.",
          "Smoke along the night road,",
          "tied together with red threads, investigation.",
        ],
      },
      {
        zh: ["彼の瞼の裏に浮かんだ底流は", "まだ終わりを迎えない"],
        en: ["The undercurrent that rose behind his eyelids", "still hasn’t reached its end."],
      },
      {
        zh: [
          "（散った)",
          "砂ぼこりや落ち葉とともに",
          "無秩序な瞳が朱に染まる",
          "日々築いてきた彼のロジックリンクは崩れた",
          "「ようやく触れたような気がした」",
          "ありふれた意識過程だけ",
          "過去になった後",
          "彼は自分のため息を聞こえた",
        ],
        en: [
          "(Scattered)",
          "With dust and fallen leaves,",
          "disordered eyes stain themselves vermilion.",
          "The logic-links he built day by day collapsed.",
          "“I felt like I finally touched it.”",
          "Nothing left but an ordinary process of consciousness,",
          "after it all became the past,",
          "he could hear his own sigh.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["セピアの映画を追いかけた", "醜いをきれいな言葉で隠した", "彼の名前もことも全部", "ついに失いかけた"],
        en: [
          "Chasing after a sepia film,",
          "hiding the ugly with beautiful words.",
          "His name, and everything about him",
          "at last, he was close to losing it all.",
        ],
      },
      {
        zh: ["裁かれない神の背後と", "その日から停滞した時間", "灯台の光と蒼い空間", "彼の無意識の顔だけが"],
        en: [
          "Behind the god who never judges,",
          "and the time that stagnated from that day on,",
          "the lighthouse beam, the blue hollow of space,",
          "and only the face of his unconscious.",
        ],
      },
      {
        zh: [
          "砂ぼこりや落ち葉とともに",
          "無秩序な瞳が朱に染まる",
          "日々積み重なってた彼の違和感は壊した",
          "「ようやく理解できた気がした」",
          "ありふれた思索回路だけ",
          "過去になった後",
          "彼は笑った",
        ],
        en: [
          "With dust and fallen leaves,",
          "disordered eyes stain themselves vermilion.",
          "The unease he had stacked up day by day shattered.",
          "“I felt like I finally understood.”",
          "Nothing left but the ordinary circuits of thought,",
          "after it all became the past,",
          "he laughed.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyWillowIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-14.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "\"Willow\" was written in a spring just after something had ended.",
      "It began with a clean guitar intro written by Ameria. The first time I heard that melody, I got goosebumps immediately, and that was what drew me in, little by little, until I took on the overall arrangement and production (everything except the guitar and vocals).",
      "The title \"Willow\" wasn’t chosen by me, but in my own reading, it suggests a scene:<br />a mountain forest wrapped in heavy fog, someone still lingering beneath the willow trees, still waiting.<br />A farewell that has already happened, and yet refuses to fully dissipate.",
      "This song isn’t about rewinding the past or trying to hold on.<br />It is more interested in what comes after, how a person stays where they are, and continues to watch the seasons change, even when everything has already ended.",
      "Even when people stop speaking, even when memory is destined to fade, there can still be a quiet wish inside you, that the other person will be doing well.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyWillowLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-14.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: [
          "霧中、一葉の緑が時雨をはらっていた",
          "その引継ぎ線の延長も、 失われたものも",
          "いずれは残された記憶から消えてしまう",
        ],
        en: [
          "In the mist, a single leaf of green brushed away the passing shower.",
          "The continuation of that handover line, and everything we lost,",
          "one day, all of it",
          "will fade from the memories that remain.",
        ],
      },
      {
        zh: ["もう断ち切れない思いと僕の", "溢れる心配事", "灰のついた手紙は数行しかないのに", "重い"],
        en: [
          "There are feelings I can no longer cut away,",
          "and worries that keep overflowing.",
          "A letter dusted with ash, only a few lines,",
          "yet unbearably heavy.",
        ],
      },
      {
        zh: [
          "そんな輝かしい日々が今の僕には",
          "眩しすぎる",
          "秘めた願いと迷いの目、",
          "前の景色がぼやけた",
        ],
        en: [
          "Those radiant days, to me now,",
          "are far too bright to look at.",
          "A hidden wish, and eyes caught in hesitation,",
          "the scene in front of me blurred.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["終わりが来ても、恩讐は終わても", "やがては意味になる", "どうしようもないことで泣いたり", "待ったりしている"],
        en: [
          "Even when an ending comes, even when old debts and grudges end,",
          "someday it will become meaning.",
          "And still, I find myself crying",
          "over things I can’t undo,",
          "still waiting.",
        ],
      },
      {
        zh: ["相変わらずここで君のいない", "春を迎えなければない", "どうしてもこのような結末を", "迎えるのなら…"],
        en: [
          "Just the same, I have to stand here",
          "and welcome a spring without you.",
          "If we were always meant",
          "to arrive at an ending like this…",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyYorugaoIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-15.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Yorugao (Moonflower)” is the most intense, the most stubborn song I’ve written.",
      "It is a saturated deep blue: a record of that night, an empty street under streetlights, a heart rising to the surface, the heat burning in my palm, and everything that never had time to be sorted out, yet undeniably happened.",
      "For me, “Yogao” carries two layers of meaning. One is a face lit up by streetlights at night (which is the direct translation). The other is Ipomoea alba, the moonflower image, because “moonflower” in Japanese is also 夜顔. In this song, the two meanings overlap like an echo wrapped in darkness: it doesn’t need to be explained, but you can still hear the weight of what it holds. The recurring Ipomoea alba melodic motif stays here quietly, without making a scene.",
      "I’m genuinely afraid to look back at this song, every line of its lyrics, even the long memories I wrote down on purpose back then. At this point it’s not even embarrassment or shame anymore.",
      "But I have only one conclusion about the version of me that night: she was brave, and I don’t regret it.<br />My decisiveness, my willingness to act, is what I like most about myself. And “Yogao” simply left that bravery, and that obsession that can’t be brushed off lightly, inside a deep blue night.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyYorugaoLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-15.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["暗い街灯の下、無人の街に", "浮かぶ心臓がそこにあるのだ", "あの冬夜この世界は", "二人きりのようでした"],
        en: [
          "Under dim streetlights, in an empty street,",
          "a floating heart is right there.",
          "That winter night, this world",
          "felt like it belonged to only the two of us.",
        ],
      },
      {
        zh: ["深い黒に目をやった時", "君の眼はあたしだけを見つめた", "その走り続ける夜に", "月光さえも無視された"],
        en: [
          "When I looked into the deep black,",
          "your eyes were fixed on me alone.",
          "In that night that kept on running,",
          "even moonlight was ignored.",
        ],
      },
      {
        zh: ["「あきらめればいいんだ」", "大人たちに笑われても", "あたしもここへ来たじゃないか"],
        en: [
          "“Just give up.”",
          "Even if those people laughed at me,",
          "I still came all the way here, didn’t I?",
        ],
      },
      {
        zh: ["心が苦しくても、 愛を描きたい", "「 寒くない、あたしの手を握ってるから」", "暗い道見えないがそれほど重要ではない", "そのささやき声を覚えていればいい"],
        en: [
          "Even if my chest hurts, I want to depict love.",
          "“I’m not cold, because you’re holding my hand.”",
          "The dark road is hard to see, but that isn’t what matters.",
          "As long as I can remember your whispered voice, it’s enough.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["先のこと気づかないふりをしてた", "君が想像する景色を見たい", "このまま、一緒に遠くへ", "逃げられたらいいな"],
        en: [
          "I pretended not to notice what comes next.",
          "I want to see the scenery you imagine.",
          "Like this, together, farther away,",
          "if only we could run.",
        ],
      },
      {
        zh: ["気づくたびに君はあたしから遠ざかってく", "あの夏から嫌いなものだけが増えてる"],
        en: [
          "Every time I realize it, you drift farther from me.",
          "Since that summer, only the things I hate have multiplied.",
        ],
      },
      {
        zh: ["心が苦しくても、 愛を描きたい", "大人になるあたしどうすればいいか", "白昼夢を見てるあたしも実は", "終わらせなければならないことを知ってる"],
        en: [
          "Even if my chest hurts, I want to depict love.",
          "As I grow up, what am I supposed to do?",
          "Even me, lost in a waking daydream,",
          "knows there are things I have to end.",
        ],
      },
      {
        zh: ["「 さらば、夏に咲くヨルガオ」と言えたら、嗚呼", "もう君がそばにいられなくても", "これから誕生日を忘れてしまうことも", "あたしが許してくれるでしょう"],
        en: [
          "If I could say, “farewell—to the yorugao that blooms in summer,” ah—",
          "even if you can’t stay by my side anymore.",
          "Even if you start forgetting my birthday from now on,",
          "I’ll probably forgive you anyway.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyMortalFrameIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-16.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Mortal Frame” is a song written for the self that is present, here, now.<br />It isn’t aimed at some transcendent soul, but at a body pinned inside reality, a person who gets tired, who bluffs, who holds themselves up with sheer posture.",
      "Musically, it drives forward in mixed meters. The rhythm sways and staggers at the same time, sharp, clean, almost effortless on the surface, with a hint of nonchalance. The entire track is built on my favorite guitar riff, using it as a spine to push the narrative to the very front. Moving through crowds, whispering a confession to the glass, it’s that feeling of knowing it’ll sound embarrassingly sentimental the moment you say it, yet still needing to leave a scratch where the heart is. (And as a small note: the photo in my music portfolio, the one with the white headless guitar, was taken when I played this song at school.)",
      "In a sense, it’s also a spiritual sequel to Moonlapse. The line “I think we’ll never meet again,” returns, not only the words, but the melody itself, kept intact.",
      "More than anything, it feels like a reply I’m giving to myself: to that pose of being good at pretending, good at looking lucid, yet often failing to understand other people (and not really understanding myself, either), to a way of living that writes emotions into nightfall, and into the work. It’s satire, and it’s confession, a song that sounds cool, but keeps its stubbornness hidden in the dark.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyMortalFrameLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-16.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["「そんなこと、 理解できない僕はずっとそうだった」と言った", "彼は「 それでもいいんだ」と言う。", "続けようとしたら　突然崩れた"],
        en: [
          "“I was always like that，",
          "the kind of me who couldn’t understand things like that,” I said.",
          "He says, “That’s fine.”",
          "And when I tried to keep going, it suddenly collapsed.",
        ],
      },
      {
        zh: ["いつも他人のことを笑っている", "自分の立場では理解できない感情", "「捨てれば完璧になれる」", "僕はこう思う"],
        en: [
          "Always laughing at other people,",
          "emotions I can’t understand from where I stand.",
          "“If I throw it away, I can become perfect.”",
          "That’s what I think.",
        ],
      },
      {
        zh: ["10月、ロンドン、人々", "地平線の内側に", "昔の影をたどって", "誰も救わないから"],
        en: [
          "October, London, people—",
          "inside the horizon,",
          "tracing the shadows of the past,",
          "because it saves no one.",
        ],
      },
      {
        zh: ["花びらがいっせいに落ちる", "アイロニーも飽和した", "曙光が散る", "フィクションの角度から"],
        en: [
          "Petals fall all at once.",
          "Even irony has saturated.",
          "Dawnlight scatters—",
          "from the angle of fiction.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["傘に落ちる雨粒のように", "5時にはもう日が暮れた冬のなか", "「 永遠に会えないと思う」", "脳裏をよぎる"],
        en: [
          "Like raindrops hitting an umbrella,",
          "in a winter where by five o’clock it’s already dark,",
          "“I think we’ll never meet again,”",
          "flashes through my mind.",
        ],
      },
      {
        zh: ["次から次へと僕の頭上を", "光が通り過ぎて行く", "自由も 真実も 平和も 愛も", "せめて維持しよう、 内なるもの"],
        en: [
          "One after another, above my head,",
          "light keeps passing by.",
          "Freedom, truth, peace, love—",
          "at least let me keep them alive, the inner things.",
        ],
      },
      {
        zh: ["時間と現実が重なる", "触れられなくなる", "その輪郭", "ニル・アドミラリとヴァニタス"],
        en: [
          "Time and reality overlap.",
          "That outline becomes untouchable—",
          "its contour:",
          "Nil Admirari and Vanitas.",
        ],
      },
      {
        zh: ["「これじゃ結局 、意味がないじゃないか」", "こんなことを考えていた", "大量の丸薬を手に注いだ", "その時、その時", "君のことを思い出した"],
        en: [
          "“In the end, this just means nothing, doesn’t it?”",
          "I kept thinking that.",
          "I poured a mass of pills into my palm.",
          "And then—right then,",
          "I remembered you.",
        ],
      },
      {
        zh: ["実はあの夏から自分の感情が", "無意識に再び拾い上げられた", "コントロールできないなんて大嫌い"],
        en: [
          "Truth is, since that summer, my emotions",
          "have been unconsciously picked up again.",
          "I hate it—",
          "I hate not being able to control it.",
        ],
      },
      {
        zh: ["あの日僕は劇場の前でじっとしていた", "真夜中、 街灯 、ガラスに告解", "I‘ll tell you someday, about the story that came from despair"],
        en: [
          "That day I stood still in front of the theater.",
          "Midnight—streetlights—",
          "a confession to the glass.",
          "I’ll tell you someday, about the story that came from despair.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyMoonlapseIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-17.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Moonlapse” was born in the early stage of my progressive metalcore writing.",
      "Back then, I had just begun experimenting with merging a more aggressive arranging language with personal narrative. Many of my techniques weren’t fully matured yet, but the emotional output was unusually saturated, almost overflowing.",
      "The earliest concept can be traced back to the spring of 2022. At the time, the lyrics leaned strongly toward stream of consciousness writing, orbiting an image of “untouchable moonlight.” That emotion wasn’t built on real interaction, it was a one-way projection, an almost fictional outline of feeling. For that reason, the song’s earliest title pointed directly to a concrete subject, but as time passed, that directness gradually faded.",
      "Before the piece was finished, I once invited a close friend at the time to feature a guitar solo. That decision shifted “Moonlapse” from a purely solo narrative into a collaborative work marked by shared traces. But as real life relationships changed, that collaboration was ultimately not kept, and another musician’s performance took its place. So on a sonic level, “Moonlapse” carries interpersonal trajectories from different phases: some melodies come from the original imagination, while some sounds belong to later interactions.",
      "This structural replacement slowly pulled the song away from the category of “written for someone.”<br />It became more like a strip of film, repeatedly overwritten, re-recorded, and developed over time.",
      "If I had to describe the colour of this song, it would be closest to a plum-purple hue: neither the warm palette typical of romance narratives, nor a fully settled coldness, but a blended tone that was once intense and has since been darkened by time.",
      "That colour holds both the vividness of early emotion and the shadowed layers left by later shifts in relationships. It doesn’t point to a single, specific memory, rather, it’s a composite spectrum formed by multiple time-slices overlapping.",
      "In terms of craft, “Moonlapse” isn’t my most technically polished work. Instead, it keeps obvious early-stage fingerprints, like guitar parts that are inexplicably fast, and some very odd breakdown.",
      "But precisely because of that, it captures a kind of raw state that’s hard to reproduce. To me, “Moonlapse” is more like a time specimen sealed in sound. It records not only a relationship, but also the way I wrote in that period, the structure of my emotions, and the constantly shifting sense of distance between people.",
      "When the melody plays again, what it awakens may not be a specific person,<br />but that era of making itself, still carrying the residual warmth of plum-purple.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyMoonlapseLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-17.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["「 永遠に会えないと思う」", "何かが胸にあふれた", "あの日、そんな言葉に打たれた", "それでいい"],
        en: [
          "“I think we’ll never meet again”",
          "Something overflowed in my chest.",
          "That day, those words hit me,",
          "and that was enough.",
        ],
      },
      {
        zh: ["記憶ができて消える", "花びらのようなフィルムに残る", "天井から落ちる光は…"],
        en: [
          "A memory forms, then disappears—",
          "still leaving itself on film,",
          "like falling petals.",
          "The light dropping from the ceiling…",
        ],
      },
      {
        zh: ["夕陽なのか夜明けなのか", "時間も分からず、すべてが曖昧になる"],
        en: [
          "Is it sunset, or is it daybreak?",
          "I can’t even tell the time—",
          "everything turns vague.",
        ],
      },
      {
        zh: ["君はまだ光に逆らって屋上に立っている", "（私の夜になった）", "住む世界が違うと触れられないのか"],
        en: [
          "You’re still standing on the rooftop, defying the light.",
          "(you became my night.)",
          "If we live in different worlds,",
          "does that mean we can’t touch—can’t reach?",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["「カラスの群れに隠れた顔」", "時間も分からず、すべてが曖昧になる"],
        en: [
          "“A face hidden within a flock of crows.”",
          "I can’t even tell the time—",
          "everything turns vague.",
        ],
      },
      {
        zh: ["思えばそれは私の秋の最初の月光だった", "もう君のほかには何も見えない"],
        en: [
          "Thinking back, that was the first moonlight of my autumn.",
          "Now I can’t see anything",
          "except you.",
        ],
      },
      {
        zh: ["何度も繰り返して", "また遠ざかっていきそうだった", "(それはもう帰れない", "(あの夏の悔しさを忘れたいのに", "まだ納得しない", "でもしょうがないわね"],
        en: [
          "Over and over,",
          "it kept repeating—",
          "and it felt like you were about to drift farther away again.",
          "(There’s no going back now.)",
          "(Even though I want to forget the regret of that summer,)",
          "I still can’t accept it.",
          "But… it can’t be helped, can it.",
        ],
      },
      {
        zh: ["最悪の場合はこれだろう", "当たり前", "消える、消える", "一緒に知らん顔をしよう"],
        en: [
          "In the worst case, this is what it is—",
          "obvious, ordinary.",
          "Fading, fading—",
          "let’s pretend together",
          "that we never knew.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyAgnyLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-19.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["被度量的抗争的生命", "仿佛我的一切都沦为笑柄", "被阻隔的紧绷的神经", "仿佛转眼间就被吞噬殆尽"],
        en: [
          "A life measured in resistance,",
          "as if everything I am",
          "has turned into a joke.",
          "Nerves stretched tight, kept behind a barrier,",
          "as if in the blink of an eye",
          "they’re swallowed whole.",
        ],
      },
      {
        zh: ["只是被定义的错误存在", "偏见也始终在", "全缠绕进绷带", "正当化的谬误早已不意外", "嘲笑着我吧在看不见的地带"],
        en: [
          "Just an existence labeled “wrong.”",
          "The bias never leaves.",
          "All of it wrapped into bandages.",
          "A justified fallacy, nothing new.",
          "Go ahead, laugh at me",
          "from where you can’t be seen.",
        ],
      },
      {
        zh: ["黑色的墙壁", "无尽的压抑", "渴望着战斗", "武者般颤抖", "反复咀嚼着", "早已厌倦了", "溢满而出的", "情绪快要沸腾"],
        en: [
          "Black walls.",
          "Endless pressure.",
          "Craving a fight,",
          "trembling like a warrior.",
          "Chewing it over, again and again,",
          "I’m already sick of it.",
          "The overflow,",
          "my emotions are about to boil.",
        ],
      },
      {
        onlyEn: [
          "With relief, with humiliation, with terror,",
          "he understood that he also was an illusion,",
          "that someone else was dreaming him.",
        ],
      },
      {
        zh: ["接着舞吧", "在属于我的丧钟敲响之前", "以燃烧一般的模样", "刻下我的悲鸣", "若能逃离这可笑的悲剧", "囚于这副肉身中我的灵魂", "会在你的凝视下消陨吗"],
        en: [
          "So dance.",
          "Before my own death bell rings.",
          "Burn like flame,",
          "carve my scream into the air.",
          "If I could escape this ridiculous tragedy,",
          "this soul imprisoned in flesh,",
          "would it vanish",
          "under your gaze?",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: [
          "睁开双眼后有什么黑色的东西流出来了似乎想将我淹没",
          "来自谁的污言秽语渗入了皮肤又让我的存在感到了不安吗",
          "“看不见未来啊”听到我这样说以后你轻蔑地笑了吧",
          "于是我想 如果能拿起刀的话又要刺向 谁的方向",
        ],
        en: [
          "When I open my eyes, something black pours out,",
          "like it wants to drown me.",
          "Whose filthy words seeped into my skin",
          "and made my existence feel unsafe again?",
          "“I can’t see the future.”",
          "You heard me say it,",
          "and smirked, didn’t you?",
          "So I think:",
          "if I could pick up a knife,",
          "who would I stab,",
          "and in what direction?",
        ],
      },
      {
        zh: ["罪恶的腐朽", "生锈的伤口"],
        en: ["Rotting sin.", "Rusting wounds."],
      },
      {
        zh: ["再次舞吧", "在属于我的命运降临之前", "以象征性的反抗", "留下我的呻吟", "若能逃离这可笑的悲剧", "囚于这副肉身中我的灵魂", "会在你的祈祷中重塑吗"],
        en: [
          "Dance again.",
          "Before my fate comes down.",
          "A symbolic rebellion,",
          "leave my groans behind.",
          "If I could escape this ridiculous tragedy,",
          "this soul imprisoned in flesh,",
          "could it be remade",
          "inside your prayer?",
        ],
      },
      {
        zh: ["是否被定义为错误就该满身伤痕", "残忍地将所有封存在最后的黄昏"],
        en: [
          "If being defined as “wrong” means I must be covered in scars,",
          "then cruelly seal it all away",
          "into the last dusk.",
        ],
      },
      {
        zh: [
          "接着舞吧",
          "在属于我的结局到来之前",
          "穷尽徒劳的挣扎",
          "再次舞起来吧",
          "在只有我扭曲的人潮之中",
          "跳起荒诞的舞吧",
          "若能结束这可笑的悲剧",
          "用刀刃刺向自己发出悲鸣吧",
          "让我拥抱你作为应有的结局",
          "在谢幕的掌声里宽恕我吧",
        ],
        en: [
          "So dance.",
          "Before my ending arrives.",
          "Spend every last futile struggle,",
          "dance again.",
          "In the crowd where only I am twisted,",
          "dance an absurd dance.",
          "If this ridiculous tragedy could end,",
          "then let the blade turn on myself,",
          "let a scream break open my throat.",
          "Let me hold you,",
          "as the ending I deserve.",
          "In the applause after the curtain falls,",
          "forgive me.",
        ],
      },
      {
        zh: ["无法逃离的悲剧", "无法违背的命运", "无法抗争的生命", "无法触碰到的你"],
        en: ["A tragedy I can’t escape.", "A fate I can’t defy.", "A life I can’t fight.", "You...untouchable"],
      },
      {
        zh: ["你抬头看着我", "请抬头看着我", "不要离开视线", "直到我颤抖着", "化为雕塑"],
        en: [
          "Look up at me.",
          "Please, look up at me.",
          "Don’t let your eyes leave",
          "until I’m trembling,",
          "until I turn to stone.",
        ],
      },
    ];

    function renderMixedBlocks(blocks) {
      return blocks
        .map(function (block) {
          if (Array.isArray(block.onlyEn)) {
            return block.onlyEn.join("<br />");
          }
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderMixedBlocks(part1Blocks);
    part2Text.innerHTML = renderMixedBlocks(part2Blocks);
  }

  function applySupernovaIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-20.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Supernova” was written on the eve of my 17th birthday, a piece born out of adolescent confusion. It doesn’t belong to any narrative series, and it predates the emotional throughline that later unfolds in Ipomoea alba. If anything, it feels like an internal collapse before an emotional universe had even formed.",
      "The entire song is built inside a highly fictionalized mental space. The lyrics point to no specific person, instead, they lean toward a self-projection, an “other side” created by self-splitting: an inner presence that wants to draw close, yet remains impossible to understand.",
      "The “clock tower” functions in the same way. It isn’t a real location, but a symbolic structure for time, existence, and isolation. Beneath that clock tower that doesn’t truly exist, the individual is forced to confront their own smallness and weightlessness on a vast, cosmic scale.",
      "Structurally, the track advances through mixed time signature, one of the rhythmic languages I strongly favored in my early writing. The shifts of tension between sections, and the arc of emotional swelling, in a way echo the imagery implied by the title “Supernova”: eruption → expansion → collapse.",
      "In the second half of the arrangement, there is a section that deliberately nods to the atmosphere of “Bering Sea” by Inchaos—a tribute-like imitation. After the release, the band’s guitarist, Aiten, mentioned that he liked the track and even asked for the multitracks to attempt a remix. For me at the time, it became an unexpectedly precious memory.",
      "Overall, “Supernova” carries an extremely deep-blue texture. Its emotion doesn’t point to a concrete event, but to an existential pressure, swelling, expanding, and dissolving. The seemingly extreme lines are closer to a literary rendering of adolescent inner tension, rather than a literal transcription of any real-life scene.",
      "If many of my later works are about “losing someone,”<br />then “Supernova” records something earlier: how, before anyone else enters the story, a person first has to stare into their own emptiness.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applySupernovaLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-20.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["広大な宇宙に比べて", "自分が何なのかわからない", "直面したくない", "挫折感に包まれる"],
        en: [
          "Compared to the vast universe,",
          "I don’t even know what I am.",
          "I don’t want to face it,",
          "I’m wrapped in failure.",
        ],
      },
      {
        zh: ["あの予期しないこと", "後悔だらけだった", "昨日と同じ", "何も知らない灰色"],
        en: [
          "That unexpected thing,",
          "nothing but regret.",
          "Same as yesterday,",
          "a grey that knows nothing.",
        ],
      },
      {
        zh: ["時計台に私はたまには夜明けの青に染まる", "夢から覚めたような", "邪魔な感情をすべて消したい", "暗闇で一人になるまで"],
        en: [
          "At the clock tower, sometimes I’m stained",
          "in the blue of dawn,",
          "as if waking from a dream.",
          "I want to erase every intrusive feeling",
          "until I’m alone in the dark.",
        ],
      },
      {
        zh: ["雑踏から離れる", "静かに漂っている", "音もなく", "夜空に隠れている"],
        en: [
          "I step away from the crowd,",
          "drifting quietly,",
          "without a sound,",
          "hiding in the night sky.",
        ],
      },
      {
        zh: ["切に闇を破りたい", "できないと気づいたときに", "飽和していく", "ものが大嫌いだな"],
        en: [
          "I ache to tear open the darkness,",
          "and the moment I realize I can’t,",
          "I start to hate",
          "everything that saturates, that overflows.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["「 時間が命を食べてしまう」", "「 私たちの心を食い荒らす」"],
        en: ["“Time ends up eating life.”", "“It ravages our hearts.”"],
      },
      {
        zh: ["時計台に私はたまには夜明けの青に染まる", "夢から覚めたような", "邪魔な感情をすべて消したい", "暗闇で一人になるまで"],
        en: [
          "At the clock tower, sometimes I’m stained",
          "in the blue of dawn,",
          "as if waking from a dream.",
          "I want to erase every intrusive feeling",
          "until I’m alone in the dark.",
        ],
      },
      {
        zh: ["いつまでたっても自分になれない", "思い出した、きっと君のせいだ", "直らない手癖と終わったパーティー、", "だから、どうか、どうか、どうか殺してくれ"],
        en: [
          "No matter how long it takes,",
          "I still can’t become myself.",
          "I remember now,",
          "it’s probably your fault.",
          "Habits that won’t heal,",
          "a party that’s already over,",
          "so please, please, please…",
          "end me.",
        ],
      },
      {
        zh: ["膨張し、崩れ落ち 、消える"],
        en: ["Swelling, collapsing,", "disappearing."],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyZeroIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-22.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Z (Eclipse) RO.”",
      "This song was born in a state of occluded consciousness.<br />Not a collapse, not an eruption, more like a long silence before light is swallowed, dragged into the interior of shadow and made to echo slowly from within.",
      "The entire work is pure abstract, stream of consciousness narration.<br />No concrete characters, no real-world timeline.<br />It is closer to a celestial space suspended outside reality,<br />cold light, reverberation, and weightlessness.",
      "Tinnitus, elongated vision, consciousness washed and corroded, broken clock hands,<br />these are not events, but states made visible.<br />Like a system error, or like the residual “deviation” left behind after emotion has been standardized.",
      "The recurring words“fragments,” “lens,” “projector”<br />refer to slices of life that are watched, recorded, and archived.<br />Within that structure, value is measured, emotion is calibrated,<br />and the “self” gradually degrades into a replaceable unit.",
      "In the world-setting I wrote at the time:<br />people can disguise themselves;<br />all value can be weighed internally;<br />sunrise does not necessarily mean brightness, and the sun is merely a morning star.<br />Only when we are truly awake does daybreak actually happen.",
      "At the far end of this celestial space stands a giant clock on the moon.<br />The sound of the second hand is amplified without limit.<br />If you could reach it, you could tune time, return to any point.<br />And yet what returns in recurring dreams is not the clock, but the sea.",
      "Dreams always bring a coastline.<br />You can run, you can approach, you can see the color of the waves,<br />but it remains, in the end, like a static background wall.<br />I can never truly enter the water.<br />It is the only image that carries real-world weight,<br />and the deepest echo inside the song.",
      "Structurally, “Z (E) RO” opens into a driving passage with a djent-like texture in its later section,<br />like crossing a threshold, or like the narrative finally falling into something concrete.<br />That melody carries a strong sense of fantasy storytelling; it is the core of the track (and my favorite part).",
      "In the end, everything finishes by returning to zero.<br />Not ending with an answer, but ending by no longer asking.",
      "It is a piece about deviation, occlusion, and self-calibration,<br />an awareness log recorded in the shadow of a celestial body.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyZeroLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-22.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["为什么有些耳鸣", "沉闷的胸口竟逐渐喘不过气", "意识被冲刷腐蚀", "视觉的镜头被拉长的每次"],
        en: [
          "Why do some kinds of tinnitus",
          "make my chest so dull I slowly can’t breathe?",
          "Consciousness gets rinsed, corroded,",
          "and every time the frame of vision is stretched longer.",
        ],
      },
      {
        zh: ["“我们会再见的吧”", "脑海里一直相信着这一句话", "片段中清澈瞳孔", "尝试触碰却恍如隔世的他"],
        en: [
          "“We’ll meet again, won’t we?”",
          "I kept believing that line in my head.",
          "In the fragments, those clear pupils,",
          "I tried to reach him,",
          "yet it felt like another lifetime.",
        ],
      },
      {
        zh: ["刺眼，咀嚼", "覆灭了的那一切"],
        en: ["Blinding.", "Chewed through.", "Everything that was—", "wiped out."],
      },
      {
        zh: ["零星，岁月", "或许已得以忘却"],
        en: ["Scattered.", "The years—", "maybe already forgotten."],
      },
      {
        zh: ["顽固，荒唐", "梦境却逐渐枯黄"],
        en: ["Stubborn.", "Absurd.", "And yet the dream", "keeps turning yellow."],
      },
      {
        zh: ["反刍，遐想", "也有对自己撒谎"],
        en: ["Ruminating.", "Stray thoughts.", "Even lying to myself."],
      },
      {
        onlyEn: ["(I think, I've tried my best.)"],
      },
    ];

    var part2Blocks = [
      {
        zh: ["连渡鸦也飞走了", "日落前昏沉如死寂般的蓝色", "焦虑不安都浮现", "时针表盘摔破碎所以耽搁"],
        en: [
          "Even the ravens have flown away.",
          "Before sunset—",
          "a heavy, dead-silent blue.",
          "Anxiety surfaces.",
          "The clock face shatters—",
          "the hands break, so time stalls.",
        ],
      },
      {
        zh: ["我全都想起来了，在那个梦境里的", "海边总是没办法到达", "那现在就马上奔向那一侧"],
        en: [
          "I remember it all—",
          "in that dream,",
          "the seaside is always unreachable.",
          "So now—right now—",
          "I’ll run to the other side.",
        ],
      },
      {
        zh: ["凋零，偏执", "被浓雾笼罩之时"],
        en: ["Withering.", "Obsession—", "when the thick fog closes in."],
      },
      {
        zh: ["光晕，潮汐", "绽放停滞的花期"],
        en: ["Halo.", "Tides—", "a flowering season", "that blooms and freezes in place."],
      },
      {
        zh: ["呓语，泛滥", "终于找到了答案"],
        en: ["Murmurs.", "Overflow—", "at last, an answer is found."],
      },
      {
        onlyEn: ["(Dawn will only come, when we are all awake.)"],
      },
      {
        zh: ["划过，指尖", "最后一句的再见"],
        en: ["Brushing past, fingertips—", "the final goodbye."],
      },
      {
        onlyEn: ["(I have nothing more to lose.)"],
      },
      {
        zh: ["经过了标准化的一切都变得无比乏味", "在幻灯机的镜头里转身离去做个收尾"],
        en: [
          "After everything gets standardized,",
          "everything becomes unbearably dull.",
          "Inside the projector’s lens,",
          "I turn away and leave—",
          "to make an ending.",
        ],
      },
    ];

    function renderMixedBlocks(blocks) {
      return blocks
        .map(function (block) {
          if (Array.isArray(block.onlyEn)) {
            return block.onlyEn.join("<br />");
          }
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderMixedBlocks(part1Blocks);
    part2Text.innerHTML = renderMixedBlocks(part2Blocks);
  }

  function applyFomalhautLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-23.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["どうしても変えられない時点", "夜明けまでに溶かそう"],
        en: [
          "A point in time that simply can’t be changed,",
          "let’s melt it down before the break of day.",
        ],
      },
      {
        zh: [
          "夕方、冷たい空気が再び私を包む",
          "十一月の夜が私を飲み込みそうだ",
          "短い幻から脱した",
          "こんな人生もいつ終わるかわからない",
        ],
        en: [
          "Evening—cold air wraps around me again.",
          "A November night is ready to swallow me whole.",
          "I wake from a brief illusion,",
          "and still don’t know when a life like this will end.",
        ],
      },
      {
        zh: ["ごめん", "言いたいことが伝わらなかった", "もう伝えられないでしょう", "もう死んでるなんて", "音とか形とか", "両目だけでは何も見えない", "ウィル、もう一度連れて行って"],
        en: [
          "I’m sorry.",
          "What I wanted to say never reached you.",
          "It probably never will.",
          "To say that's already dead—",
          "sound, or shape, or anything at all…",
          "with only two eyes, nothing can be seen.",
          "take me there once more.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["社交不安、障害患者としてそんなことは言えない", "誰も私のコンテクストを理解しようとしない", "意味のない憂鬱と濡れた前髪", "時を越えて君の懐に抱かれたい"],
        en: [
          "As a patient with social anxiety, I can’t say things like that.",
          "No one even tries to understand my context.",
          "Meaningless depression, and damp bangs on my forehead—",
          "I want to cross time and be held against your chest.",
        ],
      },
      {
        zh: ["ごめん", "言いたいことが伝わらなかった", "もう伝えられないでしょう", "もう死んでるなんて", "音とか形とか", "両目だけでは何も見えない", "ウィル、もう一度連れて行って"],
        en: [
          "I’m sorry.",
          "What I wanted to say never reached you.",
          "It probably never will.",
          "To say that's already dead—",
          "sound, or shape, or anything at all…",
          "with only two eyes, nothing can be seen.",
          "take me there once more.",
        ],
      },
      {
        zh: ["ごめん", "どうしても越えられない時点", "夜明けまでに溶かそう", "ビルの間を歩き回りました", "ずっと探している", "実は分かってたんだ", "人たちはいつも集まって自分を偽っている"],
        en: [
          "I’m sorry.",
          "A point in time that I can’t get past, no matter what—",
          "let’s melt it down before the break of day.",
          "I wandered between the buildings,",
          "still searching—always.",
          "Truth is, I already knew:",
          "people gather just to fake who they are.",
        ],
      },
      {
        zh: ["もう一度一緒に逃げよう", "最も輝く恒星"],
        en: ["Let’s run away together one more time—", "the brightest star."],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyFomalhautIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-23.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Fomalhaut” was born in a mild winter in the UK.",
      "The air was clear, and darkness fell early.<br />The chill of evening would settle in quickly, but never quite turned sharp.<br />Streetlights glowed orange, while the sky above was a deep, saturated blue.",
      "The song lives precisely in the space between those two colors.",
      "It is closer to a record of a single point in time,<br />a moment that cannot be altered, and cannot be crossed,<br />returning again and again in the mind, yet offering no way to be processed.",
      "When someone realizes that certain things can no longer be undone,<br />collapse does not come immediately.<br />Instead, a strange calm takes over,<br />like standing at the edge of a city, watching the lights and the night sky exist side by side.",
      "The title refers to Fomalhaut (α Piscis Austrini),<br />a star far from the ecliptic.<br />Bright, yet solitary,<br />present, but unrelated to most orbits.",
      "That is why it becomes the most fitting symbol for this song.<br />Not an escape from reality,<br />but the search for a more distant point of reference<br />beyond an unchangeable set of coordinates.",
      "Musically, “Fomalhaut” leans into a relatively pure J-rock / pop arrangement.<br />It feels like a winter street at six in the evening:<br />the lights are already on,<br />but night has not fully arrived.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyTheGuiltIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-24.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“The Guilt” is built on a grey and black worldview.<br />Almost no saturation remains: the space is without light, without warmth, without echo.",
      "The core emotion of the song is not guilt, but conviction, being declared guilty.<br />It does not come from love, memory, or seasons, but from a sense of public and interpersonal siege:<br />an individual is pushed into a position of being watched, defined, and judged,<br />as if the verdict has already been written, only the procedure is left to repeat itself.",
      "The title The Guilt is both a label thrown from the outside and a selftrial gradually formed within.<br />As voices keep pouring in from beyond the self, the outline of the self begins to blur:<br />is it misunderstanding, or is there truly an “error” that cannot be argued away?",
      "Structurally, most of the song is built on an unstable 5/4 meter,<br />creating a persistent psychological imbalance,<br />like footsteps being interrupted, like breathing slipping offbeat,<br />like reality and the self remaining half a frame out of alignment.",
      "In the chorus, the modulation is deliberately pushed toward the dominant,<br />forcing the emotion upward,<br />not into an outburst, but into a tension driven to the edge of a threshold.",
      "The bass slap in the chorus functions as a crucial timbral language.<br />It carries none of the elasticity of traditional funk;<br />instead it reads as a cold, hard counterstrike,<br />short, direct, and almost mercilessly granular,<br />like the last instinctive response that remains when speech has failed.",
      "A systematized condition of the individual,<br />and a sense of detachment under structural pressure.",
      "The palette is deliberately singular:<br />grey white and charcoal black,<br />a world drained of blood, leaving only structure and contour.",
      "There is no romance narrative, no nostalgia for time,<br />and no seasonal metaphor.",
      "This is a song about how an individual, placed in the position of being convicted,<br />faces their own shadow,<br />cold, hard, silent,<br />yet undeniably real.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyTheGuiltLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-24.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["想起来了很久以前做过的梦里", "晨雾弥漫且毫无声息的城市里", "我听见自己发出了那样的叹息", "在光碟里刻画关于日暮的回忆"],
        en: [
          "I remember now—",
          "a dream from a long time ago.",
          "In a city drowned in morning fog,",
          "silent, without a single sound,",
          "I heard myself let out that kind of sigh,",
          "etching dusk into a disc—",
          "a memory engraved in circles.",
        ],
      },
      {
        zh: ["无论何时都受困于怯弱的自我", "已经记不得了对吧 渐渐被迷惑", "是为了什么虚假的 正义与焦点", "作为代价割舍掉的人不得其所"],
        en: [
          "At any time, trapped inside a timid self,",
          "you can’t remember anymore, can you—",
          "slowly getting confused,",
          "for what—some counterfeit justice, some spotlight?",
          "As the price, the ones cut away",
          "never end up where they belong.",
        ],
      },
      {
        zh: ["啊，夜晚已经到了"],
        en: ["Ah—night has already arrived."],
      },
      {
        zh: ["黑烟升上天空 保持着无重力状态", "我已经不在了 我已经完全厌倦了", "谁又利用了谁 多么愚蠢的欺瞒者", "那些人们关不上的嘴却让我的心", "剧烈地跳动了起来"],
        en: [
          "Black smoke rises into the sky,",
          "held in a weightless state.",
          "I’m not here anymore.",
          "I’m completely tired of it.",
          "Who used whom—what a stupid fraud,",
          "and the mouths people can’t shut",
          "make my heart",
          "start to pound—violently.",
        ],
      },
      {
        zh: ["独自在站台上望着远处的人群", "那些抑制的疏远与舍弃的话语", "摇摇欲坠般的随着声音的方向", "在铁道路口缓慢走向时间尽头"],
        en: [
          "Alone on the platform, watching the distant crowd,",
          "those restrained distances, those discarded words,",
          "swaying, on the verge of collapse,",
          "following the direction of the noise,",
          "walking slowly through the rail crossing",
          "toward the end of time.",
        ],
      },
      {
        zh: ["在一切结束前"],
        en: ["Before everything ends—"],
      },
    ];

    var part2Blocks = [
      {
        zh: ["黑烟升上天空 保持着无重力状态", "我已经不在了 我已经完全厌倦了", "谁又利用了谁 多么愚蠢的欺瞒者", "那些人们关不上的嘴却让我的心"],
        en: [
          "Black smoke rises into the sky,",
          "held in a weightless state.",
          "I’m not here anymore.",
          "I’m completely tired of it.",
          "Who used whom—what a stupid fraud,",
          "and the mouths people can’t shut",
          "make my heart—",
        ],
      },
      {
        zh: [
          "「不合理、不合理なものは見えないものばかりだ",
          "灰色の悲鳴と銃声が鳴り響いた",
          "簡単にシステムをリセットすれば消えて",
          "全部やり直せるなんておかしいじゃないか",
          "あの伝わらなかった「さよなら」だけが、",
          "冷たい冬と長い夜につきあっていた",
          "冷やされていた温度はすっかり灰になってしまった",
          "消えても私だけを灼く火 」",
        ],
        en: [
          "The unreasonable—",
          "it’s always the things you can’t even see.",
          "Grey screams, gunshots, ringing through the air,",
          "and somewhere in it, laughter.",
          "“Just reset the system”—and it all disappears,",
          "“start over from zero”—",
          "how is that not absurd?",
          "Only that goodbye that never reached anyone",
          "stayed with the cold winter and the endless night.",
          "The warmth that once had a temperature",
          "has turned entirely into ash.",
          "Even if everything vanishes,",
          "there’s still a fire that burns only me.",
        ],
      },
      {
        zh: ["别再盯着我了 戴上耳机全无视掉", "别沉默不语了 这样不是很任性吗", "菀枯的事终究 会变成阻碍的对吧", "悲伤的事就连 自己也回想不起来"],
        en: [
          "Stop staring at me—",
          "put on my headphones and ignore it all.",
          "Stop staying silent—",
          "isn’t that selfish too?",
          "What withers will eventually",
          "turn into an obstacle, won’t it?",
          "Even the sad things—",
          "even the sad things—",
          "can’t be recalled, not even by the one who lived them.",
        ],
      },
      {
        zh: ["或许能在下个水无来临之前…"],
        en: ["Maybe before the next “mizunashi” comes—"],
      },
      {
        zh: ["什么时候才能和自己见面呢", "花与夏之水饴"],
        en: ["When will it be possible", "to meet myself?", "Flowers, and summer’s mizuame."],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyLoneStarPreludeIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-21.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Lonely Star Prelude” was written after an evening self-study session in March 2022.",
      "That night, I returned to my room and simply sat down to play for a while, no preset emotion, no clear compositional goal. The melody flowed out in an unusually smooth state: from the first note to the end, it arrived almost in one breath, as if I had caught a signal drifting in the air.",
      "At first, it was imagined as a prelude to “Supernova.” So in timbre and atmosphere, it deliberately leans toward the feel of a “cosmic transmission”: spacious, distant, with a faintly ionized reverb. But later, I didn’t force it into any larger structural system. Because of that, it remained, becoming a completely independent piece of pure imagery.",
      "The piece uses very few voices. There’s almost no dense texture and no technical display, it feels closer to an extended breath. Skylike blank space, slowly floating harmonies, and a piano tone with a cold sheen together form a moon-blue sense of space.",
      "There is no narrative, and it points to no specific object.<br />It’s more like a solitary star, briefly appearing, quietly suspended, then disappearing into an endless night sky.",
      "Looking back now, I still love its timbre and atmosphere. That emptiness, pure, unadorned piano sound, still feels difficult to improve in any way.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyAffizierenIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-04.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Affizieren” was born at the beginning of my autumn at nineteen, the point when everything starts to fade, the temperature drops, and emotions become easier to sink beneath the surface. I found myself looking back on earlier seasons without a sign. When the air turned cold, what remained of those feelings resurfaced, not as intense as before, no longer dazzling enough to be unbearable, but instead as a quiet, almost monotonous sadness in deep blue and grey white tones.",
      "The psychological state behind the song was one of calm, but constantly rising tide. The images were unusually clear as I wrote, light fractured by autumn wind, the slow swell of surf rising from somewhere deep, and the feeling of walking alone through a long, grey blue alley.",
      "“vision shattered by rain” a return to the summer when I was seventeen, a youthfully fragile illusion that only rain can completely destroy.",
      "The word “Affizieren” comes from philosophy.<br />It describes the subtle yet profound way emotions and the external world can affect a subject. Like being moved, nudged slightly, having one’s breathing altered by a single moment. I love the word because it isn’t about my choosing to feel something. It is about how certain things, like seasons, memories, a glance, a voice, quietly, passively leave texture inside me.",
      "For me, “Affizieren” is an emotional memorial to a period of time. Although it arises from personal feeling, it is not written for any specific person. Throughout the writing process, I deliberately removed direct reference and focused only on the core shape of the emotion.",
      "At its heart, this song is an act of self observation. It wasn’t created to be heard by anyone in particular. Still, if these melodies and words let someone glimpse a faint blue light inside their own feelings, I would consider that a beautiful outcome.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyAffizierenNotesInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-04.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var paragraphs = Array.from(article.querySelectorAll("p"));
    var target =
      paragraphs.find(function (node) {
        var text = normalizeText(node.textContent).toLowerCase();
        return (
          text.indexOf(normalizeText("音乐上的想法：").toLowerCase()) === 0 ||
          text.indexOf(normalizeText("Musical notes").toLowerCase()) === 0
        );
      }) || null;

    if (!target) {
      return;
    }

    var blocks = [
      "<strong>Musical notes</strong>",
      "Opening: The track begins with a minimal, repeating piano figure. I intentionally used the guitar pro piano sound instead of a velocity-shaped DAW piano, since no matter how I tweaked the MIDI instruments, they never reached the coldness I wanted. The guitar pro piano has the right “mechanical, inorganic” texture.",
      "Atmosphere guitars: Influenced by Novelists, the clean guitar is built on heavy delay and reverb, letting the space expand like slow breathing. This texture runs through the entire song, with density adjusted only as the emotion requires.",
      "Main riff entry: After the intro, all instruments (except vocals) lock into the main riff.",
      "Tuning: I used A♯–E–A–D–G–B–E (raised A), slightly higher than my usual drop A, which was chosen for the key. The riff itself isn’t difficult, I added triplets to soften the groove. The bass is where it became interesting. I originally wrote it as hybrid picking, but when recording, slap felt more natural, so I switched to slap.",
      "Verse meter play: The first verse begins with vocals (still using Miku V4C) and clean guitar only, where I hid a small rhythmic device:<br /><br />-bar 2: 4/4 → 9/8<br />-bar 3: back to 4/4<br />-bar 4: 7/8<br /><br />then repeat",
      "With so few instruments, these changes are perceptually softened, turning into a subtle instability, like a shadow swaying in the dark.",
      "Drums enter: Once the drums come in, the groove settles back into 4/4, as if the listener finally steps onto solid ground again.",
      "Pre-chorus: I reintroduce 7/8 against 4/4. The piano line is intentionally restless, an overlap of unease, hesitation, and expectation. The bass suggests the melodic direction first, then the guitars follow, forming a gradual buildup. Elements then peel away to hold the emotion before the chorus.",
      "Chorus design: I deliberately let the chorus begin with vocals + piano alone for eight bars, so the emotion feels suddenly emptied out. Then the full band crashes in, capturing an internal shock in a single surge. Rhythm guitars stay chordal and restrained since I wanted atmosphere over technique. The bass carries continuity through a slap variant of the main riff. There is one piano note choice that sounds slightly outside (at least to me), but it isn’t, it’s there to create a tiny offbeat emotional tension (one of my favorite moments, because it happened almost unintentionally).",
      "Harmony: Interestingly, the harmonic structure is not “progressive” in a technical sense. I intentionally reduced complexity to make the sense of restraint clearer.",
      "Interlude / second verse: The interlude echoes the intro, but with added melodic fills. The second verse is heavier, with rhythm guitars enter, and the bass switches from slap back to hybrid picking.",
      "The “spoken” section: After two chill drum only bars comes the most distinctive passage, what I call the “spoken/chanting” section. It contains only the loose, simple drums, the same piano from the intro, sliced vocal fragments (casual humming), samples and ambience, and my spoken voice.",
      "Solo writing: The instrumental solo is heavily influenced by DualInsomiNa, which the rhythm guitar is almost non repeating and line driven, pushing forward through momentary tension (the bass follows with a pick). Technically it’s not a section I can perform perfectly live. The first two notes are also a deliberate (and slightly amusing) echo of a solo that he once featured on my other song.",
      "Final chorus and landing: The last chorus contrasts sharply with the first, with guitars become more “orthodox” prog metalcore, with palm mutes, djent articulation, and embellishments, while the bass stays on pick to shadow the guitar lines. After the emotion peaks, the arrangement collapses back to the earlier, cleaner texture. One empty bar, and the song ends with piano + vocals again, layered with seaside ambience, like a tide covering the memory once more.",
      "“And the tide swallows again my rainy season.”",
    ];

    target.innerHTML = blocks.join("<br /><br />");
  }

  function applyHeAndMeLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-02.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: [
          "已经变得不爱吃甜食了、",
          "将被毁掉的日子一并吞噬",
          "两人的影子交叠",
          "要是时间能在那天停滞",
        ],
        en: [
          "I don’t crave sweetness anymore",
          "All the days meant to be ruined are swallowed whole",
          "Our shadows once overlapped",
          "If only time had stopped on that day",
        ],
      },
      {
        zh: [
          "妄言后的数个无言清晨",
          "乱窜的情绪还是无可奈何",
          "似乎真的不属于我吗",
          "旧疾复发的、泛潮明信片",
        ],
        en: [
          "Several silent mornings after reckless words",
          "Emotions running wild with nowhere to go",
          "Was it truly never mine to keep",
          "A relapse of an old illness、a dampened postcard.",
        ],
      },
      {
        zh: [
          "只是夜晚落入你眼睛的画面我也回想不起",
          "度过满天繁星的冬夜之后要该如何是好？",
        ],
        en: [
          "Even the image of night falling into your eyes",
          "I can no longer recall",
          "After passing through that winter sky full of stars",
          "Where am I supposed to go?",
        ],
      },
      {
        zh: [
          "Call my name again",
          "Like you used to do",
          "两人虽然已经在不同世界里",
          "但却越来越能看见你",
        ],
        en: [
          "Call my name again",
          "Like you used to do",
          "We now live in different worlds",
          "Yet I see you more clearly than ever",
        ],
      },
      {
        zh: [
          "Look into my eyes",
          "With a gentle smile",
          "即使我的爱也依旧留了下来",
          "最后也成为了阻碍",
        ],
        en: [
          "Look into my eyes",
          "With a gentle smile",
          "Even though my love remained where it was",
          "In the end it only became a weight between us",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: [
          "我们要一直一直一直在一起 你说过",
          "单纯的想法像抛开单块的箱头一般",
          "我已经离开你了多远的距离？",
          "好像一直都在做着梦",
        ],
        en: [
          "You said we would stay together forever and ever",
          "A simple thought, stripped bare like a lonely amp without a single effect",
          "How far have I already drifted from you?",
          "It feels like I have been dreaming all this time",
        ],
      },
      {
        zh: [
          "像普通下午你又弄丢了拨片 那样子",
          "想着如果能够赶快送你新的就好了",
          "梦中的电话却总是拨打不通",
          "还有好多话没对你说",
        ],
        en: [
          "Like those ordinary afternoons when you lost your pick again",
          "And I wished I could rush one to you right away",
          "But in the dream, the call never connects",
          "There are still so many things I never said",
        ],
      },
      {
        zh: [
          "Call my name again",
          "Like you used to do",
          "两人虽然已经在不同世界里",
          "但却越来越能看见你",
        ],
        en: [
          "Call my name again",
          "Like you used to do",
          "We now live in different worlds",
          "Yet I see you more clearly than ever",
        ],
      },
      {
        zh: [
          "Begging another embrace",
          "But it never arrives",
          "在我的眼睛里长出春天之前",
          "请不要离开我的回忆",
        ],
        en: [
          "Begging another embrace",
          "But it never arrives",
          "Before spring grows inside my eyes",
          "Please don't leave my memories",
        ],
      },
      {
        zh: [
          "说过要一起看的海 后来我一个人去了",
          "在这无法见面的城市里 阴天的骤雨",
          "即使我不确定什么才是真实的",
          "但早已习惯的阵阵刺痛 仍提醒着我",
        ],
        en: [
          "You said we’d see the sea together",
          "But I went alone in the end",
          "In this city where we were never meant to meet",
          "The sudden rain under a grey sky",
          "Even if I no longer know what is real",
          "The familiar ache still reminds me",
        ],
      },
      {
        zh: ["于是终于到了遇见我时你的年纪", "于是又到了不能一起共赴的雨季"],
        en: [
          "And now I’ve reached the age you were when you met me",
          "And once again it is the rainy season we cannot share",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyEpilogueIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-09.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Epilogue” is, to me, a closing chapter for Ipomoea alba, but only for the emotions that once burned out of control, so intense they became unbearable in their own immaturity. The feeling itself doesn’t disappear.",
      "I understand that your life is yours, and I understand that no amount of calling out can change anything. So in the first half, there is only acoustic guitar and voice. It even keeps a certain lightness, a one sided pretense of ease, like slipping a one sided farewell into an everyday tone, trying to make everything look less serious than it is.",
      "The chorus carries regret and emptiness, but not a dramatic collapse. It feels more like a forced smile you manage when looking back. The chord progression in the chorus is the small thing I never got to say or share, nothing theatrical, just ordinary conversation, an ordinary “we’ll talk next time.” And it’s precisely that ordinariness that later turns into a blank space that can never be fulfilled.",
      "From the end of the first chorus onward, reality begins to flood in, and memories start to feel heavier. Life continues rationally, as if everything is still moving forward, yet the hollow space becomes even more visible.",
      "The rainy season window and the black notebook return as an early summer signature of Ipomoea alba. So does the seaside town and the blue across the water, scenery I saw when I traveled to Weymouth during that time, bright, open, and distant in the most literal way, visible, yet unreachable.",
      "At the end, I used a repeated section that fades out, receding like the tide.<br />It doesn’t need a sharp conclusion, and it doesn’t need a polished line like “I finally moved on.” The tide retreats, it simply does. The sand stays wet.",
      "For me, “Epilogue” is also one of the songs I feel most deeply. It writes an ending in a way that’s almost light enough to vanish, so that the ending sits closer to life itself.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyEpilogueLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-09.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["遠い国へ行くと聞きました", "大丈夫だ、分かる", "君の人生は君のものだ", "いくら叫んでも最低だ"],
        en: [
          "I heard you’re leaving for a faraway country.",
          "It’s okay, I understand.",
          "Your life belongs to you.",
          "No matter how loudly I shout, it’s still pathetic.",
        ],
      },
      {
        zh: [
          "宝物のような その笑顔はセピア色になった",
          "淡白な雨期の窓辺で手元の黒いノートに",
          "一緒に見えなかったことを　海を　街を　全部を",
          "目に見えない、限りない不安を",
          "真夜中に捨てたのだ",
        ],
        en: [
          "That treasure like smile of yours has turned sepia,",
          "by the pale rainy season window,",
          "in the black notebook in my hands.",
          "Everything we never got to see together:",
          "the sea, the town, all of it.",
          "An invisible, endless anxiety,",
          "I threw it away at midnight.",
        ],
      },
      {
        zh: ["それから君はいつも", "悲しげに歩いていた", "きっと今の私でさえ", "干渉できないことなんだ"],
        en: [
          "After that, you were always",
          "walking as if weighed down by sorrow.",
          "Surely, even the me I am now",
          "can’t interfere, it’s something beyond my reach.",
        ],
      },
      {
        zh: ["対岸の青、海辺の町", "砂粒を歩いている", "もう一回", "君のことを思い出した"],
        en: [
          "The blue across the water, a seaside town",
          "I’m walking on grains of sand.",
          "One more time,",
          "I remembered you.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: [
          "嘘のように 君がいなければ意味がないなんだ",
          "淡白な雨期の窓辺に夏だけが残された",
          "なぜ滞在しないのかはもう問い詰めたりはしない",
          "この答えはもういらない",
          "だから全部捨てたのだ",
        ],
        en: [
          "As if it were a lie,",
          "without you, nothing means anything.",
          "By the pale rainy season window,",
          "only summer was left behind.",
          "I won’t press you anymore",
          "about why you won’t stay.",
          "I don’t need that answer now.",
          "So I threw everything away.",
        ],
      },
      {
        zh: [
          "宝物のような その笑顔はセピア色になった",
          "淡白な雨期の窓辺で手元の黒いノートに",
          "こんな歌を書いても 意味がないのでしたら",
          "明日も将来も期待も何も聞きたくない…",
        ],
        en: [
          "That treasure like smile of yours has turned sepia,",
          "by the pale rainy season window,",
          "in the black notebook in my hands.",
          "If even writing a song like this",
          "is still meaningless,",
          "then I don’t want to hear about",
          "tomorrow, the future, or hope… anything.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyIHateYouAllIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-11.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“I hate you all.” is a fast song written in a defensive stance. The hate is real, but it functions more like a protective shell than a final verdict.",
      "The “me” in the lyrics isn’t who I am now. It’s the version of me back then: childish, instinctive, hard on the outside and brittle underneath. I couldn’t handle the social detours, the unspoken rules, the gestures that looked polite but weren’t sincere. I only knew how to get angry directly when I was angry, and laugh directly when I was happy. Looking back, she feels a bit like Girls Band Cry’s Nina (except the show hadn’t even aired yet, if it had, I would’ve pointed at the screen like: that’s literally me 😱).",
      "The origin of this song is very specific: the window of my dorm room when I was studying in Manchester. It was March, and it was still snowing. That out of season cold felt like a kind of sarcasm, things were supposed to be warming up, yet the world insisted on moving in reverse. And that’s where the opening chain of “Why…?” came from.",
      "The “you all” points to a group of people who used to count as friends. What remained in the end wasn’t the argument itself, but something long lasting and difficult to name, something close to a psychological wound (a description I don’t even like using). It hit especially hard because the ones causing the harm were “grown men,” using filthy words to attack a kid who hadn’t truly hurt anyone 😡 (sure, I was immature, but what did that kid even do?😭). That kind of unfairness sharpens your pride into something jagged, and turns expression into a weapon.",
      "But “I hate you all.” isn’t a song meant for serious, lifelong hatred (I don’t like writing music just to truly hate someone). It’s more like a J-rock-style release, deliberately bright in places. Because I didn’t want to pin myself inside hatred forever, this song captures a real reaction from a specific phase of my life: when I didn’t yet know how to process complicated emotions, at least I could still write them down.",
      "The translated version of this song is simply its title:<br /><br />I hate you all.<br />It was the only sentence I could say out loud that year 😡",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyIHateYouAllLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-11.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: [
          "何で3月なのに雪が降るのか",
          "何で嫌いな人をフォローするのか",
          "何で不都合なことをして後悔するのか",
          "何でただ謝罪してすべてを取り除くのか",
        ],
        en: [
          "Why does it still snow in March?",
          "Why would people follow someone they can’t stand?",
          "Why would anyone do something they know will backfire, then regret it?",
          "Why do people just apologize and erase everything, like it’s all gone?",
        ],
      },
      {
        zh: ["みんな嫌いだ"],
        en: ["I hate everyone."],
      },
      {
        zh: ["あたし", "わからない,わからない", "正解なんて私が知るもんか", "「大人になっていない」も言い訳", "これも嫌なんだ"],
        en: [
          "Me—",
          "I don’t know, I don’t know.",
          "Like I’m supposed to know what the “right answer” is.",
          "“Not grown up yet” is an excuse too,",
          "and I hate that as well.",
        ],
      },
      {
        zh: ["だけど", "知るわけない,知るわけない", "正しいやり方なんて知るわけない", "何年も生きていなかったら", "そんなこと思わなかった"],
        en: [
          "But—",
          "How would I know, how would I know?",
          "There’s no way I know the “right way” to do it.",
          "If I hadn’t lived for all these years,",
          "I wouldn’t even think like this.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["同級生と間違ったことを言ってもいいのか", "イヤホン持ってるから聞こえなくてもいいのか"],
        en: [
          "Is it okay if I accidentally said the wrong thing to a classmate?",
          "Is it okay to pretend I can’t hear because I’ve got my earphones in?",
        ],
      },
      {
        zh: ["そもそもみんなと解け合わないとか", "全部自分で選んだんだ", "人間って俗っぽいだからね", "全部バカみたい"],
        en: [
          "Maybe I was never going to fit in with everyone in the first place.",
          "I chose all of it myself.",
          "Humans are so tacky and petty, you know.",
          "Everything’s just… stupid.",
        ],
      },
      {
        zh: ["ずっと好きな曲を", "ずっと君だけを"],
        en: ["Always the song I loved,", "always you—only you."],
      },
      {
        zh: ["でも全部忘れたいな! !", "あんたも嫌いなんだ！"],
        en: ["But I want to forget everything!!", "I hate you too!"],
      },
      {
        zh: ["いつか", "分かるのか,分かるのか", "道順とかいつか分かるのか", "大人になってから全部知ったら", "怖すぎるな、ああ"],
        en: [
          "Someday—",
          "Will I understand, will I understand?",
          "Will I ever figure out the route, the steps?",
          "If I only learn everything after I’m “an adult,”",
          "that’s way too terrifying… ah.",
        ],
      },
      {
        zh: ["挫折感にまみれた17 歳", "大人の考え事がわからない", "あんたはそんな声で別れると言った", "すごく傲慢だ"],
        en: [
          "Seventeen, soaked in frustration.",
          "I don’t understand how adults think.",
          "You said, in that voice, “We’re done here.”",
          "So arrogant.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyRainyDaysLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-12.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: [
          "Morning、また何もない朝だよ",
          "窓辺 、あの花は崩れた",
          "名前もう忘れてしまいました",
          "「 ヨル 」なんて、がついてるようだ",
        ],
        en: [
          "Morning—",
          "another morning with nothing in it.",
          "By the window, that flower has collapsed.",
          "I’ve already forgotten its name.",
          "Even the word “night”",
          "seems to carry something extra, like a tag that won’t come off.",
        ],
      },
      {
        zh: [
          "「今日はあのカーキ色コートを着るか",
          "そのぬくもりはまだ残ってる",
          "もう思い出せないこの体も",
          "こんなの生活に慣れてきた",
          "ベースも,カメラも, 手元に残ってる",
          "出かけるなら革靴もここにいる",
          "欠けてるもんといえば",
          "そう言えば…」",
        ],
        en: [
          "“Should I wear that khaki coat today?",
          "Its warmth is still there.",
          "I can’t quite remember it anymore—",
          "even this body of mine.",
          "And somehow, I’m getting used to living like this.",
          "My bass, my camera,",
          "they’re still here in my hands.",
          "If I go out, even my leather shoes are right here.",
          "As for what’s missing…",
          "come to think of it…”",
        ],
      },
      {
        zh: ["雨、降り注ぐ", "私だけに　ね", "君　ここにいない"],
        en: ["Rain—pouring down,", "only on me, right?", "You—", "are not here."],
      },
      {
        zh: ["出会い夢を見たの朝", "心臓が痛くて動けないな", "もっと一緒に暮らしたいのに", "いくら努力しても触れない"],
        en: [
          "That morning I dreamed of when we first met,",
          "my chest hurt so much I couldn’t move.",
          "I want to live with you a little longer,",
          "but no matter how hard I try, I can’t reach you.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["何度も君を描きた", "他のもの全部気にしないな", "どうしても離れたくないのに", "思い出にしかならないでしょうか"],
        en: [
          "Again and again, I tried to draw you,",
          "ignoring everything else.",
          "I don’t want to let go, not ever—",
          "but will you end up only as a memory?",
        ],
      },
      {
        zh: ["どうすればいいのか わからない", "もう何もできないな", "何もいらない"],
        en: [
          "I don’t know what I’m supposed to do.",
          "There’s nothing I can do anymore.",
          "I don’t need anything.",
        ],
      },
      {
        zh: ["空は雨が降ってるが、", "いつか晴れる日が来るでしょう。"],
        en: ["The sky is raining, but—", "someday, a clear day will come."],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyRedSandalwoodLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-13.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["去年の夏海と梅雨に沿って", "懐かしいのは木漏れ日", "同じような景色を待って", "似た場所に戻りたくない"],
        en: [
          "Along last summer’s sea and the rainy season,",
          "what feels nostalgic is the sunlight through leaves.",
          "Waiting for the same kind of scenery,",
          "yet I don’t want to return to a similar place.",
        ],
      },
      {
        zh: ["ただ、知っておいてほしいことがあるんだ", "それとも誰にも言うべきではないでした"],
        en: [
          "There’s something I want you to know—",
          "or maybe it’s something",
          "I shouldn’t tell anyone at all.",
        ],
      },
      {
        zh: ["なぜなら真実は存在しないから", "置き換えられるのは立場だけ", "目に映るものは皆寄せ集めの一面だ", "ね、客観とは何か"],
        en: [
          "Because truth doesn’t exist.",
          "Only standpoints can be replaced.",
          "Everything we see is just a patchwork surface.",
          "So, what is “objectivity,” anyway?",
        ],
      },
      {
        zh: ["あの日の夢を見てた", "雨が薄く降ってた だけ", "世界はまだ続けてくなのに", "関係のないことだと思った"],
        en: [
          "I was dreaming of that day—",
          "only that a thin rain was falling.",
          "Even though the world keeps going on,",
          "I thought it had nothing to do with me.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["「 実はもっと話したかったんだ」", "もう関係ないとしても", "探し求めた答えは望むものではない", "どんなに執着しても"],
        en: [
          "“Actually, I wanted to talk more.”",
          "Even if it doesn’t matter anymore—",
          "the answer I chased",
          "was never the one I wanted,",
          "no matter how tightly I clung.",
        ],
      },
      {
        zh: ["真理の祭壇前だけで下げる", "「 客観的 」な目的性があるようだ", "始まりから終わりまで、触れられないでしたら", "流されるしかないな"],
        en: [
          "Only in front of the altar of “truth”",
          "do we lower our heads,",
          "as if there were some “objective” purpose.",
          "If from beginning to end it remains untouchable,",
          "then there’s nothing to do but be carried away.",
        ],
      },
      {
        zh: ["最後に融解した", "後悔とそこに枯れたヨルガオ"],
        en: [
          "In the end, what dissolved",
          "was regret—",
          "and the Ipomoea Alba that withered there in the rainy season.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyRedSandalwoodIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-13.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Red Sandalwood” is a song in red-brown and deep umber tones, upright, restrained, yet carrying a wish that borders on obsession. It keeps the dampness I’ve come to know from Ipomoea alba, but this time it doesn’t point to anyone. It reads more like a vow written to myself: cold, direct.",
      "It begins with the line “along last summer’s sea and the rainy season,” and then refuses to return to anything similar. Nostalgia is only lens flare and sunlight filtering through leaves. What I really wanted to write is something harder to name: the more you try to seize the truth, the more you realize it doesn’t exist. The only thing that can be swapped is standpoint, and the world we see is nothing more than surfaces pieced together from fragments. So what, exactly, is “objectivity”?",
      "From beginning to end, some things remain untouchable. And if you can’t reach them, the only fate left is to be carried away by time and rain. What dissolves in the end is regret, along with that Ipomoea alba that withered in the rainy season: belonging to no one now, yet leaving behind a permanent edge of coldness.",
      "I released this song on my 18th birthday. It was a gift I gave myself, gathered back into stillness, and then moving forward.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyIpomoeaAlbaIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-18.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Ipomoea alba” is the starting point of the entire self-titled album, the source from which all the later emotions and images unfold.",
      "The first lines were written on a pale, washed-out rainy day.<br />The air by the window was damp, carrying a mixed scent of soil and flowers.<br />A black notebook lay open like a night surface lightly soaked by rain.",
      "Those sentences were closer to a faint, slowly surfacing stream of consciousness,<br />an anchor found suddenly inside emptiness,<br />quietly letting a person remain in reality.",
      "That’s why the song’s palette settles into white and pale blue:<br />not pure brightness, but the soft reflection you get when post-rain light filters through clouds.",
      "After the writing was finished, the piano and guitar were recorded by Johnny.<br />He didn’t step into the songwriting itself, but on the level of sound he gave the piece its first shape and warmth, like someone turning an abstract emotion into something audible, something real.",
      "Because of that, “Ipomoea alba” always keeps a certain lightness,<br />as if reality hasn’t fully intruded yet.<br />It isn’t as heavy or shattered as the tracks that follow,<br />it feels more like a timeslice still paused by a window after rain.",
      "From this song onward, yorugao (Ipomoea alba), the rainy season, the notebook, damp air,<br />and the theme of finding a reason to exist inside nothingness begin to expand,<br />eventually becoming the album’s overture.",
      "If the later songs record depletion, tearing, and farewells,<br />“Ipomoea alba” stays at the quiet moment before anything collapses,<br />when everything is still, briefly, and undeniably held together.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyIpomoeaAlbaLyricsInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-18.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
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

    var part1Blocks = [
      {
        zh: ["「いつのまにか心を奪われていた」", "雨上がりの午後にこう書いた", "窓の外 湿った匂いと夕暮れの中の顔", "私はこう思い描いている"],
        en: [
          "“Before I knew it, my heart was taken.”",
          "I wrote thaton an afternoon after the rain.",
          "Outside the window—damp scent,",
          "and a face inside the dusk.",
          "This is how I keep imagining it.",
        ],
      },
      {
        zh: ["言葉の幽霊のように", "喉の奥に残っている"],
        en: ["Like the ghost of a word,", "it stays deep in my throat."],
      },
      {
        zh: ["君がいるから、", "意味のないもののために存在の口実を作る", "この両手で何も掴めなくても", "あとは二人でいい"],
        en: [
          "Because of you,",
          "I keep stitching excuses for the meaningless to exist.",
          "Even if these hands can’t hold on to anything,",
          "let the rest be just the two of us.",
        ],
      },
      {
        zh: ["また果てしない虚無感がやってきた", "人は誰でも必ず死ぬんだよ、", "君も知っている", "だからもっとそばにいてくれ"],
        en: [
          "That endless hollowness seems to be coming again.",
          "Everyone dies—you know.",
          "So stay closer to me,",
          "just a little.",
        ],
      },
      {
        zh: ["少しでも欠けているといらいらする", "これでは余計な悩みが増える", "今は正しくなくてももうだいじょうぶだよ", "「no」がもたらした決意の「yes」…"],
        en: [
          "I get irritated when even the smallest piece is missing.",
          "It only adds more unnecessary worries.",
          "Even if it isn’t “right” right now, it’s okay.",
          "A “yes” of resolve",
          "brought by a “no”…",
        ],
      },
      {
        zh: ["いつのまにか心を…"],
        en: ["Before I knew it, my heart…"],
      },
    ];

    var part2Blocks = [
      {
        zh: ["浮かんだ心臓も、 ヨルガオも", "すべてノートにいる", "君の笑顔だけは記録できない"],
        en: [
          "A heart that rose to the surface,",
          "the yorugao too—",
          "everything lives in the notebook.",
          "Only your smile",
          "can’t be recorded.",
        ],
      },
      {
        zh: ["あのね", "この人生は永遠の夜のようだった", "やっと、誰かが…", "その人は君"],
        en: [
          "Hey—",
          "this life felt like an endless night.",
          "And finally, someone…",
          "that someone was you.",
        ],
      },
      {
        zh: ["君がいるから、 君がいるから、"],
        en: ["Because you’re here—because you’re here—"],
      },
      {
        zh: ["日の出の時間にはまだ遠いが、", "君がいてくれれば、", "今は生きていける", "君もそうであるように"],
        en: [
          "Dawn is still far away, but",
          "if you stay with me,",
          "I can keep living for now—",
          "just like you do.",
        ],
      },
    ];

    function renderBilingualBlocks(blocks) {
      return blocks
        .map(function (block) {
          return block.zh.join("<br />") + "<br /><br />" + block.en.join("<br />");
        })
        .join("<br /><br />");
    }

    part1Text.innerHTML = renderBilingualBlocks(part1Blocks);
    part2Text.innerHTML = renderBilingualBlocks(part2Blocks);
  }

  function applyRainyDaysIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/track-12.html") {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var workHeading =
      headings.find(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        return (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        );
      }) || null;

    if (!workHeading) {
      return;
    }

    var intro = workHeading.nextElementSibling;
    if (!intro || intro.tagName !== "P") {
      return;
    }

    var paragraphs = [
      "“Rainy days” was written in the thin gap between winter and spring, when the air has already begun to warm.",
      "It takes place in that foggy time right after a separation—waking up and realizing it’s another morning, and the morning is empty.",
      "The flower by the window is Ipomoea alba. The moment it collapses feels like a silent signal: something really has ended. The khaki coat is what I wore when I went to see him, and ever since then, every time I put it on it feels like I can almost touch what’s gone—close enough to reach for, impossible to hold. Everything that can remain in life is still here. The thing that’s truly missing is the one you can’t even name, so all you can do is pause inside the sentence.",
      "Musically, “Rainy days” threads in melodic motifs from Ipomoea alba again and again, like memory resurfacing in different corners. The song itself barely repeats sections. No turning back, no stopping—just moving forward all the way to the end, like time itself. ☔️",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
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

  function setupLyricsEntrance(section) {
    if (!section || section.dataset.lyricsMotionBound === "1") {
      return;
    }

    section.dataset.lyricsMotionBound = "1";

    var reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      section.classList.add("is-visible");
      return;
    }

    section.classList.add("is-anim-ready");

    var reveal = function () {
      section.classList.add("is-visible");
    };

    if (!("IntersectionObserver" in window)) {
      requestAnimationFrame(function () {
        setTimeout(reveal, 120);
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            reveal();
            obs.disconnect();
          }
        });
      },
      {
        threshold: 0.24,
        rootMargin: "0px 0px -6% 0px",
      }
    );

    observer.observe(section);
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
    var dict = getSecondaryPageDictionary(detectPreferredLanguage());
    section.className = "lyrics-showcase";
    section.setAttribute("aria-label", dict.lyricsHeading);

    var inner = document.createElement("div");
    inner.className = "lyrics-showcase-inner";

    var title = document.createElement("h2");
    title.className = "lyrics-showcase-title";
    title.textContent = dict.lyricsHeading;

    var columns = document.createElement("div");
    columns.className = "lyrics-columns";
    columns.appendChild(buildLyricColumn(part1Text.innerHTML, "lyrics-column-left"));
    columns.appendChild(buildLyricColumn(part2Text.innerHTML, "lyrics-column-right"));

    var palette = null;
    if (
      article.dataset.lyricsPaletteBg &&
      article.dataset.lyricsPaletteFg &&
      article.dataset.lyricsPaletteTitle
    ) {
      palette = {
        background: article.dataset.lyricsPaletteBg,
        text: article.dataset.lyricsPaletteFg,
        title: article.dataset.lyricsPaletteTitle,
      };
    } else {
      var introNode = findSectionParagraph(article, ["作品介绍", "About the work"]);
      var introText = (introNode && introNode.textContent) || "";
      palette = buildLyricsPalette(introText);
    }

    section.style.setProperty("--lyrics-bg", palette.background);
    section.style.setProperty("--lyrics-fg", palette.text);
    section.style.setProperty("--lyrics-title", palette.title);

    inner.appendChild(title);
    inner.appendChild(columns);
    section.appendChild(inner);

    article.insertBefore(section, part1Heading);
    setupLyricsEntrance(section);

    part1Heading.remove();
    part1Text.remove();
    part2Heading.remove();
    part2Text.remove();

    article.dataset.lyricsEnhanced = "1";
  }

  function detectPreferredLanguage() {
    var query = new URLSearchParams(window.location.search).get("lang");
    if (query === "zh" || query === "en") {
      return query;
    }

    try {
      var saved = localStorage.getItem("siteLang");
      if (saved === "zh" || saved === "en") {
        return saved;
      }

      var homeSaved = localStorage.getItem("chronohaze-lang");
      if (homeSaved === "zh" || homeSaved === "en") {
        return homeSaved;
      }
    } catch (_err) {
      return "zh";
    }

    return "zh";
  }

  function persistPreferredLanguage(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    try {
      localStorage.setItem("siteLang", safeLang);
      localStorage.setItem("chronohaze-lang", safeLang);
    } catch (_err) {
      return;
    }
  }

  function translateMusicMetaLabels(content, safeLang, dict) {
    if (safeLang !== "en" || !content) {
      return content;
    }

    var replacements = [
      [/创作时间：/g, dict.creationLabel],
      [/作词作曲编曲吉他贝斯混音：/g, "Lyrics / Composition / Arrangement / Guitar / Bass / Mix: "],
      [/作词作曲编曲吉他混音：/g, "Lyrics / Composition / Arrangement / Guitar / Mix: "],
      [/作词作曲编曲混音：/g, "Lyrics / Composition / Arrangement / Mix: "],
      [/作词作曲编曲：/g, "Lyrics, composition & arrangement: "],
      [/作词编曲：/g, "Lyrics & arrangement: "],
      [/作词：/g, "Lyrics: "],
      [/作曲：/g, "Composition: "],
      [/编曲：/g, "Arrangement: "],
      [/演唱：/g, "Vocals: "],
      [/人声调教：/g, "vocaloid/sv edit: "],
      [/调教：/g, "Tuning: "],
      [/吉他：/g, "Guitar: "],
      [/钢琴与吉他录制：/g, "Piano & guitar recording: "],
      [/钢琴录制：/g, "Piano recording: "],
      [/部分吉他录制：/g, "Partial guitar recording: "],
      [/吉他实录：/g, "Guitar tracking: "],
      [/吉他录音：/g, "Guitar recording: "],
      [/吉他录制：/g, "Guitar recording: "],
      [/吉他混音：/g, "Guitar & mix: "],
      [/贝斯：/g, "Bass: "],
      [/贝斯录制：/g, "Bass recording: "],
      [/混音：/g, "Mix: "],
      [/作者：/g, "Artist: "],
    ];

    var translated = content;
    replacements.forEach(function (pair) {
      translated = translated.replace(pair[0], pair[1]);
    });

    var identityReplacements = [
      [/（两天写完）/g, "（finished within 2days）"],
      [/\(两天写完\)/g, "(finished within 2days)"],
      [/（一个小时）/g, "（finished in one hour）"],
      [/\(一个小时\)/g, "(finished in one hour)"],
      [/过春天，Sincerely/g, "Passing the Spring"],
      [/两年的回响/g, "Echos of two years"],
      [/暴雨倾盆所击中的思绪/g, "Thoughts, battered by heavy rain."],
      [/夏日的忧郁/g, "A summer kind of sadness."],
      [/一直魂牵梦绕的那种花朵/g, "A flower that won’t stop returning in dreams,"],
      [/与淤青化作诗歌/g, "bruises translated into poetry,"],
      [/融于雨中/g, "blended into the rain,"],
      [/待另一座城也陷入潮湿之时/g, "until another city is soaked with the same damp air."],
      [/起子/g, "Johnny Zhou"],
      [/凛野/g, "Rinya"],
      [/文心/g, "Wenxin"],
      [/斐然/g, "Franklimn Zhang"],
    ];

    identityReplacements.forEach(function (pair) {
      translated = translated.replace(pair[0], pair[1]);
    });

    return translated;
  }

  function monthLabelEn(monthNumber) {
    var labels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    var index = Number(monthNumber) - 1;
    if (index < 0 || index >= labels.length) {
      return String(monthNumber);
    }
    return labels[index];
  }

  function localizeShortLabelText(text, safeLang) {
    if (safeLang !== "en" || typeof text !== "string" || !text) {
      return text;
    }

    var next = text;

    next = next.replace(/（音频待上传）/g, " (audio pending upload)");
    next = next.replace(/\(音频待上传\)/g, "(audio pending upload)");
    next = next.replace(
      /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
      function (_match, year, month, day) {
        return monthLabelEn(month) + " " + Number(day) + ", " + year;
      }
    );
    next = next.replace(/(\d{1,2})月(\d{1,2})日/g, function (_match, month, day) {
      return monthLabelEn(month) + " " + Number(day);
    });
    next = next.replace(/(\d{4})年/g, "$1");

    var phraseMap = [
      [/2022年夏天/g, "Summer 2022"],
      [/2022、夏、某/g, "2022、summer、someday"],
      [/英国奥斯沃斯特里/g, "Oswestry, UK"],
      [/英国爱丁堡/g, "Edinburgh, UK"],
      [/英国韦茅斯/g, "Weymouth, UK"],
      [/中国重庆市/g, "Chongqing, China"],
      [/美国纽约伊萨卡/g, "Ithaca, New York, USA"],
      [/英国格拉斯哥/g, "Glasgow, UK"],
      [/中国/g, "China"],
      [/美国/g, "USA"],
      [/英国/g, "UK "],
      [/重庆市/g, "Chongqing"],
      [/重庆/g, "Chongqing"],
      [/纽约/g, "New York"],
      [/伊萨卡/g, "Ithaca"],
      [/爱丁堡/g, "Edinburgh"],
      [/奥斯沃斯特里/g, "Oswestry"],
      [/格拉斯哥/g, "Glasgow"],
      [/韦茅斯/g, "Weymouth"],
      [/毕业作品影像/g, "A-level photography final piece"],
      [/毕业作品视频/g, "A-level photography final piece"],
      [/返回摄影栏目/g, "Back to photography"],
      [/返回音乐栏目/g, "Back to music"],
      [/返回数学栏目/g, "Back to mathematics"],
      [/阅读全文/g, "Read full article"],
    ];

    phraseMap.forEach(function (pair) {
      next = next.replace(pair[0], pair[1]);
    });

    return next
      .replace(/\s{2,}/g, " ")
      .replace(/\s+,/g, ",")
      .replace(/,\s+/g, ", ")
      .trim();
  }

  function renderFirstIsabellePost(safeLang, dict) {
    var path = (window.location.pathname || "").toLowerCase();
    if (!/\/post\/first-isabelle-proof\.html$/.test(path)) {
      return;
    }

    var article = document.querySelector(".article");
    if (!article) {
      return;
    }

    if (!article.dataset.zhHtml) {
      article.dataset.zhHtml = article.innerHTML;
    }

    if (safeLang !== "en") {
      article.innerHTML = article.dataset.zhHtml;
      document.title = "我的第一个 Isabelle 形式化证明";
      return;
    }

    article.innerHTML = [
      '<h1>My First Isabelle Formalization Project</h1>',
      '<p class="article-meta">HazezZ · Oct 18, 2025</p>',
      "<p><strong>Some proofs deserve to be carved into something more solid.</strong></p>",
      "<p>What’s written on paper may fade, what’s drawn on the blackboard may be erased,but a formalized proof remains, verifiable and reproducible.</p>",
      "<h3><strong>What I’m Working On</strong></h3>",
      "<p>My current research focuses on submodular functions and greedy algorithms. Specifically, I’m formalizing the Nemhauser–Wolsey theorem, a classical result guaranteeing the approximation bound of a greedy algorithm on monotone submodular functions.</p>",
      "<p>In Isabelle, I aim to:</p>",
      "<ul>",
      "<li><p>Turn mathematical objects into formal definitions (functions, sets, monotonicity, submodularity, etc.)</p></li>",
      "<li><p>Build the proof framework</p></li>",
      "<li><p>Write a machine-checkable version of the mathematical proof</p></li>",
      "</ul>",
      "<p>It’s like talking to Isabelle, but unlike a human listener, it never lets me skip a single step or handwave through anything.</p>",
      "<h3>Why I Chose Isabelle (and not Lean</h3>",
      "<p>Mathematics itself is rigorous, but human written proofs often rely on intuition and shortcuts. Isabelle forces me to make every step explicit and verify everything.It’s tiring, but also incredibly honest (and,  my advisor uses Isabelle too XD).</p>",
      "<p>Through this, I’ve learned:</p>",
      "<ul>",
      '<li><p>Which steps that seem “obvious” actually require careful reasoning</p></li>',
      "<li><p>How logical structures transform into something formally usable</p></li>",
      "<li><p>How writing proofs can feel like truly learning how to write mathematics carefully</p></li>",
      "</ul>",
      "<p>For me, this isn’t just about producing a formal proof , it’s about learning how to express mathematics truthfully.</p>",
      "<h3>Progress</h3>",
      "<p>✔ Completed：</p>",
      "<ul>",
      "<li><p>Defined filter_limit and sequential_limit</p></li>",
      "<li><p>Proved that filter_limit implies sequential_limit</p></li>",
      "<li><p>Built the basic formalization framework for approximation algorithms</p></li>",
      "</ul>",
      "<p>🚧 In Progress：</p>",
      "<ul>",
      "<li><p>Proving the equivalence between the two limit definitions</p></li>",
      "<li><p>Formalizing the core logic behind the approximation of submodular functions</p></li>",
      "</ul>",
      "<p>❌ Next Steps：</p>",
      "<ul>",
      "<li><p>Complete and extend the formalization of the Nemhauser–Wolsey theorem</p></li>",
      "<li><p>Explore combining optimization theory with formal methods</p></li>",
      "</ul>",
      '<p><a class="read-more" href="../math.html">' + dict.backToMath + "</a></p>",
    ].join("");

    document.title = "My First Isabelle Formalization Project | Mathematics | Chronohaze";
  }

  function renderSubmodularGreedyPost(safeLang, dict) {
    var path = (window.location.pathname || "").toLowerCase();
    if (!/\/post\/isabelle-submodular-greedy\.html$/.test(path)) {
      return;
    }

    var article = document.querySelector(".article");
    if (!article) {
      return;
    }

    if (!article.dataset.zhHtml) {
      article.dataset.zhHtml = article.innerHTML;
    }

    if (safeLang !== "en") {
      article.innerHTML = article.dataset.zhHtml;
      document.title = "一个正在进行的 Isabelle 研究项目：Submodular Greedy 的形式化";
      return;
    }

    article.innerHTML = [
      "<h1>An Ongoing Isabelle Research Project: Formalising Submodular Greedy</h1>",
      '<p class="article-meta">HazezZ · Dec 29, 2025</p>',
      "<p>In my previous post “My First Isabelle Formalization Project”, I mainly wrote about why I chose Isabelle and what formalisation means to me as a way of doing mathematics. In this post, I want to document a more concrete object: an ongoing research project. Specifically, this project concerns the Isabelle formalisation of the (1 − 1/e) approximation guarantee of the greedy algorithm for monotone submodular maximisation under a cardinality constraint. This is not a presentation of a finished result, but a record of work in progress.</p>",
      "<h3><strong>What This Project Is About</strong></h3>",
      "<p>In combinatorial optimisation, there is a classical and widely used result:for maximising a monotone submodular function under a cardinality constraint, the simple greedy algorithm achieves an approximation ratio of 1 − 1/e. This result is commonly known as the Nemhauser–Wolsey theorem, and it appears repeatedly in machine learning, information theory, and coverage problems.</p>",
      "<p>In standard paper-and-pencil proofs, this theorem is usually presented in a highly abstract and intuition-driven way, relying on arguments such as averaging, marginal gains, and recursive inequalities.However, many of these steps implicitly depend on structural assumptions that are never made explicit.</p>",
      "<p>The goal of this project is not to reinvent the theorem, but to ask a more basic question: If we hand the entire proof to Isabelle, what exactly do we need to say out loud?</p>",
      "<h3><strong>Project Structure: From Theorem to System</strong></h3>",
      "<p>I currently structure the Isabelle formalisation into two main parts, corresponding to two core theory files:</p>",
      "<h4><strong>Greedy_Submodular_Construct.thy</strong></h4>",
      "<p>This part focuses on the algorithm and its structure:</p>",
      "<ul>",
      "<li><p>the formal definition of the greedy sequence</p></li>",
      "<li><p>an abstract treatment of marginal gains</p></li>",
      "<li><p>structural invariants maintained throughout the greedy process</p></li>",
      "</ul>",
      "<p>At this level, no approximation results are introduced.The goal is simply to make precise what the greedy algorithm is inside Isabelle.</p>",
      "<h4><strong>Greedy_Submodular_Approx.thy</strong></h4>",
      "<p>This part is responsible for the approximation analysis:</p>",
      "<ul>",
      "<li><p>a formal version of the averaging argument</p></li>",
      "<li><p>the establishment of a gap recurrence</p></li>",
      "<li><p>the derivation of the Nemhauser–Wolsey (1 − 1/e) bound</p></li>",
      "</ul>",
      "<p>This separation is not merely about code organisation.It is a deliberate design choice to keep the constructive and analytical aspects of the proof reusable and conceptually distinct, since they belong to different layers of reasoning.</p>",
      "<h3><strong>Why This Is Not “Obvious” in Isabelle</strong></h3>",
      "<p>In mathematical intuition, many arguments can be completed in a single sentence.In Isabelle, every step must be decomposed into explicit, checkable logical relations.</p>",
      "<p>Through this process, I gradually became aware of several points:</p>",
      "<ul>",
      "<li><p>some inequalities that appear “obvious” in informal proofs actually rely on unstated monotonicity or submodularity assumptions</p></li>",
      "<li><p>set transformations that are handled loosely on paper must be described with full precision in formalisation</p></li>",
      "<li><p>to avoid proof fragmentation, modularisation is essentially necessary, not optional</p></li>",
      "</ul>",
      "<p>Formalisation is not about making proofs artificially difficult.Rather, it forces us to confront an uncomfortable question:which conclusions truly follow from structure, and which ones we have simply learned to trust.</p>",
      "<h3><strong>Current Status</strong></h3>",
      "<p>This is an ongoing research project. The completed components so far include:</p>",
      "<ul>",
      "<li><p>a basic formal framework for the greedy algorithm</p></li>",
      "<li><p>marginal gains and related structural lemmas</p></li>",
      "<li><p>the core recursive structure required for the approximation analysis</p></li>",
      "</ul>",
      "<p>Parts that are still being refined or extended include:</p>",
      "<ul>",
      "<li><p>further modularisation of submodularity assumptions</p></li>",
      "<li><p>restructuring several technical lemmas in the approximation analysis</p></li>",
      "<li><p>keeping the interfaces clean for future instantiations and extensions</p></li>",
      "</ul>",
      "<h3><strong>What Comes Next</strong></h3>",
      "<p>In the next stage, I plan to:</p>",
      "<ul>",
      "<li><p>further abstract submodularity assumptions into reusable locales</p></li>",
      "<li><p>attempt concrete instantiations, such as coverage functions</p></li>",
      "<li><p>explore the formalisation of other greedy variants</p></li>",
      "<li><p>evaluate the feasibility of code extraction and executable experiments</p></li>",
      "</ul>",
      "<p>This project is better viewed as a developing research trajectory rather than a one-off proof task.</p>",
      "<h3><strong>Project Link</strong></h3>",
      "<p>The GitHub repository for this project (continuously updated):</p>",
      '<p><a class="read-more" href="https://github.com/lyuf09/isabelle-submodular-greedy/tree/main" target="_blank" rel="noopener noreferrer">https://github.com/lyuf09/isabelle-submodular-greedy/tree/main</a></p>',
      '<p><a class="read-more" href="../math.html">' + dict.backToMath + "</a></p>",
    ].join("");

    document.title =
      "An Ongoing Isabelle Research Project: Formalising Submodular Greedy | Mathematics | Chronohaze";
  }

  function renderSpring2026Post(safeLang, dict) {
    var path = (window.location.pathname || "").toLowerCase();
    if (!/\/post\/spring-2026\.html$/.test(path)) {
      return;
    }

    var article = document.querySelector(".article");
    if (!article) {
      return;
    }

    if (!article.dataset.zhHtml) {
      article.dataset.zhHtml = article.innerHTML;
    }

    if (safeLang !== "en") {
      article.innerHTML = article.dataset.zhHtml;
      document.title = "Spring 2026｜新科研记录的开始";
      return;
    }

    article.innerHTML = [
      "<h1>Spring 2026 | A New Research Direction</h1>",
      '<p class="article-meta">HazezZ · Jan 29, 2026</p>',
      "<p>This semester, I’m beginning an undergraduate research project in the ORIE department at Cornell, under the supervision of Professor Shoham Sabach.</p>",
      "<p>Before this, I pursued research training in a different direction, where I explored, supported by tools such as Isabelle, how rigorous mathematical structures can be expressed within formally verifiable logical systems. Although that work is still ongoing, the experience has gradually familiarized me with the rhythm of open ended research problems, and it has strengthened my conviction that I would like to continue working in areas where theory and structure play a central role.</p>",
      "<p>Last semester, I spent a term doing guided reading and theoretical preparation with Professor Sabach, and I also took his optimization course. This semester, I’m continuing with Optimization for AI, which I have found especially engaging. Through these discussions and coursework, I’ve been able to enter more deeply into the language and framework of modern optimization theory.</p>",
      "<p>Professor Sabach’s perspective resonates with me in a subtle way: his work reflects a strong mathematical foundation alongside a clear algorithmic viewpoint. This has been particularly helpful for me as a student trained in pure mathematics who is transitioning into optimization research, and I’m grateful for both his guidance and the space to explore.</p>",
      "<p>Building on this foundation, my research this semester will focus on first-order methods for constrained and composite optimization. I hope to gradually narrow toward a concrete research question within this area and make initial theoretical progress over the course of the semester.</p>",
      "<p>For me, this represents a new exploration, extending beyond my previous experience in formalization and theoretical reasoning, and moving further into the core questions of modern optimization methods, while trying to find my own entry point at the intersection of structure and algorithms.</p>",
      "<p>In the coming months, I will occasionally share brief notes and reflections as the project evolves, as a record and continuation of this research journey.</p>",
      '<p><a class="read-more" href="../math.html">' + dict.backToMath + "</a></p>",
    ].join("");

    document.title = "Spring 2026 | A New Research Direction | Mathematics | Chronohaze";
  }

  function renderMetalcorePost(safeLang, dict) {
    var path = (window.location.pathname || "").toLowerCase();
    if (!/\/post\/metalcore-piano-lab\.html$/.test(path)) {
      return;
    }

    var article = document.querySelector(".article");
    if (!article) {
      return;
    }

    if (!article.dataset.zhHtml) {
      article.dataset.zhHtml = article.innerHTML;
    }

    if (safeLang !== "en") {
      article.innerHTML = article.dataset.zhHtml;
      document.title = "Metalcore Piano Lab｜从音频到谱面：一个离散化的实验（WIP）";
      return;
    }

    article.innerHTML = [
      "<h1>Metalcore Piano Lab | From Audio to Chart: A Discretization Experiment (WIP)</h1>",
      '<p class="article-meta">HazezZ · Feb 7</p>',
      "<p>Sometimes I feel that the most mathematical part of music isn’t harmony or modality, but how rhythm turns something continuous into something countable.</p>",
      "<p>An audio track is a continuous time signal, a rhythm game chart, on the other hand is a sequence of discrete events, notes. Mapping the former to the latter is essentially a structured discretization problem, detection, estimation, segmentation, alignment, and finally turning the output into something playable and interactive.</p>",
      "<p>Metalcore Piano Lab is a browserbased prototype I’ve been building recently. You upload a metalcore / progmetal audio file (or midi), and the system analyzes it and generates a multi track, piano style chart that you can play right away. It’s still in development, note recognition has plenty of room to improve. But I want to document it now as a research style log in my “math” section so the core idea stays clear and traceable.</p>",
      "<h2>What I’m Building</h2>",
      "<p>This is a research-driven web rhythm game prototype, honestly, I started it for fun, but it also feels like the kind of project that could become a nice “signal” on a PhD application if I develop it seriously (haha).</p>",
      "<p>Usage is straightforward: upload a local audio file (mp3 / wav / m4a) or a midi file, click analyze, wait for the chart to generate, and then play using the keyboard (supports 4/6/8 keys and multiple difficulty levels).</p>",
      "<h2>Core Idea: From a Continuous Signal to Discrete Events</h2>",
      "<p>The current pipeline looks roughly like this:</p>",
      "<p><strong>Onset / beat-event detection</strong><br />Which time points count as “events”? Drum hits, pick attacks, downbeats, these instants form the skeleton of the chart.</p>",
      "<p><strong>Tempo estimation and beat tracking</strong><br />Where should events land so that they feel musical? This step produces a beat grid so notes can be quantized and drifting is controlled.</p>",
      "<p><strong>Time-signature estimation</strong><br />This makes grouping and emphasis feel more natural, especially in metalcore, where unusual groupings are common. The time signature affects the player’s “cognitive cost” of understanding patterns.</p>",
      "<p><strong>Adaptive segmentation and template alignment</strong><br />One thing I care about a lot is consistency across repeated sections. If the same riff comes back but the chart logic “mutates,” players immediately feel that something is off.<br />So I’d rather have the system recognize sectional structure and keep repeated parts aligned, instead of generating each section from scratch.</p>",
      "<p><strong>Perceptual alignment</strong><br />In the end, it’s not only about aligning “mathematical time points,” but also aligning with human perception: what should be emphasized, what density becomes unplayable, and what patterns feel like something a human could actually practice and learn.</p>",
      "<h2>Why I’m Putting This in the “Math” Section</h2>",
      "<p>The interesting part here isn’t “I built a small game.” It’s that you’re forced to turn a pile of fuzzy intuitions, groove, downbeats, phrasing, playability, into structures that are computable and reproducible.</p>",
      "<p>And metalcore is an unusually good stress test: dense rhythms, heavy syncopation, frequent pattern shifts. It pushes the algorithm to answer, head-on, what “stable” means, what “consistent” means, and what a human would consider “reasonable.”</p>",
      "<h2>Current Status (and Known Limitations)</h2>",
      "<p>This is a WIP prototype, so I want to be explicit about its boundaries:</p>",
      "<ul>",
      "<li><p>It’s currently a lightweight, browser native implementation and does not perform deep stem separation. So when the mix is muddy or the arrangement is highly layered, chart quality can degrade.</p></li>",
      "<li><p>With complex polymeter or abrupt tempo changes, beat and time signature related stability may drop, leading to noticeable variance in chart quality.</p></li>",
      "</ul>",
      "<p>I don’t view this as failure, more like the kind of boundary conditions that an honest experiment should record, what inputs break the system, and what changes improve it.</p>",
      "<h2>What I Want to Improve Next</h2>",
      "<p>My next focus is making the auto-generated charts feel more like something a human would write:</p>",
      "<ul>",
      "<li><p>Improve tempo/beat tracking stability under tempo changes and strong syncopation</p></li>",
      "<li><p>Strengthen sectioning + template alignment so repeated parts stay consistent and drift less</p></li>",
      "<li><p>Build clearer difficulty scaling, map density, span, and left/right-hand load into an interpretable difficulty curve</p></li>",
      "<li><p>Add more playability constraints (avoid unnecessary jacks, overly large jumps, awkward hand positions, etc.)</p></li>",
      "<li><p>Finer offset/latency calibration so timing judgment feels tighter</p></li>",
      "</ul>",
      "<h2>Project Link</h2>",
      '<p><a class="read-more" href="https://github.com/lyuf09/metalcore-piano-lab" target="_blank" rel="noopener noreferrer">https://github.com/lyuf09/metalcore-piano-lab</a></p>',
      '<p><a class="read-more" href="../math.html">' + dict.backToMath + "</a></p>",
    ].join("");

    document.title =
      "Metalcore Piano Lab | From Audio to Chart: A Discretization Experiment (WIP) | Mathematics | Chronohaze";
  }

  function getMusicTrackTitleOverridesEn() {
    return {
      "music/track-01.html": "Sincerely, Spring (春日和煦)",
      "music/track-03.html": "Moonlit Garden (花园)",
      "music/track-05.html": "Silt (Yu) (淤)",
      "music/track-07.html": "Hakoniwa (A Miniature Garden) (箱庭)",
      "music/track-08.html": "Honkaku mystery (本格推理)",
      "music/track-10.html": "I Can’t Fall in Love Again (恋に落ちられない) (audio pending upload)",
      "music/track-11.html": "I hate you all. (我恨你们所有人)",
      "music/track-13.html": "Red Sandalwood (小葉紫檀)",
      "music/track-14.html": "Willow (柳)",
      "music/track-15.html": "Yorugao (Moonflower) (夜顔)",
      "music/track-16.html": "Mortal Frame (Utsusemi) (現人)",
      "music/track-17.html": "Moonlapse (feat. Johnny Zhou)",
      "music/track-20.html": "Supernova (スパーノヴァ)",
      "music/track-21.html": "Lone Star Prelude (孤星Prelude)",
      "music/track-23.html": "Fomalhaut (フォーマルハウト/南鱼座α)",
      "music/track-24.html": "The Guilt (罪)",
      "music/track-25.html": "Jellyfish and the Lake (水母与湖)",
      "music/track-26.html":
        "Daybreak, the Borderline of Light and Dark (夜明け、明暗の境目/凌晨、明暗交界处)",
      "music/track-27.html": "Cardiac Alarm (心臓警報)",
      "music/track-28.html": "Afterimage (影)",
      "music/track-29.html": "I Hope I’ll Meet the Future (未来に出会えたらいいな)",
      "music/track-30.html": "Dissociative Amnesia (分离性遗忘症)",
    };
  }

  function splitMusicTags(raw) {
    if (!raw) {
      return [];
    }

    return String(raw)
      .split(",")
      .map(function (tag) {
        return tag.trim().toLowerCase();
      })
      .filter(Boolean);
  }

  function uniqueMusicTags(tags) {
    var seen = Object.create(null);
    return tags.filter(function (tag) {
      if (seen[tag]) {
        return false;
      }
      seen[tag] = true;
      return true;
    });
  }

  function sanitizeMusicTags(tags) {
    var hidden = {
      wip: true,
      audio: true,
      pending: true,
    };
    return tags.filter(function (tag) {
      return !hidden[tag];
    });
  }

  function inferMusicRowType(row, titleText) {
    if (row.classList.contains("track-row-album")) {
      return "album";
    }
    return "single";
  }

  function parseMusicRowYear(row) {
    var dateNode = row.querySelector(".track-date");
    var dateText = dateNode ? dateNode.textContent || "" : "";
    var match = dateText.match(/(20\d{2})/);
    return match ? match[1] : "";
  }

  function getMusicTagLabel(tag, dict) {
    var map = {
      album: dict.musicTagAlbum,
      single: dict.musicTagSingle,
      wip: dict.musicTagWip,
      audio: dict.musicTagAudio,
      pending: dict.musicTagPending,
      collab: dict.musicTagCollab,
      instrumental: dict.musicTagInstrumental,
      jrock: dict.musicTagJrock,
      progcore: dict.musicTagProgcore,
      mathrock: dict.musicTagMathrock,
      posthardcore: dict.musicTagPosthardcore,
      jazz: dict.musicTagJazz,
      hardrock: dict.musicTagHardrock,
      emorock: dict.musicTagEmorock,
      postrock: dict.musicTagPostrock,
      pop: dict.musicTagPop,
      indie: dict.musicTagIndie,
    };
    return map[tag] || tag;
  }

  function ensureMusicRowTags(row, tags, dict) {
    var metaWrap = row.querySelector("div");
    if (!metaWrap) {
      return;
    }

    metaWrap.classList.add("track-meta");
    var tagsWrap = metaWrap.querySelector(".track-tags");
    if (!tagsWrap) {
      tagsWrap = document.createElement("div");
      tagsWrap.className = "track-tags";
      metaWrap.appendChild(tagsWrap);
    }

    tagsWrap.textContent = "";
    tags.forEach(function (tag) {
      var node = document.createElement("span");
      node.className = "track-tag";
      node.dataset.tag = tag;
      node.textContent = getMusicTagLabel(tag, dict);
      tagsWrap.appendChild(node);
    });
  }

  function setupMusicIndexArchitecture() {
    if (!document.body || !document.body.classList.contains("music-index-page")) {
      return;
    }

    var rootSection = document.querySelector(".music-index-page .section");
    var sourceList = document.querySelector(".music-index-page .section .music-list");
    if (!rootSection || !sourceList) {
      return;
    }

    var dict = getSecondaryPageDictionary(detectPreferredLanguage());
    var shell = rootSection.querySelector(".music-ia-shell");
    var rows = Array.from(sourceList.querySelectorAll(".track-row"));
    if (!rows.length) {
      return;
    }

    if (!shell) {
      shell = document.createElement("div");
      shell.className = "container music-ia-shell";

      var controls = document.createElement("div");
      controls.className = "music-ia-controls";

      var tabs = document.createElement("div");
      tabs.className = "music-ia-tabs";
      tabs.setAttribute("role", "tablist");

      [
        { key: "album", label: dict.musicTabAlbum },
        { key: "single", label: dict.musicTabSingles },
      ].forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "music-ia-tab";
        button.dataset.groupFilter = item.key;
        button.textContent = item.label;
        if (item.key === "single") {
          button.classList.add("is-active");
        }
        tabs.appendChild(button);
      });

      var filters = document.createElement("div");
      filters.className = "music-ia-filters";

      function buildFilter(labelText, filterName) {
        var wrapper = document.createElement("label");
        wrapper.className = "music-ia-filter";
        var label = document.createElement("span");
        label.className = "music-ia-filter-label";
        label.textContent = labelText;
        var select = document.createElement("select");
        select.className = "music-ia-filter-select";
        select.dataset.filter = filterName;
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        return wrapper;
      }

      filters.appendChild(buildFilter(dict.musicFilterYear, "year"));
      filters.appendChild(buildFilter(dict.musicFilterTag, "tag"));
      filters.appendChild(buildFilter(dict.musicFilterAudio, "audio"));

      controls.appendChild(tabs);
      controls.appendChild(filters);

      var groups = document.createElement("div");
      groups.className = "music-group-stack";
      [
        { key: "album", label: dict.musicGroupAlbum },
        { key: "single", label: dict.musicGroupSingles },
      ].forEach(function (item) {
        var group = document.createElement("section");
        group.className = "music-group";
        group.dataset.group = item.key;

        var heading = document.createElement("h3");
        heading.className = "music-group-title";
        var text = document.createElement("span");
        text.className = "music-group-title-text";
        text.textContent = item.label;
        var count = document.createElement("span");
        count.className = "music-group-count";
        count.dataset.groupCount = item.key;
        heading.appendChild(text);
        heading.appendChild(count);

        var list = document.createElement("div");
        list.className = "music-list music-list-group";
        list.dataset.listGroup = item.key;

        group.appendChild(heading);
        group.appendChild(list);
        groups.appendChild(group);
      });

      var empty = document.createElement("p");
      empty.className = "music-ia-empty";
      empty.textContent = dict.musicNoResults;
      empty.hidden = true;

      sourceList.classList.add("music-list-source");
      sourceList.hidden = true;

      shell.appendChild(controls);
      shell.appendChild(groups);
      shell.appendChild(empty);
      shell.appendChild(sourceList);
      rootSection.textContent = "";
      rootSection.appendChild(shell);
    }

    var yearSelect = shell.querySelector('select[data-filter="year"]');
    var tagSelect = shell.querySelector('select[data-filter="tag"]');
    var audioSelect = shell.querySelector('select[data-filter="audio"]');
    var tabs = Array.from(shell.querySelectorAll(".music-ia-tab"));
    var emptyState = shell.querySelector(".music-ia-empty");
    var groupSections = Array.from(shell.querySelectorAll(".music-group"));
    var albumList = shell.querySelector('[data-list-group="album"]');
    var singlesList = shell.querySelector('[data-list-group="single"]');

    if (!yearSelect || !tagSelect || !audioSelect || !albumList || !singlesList) {
      return;
    }

    var yearValues = [];
    var tagValues = [];

    rows.forEach(function (row) {
      var titleNode = row.querySelector(".track-title");
      var artistNode = row.querySelector(".track-artist");
      var titleText = titleNode ? titleNode.textContent || "" : "";
      var artistText = artistNode ? artistNode.textContent || "" : "";

      var type = row.dataset.musicType || inferMusicRowType(row, titleText);
      var hasAudio = /音频待上传|audio pending upload/i.test(titleText || "")
        ? "0"
        : "1";
      var year = row.dataset.musicYear || parseMusicRowYear(row);
      var tags = sanitizeMusicTags(splitMusicTags(row.dataset.tags || ""));

      if (!tags.length) {
        tags.push(type === "album" ? "album" : "single");
      }
      if (/\//.test(artistText || "") || /feat\.?|ft\.?/i.test(titleText || "")) {
        tags.push("collab");
      }

      tags = uniqueMusicTags(sanitizeMusicTags(tags));

      row.dataset.musicType = type;
      row.dataset.musicYear = year;
      row.dataset.hasAudio = hasAudio;
      row.dataset.tags = tags.join(",");
      row.classList.remove("track-row-album", "track-row-single", "track-row-wip");
      row.classList.add("track-row-" + type);

      ensureMusicRowTags(row, tags, dict);

      if (year) {
        yearValues.push(year);
      }
      tagValues = tagValues.concat(tags);

      if (type === "album") {
        albumList.appendChild(row);
      } else {
        singlesList.appendChild(row);
      }
    });

    yearValues = uniqueMusicTags(yearValues).sort(function (a, b) {
      return Number(b) - Number(a);
    });

    var tagOrder = [
      "album",
      "single",
      "collab",
      "instrumental",
      "jrock",
      "progcore",
      "mathrock",
      "posthardcore",
      "jazz",
      "hardrock",
      "emorock",
      "postrock",
      "pop",
      "indie",
    ];
    tagValues = uniqueMusicTags(tagValues).sort(function (a, b) {
      var ia = tagOrder.indexOf(a);
      var ib = tagOrder.indexOf(b);
      if (ia >= 0 && ib >= 0) {
        return ia - ib;
      }
      if (ia >= 0) {
        return -1;
      }
      if (ib >= 0) {
        return 1;
      }
      return a.localeCompare(b);
    });

    function fillSelect(selectNode, allLabel, values, displayFn) {
      var current = selectNode.value || "all";
      selectNode.textContent = "";
      var allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = allLabel;
      selectNode.appendChild(allOption);

      values.forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = displayFn ? displayFn(value) : value;
        selectNode.appendChild(option);
      });

      if (Array.from(selectNode.options).some(function (opt) { return opt.value === current; })) {
        selectNode.value = current;
      } else {
        selectNode.value = "all";
      }
    }

    fillSelect(yearSelect, dict.musicFilterAllYears, yearValues, null);
    fillSelect(tagSelect, dict.musicFilterAllTags, tagValues, function (tag) {
      return getMusicTagLabel(tag, dict);
    });
    fillSelect(audioSelect, dict.musicFilterAudioAll, ["ready", "pending"], function (value) {
      return value === "ready" ? dict.musicFilterAudioReady : dict.musicFilterAudioPending;
    });

    var titleMap = {
      album: dict.musicTabAlbum,
      single: dict.musicTabSingles,
    };
    tabs.forEach(function (tab) {
      tab.textContent = titleMap[tab.dataset.groupFilter] || tab.textContent;
    });

    var filterLabels = shell.querySelectorAll(".music-ia-filter-label");
    if (filterLabels[0]) filterLabels[0].textContent = dict.musicFilterYear;
    if (filterLabels[1]) filterLabels[1].textContent = dict.musicFilterTag;
    if (filterLabels[2]) filterLabels[2].textContent = dict.musicFilterAudio;

    var groupTitleMap = {
      album: dict.musicGroupAlbum,
      single: dict.musicGroupSingles,
    };
    groupSections.forEach(function (group) {
      var key = group.dataset.group;
      var titleNode = group.querySelector(".music-group-title-text");
      if (titleNode && groupTitleMap[key]) {
        titleNode.textContent = groupTitleMap[key];
      }
    });
    emptyState.textContent = dict.musicNoResults;

    function activeGroupFilter() {
      var active = shell.querySelector(".music-ia-tab.is-active");
      return active ? active.dataset.groupFilter : "single";
    }

    function applyFilters() {
      var groupFilter = activeGroupFilter();
      var yearFilter = yearSelect.value || "all";
      var tagFilter = tagSelect.value || "all";
      var audioFilter = audioSelect.value || "all";

      var visibleTotal = 0;

      rows.forEach(function (row) {
        var type = row.dataset.musicType || "single";
        var year = row.dataset.musicYear || "";
        var hasAudio = row.dataset.hasAudio === "1";
        var tags = splitMusicTags(row.dataset.tags || "");

        var matchesGroup = type === groupFilter;
        var matchesYear = yearFilter === "all" || year === yearFilter;
        var matchesTag = tagFilter === "all" || tags.indexOf(tagFilter) >= 0;
        var matchesAudio =
          audioFilter === "all" ||
          (audioFilter === "ready" && hasAudio) ||
          (audioFilter === "pending" && !hasAudio);

        var visible = matchesGroup && matchesYear && matchesTag && matchesAudio;
        row.hidden = !visible;
        row.classList.toggle("is-filter-hidden", !visible);
        if (visible) {
          visibleTotal += 1;
        }
      });

      groupSections.forEach(function (group) {
        var key = group.dataset.group;
        var groupRows = Array.from(group.querySelectorAll(".track-row"));
        var visibleCount = groupRows.filter(function (row) {
          return !row.hidden;
        }).length;
        var countNode = group.querySelector("[data-group-count]");
        if (countNode) {
          countNode.textContent = visibleCount > 0 ? " (" + visibleCount + ")" : " (0)";
        }

        if (key !== groupFilter) {
          group.hidden = true;
          group.classList.add("is-filter-hidden");
        } else {
          group.hidden = visibleCount === 0;
          group.classList.toggle("is-filter-hidden", visibleCount === 0);
        }
      });

      emptyState.hidden = visibleTotal > 0;
    }

    if (shell.dataset.musicFiltersBound !== "1") {
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          tabs.forEach(function (node) {
            node.classList.remove("is-active");
          });
          tab.classList.add("is-active");
          applyFilters();
        });
      });

      [yearSelect, tagSelect, audioSelect].forEach(function (select) {
        select.addEventListener("change", applyFilters);
      });

      shell.dataset.musicFiltersBound = "1";
    }

    applyFilters();
  }

  function getSearchSectionKey(sectionText) {
    var section = normalizeText(sectionText || "").toLowerCase();
    if (section === "mathematics" || section === "math") {
      return "math";
    }
    if (section === "music") {
      return "music";
    }
    if (section === "photography" || section === "photo") {
      return "photo";
    }
    if (section === "cv") {
      return "cv";
    }
    return "other";
  }

  function getSearchItemScope(item) {
    if (!item || typeof item !== "object") {
      return "other";
    }

    var explicit = String(item.scope || "").toLowerCase();
    if (
      explicit === "all" ||
      explicit === "math" ||
      explicit === "music" ||
      explicit === "photo" ||
      explicit === "cv" ||
      explicit === "site"
    ) {
      return explicit === "all" ? "other" : explicit;
    }

    var key = getSearchSectionKey(item.section || "");
    if (key !== "other") {
      return key;
    }

    var url = String(item.url || "").toLowerCase();
    if (/^post\/|(?:^|\/)math\.html(?:$|[?#])/.test(url)) {
      return "math";
    }
    if (/^music\/|(?:^|\/)yin-le\.html(?:$|[?#])/.test(url)) {
      return "music";
    }
    if (/^photo\/|(?:^|\/)portfolio-1\.html(?:$|[?#])/.test(url)) {
      return "photo";
    }
    if (/(?:^|\/)cv\.html(?:$|[?#])/.test(url)) {
      return "cv";
    }
    return "site";
  }

  function getSearchSectionLabel(item, dict) {
    var key = getSearchItemScope(item);
    if (key === "math") {
      return dict.searchScopeMath;
    }
    if (key === "music") {
      return dict.searchScopeMusic;
    }
    if (key === "photo") {
      return dict.searchScopePhoto;
    }
    if (key === "cv") {
      return dict.searchScopeCV;
    }
    return item && item.section ? item.section : dict.searchScopeAll;
  }

  function setupSearchIndexPage() {
    if (!document.body || !document.body.classList.contains("search-index-page")) {
      return;
    }

    var lang = detectPreferredLanguage();
    var dict = getSecondaryPageDictionary(lang);
    var params = new URLSearchParams(window.location.search);

    var titleNode = document.querySelector("[data-search-title]");
    var introNode = document.querySelector("[data-search-intro]");
    var keywordLabelNode = document.querySelector("[data-search-keyword-label]");
    var inputNode = document.querySelector("#site-search-input");
    var scopeNode = document.querySelector("#site-search-scope");
    var scopeLabelNode = document.querySelector("[data-search-scope-label]");
    var tagNode = document.querySelector("#site-search-tag");
    var tagLabelNode = document.querySelector("[data-search-tag-label]");
    var statusNode = document.querySelector(".search-status");
    var skeletonNode = document.querySelector(".search-skeleton");
    var listNode = document.querySelector(".search-results");
    var emptyNode = document.querySelector(".search-empty");
    var fallbackPanel = document.querySelector(".search-fallback-actions");
    var fallbackTextNode = document.querySelector("[data-search-fallback-text]");
    var fallbackMathNode = document.querySelector("[data-search-fallback-math]");
    var fallbackPhotoNode = document.querySelector("[data-search-fallback-photo]");
    var fallbackMusicNode = document.querySelector("[data-search-fallback-music]");
    var fallbackCVNode = document.querySelector("[data-search-fallback-cv]");
    var fallbackExternalNode = document.querySelector("[data-search-fallback-external]");
    var formNode = document.querySelector(".search-form");
    var submitNode = document.querySelector(".search-submit");

    if (
      !inputNode ||
      !scopeNode ||
      !tagNode ||
      !statusNode ||
      !listNode ||
      !emptyNode ||
      !formNode
    ) {
      return;
    }

    if (titleNode) {
      titleNode.textContent = dict.searchPageTitle;
    }
    if (introNode) {
      introNode.textContent = dict.searchIntro;
    }
    if (keywordLabelNode) {
      keywordLabelNode.textContent = dict.searchKeywordLabel;
    }
    if (scopeLabelNode) {
      scopeLabelNode.textContent = dict.searchScopeLabel;
    }
    if (tagLabelNode) {
      tagLabelNode.textContent = dict.searchTagLabel;
    }
    if (submitNode) {
      submitNode.textContent = dict.searchSubmit;
    }
    if (fallbackTextNode) {
      fallbackTextNode.textContent = dict.searchFallbackText;
    }
    if (fallbackMathNode) {
      fallbackMathNode.textContent = dict.searchFallbackMath;
    }
    if (fallbackPhotoNode) {
      fallbackPhotoNode.textContent = dict.searchFallbackPhoto;
    }
    if (fallbackMusicNode) {
      fallbackMusicNode.textContent = dict.searchFallbackMusic;
    }
    if (fallbackCVNode) {
      fallbackCVNode.textContent = dict.searchFallbackCV;
    }
    if (fallbackExternalNode) {
      fallbackExternalNode.textContent = dict.searchFallbackExternal;
    }
    inputNode.placeholder = dict.searchPlaceholder;

    var scopeLabels = {
      all: dict.searchScopeAll,
      math: dict.searchScopeMath,
      photo: dict.searchScopePhoto,
      music: dict.searchScopeMusic,
      cv: dict.searchScopeCV,
    };
    Array.from(scopeNode.options).forEach(function (option) {
      var value = option.value || "all";
      if (scopeLabels[value]) {
        option.textContent = scopeLabels[value];
      }
    });

    var initialQuery = params.get("q") || "";
    var initialScope = params.get("scope") || "all";
    var initialTag = params.get("tag") || "all";
    inputNode.value = initialQuery;
    if (Array.from(scopeNode.options).some(function (option) { return option.value === initialScope; })) {
      scopeNode.value = initialScope;
    }

    var allItems = [];
    var scopeCache = Object.create(null);
    var loaded = false;
    var loadError = false;
    var usingFallback = false;
    var loadToken = 0;
    var scopeFiles = {
      math: "assets/search-data/math.json",
      photo: "assets/search-data/photo.json",
      music: "assets/search-data/music.json",
      cv: "assets/search-data/cv.json",
      site: "assets/search-data/site.json",
    };
    var allScopes = ["math", "photo", "music", "cv", "site"];
    statusNode.textContent = dict.searchLoading;
    emptyNode.hidden = true;
    if (fallbackPanel) {
      fallbackPanel.hidden = true;
    }

    function setFallbackVisibility(visible) {
      if (!fallbackPanel) {
        return;
      }
      fallbackPanel.hidden = !visible;
    }

    function updateFallbackExternalLink() {
      if (!fallbackExternalNode) {
        return;
      }
      var query = normalizeText(inputNode.value || "").trim();
      var q = "site:chronohaze.space";
      if (query) {
        q += " " + query;
      }
      fallbackExternalNode.href =
        "https://www.google.com/search?q=" + encodeURIComponent(q);
    }

    function updateSearchUrl(query, scope, tag) {
      var url = new URL(window.location.href);
      if (query) {
        url.searchParams.set("q", query);
      } else {
        url.searchParams.delete("q");
      }
      if (scope && scope !== "all") {
        url.searchParams.set("scope", scope);
      } else {
        url.searchParams.delete("scope");
      }
      if (tag && tag !== "all") {
        url.searchParams.set("tag", tag);
      } else {
        url.searchParams.delete("tag");
      }
      history.replaceState(null, "", url.toString());
    }

    function normalizeItems(payload) {
      var items = Array.isArray(payload) ? payload : payload && payload.items;
      if (!Array.isArray(items)) {
        return [];
      }
      return items.filter(function (item) {
        return item && typeof item === "object" && item.url;
      });
    }

    function dedupeByUrl(items) {
      var seen = Object.create(null);
      return items.filter(function (item) {
        var key = String(item.url || "");
        if (!key) {
          return false;
        }
        if (seen[key]) {
          return false;
        }
        seen[key] = true;
        return true;
      });
    }

    function setLoadingState(text) {
      if (skeletonNode) {
        skeletonNode.classList.remove("is-hidden");
        skeletonNode.hidden = false;
        skeletonNode.setAttribute("aria-hidden", "false");
        skeletonNode.style.display = "";
      }
      listNode.textContent = "";
      emptyNode.hidden = true;
      setFallbackVisibility(false);
      statusNode.textContent = text || dict.searchLoading;
    }

    function setLoadedState() {
      if (skeletonNode) {
        skeletonNode.classList.add("is-hidden");
        skeletonNode.hidden = true;
        skeletonNode.setAttribute("aria-hidden", "true");
        skeletonNode.style.display = "none";
      }
      setFallbackVisibility(false);
    }

    function getItemTagLabels(item) {
      var tags = Array.isArray(item && item.tags) ? item.tags : [];
      return tags
        .map(function (tag) {
          return String(tag || "").trim().toLowerCase();
        })
        .filter(Boolean);
    }

    function buildTagOptions() {
      var selectedScope = scopeNode.value || "all";
      var selectedTag = tagNode.value || initialTag || "all";
      var pool = allItems.filter(function (item) {
        return selectedScope === "all" || getSearchItemScope(item) === selectedScope;
      });
      var tags = [];
      pool.forEach(function (item) {
        tags = tags.concat(getItemTagLabels(item));
      });
      tags = uniqueMusicTags(tags).sort();

      tagNode.textContent = "";
      var allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = dict.searchTagAll;
      tagNode.appendChild(allOption);

      tags.forEach(function (tag) {
        var option = document.createElement("option");
        option.value = tag;
        option.textContent = getMusicTagLabel(tag, dict);
        tagNode.appendChild(option);
      });

      if (Array.from(tagNode.options).some(function (option) { return option.value === selectedTag; })) {
        tagNode.value = selectedTag;
      } else {
        tagNode.value = "all";
      }
    }

    function withTimeout(promise, timeoutMs) {
      return new Promise(function (resolve, reject) {
        var settled = false;
        var timer = window.setTimeout(function () {
          if (settled) {
            return;
          }
          settled = true;
          reject(new Error("timeout"));
        }, timeoutMs);

        promise.then(
          function (value) {
            if (settled) {
              return;
            }
            settled = true;
            window.clearTimeout(timer);
            resolve(value);
          },
          function (error) {
            if (settled) {
              return;
            }
            settled = true;
            window.clearTimeout(timer);
            reject(error);
          }
        );
      });
    }

    function getAssetCandidateUrls(relativePath) {
      var rel = String(relativePath || "").replace(/^\.\//, "");
      var urls = [];

      function push(url) {
        if (!url || urls.indexOf(url) >= 0) {
          return;
        }
        urls.push(url);
      }

      push(rel);
      push("./" + rel);

      try {
        var page = new URL(window.location.href);
        var pageBase = String(page.pathname || "").replace(/[^/]*$/, "/");
        if (pageBase) {
          push(pageBase + rel);
        }
        push(page.origin + pageBase + rel);
        push(page.origin + "/" + rel);
      } catch (_error) {
      }

      var scriptNode = document.querySelector('script[src*="protect-media.js"]');
      if (scriptNode) {
        try {
          var scriptUrl = new URL(scriptNode.getAttribute("src"), window.location.href);
          var scriptBase = String(scriptUrl.pathname || "").replace(/[^/]*$/, "/");
          push(scriptBase + rel);
          push(scriptUrl.origin + scriptBase + rel);
        } catch (_error2) {
        }
      }

      push("/" + rel);
      return urls;
    }

    function fetchJsonFromCandidates(relativePath) {
      var candidates = getAssetCandidateUrls(relativePath);
      var index = 0;

      function tryNext() {
        if (index >= candidates.length) {
          return Promise.reject(new Error("not found"));
        }
        var url = candidates[index];
        index += 1;

        return withTimeout(
          fetch(url, { cache: "no-cache" }).then(function (response) {
            if (!response.ok) {
              throw new Error("HTTP " + response.status);
            }
            return response.json();
          }),
          8000
        ).catch(function () {
          return tryNext();
        });
      }

      return tryNext();
    }

    function fetchScopeIndex(scope) {
      if (scopeCache[scope]) {
        return Promise.resolve(scopeCache[scope]);
      }
      var file = scopeFiles[scope];
      if (!file) {
        scopeCache[scope] = [];
        return Promise.resolve([]);
      }
      return fetchJsonFromCandidates(file)
        .then(function (payload) {
          var items = normalizeItems(payload).map(function (item) {
            if (!item.scope) {
              item.scope = scope;
            }
            return item;
          });
          scopeCache[scope] = items;
          return items;
        });
    }

    function loadCombinedFallback() {
      function parseInlineFallback() {
        var node = document.getElementById("search-inline-fallback");
        if (!node) {
          return [];
        }
        try {
          var payload = JSON.parse(node.textContent || "[]");
          return normalizeItems(payload);
        } catch (_error) {
          return [];
        }
      }

      return fetchJsonFromCandidates("assets/search-index.json")
        .then(function (payload) {
          return normalizeItems(payload);
        })
        .catch(function () {
          var inlineItems = parseInlineFallback();
          if (inlineItems.length) {
            return inlineItems;
          }
          throw new Error("fallback unavailable");
        });
    }

    function loadItemsForScope(scope) {
      loadToken += 1;
      var currentToken = loadToken;
      loaded = false;
      loadError = false;
      usingFallback = false;

      var targetScopes = scope === "all" ? allScopes.slice() : [scope];
      setLoadingState(dict.searchLoading);

      var collected = [];
      var chain = Promise.resolve();
      targetScopes.forEach(function (targetScope, index) {
        chain = chain.then(function () {
          var progressText = dict.searchLoadingProgress
            .replace("{done}", String(index + 1))
            .replace("{total}", String(targetScopes.length));
          setLoadingState(progressText);
          return fetchScopeIndex(targetScope).then(function (items) {
            collected = collected.concat(items);
          });
        });
      });

      return chain
        .then(function () {
          if (currentToken !== loadToken) {
            return;
          }
          allItems = dedupeByUrl(collected);
          loaded = true;
          setLoadedState();
          buildTagOptions();
          renderResults();
        })
        .catch(function () {
          if (currentToken !== loadToken) {
            return;
          }
          return loadCombinedFallback()
            .then(function (items) {
              allItems = dedupeByUrl(items);
              loaded = true;
              usingFallback = true;
              setLoadedState();
              buildTagOptions();
              renderResults();
            })
            .catch(function () {
              loaded = true;
              loadError = true;
              usingFallback = false;
              setLoadedState();
              renderResults();
            });
        });
    }

    function renderResults() {
      if (!loaded) {
        setLoadingState(statusNode.textContent || dict.searchLoading);
        return;
      }

      if (loadError) {
        statusNode.textContent = dict.searchLoadError;
        emptyNode.hidden = false;
        emptyNode.textContent = dict.searchLoadError;
        listNode.textContent = "";
        setFallbackVisibility(true);
        return;
      }

      var query = normalizeText(inputNode.value || "").toLowerCase().trim();
      var scope = scopeNode.value || "all";
      var tag = tagNode.value || "all";
      var terms = query ? query.split(/\s+/).filter(Boolean) : [];

      var matched = allItems.filter(function (item) {
        var itemScope = getSearchItemScope(item);
        var itemTags = getItemTagLabels(item);
        if (scope !== "all" && itemScope !== scope) {
          return false;
        }
        if (tag !== "all" && itemTags.indexOf(tag) < 0) {
          return false;
        }
        if (!terms.length) {
          return true;
        }
        var pool = normalizeText(
          [
            item.title || "",
            item.excerpt || "",
            item.content || "",
            item.section || "",
            itemTags.join(" "),
            item.date || "",
          ].join(" ")
        ).toLowerCase();
        return terms.every(function (term) {
          return pool.indexOf(term) >= 0;
        });
      });

      matched.sort(function (a, b) {
        return Number(b.sort || 0) - Number(a.sort || 0);
      });

      updateSearchUrl(query, scope, tag);
      var status = dict.searchResultCount.replace("{count}", String(matched.length));
      if (usingFallback) {
        status += " · " + dict.searchFallbackNotice;
      }
      statusNode.textContent = status;
      setFallbackVisibility(false);

      listNode.textContent = "";
      if (!matched.length) {
        emptyNode.hidden = false;
        emptyNode.textContent = query || tag !== "all" ? dict.searchResultZero : dict.searchEmptyHint;
        return;
      }

      emptyNode.hidden = true;
      var fragment = document.createDocumentFragment();
      matched.forEach(function (item) {
        var li = document.createElement("li");
        li.className = "search-result-item";

        var link = document.createElement("a");
        link.className = "search-result-link";
        link.href = item.url || "#";

        var title = document.createElement("h3");
        title.className = "search-result-title";
        title.textContent = item.title || "";

        var meta = document.createElement("p");
        meta.className = "search-result-meta";
        var sectionLabel = getSearchSectionLabel(item, dict);
        meta.textContent = [item.date || "", sectionLabel].filter(Boolean).join(" · ");

        var excerpt = document.createElement("p");
        excerpt.className = "search-result-excerpt";
        excerpt.textContent = item.excerpt || "";

        var tagsWrap = document.createElement("div");
        tagsWrap.className = "search-result-tags";
        getItemTagLabels(item).slice(0, 4).forEach(function (tagText) {
          var chip = document.createElement("span");
          chip.className = "search-result-tag";
          chip.textContent = getMusicTagLabel(tagText, dict);
          tagsWrap.appendChild(chip);
        });

        link.appendChild(title);
        if (meta.textContent) {
          link.appendChild(meta);
        }
        if (excerpt.textContent) {
          link.appendChild(excerpt);
        }
        if (tagsWrap.childNodes.length) {
          link.appendChild(tagsWrap);
        }
        li.appendChild(link);
        fragment.appendChild(li);
      });
      listNode.appendChild(fragment);
    }

    var debounceTimer = null;
    inputNode.addEventListener("input", function () {
      updateFallbackExternalLink();
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(renderResults, 140);
    });

    scopeNode.addEventListener("change", function () {
      initialTag = "all";
      updateFallbackExternalLink();
      loadItemsForScope(scopeNode.value || "all");
    });
    tagNode.addEventListener("change", function () {
      updateFallbackExternalLink();
      renderResults();
    });

    formNode.addEventListener("submit", function (event) {
      event.preventDefault();
      updateFallbackExternalLink();
      renderResults();
    });

    updateFallbackExternalLink();
    loadItemsForScope(scopeNode.value || "all");
  }

  function setSamePageLanguageInUrl(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    var url = new URL(window.location.href);
    url.searchParams.set("lang", safeLang);
    window.location.href = url.toString();
  }

  function getSearchPageHref() {
    var path = (window.location.pathname || "").toLowerCase();
    if (/\/(music|photo|post)\//.test(path)) {
      return "../search.html";
    }
    return "search.html";
  }

  function ensureSearchNavLink() {
    var href = getSearchPageHref();
    Array.from(document.querySelectorAll(".nav")).forEach(function (nav) {
      if (nav.querySelector('a[href*="search.html"]')) {
        return;
      }
      var link = document.createElement("a");
      link.href = href;
      link.setAttribute("data-nav-search", "1");
      link.textContent = "搜索";
      nav.appendChild(link);
    });
  }

  function applySecondaryPageLanguage(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    var dict = getSecondaryPageDictionary(safeLang);

    document.documentElement.lang = dict.htmlLang;
    Array.from(document.querySelectorAll(".nav")).forEach(function (nav) {
      nav.setAttribute("aria-label", dict.navAria);
    });

    Array.from(document.querySelectorAll(".nav a")).forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (/math\.html(?:$|[?#])/i.test(href) || /#math/i.test(href)) {
        link.textContent = dict.navMath;
      } else if (/portfolio-1\.html/i.test(href)) {
        link.textContent = dict.navPhoto;
      } else if (/yin-le\.html/i.test(href)) {
        link.textContent = dict.navMusic;
      } else if (/Fay_Lyu_CV\.pdf|(?:^|\/)cv\.html(?:$|[?#])/i.test(href)) {
        link.textContent = dict.navCV;
      } else if (/search\.html(?:$|[?#])/i.test(href)) {
        link.textContent = dict.navSearch;
      } else if (/index\.html$/i.test(href) || /\.\.\/index\.html$/i.test(href)) {
        link.textContent = dict.navHome;
      }
    });

    Array.from(document.querySelectorAll(".footer-right a")).forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (/blank-1\.html/i.test(href)) {
        link.textContent = dict.a11y;
      } else if (/blank\.html/i.test(href)) {
        link.textContent = dict.siteNotes;
      }
    });

    Array.from(document.querySelectorAll(".footer-note")).forEach(function (note) {
      var mail = note.querySelector("a[href^='mailto:']");
      if (mail) {
        var cloned = mail.cloneNode(true);
        note.textContent = "";
        note.appendChild(document.createTextNode(dict.footerContactLead));
        note.appendChild(cloned);
      } else if (/Edinburgh/i.test(note.textContent || "")) {
        note.textContent = dict.footerCities;
      }
    });

    Array.from(document.querySelectorAll("[data-copy-zh][data-copy-en]")).forEach(function (
      node
    ) {
      var key = safeLang === "en" ? "data-copy-en" : "data-copy-zh";
      var value = node.getAttribute(key);
      if (value) {
        node.textContent = value;
      }
    });

    Array.from(document.querySelectorAll(".math-more")).forEach(function (node) {
      node.textContent = dict.readMore;
    });

    if (safeLang === "en") {
      Array.from(
        document.querySelectorAll(
          ".track-date, .math-date, .article-meta, .photo-date, .track-title"
        )
      ).forEach(function (node) {
        node.textContent = localizeShortLabelText(node.textContent || "", safeLang);
      });
    }

    Array.from(document.querySelectorAll("a.read-more")).forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (/portfolio-1\.html/i.test(href)) {
        link.textContent = dict.backToPhoto;
      } else if (/yin-le\.html/i.test(href)) {
        link.textContent = dict.backToMusic;
      } else if (/math\.html/i.test(href)) {
        link.textContent = dict.backToMath;
      }
    });

    Array.from(document.querySelectorAll("[data-photo-nav-label]")).forEach(function (node) {
      var key = node.getAttribute("data-photo-nav-label");
      if (key === "prev") {
        node.textContent = dict.photoPrevGroup;
      } else if (key === "back") {
        node.textContent = dict.photoBackToArchive;
      } else if (key === "next") {
        node.textContent = dict.photoNextGroup;
      }
    });

    if (document.body.classList.contains("music-index-page")) {
      var musicTitle = document.querySelector(".page-title");
      var musicIntro = document.querySelector(".page-head p");
      var musicLead = document.querySelector(".page-head .lead");
      var musicLongIntroNodes = Array.from(
        document.querySelectorAll(".music-intro-text p")
      );
      var musicTitleOverridesEn = getMusicTrackTitleOverridesEn();
      if (musicTitle) {
        musicTitle.textContent = dict.musicPageTitle;
      }
      if (musicIntro) {
        musicIntro.textContent = dict.musicIntro;
      }
      if (musicLead) {
        musicLead.textContent = dict.musicLead;
      }
      if (
        safeLang === "en" &&
        Array.isArray(dict.musicLongIntroParagraphs) &&
        musicLongIntroNodes.length
      ) {
        musicLongIntroNodes.forEach(function (node, index) {
          if (dict.musicLongIntroParagraphs[index]) {
            node.textContent = dict.musicLongIntroParagraphs[index];
          }
        });
      }
      if (safeLang === "en") {
        Array.from(document.querySelectorAll(".music-list .track-row")).forEach(function (row) {
          var href = (row.getAttribute("data-href") || "").toLowerCase();
          var titleNode = row.querySelector(".track-title");
          if (!titleNode) {
            return;
          }
          if (musicTitleOverridesEn[href]) {
            var titleLink = titleNode.querySelector("a");
            if (titleLink) {
              titleLink.textContent = musicTitleOverridesEn[href];
            } else {
              titleNode.textContent = musicTitleOverridesEn[href];
            }
          }
        });
      }
      document.title = safeLang === "en" ? "Music | Chronohaze" : "音乐 | Chronohaze";
    }

    if (document.body.classList.contains("photo-index-page")) {
      var photoTitle = document.querySelector(".page-title");
      var photoIntro = document.querySelector(".page-head p");
      var photoLongIntroNodes = Array.from(
        document.querySelectorAll(".photo-intro-text p")
      );
      if (photoTitle) {
        photoTitle.textContent = dict.photoPageTitle;
      }
      if (photoIntro) {
        photoIntro.textContent = dict.photoIntro;
      }
      if (
        safeLang === "en" &&
        Array.isArray(dict.photoLongIntroParagraphs) &&
        photoLongIntroNodes.length
      ) {
        photoLongIntroNodes.forEach(function (node, index) {
          if (dict.photoLongIntroParagraphs[index]) {
            node.textContent = dict.photoLongIntroParagraphs[index];
          }
        });
      }
      document.title = safeLang === "en" ? "Photography | Chronohaze" : "摄影 | Chronohaze";

      Array.from(document.querySelectorAll(".photo-subtitle")).forEach(function (node) {
        node.textContent = dict.readMore;
      });
    }

    if (document.body.classList.contains("math-index-page")) {
      var mathTitle = document.querySelector(".page-title");
      var mathIntro = document.querySelector(".page-head p");
      function setMathCardTitle(card, text) {
        if (!card) {
          return;
        }
        var titleNode = card.querySelector(".math-title");
        if (!titleNode) {
          return;
        }
        var titleLink = titleNode.querySelector(".math-title-link");
        if (titleLink) {
          titleLink.textContent = text;
        } else {
          titleNode.textContent = text;
        }
      }
      if (mathTitle) {
        mathTitle.textContent = dict.mathPageTitle;
      }
      if (mathIntro) {
        mathIntro.textContent = dict.mathIntro;
      }

      if (safeLang === "en") {
        var metalcoreCard = document.querySelector(
          '.math-card[data-href="post/metalcore-piano-lab.html"]'
        );
        var springCard = document.querySelector(
          '.math-card[data-href="post/spring-2026.html"]'
        );
        var firstIsabelleCard = document.querySelector(
          '.math-card[data-href="post/first-isabelle-proof.html"]'
        );
        var submodularCard = document.querySelector(
          '.math-card[data-href="post/isabelle-submodular-greedy.html"]'
        );
        if (metalcoreCard) {
          var metalcoreDesc = metalcoreCard.querySelector(".math-desc");
          setMathCardTitle(
            metalcoreCard,
            "Metalcore Piano Lab | From Audio to Chart: A Discretization Experiment (WIP)"
          );
          if (metalcoreDesc) {
            metalcoreDesc.textContent =
              "From continuous audio to playable charts: onset detection, beat grids, section alignment, and playability constraints.";
          }
        }
        if (springCard) {
          var springDesc = springCard.querySelector(".math-desc");
          setMathCardTitle(springCard, "Spring 2026 | A New Research Direction");
          if (springDesc) {
            springDesc.textContent =
              "Beginning undergraduate research in Cornell ORIE on first-order methods for constrained and composite optimization.";
          }
        }
        if (firstIsabelleCard) {
          var cardDesc = firstIsabelleCard.querySelector(".math-desc");
          setMathCardTitle(firstIsabelleCard, "My First Isabelle Formalization Project");
          if (cardDesc) {
            cardDesc.textContent =
              "Embedding verifiability into proof writing: from motivation to the Nemhauser–Wolsey theorem.";
          }
        }
        if (submodularCard) {
          var submodularDesc = submodularCard.querySelector(".math-desc");
          setMathCardTitle(
            submodularCard,
            "An Ongoing Isabelle Research Project: Formalising Submodular Greedy"
          );
          if (submodularDesc) {
            submodularDesc.textContent =
              "Formalising the greedy (1 − 1/e) guarantee for monotone submodular maximisation under cardinality constraints.";
          }
        }
      }

      document.title = safeLang === "en" ? "Mathematics | Chronohaze" : "数学 | Chronohaze";
    }

    if (document.body.classList.contains("search-index-page")) {
      document.title = safeLang === "en" ? "Search | Chronohaze" : "搜索 | Chronohaze";
    }

    if (document.body.classList.contains("music-detail-page")) {
      var titleNode = document.querySelector(".music-detail-article h1");
      if (safeLang === "en" && titleNode) {
        var detailPath = (window.location.pathname || "")
          .toLowerCase()
          .replace(/^.*\/chronohaze\//, "")
          .replace(/^\//, "");
        var detailTitleOverridesEn = getMusicTrackTitleOverridesEn();
        if (detailTitleOverridesEn[detailPath]) {
          titleNode.textContent = detailTitleOverridesEn[detailPath];
        }
      }
      if (titleNode && titleNode.textContent) {
        var titleText = titleNode.textContent.trim();
        document.title =
          titleText + " | " + (safeLang === "en" ? "Music" : "音乐") + " | Chronohaze";
      }

      var backLink = document.querySelector(".music-detail-back");
      if (backLink) {
        backLink.textContent = dict.detailBack;
      }

      var firstMeta = document.querySelector(".music-detail-article .music-detail-meta");
      if (firstMeta) {
        firstMeta.innerHTML = firstMeta.innerHTML.replace(
          /创作时间：|Creation period:/g,
          dict.creationLabel
        );
      }

      Array.from(document.querySelectorAll(".music-detail-article .music-detail-meta")).forEach(
        function (meta) {
          meta.innerHTML = translateMusicMetaLabels(meta.innerHTML, safeLang, dict);
        }
      );

      Array.from(document.querySelectorAll(".music-detail-article h2")).forEach(function (heading) {
        var normalized = normalizeText(heading.textContent).toLowerCase();
        if (
          normalized === normalizeText("作品介绍").toLowerCase() ||
          normalized === normalizeText("About the work").toLowerCase()
        ) {
          heading.textContent = dict.workIntroHeading;
          return;
        }

        if (
          normalized === normalizeText("歌词（Part 1）").toLowerCase() ||
          normalized === normalizeText("歌词(Part 1)").toLowerCase() ||
          normalized === normalizeText("Lyrics (Part 1)").toLowerCase()
        ) {
          heading.textContent = dict.lyricsPart1;
          return;
        }

        if (
          normalized === normalizeText("歌词（Part 2）").toLowerCase() ||
          normalized === normalizeText("歌词(Part 2)").toLowerCase() ||
          normalized === normalizeText("Lyrics (Part 2)").toLowerCase()
        ) {
          heading.textContent = dict.lyricsPart2;
        }
      });

      applySincerelySpringIntroInEnglish(safeLang);
      applySincerelySpringLyricsInEnglish(safeLang);
      applyMoonlitGardenIntroInEnglish(safeLang);
      applyMoonlitGardenLyricsInEnglish(safeLang);
      applySiltLyricsInEnglish(safeLang);
      applySiltIntroInEnglish(safeLang);
      applyHakoniwaIntroInEnglish(safeLang);
      applyHakoniwaLyricsInEnglish(safeLang);
      applyHonkakuMysteryIntroInEnglish(safeLang);
      applyHonkakuMysteryLyricsInEnglish(safeLang);
      applyWillowIntroInEnglish(safeLang);
      applyWillowLyricsInEnglish(safeLang);
      applyYorugaoIntroInEnglish(safeLang);
      applyYorugaoLyricsInEnglish(safeLang);
      applyMortalFrameIntroInEnglish(safeLang);
      applyMortalFrameLyricsInEnglish(safeLang);
      applyMoonlapseIntroInEnglish(safeLang);
      applyMoonlapseLyricsInEnglish(safeLang);
      applyMrIdiographicIntroInEnglish(safeLang);
      applyAgnyLyricsInEnglish(safeLang);
      applySupernovaIntroInEnglish(safeLang);
      applySupernovaLyricsInEnglish(safeLang);
      applyZeroIntroInEnglish(safeLang);
      applyZeroLyricsInEnglish(safeLang);
      applyFomalhautIntroInEnglish(safeLang);
      applyFomalhautLyricsInEnglish(safeLang);
      applyTheGuiltIntroInEnglish(safeLang);
      applyTheGuiltLyricsInEnglish(safeLang);
      applyLoneStarPreludeIntroInEnglish(safeLang);
      applyMrIdiographicLyricsInEnglish(safeLang);
      applyAffizierenIntroInEnglish(safeLang);
      applyAffizierenNotesInEnglish(safeLang);
      applyAffizierenLyricsInEnglish(safeLang);
      applyIpomoeaAlbaIntroInEnglish(safeLang);
      applyIpomoeaAlbaLyricsInEnglish(safeLang);
      applyHeAndMeIntroInEnglish(safeLang);
      applyHeAndMeLyricsInEnglish(safeLang);
      applyEpilogueIntroInEnglish(safeLang);
      applyEpilogueLyricsInEnglish(safeLang);
      applyIHateYouAllIntroInEnglish(safeLang);
      applyIHateYouAllLyricsInEnglish(safeLang);
      applyRainyDaysIntroInEnglish(safeLang);
      applyRainyDaysLyricsInEnglish(safeLang);
      applyRedSandalwoodIntroInEnglish(safeLang);
      applyRedSandalwoodLyricsInEnglish(safeLang);
    }

    if (
      document.body.classList.contains("photo-detail-page") ||
      document.querySelector(".photo-detail-article")
    ) {
      var photoHeading = document.querySelector(".photo-detail-article h1");
      if (photoHeading && photoHeading.textContent) {
        document.title =
          photoHeading.textContent.trim() +
          " | " +
          (safeLang === "en" ? "Photography" : "摄影") +
          " | Chronohaze";
      }
    }

    renderFirstIsabellePost(safeLang, dict);
    renderSubmodularGreedyPost(safeLang, dict);
    renderSpring2026Post(safeLang, dict);
    renderMetalcorePost(safeLang, dict);
  }

  function injectFloatingSiteLogo() {
    if (document.querySelector(".floating-site-logo")) {
      return;
    }

    var styleId = "floating-site-logo-style";
    if (!document.getElementById(styleId)) {
      var style = document.createElement("style");
      style.id = styleId;
      style.textContent = [
        ".floating-site-logo{position:fixed;right:max(22px,calc(env(safe-area-inset-right,0px) + 16px));bottom:max(22px,calc(env(safe-area-inset-bottom,0px) + 16px));width:102px;height:102px;border-radius:999px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:68;background:radial-gradient(circle,rgba(238,244,253,.3) 0%,rgba(238,244,253,.14) 46%,rgba(238,244,253,0) 78%);box-shadow:none;will-change:transform;animation:floatingSiteLogoBreath 5.4s ease-in-out infinite;}",
        ".floating-site-logo::before{content:'';position:absolute;inset:-24px;border-radius:inherit;background:radial-gradient(circle,rgba(211,221,241,.44) 0%,rgba(211,221,241,.2) 42%,rgba(211,221,241,0) 80%);filter:blur(8px);}",
        ".floating-site-logo::after{content:'';position:absolute;inset:-6px;border-radius:inherit;background:radial-gradient(circle,rgba(236,242,252,.34) 0%,rgba(236,242,252,.14) 50%,rgba(236,242,252,0) 80%);filter:blur(5px);}",
        ".floating-site-logo img{position:relative;z-index:1;width:76%;height:76%;object-fit:contain;opacity:1;filter:invert(1) brightness(.3) contrast(1.45) saturate(.55) drop-shadow(0 0 1px rgba(255,255,255,.2)) drop-shadow(0 0 6px rgba(94,111,148,.22));}",
        "@keyframes floatingSiteLogoBreath{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-2px) scale(1.03);}}",
        "@media (max-width: 900px){.floating-site-logo{width:76px;height:76px;right:max(12px,calc(env(safe-area-inset-right,0px) + 10px));bottom:max(12px,calc(env(safe-area-inset-bottom,0px) + 10px));}.floating-site-logo::before{inset:-14px;}.floating-site-logo::after{inset:-4px;}}",
        "@media only screen and (min-width:390px) and (max-width:430px) and (orientation:portrait){.floating-site-logo{width:70px;height:70px;right:max(10px,calc(env(safe-area-inset-right,0px) + 8px));bottom:max(10px,calc(env(safe-area-inset-bottom,0px) + 8px));}}",
      ].join("");
      document.head.appendChild(style);
    }

    var iconNode =
      document.querySelector('link[rel="apple-touch-icon"]') ||
      document.querySelector('link[rel~="icon"]');
    var rawSrc = (iconNode && iconNode.getAttribute("href")) || "assets/logo.png";
    var resolvedSrc = rawSrc;
    try {
      resolvedSrc = new URL(rawSrc, window.location.href).toString();
    } catch (_error) {
      resolvedSrc = rawSrc;
    }

    var wrapper = document.createElement("div");
    wrapper.className = "floating-site-logo";
    wrapper.setAttribute("aria-hidden", "true");

    var img = document.createElement("img");
    img.src = resolvedSrc;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    wrapper.appendChild(img);

    document.body.appendChild(wrapper);
  }

  function injectFloatingLanguageSwitch() {
    if (document.querySelector(".lang-pill") || document.querySelector(".floating-lang-switch")) {
      return;
    }

    var preferred = detectPreferredLanguage();
    persistPreferredLanguage(preferred);
    applySecondaryPageLanguage(preferred);

    var panel = document.createElement("div");
    panel.className = "floating-lang-switch";
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "Language switch");

    function buildButton(lang, label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "floating-lang-btn";
      btn.setAttribute("data-lang", lang);
      btn.textContent = label;
      if (lang === preferred) {
        btn.classList.add("active");
      }
      btn.addEventListener("click", function () {
        if (lang === preferred) {
          return;
        }
        persistPreferredLanguage(lang);
        setSamePageLanguageInUrl(lang);
      });
      return btn;
    }

    panel.appendChild(buildButton("zh", "ZH"));
    panel.appendChild(buildButton("en", "EN"));
    document.body.appendChild(panel);
  }

  function setupPhotoDetailPager() {
    var article = document.querySelector(".photo-detail-article");
    if (!article || article.querySelector(".photo-detail-pager")) {
      return;
    }

    var currentPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");
    if (!/^photo\/.+\.html$/.test(currentPath)) {
      return;
    }

    var orderedRoutes = [
      "photo/photo-01.html",
      "photo/photo-02.html",
      "photo/photo-03.html",
      "photo/photo-04.html",
      "photo/photo-05.html",
      "photo/photo-06.html",
      "photo/photo-07.html",
      "photo/photo-08.html",
      "photo/photo-09.html",
      "photo/photo-10.html",
      "photo/photo-11.html",
      "photo/photo-12.html",
      "photo/photo-13.html",
      "photo/photo-14.html",
      "photo/blue.html",
    ];

    var currentIndex = orderedRoutes.indexOf(currentPath);
    if (currentIndex < 0) {
      return;
    }

    var prevRoute = currentIndex > 0 ? orderedRoutes[currentIndex - 1] : "";
    var nextRoute =
      currentIndex < orderedRoutes.length - 1 ? orderedRoutes[currentIndex + 1] : "";

    var dict = getSecondaryPageDictionary(detectPreferredLanguage());

    function buildNavNode(label, route, key) {
      if (!route) {
        var muted = document.createElement("span");
        muted.className = "photo-detail-pager-link is-disabled";
        muted.setAttribute("data-photo-nav-label", key);
        muted.textContent = label;
        return muted;
      }

      var link = document.createElement("a");
      link.className = "photo-detail-pager-link";
      link.setAttribute("data-photo-nav-label", key);
      link.href = route;
      link.textContent = label;
      return link;
    }

    var nav = document.createElement("nav");
    nav.className = "photo-detail-pager";
    nav.setAttribute("aria-label", "Photo navigation");

    var prevHref = prevRoute ? prevRoute.replace(/^photo\//, "") : "";
    var nextHref = nextRoute ? nextRoute.replace(/^photo\//, "") : "";

    nav.appendChild(buildNavNode(dict.photoPrevGroup, prevHref, "prev"));
    nav.appendChild(buildNavNode(dict.photoBackToArchive, "../portfolio-1.html", "back"));
    nav.appendChild(buildNavNode(dict.photoNextGroup, nextHref, "next"));

    var backLink = article.querySelector('a.read-more[href*="portfolio-1.html"]');
    if (
      backLink &&
      backLink.parentElement &&
      backLink.parentElement.tagName &&
      backLink.parentElement.tagName.toLowerCase() === "p"
    ) {
      backLink.parentElement.replaceWith(nav);
    } else {
      article.appendChild(nav);
    }
  }

  function enableIndexRowLinks() {
    var rows = Array.from(
      document.querySelectorAll(
        ".music-list .track-row[data-href], .math-list .math-card[data-href], .math-list .math-row[data-href]"
      )
    );

    rows.forEach(function (row) {
      if (row.dataset.rowLinkReady === "1") {
        return;
      }

      row.dataset.rowLinkReady = "1";

      function openRowLink() {
        var href = row.getAttribute("data-href");
        if (href) {
          window.location.href = href;
        }
      }

      row.addEventListener("click", function (event) {
        var target = event.target;
        if (
          target &&
          typeof target.closest === "function" &&
          target.closest("a, button, input, select, textarea, summary, [contenteditable='true']")
        ) {
          return;
        }

        var selection = typeof window.getSelection === "function" ? window.getSelection() : null;
        if (selection && String(selection).trim()) {
          return;
        }

        openRowLink();
      });

      row.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openRowLink();
        }
      });
    });
  }

  var fineMotionObserver = null;

  function setupFineMotionPass() {
    if (!document.body || document.body.classList.contains("home-body")) {
      return;
    }

    var reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    document.body.classList.add("motion-enhanced");

    var groupCounts = new Map();
    var newTargets = [];

    function registerTargets(selector, options) {
      var config = options || {};
      Array.from(document.querySelectorAll(selector)).forEach(function (node) {
        if (!node || node.dataset.motionBound === "1") {
          return;
        }

        if (node.closest(".search-skeleton")) {
          return;
        }

        if (node.matches(".is-filter-hidden")) {
          return;
        }

        if (
          node.hasAttribute("hidden") ||
          (node.closest("[hidden]") && !node.classList.contains("search-result-link"))
        ) {
          return;
        }

        var displayValue = "";
        try {
          displayValue = window.getComputedStyle(node).display;
        } catch (_err) {
          displayValue = "";
        }
        if (displayValue === "none") {
          return;
        }

        node.dataset.motionBound = "1";
        node.classList.add("motion-reveal");
        if (config.variantClass) {
          node.classList.add(config.variantClass);
        }

        var groupNode = config.groupSelector
          ? node.closest(config.groupSelector)
          : node.parentElement;
        var counterKey = groupNode || document.body;
        var counter = groupCounts.get(counterKey) || 0;
        groupCounts.set(counterKey, counter + 1);

        var delayStep = typeof config.delayStep === "number" ? config.delayStep : 56;
        var baseDelay = typeof config.baseDelay === "number" ? config.baseDelay : 0;
        var maxDelay = typeof config.maxDelay === "number" ? config.maxDelay : 360;
        var delay = Math.min(baseDelay + counter * delayStep, maxDelay);
        node.style.setProperty("--motion-delay", String(delay) + "ms");

        newTargets.push(node);
      });
    }

    registerTargets(".page-head h1, .page-head p", {
      groupSelector: ".page-head",
      variantClass: "motion-reveal-soft",
      baseDelay: 20,
      delayStep: 64,
      maxDelay: 220,
    });
    registerTargets(".photo-intro-layout > *, .music-intro-layout > *", {
      groupSelector: ".photo-intro-layout, .music-intro-layout",
      variantClass: "motion-reveal-soft",
      baseDelay: 24,
      delayStep: 84,
      maxDelay: 360,
    });
    registerTargets(".music-index-page .music-ia-shell", {
      variantClass: "motion-reveal-soft",
      baseDelay: 16,
      delayStep: 60,
      maxDelay: 100,
    });
    registerTargets(".music-index-page .track-row", {
      groupSelector: ".music-group, .music-list",
      variantClass: "motion-reveal-card",
      baseDelay: 28,
      delayStep: 56,
      maxDelay: 360,
    });
    registerTargets(".math-index-page .math-card", {
      groupSelector: ".math-list",
      variantClass: "motion-reveal-card",
      baseDelay: 22,
      delayStep: 64,
      maxDelay: 360,
    });
    registerTargets(".photo-index-page .photo-feature-card, .photo-index-page .photo-card", {
      groupSelector: ".photo-feature-grid, .photo-archive-grid, .photo-index-grid",
      variantClass: "motion-reveal-card",
      baseDelay: 24,
      delayStep: 60,
      maxDelay: 360,
    });
    registerTargets(".search-index-page .search-result-link", {
      groupSelector: ".search-results",
      variantClass: "motion-reveal-card",
      baseDelay: 18,
      delayStep: 46,
      maxDelay: 320,
    });
    registerTargets(".music-album-page .album-layout > *, .music-album-page .album-track-link", {
      groupSelector: ".album-layout, .album-tracklist",
      variantClass: "motion-reveal-card",
      baseDelay: 18,
      delayStep: 52,
      maxDelay: 340,
    });
    registerTargets(".photo-detail-gallery .photo-detail-item, .photo-detail-pager", {
      groupSelector: ".photo-detail-gallery, .photo-detail-article",
      variantClass: "motion-reveal-card",
      baseDelay: 20,
      delayStep: 52,
      maxDelay: 320,
    });
    registerTargets(
      ".music-detail-article > h1, .music-detail-article > .music-detail-meta, .music-detail-article > .music-detail-cover, .music-detail-article > .player-shell-article, .music-detail-article > h2, .music-detail-article > p, .music-detail-article > .lyrics-showcase",
      {
        groupSelector: ".music-detail-article",
        variantClass: "motion-reveal-soft",
        baseDelay: 14,
        delayStep: 42,
        maxDelay: 300,
      }
    );
    registerTargets(
      ".main > .article:not(.music-detail-article):not(.photo-detail-article):not(.cv-policy) > h1, .main > .article:not(.music-detail-article):not(.photo-detail-article):not(.cv-policy) > h2, .main > .article:not(.music-detail-article):not(.photo-detail-article):not(.cv-policy) > p, .main > .article:not(.music-detail-article):not(.photo-detail-article):not(.cv-policy) > ul, .main > .article:not(.music-detail-article):not(.photo-detail-article):not(.cv-policy) > ol",
      {
        groupSelector: ".main > .article:not(.music-detail-article):not(.photo-detail-article):not(.cv-policy)",
        variantClass: "motion-reveal-soft",
        baseDelay: 10,
        delayStep: 34,
        maxDelay: 220,
      }
    );
    registerTargets(".cv-policy > .cv-lang-tabs, .cv-policy [data-lang-block]:not([hidden]) > h1, .cv-policy [data-lang-block]:not([hidden]) > h2, .cv-policy [data-lang-block]:not([hidden]) > p, .cv-policy [data-lang-block]:not([hidden]) > section, .cv-policy [data-lang-block]:not([hidden]) > ol", {
      groupSelector: ".cv-policy, .cv-policy [data-lang-block]",
      variantClass: "motion-reveal-soft",
      baseDelay: 12,
      delayStep: 38,
      maxDelay: 260,
    });

    if (!newTargets.length) {
      return;
    }

    function revealNode(node) {
      if (!node || node.dataset.motionShown === "1") {
        return;
      }
      node.dataset.motionShown = "1";
      node.classList.add("is-in");
    }

    if (!("IntersectionObserver" in window)) {
      requestAnimationFrame(function () {
        newTargets.forEach(revealNode);
      });
      return;
    }

    if (!fineMotionObserver) {
      fineMotionObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting || entry.intersectionRatio > 0.06) {
              revealNode(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px -8% 0px",
        }
      );
    }

    newTargets.forEach(function (node) {
      var rect = node.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.9) {
        revealNode(node);
        return;
      }
      fineMotionObserver.observe(node);
    });
  }

  function boot() {
    ensureSearchNavLink();
    dedupeNavLinks();
    cacheMusicIntroPaletteSource();
    injectFloatingSiteLogo();
    injectFloatingLanguageSwitch();
    setupMusicIndexArchitecture();
    setupSearchIndexPage();
    protectAllMedia();
    optimizeMediaLoading();
    optimizeImages();
    normalizeFooterMeta();
    bindFooterMetaSync();
    labelPhotoOrientation();
    setupPhotoDetailPager();
    ensureMusicDetailBackLink();
    enhanceMusicPlayers();
    removeMusicDetailImages();
    enhanceMusicLyricsLayout();
    enableIndexRowLinks();
    setupFineMotionPass();
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

    optimizeMediaLoading();
    optimizeImages();
    normalizeFooterMeta();
    labelPhotoOrientation();
    setupFineMotionPass();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
