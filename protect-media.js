(function () {
  "use strict";

  var MEDIA_SELECTOR = "img, audio, video";
  var bootFeedbackArmed = false;
  var bootFeedbackResolved = false;
  var bootFeedbackStartedAt = 0;
  var pageSwapFeedbackArmed = false;
  var pageSwapFeedbackResolved = false;
  var pageSwapFeedbackStartedAt = 0;
  var feedbackLoaderNode = null;
  var feedbackLoaderStatusNode = null;
  var feedbackLoaderTitleNode = null;
  var feedbackLoaderMetaNode = null;

  function releaseCriticalLoader() {
    try {
      if (window.__chronohazeReleaseCriticalLoader) {
        window.__chronohazeReleaseCriticalLoader();
        return;
      }
      document.documentElement.classList.remove("chronohaze-critical-loading");
    } catch (_err) {}
  }

  function ensureFeedbackLoader() {
    if (
      feedbackLoaderNode &&
      feedbackLoaderNode.isConnected &&
      feedbackLoaderStatusNode &&
      feedbackLoaderTitleNode &&
      feedbackLoaderMetaNode
    ) {
      return feedbackLoaderNode;
    }

    if (!document.body) {
      return null;
    }

    var existing = document.querySelector(".chronohaze-loader");
    if (existing) {
      feedbackLoaderNode = existing;
      feedbackLoaderStatusNode = existing.querySelector(".chronohaze-loader__status");
      feedbackLoaderTitleNode = existing.querySelector(".chronohaze-loader__title");
      feedbackLoaderMetaNode = existing.querySelector(".chronohaze-loader__meta");
      return feedbackLoaderNode;
    }

    var loader = document.createElement("div");
    loader.className = "chronohaze-loader";
    loader.setAttribute("aria-hidden", "true");
    loader.innerHTML =
      '<div class="chronohaze-loader__veil"></div>' +
      '<div class="chronohaze-loader__panel">' +
      '<p class="chronohaze-loader__brand">chronohaze.space</p>' +
      '<p class="chronohaze-loader__status">加载中</p>' +
      '<h2 class="chronohaze-loader__title">页面加载中</h2>' +
      '<p class="chronohaze-loader__meta">请稍候，内容正在就位。</p>' +
      '<div class="chronohaze-loader__line" aria-hidden="true"><span></span></div>' +
      "</div>";
    document.body.appendChild(loader);
    feedbackLoaderNode = loader;
    feedbackLoaderStatusNode = loader.querySelector(".chronohaze-loader__status");
    feedbackLoaderTitleNode = loader.querySelector(".chronohaze-loader__title");
    feedbackLoaderMetaNode = loader.querySelector(".chronohaze-loader__meta");
    return feedbackLoaderNode;
  }

  function getFeedbackCopy(mode, lang) {
    return mode === "boot"
      ? {
          status: "加载中",
          title: "页面加载中",
          meta: "请稍候，内容正在就位。",
        }
      : {
          status: "切换中",
          title: "页面切换中",
          meta: "请稍候，下一页正在就位。",
        };
  }

  function syncFeedbackLoader(mode, lang) {
    var loader = ensureFeedbackLoader();
    if (!loader || !feedbackLoaderStatusNode || !feedbackLoaderTitleNode || !feedbackLoaderMetaNode) {
      return;
    }

    var copy = getFeedbackCopy(mode, lang);
    loader.setAttribute("data-loader-mode", mode);
    loader.setAttribute("lang", "zh-CN");
    feedbackLoaderStatusNode.textContent = copy.status;
    feedbackLoaderTitleNode.textContent = copy.title;
    feedbackLoaderMetaNode.textContent = copy.meta;
  }

  function detectInitialBootLanguage() {
    var candidate =
      window.__chronohazePreferredLang ||
      document.documentElement.getAttribute("data-site-lang") ||
      "";
    candidate = String(candidate || "").toLowerCase();
    if (candidate === "zh" || candidate === "en") {
      return candidate;
    }

    var langAttr = String(document.documentElement.getAttribute("lang") || "").toLowerCase();
    return langAttr.indexOf("en") === 0 ? "en" : "zh";
  }

  function armBootFeedback() {
    if (bootFeedbackArmed || !document.body) {
      return;
    }

    bootFeedbackArmed = true;
    bootFeedbackResolved = false;
    bootFeedbackStartedAt = Date.now();

    document.body.classList.add("page-booting");
    document.body.classList.remove("page-boot-ready");
  }

  function resolveBootFeedback() {
    if (!bootFeedbackArmed || bootFeedbackResolved || !document.body) {
      return;
    }

    bootFeedbackResolved = true;
    var elapsed = Date.now() - bootFeedbackStartedAt;
    var remaining = Math.max(0, 360 - elapsed);

    window.setTimeout(function () {
      if (!document.body) {
        return;
      }

      document.body.classList.add("page-boot-ready");
      releaseCriticalLoader();

      window.setTimeout(function () {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            if (!document.body) {
              return;
            }
            document.body.classList.remove("page-booting");
            document.body.classList.remove("page-boot-ready");
          });
        });
      }, 180);
    }, remaining);
  }

  function armPageSwapFeedback(targetUrl) {
    if (!document.body) {
      return;
    }

    pageSwapFeedbackArmed = true;
    pageSwapFeedbackResolved = false;
    pageSwapFeedbackStartedAt = Date.now();

    var lang = detectInitialBootLanguage();
    if (targetUrl && typeof targetUrl.searchParams !== "undefined") {
      var queryLang = String(targetUrl.searchParams.get("lang") || "").toLowerCase();
      if (queryLang === "zh" || queryLang === "en") {
        lang = queryLang;
      }
    }

    document.body.classList.add("page-transition-busy");
    document.body.classList.remove("page-transition-settled");
    syncFeedbackLoader("swap", lang);
  }

  function resolvePageSwapFeedback() {
    if (!pageSwapFeedbackArmed || pageSwapFeedbackResolved || !document.body) {
      return;
    }

    pageSwapFeedbackResolved = true;
    var elapsed = Date.now() - pageSwapFeedbackStartedAt;
    var remaining = Math.max(0, 420 - elapsed);

    window.setTimeout(function () {
      if (!document.body) {
        return;
      }

      document.body.classList.add("page-transition-settled");
      releaseCriticalLoader();

      window.setTimeout(function () {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            if (!document.body) {
              return;
            }
            document.body.classList.remove("page-transition-busy");
            document.body.classList.remove("page-transition-settled");
            pageSwapFeedbackArmed = false;
            pageSwapFeedbackResolved = false;
          });
        });
      }, 220);
    }, remaining);
  }

  function cancelPageSwapFeedback() {
    pageSwapFeedbackArmed = false;
    pageSwapFeedbackResolved = false;
    clearPendingPrimaryNav();
    if (!document.body) {
      return;
    }
    document.body.classList.remove("page-transition-busy");
    document.body.classList.remove("page-transition-settled");
  }

  function normalizePrimaryNavHref(href) {
    if (!href) {
      return "";
    }
    try {
      var url = new URL(href, window.location.href);
      url.hash = "";
      return url.href;
    } catch (_err) {
      return String(href || "");
    }
  }

  function clearPendingPrimaryNav() {
    Array.from(document.querySelectorAll(".nav a.is-nav-pending")).forEach(function (link) {
      link.classList.remove("is-nav-pending");
    });
  }

  function markPendingPrimaryNav(href) {
    clearPendingPrimaryNav();
    var targetHref = normalizePrimaryNavHref(href);
    if (!targetHref) {
      return;
    }
    Array.from(document.querySelectorAll(".nav a[href]")).forEach(function (link) {
      if (normalizePrimaryNavHref(link.href) === targetHref) {
        link.classList.add("is-nav-pending");
      }
    });
  }

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
      element.setAttribute("oncontextmenu", "return false");
      element.setAttribute("ondragstart", "return false");
      element.style.webkitUserDrag = "none";
      element.style.webkitTouchCallout = "none";
      element.style.webkitTapHighlightColor = "transparent";
      element.style.webkitUserSelect = "none";
      element.style.userSelect = "none";
      element.addEventListener("dragstart", stopEvent);
      element.addEventListener("contextmenu", stopEvent);
      element.addEventListener("selectstart", stopEvent);
      element.addEventListener("copy", stopEvent);
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

  var imageVariantManifest = null;
  var imageVariantManifestLoadTried = false;
  var imageVariantManifestPromise = null;

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
      if (/\/chronohaze(?:\/|$)/.test(page.pathname || "")) {
        var repoBase = (page.pathname || "").replace(/^(.*?\/chronohaze)\/.*$/, "$1");
        if (repoBase) {
          push(repoBase + "/" + rel);
          push(page.origin + repoBase + "/" + rel);
        }
      }
    } catch (_e) {}

    return urls;
  }

  function fetchJsonFromCandidates(relativePath) {
    var candidates = getAssetCandidateUrls(relativePath);
    var idx = 0;

    function tryNext() {
      if (idx >= candidates.length) {
        return Promise.reject(new Error("not found"));
      }
      var url = candidates[idx++];
      return fetch(url)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("HTTP " + response.status);
          }
          return response.json();
        })
        .catch(function () {
          return tryNext();
        });
    }

    return tryNext();
  }

  function resolveAssetCandidateUrl(relativePath) {
    var candidates = getAssetCandidateUrls(relativePath);
    var repoScoped = candidates.find(function (url) {
      return /\/chronohaze\/assets\//.test(url);
    });
    if (repoScoped) {
      return repoScoped;
    }

    var originScoped = candidates.find(function (url) {
      return /^https?:\/\/[^/]+\/assets\//i.test(url);
    });
    return originScoped || candidates[candidates.length - 1] || String(relativePath || "");
  }

  function ensureImageVariantManifestLoaded() {
    if (imageVariantManifest || imageVariantManifestLoadTried) {
      return imageVariantManifestPromise || Promise.resolve(imageVariantManifest);
    }
    imageVariantManifestLoadTried = true;
    imageVariantManifestPromise = fetchJsonFromCandidates("assets/data/image-variants.json")
      .then(function (payload) {
        if (payload && typeof payload === "object" && payload.items && typeof payload.items === "object") {
          imageVariantManifest = payload.items;
        } else {
          imageVariantManifest = Object.create(null);
        }
        return imageVariantManifest;
      })
      .catch(function () {
        imageVariantManifest = Object.create(null);
        return imageVariantManifest;
      })
      .then(function (result) {
        imageVariantManifestPromise = null;
        // Upgrade guessed srcsets to manifest-backed srcsets when available.
        requestAnimationFrame(function () {
          optimizeImages();
        });
        return result;
      });
    return imageVariantManifestPromise;
  }

  function getImageVariantEntry(path) {
    if (!imageVariantManifest || !path) {
      return null;
    }
    return imageVariantManifest[String(path).replace(/^\.?\//, "")] || null;
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

    if (!/\.(jpe?g|png)$/i.test(path)) {
      return false;
    }

    if (!/(^|\/)assets\/(images\/wix|template)\//i.test(path)) {
      return false;
    }

    return !/-\d+\.(jpe?g|png|webp|avif)$/i.test(path);
  }

  function buildVariantPath(path, width, extension) {
    return path.replace(
      /\.(jpe?g|png)$/i,
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
      img.setAttribute(
        "sizes",
        "(max-width: 900px) 94vw, (min-width: 1400px) 43vw, 48vw"
      );
      return;
    }

    if (
      img.closest(
        ".photo-archive-grid, .photo-index-grid, .photo-grid, .photo-featured-grid, .photo-card, .photo-feature-card"
      )
    ) {
      img.setAttribute(
        "sizes",
        "(max-width: 640px) 92vw, (max-width: 980px) 46vw, 29vw"
      );
      return;
    }

    if (img.closest(".photo-intro-layout, .music-intro-layout")) {
      img.setAttribute("sizes", "(max-width: 900px) 92vw, 42vw");
      return;
    }

    if (img.closest(".photo-tail-inner, .music-bottom-gallery")) {
      img.setAttribute("sizes", "(max-width: 900px) 92vw, 72vw");
      return;
    }

    if (img.closest(".music-album-page .album-cover, .album-cover")) {
      img.setAttribute("sizes", "(max-width: 900px) 92vw, (max-width: 1280px) 44vw, 40vw");
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

  function isDateLikeAltText(value) {
    var text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      return false;
    }
    return /^\d{2}\/\d{2}\/\d{4}(?:\s*-\s*.+)?$/.test(text) || text === "2022、夏、某" || text === "Summer 2022, Somewhere";
  }

  function firstUsefulAltText(values) {
    for (var i = 0; i < values.length; i += 1) {
      var candidate = typeof values[i] === "string" ? values[i].trim() : "";
      if (!candidate) {
        continue;
      }
      if (/^(read more|阅读全文)$/i.test(candidate)) {
        continue;
      }
      return candidate;
    }
    return "";
  }

  function isLowSignalAlt(img, currentAlt) {
    var text = typeof currentAlt === "string" ? currentAlt.trim() : "";
    if (!text) {
      return true;
    }
    if (/^(image|photo|img)$/i.test(text)) {
      return true;
    }
    if (/^chronohaze$/i.test(text) && img && img.closest(".site-header, .home-topbar, .site-footer")) {
      return true;
    }
    if (img && img.closest(".photo-detail-gallery")) {
      var detailHeading = document.querySelector(".photo-detail-article h1");
      var detailTitle = detailHeading ? (detailHeading.textContent || "").trim() : "";
      if (isDateLikeAltText(text) || (detailTitle && text === detailTitle)) {
        return true;
      }
    }
    if (img && img.closest(".photo-index-page, .photo-card, .photo-feature-card, .photo-card-link, .photo-feature-link")) {
      if (isDateLikeAltText(text)) {
        return true;
      }
    }
    if (img && img.closest(".music-detail-cover")) {
      var trackHeading = document.querySelector(".music-detail-article h1");
      var trackTitle = trackHeading ? (trackHeading.textContent || "").trim() : "";
      if (trackTitle && text === trackTitle) {
        return true;
      }
    }
    if (img && img.closest(".album-cover")) {
      var albumHeading = document.querySelector(".album-cover-main h1, .music-album-page h1");
      var albumTitle = albumHeading ? (albumHeading.textContent || "").trim() : "";
      if (albumTitle && text === albumTitle) {
        return true;
      }
    }
    return false;
  }

  function enrichImageAlt(img) {
    if (!img) {
      return;
    }

    if (img.closest(".floating-site-logo")) {
      return;
    }

    var currentAlt = (img.getAttribute("alt") || "").trim();
    if (!isLowSignalAlt(img, currentAlt)) {
      return;
    }

    var nextAlt = "";

    if (img.closest(".site-header, .home-topbar, .site-footer")) {
      nextAlt = "Chronohaze site logo";
    }

    if (!nextAlt && img.closest(".photo-detail-gallery")) {
      var detailTitleNode = document.querySelector(".photo-detail-article h1, .photo-detail-header h1");
      var detailTitle = detailTitleNode
        ? (detailTitleNode.textContent || "").trim()
        : "Photography";
      var detailMetaNode = document.querySelector(".photo-detail-article .article-meta");
      var detailMeta = detailMetaNode ? (detailMetaNode.textContent || "").trim() : "";
      var frames = Array.from(
        document.querySelectorAll(".photo-detail-gallery img")
      );
      var frameIndex = frames.indexOf(img) + 1;
      if (frameIndex > 0) {
        nextAlt = detailTitle + " photograph " + frameIndex;
        if (detailMeta) {
          nextAlt += " — " + detailMeta;
        }
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

    if (!nextAlt) {
      var photoIndexCard = img.closest(".photo-feature-card, .photo-card");
      if (photoIndexCard) {
        var themeNode = photoIndexCard.querySelector(".photo-feature-theme");
        var locationNode = photoIndexCard.querySelector(".photo-feature-location, .photo-date");
        var descriptor = firstUsefulAltText([
          themeNode ? themeNode.textContent : "",
          locationNode ? locationNode.textContent : "",
        ]);
        var location = locationNode ? (locationNode.textContent || "").trim() : "";
        if (descriptor && location && descriptor !== location) {
          nextAlt = descriptor + " — " + location;
        } else if (descriptor) {
          nextAlt = descriptor;
        }
      }
    }

    if (!nextAlt && img.closest(".photo-intro-layout")) {
      nextAlt = "Portrait of HazezZ with camera";
    }

    if (!nextAlt && img.closest(".music-intro-layout")) {
      nextAlt = "HazezZ in music session";
    }

    if (!nextAlt && img.closest(".music-detail-cover")) {
      var trackTitleNode = document.querySelector(".music-detail-article h1");
      var trackTitleText = trackTitleNode ? (trackTitleNode.textContent || "").trim() : "";
      if (trackTitleText) {
        nextAlt = "Artwork for " + trackTitleText;
      }
    }

    if (!nextAlt && img.closest(".album-cover")) {
      var albumTitleNode = document.querySelector(".album-cover-main h1, .music-album-page h1");
      var albumTitleText = albumTitleNode ? (albumTitleNode.textContent || "").trim() : "";
      if (albumTitleText) {
        nextAlt = "Album cover for " + albumTitleText;
      }
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

    var token = splitSrc(img.dataset.responsiveBaseSrc || img.getAttribute("src"));
    var path = token.path;
    var suffix = token.suffix || "";

    if (!isResponsiveImagePath(path)) {
      return;
    }

    defaultImageSizes(img);
    var manifestEntry = getImageVariantEntry(path);
    var wantsManifest = !!(manifestEntry && manifestEntry.formats);
    var currentMode = img.dataset.responsiveReady || "";
    if (
      currentMode === "manifest" ||
      (!wantsManifest && (currentMode === "guess" || currentMode === "none"))
    ) {
      return;
    }

    var picture = ensurePictureWrapper(img);
    if (!picture) {
      return;
    }

    // Remove legacy static <source> nodes so responsive sources are driven
    // only by manifest-backed markers below.
    Array.from(
      picture.querySelectorAll("source[type='image/avif']:not([data-responsive-avif='1'])")
    ).forEach(function (node) {
      node.remove();
    });
    Array.from(
      picture.querySelectorAll("source[type='image/webp']:not([data-responsive-webp='1'])")
    ).forEach(function (node) {
      node.remove();
    });

    function upsertSource(marker, mimeType, srcsetValue) {
      var selector = "source[" + marker + "='1']";
      var sourceNode = picture.querySelector(selector);
      if (!srcsetValue) {
        if (sourceNode && sourceNode.parentNode) {
          sourceNode.parentNode.removeChild(sourceNode);
        }
        return null;
      }
      if (!sourceNode) {
        sourceNode = document.createElement("source");
        sourceNode.setAttribute(marker, "1");
        sourceNode.type = mimeType;
        picture.insertBefore(sourceNode, picture.firstChild);
      }
      sourceNode.srcset = srcsetValue;
      sourceNode.sizes = img.getAttribute("sizes") || "100vw";
      return sourceNode;
    }

    if (wantsManifest) {
      var formats = manifestEntry.formats || {};
      var avifSet = formats.avif && formats.avif.srcset ? String(formats.avif.srcset) : "";
      var webpSetManifest = formats.webp && formats.webp.srcset ? String(formats.webp.srcset) : "";
      upsertSource("data-responsive-webp", "image/webp", webpSetManifest);
      upsertSource("data-responsive-avif", "image/avif", avifSet);
      if (formats.jpg && formats.jpg.srcset && !img.dataset.photoThumbOptimized && !img.dataset.photoDetailProgressive) {
        img.srcset = String(formats.jpg.srcset);
        img.setAttribute("sizes", img.getAttribute("sizes") || "100vw");
      }
      img.dataset.responsiveReady = "manifest";
      return;
    }

    // Do not inject guessed variant URLs when no manifest entry exists.
    // Guessed sources can 404 for manually added assets and cause broken images.
    upsertSource("data-responsive-webp", "image/webp", null);
    upsertSource("data-responsive-avif", "image/avif", null);
    img.dataset.responsiveReady = "none";
  }

  function optimizeImages() {
    ensureImageVariantManifestLoaded();
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

      if (!img.getAttribute("fetchpriority")) {
        img.setAttribute("fetchpriority", eager ? "high" : "low");
      }

      enrichImageAlt(img);
    });

    images.forEach(function (img) {
      applyResponsiveSourceSet(img);
    });
  }

  function upgradePhotoImageLoadingStrategy() {
    var listThumbSelectors = [
      ".photo-card-link img",
      ".photo-feature-link img",
    ].join(", ");

    Array.from(document.querySelectorAll(listThumbSelectors)).forEach(function (img) {
      if (!img || img.dataset.photoThumbOptimized === "1") {
        return;
      }

      img.dataset.photoThumbOptimized = "1";
      var token = splitSrc(img.getAttribute("src"));
      var path = token.path;
      var suffix = token.suffix || "";
      if (!isResponsiveImagePath(path)) {
        return;
      }

      img.dataset.responsiveBaseSrc = path + suffix;
      img.dataset.fullResSrc = path + suffix;
      img.src = buildVariantPath(path, 960, "webp") + suffix;
      if (!img.getAttribute("loading")) {
        img.loading = "lazy";
      }
      if (!img.getAttribute("decoding")) {
        img.decoding = "async";
      }
    });

    Array.from(document.querySelectorAll(".photo-detail-gallery img")).forEach(function (img) {
      if (!img || img.dataset.photoDetailProgressive === "1") {
        return;
      }
      img.dataset.photoDetailProgressive = "1";

      var token = splitSrc(img.getAttribute("src"));
      var path = token.path;
      var suffix = token.suffix || "";
      if (!isResponsiveImagePath(path)) {
        return;
      }

      var fullSrc = path + suffix;
      img.dataset.responsiveBaseSrc = fullSrc;
      img.dataset.fullResSrc = fullSrc;
      img.dataset.fullResLoaded = "0";
      img.dataset.previewSrc = buildVariantPath(path, 1600, "webp") + suffix;

      // Use a visually lossless preview by default; load original only when the viewer asks for it.
      img.src = img.dataset.previewSrc;

      var figure = img.closest(".photo-detail-item");
      if (figure && figure.dataset.fullResBinder !== "1") {
        figure.dataset.fullResBinder = "1";
        figure.classList.add("photo-detail-item--progressive");
        figure.setAttribute("role", "button");
        figure.setAttribute("tabindex", "0");
        figure.setAttribute("title", getPhotoDetailLightboxLabels(detectPreferredLanguage()).figureTitle);
        bindResponsivePress(figure, function (event) {
          ensurePhotoDetailImageViewer(detectPreferredLanguage());
          openPhotoDetailLightbox(figure, detectPreferredLanguage());
          event.preventDefault();
        });
      }
    });
  }

  var videoMetadataWarmupObserver = null;

  function optimizeMediaLoading() {
    var media = Array.from(document.querySelectorAll("audio, video"));
    var videoWarmupTargets = [];

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
        !item.hasAttribute("autoplay");

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

      if (
        item.tagName === "VIDEO" &&
        !item.hasAttribute("autoplay") &&
        !item.hasAttribute("data-eager-media") &&
        (item.getAttribute("preload") || "").toLowerCase() === "none"
      ) {
        videoWarmupTargets.push(item);
      }

      if (item.dataset.mediaAnalyticsBound !== "1") {
        item.dataset.mediaAnalyticsBound = "1";
        item.addEventListener(
          "play",
          function () {
            if (item.dataset.mediaPlayTracked === "1") {
              return;
            }
            item.dataset.mediaPlayTracked = "1";
            var source =
              item.getAttribute("src") ||
              (item.currentSrc || "") ||
              ((item.querySelector && item.querySelector("source")) || {}).src ||
              "";
            var path = "";
            try {
              path = source ? new URL(source, window.location.href).pathname : "";
            } catch (_error) {
              path = String(source || "");
            }
            trackAnalyticsEvent("media_play_start", {
              media_kind: String(item.tagName || "").toLowerCase(),
              page_path: window.location.pathname,
              media_path: path,
            });
          },
          { once: false }
        );
      }
    });

    if (videoWarmupTargets.length && "IntersectionObserver" in window) {
      if (!videoMetadataWarmupObserver) {
        videoMetadataWarmupObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }
            var video = entry.target;
            if (video && video.tagName === "VIDEO") {
              var preload = (video.getAttribute("preload") || "").toLowerCase();
              if (preload === "none") {
                video.preload = "metadata";
              }
            }
            observer.unobserve(entry.target);
          });
        },
        {
          rootMargin: "240px 0px",
          threshold: 0.01,
        }
      );
      }

      document.querySelectorAll("video").forEach(function (video) {
        if (!video || video.dataset.videoWarmupObserved === "1") {
          return;
        }
        var preloadValue = (video.getAttribute("preload") || "").toLowerCase();
        if (preloadValue !== "none") {
          return;
        }
        video.dataset.videoWarmupObserved = "1";
        videoMetadataWarmupObserver.observe(video);
      });
    }
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

  function buildFooterFeedLink(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    var label = "RSS";
    var ariaLabel =
      safeLang === "en" ? "Subscribe to Chronohaze notes feed" : "通过 RSS 订阅 Chronohaze 更新";
    var link = document.createElement("a");
    link.className = "footer-feed-link";
    link.href = "https://lyuf09.github.io/chronohaze/feed.xml";
    link.setAttribute("data-feed-link", "1");
    link.setAttribute("aria-label", ariaLabel);
    link.setAttribute("title", ariaLabel);
    link.innerHTML =
      '<svg class="footer-feed-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      '<circle cx="3" cy="13" r="1.55" fill="currentColor"></circle>' +
      '<path d="M2.65 8.55A4.8 4.8 0 0 1 7.45 13.35" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"></path>' +
      '<path d="M2.65 4.3A9.05 9.05 0 0 1 11.7 13.35" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"></path>' +
      '</svg>' +
      '<span class="footer-feed-label">' +
      label +
      "</span>";
    return link;
  }

  function ensureFooterFeedLinks(lang) {
    var safeLang = lang === "en" ? "en" : detectPreferredLanguage();
    Array.from(document.querySelectorAll(".footer-right, .home-footer-policy")).forEach(function (
      container
    ) {
      if (!container) {
        return;
      }
      var existing = container.querySelector(".footer-feed-link");
      if (!existing) {
        existing = buildFooterFeedLink(safeLang);
        container.appendChild(existing);
      } else {
        var refreshed = buildFooterFeedLink(safeLang);
        existing.setAttribute("aria-label", refreshed.getAttribute("aria-label") || "");
        existing.setAttribute("title", refreshed.getAttribute("title") || "");
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

  function isPhotoIndexHref(href) {
    return /(?:^|\/)(?:portfolio-1|photography)\.html(?:$|[?#])/i.test(String(href || ""));
  }

  function isMusicIndexHref(href) {
    return /(?:^|\/)(?:yin-le|music)\.html(?:$|[?#])/i.test(String(href || ""));
  }

  function isMathIndexHref(href) {
    return /(?:^|\/)math\.html(?:$|[?#])/i.test(String(href || "")) || /#math/i.test(String(href || ""));
  }

  function isAcademicIndexHref(href) {
    return /(?:^|\/)academic\.html(?:$|[?#])/i.test(String(href || ""));
  }

  function isProjectsIndexHref(href) {
    return /(?:^|\/)projects\.html(?:$|[?#])/i.test(String(href || ""));
  }

  function isResearchIndexHref(href) {
    return /(?:^|\/)research\.html(?:$|[?#])/i.test(String(href || ""));
  }

  function getPrimaryNavKeyFromHref(href) {
    var value = String(href || "");
    var hrefKey = normalizeNavHref(value);
    if (!hrefKey) {
      return "";
    }
    if (/\/post\//i.test(hrefKey)) {
      return "academic";
    }
    if (/\/photo\//i.test(hrefKey)) {
      return "photo";
    }
    if (/\/music\//i.test(hrefKey)) {
      return "music";
    }
    if (isAcademicIndexHref(hrefKey)) {
      return "academic";
    }
    if (isMathIndexHref(hrefKey)) {
      return "academic";
    }
    if (isPhotoIndexHref(hrefKey)) {
      return "photo";
    }
    if (isMusicIndexHref(hrefKey)) {
      return "music";
    }
    if (isProjectsIndexHref(hrefKey)) {
      return "academic";
    }
    if (isResearchIndexHref(hrefKey)) {
      return "academic";
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

      var desiredOrder = ["home", "academic", "photo", "music", "cv", "search"];
      var links = Array.from(nav.querySelectorAll("a"));
      var keyedFirst = Object.create(null);
      var leftovers = [];

      links.forEach(function (link) {
        var key = getPrimaryNavKeyFromHref(link.getAttribute("href") || "");
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

  var articleScrollTocState = null;

  function isLongformArticlePage() {
    var path = (window.location.pathname || "").toLowerCase();
    return /\/(?:en\/)?post\/[^/?#]+\.html$/.test(path);
  }

  function getArticleTocLanguage() {
    var htmlLang = String(document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (htmlLang.indexOf("en") === 0) {
      return "en";
    }
    return detectPreferredLanguage() === "en" ? "en" : "zh";
  }

  function getVisibleArticleTocRoot(article) {
    if (!article) {
      return null;
    }

    var langBlocks = Array.from(article.querySelectorAll("[data-lang-block]"));
    if (!langBlocks.length) {
      return article;
    }

    return (
      langBlocks.find(function (block) {
        return !block.hidden && !(block.closest("[hidden]") && block.closest("[hidden]") !== block);
      }) || article
    );
  }

  function slugifyHeadingText(value) {
    var input = String(value || "").trim().toLowerCase();
    if (!input) {
      return "";
    }

    var result = [];
    var lastWasDash = false;

    for (var i = 0; i < input.length; i += 1) {
      var char = input.charAt(i);
      var code = input.charCodeAt(i);
      var isAsciiAlphaNum =
        (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
      var isCjk =
        (code >= 0x3400 && code <= 0x4dbf) ||
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0xf900 && code <= 0xfaff);

      if (isAsciiAlphaNum || isCjk) {
        result.push(char);
        lastWasDash = false;
      } else if (!lastWasDash) {
        result.push("-");
        lastWasDash = true;
      }
    }

    return result.join("").replace(/^-+|-+$/g, "");
  }

  function destroyArticleScrollToc() {
    function unwrapArticleTocShell(shell) {
      if (!shell || !shell.parentNode) {
        return;
      }

      Array.from(shell.querySelectorAll("[data-article-toc='1']")).forEach(function (aside) {
        if (aside.parentNode) {
          aside.parentNode.removeChild(aside);
        }
      });

      var article = shell.querySelector(".article");
      if (article && article.parentNode === shell) {
        shell.classList.remove("has-article-toc");
        shell.parentNode.insertBefore(article, shell);
      }

      if (shell.parentNode) {
        shell.parentNode.removeChild(shell);
      }
    }

    if (articleScrollTocState) {
      var state = articleScrollTocState;
      if (state.observer) {
        state.observer.disconnect();
      }
      if (state.scrollHandler) {
        window.removeEventListener("scroll", state.scrollHandler);
      }
      if (state.resizeHandler) {
        window.removeEventListener("resize", state.resizeHandler);
        window.removeEventListener("orientationchange", state.resizeHandler);
      }

      if (state.aside && state.aside.parentNode) {
        state.aside.parentNode.removeChild(state.aside);
      }

      if (state.shell) {
        unwrapArticleTocShell(state.shell);
      }
    }

    Array.from(document.querySelectorAll(".main .article-layout.has-article-toc")).forEach(function (shell) {
      unwrapArticleTocShell(shell);
    });

    Array.from(document.querySelectorAll(".main [data-article-toc='1']")).forEach(function (aside) {
      if (aside.parentNode) {
        aside.parentNode.removeChild(aside);
      }
    });

    articleScrollTocState = null;
  }

  function setupArticleScrollToc() {
    if (!document.body) {
      return;
    }

    if (!isLongformArticlePage()) {
      destroyArticleScrollToc();
      return;
    }

    var main = document.querySelector(".main");
    var article = main && main.querySelector(".article");
    if (
      !article ||
      article.classList.contains("music-detail-article") ||
      article.classList.contains("photo-detail-article") ||
      article.classList.contains("photo-blue-article")
    ) {
      destroyArticleScrollToc();
      return;
    }

    var tocRoot = getVisibleArticleTocRoot(article);
    if (!tocRoot) {
      destroyArticleScrollToc();
      return;
    }

    var existingTocShells = document.querySelectorAll(".main .article-layout.has-article-toc").length;
    var existingTocAsides = document.querySelectorAll(".main [data-article-toc='1']").length;
    var needsArtifactCleanup =
      existingTocShells > 1 ||
      existingTocAsides > 1 ||
      ((existingTocShells || existingTocAsides) &&
        (!articleScrollTocState || !articleScrollTocState.aside || !articleScrollTocState.aside.isConnected));

    if (needsArtifactCleanup) {
      destroyArticleScrollToc();
    }

    var candidateHeadings = Array.from(tocRoot.querySelectorAll("h2, h3, h4"))
      .filter(function (heading) {
        return heading && normalizeText(heading.textContent || "");
      });

    if (candidateHeadings.length < 3) {
      destroyArticleScrollToc();
      return;
    }

    var safeLang = getArticleTocLanguage();
    var tocSignature = candidateHeadings
      .map(function (heading) {
        return heading.tagName + ":" + normalizeText(heading.textContent || "");
      })
      .join("|");

    if (
      articleScrollTocState &&
      articleScrollTocState.article === article &&
      articleScrollTocState.root === tocRoot &&
      articleScrollTocState.lang === safeLang &&
      articleScrollTocState.signature === tocSignature &&
      articleScrollTocState.aside &&
      articleScrollTocState.aside.isConnected
    ) {
      if (typeof articleScrollTocState.refresh === "function") {
        articleScrollTocState.refresh();
      }
      return;
    }

    destroyArticleScrollToc();

    withMutationRefreshSuppressed(function () {
      var shell = document.createElement("div");
      shell.className = "article-layout has-article-toc";
      article.parentNode.insertBefore(shell, article);
      shell.appendChild(article);

      var tocTitle = safeLang === "en" ? "On this page" : "本文目录";

      var aside = document.createElement("aside");
      aside.className = "article-toc";
      aside.setAttribute("data-article-toc", "1");

      var title = document.createElement("p");
      title.className = "article-toc-title";
      title.textContent = tocTitle;
      aside.appendChild(title);

      var nav = document.createElement("nav");
      nav.className = "article-toc-nav";
      nav.setAttribute("aria-label", tocTitle);
      aside.appendChild(nav);
      shell.insertBefore(aside, article);

      var usedIds = new Set(
        Array.from(article.querySelectorAll("[id]"))
          .map(function (node) {
            return node.id;
          })
          .filter(Boolean)
      );

      var baseLevel = candidateHeadings.reduce(function (minLevel, heading) {
        var level = Number(heading.tagName.slice(1)) || 2;
        return Math.min(minLevel, level);
      }, 6);

      var entries = candidateHeadings.map(function (heading, index) {
        var label = String(heading.textContent || "").replace(/\s+/g, " ").trim();
        var existingId = heading.getAttribute("id");
        var id = existingId || "";

        if (!id) {
          var baseId = slugifyHeadingText(label) || "section";
          var candidateId = "toc-" + baseId;
          var suffix = 2;
          while (usedIds.has(candidateId)) {
            candidateId = "toc-" + baseId + "-" + suffix;
            suffix += 1;
          }
          id = candidateId;
          heading.setAttribute("id", id);
        }
        usedIds.add(id);

        var level = Number(heading.tagName.slice(1)) || 2;
        var depth = Math.max(0, level - baseLevel);

        var link = document.createElement("a");
        link.className = "article-toc-link article-toc-depth-" + depth;
        link.href = "#" + id;
        link.textContent = label;
        link.setAttribute("data-target-id", id);
        var entry = {
          id: id,
          node: heading,
          link: link,
        };
        link.addEventListener("click", function (event) {
          event.preventDefault();
          jumpToEntry(entry, index);
        });
        nav.appendChild(link);

        return entry;
      });

      if (!entries.length) {
        destroyArticleScrollToc();
        return;
      }

      var activeIndex = -1;
      var rafId = 0;
      var prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function getStickyOffset() {
        var header = document.querySelector(".site-header");
        var headerHeight = header ? header.getBoundingClientRect().height : 88;
        return Math.max(108, Math.round(headerHeight + 22));
      }

      function syncOffset() {
        shell.style.setProperty("--article-toc-top", getStickyOffset() + "px");
      }

      function jumpToEntry(entry, index) {
        if (!entry || !entry.node) {
          return;
        }

        syncOffset();
        var top =
          window.pageYOffset +
          entry.node.getBoundingClientRect().top -
          getStickyOffset() -
          8;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });

        if (!entry.node.hasAttribute("tabindex")) {
          entry.node.setAttribute("tabindex", "-1");
        }

        try {
          entry.node.focus({ preventScroll: true });
        } catch (_focusError) {
          entry.node.focus();
        }

        try {
          var nextUrl = new URL(window.location.href);
          nextUrl.hash = entry.id;
          window.history.replaceState(window.history.state, "", nextUrl.toString());
        } catch (_historyError) {}

        setActive(index);
        window.setTimeout(updateActive, prefersReducedMotion ? 40 : 220);
      }

      function setActive(index) {
        var safeIndex = Math.max(0, Math.min(entries.length - 1, index));
        if (safeIndex === activeIndex) {
          return;
        }
        activeIndex = safeIndex;
        entries.forEach(function (entry, entryIndex) {
          var isActive = entryIndex === safeIndex;
          entry.link.classList.toggle("is-active", isActive);
          if (isActive) {
            entry.link.setAttribute("aria-current", "location");
          } else {
            entry.link.removeAttribute("aria-current");
          }
        });
      }

      function updateActive() {
        rafId = 0;
        syncOffset();
        var offset = getStickyOffset() + 18;
        var nextIndex = 0;

        entries.forEach(function (entry, index) {
          if (entry.node.getBoundingClientRect().top <= offset) {
            nextIndex = index;
          }
        });

        setActive(nextIndex);
      }

      function scheduleUpdate() {
        if (rafId) {
          return;
        }
        rafId = window.requestAnimationFrame(updateActive);
      }

      var observer = null;
      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(
          function () {
            scheduleUpdate();
          },
          {
            threshold: [0, 1],
            rootMargin: "-18% 0px -62% 0px",
          }
        );
        entries.forEach(function (entry) {
          observer.observe(entry.node);
        });
      }

      window.addEventListener("scroll", scheduleUpdate, { passive: true });
      window.addEventListener("resize", scheduleUpdate, { passive: true });
      window.addEventListener("orientationchange", scheduleUpdate, { passive: true });

      syncOffset();
      updateActive();

      articleScrollTocState = {
        article: article,
        root: tocRoot,
        shell: shell,
        aside: aside,
        observer: observer,
        lang: safeLang,
        signature: tocSignature,
        scrollHandler: scheduleUpdate,
        resizeHandler: scheduleUpdate,
        refresh: updateActive,
      };
    });
  }

  var mathCatalogMetadata = null;
  var mathCatalogMetadataPromise = null;

  function normalizeMathPostPath(value) {
    var raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    try {
      raw = new URL(raw, window.location.origin).pathname || raw;
    } catch (_error) {
    }

    raw = raw
      .replace(/^.*\/chronohaze\//i, "")
      .replace(/^\/+/, "")
      .replace(/[?#].*$/, "")
      .replace(/^\.\//, "");

    if (/^en\/post\//i.test(raw)) {
      raw = raw.replace(/^en\//i, "");
    }

    if (/^post\/[^/]+\.html$/i.test(raw)) {
      return raw;
    }

    var fileName = raw.split("/").pop() || "";
    if (/\.html$/i.test(fileName)) {
      return "post/" + fileName;
    }

    return "";
  }

  function getCurrentMathPostPath() {
    return normalizeMathPostPath(window.location.pathname || window.location.href || "");
  }

  function loadMathCatalogMetadata() {
    if (Array.isArray(mathCatalogMetadata)) {
      return Promise.resolve(mathCatalogMetadata);
    }
    if (mathCatalogMetadataPromise) {
      return mathCatalogMetadataPromise;
    }

    mathCatalogMetadataPromise = fetchJsonFromCandidates("assets/data/math-catalog.json")
      .then(function (payload) {
        var items = payload && Array.isArray(payload.items) ? payload.items : [];
        mathCatalogMetadata = items.filter(function (item) {
          return !!normalizeMathPostPath((item && (item.readmore_url || item.url)) || "");
        });
        return mathCatalogMetadata;
      })
      .catch(function () {
        mathCatalogMetadata = [];
        return mathCatalogMetadata;
      })
      .then(function (result) {
        mathCatalogMetadataPromise = null;
        return result;
      });

    return mathCatalogMetadataPromise;
  }

  function bindMathPostNavLink(itemNode, href) {
    if (!itemNode || !href || itemNode.dataset.mathNavBound === "1") {
      return;
    }
    itemNode.dataset.mathNavBound = "1";
    itemNode.draggable = false;

    var go = function () {
      try {
        window.location.assign(href);
      } catch (_err) {
        window.location.href = href;
      }
    };

    itemNode.addEventListener(
      "click",
      function (event) {
        if (!event || event.defaultPrevented) {
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        go();
      },
      true
    );

    itemNode.onclick = function (event) {
      if (!event || event.defaultPrevented) {
        return;
      }
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      go();
    };

    itemNode.addEventListener(
      "keydown",
      function (event) {
        if (!event || event.defaultPrevented) {
          return;
        }
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        go();
      },
      true
    );
  }

  function createMathPostNavItem(item, direction, lang) {
    var isEnglish = lang === "en";
    var itemNode = document.createElement("button");
    itemNode.className = "math-post-nav-item" + (item ? "" : " is-disabled");
    itemNode.setAttribute("data-nav-dir", direction);

    var labelNode = document.createElement("span");
    labelNode.className = "math-post-nav-label";
    labelNode.textContent = isEnglish
      ? direction === "prev"
        ? "Previous note"
        : "Next note"
      : direction === "prev"
        ? "上一篇"
        : "下一篇";

    var titleNode = document.createElement("span");
    titleNode.className = "math-post-nav-title";

    if (item) {
      var route = normalizeMathPostPath(item.readmore_url || item.url || "");
      var href = "";
      if (route) {
        try {
          href = new URL(
            getChronohazeRootPath() + route.replace(/^\/+/, ""),
            window.location.origin
          ).href;
        } catch (_error) {
          href = getChronohazeRootPath() + route.replace(/^\/+/, "");
        }
      }
      var titleText =
        isEnglish
          ? item.title_en || item.title || "Untitled note"
          : item.title || item.title_en || "未命名笔记";
      itemNode.setAttribute("type", "button");
      itemNode.setAttribute(
        "aria-label",
        (labelNode.textContent || "") + " · " + titleText
      );
      titleNode.textContent = titleText;
      bindMathPostNavLink(itemNode, href);
    } else {
      titleNode.textContent = isEnglish
        ? direction === "prev"
          ? "No previous note"
          : "No next note"
        : direction === "prev"
          ? "暂无上一篇"
          : "暂无下一篇";
      itemNode.setAttribute("aria-disabled", "true");
    }

    itemNode.appendChild(labelNode);
    itemNode.appendChild(titleNode);
    return itemNode;
  }

  function buildMathPostAdjacentNavigation(items, currentPath, lang) {
    if (!Array.isArray(items) || !items.length || !currentPath) {
      return null;
    }

    var currentIndex = items.findIndex(function (item) {
      return normalizeMathPostPath((item && (item.readmore_url || item.url)) || "") === currentPath;
    });

    if (currentIndex === -1) {
      return null;
    }

    var prevItem = currentIndex > 0 ? items[currentIndex - 1] : null;
    var nextItem = currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
    var nav = document.createElement("nav");
    nav.className = "math-post-nav";
    nav.setAttribute("data-math-post-nav", "1");
    nav.setAttribute("aria-label", lang === "en" ? "Adjacent notes" : "相邻笔记导航");
    nav.appendChild(createMathPostNavItem(prevItem, "prev", lang));
    nav.appendChild(createMathPostNavItem(nextItem, "next", lang));
    return nav;
  }

  function renderMathPostAdjacentNavigation(lang) {
    if (!document.body.classList.contains("math-post-page")) {
      return;
    }

    var safeLang = lang === "en" ? "en" : "zh";
    var currentPath = getCurrentMathPostPath();
    if (!currentPath || !Array.isArray(mathCatalogMetadata) || !mathCatalogMetadata.length) {
      return;
    }

    var article = document.querySelector(".article");
    if (!article) {
      return;
    }

    var blocks = Array.from(article.querySelectorAll(':scope > [data-lang-block]'));
    if (!blocks.length) {
      blocks = [article];
    }

    blocks.forEach(function (block) {
      var blockLang = block.getAttribute("data-lang-block") || "zh";
      if (blocks.length > 1 && blockLang !== safeLang) {
        var stale = block.querySelector('[data-math-post-nav="1"]');
        if (stale) {
          stale.remove();
        }
        return;
      }

      var existing = block.querySelector('[data-math-post-nav="1"]');
      if (existing) {
        existing.remove();
      }

      var nav = buildMathPostAdjacentNavigation(mathCatalogMetadata, currentPath, blocks.length > 1 ? blockLang : safeLang);
      if (!nav) {
        return;
      }

      var children = Array.from(block.children || []);
      var anchorParagraph = children.find(function (child) {
        if (!child || child.tagName !== "P") {
          return false;
        }
        var link = child.querySelector('a.read-more[href]');
        if (!link) {
          return false;
        }
        return isMathIndexHref(link.getAttribute("href") || "");
      });

      if (anchorParagraph && anchorParagraph.parentNode) {
        anchorParagraph.parentNode.insertBefore(nav, anchorParagraph);
      } else {
        block.appendChild(nav);
      }
    });
  }

  function ensureMathPostAdjacentNavigation(lang) {
    if (!document.body.classList.contains("math-post-page")) {
      return;
    }

    if (document.querySelector('[data-static-math-post-nav="1"]')) {
      return;
    }

    var safeLang = lang === "en" ? "en" : detectPreferredLanguage();
    if (Array.isArray(mathCatalogMetadata)) {
      renderMathPostAdjacentNavigation(safeLang);
      return;
    }

    loadMathCatalogMetadata().then(function () {
      renderMathPostAdjacentNavigation(safeLang);
    });
  }

  function trackAnalyticsEvent(name, params) {
    if (typeof window.gtag !== "function" || !name) {
      return;
    }
    try {
      window.gtag("event", name, params || {});
    } catch (_error) {
    }
  }

  function copyTextToClipboard(text) {
    var value = String(text || "");
    if (!value) {
      return Promise.resolve(false);
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard
        .writeText(value)
        .then(function () {
          return true;
        })
        .catch(function () {
          return false;
        });
    }

    try {
      var textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.left = "-1000px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      var ok = false;
      try {
        ok = !!document.execCommand("copy");
      } catch (_error) {
        ok = false;
      }
      textarea.remove();
      return Promise.resolve(ok);
    } catch (_error) {
      return Promise.resolve(false);
    }
  }

  function bindResponsivePress(node, handler) {
    if (!node || typeof handler !== "function") {
      return;
    }

    var lastTouchStamp = 0;
    var touchStartX = null;
    var touchStartY = null;
    var touchMoved = false;
    var TOUCH_MOVE_TOLERANCE = 10;

    node.addEventListener(
      "touchstart",
      function (event) {
        var touch = event.changedTouches && event.changedTouches[0];
        if (!touch) {
          return;
        }
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchMoved = false;
      },
      { passive: true }
    );

    node.addEventListener(
      "touchmove",
      function (event) {
        var touch = event.changedTouches && event.changedTouches[0];
        if (!touch || touchStartX === null || touchStartY === null) {
          return;
        }
        if (
          Math.abs(touch.clientX - touchStartX) > TOUCH_MOVE_TOLERANCE ||
          Math.abs(touch.clientY - touchStartY) > TOUCH_MOVE_TOLERANCE
        ) {
          touchMoved = true;
        }
      },
      { passive: true }
    );

    node.addEventListener(
      "touchend",
      function (event) {
        if (event.defaultPrevented) {
          return;
        }
        if (touchMoved) {
          touchStartX = null;
          touchStartY = null;
          touchMoved = false;
          return;
        }
        lastTouchStamp = Date.now();
        if (event.cancelable) {
          event.preventDefault();
        }
        touchStartX = null;
        touchStartY = null;
        touchMoved = false;
        handler(event);
      },
      { passive: false }
    );

    node.addEventListener(
      "touchcancel",
      function () {
        touchStartX = null;
        touchStartY = null;
        touchMoved = false;
      },
      { passive: true }
    );

    node.addEventListener("click", function (event) {
      if (Date.now() - lastTouchStamp < 700) {
        if (event.cancelable) {
          event.preventDefault();
        }
        return;
      }
      handler(event);
    });
  }

  var CHRONOHAZE_EMAIL_BOOK = {
    main: {
      userParts: ["fei", "er530"],
      domainParts: ["icloud", "com"],
    },
  };

  function resolveEmailAddress(key) {
    var record = CHRONOHAZE_EMAIL_BOOK[key || "main"];
    if (!record) {
      return "";
    }
    var user = Array.isArray(record.userParts) ? record.userParts.join("") : "";
    var domain = Array.isArray(record.domainParts) ? record.domainParts.join(".") : "";
    if (!user || !domain) {
      return "";
    }
    return user + "@" + domain;
  }

  function formatMirroredEmailDisplay(emailValue) {
    return Array.from(String(emailValue || "")).reverse().join("");
  }

  function ensureEmailInlineWrap(link, button) {
    if (!link) {
      return null;
    }

    var existing =
      link.parentElement && link.parentElement.classList.contains("obf-email-inline")
        ? link.parentElement
        : null;

    if (existing) {
      if (button && button.parentElement !== existing) {
        existing.appendChild(button);
      }
      return existing;
    }

    var wrap = document.createElement("span");
    wrap.className = "obf-email-inline";
    link.insertAdjacentElement("beforebegin", wrap);
    wrap.appendChild(link);
    if (button) {
      wrap.appendChild(button);
    }
    return wrap;
  }

  function ensureEmailCopyButton(link, copyHint, copiedHint, copyFailedHint) {
    var button =
      link.nextElementSibling && link.nextElementSibling.classList.contains("obf-email-copy")
        ? link.nextElementSibling
        : null;

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "obf-email-copy";
      link.insertAdjacentElement("afterend", button);
    }

    var tooltip = button.querySelector(".obf-email-copy-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("span");
      tooltip.className = "obf-email-copy-tooltip";
      tooltip.setAttribute("aria-hidden", "true");
      button.appendChild(tooltip);
    }

    button.setAttribute("aria-label", copyHint);
    button.setAttribute("title", copyHint);
    tooltip.textContent = copyHint;

    if (button.dataset.emailObfBound === "1") {
      return button;
    }

    button.dataset.emailObfBound = "1";
    bindResponsivePress(button, function (event) {
      event.preventDefault();
      event.stopPropagation();

      var latestEmail = button.getAttribute("data-email-value") || "";
      var status = ensureEmailCopyStatus(button);
      if (!latestEmail) {
        return;
      }

      copyTextToClipboard(latestEmail).then(function (ok) {
        button.dataset.emailCopied = ok ? "1" : "";
        button.dataset.emailCopyFailed = ok ? "" : "1";
        button.setAttribute("title", ok ? copiedHint : copyFailedHint);
        button.setAttribute("aria-label", ok ? copiedHint : copyFailedHint);
        tooltip.textContent = ok ? copiedHint : copyFailedHint;
        if (status) {
          status.textContent = ok ? copiedHint : copyFailedHint;
          status.dataset.visible = "1";
          status.dataset.failed = ok ? "" : "1";
        }
        if (ok) {
          trackAnalyticsEvent("email_copy", {
            page_path: window.location.pathname || "",
          });
        }
        window.setTimeout(function () {
          if (!button || !button.isConnected) {
            return;
          }
          button.dataset.emailCopied = "";
          button.dataset.emailCopyFailed = "";
          button.setAttribute("title", copyHint);
          button.setAttribute("aria-label", copyHint);
          tooltip.textContent = copyHint;
          if (status) {
            status.textContent = "";
            status.dataset.visible = "";
            status.dataset.failed = "";
          }
        }, ok ? 1500 : 2200);
      });
    });

    return button;
  }

  function ensureEmailCopyStatus(button) {
    if (!button) {
      return null;
    }

    var existing =
      button.nextElementSibling &&
      button.nextElementSibling.classList.contains("obf-email-copy-status")
        ? button.nextElementSibling
        : null;

    if (existing) {
      return existing;
    }

    var status = document.createElement("span");
    status.className = "obf-email-copy-status";
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    button.insertAdjacentElement("afterend", status);
    return status;
  }

  function enhanceObfuscatedEmailLinks() {
    var safeLang = detectPreferredLanguage();
    var dict = getSecondaryPageDictionary(safeLang) || {};
    var sendHintPrefix = safeLang === "en" ? "Send email to " : "发送邮件至 ";
    var copyHint =
      dict.emailCopyHint ||
      (safeLang === "en" ? "Copy email address" : "复制邮箱地址");
    var copiedHint = dict.emailCopiedEmail || (safeLang === "en" ? "Email copied" : "邮箱已复制");
    var copyFailedHint =
      dict.emailCopyFailed || (safeLang === "en" ? "Copy failed" : "复制失败，请手动复制");

    Array.from(document.querySelectorAll("a[data-email-link='1']")).forEach(function (link) {
      if (!link) {
        return;
      }

      var key = link.getAttribute("data-email-key") || "main";
      var emailAddress = resolveEmailAddress(key);
      if (!emailAddress) {
        return;
      }

      link.setAttribute("href", "mailto:" + emailAddress);
      link.removeAttribute("role");
      link.setAttribute("data-email-value", emailAddress);
      link.setAttribute("title", sendHintPrefix + emailAddress);
      link.setAttribute("aria-label", sendHintPrefix + emailAddress);

      var face = link.querySelector(".obf-email-face");
      if (!face) {
        link.textContent = "";
        face = document.createElement("span");
        face.className = "obf-email-face";
        link.appendChild(face);
      }
      face.textContent = formatMirroredEmailDisplay(emailAddress);

      var button = ensureEmailCopyButton(link, copyHint, copiedHint, copyFailedHint);
      var status = ensureEmailCopyStatus(button);
      button.setAttribute("data-email-value", emailAddress);
      button.setAttribute("title", button.dataset.emailCopied === "1" ? copiedHint : copyHint);
      button.setAttribute(
        "aria-label",
        button.dataset.emailCopied === "1" ? copiedHint : copyHint
      );
      if (status) {
        if (button.dataset.emailCopied === "1") {
          status.textContent = copiedHint;
          status.dataset.visible = "1";
        } else if (button.dataset.emailCopyFailed === "1") {
          status.textContent = copyFailedHint;
          status.dataset.visible = "1";
          status.dataset.failed = "1";
        } else {
          status.textContent = "";
          status.dataset.visible = "";
          status.dataset.failed = "";
        }
      }
      ensureEmailInlineWrap(link, button);
    });
  }

  function buildPageSharePayload() {
    var canonicalNode = document.querySelector('link[rel="canonical"]');
    var metaTitleNode =
      document.querySelector('meta[property="og:title"]') ||
      document.querySelector('meta[name="twitter:title"]');
    var metaImageNode =
      document.querySelector('meta[property="og:image"]') ||
      document.querySelector('meta[name="twitter:image"]');
    var metaDescNode =
      document.querySelector('meta[property="og:description"]') ||
      document.querySelector('meta[name="description"]');
    var h1 = document.querySelector("h1");
    var article = document.querySelector("article, .article, .music-detail-article");
    var firstPara = article ? article.querySelector("p") : document.querySelector("main p");
    var url = "";
    try {
      url = canonicalNode && canonicalNode.href ? canonicalNode.href : window.location.href;
    } catch (_error) {
      url = window.location.href;
    }
    var title = "";
    if (metaTitleNode && metaTitleNode.content) {
      title = String(metaTitleNode.content);
    } else if (h1 && h1.textContent) {
      title = h1.textContent;
    } else {
      title = document.title || "";
    }
    title = String(title || "")
      .replace(/\s+\|\s+Chronohaze\s*$/i, "")
      .trim();

    var description = "";
    if (metaDescNode && metaDescNode.content) {
      description = String(metaDescNode.content).trim();
    } else if (firstPara && firstPara.textContent) {
      description = String(firstPara.textContent).replace(/\s+/g, " ").trim();
    }

    if (description.length > 140) {
      description = description.slice(0, 137).replace(/\s+\S*$/, "") + "…";
    }

    var image = "";
    if (metaImageNode && metaImageNode.content) {
      image = String(metaImageNode.content).trim();
    }

    var text = [title, description, url]
      .filter(function (item, idx) {
        if (!item) {
          return false;
        }
        if (idx === 1 && item === title) {
          return false;
        }
        return true;
      })
      .join("\n");

    return {
      url: url,
      title: title,
      description: description,
      image: image,
      text: text,
      titleLinkText: [title, url].filter(Boolean).join("\n"),
    };
  }

  function getSharePanelDict() {
    return getSecondaryPageDictionary(detectPreferredLanguage());
  }

  function renderSharePanelLanguage(root) {
    if (!root) {
      return;
    }
    var dict = getSharePanelDict();
    var payload = buildPageSharePayload();
    root.querySelectorAll("[data-share-i18n]").forEach(function (node) {
      var key = node.getAttribute("data-share-i18n");
      if (!key || !(key in dict)) {
        return;
      }
      node.textContent = dict[key];
    });
    root.querySelectorAll("[data-share-title]").forEach(function (node) {
      var mode = node.getAttribute("data-share-title");
      if (mode === "page-title") {
        node.textContent = payload.title || document.title || "Chronohaze";
      }
    });

    bridgeMobileShareWithFloatingLogo();
    return { dict: dict, payload: payload };
  }

  function isMobileShareDockMode() {
    if (!window.matchMedia) {
      return false;
    }
    return (
      window.matchMedia("(max-width: 900px)").matches ||
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    );
  }

  function bridgeMobileShareWithFloatingLogo() {
    var shell = document.querySelector(".site-share-shell");
    var launcher = shell ? shell.querySelector(".site-share-fab") : null;
    var logo = document.querySelector(".floating-site-logo");

    if (!shell || !launcher || !logo) {
      return;
    }

    if (!isMobileShareDockMode()) {
      shell.removeAttribute("data-mobile-share-via-logo");
      logo.classList.remove("is-share-trigger", "is-share-open");
      logo.removeAttribute("role");
      logo.removeAttribute("tabindex");
      logo.removeAttribute("aria-label");
      logo.setAttribute("aria-hidden", "true");
      return;
    }

    shell.setAttribute("data-mobile-share-via-logo", "1");
    logo.classList.add("is-share-trigger");
    logo.removeAttribute("aria-hidden");
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");

    var dict = getSharePanelDict();
    logo.setAttribute("aria-label", (dict && dict.shareButton) || "Share");

    function syncOpenState() {
      logo.classList.toggle("is-share-open", shell.getAttribute("data-open") === "1");
    }

    syncOpenState();

    if (logo.dataset.shareLauncherBound !== "1") {
      logo.dataset.shareLauncherBound = "1";
      bindResponsivePress(logo, function (event) {
        if (shell.getAttribute("data-mobile-share-via-logo") !== "1") {
          return;
        }
        event.preventDefault();
        launcher.click();
      });
      logo.addEventListener("keydown", function (event) {
        if (shell.getAttribute("data-mobile-share-via-logo") !== "1") {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          launcher.click();
        }
      });
    }

    if (shell.dataset.shareLogoObserverBound !== "1" && window.MutationObserver) {
      shell.dataset.shareLogoObserverBound = "1";
      var observer = new MutationObserver(syncOpenState);
      observer.observe(shell, { attributes: true, attributeFilter: ["data-open"] });
    }
  }

  function ensureSiteSharePanel() {
    if (!document.body) {
      return;
    }
    if (document.querySelector(".site-share-shell")) {
      renderSharePanelLanguage(document.querySelector(".site-share-shell"));
      return;
    }

    var shell = document.createElement("div");
    shell.className = "site-share-shell";
    shell.setAttribute("data-open", "0");

    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "site-share-fab";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.innerHTML =
      '<span class="site-share-fab-icon" aria-hidden="true">↗</span><span class="site-share-fab-label" data-share-i18n="shareButton">Share</span>';

    var panel = document.createElement("section");
    panel.className = "site-share-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("hidden", "");
    panel.innerHTML = [
      '<div class="site-share-panel-head">',
      '  <div class="site-share-panel-title-wrap">',
      '    <p class="site-share-panel-overline" data-share-i18n="sharePanelTitle">Share</p>',
      '    <h3 class="site-share-panel-title" data-share-title="page-title">Chronohaze</h3>',
      "  </div>",
      '  <button type="button" class="site-share-close" data-share-action="close" data-share-i18n="shareClose">Close</button>',
      "</div>",
      '<p class="site-share-panel-hint" data-share-i18n="sharePanelHint">Choose a platform to share this page.</p>',
      '<div class="site-share-panel-actions">',
      '  <button type="button" class="site-share-action" data-share-action="qq" data-share-i18n="shareQQ">QQ</button>',
      '  <button type="button" class="site-share-action" data-share-action="wechat" data-share-i18n="shareWeChat">WeChat</button>',
      '  <button type="button" class="site-share-action" data-share-action="moments" data-share-i18n="shareMoments">Moments</button>',
      '  <button type="button" class="site-share-action" data-share-action="weibo" data-share-i18n="shareWeibo">Weibo</button>',
      '  <button type="button" class="site-share-action" data-share-action="instagram" data-share-i18n="shareInstagram">Instagram</button>',
      '  <button type="button" class="site-share-action" data-share-action="copy-link" data-share-i18n="shareCopyLink">Copy link</button>',
      "</div>",
      '<p class="site-share-status" aria-live="polite"></p>',
    ].join("");

    shell.appendChild(launcher);
    shell.appendChild(panel);
    document.body.appendChild(shell);

    var statusNode = panel.querySelector(".site-share-status");

    function setOpen(nextOpen) {
      var isOpen = !!nextOpen;
      shell.setAttribute("data-open", isOpen ? "1" : "0");
      launcher.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        panel.removeAttribute("hidden");
        renderSharePanelLanguage(shell);
      } else {
        panel.setAttribute("hidden", "");
        if (statusNode) {
          statusNode.textContent = "";
        }
      }
    }

    function setStatus(message) {
      if (statusNode) {
        statusNode.textContent = message || "";
      }
    }

    function openSharePopup(url) {
      if (!url) {
        return false;
      }
      var popup = null;
      try {
        popup = window.open(url, "_blank", "noopener,noreferrer,width=720,height=620");
      } catch (_error) {
        popup = null;
      }
      return !!popup;
    }

    function tryNativeShare(payload, dict) {
      if (!(navigator && typeof navigator.share === "function")) {
        return Promise.resolve(false);
      }
      return navigator
        .share({
          title: payload.title || document.title || "Chronohaze",
          text: payload.description || payload.title || "",
          url: payload.url || window.location.href,
        })
        .then(function () {
          setStatus(dict.shareOpened || "");
          trackAnalyticsEvent("share_native", { page_path: window.location.pathname || "" });
          return true;
        })
        .catch(function () {
          return false;
        });
    }

    function handleShareAction(button) {
      if (!button) {
        return;
      }
      var action = button.getAttribute("data-share-action");
      var localized = renderSharePanelLanguage(shell) || {};
      var dict = localized.dict || getSharePanelDict();
      var payload = localized.payload || buildPageSharePayload();

      if (action === "close") {
        setOpen(false);
        return;
      }

      if (action === "qq") {
        var qqUrl =
          "https://connect.qq.com/widget/shareqq/index.html?url=" +
          encodeURIComponent(payload.url || window.location.href) +
          "&title=" +
          encodeURIComponent(payload.title || document.title || "Chronohaze") +
          "&summary=" +
          encodeURIComponent(payload.description || "") +
          "&pics=" +
          encodeURIComponent(payload.image || "");
        var qqOpened = openSharePopup(qqUrl);
        setStatus(qqOpened ? dict.shareOpened : dict.sharePopupBlocked);
        if (qqOpened) {
          trackAnalyticsEvent("share_open", {
            page_path: window.location.pathname || "",
            share_action: "qq",
          });
        }
        return;
      }

      if (action === "weibo") {
        var weiboUrl =
          "https://service.weibo.com/share/share.php?url=" +
          encodeURIComponent(payload.url || window.location.href) +
          "&title=" +
          encodeURIComponent(payload.titleLinkText || payload.url || window.location.href) +
          "&pic=" +
          encodeURIComponent(payload.image || "");
        var weiboOpened = openSharePopup(weiboUrl);
        setStatus(weiboOpened ? dict.shareOpened : dict.sharePopupBlocked);
        if (weiboOpened) {
          trackAnalyticsEvent("share_open", {
            page_path: window.location.pathname || "",
            share_action: "weibo",
          });
        }
        return;
      }

      if (action === "wechat" || action === "moments" || action === "instagram") {
        tryNativeShare(payload, dict).then(function (nativeDone) {
          if (nativeDone) {
            return;
          }
          var textToCopy = action === "instagram" ? payload.titleLinkText : payload.url;
          copyTextToClipboard(textToCopy).then(function (ok) {
            if (!ok) {
              setStatus(dict.shareCopyFailed || "");
              return;
            }
            if (action === "wechat") {
              setStatus(dict.shareWechatCopied || dict.shareCopied || "");
            } else if (action === "moments") {
              setStatus(dict.shareMomentsCopied || dict.shareCopied || "");
            } else {
              setStatus(dict.shareInstagramCopied || dict.shareCopied || "");
            }
            trackAnalyticsEvent("share_copy", {
              page_path: window.location.pathname || "",
              share_action: action,
            });
          });
        });
        return;
      }

      if (action === "copy-link") {
        copyTextToClipboard(payload.url || window.location.href).then(function (ok) {
          setStatus(ok ? dict.shareCopied : dict.shareCopyFailed);
          if (ok) {
            trackAnalyticsEvent("share_copy", {
              page_path: window.location.pathname || "",
              share_action: action,
            });
          }
        });
        return;
      }

      if (action === "copy-title-link" || action === "copy-text" || action === "native") {
        var fallbackText =
          action === "copy-title-link"
            ? payload.titleLinkText
            : action === "copy-text"
              ? payload.text
              : payload.url || window.location.href;
        copyTextToClipboard(fallbackText).then(function (ok) {
          setStatus(ok ? dict.shareCopied : dict.shareCopyFailed);
          if (ok) {
            trackAnalyticsEvent("share_copy", {
              page_path: window.location.pathname || "",
              share_action: action,
            });
          }
        });
        return;
      }

      copyTextToClipboard(payload.url || window.location.href).then(function (ok) {
        setStatus(ok ? dict.shareCopied : dict.shareCopyFailed);
        if (ok) {
          trackAnalyticsEvent("share_copy", {
            page_path: window.location.pathname || "",
            share_action: action,
          });
        }
      });
    }

    bindResponsivePress(launcher, function () {
      var next = shell.getAttribute("data-open") !== "1";
      setOpen(next);
      trackAnalyticsEvent("share_panel_toggle", {
        page_path: window.location.pathname || "",
        opened: next ? 1 : 0,
      });
    });

    Array.from(panel.querySelectorAll("[data-share-action]")).forEach(function (button) {
      bindResponsivePress(button, function (event) {
        if (event && typeof event.stopPropagation === "function") {
          event.stopPropagation();
        }
        handleShareAction(button);
      });
    });

    document.addEventListener("click", function (event) {
      if (shell.getAttribute("data-open") !== "1") {
        return;
      }
      var target = event.target;
      if (target && typeof target.closest === "function" && target.closest(".site-share-shell")) {
        return;
      }
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && shell.getAttribute("data-open") === "1") {
        setOpen(false);
      }
    });

    renderSharePanelLanguage(shell);
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
  var DEFAULT_MUSIC_TRACK_ROUTES = [
    "music/track-orchid.html",
    "music/track-01.html",
    "music/track-02.html",
    "music/track-03.html",
    "music/track-felix.html",
    "music/track-04.html",
    "music/track-05.html",
    "music/track-06.html",
    "music/track-07.html",
    "music/track-08.html",
    "music/track-09.html",
    "music/track-10.html",
    "music/track-11.html",
    "music/track-12.html",
    "music/track-13.html",
    "music/track-14.html",
    "music/track-15.html",
    "music/track-16.html",
    "music/track-17.html",
    "music/track-negau.html",
    "music/track-seaside-town.html",
    "music/track-18.html",
    "music/track-19.html",
    "music/track-20.html",
    "music/track-21.html",
    "music/track-22.html",
    "music/track-23.html",
    "music/track-24.html",
    "music/track-25.html",
    "music/track-26.html",
    "music/track-27.html",
    "music/track-28.html",
    "music/track-29.html",
    "music/track-30.html",
  ];
  var musicTrackRoutes = DEFAULT_MUSIC_TRACK_ROUTES.slice();

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

  function currentMusicTrackRoute() {
    return normalizeMusicDetailPath(window.location.href || window.location.pathname || "");
  }

  function getMusicTrackRoutes() {
    return Array.isArray(musicTrackRoutes) && musicTrackRoutes.length
      ? musicTrackRoutes.slice()
      : DEFAULT_MUSIC_TRACK_ROUTES.slice();
  }

  function updateMusicTrackRoutesFromCatalog(items) {
    if (!Array.isArray(items) || !items.length) {
      return;
    }

    var nextRoutes = [];
    items.forEach(function (item) {
      if (!item || typeof item !== "object") {
        return;
      }
      if (String(item.type || "").toLowerCase() === "album") {
        return;
      }
      var route = normalizeMusicDetailPath(item.url || "");
      if (!/^music\/track-[^/]+\.html$/i.test(route)) {
        return;
      }
      if (nextRoutes.indexOf(route) !== -1) {
        return;
      }
      nextRoutes.push(route);
    });

    if (nextRoutes.length) {
      musicTrackRoutes = nextRoutes;
      MUSIC_TRACK_TOTAL = nextRoutes.length;
    }
  }

  function buildTrackNavigationData() {
    var currentRoute = currentMusicTrackRoute();
    if (!currentRoute) {
      return { currentRoute: "", prevRoute: "", nextRoute: "" };
    }

    var routes = getMusicTrackRoutes();
    var index = routes.indexOf(currentRoute);
    if (index === -1) {
      return { currentRoute: currentRoute, prevRoute: "", nextRoute: "" };
    }

    return {
      currentRoute: currentRoute,
      prevRoute: index > 0 ? routes[index - 1] : "",
      nextRoute: index < routes.length - 1 ? routes[index + 1] : "",
    };
  }

  function toMusicDetailPageHref(route) {
    var normalized = normalizeMusicDetailPath(route || "");
    if (!normalized) {
      return "";
    }
    return normalized.replace(/^music\//i, "");
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
    var staffMetaNode = metas.length > 1 ? metas[1] : null;
    var staffHtml = staffMetaNode ? staffMetaNode.innerHTML || "" : "";
    var staffText = staffHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\u00a0/g, " ");
    var staffLines = staffText
      .split(/\n+/)
      .map(function (line) {
        return line.replace(/\s+/g, " ").trim();
      })
      .filter(Boolean);
    var primaryCreditLine = staffLines.find(function (line) {
      return /[：:]/.test(line);
    }) || "";

    var byline = primaryCreditLine.match(/[：:]\s*([A-Za-z][A-Za-z0-9_.\-\/&() ]*)$/);
    if (byline && byline[1]) {
      return byline[1].trim().toUpperCase();
    }

    var staffMeta = staffMetaNode ? staffMetaNode.textContent || "" : "";
    staffText = staffMeta.replace(/\s+/g, " ").trim();

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
    var titleTextOverridesEn = getMusicInlineTitleOverridesEn();
    if (detectPreferredLanguage() === "en" && titleTextOverridesEn[title]) {
      title = titleTextOverridesEn[title];
    }
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
        navAcademic: "学术",
        navMath: "数学",
        navPhoto: "摄影",
        navMusic: "音乐",
        navProjects: "项目",
        navResearch: "研究",
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
        searchLoading: "准备搜索…",
        searchLoadingProgress: "正在准备搜索（{done}/{total}）…",
        searchLoadError: "暂时无法加载搜索结果。",
        searchFallbackNotice: "已切换到兜底列表",
        searchFallbackText: "搜索暂时不可用时，也可以先从这些入口继续浏览：",
        searchFallbackModeLabel: "已切换到快捷入口与站外搜索",
        searchFallbackRedirecting: "正在切换到站外搜索…",
        searchFallbackMath: "浏览数学",
        searchFallbackPhoto: "浏览摄影",
        searchFallbackMusic: "浏览音乐",
        searchFallbackCV: "浏览 CV",
        searchFallbackExternal: "站外搜索（site:chronohaze.space）",
        searchResultZero: "暂无匹配结果。",
        searchResultCount: "共 {count} 条结果",
        searchShortcutHint: "/ 或 Ctrl/Cmd+K 聚焦 · ↑↓ 选择结果 · Enter 打开",
        siteNotes: "网站说明",
        a11y: "无障碍支持",
        footerContactLead: "辗转不同国家无固定号码 请联系邮箱：",
        footerCities: "重庆 · Edinburgh · Ithaca",
        musicPageTitle: "音乐 / Listening Room",
        musicIntro:
          "音乐是我最早开始、也是持续时间最长的创作表达方式。我写作、编曲、演奏并制作自己的作品，将旋律、低频结构、节奏骨架与蓝灰色的情绪意象共同编织成声音。",
        musicLead: "",
        musicFeaturedAlbumTitle: "Featured Works",
        musicFeaturedAlbumLead: "",
        musicSelectedTitle: "Selected Tracks",
        musicSelectedLead: "",
        musicProductionTitle: "Production Notes",
        musicProductionLead: "",
        musicProductionParagraph:
          "大多数作品都由我独立完成，从写作、编曲到贝斯、吉他、主唱修整、编程与混音。对我而言，制作本身就是作曲的一部分：吉他音色、低频设计、节奏密度与空间感，都会被直接写进歌曲的情绪结构里。",
        musicArchiveTitle: "Archive / Discography",
        musicArchiveLead: "",
        musicArchiveCollectionTitle: "Collections",
        musicArchiveTrackTitle: "Archive by Year",
        musicArchiveFilterStyle: "曲风",
        musicArchiveFilterAllStyles: "全部曲风",
        musicStatusListen: "试听",
        musicStatusNotes: "手记",
        musicStatusUnreleased: "未完成",
        musicStatusWip: "重制中",
        musicWorldParagraphOne: "",
        musicWorldParagraphTwo: "",
        musicWorldMotifs: [],
        musicSectionFeaturedTitle: "Featured（精选）",
        musicSectionFeaturedLead: "专辑主线与代表作入口",
        musicFeatureAlbumLabel: "精选专辑",
        musicFeatureTrackLabel: "代表作",
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
        musicYearUnknown: "未标注年份",
        statusAvailable: "已上线",
        statusComingSoon: "待上线",
        statusDraft: "草稿",
        musicStatusPendingAudio: "待上传音频",
        pageLastUpdated: "最近更新",
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
        musicLongIntroParagraphs: [
          "音乐是我最早开始也是持续时间最长的创作表达方式。",
          "我从小学习钢琴，建立了最初的听觉与和声基础，随后接触尤克里里，并在12岁开始学习小提琴。弦乐训练让我逐渐理解旋律线条与复调结构，也正是在14岁时我开始尝试基于系统学习的乐理进行原创作曲。随后我以 Distinction 完成了英皇乐理全部等级考试，这段训练也成为我后来持续写作与编曲的重要基础。",
          "15岁起我开始独立进行自学编曲创作，将旋律发展为完整作品。16岁自学贝斯，开始深入理解低频结构与节奏骨架，17岁自学电吉他，使我能够从整体编制角度设计作品的声部关系与音色层次。",
          "19岁开始自学混音与制作，逐渐从所谓写歌的人转变为能够完成完整音乐制作流程的创作者（即使有着许多不完美）。",
          "在此过程中我也参与过多次合作项目：包括受邀参与专辑制作、为他人作品创作与录制贝斯声部等。对我而言音乐不仅是个人表达，也是与他人共同建构声音世界的过程。",
          "我的个人创作往往围绕一些持续出现的意象展开。夏日的雨季、夜晚、潮湿空气中的光、以及白色夜开花植物。",
          "这些元素逐渐构成了我作品中的情绪母题。关于时间的缓慢流动、在寂静中生长的张力、以及未言明的一切。",
        ],
        mathPageTitle: "数学文章",
        mathIntro: "研究记录、实验笔记与结构化的思考。",
        photoPageTitle: "摄影 / Selected Works",
        photoIntro: "城市、窗、花与模糊的光，是镜头量出的距离碎片。",
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
        playerPlayAria: "播放曲目",
        playerPauseAria: "暂停曲目",
        playerProgressAria: "曲目播放进度",
        shareButton: "分享",
        sharePanelTitle: "分享",
        sharePanelHint: "选择平台（链接会自动带封面与标题）",
        shareQQ: "QQ",
        shareWeChat: "微信",
        shareMoments: "朋友圈",
        shareWeibo: "微博",
        shareInstagram: "Instagram",
        shareCopyLink: "复制链接",
        shareClose: "关闭",
        shareCopied: "已复制",
        shareOpened: "已打开分享窗口",
        sharePopupBlocked: "浏览器拦截了弹窗，请允许弹窗后重试",
        shareWechatCopied: "已复制链接，请到微信粘贴分享",
        shareMomentsCopied: "已复制链接，请到朋友圈粘贴发布",
        shareInstagramCopied: "已复制标题与链接，请粘贴到 Instagram",
        shareCopyFailed: "复制失败，请手动复制",
        emailCopyHint: "点击复制邮箱地址",
        emailCopiedEmail: "邮箱已复制",
        emailCopyFailed: "复制失败，请手动复制",
      },
      en: {
        htmlLang: "en",
        navAria: "Main navigation",
        navHome: "Main",
        navAcademic: "Academic",
        navMath: "Mathematics",
        navPhoto: "Photography",
        navMusic: "Music",
        navProjects: "Projects",
        navResearch: "Research",
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
        searchLoading: "Preparing search…",
        searchLoadingProgress: "Preparing search ({done}/{total})…",
        searchLoadError: "Search is temporarily unavailable.",
        searchFallbackNotice: "Fallback list enabled",
        searchFallbackText: "If search is temporarily unavailable, you can keep browsing from these entry points:",
        searchFallbackModeLabel: "Using shortcuts and external site search",
        searchFallbackRedirecting: "Redirecting to external site search…",
        searchFallbackMath: "Browse math",
        searchFallbackPhoto: "Browse photography",
        searchFallbackMusic: "Browse music",
        searchFallbackCV: "Browse CV",
        searchFallbackExternal: "External search (site:chronohaze.space)",
        searchResultZero: "No matching results.",
        searchResultCount: "{count} results",
        searchShortcutHint: "/ or Ctrl/Cmd+K to focus · ↑↓ select · Enter open",
        siteNotes: "Privacy Policy",
        a11y: "Accessibility",
        footerContactLead:
          "No fixed phone number while moving across countries. Contact by email:",
        footerCities: "Chongqing · Edinburgh · Ithaca",
        musicPageTitle: "Music / Listening Room",
        musicIntro:
          "Songs built from low-end weight, fragile melodies, progressive structures, and blue-grey memories.",
        musicLead: "",
        musicFeaturedAlbumTitle: "Featured Works",
        musicFeaturedAlbumLead: "",
        musicSelectedTitle: "Selected Tracks",
        musicSelectedLead: "",
        musicProductionTitle: "Production Notes",
        musicProductionLead: "",
        musicProductionParagraph:
          "Most tracks are self-produced, from songwriting and arrangement to bass, guitar, vocal editing, programming, and mixing. I treat production as part of composition: guitar tones, low-end design, rhythm density, and space are written into the emotional structure of the song.",
        musicArchiveTitle: "Archive / Discography",
        musicArchiveLead: "",
        musicArchiveCollectionTitle: "Collections",
        musicArchiveTrackTitle: "Archive by Year",
        musicArchiveFilterStyle: "Style",
        musicArchiveFilterAllStyles: "All styles",
        musicStatusListen: "Listen",
        musicStatusNotes: "Notes",
        musicStatusUnreleased: "Unreleased",
        musicStatusWip: "WIP",
        musicWorldParagraphOne: "",
        musicWorldParagraphTwo: "",
        musicWorldMotifs: [],
        musicSectionFeaturedTitle: "Featured",
        musicSectionFeaturedLead: "Album core and representative tracks",
        musicFeatureAlbumLabel: "Featured album",
        musicFeatureTrackLabel: "Featured track",
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
        musicYearUnknown: "Unspecified year",
        statusAvailable: "Available",
        statusComingSoon: "Coming soon",
        statusDraft: "Draft",
        musicStatusPendingAudio: "Audio pending",
        pageLastUpdated: "Last updated",
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
        photoPageTitle: "Photography / Selected Works",
        photoIntro:
          "Cities, windows, flowers, and blurred light — fragments of distance measured through a lens.",
        photoLongIntroParagraphs: [
          "These photographs are not meant to document places exactly. They are small attempts to keep the feeling of passing through them: the colour of a day, the shape of a window, and the quiet pressure of light.",
        ],
        readMore: "Read More",
        backToMusic: "Back to music",
        backToPhoto: "Back to photography",
        backToMath: "Back to mathematics",
        photoPrevGroup: "Prev",
        photoBackToArchive: "Back",
        photoNextGroup: "Next",
        detailBack: "< Back",
        creationLabel: "Creation period:",
        workIntroHeading: "About the work",
        lyricsHeading: "Lyrics",
        lyricsPart1: "Lyrics (Part 1)",
        lyricsPart2: "Lyrics (Part 2)",
        playerPrev: "Previous",
        playerNext: "Next",
        playerPlayAria: "Play track",
        playerPauseAria: "Pause track",
        playerProgressAria: "Track playback position",
        shareButton: "Share",
        sharePanelTitle: "Share",
        sharePanelHint: "Choose a platform (link keeps preview card metadata).",
        shareQQ: "QQ",
        shareWeChat: "WeChat",
        shareMoments: "Moments",
        shareWeibo: "Weibo",
        shareInstagram: "Instagram",
        shareCopyLink: "Copy link",
        shareClose: "Close",
        shareCopied: "Copied",
        shareOpened: "Share window opened",
        sharePopupBlocked: "Popup was blocked. Please allow popups and retry.",
        shareWechatCopied: "Link copied. Paste it in WeChat to share.",
        shareMomentsCopied: "Link copied. Paste it in Moments to publish.",
        shareInstagramCopied: "Title + link copied. Paste into Instagram.",
        shareCopyFailed: "Copy failed. Please copy manually.",
        emailCopyHint: "Click to copy email address",
        emailCopiedEmail: "Email copied",
        emailCopyFailed: "Copy failed. Please copy manually.",
      },
    }[safeLang];
  }

  function createMusicDetailNavNode(text, route, direction) {
    var href = toMusicDetailPageHref(route);
    var node = href ? document.createElement("a") : document.createElement("span");
    node.className = "music-detail-page-nav-link";
    node.setAttribute("data-track-nav-dir", direction);
    node.textContent = text;
    if (href) {
      node.href = href;
    } else {
      node.classList.add("is-disabled");
    }
    return node;
  }

  function buildMusicDetailPageNavigation(dict, options) {
    var navData = buildTrackNavigationData();
    var nav = document.createElement("nav");
    nav.className = "music-detail-page-nav";
    nav.setAttribute(
      "aria-label",
      detectPreferredLanguage() === "en" ? "Track navigation" : "曲目导航"
    );

    var backHref =
      options && options.backHref ? options.backHref : "../music.html";
    var backLabel =
      options && options.backLabel ? options.backLabel : dict.backToMusic;
    var backNode = document.createElement("a");
    backNode.className = "music-detail-page-nav-link is-back";
    backNode.setAttribute("data-track-nav-dir", "back");
    backNode.href = backHref;
    backNode.textContent = backLabel;

    nav.appendChild(createMusicDetailNavNode(dict.playerPrev, navData.prevRoute, "prev"));
    nav.appendChild(backNode);
    nav.appendChild(createMusicDetailNavNode(dict.playerNext, navData.nextRoute, "next"));
    return nav;
  }

  function ensureMusicDetailPageNavigation(dict) {
    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article || article.querySelector(".music-detail-page-nav")) {
      return;
    }

    var existingBackLink = article.querySelector("a.read-more[href]");
    var backHref = existingBackLink
      ? existingBackLink.getAttribute("href") || "../music.html"
      : "../music.html";
    var backLabel = existingBackLink
      ? (existingBackLink.textContent || "").trim() || dict.backToMusic
      : dict.backToMusic;
    var nav = buildMusicDetailPageNavigation(dict, {
      backHref: backHref,
      backLabel: backLabel,
    });

    if (existingBackLink) {
      var host = existingBackLink.closest("p") || existingBackLink;
      host.insertAdjacentElement("beforebegin", nav);
      host.remove();
      return;
    }

    article.appendChild(nav);
  }

  window.ChronohazeShared = window.ChronohazeShared || {};

  var persistentAudioController =
    window.ChronohazeShared.persistentAudioController || null;
  var persistentAudioSnapshotKey = "chronohaze:persistent-audio:v1";
  var pendingPersistentTrackHref = "";

  function isHomePageSwapPath(pathname) {
    var path = String(pathname || "").toLowerCase();
    return (
      path === "/" ||
      path === "/chronohaze" ||
      path === "/chronohaze/" ||
      /(?:^|\/)index\.html$/.test(path)
    );
  }

  function isChronohazeSwappablePath(pathname) {
    return isHomePageSwapPath(pathname) || isSecondaryPageSwapPath(pathname);
  }

  function pauseCompetingAudio(exceptNode) {
    Array.from(document.querySelectorAll("audio")).forEach(function (node) {
      if (!node || node === exceptNode) {
        return;
      }
      try {
        node.pause();
      } catch (_err) {}
    });
  }

  function neutralizeInlineMusicAudio(audioElement) {
    if (!audioElement || audioElement.dataset.persistentAudioProxy === "1") {
      return;
    }

    audioElement.dataset.persistentAudioProxy = "1";
    audioElement.removeAttribute("autoplay");
    audioElement.autoplay = false;
    audioElement.defaultMuted = true;
    audioElement.muted = true;
    audioElement.volume = 0;
    audioElement.tabIndex = -1;
    audioElement.setAttribute("aria-hidden", "true");
    try {
      audioElement.pause();
    } catch (_err) {}
  }

  function resolveAudioSource(audioElement) {
    if (!audioElement) {
      return "";
    }

    var src = (audioElement.getAttribute("src") || "").trim();
    if (!src) {
      var sourceNode = audioElement.querySelector("source[src]");
      src = sourceNode ? (sourceNode.getAttribute("src") || "").trim() : "";
    }
    if (!src) {
      return "";
    }

    try {
      return new URL(src, window.location.href).href;
    } catch (_err) {
      return src;
    }
  }

  function getCurrentTrackNavigation() {
    var navData = buildTrackNavigationData();
    return {
      prevHref: navData.prevRoute || "",
      nextHref: navData.nextRoute || "",
    };
  }

  function getChronohazeRootPath() {
    var path = String(window.location.pathname || "/");
    var match = path.match(/^(.*?\/chronohaze\/)/i);
    if (match && match[1]) {
      return match[1];
    }
    if (/\/chronohaze$/i.test(path)) {
      return path + "/";
    }
    return "/";
  }

  function toChronohazeAbsoluteUrl(pathOrHref) {
    if (typeof pathOrHref !== "string" || !pathOrHref.trim()) {
      return "";
    }

    var raw = pathOrHref.trim();
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    try {
      return new URL(getChronohazeRootPath() + raw.replace(/^\//, ""), window.location.origin).href;
    } catch (_err) {
      return raw;
    }
  }

  function getPersistentAudioLabels() {
    var lang = detectPreferredLanguage();
    return lang === "en"
      ? {
          kicker: "Now playing",
          peek: "AUDIO",
          collapse: "Hide",
          open: "Open track",
          close: "Stop",
          prev: "Prev",
          next: "Next",
          expandAria: "Expand mini player",
          collapseAria: "Collapse mini player",
        }
      : {
          kicker: "正在播放",
          peek: "播放",
          collapse: "收起",
          open: "打开曲目",
          close: "停止",
          prev: "上一首",
          next: "下一首",
          expandAria: "展开迷你播放器",
          collapseAria: "收起迷你播放器",
        };
  }

  function isCompactMobileAudio() {
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(max-width: 820px)").matches;
    }
    return window.innerWidth <= 820;
  }

  function persistPersistentAudioSnapshot() {
    if (!persistentAudioController || !persistentAudioController.audio) {
      return;
    }

    try {
      if (!persistentAudioController.current || !persistentAudioController.current.src) {
        window.sessionStorage.removeItem(persistentAudioSnapshotKey);
        return;
      }

      window.sessionStorage.setItem(
        persistentAudioSnapshotKey,
        JSON.stringify({
          src: persistentAudioController.current.src,
          title: persistentAudioController.current.title || "",
          artist: persistentAudioController.current.artist || "",
          pageHref: persistentAudioController.current.pageHref || "",
          prevHref: persistentAudioController.current.prevHref || "",
          nextHref: persistentAudioController.current.nextHref || "",
          currentTime: Number(persistentAudioController.audio.currentTime) || 0,
          paused: !!persistentAudioController.audio.paused,
        })
      );
    } catch (_err) {}
  }

  function dispatchPersistentAudioSync() {
    if (typeof window.CustomEvent !== "function") {
      return;
    }
    document.dispatchEvent(
      new CustomEvent("chronohaze:persistent-audio-sync", {
        detail: persistentAudioController && persistentAudioController.current
          ? persistentAudioController.current
          : null,
      })
    );
  }

  function syncPersistentAudioDock() {
    if (!persistentAudioController || !persistentAudioController.audio) {
      return;
    }

    var controller = persistentAudioController;
    var body = document.body;
    var labels = getPersistentAudioLabels();
    var current = controller.current;
    var hasTrack = !!(current && current.src);
    var duration = isFinite(controller.audio.duration) ? controller.audio.duration : 0;
    var currentTime = isFinite(controller.audio.currentTime) ? controller.audio.currentTime : 0;
    var isPlaying = hasTrack && !controller.audio.paused && !controller.audio.ended;
    var compactMobile = isCompactMobileAudio();

    controller.shell.hidden = !hasTrack;
    controller.shell.classList.toggle("is-visible", hasTrack);
    controller.shell.classList.toggle("is-playing", isPlaying);
    controller.playButton.classList.toggle("is-playing", isPlaying);
    controller.playButton.setAttribute(
      "aria-label",
      isPlaying
        ? getSecondaryPageDictionary(detectPreferredLanguage()).playerPauseAria
        : getSecondaryPageDictionary(detectPreferredLanguage()).playerPlayAria
    );

    controller.kicker.textContent = labels.kicker;
    controller.peekButton.textContent = labels.peek;
    controller.peekButton.setAttribute("aria-label", labels.expandAria);
    controller.collapseButton.textContent = "−";
    controller.collapseButton.setAttribute("aria-label", labels.collapseAria);
    controller.collapseButton.setAttribute("title", labels.collapse);
    controller.title.textContent = current ? current.title || "TRACK" : "TRACK";
    controller.artist.textContent = current ? current.artist || "HAZEZZ" : "HAZEZZ";
    controller.openLink.textContent = labels.open;
    controller.openLink.href =
      current && current.pageHref ? toChronohazeAbsoluteUrl(current.pageHref) : "#";
    controller.openLink.setAttribute(
      "aria-disabled",
      current && current.pageHref ? "false" : "true"
    );

    controller.closeButton.textContent = "×";
    controller.closeButton.setAttribute("aria-label", labels.close);
    controller.closeButton.setAttribute("title", labels.close);
    controller.prevButton.textContent = labels.prev;
    controller.nextButton.textContent = labels.next;

    controller.prevButton.disabled = !(current && current.prevHref);
    controller.nextButton.disabled = !(current && current.nextHref);

    if (duration > 0) {
      var nextValue = Math.round((currentTime / duration) * 1000);
      controller.scrubber.value = String(nextValue);
      setRangeProgress(controller.scrubber, nextValue, 1000);
    } else {
      controller.scrubber.value = "0";
      setRangeProgress(controller.scrubber, 0, 1000);
    }

    controller.time.textContent =
      formatDuration(currentTime) + " / " + formatDuration(duration);

    if (!hasTrack) {
      controller.isCollapsed = false;
    } else if (typeof controller.isCollapsed !== "boolean") {
      controller.isCollapsed = !!compactMobile;
    }

    controller.shell.classList.toggle("is-collapsed", !!(hasTrack && controller.isCollapsed));
    if (hasTrack && controller.isCollapsed) {
      controller.panel.setAttribute("aria-hidden", "true");
      if ("inert" in controller.panel) {
        controller.panel.inert = true;
      }
    } else {
      controller.panel.removeAttribute("aria-hidden");
      if ("inert" in controller.panel) {
        controller.panel.inert = false;
      }
    }

    if (body) {
      body.classList.toggle(
        "mobile-audio-dock-expanded",
        !!(hasTrack && compactMobile && !controller.isCollapsed)
      );
      body.classList.toggle("persistent-audio-dock-active", !!hasTrack);
      body.classList.toggle(
        "persistent-audio-dock-expanded",
        !!(hasTrack && !controller.isCollapsed)
      );
      body.classList.toggle(
        "persistent-audio-dock-collapsed",
        !!(hasTrack && controller.isCollapsed)
      );
    }

    persistPersistentAudioSnapshot();
    dispatchPersistentAudioSync();
  }

  function clearPersistentAudio() {
    if (!persistentAudioController || !persistentAudioController.audio) {
      return;
    }
    pendingPersistentTrackHref = "";
    pauseCompetingAudio(persistentAudioController.audio);
    persistentAudioController.audio.pause();
    persistentAudioController.audio.removeAttribute("src");
    try {
      persistentAudioController.audio.load();
    } catch (_err) {}
    persistentAudioController.current = null;
    syncPersistentAudioDock();
  }

  function ensurePersistentAudioDock() {
    if (
      !persistentAudioController &&
      window.ChronohazeShared &&
      window.ChronohazeShared.persistentAudioController
    ) {
      persistentAudioController = window.ChronohazeShared.persistentAudioController;
    }

    if (
      persistentAudioController &&
      persistentAudioController.shell &&
      persistentAudioController.shell.isConnected
    ) {
      return persistentAudioController;
    }

    Array.from(document.querySelectorAll(".persistent-audio-dock")).forEach(function (node) {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });

    var shell = document.createElement("aside");
    shell.className = "persistent-audio-dock";
    shell.hidden = true;
    shell.setAttribute("aria-live", "polite");

    var peekButton = document.createElement("button");
    peekButton.type = "button";
    peekButton.className = "persistent-audio-peek";

    var panel = document.createElement("div");
    panel.className = "persistent-audio-panel";

    var kicker = document.createElement("p");
    kicker.className = "persistent-audio-kicker";

    var collapseButton = document.createElement("button");
    collapseButton.type = "button";
    collapseButton.className = "persistent-audio-collapse";

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "persistent-audio-close";

    var actions = document.createElement("div");
    actions.className = "persistent-audio-actions";
    actions.appendChild(collapseButton);
    actions.appendChild(closeButton);

    var head = document.createElement("div");
    head.className = "persistent-audio-head";
    head.appendChild(kicker);
    head.appendChild(actions);

    var title = document.createElement("p");
    title.className = "persistent-audio-title";

    var artist = document.createElement("p");
    artist.className = "persistent-audio-artist";

    var playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "music-player-play persistent-audio-play";

    var scrubber = document.createElement("input");
    scrubber.type = "range";
    scrubber.className = "music-player-scrubber persistent-audio-scrubber";
    scrubber.min = "0";
    scrubber.max = "1000";
    scrubber.step = "1";
    scrubber.value = "0";

    var time = document.createElement("p");
    time.className = "music-player-time persistent-audio-time";
    time.textContent = "00:00 / 00:00";

    var row = document.createElement("div");
    row.className = "music-player-row persistent-audio-row";
    row.appendChild(playButton);
    row.appendChild(scrubber);
    row.appendChild(time);

    var prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "persistent-audio-nav";

    var openLink = document.createElement("a");
    openLink.className = "persistent-audio-open";
    openLink.href = "#";

    var nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "persistent-audio-nav";

    var links = document.createElement("div");
    links.className = "persistent-audio-links";
    links.appendChild(prevButton);
    links.appendChild(openLink);
    links.appendChild(nextButton);

    var audio = document.createElement("audio");
    audio.preload = "none";
    audio.setAttribute("playsinline", "");
    audio.className = "persistent-audio-element";

    panel.appendChild(head);
    panel.appendChild(title);
    panel.appendChild(artist);
    panel.appendChild(row);
    panel.appendChild(links);
    shell.appendChild(peekButton);
    shell.appendChild(panel);
    shell.appendChild(audio);
    document.body.appendChild(shell);

    persistentAudioController = {
      shell: shell,
      panel: panel,
      kicker: kicker,
      peekButton: peekButton,
      collapseButton: collapseButton,
      title: title,
      artist: artist,
      playButton: playButton,
      scrubber: scrubber,
      time: time,
      openLink: openLink,
      prevButton: prevButton,
      nextButton: nextButton,
      closeButton: closeButton,
      audio: audio,
      current: null,
      isCollapsed: isCompactMobileAudio(),
    };

    window.ChronohazeShared.persistentAudioController = persistentAudioController;

    bindResponsivePress(peekButton, function () {
      if (!persistentAudioController.current || !persistentAudioController.current.src) {
        return;
      }
      persistentAudioController.isCollapsed = false;
      syncPersistentAudioDock();
    });

    bindResponsivePress(collapseButton, function () {
      persistentAudioController.isCollapsed = true;
      syncPersistentAudioDock();
    });

    bindResponsivePress(playButton, function () {
      if (!persistentAudioController.current || !persistentAudioController.current.src) {
        return;
      }
      if (audio.paused || audio.ended) {
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {
            syncPersistentAudioDock();
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
      audio.currentTime = (Number(scrubber.value) / 1000) * audio.duration;
      syncPersistentAudioDock();
    });

    scrubber.addEventListener("change", function () {
      syncPersistentAudioDock();
    });

    bindResponsivePress(closeButton, function () {
      clearPersistentAudio();
    });

    function navigateAdjacentTrack(direction) {
      if (!persistentAudioController.current) {
        return;
      }
      var href =
        direction === "prev"
          ? persistentAudioController.current.prevHref
          : persistentAudioController.current.nextHref;
      if (!href) {
        return;
      }
      pendingPersistentTrackHref = href;
      if (
        window.ChronohazeShared &&
        typeof window.ChronohazeShared.navigateWithPageSwap === "function"
      ) {
        var nextHref = toChronohazeAbsoluteUrl(href);
        window.ChronohazeShared.navigateWithPageSwap(nextHref, {
          autoplayTrackOnArrival: nextHref,
        });
        return;
      }
      window.location.href = toChronohazeAbsoluteUrl(href);
    }

    bindResponsivePress(prevButton, function () {
      navigateAdjacentTrack("prev");
    });

    bindResponsivePress(nextButton, function () {
      navigateAdjacentTrack("next");
    });

    ["play", "pause", "timeupdate", "loadedmetadata", "durationchange", "ended"].forEach(
      function (eventName) {
        audio.addEventListener(eventName, syncPersistentAudioDock);
      }
    );

    audio.addEventListener("play", function () {
      pauseCompetingAudio(audio);
    });

    audio.addEventListener("error", syncPersistentAudioDock);
    window.addEventListener("pagehide", persistPersistentAudioSnapshot);
    window.addEventListener("resize", syncPersistentAudioDock);

    document.addEventListener(
      "click",
      function (event) {
        var target = event && event.target;
        if (!target || typeof target.closest !== "function") {
          return;
        }
        if (target.closest(".lang-btn, .floating-lang-btn, .cv-lang-tab, [data-page-lang-tab], [data-cv-lang-tab]")) {
          window.setTimeout(syncPersistentAudioDock, 12);
        }
      },
      true
    );

    try {
      var raw = window.sessionStorage.getItem(persistentAudioSnapshotKey);
      if (raw) {
        var snapshot = JSON.parse(raw);
        if (snapshot && snapshot.src) {
          persistentAudioController.current = {
            src: String(snapshot.src || ""),
            title: String(snapshot.title || "TRACK"),
            artist: String(snapshot.artist || "HAZEZZ"),
            pageHref: String(snapshot.pageHref || ""),
            prevHref: String(snapshot.prevHref || ""),
            nextHref: String(snapshot.nextHref || ""),
          };
          audio.src = persistentAudioController.current.src;
          audio.preload = "metadata";
          try {
            audio.currentTime = Math.max(0, Number(snapshot.currentTime) || 0);
          } catch (_err) {}
        }
      }
    } catch (_err) {}

    syncPersistentAudioDock();
    return persistentAudioController;
  }

  function loadPersistentTrack(track, options) {
    var controller = ensurePersistentAudioDock();
    var nextTrack = track || {};
    var shouldAutoplay = !options || options.autoplay !== false;
    var nextSrc = String(nextTrack.src || "");
    if (!nextSrc) {
      return controller;
    }

    pauseCompetingAudio(controller.audio);

    var isSameTrack =
      controller.current && controller.current.src && controller.current.src === nextSrc;

    controller.current = {
      src: nextSrc,
      title: String(nextTrack.title || "TRACK"),
      artist: String(nextTrack.artist || "HAZEZZ"),
      pageHref: String(nextTrack.pageHref || ""),
      prevHref: String(nextTrack.prevHref || ""),
      nextHref: String(nextTrack.nextHref || ""),
    };

    if (!isSameTrack) {
      controller.audio.src = nextSrc;
      controller.audio.preload = "auto";
      try {
        controller.audio.load();
      } catch (_err) {}
    }

    if (typeof options === "object" && isFinite(options.currentTime) && options.currentTime > 0) {
      try {
        controller.audio.currentTime = Number(options.currentTime);
      } catch (_err2) {}
    }

    syncPersistentAudioDock();

    if (shouldAutoplay) {
      var playPromise = controller.audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          syncPersistentAudioDock();
        });
      }
    }

    return controller;
  }

  function buildTrackNavigationDataForRoute(route) {
    var currentRoute = normalizeMusicDetailPath(route || "");
    if (!currentRoute) {
      return { currentRoute: "", prevRoute: "", nextRoute: "" };
    }

    var routes = getMusicTrackRoutes();
    var index = routes.indexOf(currentRoute);
    if (index === -1) {
      return { currentRoute: currentRoute, prevRoute: "", nextRoute: "" };
    }

    return {
      currentRoute: currentRoute,
      prevRoute: index > 0 ? routes[index - 1] : "",
      nextRoute: index < routes.length - 1 ? routes[index + 1] : "",
    };
  }

  function enhanceHomeFeaturedPlayer() {
    if (!document.body || !document.body.classList.contains("home-body")) {
      return;
    }

    var shell = document.getElementById("playerShell");
    var toggle = document.getElementById("audioToggle");
    var inlineAudio = document.getElementById("heroAudio");
    var progress = document.getElementById("playerProgress");
    var timeLabel = document.getElementById("playerTime");
    var status = document.getElementById("playerStatus");
    var fallbackLink = document.getElementById("playerFallbackLink");
    var titleNode = shell ? shell.querySelector(".player-center p") : null;

    if (
      !shell ||
      !toggle ||
      !inlineAudio ||
      !progress ||
      !timeLabel ||
      !status ||
      !fallbackLink ||
      !titleNode
    ) {
      return;
    }

    neutralizeInlineMusicAudio(inlineAudio);
    var controller = ensurePersistentAudioDock();
    var labelText = (titleNode.textContent || "").trim();
    var parts = labelText.split(/\s*-\s*/);
    var featuredPageHref = fallbackLink.getAttribute("href") || "music/track-04.html";
    var featuredRoute = normalizeMusicDetailPath(featuredPageHref);
    var navData = buildTrackNavigationDataForRoute(featuredRoute);
    var featuredTrack = {
      src: resolveAudioSource(inlineAudio),
      title: String((parts[0] || "AFFIZIEREN").trim() || "AFFIZIEREN").toUpperCase(),
      artist: String((parts[1] || "HAZEZZ").trim() || "HAZEZZ").toUpperCase(),
      pageHref: toChronohazeAbsoluteUrl(featuredRoute || featuredPageHref),
      prevHref: navData.prevRoute,
      nextHref: navData.nextRoute,
      fallbackDuration: Number(inlineAudio.getAttribute("data-fallback-duration") || 0) || 0,
    };

    function isFeaturedTrackActive() {
      return !!(
        controller &&
        controller.current &&
        controller.current.src &&
        controller.current.src === featuredTrack.src
      );
    }

    function setHomePlayerVisualState(nextState) {
      var labels =
        detectPreferredLanguage() === "en"
          ? {
              loading: "Preparing audio…",
              ready: "",
              error: "Playback unavailable on this device/network",
              fallback: "Open track page",
            }
          : {
              loading: "准备音频…",
              ready: "",
              error: "当前设备/网络下暂不可播",
              fallback: "去音乐页试听",
            };
      var safeState = nextState || "loading";
      shell.dataset.audioState = safeState;
      shell.classList.toggle("is-audio-unavailable", safeState === "error");
      status.textContent =
        safeState === "error"
          ? labels.error
          : safeState === "ready"
            ? labels.ready
            : labels.loading;
      fallbackLink.textContent = labels.fallback;
      fallbackLink.hidden = safeState !== "error";
    }

    function syncFeaturedPlayerFromPersistentAudio() {
      var active = isFeaturedTrackActive();
      var duration = 0;
      var currentTime = 0;
      var isPlaying = false;

      if (active) {
        duration = isFinite(controller.audio.duration) ? controller.audio.duration : 0;
        currentTime = isFinite(controller.audio.currentTime) ? controller.audio.currentTime : 0;
        isPlaying = !controller.audio.paused && !controller.audio.ended;
      } else {
        duration = featuredTrack.fallbackDuration;
        currentTime = 0;
      }

      var ratio = duration > 0 ? Math.max(0, Math.min(currentTime / duration, 1)) : 0;
      progress.style.width = (ratio * 100).toFixed(2) + "%";
      timeLabel.textContent =
        formatDuration(currentTime) + " / " + formatDuration(duration);
      toggle.textContent = isPlaying ? "▮▮" : "▶";
      toggle.disabled = !featuredTrack.src;
      toggle.setAttribute("aria-disabled", featuredTrack.src ? "false" : "true");

      if (!featuredTrack.src) {
        toggle.textContent = "·";
        setHomePlayerVisualState("error");
        return;
      }

      if (controller.audio.error && active) {
        setHomePlayerVisualState("error");
        return;
      }

      setHomePlayerVisualState("ready");
    }

    if (toggle.dataset.persistentAudioBound !== "1") {
      toggle.dataset.persistentAudioBound = "1";
      toggle.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (!featuredTrack.src) {
            syncFeaturedPlayerFromPersistentAudio();
            return;
          }

          if (!isFeaturedTrackActive()) {
            loadPersistentTrack(
              {
                src: featuredTrack.src,
                title: featuredTrack.title,
                artist: featuredTrack.artist,
                pageHref: featuredTrack.pageHref,
                prevHref: featuredTrack.prevHref,
                nextHref: featuredTrack.nextHref,
              },
              { autoplay: true }
            );
            return;
          }

          if (controller.audio.paused || controller.audio.ended) {
            var playPromise = controller.audio.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(function () {
                syncFeaturedPlayerFromPersistentAudio();
              });
            }
          } else {
            controller.audio.pause();
          }
        },
        true
      );
    }

    if (shell.dataset.persistentAudioSyncBound !== "1") {
      shell.dataset.persistentAudioSyncBound = "1";
      document.addEventListener("chronohaze:persistent-audio-sync", function () {
        syncFeaturedPlayerFromPersistentAudio();
      });
    }

    syncFeaturedPlayerFromPersistentAudio();
  }

  function maybeAutoplayPendingPersistentTrack() {
    if (!pendingPersistentTrackHref || !document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var currentPath = (window.location.pathname || "")
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");
    var targetPath = String(pendingPersistentTrackHref || "")
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "")
      .split("#")[0];

    if (currentPath !== targetPath) {
      return;
    }

    pendingPersistentTrackHref = "";
    var firstAudio = document.querySelector(".music-detail-article audio");
    if (!firstAudio) {
      return;
    }

    var article = firstAudio.closest(".music-detail-article") || document;
    var trackData = buildTrackLabel(article, firstAudio);
    var navData = getCurrentTrackNavigation();
    loadPersistentTrack(
      {
        src: resolveAudioSource(firstAudio),
        title: trackData.title,
        artist: trackData.artist,
        pageHref: window.location.href,
        prevHref: navData.prevHref,
        nextHref: navData.nextHref,
      },
      { autoplay: true }
    );
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
    link.href = "../music.html";
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
    ensureMusicDetailPageNavigation(dict);
    ensurePersistentAudioDock();

    players.forEach(function (audio) {
      if (audio.dataset.customPlayer === "1") {
        return;
      }

      audio.dataset.customPlayer = "1";
      audio.classList.add("music-player-native");
      audio.removeAttribute("controls");
      audio.controls = false;
      neutralizeInlineMusicAudio(audio);

      var shell = document.createElement("div");
      shell.className = "music-player-shell";

      var label = document.createElement("p");
      label.className = "music-player-label";
      var article = audio.closest(".music-detail-article") || document;
      var trackData = buildTrackLabel(article, audio);
      var navData = getCurrentTrackNavigation();
      var trackSource = resolveAudioSource(audio);
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
      playButton.textContent = "";

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
      audio.insertAdjacentElement("afterend", shell);

      function isCurrentPersistentTrack() {
        var controller = ensurePersistentAudioDock();
        return !!(
          controller &&
          controller.current &&
          controller.current.src &&
          controller.current.src === trackSource
        );
      }

      function syncPlayState() {
        var controller = ensurePersistentAudioDock();
        var isPlaying =
          isCurrentPersistentTrack() &&
          !controller.audio.paused &&
          !controller.audio.ended;
        playButton.classList.toggle("is-playing", isPlaying);
        playButton.setAttribute(
          "aria-label",
          isPlaying ? dict.playerPauseAria : dict.playerPlayAria
        );
      }

      function syncTimeState() {
        var controller = ensurePersistentAudioDock();
        var duration = 0;
        var current = 0;

        if (isCurrentPersistentTrack()) {
          duration = isFinite(controller.audio.duration) ? controller.audio.duration : 0;
          current = isFinite(controller.audio.currentTime) ? controller.audio.currentTime : 0;
        }

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

      bindResponsivePress(playButton, function () {
        var controller = ensurePersistentAudioDock();
        if (!trackSource) {
          return;
        }

        pauseCompetingAudio(controller.audio);

        if (!isCurrentPersistentTrack()) {
          loadPersistentTrack(
            {
              src: trackSource,
              title: trackData.title,
              artist: trackData.artist,
              pageHref: window.location.href,
              prevHref: navData.prevHref,
              nextHref: navData.nextHref,
            },
            { autoplay: true }
          );
          return;
        }

        if (controller.audio.paused || controller.audio.ended) {
          var playPromise = controller.audio.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {
              syncPlayState();
            });
          }
        } else {
          controller.audio.pause();
        }
      });

      scrubber.addEventListener("input", function () {
        var controller = ensurePersistentAudioDock();
        if (!isCurrentPersistentTrack()) {
          return;
        }

        if (!isFinite(controller.audio.duration) || controller.audio.duration <= 0) {
          return;
        }

        var next = (Number(scrubber.value) / 1000) * controller.audio.duration;
        controller.audio.currentTime = next;
        syncTimeState();
      });

      scrubber.addEventListener("change", function () {
        syncTimeState();
      });

      document.addEventListener("chronohaze:persistent-audio-sync", function () {
        syncPlayState();
        syncTimeState();
      });

      audio.addEventListener("play", function () {
        if (!trackSource) {
          return;
        }
        var resumeTime = isFinite(audio.currentTime) ? Number(audio.currentTime) : 0;
        try {
          audio.pause();
        } catch (_err) {}
        loadPersistentTrack(
          {
            src: trackSource,
            title: trackData.title,
            artist: trackData.artist,
            pageHref: window.location.href,
            prevHref: navData.prevHref,
            nextHref: navData.nextHref,
          },
          { autoplay: true, currentTime: resumeTime }
        );
      });

      if (!audio.paused && !audio.ended && trackSource) {
        var initialTime = isFinite(audio.currentTime) ? Number(audio.currentTime) : 0;
        try {
          audio.pause();
        } catch (_err) {}
        loadPersistentTrack(
          {
            src: trackSource,
            title: trackData.title,
            artist: trackData.artist,
            pageHref: window.location.href,
            prevHref: navData.prevHref,
            nextHref: navData.nextHref,
          },
          { autoplay: true, currentTime: initialTime }
        );
      }

      syncPlayState();
      syncTimeState();
    });

    maybeAutoplayPendingPersistentTrack();
  }

  function ensureMusicTranscriptPanel() {
    return;
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

  function decorateEnglishBilingualLyrics() {
    if (detectPreferredLanguage() !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var article = document.querySelector(".music-detail-article");
    if (!article) {
      return;
    }

    var headings = Array.from(article.querySelectorAll("h2"));
    var part1Heading = findLyricHeading(headings, 1);
    var part2Heading = findLyricHeading(headings, 2);
    var lyricParagraphs = [part1Heading, part2Heading]
      .map(function (heading) {
        return heading ? heading.nextElementSibling : null;
      })
      .filter(function (node) {
        return node && node.tagName === "P";
      });

    lyricParagraphs.forEach(function (paragraph) {
      if (
        paragraph.querySelector(".lyrics-original-block") ||
        paragraph.querySelector(".lyrics-translation-block")
      ) {
        return;
      }

      var html = (paragraph.innerHTML || "").trim();
      if (!html) {
        return;
      }

      var segments = html
        .split(/(?:\s*<br\s*\/?>\s*){2,}/i)
        .map(function (segment) {
          return segment.trim();
        })
        .filter(Boolean);

      if (segments.length < 2) {
        return;
      }

      paragraph.innerHTML = segments
        .map(function (segment, index) {
          var cls = index % 2 === 0 ? "lyrics-original-block" : "lyrics-translation-block";
          return '<span class="' + cls + '">' + segment + "</span>";
        })
        .join("<br /><br />");
    });
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
          "夜の街をただ適当に歩いてるだけ",
          "今、元気ですかって",
          "そんなことさえ言えないんだ",
          "あの時　スクリーンの向こうは",
          "手を伸ばしても触れられない距離だった",
          "雑に撮った写真しか　もう何も残ってない",
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
        zh: ["他の誰かと比べたりした？私を", "聞かせてよ　昔の二人のことを", "あなたのためなら時間を止める"],
        en: [
          "Have you ever compared me to someone else?",
          "Tell me. Let me hear the old stories.",
          "For you,",
          "I’d pause time, just a little.",
        ],
      },
      {
        zh: [
          "以前あなたに抱いていた疑問はもう全部解けた",
          "軒先に落ちた白い花びらは　まだ揺れていた",
          "でもどんなに頑張ってもあなたにはなれない",
          "今でも覚えてる？　口論したことを",
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
          "朝のお茶を飲むころ　月光があなたのギターに落ちる",
          "雨の夜に予報を見る　そっちは晴れだって",
          "似ているのに　あの時の気持ちとは重ならない",
          "一人になるとまた目の前に浮かんでくる",
          "灰色の瞳の奥にあった失望に　戻ったみたいだ",
          "ねえ　本当はこんなはずじゃなかったんだ",
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
        zh: ["また言葉の端々の意味を考えていた", "また訳もなく　そっちのニュースを見てた"],
        en: [
          "I start reading into what you said, what you didn’t say.",
          "Without knowing why,",
          "I end up watching the news from your country.",
        ],
      },
      {
        zh: [
          "「今夜、どうして君のことを話したのかわからない」",
          "最後まで、神は罰すら下そうとしない",
          "結局、今も誰のせいなのかわからないんだ",
          "灯火、初夏、なぜ変わり続けるのだろう",
        ],
        en: [
          "“Tonight, I don’t even know why I started talking about you.”",
          "In the end, even God refuses to hand down a punishment.",
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
        zh: ["枯れてはまた入れ替わる花", "片隅に打ち捨てられていた", "秋の朔に踏み出した"],
        en: [
          "Flowers wither, replaced again and again,",
          "left abandoned in a corner.",
          "Stepping forward",
          "on the first day of autumn,",
          "over fallen leaves.",
        ],
      },
      {
        zh: ["色の重なり合い、曇った硝子の反射", "カメラの光に振り向いたこと", "夜明け前の輪郭に縋りついていた"],
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
        zh: ["羽よりも軽い心臓", "重たいものだけ消えてゆく", "感性は水面に浮かんでいた"],
        en: [
          "In a heart lighter than a feather,",
          "things that feels heavy slowly fade away.",
          "Sensitivity floated",
          "on the surface of water.",
        ],
      },
      {
        zh: ["色褪せた人たちは", "ほこりのようにどうでもいいんだ", "できると思っていたことさえ"],
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
          "色の重なり合い、曇った硝子の反射",
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
        zh: ["逃げる理由なんてない", "動機はもう否めない", "スクリーンに囲まれた部屋", "行列が軌跡を描く"],
        en: [
          "No reason to hide,",
          "No reason to deny.",
          "A room surrounded by screens,",
          "A procession sketches its trail.",
        ],
      },
      {
        zh: ["台本通りの芝居", "罪と罰を綴る", "夜道に滲む煙", "赤い線で結ばれた investigation"],
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
          "（散った）",
          "砂ぼこりや落ち葉とともに",
          "無秩序な瞳が朱に染まる",
          "日々築いてきた彼の論理の連なりは崩れた",
          "「ようやく触れたような気がした」",
          "ありふれた思考過程さえ",
          "過去になったあとで",
          "彼には自分のため息が聞こえた",
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
        zh: ["セピアの映画を追いかけた", "醜さをきれいな言葉で隠した", "彼の名前も何もかも", "ついに失いかけた"],
        en: [
          "Chasing after a sepia film,",
          "hiding the ugly with beautiful words.",
          "His name, and everything about him",
          "at last, he was close to losing it all.",
        ],
      },
      {
        zh: ["裁かれない神の背後で", "その日から停滞した時間", "灯台の光と蒼い空間", "彼の無意識の表情だけが"],
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
          "日々積み重なってた彼の違和感が弾けた",
          "「ようやく理解できた気がした」",
          "ありふれた思考過程さえ",
          "過去になったあとで",
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
          "霧中、一葉の緑が時雨を払っていた",
          "その継ぎ目の延長も、失われたものも",
          "いずれも残された記憶から消えてしまう",
        ],
        en: [
          "In the mist, a single leaf of green brushed away the passing shower.",
          "The continuation of that handover line, and everything we lost,",
          "one day, all of it",
          "will fade from the memories that remain.",
        ],
      },
      {
        zh: ["もう断ち切れない想いと僕の", "溢れる心配事", "灰のついた手紙は数行しかないのに", "重い"],
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
          "目の前の景色がぼやけた",
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
        zh: ["終わりが来ても、恩讐が終わっても", "やがては意味になる", "どうしようもないことで泣いたり", "待ったりしている"],
        en: [
          "Even when an ending comes, even when old debts and grudges end,",
          "someday it will become meaning.",
          "And still, I find myself crying",
          "over things I can’t undo,",
          "still waiting.",
        ],
      },
      {
        zh: ["相変わらずここで君のいない", "春を迎えなければならない", "どうしてもこのような結末を", "迎えるのなら…"],
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
        zh: ["暗い街灯の下、無人の街に", "浮かぶ心臓がそこにあった", "あの冬の夜、この世界は", "二人きりのようでした"],
        en: [
          "Under dim streetlights, in an empty street,",
          "a floating heart is right there.",
          "That winter night, this world",
          "felt like it belonged to only the two of us.",
        ],
      },
      {
        zh: ["深い黒に目をやった時", "君の目はあたしだけを見つめた", "その走り続けた夜に", "月光さえも見えなかった"],
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
        zh: ["心が苦しくても、愛を描きたい", "「寒くない、あたしの手を握ってるから」", "暗い道が見えなくても、それほど重要じゃない", "そのささやき声を覚えていればいい"],
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
        zh: ["先のことに気づかないふりをしてた", "君が想像する景色を見たい", "このまま、一緒に遠くへ", "逃げられたらいいな"],
        en: [
          "I pretended not to notice what comes next.",
          "I want to see the scenery you imagine.",
          "Like this, together, farther away,",
          "if only we could run.",
        ],
      },
      {
        zh: ["気づくたびに君はあたしから遠ざかっていく", "あの夏から嫌いなものだけが増えていく"],
        en: [
          "Every time I realize it, you drift farther from me.",
          "Since that summer, only the things I hate have multiplied.",
        ],
      },
      {
        zh: ["心が苦しくても、愛を描きたい", "大人になっていくあたしは どうすればいいのか", "白昼夢を見てるあたしも実は", "終わらせなければならないことを知ってる"],
        en: [
          "Even if my chest hurts, I want to depict love.",
          "As I grow up, what am I supposed to do?",
          "Even me, lost in a waking daydream,",
          "knows there are things I have to end.",
        ],
      },
      {
        zh: ["「さらば、夏に咲くヨルガオ」と言えたら、嗚呼", "もう君がそばにいられなくても", "これから誕生日を忘れてしまっても", "あたしはきっと許せるでしょう"],
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
        zh: ["「そんなこと、理解できない。僕はずっとそうだった」と言った", "彼は「それでもいいんだ」と言った", "続けようとしたら　突然崩れた"],
        en: [
          "“I was always like that，",
          "the kind of me who couldn’t understand things like that,” I said.",
          "He says, “That’s fine.”",
          "And when I tried to keep going, it suddenly collapsed.",
        ],
      },
      {
        zh: ["いつも他人のことを笑っている", "自分の立場じゃ理解できない感情", "「捨てれば完璧になれる」", "僕はそう思う"],
        en: [
          "Always laughing at other people,",
          "emotions I can’t understand from where I stand.",
          "“If I throw it away, I can become perfect.”",
          "That’s what I think.",
        ],
      },
      {
        zh: ["10月、ロンドン、人々", "地平線の内側に", "昔の影をたどって", "誰も救えないから"],
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
        zh: ["傘に落ちる雨粒のように", "5時にはもう日が暮れる冬のなかで", "「永遠に会えないと思う」", "脳裏をよぎる"],
        en: [
          "Like raindrops hitting an umbrella,",
          "in a winter where by five o’clock it’s already dark,",
          "“I think we’ll never meet again,”",
          "flashes through my mind.",
        ],
      },
      {
        zh: ["次から次へと僕の頭上を", "光が通り過ぎていく", "自由も、真実も、平和も、愛も", "せめて内なるものだけは維持しよう"],
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
        zh: ["「これじゃ結局、意味がないじゃないか」", "こんなことを考えていた", "大量の丸薬を手のひらにあけた", "その時、その時", "君のことを思い出した"],
        en: [
          "“In the end, this just means nothing, doesn’t it?”",
          "I kept thinking that.",
          "I poured a mass of pills into my palm.",
          "And then—right then,",
          "I remembered you.",
        ],
      },
      {
        zh: ["実はあの夏から、自分の感情を", "無意識にまた拾い上げていた", "コントロールできないなんて大嫌い"],
        en: [
          "Truth is, since that summer, my emotions",
          "have been unconsciously picked up again.",
          "I hate it—",
          "I hate not being able to control it.",
        ],
      },
      {
        zh: ["あの日、僕は劇場の前でじっとしていた", "真夜中、街灯、ガラスに告解", "I’ll tell you someday, about the story that came from despair"],
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
        zh: ["記憶は生まれて消える", "花びらのようにフィルムに残る", "天井から落ちる光は…"],
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
        zh: ["君はまだ光に逆らって屋上に立っている", "（私の夜になった）", "住む世界が違えば触れられないのか"],
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
        zh: ["思えばそれはあの秋の最初の月光だった", "もう君のほかには何も見えない"],
        en: [
          "Thinking back, that was the first moonlight of my autumn.",
          "Now I can’t see anything",
          "except you.",
        ],
      },
      {
        zh: ["何度も繰り返して", "また遠ざかっていきそうだった", "（それはもう戻れない）", "（あの夏の悔しさを忘れたいのに）", "まだ納得いかない", "でもしょうがないわね"],
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
        zh: ["最悪なのはこれだろう", "当たり前", "消える、消える", "一緒に知らん顔をしよう"],
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
        zh: ["広大な宇宙に比べて", "自分が何者かわからない", "直面したくない", "挫折感に飲まれてく"],
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
        zh: ["時計台で私は　たまには夜明けの青に染まる", "夢から覚めたような", "邪魔な感情をすべて消したい", "暗闇で一人になるまで"],
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
        zh: ["切に闇を破りたい", "できないと気づいたときに", "飽和してゆく", "ものが大嫌いだな"],
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
        zh: ["「時間が命を食べてしまう」", "「私たちの心を食い荒らす」"],
        en: ["“Time ends up eating life.”", "“It ravages our hearts.”"],
      },
      {
        zh: ["時計台で私は　たまには夜明けの青に染まる", "夢から覚めたような", "邪魔な感情をすべて消したい", "暗闇で一人になるまで"],
        en: [
          "At the clock tower, sometimes I’m stained",
          "in the blue of dawn,",
          "as if waking from a dream.",
          "I want to erase every intrusive feeling",
          "until I’m alone in the dark.",
        ],
      },
      {
        zh: ["いつまで経っても自分になれない", "思い出せば、きっと君のせいだ", "直らない手癖と終わったパーティー、", "だから、どうか、どうか、どうか殺してくれ"],
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
        zh: ["膨張し、崩れ落ち、消える"],
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

  function applyJellyfishLakeIntroInEnglish(safeLang) {
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

    if (detailPath !== "music/track-25.html") {
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
      "“Jellyfish and the Lake” is a work with a distinctly singular temperament.",
      "Its structure and style hover beyond clear boundaries.<br />On the surface, it leans toward the spacious breath and expansion of post-rock,<br />yet midway through, a sharply cut djent textured passage interrupts the flow.<br />What might seem incompatible instead forms a narrative language unique to this piece.",
      "Looking back five years later, it still feels like an aesthetic high point in my creative trajectory,<br />even if the mix continues to leave me with certain regrets.",
      "The song unfolds around the state of disappearance.",
      "Soft, fragile memories.<br />Fragments of the self that have fallen away.<br />Images, sounds, habits that remain.<br />And the hollow that cannot be filled.",
      "These elements do not move in a linear storyline,<br />they diffuse like water,<br />slowly spreading, seeping into one another.",
      "The image of the “jellyfish” in the lyrics suggests not simply death,<br />but dissolution as a mode of existence,<br />dying and turning into water,<br />disappearing without a trace,<br />as though it had never appeared at all.",
      "The overall color of the piece is a deep blue green lake.<br />Not the movement of the sea, nor the fall of rain,<br />but a body of water that is still, yet carries depth.",
      "The arrangement follows this texture:<br />melodies and atmospheres ripple outward like water rings,<br />slow, restrained, steadily sinking.",
      "Like the faint silhouette of a jellyfish drifting beneath the surface,<br />transparent, silent,<br />and never entirely gone.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyJellyfishLakeLyricsInEnglish(safeLang) {
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

    if (detailPath !== "music/track-25.html") {
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
        zh: ["クラゲは死んで水となって", "跡形もなく消える", "まるで現れなかったかのように", "あの人もそうだった"],
        en: [
          "The jellyfish dies and turns into water,",
          "vanishing without a trace—",
          "as if it had never appeared at all.",
          "That person was the same.",
        ],
      },
      {
        zh: ["思い出はあたしに残されたすべて", "あの永遠の笑った顔", "うかつな夢"],
        en: [
          "Memories are all that were left behind for me—",
          "that eternal smiling face,",
          "those careless dreams.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["あたしたちの歌を忘れたら", "連れて行ってくれる?", "「 忘れる 」以外の苦しみは省かれる"],
        en: [
          "If we forget our song,",
          "will you take me with you?",
          "Suffering, other than “forgetting,”",
          "is omitted.",
        ],
      },
      {
        zh: ["夜にほれ込んだか、黎明を軽視した", "孤独で、絶望的で、夢遊病的な愛"],
        en: [
          "Did we fall in love with the night,",
          "or dismiss the dawn?",
          "A love that was solitary,",
          "desperate,",
          "somnambulant.",
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

  function applyDaybreakBorderlineIntroInEnglish(safeLang) {
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

    if (detailPath !== "music/track-26.html") {
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
      "“Daybreak, the Borderline of Light and Dark” stands alongside “Jellyfish and the Lake” as one of the most aesthetically complete works in my personal catalogue.",
      "If “Jellyfish and the Lake” dissolves like water spreading outward,<br />this song remains suspended in a temporal layer where day and night cannot be confirmed, neither darkness nor daylight, but the fatigue and weightlessness that arise when time stalls at the boundary.",
      "Stylistically, it leans toward indie in its looseness,<br />yet gradually shifts into a more conventional rock arrangement toward the latter half.<br />This transition, from dispersion to cohesion, resembles consciousness drifting back toward the body,<br />though it never fully lands.",
      "Amps, dizziness, tinnitus, overload.<br />A state of being wrapped and swallowed by sound itself,<br />somewhere between excessive volume and excessive clarity.",
      "The condition is painful, yet strangely hollow,<br />as if awareness were magnified and stretched,<br />while steadily losing substance.",
      "The most important part of the piece remains the central instrumental section,<br />still my favorite passage to this day.",
      "It is a purely instrumental space.<br />No technical display, no complex logic,<br />yet it completes the most coherent emotional arc through unconscious intuition alone.",
      "After that, six words are layered in,<br />from liberation to detachment,<br />from cooltoned humidity to internal combustion,<br />eventually arriving at burial.",
      "There was a kind of beauty in that segment<br />that I now find difficult to recreate.<br />At the time, I was far less skilled in arrangement,<br />yet there were none of the structural “errors” I would now identify.<br />With greater technical control today,<br />I am paradoxically restrained by the logic of progressive structures,<br />unable to return to that precise, unconscious clarity.",
      "When sadness and self sentimentality become formulaic,<br />when emotion is reused until it loses its temperature,<br />when one is lucid, yet uncertain whether still participating in reality...",
      "this song exists in that border state.",
      "A confirmation, in the quietest hour before dawn,<br />that the self has not yet completely collapsed.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyDaybreakBorderlineLyricsInEnglish(safeLang) {
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

    if (detailPath !== "music/track-26.html") {
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
        zh: ["悲しみと自己感動のふりに慣れている", "今日もいつものようにゆっくり眠った", "夢うつつの朝に", "曖昧な意識の中で穏やかな絶望"],
        en: [
          "I’ve grown accustomed",
          "to performing sorrow and self sentiment.",
          "Today again, as usual,",
          "I fell asleep slowly.",
          "In a half-dream morning,",
          "within ambiguous awareness,",
          "a gentle despair.",
        ],
      },
      {
        zh: ["自由", "白昼夢", "藍", "湿った", "燃える", "埋葬"],
        en: ["Freedom.", "Daydream.", "Indigo.", "Damp.", "Burning.", "Burial."],
      },
      {
        zh: ["どうしてめまいがしたのか、マーシャルを持ってきた", "背景雑音とともに横になる", "何を弾けばいいのか", "ここにいない、vacuous duplicate only"],
        en: [
          "Why was I dizzy?",
          "I brought the Marshall over.",
          "Lying down with the background noise.",
          "What am I supposed to play?",
          "Not here—",
          "vacuous duplicate only.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["夕闇の中に立っている", "もう少しでいい", "誰が返事をしてくれるか", "誰がこれを終わらせるのか"],
        en: ["Standing in the evening dusk.", "Just a little more—", "who will answer?", "Who will end this?"],
      },
      {
        zh: ["もっと見たい、知らない景色", "足りない、足りない", "だからもうちょっと聞きたい", "だからもう一度聞きたい"],
        en: [
          "I want to see more, unknown scenery.",
          "Not enough, not enough.",
          "So I want to listen a little longer.",
          "So I want to hear it once more.",
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

  function applyCardiacAlarmIntroInEnglish(safeLang) {
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

    if (detailPath !== "music/track-27.html") {
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
      "“Cardiac Alarm” was my first attempt at writing something post hardcore.",
      "Ironically while I intended it to be heavier, the result barely qualifies as “core” at all.<br />Instead, it became a narrative that trembles under pressure,<br />not explosive, but persistently overloaded.",
      "Its underlying colour is deep red, like a warning light before the end,<br />no time left to explain anything.<br />When memory suddenly surges back,<br />the body reacts before consciousness does:<br />heart rate destabilized, breathing thinned, frames skipping,<br />as if the chest had been pierced by a weapon without form.",
      "During its creation, I had been listening obsessively to Forget and Forgive.<br />That tender sense of collapse clung to the melody (when will faf return 😔).<br />I even wrote sweep picking patterns, ironically as of February 2026, I still can’t strum properly haha.<br />In this song, that awkwardness remains as something honest.",
      "At the time, I uploaded it to Niconico,<br />where Avogado6 purchased an advertisement for it.<br />To me, that felt like a strange echo:<br />a song about sinking and endings,<br />quietly nudged by the world somewhere in a corner,<br />leaving proof that it had once been seen.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyCardiacAlarmLyricsInEnglish(safeLang) {
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

    if (detailPath !== "music/track-27.html") {
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
        zh: ["「それ」が生まれる前の顔を探している", "どこかの時点ですべてが消えてしまうと知りながら"],
        en: [
          "Searching for the face",
          "before “that thing” was born—",
          "knowing that at some point",
          "everything would disappear.",
        ],
      },
      {
        zh: ["その瞬間に", "記憶が潮のように押し寄せてくる", "夏が過ぎても", "変わらない"],
        en: [
          "In that instant,",
          "memories surge like a tide.",
          "Even after summer passes,",
          "nothing changes.",
        ],
      },
      {
        zh: ["夢で僕の名前を呼んで", "そして覚めた後にまた", "無限の沈黙で何度も僕を殺す"],
        en: [
          "Call my name in a dream.",
          "And when you wake again,",
          "kill me over and over",
          "with infinite silence.",
        ],
      },
      {
        zh: ["すねを通る水が速くなった", "冷たい、形のない銃", "光のない混沌の中で"],
        en: [
          "The water running past my shins quickens.",
          "Cold—",
          "a shapeless gun.",
          "Within lightless chaos—",
        ],
      },
      {
        zh: ["心臓を射抜く"],
        en: ["shoots through the heart."],
      },
      {
        zh: ["画面が飛び続けて、君と出会った時に止まる", "振り出しに戻ったようだった。", "残した傷は消えない"],
        en: [
          "The screen keeps skipping frames,",
          "stopping only when I met you.",
          "It felt like returning to the starting line.",
          "The wounds left behind don’t fade.",
        ],
      },
      {
        zh: ["今でも心", "も覚えている、「壊れたTwilight」", "死んでしまいそうだ", "遺言のような"],
        en: [
          "Even now, my heart",
          "still remembers—“Broken Twilight.”",
          "It feels like I might die.",
          "Like a last testament.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["夢で僕の名前を呼んで", "そして覚めた后にまた", "無限の沈黙で何度も僕を殺す"],
        en: [
          "Call my name in a dream.",
          "And when you wake again,",
          "kill me over and over",
          "with infinite silence.",
        ],
      },
      {
        zh: ["すねを通る水が速くなった", "冷たい、形のない銃", "光のない混沌の中で"],
        en: [
          "The water running past my shins quickens.",
          "Cold—",
          "a shapeless gun.",
          "Within lightless chaos—",
        ],
      },
      {
        zh: ["心臓を射抜く"],
        en: ["shoots through the heart."],
      },
      {
        zh: ["夢で僕の名前を呼んで", "そして覚めた后にまた", "無限の沈黙で何度も僕を殺す"],
        en: [
          "Call my name in a dream.",
          "And when you wake again,",
          "kill me over and over",
          "with infinite silence.",
        ],
      },
      {
        zh: ["不意に指の間から抜けていく", "答えはどこにもない", "と気づいたのだ", "だから言葉もいらない、", "ちょっと"],
        en: [
          "Suddenly slipping through my fingers—",
          "I realized",
          "there is no answer anywhere.",
          "So words aren’t necessary.",
          "Just—",
        ],
      },
      {
        zh: ["緋色空の下で", "カラスが走り抜ける", "真っ黒な目を閉じる", "雨の止んだこの街で"],
        en: [
          "Beneath a crimson sky,",
          "a crow runs past.",
          "I close my pitch-black eyes",
          "in this city where the rain has stopped.",
        ],
      },
      {
        zh: ["過去の傷に触れ", "この愛の時代に", "黙って消えてしまった", "君、とっくに沈んでいる"],
        en: [
          "Touching old wounds,",
          "in this era of love,",
          "you quietly disappeared.",
          "You—",
          "long since sunk beneath.",
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

  function applyAfterimageIntroInEnglish(safeLang) {
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

    if (detailPath !== "music/track-28.html") {
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
      "“Afterimage” was written in the late summer after my GCSEs, in the brief transition before A-Level began.<br />It was a stretch of time that belonged neither to the past nor yet to the future, a momentary suspension, as if standing still inside the afterimage cast by time itself.",
      "The song does not point to anything specific.<br />It is a record of consciousness:<br />of the unreliability of memory as a structure,<br />of the instant when emotion slips away in silence.<br />The recurring images in the lyrics are a quiet interrogation of memory’s own truthfulness.",
      "Sonically, “Afterimage” is my only true post rock attempt.<br />The arrangement centers on space and atmospheric layers,<br />emotion develops slowly through continuous expansion and sinking,<br />gradually revealing itself.<br />Its overall temperature is cool, though not the cold of winter,<br />more like the bodily chill that appears when light is reduced,<br />the air deep inside tree shade,<br />or the dimness of evening shadows.",
      "The closest image this piece holds is falling asleep unnoticed within shadow:<br />no collapse, no falling,<br />just a brief weightlessness of consciousness,<br />sinking into a silent deep sea.",
      "Looking back five years later,<br />the work still retains a high degree of structural completeness.<br />Aside from the guitar recording and mix I never fully finished at the time,<br />almost nothing feels in need of revision.<br />It is more like a specimen preserved in the shadow of time,<br />quiet, dark grey, sharply contoured,<br />and no longer belonging to reality.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyAfterimageLyricsInEnglish(safeLang) {
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

    if (detailPath !== "music/track-28.html") {
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
        zh: ["そのことには何の幻想もないかもしれない", "あれは錯覚か自己欺瞞か", "何度も夢に見たハッピーエンド", "でも、それはとても言えない"],
        en: [
          "There may have been no illusion in it at all.",
          "Was it a misperception, or self-deception?",
          "A happy ending I dreamed of again and again.",
          "And yet, I can hardly say it.",
        ],
      },
      {
        zh: ["記憶の中の人が入れ替わり続ける", "そういえば花もそうだ", "ただ通りかかっただけだ"],
        en: [
          "In memory, people keep changing places.",
          "Come to think of it, flowers do too.",
          "It only happened to pass by.",
        ],
      },
      {
        zh: ["窓の外で真っ暗な蝉の鳴き声", "想い溢れる", "こんなに静かでも眠れない"],
        en: [
          "Outside the window, the cicadas cry in full darkness.",
          "Feelings spill over.",
          "Even in such quiet, I can’t sleep.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["夜の青をかきわけて", "目が霧だらけになる", "私が落ちたどん底", "音のない海の底に"],
        en: [
          "Parting the blue of night,",
          "my eyes fill with fog.",
          "the lowest place where I fell,",
          "to the floor of a soundless sea.",
        ],
      },
      {
        zh: ["記憶の中の"],
        en: ["in memory—"],
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

  function applyFutureMeetIntroInEnglish(safeLang) {
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

    if (detailPath !== "music/track-29.html") {
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
      "“I Hope I’ll Meet the Future” is a J-rock piece filled with the air of early summer,<br />a coming of age perspective born from looking upward.",
      "The lyrical prototype came from a drummer I admired at the time:<br />not someone reachable in reality,<br />but a presence like a stage light.<br />Their rhythm, energy, and sheer sense of being there<br />became the starting point of a shift in my self awareness.",
      "The aftershock of the stage continues inside the body,<br />sound arrives before emotion does.",
      "The colour imagery is built from overlapping orange and blue green.<br />Orange carries the warmth of early summer sunlight, an object of longing, a source of light.<br />Blue green comes from air and shadow:<br />not the heavy heat of midsummer,<br />but the sensation of early June, when a breeze is still present.<br />This warm yet non sticky climate echoes the stage of growth the song belongs to.",
      "It is not a lack of passion,<br />but a lack of strength to stand alongside it yet.<br />The song does not move toward possession or closeness;<br />it stays in a restrained wish,<br />hoping that at some point in the future,<br />a more complete self might be able to meet it.",
      "Flowers are still blooming, and the self is still growing.<br />Someday, it will no longer be transparent,<br />no longer existing only from the angle of looking up.",
      "The song thus remains in a sunlit layer of time:<br />neither memory, nor reality,<br />but a direction, toward a future self.",
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyFutureMeetLyricsInEnglish(safeLang) {
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

    if (detailPath !== "music/track-29.html") {
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
        zh: ["その日に君を見ました", "シンバルが震えている"],
        en: ["I saw you that day.", "The cymbals were trembling."],
      },
      {
        zh: ["オレンジとブルーが重なり合っている"],
        en: ["Orange and blue", "overlapped."],
      },
      {
        zh: ["人生の迷いを嘆いている", "昼寝のような顔を思い出した", "心象風景が曙光になった", "蓄音機に刻み込みたい"],
        en: [
          "I mourn the uncertainty of life.",
          "Then I remembered a face,",
          "soft, like a midday nap.",
          "My inner landscape turned into first light.",
          "I want to engrave it",
          "into a phonograph record.",
        ],
      },
      {
        zh: ["音もなく咲く夏が、", "大人になるまでに何度聞こえただろうか"],
        en: [
          "A summer that blooms without a sound—",
          "how many times have I heard it",
          "before becoming an adult?",
        ],
      },
      {
        zh: ["白昼夢を見ているあたしは君の足どりに追いつけない"],
        en: ["Watching a daydream,", "I can’t catch up", "to your footsteps."],
      },
      {
        zh: ["熱くても力がない、", "それを隠してゆっくり実現しよう", "未来に出会えたらいいな"],
        en: [
          "Hot with feeling, but without strength—",
          "I’ll hide it,",
          "and make it real slowly.",
          "I hope I can meet the future.",
        ],
      },
      {
        zh: ["君は複製できない人間だ", "あたしは贋物だ", "くだらない映画を見て時間をつぶすしかなかった"],
        en: [
          "You are a person who can’t be duplicated.",
          "I’m a counterfeit.",
          "All I could do",
          "was kill time with a stupid movie.",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: ["ただの光", "このまま照らし続けてください", "世界を横切った", "ほんの一瞬だ", "動揺していた心が再び固くなった"],
        en: [
          "Just a light—",
          "please keep shining",
          "like this.",
          "You crossed the world",
          "for only an instant.",
          "My shaken heart",
          "hardened again.",
        ],
      },
      {
        zh: ["熱くても力がない、", "それを隠してゆっくり実現しよう", "未来に出会えたらいいな"],
        en: [
          "Hot with feeling, but without strength—",
          "I’ll hide it,",
          "and make it real slowly.",
          "I hope I can meet the future.",
        ],
      },
      {
        zh: ["ただの光", "このまま照らし続けてください", "あたしの存在を知ってくれる", "ほんの一瞬だ", "動揺していた心が再び固くなった"],
        en: [
          "Just a light—",
          "please keep shining",
          "like this.",
          "For only an instant,",
          "you might know I exist.",
          "My shaken heart",
          "hardened again.",
        ],
      },
      {
        zh: ["熱くても力がない、", "それを隠してゆっくり実現しよう", "未来に出会えたらいいな"],
        en: [
          "Hot with feeling, but without strength—",
          "I’ll hide it,",
          "and make it real slowly.",
          "I hope I can meet the future.",
        ],
      },
      {
        zh: ["今日も歌っている", "バス停の脇の花はまだ咲いていた", "やがて透明にならなくなるだろう"],
        en: [
          "Still singing today.",
          "The flowers by the bus stop",
          "were still in bloom.",
          "Soon enough,",
          "I won’t be transparent anymore.",
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

  function applyDissociativeAmnesiaIntroInEnglish(safeLang) {
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

    if (detailPath !== "music/track-30.html") {
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

    var introNodes = [];
    var cursor = workHeading.nextElementSibling;
    while (cursor && cursor.tagName === "P") {
      introNodes.push(cursor);
      cursor = cursor.nextElementSibling;
    }

    if (!introNodes.length) {
      return;
    }

    var paragraphs = [
      "“Dissociative Amnesia” was written in February 2021, and it is one of the earliest works currently included in my portfolio (back then I was writing at my fastest pace， one song a day, or one every two days).",
      "There were many other pieces written before and after that remain unreleased,<br />but this particular moment became a personal threshold:<br />the earliest point in time whose “old self” I can tolerate letting others see.",
      "The writing process was entirely spontaneous.<br />At the time, classes taught me almost nothing I could actually use for composition;<br />I hadn’t started learning bass or arrangement techniques,<br />and the lyrics were literally machine-translated<br />(because writing lyrics in native lagurage felt unbearably cringe for a kid).<br />More than anything, this song is a document of how songwriting begins.",
      "The theme came from a chance encounter with the concept of “dissociative amnesia.”<br />The piece is not based on lived experience (I don't drink any alcohol even now😭）<br />it is closer to an imagined psychological writing that borrows the imagery of a disorder<br />(a teenager under sixteen has very little “life” to draw from anyway).",
      "Musically, it leans strongly toward electronic / dance-pop.<br />I had listened to far too much Ayase (from Yoasobi): the groove moves in a straight line, pushing forward.<br />Yet the melodic contour already hints at something that would keep developing in later works,<br />emotional tension, and an instinct for building a chorus,<br />even though the arrangement and production remain unmistakably immature.<br />The core melodic motif, however, still has a texture I genuinely like today.",
      "Before technique and method existed, intuition arrived first.",
      "That is why “Dissociative Amnesia” sits at the beginning of the portfolio:<br />not because it is the most refined,<br />but because it marks the earliest point from which all later sound and narrative began.",
    ];

    introNodes[0].innerHTML = paragraphs.join("<br /><br />");
    introNodes.slice(1).forEach(function (node) {
      node.remove();
    });
  }

  function applyDissociativeAmnesiaLyricsInEnglish(safeLang) {
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

    if (detailPath !== "music/track-30.html") {
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
        zh: ["テーブルの上のリップクリーム", "食べかけのパン", "「火曜日に何があったのか」と聞かれました"],
        en: ["Lip balm on the table.", "Half-eaten bread.", "I was asked,", "“What happened on Tuesday?”"],
      },
      {
        zh: ["夢を繰り返すシーン", "はっと目を開けた", "「思い出せないあのこと」"],
        en: ["A scene that repeats in my dreams—", "I suddenly opened my eyes:", "“that thing I can’t remember.”"],
      },
      {
        zh: ["腐った体と心を持って", "ゆっくりと夕暮れに落ちる", "乾いた空虚感と", "何も起こらないと定められた夜", "ほっとしたようで不安だった"],
        en: [
          "With a body and a mind gone rotten,",
          "I sink slowly into dusk.",
          "A dry emptiness,",
          "and a night decreed",
          "that nothing will happen.",
          "I felt relieved—",
          "and anxious.",
        ],
      },
      {
        zh: ["テーブルの上の化粧水", "飲みかけのヨーグルト", "「火曜日に何があったのか」と聞かれました"],
        en: ["Toner on the table.", "Half-finished yogurt.", "I was asked,", "“What happened on Tuesday?”"],
      },
    ];

    var part2Blocks = [
      {
        zh: ["うつろな目つきだった", "意識の中に隠されている", "「あの忘れられない記憶」"],
        en: ["My gaze was hollow.", "Hidden inside my consciousness:", "“that unforgettable memory.”"],
      },
      {
        zh: ["腐った体と心を持って", "ゆっくりと夕暮れに落ちる", "乾いた空虚感と", "何も起こらないと定められた夜", "ほっとしたようで不安だった"],
        en: [
          "With a body and a mind gone rotten,",
          "I sink slowly into dusk.",
          "A dry emptiness,",
          "and a night decreed",
          "that nothing will happen.",
          "I felt relieved—",
          "and anxious.",
        ],
      },
      {
        zh: ["電子のような香り", "ゆっくりと眠りについた", "錆のような血の跡", "あのひどい思い出"],
        en: [
          "A scent like electronics.",
          "I fell asleep, slowly.",
          "Bloodstains like rust—",
          "that awful memory.",
        ],
      },
      {
        zh: ["スモッグだらけの夜に", "ゆっくりと溶けていく", "退廃的な疲労感と", "彼とビールを飲んだあの夜", "ほっとしたようで不安だった"],
        en: [
          "In a night full of smog,",
          "I melt away, slowly.",
          "A decadent fatigue,",
          "and that night",
          "drinking beer with him.",
          "I felt relieved—",
          "and anxious.",
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
        zh: ["遠い国へ行くと聞きました", "大丈夫だ、わかってる", "君の人生は君のものだ", "いくら叫んでも　最低だ"],
        en: [
          "I heard you’re leaving for a faraway country.",
          "It’s okay, I understand.",
          "Your life belongs to you.",
          "No matter how loudly I shout, it’s still pathetic.",
        ],
      },
      {
        zh: [
          "宝物のような　その笑顔はセピア色になった",
          "淡い雨季の窓辺で　手元の黒いノートに",
          "一緒に見られなかった海を　街を　全部を",
          "目に見えない　果てしない不安を",
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
        zh: ["それから君はいつも", "悲しげに歩いていた", "きっと今の私には", "もう干渉できないことなんだ"],
        en: [
          "After that, you were always",
          "walking as if weighed down by sorrow.",
          "Surely, even the me I am now",
          "can’t interfere, it’s something beyond my reach.",
        ],
      },
      {
        zh: ["対岸の青、海辺の町", "砂浜を歩いている", "もう一回", "君のことを思い出した"],
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
          "嘘みたいに　君がいなければ何も意味がないんだ",
          "淡い雨季の窓辺に　夏だけが残された",
          "なぜ留まらないのかは　もう問い詰めたりしない",
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
          "宝物のような　その笑顔はセピア色になった",
          "淡い雨季の窓辺で　手元の黒いノートに",
          "こんな歌を書いたって　意味がないのなら",
          "明日も将来も期待も　もういらない…",
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
          "なんで3月なのに雪が降るのか",
          "なんで嫌いな人をフォローするのか",
          "なんで都合の悪いことをして後悔するのか",
          "なんでただ謝って全部なかったことにしようとするのか",
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
        zh: ["私", "わからない、わからない", "正解なんて私が知るもんか", "「大人になってない」なんて言い訳だ", "これも嫌なんだ"],
        en: [
          "Me—",
          "I don’t know, I don’t know.",
          "Like I’m supposed to know what the “right answer” is.",
          "“Not grown up yet” is an excuse too,",
          "and I hate that as well.",
        ],
      },
      {
        zh: ["だけど", "知るわけない、知るわけない", "正しいやり方なんて知るわけない", "何年も生きてきたわけじゃないし", "そんなことわかるわけなかった"],
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
        zh: ["同級生に間違ったこと言ってもいいのか", "イヤホンしてるからって　聞こえなくていいのか"],
        en: [
          "Is it okay if I accidentally said the wrong thing to a classmate?",
          "Is it okay to pretend I can’t hear because I’ve got my earphones in?",
        ],
      },
      {
        zh: ["そもそもみんなと溶け合えないのも", "全部自分で選んだんだ", "人間って俗っぽいんだからね", "全部バカみたい"],
        en: [
          "Maybe I was never going to fit in with everyone in the first place.",
          "I chose all of it myself.",
          "Humans are so tacky and petty, you know.",
          "Everything’s just… stupid.",
        ],
      },
      {
        zh: ["ずっと好きな曲と", "ずっと君だけを"],
        en: ["Always the song I loved,", "always you—only you."],
      },
      {
        zh: ["でも全部忘れたいな！！", "あんたも嫌いなんだ！"],
        en: ["But I want to forget everything!!", "I hate you too!"],
      },
      {
        zh: ["いつか", "わかるのか、わかるのか", "道筋なんていつかわかるのか", "大人になってから全部知ったら", "怖すぎるな、ああ"],
        en: [
          "Someday—",
          "Will I understand, will I understand?",
          "Will I ever figure out the route, the steps?",
          "If I only learn everything after I’m “an adult,”",
          "that’s way too terrifying… ah.",
        ],
      },
      {
        zh: ["挫折感にまみれた17歳", "大人の考えてることがわからない", "あんたはそんな声で別れると言った", "すごく傲慢だ"],
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
          "窓辺のあの花はしおれてた",
          "名前ももう忘れてしまった",
          "「ヨル」のつく名前だった気がする",
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
          "「今日はあのカーキ色のコートを着ようか",
          "そのぬくもりはまだ残ってる",
          "もう思い出せないのに　この身体まで",
          "こんな生活に慣れてきた",
          "ベースも、カメラも、手元に残ってる",
          "出かけるなら革靴もここにある",
          "足りないものといえば",
          "そういえば…」",
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
        zh: ["雨、降り注ぐ", "私だけにね", "君は　ここにいない"],
        en: ["Rain—pouring down,", "only on me, right?", "You—", "are not here."],
      },
      {
        zh: ["君に会う夢を見た朝", "心臓が痛くて動けないな", "もっと一緒に暮らしたいのに", "いくら願っても触れられない"],
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
        zh: ["何度も君を描きたい", "他のものなんて全部気にしない", "どうしても離れたくないのに", "思い出にしかならないのかな"],
        en: [
          "Again and again, I tried to draw you,",
          "ignoring everything else.",
          "I don’t want to let go, not ever—",
          "but will you end up only as a memory?",
        ],
      },
      {
        zh: ["どうすればいいのかわからない", "もう何もできないな", "何もいらない"],
        en: [
          "I don’t know what I’m supposed to do.",
          "There’s nothing I can do anymore.",
          "I don’t need anything.",
        ],
      },
      {
        zh: ["空では雨が降ってるけど", "いつか晴れる朝が来るでしょう"],
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
        zh: ["去年の夏、海と梅雨に沿って", "懐かしいのは木漏れ日", "同じような景色を待って", "似た場所に戻りたくない"],
        en: [
          "Along last summer’s sea and the rainy season,",
          "what feels nostalgic is the sunlight through leaves.",
          "Waiting for the same kind of scenery,",
          "yet I don’t want to return to a similar place.",
        ],
      },
      {
        zh: ["ただ、知っておいてほしいことがあるんだ", "それとも誰にも言うべきではなかった"],
        en: [
          "There’s something I want you to know—",
          "or maybe it’s something",
          "I shouldn’t tell anyone at all.",
        ],
      },
      {
        zh: ["なぜなら真実は存在しないから", "置き換えられるのは立場だけ", "目に映るものはみな寄せ集めの一面だ", "ね、客観とは何か"],
        en: [
          "Because truth doesn’t exist.",
          "Only standpoints can be replaced.",
          "Everything we see is just a patchwork surface.",
          "So, what is “objectivity,” anyway?",
        ],
      },
      {
        zh: ["あの日の夢を見てた", "雨が薄く降っていただけ", "世界はまだ続いていくのに", "関係のないことだと思った"],
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
        zh: ["「実はもっと話したかったんだ」", "もう関係ないとしても", "探し求めた答えは望むものではない", "どんなに執着しても"],
        en: [
          "“Actually, I wanted to talk more.”",
          "Even if it doesn’t matter anymore—",
          "the answer I chased",
          "was never the one I wanted,",
          "no matter how tightly I clung.",
        ],
      },
      {
        zh: ["真理の祭壇の前でだけ頭を下げる", "「客観的」な目的性があるようだ", "始まりから終わりまで、触れられないのなら", "流されるしかないな"],
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

  function applyOrchidIntroInEnglish(safeLang) {
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

    if (detailPath !== "music/track-orchid.html") {
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
      '“Orchid” was written for myself.',
      'It was born during a period when I felt constantly torn between academics and the future. On the surface, I was still trying to maintain restraint and composure, but underneath, I was already being worn away by recurring anxiety, restlessness, and confusion. Here, Orchid is not merely a gentle image, but a symbol of an almost stubborn self-possession: purity, elegance, detachment, and a fierce pride that refuses to collapse easily. Precisely because of that, the sorrow hidden beneath a polished exterior eventually found its way into this song.',
      'This sense of contradiction is also preserved in the music itself. My writing has always been shaped by both J-rock and prog metalcore, and these two styles have never been easy to truly merge. One leans toward more sensitive, direct, and emotionally exposed lines; the other toward a more tense, oppressive, and tearing sense of motion. In this song, they are not artificially reconciled, but instead left to coexist in an unstable, slightly conflicted way. That, too, mirrors exactly how I felt when facing the future: unable to fully lean toward either side.',
      'The song was written very quickly, and that speed itself felt like a kind of emotional rupture. At 187 BPM, the verses and main riffs retain a constant sense of tension and inner pulling, while the chorus moves into an atmosphere unlike anything I had written before. Rather than simply pushing forward, it carries a kind of sadness shaped by helplessness, yet still unwilling to stop caring. The melodic line at the end of the chorus, linking the modulation back into the main riff, leaves behind an almost grey-toned sense of uncertainty. The clean guitar solo at the end, the first one I have written, does not try to resolve anything either; instead, it leaves the struggle itself suspended in sound.',
    ];

    intro.innerHTML = paragraphs.join("<br /><br />");
  }

  function applyOrchidLyricsInEnglish(safeLang) {
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

    if (detailPath !== "music/track-orchid.html") {
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
          "久久萦绕在心中的过往",
          "着迷着为了感到伤感而被创造的想象",
          "我到底有什么样的向往？",
          "不可能是可抵达的理想",
        ],
        en: [
          "The past that has lingered in my heart for so long",
          "Enchanted by fantasies created for the sake of feeling sad",
          "What is it that I even long for?",
          "Surely not an ideal I could ever reach",
        ],
      },
      {
        zh: [
          "即使被逃避的冲动驱使",
          "从这里跑出去也是无法抵达任何城市",
          "我明明不是个那样的人",
          "但我又为什么默然应允",
        ],
        en: [
          "Even when driven by the urge to escape",
          "Running away from here would still lead to no place at all",
          "I was never meant to be that kind of person",
          "So why is it that I silently gave in?",
        ],
      },
      {
        zh: ["已经被弄丢的钥匙", "被自己关上的退路"],
        en: [
          "The key already lost",
          "The way back I sealed off with my own hands",
        ],
      },
      {
        zh: [
          "水流向我应该怎么阻绝？",
          "记忆却总是被混乱改头换面真假难解",
          "某一种短暂幻想的死结",
          "随之捉弄我 背叛我 宣泄",
        ],
        en: [
          "How am I supposed to stop the water rushing toward me?",
          "Yet memory is always reshaped by chaos, with truth and falsehood impossible to untangle",
          "A dead knot of some fleeting illusion",
          "Teases me, betrays me, vents itself through me",
        ],
      },
      {
        zh: ["一切都归咎于我", "忙碌、重复、空无一物"],
        en: [
          "Everything is blamed on me",
          "Busyness, repetition, and nothing at all",
        ],
      },
      {
        zh: [
          "不在那里、不在那里",
          "为了所谓脑袋里明白的道理",
          "不合时宜、不合时宜",
          "明明下定决心但却无法言意",
          "不在那里、不在那里",
          "想摧毁一切却无法鼓起勇气",
          "不留痕迹、不留痕迹",
          "干脆直接用这片空白抹杀我的呼吸",
        ],
        en: [
          "It isn’t there, it isn’t there",
          "For the so-called truths my mind claims to understand",
          "Out of place, out of place",
          "I had clearly made up my mind, yet still could not put it into words",
          "It isn’t there, it isn’t there",
          "I want to destroy everything, yet cannot gather the courage",
          "Without a trace, without a trace",
          "I might as well use this blankness to erase my breath altogether",
        ],
      },
    ];

    var part2Blocks = [
      {
        zh: [
          "无论多么困难都会一直",
          "想留下抓痕而目不斜视凝望前方而行",
          "不想输才无动于衷而已",
          "但到底是为了什么意义？",
        ],
        en: [
          "No matter how hard it is, I still keep wanting",
          "To leave claw marks behind, to walk on with my eyes fixed straight ahead",
          "I am only numb because I do not want to lose",
          "But what meaning is any of this for?",
        ],
      },
      {
        zh: [
          "把它埋起来吧我会遗忘",
          "让雨水冲刷之后藏在兜帽下转身离场",
          "对那些放弃的未来来讲",
          "只是排列琴弦上的悲伤",
        ],
        en: [
          "Bury it, I will forget",
          "Let the rain wash over it, then hide beneath my hood and turn away",
          "As for those futures I abandoned,",
          "They are nothing but sorrow laid out along the strings",
        ],
      },
      {
        zh: ["还要我承受多久", "不行、不够、不想认输"],
        en: [
          "How much longer must I endure?",
          "No, not enough, I do not want to lose",
        ],
      },
      {
        zh: [
          "不在那里、不在那里",
          "为了所谓脑袋里明白的道理",
          "不合时宜、不合时宜",
          "无数次重复的日常只剩压抑",
          "不再提及、不再提及",
          "曾经以为那就是梦想的意义",
          "不想回忆、不想回忆",
          "干脆直接用这片空白抹杀我的呼吸",
        ],
        en: [
          "It isn’t there, it isn’t there",
          "For the so-called truths my mind claims to understand",
          "Out of place, out of place",
          "All that remains of those endlessly repeated days is suffocation",
          "Do not mention it, do not mention it",
          "What I once believed to be the meaning of dreams",
          "Do not remember it, do not remember it",
          "I might as well use this blankness to erase my breath altogether",
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

  function applyIpomoeaAlbumIntroInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-album-page")) {
      return;
    }

    var detailPath = (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");

    if (detailPath !== "music/album-ipomoea-alba.html") {
      return;
    }

    var intro = document.querySelector(".album-intro");
    if (!intro) {
      return;
    }

    var paragraphs = [
      "Ipomoea alba blooms in moonlight.",
      "Some emotions do not unfold within the same city.<br />They grow slowly through screens, time zones, and the rare moments when wakefulness aligns,<br />stretched, diluted, kept breathing by promises postponed again and again,<br />until they sink into sea wind and become a tide that resists explanation.",
      "Everything began on a rainy day,<br />between white flowers, damp air, and a black notebook.<br />It belongs neither to daylight nor to interpretation,<br />only to fragments that were never spoken, yet undeniably real.",
      "An entire album can be written out of emotion,<br />while reality owes no matching share in return.",
      "This albu (or more like a collection for now) holds rain, and the sea, and a deep-blue persistence,<br />imagined futures, projections cast onto a distant coastline,<br />the tension between reality and ideal,<br />and, later, an understanding that slowly cools.",
      "No more questions. No more closing in. No more proving meaning through an ending.<br />The sea is still far away, and moonlight still falls on the same surface of water.<br />If these songs are ever heard, it will be enough,<br />someone will know that place once existed.",
      "Note: Some tracks are missing, and some have not been fully re-recorded or revised due to the long time span of the project. Further completion is planned.",
    ];

    intro.innerHTML = paragraphs.map(function (paragraph) {
      return "<p>" + paragraph + "</p>";
    }).join("");
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
        zh: ["「いつのまにか心を奪われていた」", "雨上がりの午後にそう書いた", "窓の外、湿った匂いと夕暮れの中の顔を", "こんな未来を思い描いている"],
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
        zh: ["君がいるから、", "意味のないものにさえ 生きる理由を探してる", "この両手で何も掴めなくても", "あとは二人だけでいい"],
        en: [
          "Because of you,",
          "I keep stitching excuses for the meaningless to exist.",
          "Even if these hands can’t hold on to anything,",
          "let the rest be just the two of us.",
        ],
      },
      {
        zh: ["また果てしない虚無感がやってきた", "人は誰でも必ず死ぬんだよ、", "それを君も知っている", "だからもっとそばにいてくれ"],
        en: [
          "That endless hollowness seems to be coming again.",
          "Everyone dies—you know.",
          "So stay closer to me,",
          "just a little.",
        ],
      },
      {
        zh: ["少しでも欠けているといらいらしてしまう", "これじゃ余計な悩みが増える", "今は正しくなくてももう大丈夫だよ", "「no」がもたらした決意の「yes」…"],
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
        zh: ["浮かんだ心臓も、ヨルガオも", "すべてノートにある", "君の笑顔だけは記録できない"],
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
        zh: ["君がいるから、君がいるから、"],
        en: ["Because you’re here—because you’re here—"],
      },
      {
        zh: ["夜明けにはまだ遠いけど、", "君がいてくれれば、", "今は生きていける", "君もそうでいられるように"],
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
    var compactViewport =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 760px)").matches;

    if (reducedMotion || compactViewport) {
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

  function forceMusicLyricsVisibleOnCompactViewport() {
    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return;
    }

    var compactViewport =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 760px)").matches;

    if (!compactViewport) {
      return;
    }

    Array.from(document.querySelectorAll(".lyrics-showcase")).forEach(function (section) {
      section.classList.remove("is-anim-ready");
      section.classList.add("is-visible");
    });
  }

  function detectPreferredLanguage() {
    if (window.__chronohazePreferredLang === "zh" || window.__chronohazePreferredLang === "en") {
      return window.__chronohazePreferredLang;
    }

    var query = new URLSearchParams(window.location.search).get("lang");
    if (query === "zh" || query === "en") {
      window.__chronohazePreferredLang = query;
      return query;
    }

    try {
      var saved = localStorage.getItem("siteLang");
      if (saved === "zh" || saved === "en") {
        window.__chronohazePreferredLang = saved;
        return saved;
      }

      var homeSaved = localStorage.getItem("chronohaze-lang");
      if (homeSaved === "zh" || homeSaved === "en") {
        window.__chronohazePreferredLang = homeSaved;
        return homeSaved;
      }
    } catch (_err) {
      window.__chronohazePreferredLang = "zh";
      return "zh";
    }

    window.__chronohazePreferredLang = "zh";
    return "zh";
  }

  function persistPreferredLanguage(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    window.__chronohazePreferredLang = safeLang;
    document.documentElement.setAttribute("data-site-lang", safeLang);
    try {
      localStorage.setItem("siteLang", safeLang);
      localStorage.setItem("chronohaze-lang", safeLang);
    } catch (_err) {
      return;
    }
  }

  function ensureAccessibleControlLabels() {
    Array.from(
      document.querySelectorAll(".lang-pill, .floating-lang-switch, .cv-lang-tabs")
    ).forEach(function (panel) {
      panel.setAttribute("aria-label", "Language switch");
    });

    Array.from(
      document.querySelectorAll(
        ".lang-btn[data-lang], .floating-lang-btn[data-lang], .cv-lang-tab[data-lang], [data-cv-lang-tab][data-lang]"
      )
    ).forEach(function (button) {
      var lang = button.getAttribute("data-lang");
      if (lang === "zh") {
        button.setAttribute("aria-label", "Switch site language to Chinese");
      } else if (lang === "en") {
        button.setAttribute("aria-label", "Switch site language to English");
      }
    });

    Array.from(
      document.querySelectorAll(".social a[href], .home-footer-social a[href]")
    ).forEach(function (link) {
      var href = (link.getAttribute("href") || "").toLowerCase();
      if (href.indexOf("instagram.com") >= 0) {
        link.setAttribute("aria-label", "Visit my Instagram profile");
      } else if (href.indexOf("space.bilibili.com") >= 0) {
        link.setAttribute("aria-label", "Visit my Bilibili space");
      } else if (href.indexOf("github.com") >= 0) {
        link.setAttribute("aria-label", "Visit my GitHub profile");
      } else if (href.indexOf("linkedin.com") >= 0) {
        link.setAttribute("aria-label", "Visit my LinkedIn profile");
      }
    });

    var featuredAudioToggle = document.getElementById("audioToggle");
    if (featuredAudioToggle) {
      featuredAudioToggle.setAttribute("aria-label", "Play or pause featured track");
    }
  }

  function ensureExternalLinkTargets() {
    Array.from(document.querySelectorAll("a[href]")).forEach(function (link) {
      var href = (link.getAttribute("href") || "").trim();
      if (!href || href.charAt(0) === "#" || /^mailto:|^tel:/i.test(href)) {
        return;
      }

      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (_error) {
        return;
      }

      if (!/^https?:$/i.test(url.protocol) || url.origin === window.location.origin) {
        return;
      }

      link.setAttribute("target", "_blank");
      var relTokens = new Set(
        String(link.getAttribute("rel") || "")
          .split(/\s+/)
          .filter(Boolean)
      );
      relTokens.add("noopener");
      relTokens.add("noreferrer");
      link.setAttribute("rel", Array.from(relTokens).join(" "));
    });
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

  function normalizeDisplayDateText(text) {
    if (typeof text !== "string" || !text) {
      return text;
    }

    function pad2(value) {
      var n = Number(value);
      if (!isFinite(n)) {
        return String(value);
      }
      return n < 10 ? "0" + n : String(n);
    }

    var next = text;
    var enMonthMap = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      sept: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };

    next = next.replace(
      /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
      function (_m, year, month, day) {
        return year + "-" + pad2(month) + "-" + pad2(day);
      }
    );
    next = next.replace(/(\d{4})年(\d{1,2})月(?!\d)/g, function (_m, year, month) {
      return year + "-" + pad2(month);
    });

    next = next.replace(
      /\b([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})\b/g,
      function (_m, monthWord, day, year) {
        var key = String(monthWord || "").toLowerCase();
        var month = enMonthMap[key];
        if (!month) {
          return _m;
        }
        return year + "-" + month + "-" + pad2(day);
      }
    );

    return next;
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
      [/2022、夏、某/g, "Summer 2022, Somewhere"],
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
      [/阅读全文/g, "Read More"],
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

  function setMetaTagContent(selector, value) {
    if (!selector || typeof value !== "string") return;
    var node = document.querySelector(selector);
    if (node) {
      node.setAttribute("content", value);
    }
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
      "music/track-10.html": "I Can’t Fall in Love Again (恋に落ちてしまえない) (audio pending upload)",
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

  function getMusicInlineTitleOverridesEn() {
    return {
      海底的独白: "A Monologue under the Sea",
    };
  }

  function normalizeMusicDetailPath(href) {
    if (typeof href !== "string" || !href.trim()) {
      return "";
    }

    var clean = href.trim().toLowerCase().split("#")[0].split("?")[0];
    clean = clean.replace(/^https?:\/\/[^/]+\/(?:chronohaze\/)?/, "");
    clean = clean.replace(/^\.\//, "").replace(/^\.\.\//, "");

    if (/^music\/track-[^/]+\.html$/.test(clean)) {
      return clean;
    }

    if (/^track-[^/]+\.html$/.test(clean)) {
      return "music/" + clean;
    }

    return clean;
  }

  function applyMusicAlbumTrackTitlesInEnglish(safeLang) {
    if (safeLang !== "en") {
      return;
    }

    if (!document.body || !document.body.classList.contains("music-album-page")) {
      return;
    }

    var overrides = getMusicTrackTitleOverridesEn();
    var titleTextOverridesEn = getMusicInlineTitleOverridesEn();
    var links = Array.from(document.querySelectorAll(".album-track-link[href]"));
    links.forEach(function (link) {
      var route = normalizeMusicDetailPath(link.getAttribute("href") || "");
      var titleNode = link.querySelector(".album-track-name");
      if (!titleNode) {
        return;
      }

      var featureNode = titleNode.querySelector(".album-track-feature");
      if (featureNode) {
        featureNode.textContent = "✿ Featured";
      }

      var currentTitle = normalizeText(
        Array.from(titleNode.childNodes)
          .filter(function (node) {
            return !(
              node.nodeType === 1 &&
              node.classList &&
              node.classList.contains("album-track-feature")
            );
          })
          .map(function (node) {
            return node.textContent || "";
          })
          .join(" ")
      );

      var nextTitle = overrides[route] || titleTextOverridesEn[currentTitle];
      if (!nextTitle) {
        return;
      }

      var hasFeature = !!featureNode;
      titleNode.textContent = nextTitle;

      if (hasFeature) {
        var feature = document.createElement("span");
        feature.className = "album-track-feature";
        feature.textContent = "✿ Featured";
        titleNode.appendChild(document.createTextNode(" "));
        titleNode.appendChild(feature);
      }
    });
  }

  function ensureMusicAlbumTrackStatuses() {
    if (!document.body || !document.body.classList.contains("music-album-page")) {
      return;
    }

    var dict = getSecondaryPageDictionary(detectPreferredLanguage());
    var safeLang = detectPreferredLanguage();

    Array.from(document.querySelectorAll(".album-tracklist .album-track-link")).forEach(function (row) {
      var noNode = row.querySelector(".album-track-no");
      if (!noNode) {
        return;
      }

      var statusKey = normalizeText(row.getAttribute("data-track-status") || "").toLowerCase();
      if (!statusKey) {
        statusKey = row.classList.contains("is-disabled") ? "coming-soon" : "available";
      }

      var label = dict.statusAvailable || "Available";
      if (statusKey === "coming-soon") {
        label = dict.statusComingSoon || "Coming soon";
      } else if (statusKey === "draft") {
        label = dict.statusDraft || "Draft";
      }

      var chip = noNode.querySelector(".album-track-status");
      if (!chip) {
        chip = document.createElement("span");
        noNode.appendChild(document.createTextNode(" "));
        noNode.appendChild(chip);
      }
      chip.className = "album-track-status music-status-badge status-" + statusKey;
      chip.dataset.statusLang = safeLang;
      chip.textContent = label;
    });
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

  function deriveMusicRowTags(row, catalogItem, type, titleText, artistText) {
    var tags = sanitizeMusicTags(
      splitMusicTags(
        catalogItem && Array.isArray(catalogItem.tags)
          ? catalogItem.tags.join(",")
          : row.dataset.tags || ""
      )
    );

    if (!tags.length && type === "album") {
      tags.push("album");
    }
    if (!tags.length && type === "single") {
      tags.push("single");
    }
    if (/\//.test(artistText || "") || /feat\.?|ft\.?/i.test(titleText || "")) {
      tags.push("collab");
    }

    return uniqueMusicTags(sanitizeMusicTags(tags));
  }

  function filterArchiveMusicTags(tags) {
    return uniqueMusicTags(
      sanitizeMusicTags(tags).filter(function (tag) {
        return tag !== "album" && tag !== "single";
      })
    );
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
    if (!tags.length) {
      if (tagsWrap) {
        tagsWrap.remove();
      }
      return;
    }
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

  function stripPendingAudioMarkerFromTitle(titleNode) {
    if (!titleNode) {
      return;
    }
    var target = titleNode.querySelector("a") || titleNode;
    var text = String(target.textContent || "");
    var next = text
      .replace(/（音频待上传）/g, "")
      .replace(/\(音频待上传\)/g, "")
      .replace(/\(\s*audio pending upload\s*\)/gi, "")
      .trim();
    if (next !== text) {
      target.textContent = next;
    }
  }

  function ensureMusicRowStatusBadge(row, statusKey, label) {
    var dateNode = row.querySelector(".track-date");
    if (!dateNode) {
      return;
    }

    var existing = dateNode.querySelector(".track-status-badge");
    if (!statusKey) {
      if (existing) {
        existing.remove();
      }
      row.classList.remove("track-row-pending");
      return;
    }

    if (!existing) {
      existing = document.createElement("span");
      existing.className = "track-status-badge";
      dateNode.appendChild(document.createTextNode(" "));
      dateNode.appendChild(existing);
    }

    existing.className = "track-status-badge music-status-badge status-" + statusKey;
    existing.dataset.statusLang = detectPreferredLanguage();
    existing.textContent = label || statusKey;
    row.classList.toggle("track-row-pending", statusKey === "pending-audio");
  }

  var musicCatalogLoadPromise = null;
  var musicCatalogByHref = null;

  function normalizeMusicCatalogHref(value) {
    return String(value || "")
      .trim()
      .replace(/^\.\//, "")
      .replace(/^\//, "");
  }

  function getMusicCatalogForRowHref(href) {
    if (!musicCatalogByHref) {
      return null;
    }
    return musicCatalogByHref[normalizeMusicCatalogHref(href)] || null;
  }

  function loadMusicCatalogMetadata() {
    if (musicCatalogByHref) {
      return Promise.resolve(musicCatalogByHref);
    }
    if (musicCatalogLoadPromise) {
      return musicCatalogLoadPromise;
    }

    musicCatalogLoadPromise = fetch("assets/data/music-catalog.json", {
      cache: "no-cache",
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        var items = Array.isArray(payload && payload.items) ? payload.items : [];
        var map = Object.create(null);
        items.forEach(function (item) {
          if (!item || typeof item !== "object") {
            return;
          }
          var key = normalizeMusicCatalogHref(item.url || "");
          if (!key) {
            return;
          }
          map[key] = item;
        });
        updateMusicTrackRoutesFromCatalog(items);
        musicCatalogByHref = map;
        return musicCatalogByHref;
      })
      .catch(function () {
        musicCatalogByHref = Object.create(null);
        return musicCatalogByHref;
      })
      .then(function (result) {
        musicCatalogLoadPromise = null;
        return result;
      });

    return musicCatalogLoadPromise;
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
    var MUSIC_INDEX_STATE_KEY = "chronohaze:music-index-state:v1";
    var musicIndexUrlSyncSuspended = false;
    var musicIndexStateBootstrapped = shell && shell.dataset.musicStateBootstrapped === "1";

    function readMusicIndexUrlState() {
      try {
        var url = new URL(window.location.href);
        return {
          group: url.searchParams.get("group") || "",
          year: url.searchParams.get("year") || "",
          tag: url.searchParams.get("tag") || "",
          audio: url.searchParams.get("audio") || "",
          hasExplicit:
            url.searchParams.has("group") ||
            url.searchParams.has("year") ||
            url.searchParams.has("tag") ||
            url.searchParams.has("audio"),
        };
      } catch (_error) {
        return { group: "", year: "", tag: "", audio: "", hasExplicit: false };
      }
    }

    function readMusicIndexStoredState() {
      try {
        var raw = window.localStorage.getItem(MUSIC_INDEX_STATE_KEY);
        if (!raw) {
          return null;
        }
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
          return null;
        }
        return {
          group: String(parsed.group || ""),
          year: String(parsed.year || ""),
          tag: String(parsed.tag || ""),
          audio: String(parsed.audio || ""),
        };
      } catch (_error) {
        return null;
      }
    }

    function persistMusicIndexState(state) {
      try {
        window.localStorage.setItem(
          MUSIC_INDEX_STATE_KEY,
          JSON.stringify({
            group: String((state && state.group) || "album"),
            year: String((state && state.year) || "all"),
            tag: String((state && state.tag) || "all"),
            audio: String((state && state.audio) || "all"),
          })
        );
      } catch (_error) {}
    }

    function syncMusicIndexUrlState(state) {
      if (musicIndexUrlSyncSuspended) {
        return;
      }
      try {
        var url = new URL(window.location.href);
        var next = {
          group: String((state && state.group) || "album"),
          year: String((state && state.year) || "all"),
          tag: String((state && state.tag) || "all"),
          audio: String((state && state.audio) || "all"),
        };
        if (next.group && next.group !== "album") url.searchParams.set("group", next.group);
        else url.searchParams.delete("group");
        if (next.year && next.year !== "all") url.searchParams.set("year", next.year);
        else url.searchParams.delete("year");
        if (next.tag && next.tag !== "all") url.searchParams.set("tag", next.tag);
        else url.searchParams.delete("tag");
        if (next.audio && next.audio !== "all") url.searchParams.set("audio", next.audio);
        else url.searchParams.delete("audio");
        history.replaceState(history.state, "", url.toString());
      } catch (_error) {}
    }

    var urlState = readMusicIndexUrlState();
    var storedState = urlState.hasExplicit ? null : readMusicIndexStoredState();
    var initialMusicIndexState = {
      group: (urlState.group || (storedState && storedState.group) || "album").toLowerCase(),
      year: urlState.year || (storedState && storedState.year) || "all",
      tag: (urlState.tag || (storedState && storedState.tag) || "all").toLowerCase(),
      audio: (urlState.audio || (storedState && storedState.audio) || "all").toLowerCase(),
    };
    var featuredBlueprint = [
      {
        href: "music/album-ipomoea-alba.html",
        kind: "album",
        accent: "#5f76a0",
        accentSoft: "#1f2a45",
        image: "assets/template/ipomoea-alba-feature-cover.jpg",
        overlayStart: "0",
        overlayMid: "0",
        overlayEnd: "0",
        copyZh:
          "雨季、白色花朵、大海、执念。Ipomoea alba在月光里开放。有些情绪并不发生在同一座城市，它们通过屏幕、时差和偶然对齐的清醒时刻缓慢生长……",
        copyEn:
          "Rain, white flowers, sea, deep-blue persistence. Ipomoea alba blooms in moonlight; some feelings grow slowly across screens, distance, and misaligned time…",
      },
      {
        href: "music/track-04.html",
        kind: "track",
        accent: "#2a3657",
        accentSoft: "#121826",
        image: "assets/template/affizieren-cover.jpg",
        imagePosition: "100% center",
        overlayStart: "0",
        overlayMid: "0",
        overlayEnd: "0",
        copyZh: "被世界轻触后留下的纹理",
        copyEn: "A signature progcore track with restrained cold-blue tension.",
      },
      {
        href: "music/track-02.html",
        kind: "track",
        accent: "#d8d0bf",
        accentSoft: "#5e5b4f",
        image: "assets/template/he-and-me-cover.jpg",
        useInlineArt: true,
        artPosition: "78% center",
        artScale: "1.18",
        copyZh: "梦醒后还没散尽的对话",
        copyEn: "A warm white-and-pale-grey retrospective with restrained understanding.",
      },
    ];
    var rowByHref = Object.create(null);
    rows.forEach(function (row) {
      var key = normalizeMusicCatalogHref(row.getAttribute("data-href") || "");
      if (key && !rowByHref[key]) {
        rowByHref[key] = row;
      }
    });

    function restoreMusicIndexFallback() {
      sourceList.hidden = false;
      sourceList.classList.remove("music-list-source");
      if (rootSection && sourceList.parentNode !== rootSection) {
        rootSection.textContent = "";
        rootSection.appendChild(sourceList);
      }
      if (shell && shell.parentNode && shell.parentNode !== rootSection) {
        shell.parentNode.removeChild(shell);
      }
    }

    function buildMusicFeaturedSection(currentDict) {
      var lang = detectPreferredLanguage() === "en" ? "en" : "zh";
      var section = document.createElement("section");
      section.className = "music-featured";

      var head = document.createElement("div");
      head.className = "music-featured-head";

      var title = document.createElement("h3");
      title.className = "music-featured-title";
      title.dataset.musicFeaturedTitle = "1";
      title.textContent = currentDict.musicSectionFeaturedTitle || "Featured";

      var lead = document.createElement("p");
      lead.className = "music-featured-lead";
      lead.dataset.musicFeaturedLead = "1";
      lead.textContent = currentDict.musicSectionFeaturedLead || "";

      head.appendChild(title);
      head.appendChild(lead);

      var grid = document.createElement("div");
      grid.className = "music-featured-grid";
      grid.dataset.musicFeaturedGrid = "1";

      featuredBlueprint.forEach(function (item) {
        var card = document.createElement("article");
        card.className = "music-featured-card";
        card.dataset.featureHref = item.href;
        card.dataset.featureKind = item.kind;
        if (item.kind === "album") {
          card.classList.add("is-hero");
        }

        var link = document.createElement("a");
        link.className = "music-featured-link";
        link.href = item.href;

        var cover = document.createElement("span");
        cover.className = "music-featured-cover";
        cover.style.setProperty("--feature-accent", item.accent);
        cover.style.setProperty("--feature-accent-soft", item.accentSoft);
        if (item.image) {
          if (item.useInlineArt) {
            cover.classList.add("has-inline-art");
            var art = document.createElement("img");
            art.className = "music-featured-cover-art";
            art.src = item.image;
            art.alt = "";
            art.decoding = "async";
            art.loading = item.kind === "album" ? "eager" : "lazy";
            if (item.artPosition) {
              art.style.objectPosition = item.artPosition;
            }
            if (item.artScale) {
              art.style.transform = "scale(" + item.artScale + ")";
            }
            cover.appendChild(art);
          } else {
            cover.classList.add("has-image");
            cover.style.setProperty("--feature-image-url", 'url("' + item.image + '")');
            if (item.imagePosition) {
              cover.style.setProperty("--feature-image-position", item.imagePosition);
            }
            if (item.imageSize) {
              cover.style.setProperty("--feature-image-size", item.imageSize);
            }
            if (item.overlayStart) {
              cover.style.setProperty("--feature-overlay-start", item.overlayStart);
            }
            if (item.overlayMid) {
              cover.style.setProperty("--feature-overlay-mid", item.overlayMid);
            }
            if (item.overlayEnd) {
              cover.style.setProperty("--feature-overlay-end", item.overlayEnd);
            }
          }
        }

        var chip = document.createElement("span");
        chip.className = "music-featured-chip";
        chip.dataset.featureChip = "1";
        chip.textContent =
          item.kind === "album"
            ? currentDict.musicFeatureAlbumLabel || "Featured album"
            : currentDict.musicFeatureTrackLabel || "Featured track";
        cover.appendChild(chip);

        var meta = document.createElement("span");
        meta.className = "music-featured-meta";

        var itemTitle = document.createElement("strong");
        itemTitle.className = "music-featured-item-title";
        itemTitle.dataset.featureTitle = "1";

        var itemArtist = document.createElement("span");
        itemArtist.className = "music-featured-item-artist";
        itemArtist.dataset.featureArtist = "1";

        var itemCopy = document.createElement("span");
        itemCopy.className = "music-featured-item-copy";
        itemCopy.textContent = lang === "en" ? item.copyEn : item.copyZh;

        meta.appendChild(itemTitle);
        meta.appendChild(itemArtist);
        meta.appendChild(itemCopy);

        link.appendChild(cover);
        link.appendChild(meta);
        card.appendChild(link);
        grid.appendChild(card);
      });

      section.appendChild(head);
      section.appendChild(grid);
      return section;
    }

    function syncMusicFeaturedCards(currentShell, currentDict) {
      var lang = detectPreferredLanguage() === "en" ? "en" : "zh";
      var titleNode = currentShell.querySelector("[data-music-featured-title]");
      var leadNode = currentShell.querySelector("[data-music-featured-lead]");
      if (titleNode) {
        titleNode.textContent = currentDict.musicSectionFeaturedTitle || "Featured";
      }
      if (leadNode) {
        leadNode.textContent = currentDict.musicSectionFeaturedLead || "";
      }

      Array.from(currentShell.querySelectorAll(".music-featured-card")).forEach(function (card) {
        var href = card.getAttribute("data-feature-href") || "";
        var kind = card.getAttribute("data-feature-kind") || "track";
        var blueprint = featuredBlueprint.find(function (item) {
          return item.href === href;
        });
        var row = rowByHref[normalizeMusicCatalogHref(href)];
        var title = "";
        var artist = "";

        if (row) {
          var titleSource = row.querySelector(".track-title");
          var artistSource = row.querySelector(".track-artist");
          title = normalizeText(titleSource ? titleSource.textContent || "" : "");
          artist = normalizeText(artistSource ? artistSource.textContent || "" : "");
        }

        var titleTarget = card.querySelector("[data-feature-title]");
        var artistTarget = card.querySelector("[data-feature-artist]");
        var chipTarget = card.querySelector("[data-feature-chip]");
        var copyTarget = card.querySelector(".music-featured-item-copy");

        if (chipTarget) {
          chipTarget.textContent =
            kind === "album"
              ? currentDict.musicFeatureAlbumLabel || "Featured album"
              : currentDict.musicFeatureTrackLabel || "Featured track";
        }
        if (titleTarget) {
          titleTarget.textContent = title || href;
        }
        if (artistTarget) {
          artistTarget.textContent = artist;
          artistTarget.hidden = !artist;
        }
        if (copyTarget && blueprint) {
          copyTarget.textContent = lang === "en" ? blueprint.copyEn : blueprint.copyZh;
        }
      });
    }

    function applyMusicIndexArchitecture(catalogMap) {
      catalogMap = catalogMap || Object.create(null);

      if (!shell) {
        shell = document.createElement("div");
        shell.className = "container music-ia-shell";

        var featured = buildMusicFeaturedSection(dict);

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
          if (item.key === "album") {
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

        shell.appendChild(featured);
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
      var singleYearGroupMap = Object.create(null);

      albumList.textContent = "";
      singlesList.textContent = "";

      function getOrCreateSingleYearGroup(year) {
        var key = String(year || "").trim() || "unknown";
        if (singleYearGroupMap[key]) {
          return singleYearGroupMap[key];
        }

        var wrap = document.createElement("section");
        wrap.className = "music-year-group";
        wrap.dataset.yearGroup = key;

        var head = document.createElement("div");
        head.className = "music-year-group-head";

        var title = document.createElement("h4");
        title.className = "music-year-group-title";
        title.textContent = key === "unknown" ? dict.musicYearUnknown : key;

        var count = document.createElement("span");
        count.className = "music-year-group-count";
        count.dataset.yearGroupCount = key;

        head.appendChild(title);
        head.appendChild(count);

        var list = document.createElement("div");
        list.className = "music-year-group-list";
        list.dataset.yearGroupList = key;

        wrap.appendChild(head);
        wrap.appendChild(list);
        singlesList.appendChild(wrap);

        singleYearGroupMap[key] = {
          wrap: wrap,
          head: head,
          title: title,
          count: count,
          list: list,
        };
        return singleYearGroupMap[key];
      }

      rows.forEach(function (row) {
        try {
          var titleNode = row.querySelector(".track-title");
          var artistNode = row.querySelector(".track-artist");
          var titleText = titleNode ? titleNode.textContent || "" : "";
          var artistText = artistNode ? artistNode.textContent || "" : "";
          var rowHref = row.getAttribute("data-href") || "";
          var catalogItem = getMusicCatalogForRowHref(rowHref) || catalogMap[normalizeMusicCatalogHref(rowHref)];

          var type =
            (catalogItem && catalogItem.type) ||
            row.dataset.musicType ||
            inferMusicRowType(row, titleText);
          var hasAudio =
            catalogItem && typeof catalogItem.has_audio === "boolean"
              ? (catalogItem.has_audio ? "1" : "0")
              : /音频待上传|audio pending upload/i.test(titleText || "")
                ? "0"
                : "1";
          var year =
            (catalogItem && String(catalogItem.year || "").trim()) ||
            row.dataset.musicYear ||
            parseMusicRowYear(row);
          var tags = sanitizeMusicTags(
            splitMusicTags(
              catalogItem && Array.isArray(catalogItem.tags)
                ? catalogItem.tags.join(",")
                : row.dataset.tags || ""
            )
          );

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
          stripPendingAudioMarkerFromTitle(titleNode);
          ensureMusicRowStatusBadge(
            row,
            hasAudio === "0" ? "pending-audio" : "",
            dict.musicStatusPendingAudio
          );

          ensureMusicRowTags(row, tags, dict);

          if (year) {
            yearValues.push(year);
          }
          tagValues = tagValues.concat(tags);

          if (type === "album") {
            albumList.appendChild(row);
          } else {
            getOrCreateSingleYearGroup(year).list.appendChild(row);
          }
        } catch (rowError) {
          if (window.console && typeof window.console.error === "function") {
            window.console.error("[Chronohaze] music row build failed:", row, rowError);
          }
        }
      });

      syncMusicFeaturedCards(shell, dict);

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

      if (!musicIndexStateBootstrapped) {
        var targetGroup =
          initialMusicIndexState.group === "single" || initialMusicIndexState.group === "album"
            ? initialMusicIndexState.group
            : "album";
        tabs.forEach(function (tab) {
          tab.classList.toggle("is-active", tab.dataset.groupFilter === targetGroup);
        });

        if (
          initialMusicIndexState.year &&
          Array.from(yearSelect.options).some(function (opt) { return opt.value === initialMusicIndexState.year; })
        ) {
          yearSelect.value = initialMusicIndexState.year;
        }
        if (
          initialMusicIndexState.tag &&
          Array.from(tagSelect.options).some(function (opt) { return opt.value === initialMusicIndexState.tag; })
        ) {
          tagSelect.value = initialMusicIndexState.tag;
        }
        if (
          initialMusicIndexState.audio &&
          Array.from(audioSelect.options).some(function (opt) { return opt.value === initialMusicIndexState.audio; })
        ) {
          audioSelect.value = initialMusicIndexState.audio;
        }

        shell.dataset.musicStateBootstrapped = "1";
        musicIndexStateBootstrapped = true;
      }

      function activeGroupFilter() {
        var active = shell.querySelector(".music-ia-tab.is-active");
        return active ? active.dataset.groupFilter : "album";
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

        Array.from(singlesList.querySelectorAll(".music-year-group")).forEach(function (yearGroup) {
          var yearRows = Array.from(yearGroup.querySelectorAll(".track-row"));
          var yearVisibleCount = yearRows.filter(function (row) {
            return !row.hidden;
          }).length;
          var yearCountNode = yearGroup.querySelector(".music-year-group-count");
          if (yearCountNode) {
            yearCountNode.textContent = yearVisibleCount > 0 ? String(yearVisibleCount) : "0";
          }
          var shouldHide =
            groupFilter !== "single" || yearVisibleCount === 0;
          yearGroup.hidden = shouldHide;
          yearGroup.classList.toggle("is-filter-hidden", shouldHide);
        });

        emptyState.hidden = visibleTotal > 0;

        var stateSnapshot = {
          group: groupFilter,
          year: yearFilter,
          tag: tagFilter,
          audio: audioFilter,
        };
        persistMusicIndexState(stateSnapshot);
        syncMusicIndexUrlState(stateSnapshot);
      }

      if (shell.dataset.musicFiltersBound !== "1") {
        tabs.forEach(function (tab) {
          bindResponsivePress(tab, function () {
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

    loadMusicCatalogMetadata()
      .then(function (catalogMap) {
        try {
          withMutationRefreshSuppressed(function () {
            applyMusicIndexArchitecture(catalogMap);
          });
        } catch (error) {
          restoreMusicIndexFallback();
          throw error;
        }
      })
      .catch(function () {
        restoreMusicIndexFallback();
      });
  }

  function setupMusicIndexListeningRoom() {
    if (!document.body || !document.body.classList.contains("music-index-page")) {
      return;
    }

    var rootSection = document.querySelector(".music-index-page .section");
    var sourceList = document.querySelector(".music-index-page .section .music-list");
    if (!rootSection || !sourceList) {
      return;
    }

    var preferredLang = detectPreferredLanguage();
    var lang = preferredLang === "en" ? "en" : "zh";
    var dict = getSecondaryPageDictionary(preferredLang);
    var rows = Array.from(sourceList.querySelectorAll(".track-row"));
    if (!rows.length) {
      return;
    }

    var featuredAlbum = {
      href: "music/album-ipomoea-alba.html",
      image: "assets/template/ipomoea-alba-album-cover.jpg",
      eyebrowZh: "主推专辑",
      eyebrowEn: "Featured album",
      summaryZh: "雨、海、深蓝色的执念。",
      summaryEn: "Rain, sea, and a deep-blue persistence.",
      quoteZh: "不再追问，不再逼近，不再用结局证明意义。",
      quoteEn: "No more pressing for an ending to prove meaning.",
      detailZh: "15 首曲目 · 专辑页",
      detailEn: "15 tracks · album page",
    };

    var selectedTracks = [
      {
        href: "music/track-04.html",
        image: "assets/template/affizieren-cover.jpg",
        position: "100% center",
        scale: 1.2,
        tagsZh: ["前卫核", "情绪张力", "蓝灰"],
        tagsEn: ["progressive", "emotional", "blue-grey"],
        noteZh: "奇数拍碎片、低频骨架与情绪化旋律线交错。像被雨打碎的愿景，在深蓝灰白里涨潮。",
        noteEn:
          "Odd-meter fragments, low-end scaffolding, and emotional melody lines crossing each other. A vision shattered by rain, rising in deep blue-grey-white tide.",
      },
      {
        href: "music/track-02.html",
        image: "assets/template/he-and-me-cover.jpg",
        position: "78% center",
        scale: 1.22,
        tagsZh: ["叙事", "未决", "私密"],
        tagsEn: ["narrative", "unresolved", "intimate"],
        noteZh: "梦醒后仍未散尽的对话。关于理解、距离，以及无法真正完成的和解。",
        noteEn:
          "A conversation still lingering after waking. About understanding, distance, and a reconciliation that can never fully be completed.",
      },
      {
        href: "music/track-20.html",
        image: "assets/template/supernova-cover.jpg",
        position: "center center",
        scale: 1.14,
        tagsZh: ["深蓝", "膨胀", "内部坍缩"],
        tagsEn: ["deep blue", "expansion", "collapse"],
        noteZh: "极深的蓝，膨胀后的失重。一次尚未命名的内部坍缩。",
        noteEn:
          "An extremely deep blue, weightlessness after expansion. An inward collapse still unnamed.",
      },
      {
        href: "music/track-01.html",
        image: "assets/template/sincerely-spring-art.jpg",
        position: "center center",
        scale: 1.14,
        tagsZh: ["春天", "凝望", "透明蓝"],
        tagsEn: ["spring", "gaze", "clear blue"],
        noteZh: "淡绿、透明的蓝色与空气里静静的光。一首关于春日微风的轻轻呢喃。",
        noteEn:
          "Pale green, transparent blue, and quiet light in the air. A soft murmur about spring breeze.",
      },
      {
        href: "music/track-orchid.html",
        image: "assets/images/music/orchid/orchid-art-01.jpg",
        position: "center center",
        scale: 1.16,
        tagsZh: ["新制作", "重制中", "夜花"],
        tagsEn: ["new production", "WIP", "night flower"],
        noteZh: "焦灼与自持在静默中开放，然后在兰花的克制中缓慢展开。",
        noteEn:
          "Tension and self-restraint opening in silence, then slowly unfolding in the discipline of an orchid.",
      },
    ];

    function textFor(zhValue, enValue) {
      return lang === "en" ? enValue : zhValue;
    }

    function createElement(tagName, className, text) {
      var node = document.createElement(tagName);
      if (className) {
        node.className = className;
      }
      if (typeof text === "string") {
        node.textContent = text;
      }
      return node;
    }

    function collapseDisplayText(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function buildSectionHead(kicker, title, lead) {
      var head = createElement("div", "music-room-section-head");
      if (kicker) {
        head.appendChild(createElement("span", "music-room-section-kicker", kicker));
      }
      if (title) {
        head.appendChild(createElement("h2", "music-room-section-title", title));
      }
      if (lead) {
        head.appendChild(createElement("p", "music-room-section-lead", lead));
      }
      return head;
    }

    function getRowMeta(row) {
      var href = normalizeMusicCatalogHref(row.getAttribute("data-href") || "");
      var catalogItem = getMusicCatalogForRowHref(href) || null;
      var titleNode = row.querySelector(".track-title");
      var artistNode = row.querySelector(".track-artist");
      var dateNode = row.querySelector(".track-date");
      var rawTitle = titleNode ? titleNode.textContent || "" : "";
      var rawArtist = artistNode ? artistNode.textContent || "" : "";
      var rawDate = dateNode ? dateNode.textContent || "" : "";
      var type =
        (catalogItem && catalogItem.type) ||
        row.dataset.musicType ||
        inferMusicRowType(row, rawTitle);
      var hasAudio =
        catalogItem && typeof catalogItem.has_audio === "boolean"
          ? !!catalogItem.has_audio
          : !/音频待上传|audio pending upload/i.test(rawTitle);
      var tags = deriveMusicRowTags(row, catalogItem, type, rawTitle, rawArtist);
      return {
        row: row,
        href: href,
        type: type,
        hasAudio: hasAudio,
        year:
          (catalogItem && String(catalogItem.year || "").trim()) ||
          row.dataset.musicYear ||
          parseMusicRowYear(row) ||
          "",
        date: collapseDisplayText((catalogItem && catalogItem.date) || rawDate),
        title: collapseDisplayText(rawTitle),
        artist: collapseDisplayText(rawArtist),
        tags: tags,
        archiveTags: filterArchiveMusicTags(tags),
      };
    }

    function applyArchiveStatus(row, meta) {
      row.classList.remove(
        "track-row-pending",
        "track-row-listen",
        "track-row-notes",
        "track-row-unreleased",
        "track-row-wip"
      );

      stripPendingAudioMarkerFromTitle(row.querySelector(".track-title"));

      ensureMusicRowTags(row, meta.archiveTags || [], dict);

      var statusKey = "";
      var statusLabel = "";
      if (!meta.hasAudio) {
        statusKey = "unreleased";
        statusLabel = dict.musicStatusUnreleased || textFor("未完成", "Unreleased");
        row.classList.add("track-row-unreleased");
      }

      ensureMusicRowStatusBadge(row, statusKey, statusLabel);
      row.dataset.roomStatus = statusKey;
      row.dataset.musicType = meta.type;
      row.dataset.musicYear = meta.year;
      row.dataset.tags = (meta.tags || []).join(",");
      row.dataset.archiveTags = (meta.archiveTags || []).join(",");
    }

    function buildFeaturedAlbum(rowMeta, blueprint) {
      var section = createElement("section", "music-room-featured");
      var featuredLead =
        typeof dict.musicFeaturedAlbumLead === "string"
          ? dict.musicFeaturedAlbumLead
          : textFor(
              "先听主推专辑，再读它留下的 liner notes。",
              "Start with the central record, then read the liner notes it leaves behind."
            );
      section.appendChild(
        buildSectionHead(
          textFor("FEATURED", "FEATURED"),
          dict.musicFeaturedAlbumTitle || textFor("Featured Album", "Featured Album"),
          featuredLead
        )
      );

      var article = createElement("article", "music-room-album");
      var link = createElement("a", "music-room-album-link");
      link.href = blueprint.href;

      var cover = createElement("span", "music-room-album-cover");
      var image = document.createElement("img");
      image.src = blueprint.image;
      image.alt = rowMeta.title;
      image.loading = "eager";
      image.decoding = "async";
      cover.appendChild(image);

      var meta = createElement("div", "music-room-album-meta");
      meta.appendChild(
        createElement(
          "span",
          "music-room-badge",
          textFor(blueprint.eyebrowZh, blueprint.eyebrowEn)
        )
      );
      meta.appendChild(createElement("h3", "music-room-album-title", rowMeta.title));
      meta.appendChild(
        createElement(
          "p",
          "music-room-album-detail",
          textFor(blueprint.detailZh, blueprint.detailEn)
        )
      );
      meta.appendChild(
        createElement(
          "p",
          "music-room-album-summary",
          textFor(blueprint.summaryZh, blueprint.summaryEn)
        )
      );
      meta.appendChild(
        createElement(
          "p",
          "music-room-album-quote",
          textFor(blueprint.quoteZh, blueprint.quoteEn)
        )
      );

      link.appendChild(cover);
      link.appendChild(meta);
      article.appendChild(link);
      section.appendChild(article);
      return section;
    }

    function buildSelectedTracks(rowMetaMap, blueprints) {
      var section = createElement("section", "music-room-selected");
      section.appendChild(
        buildSectionHead(
          textFor("SELECTED", "SELECTED"),
          dict.musicSelectedTitle || textFor("Selected Tracks", "Selected Tracks"),
          dict.musicSelectedLead ||
            ""
        )
      );

      var grid = createElement("div", "music-room-selected-grid");

      blueprints.forEach(function (item) {
        var rowMeta = rowMetaMap[normalizeMusicCatalogHref(item.href)];
        if (!rowMeta) {
          return;
        }

        var card = createElement("article", "music-room-track-card");
        var link = createElement("a", "music-room-track-link");
        link.href = item.href;

        var cover = createElement("span", "music-room-track-cover");
        var img = document.createElement("img");
        img.src = item.image;
        img.alt = rowMeta.title;
        img.loading = "lazy";
        img.decoding = "async";
        if (item.position) {
          cover.style.setProperty("--music-room-track-cover-position", item.position);
          img.style.objectPosition = item.position;
        }
        if (item.scale) {
          cover.style.setProperty("--music-room-track-cover-scale", String(item.scale));
        }
        cover.appendChild(img);

        var meta = createElement("span", "music-room-track-meta");
        meta.appendChild(createElement("strong", "music-room-track-title", rowMeta.title));
        meta.appendChild(createElement("span", "music-room-track-artist", rowMeta.artist));

        var tags = createElement("span", "music-room-track-tags");
        (lang === "en" ? item.tagsEn : item.tagsZh).forEach(function (tag) {
          tags.appendChild(createElement("span", "music-room-track-tag", tag));
        });
        meta.appendChild(tags);
        meta.appendChild(
          createElement(
            "span",
            "music-room-track-note",
            textFor(item.noteZh, item.noteEn)
          )
        );

        link.appendChild(cover);
        link.appendChild(meta);
        card.appendChild(link);
        grid.appendChild(card);
      });

      section.appendChild(grid);
      return section;
    }

    function buildProductionNotes() {
      var section = createElement("section", "music-room-production");
      section.appendChild(
        buildSectionHead(
          textFor("PRODUCTION", "PRODUCTION"),
          dict.musicProductionTitle || textFor("Production Notes", "Production Notes"),
          dict.musicProductionLead || ""
        )
      );

      var body = createElement("div", "music-room-production-body");
      body.appendChild(
        createElement(
          "p",
          "music-room-production-copy",
          dict.musicProductionParagraph ||
            textFor(
              "大多数作品都由我独立完成，从写作、编曲到贝斯、吉他、主唱修整、编程与混音。对我而言，制作本身就是作曲的一部分：吉他音色、低频设计、节奏密度与空间感，都会被直接写进歌曲的情绪结构里。",
              "Most tracks are self-produced, from songwriting and arrangement to bass, guitar, vocal editing, programming, and mixing. I treat production as part of composition: guitar tones, low-end design, rhythm density, and space are written into the emotional structure of the song."
            )
        )
      );
      section.appendChild(body);
      return section;
    }

    function buildArchive(rowMetaMap) {
      var section = createElement("section", "music-room-archive");
      section.appendChild(
        buildSectionHead(
          textFor("ARCHIVE", "ARCHIVE"),
          dict.musicArchiveTitle || textFor("Archive", "Archive"),
          dict.musicArchiveLead ||
            ""
        )
      );

      var stack = createElement("div", "music-room-archive-stack");
      var albumMetas = [];
      var singleMetas = [];
      var archiveMetas = [];
      var tagValues = [];

      rows.forEach(function (row) {
        var meta = rowMetaMap[normalizeMusicCatalogHref(row.getAttribute("data-href") || "")];
        if (!meta) {
          return;
        }
        applyArchiveStatus(row, meta);
        archiveMetas.push(meta);
        tagValues = tagValues.concat(meta.archiveTags || []);
        if (meta.type === "album") {
          albumMetas.push(meta);
        } else {
          singleMetas.push(meta);
        }
      });

      function buildArchiveGroup(titleText) {
        var group = createElement("section", "music-room-archive-group");
        var head = createElement("div", "music-room-archive-group-head");
        head.appendChild(createElement("h3", "music-room-archive-group-title", titleText));
        var list = createElement("div", "music-room-archive-list");
        group.appendChild(head);
        group.appendChild(list);
        return { group: group, list: list };
      }

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

        if (
          Array.from(selectNode.options).some(function (opt) {
            return opt.value === current;
          })
        ) {
          selectNode.value = current;
        } else {
          selectNode.value = "all";
        }
      }

      var tagOrder = [
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

      if (tagValues.length) {
        var controls = createElement("div", "music-ia-filters music-room-archive-filters");
        var filter = createElement("label", "music-ia-filter music-room-archive-filter");
        var filterLabel = createElement(
          "span",
          "music-ia-filter-label",
          dict.musicArchiveFilterStyle || textFor("曲风", "Style")
        );
        var filterSelect = document.createElement("select");
        filterSelect.className = "music-ia-filter-select music-room-archive-filter-select";
        filter.appendChild(filterLabel);
        filter.appendChild(filterSelect);
        controls.appendChild(filter);
        section.appendChild(controls);

        fillSelect(
          filterSelect,
          dict.musicArchiveFilterAllStyles || textFor("全部曲风", "All styles"),
          tagValues,
          function (tag) {
            return getMusicTagLabel(tag, dict);
          }
        );

        filterSelect.addEventListener("change", applyArchiveFilters);
      }

      if (albumMetas.length) {
        var albumGroup = buildArchiveGroup(
          dict.musicArchiveCollectionTitle || textFor("Collections", "Collections")
        );
        albumMetas.forEach(function (meta) {
          albumGroup.list.appendChild(meta.row);
        });
        stack.appendChild(albumGroup.group);
      }

      var yearOrder = [];
      var yearMap = Object.create(null);
      singleMetas.forEach(function (meta) {
        var year = String(meta.year || "").trim() || "Unknown";
        if (!yearMap[year]) {
          yearMap[year] = [];
          yearOrder.push(year);
        }
        yearMap[year].push(meta);
      });

      yearOrder.sort(function (a, b) {
        if (a === "Unknown") {
          return 1;
        }
        if (b === "Unknown") {
          return -1;
        }
        return Number(b) - Number(a);
      });

      yearOrder.forEach(function (year) {
        var yearGroup = buildArchiveGroup(year === "Unknown" ? dict.musicYearUnknown : year);
        yearMap[year].forEach(function (meta) {
          yearGroup.list.appendChild(meta.row);
        });
        stack.appendChild(yearGroup.group);
      });

      function applyArchiveFilters() {
        var filterSelect = section.querySelector(".music-room-archive-filter-select");
        var tagFilter = filterSelect ? filterSelect.value || "all" : "all";

        archiveMetas.forEach(function (meta) {
          var rowTags = meta.archiveTags || [];
          var visible = tagFilter === "all" || rowTags.indexOf(tagFilter) >= 0;
          meta.row.hidden = !visible;
          meta.row.classList.toggle("is-filter-hidden", !visible);
        });

        Array.from(stack.querySelectorAll(".music-room-archive-group")).forEach(function (group) {
          var groupRows = Array.from(group.querySelectorAll(".track-row"));
          var visibleCount = groupRows.filter(function (row) {
            return !row.hidden;
          }).length;
          group.hidden = visibleCount === 0;
          group.classList.toggle("is-filter-hidden", visibleCount === 0);
        });
      }

      section.appendChild(stack);
      applyArchiveFilters();
      return section;
    }

    var rowMetaMap = Object.create(null);
    rows.forEach(function (row) {
      var meta = getRowMeta(row);
      if (meta.href) {
        rowMetaMap[meta.href] = meta;
      }
    });

    var backgroundSection = document.querySelector(".music-background");
    var afterwordSection = document.querySelector(".music-afterword");
    var existingArchiveSection = document.querySelector(".music-room-archive-section");
    if (existingArchiveSection && existingArchiveSection.parentNode) {
      existingArchiveSection.parentNode.removeChild(existingArchiveSection);
    }

    var shell = createElement("div", "container music-room-shell");
    var featuredMeta = rowMetaMap[normalizeMusicCatalogHref(featuredAlbum.href)];
    if (featuredMeta) {
      shell.appendChild(buildFeaturedAlbum(featuredMeta, featuredAlbum));
    }
    shell.appendChild(buildSelectedTracks(rowMetaMap, selectedTracks));
    shell.appendChild(buildProductionNotes());

    rootSection.textContent = "";
    rootSection.appendChild(shell);

    var archiveWrapper = createElement("section", "section music-room-archive-section");
    var archiveShell = createElement(
      "div",
      "container music-room-shell music-room-archive-shell"
    );
    archiveShell.appendChild(buildArchive(rowMetaMap));
    archiveWrapper.appendChild(archiveShell);

    if (backgroundSection && backgroundSection.parentNode) {
      backgroundSection.parentNode.insertBefore(
        archiveWrapper,
        afterwordSection || backgroundSection.nextSibling
      );
    } else if (rootSection.parentNode) {
      rootSection.parentNode.insertBefore(
        archiveWrapper,
        afterwordSection || rootSection.nextSibling
      );
    }
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

  function getPrimaryPageHref(pageKey) {
    var path = (window.location.pathname || "").toLowerCase();
    var prefix = /\/(music|photo|post)\//.test(path) ? "../" : "";
    var hrefMap = {
      home: "index.html",
      academic: "academic.html",
      photo: "photography.html",
      music: "music.html",
      cv: "cv.html",
      search: "search.html",
    };
    return prefix + (hrefMap[pageKey] || "index.html");
  }

  function ensureSearchNavLink() {
    var navOrder = ["home", "academic", "photo", "music", "cv", "search"];
    var navLabelMap = {
      home: "主页",
      academic: "学术",
      photo: "摄影",
      music: "音乐",
      cv: "CV",
      search: "搜索",
    };

    Array.from(document.querySelectorAll(".site-header .nav")).forEach(function (nav) {
      var currentKey = getPrimaryNavKeyFromHref(window.location.pathname || "");
      var previousByKey = Object.create(null);

      Array.from(nav.querySelectorAll("a")).forEach(function (link) {
        var key = getPrimaryNavKeyFromHref(link.getAttribute("href") || "");
        if (key && !previousByKey[key]) {
          previousByKey[key] = link;
        }
      });

      nav.textContent = "";

      navOrder.forEach(function (key) {
        var link = previousByKey[key] || document.createElement("a");
        link.href = getPrimaryPageHref(key);
        link.setAttribute("data-nav-key", key);
        link.textContent = navLabelMap[key] || link.textContent || "";
        link.classList.toggle("active", currentKey === key);
        link.classList.remove("is-nav-pending");
        nav.appendChild(link);
      });
    });
  }


  function normalizeLastUpdatedDate(value) {
    var raw = normalizeText(value || "");
    if (!raw) {
      return "";
    }
    var direct = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (direct) {
      return direct[1] + "-" + direct[2] + "-" + direct[3];
    }
    var parsed = new Date(raw);
    if (!isFinite(parsed.getTime())) {
      return "";
    }
    var y = parsed.getFullYear();
    var m = String(parsed.getMonth() + 1).padStart(2, "0");
    var d = String(parsed.getDate()).padStart(2, "0");
    if (y < 2000 || y > 2100) {
      return "";
    }
    return y + "-" + m + "-" + d;
  }

  function getCurrentPageLastUpdatedISO() {
    var researchTime = document.querySelector(".research-last-updated");
    if (researchTime) {
      return normalizeLastUpdatedDate(
        researchTime.getAttribute("datetime") || researchTime.textContent || ""
      );
    }

    var metaNode = document.querySelector(
      'meta[property="article:modified_time"], meta[name="last-updated"]'
    );
    if (metaNode) {
      var metaDate = normalizeLastUpdatedDate(metaNode.getAttribute("content") || "");
      if (metaDate) {
        return metaDate;
      }
    }

    return normalizeLastUpdatedDate(document.lastModified || "");
  }

  function ensureUnifiedPageLastUpdatedBadge(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    var dict = getSecondaryPageDictionary(safeLang);
    var dateIso = getCurrentPageLastUpdatedISO();

    var researchMetaPills = Array.from(document.querySelectorAll(".research-meta-pill"));
    var researchPill = researchMetaPills.find(function (node) {
      return !!node.querySelector(".research-last-updated");
    });
    if (researchPill) {
      researchPill.classList.add("page-last-updated-pill");
      researchPill.dataset.statusLang = safeLang;
      var rLabel = researchPill.querySelector(".research-meta-label");
      if (rLabel) {
        rLabel.textContent = dict.pageLastUpdated || "Last updated";
      }
      var rTime = researchPill.querySelector(".research-last-updated");
      if (rTime && dateIso) {
        rTime.setAttribute("datetime", dateIso);
        rTime.textContent = dateIso;
      }
    }

    var targetHost = null;
    var pageKind = "";
    if (document.body.classList.contains("music-album-page")) {
      targetHost = document.querySelector(".album-head .container");
      pageKind = "album";
    }

    if (!targetHost) {
      return;
    }

    var row = targetHost.querySelector(".page-last-updated-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "page-last-updated-row";
      row.dataset.pageMeta = pageKind;
      if (pageKind === "album") {
        var subtitle = targetHost.querySelector(".album-subtitle");
        if (subtitle) {
          subtitle.insertAdjacentElement("afterend", row);
        } else {
          targetHost.appendChild(row);
        }
      } else if (pageKind === "cv") {
        var utilityTop = targetHost.querySelector(".cv-utility-top");
        if (utilityTop) {
          utilityTop.insertAdjacentElement("afterend", row);
        } else {
          targetHost.prepend(row);
        }
      }
    }

    var pill = row.querySelector(".page-last-updated-pill");
    if (!pill) {
      pill = document.createElement("div");
      pill.className = "page-last-updated-pill";
      var labelNode = document.createElement("span");
      labelNode.className = "page-last-updated-label";
      var timeNode = document.createElement("time");
      timeNode.className = "page-last-updated-time";
      pill.appendChild(labelNode);
      pill.appendChild(timeNode);
      row.appendChild(pill);
    }

    pill.dataset.statusLang = safeLang;
    var label = pill.querySelector(".page-last-updated-label");
    var time = pill.querySelector(".page-last-updated-time");
    if (label) {
      label.textContent = dict.pageLastUpdated || "Last updated";
    }
    if (time) {
      if (dateIso) {
        time.setAttribute("datetime", dateIso);
        time.textContent = dateIso;
      } else {
        time.removeAttribute("datetime");
        time.textContent = "—";
      }
    }
  }

  function applySecondaryPageLanguage(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    var dict = getSecondaryPageDictionary(safeLang);

    ensureSearchNavLink();
    dedupeNavLinks();

    document.documentElement.lang = dict.htmlLang;
    Array.from(document.querySelectorAll(".nav")).forEach(function (nav) {
      nav.setAttribute("aria-label", dict.navAria);
    });

    Array.from(document.querySelectorAll(".nav a")).forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (
        isAcademicIndexHref(href) ||
        isMathIndexHref(href) ||
        isResearchIndexHref(href) ||
        isProjectsIndexHref(href)
      ) {
        link.textContent = dict.navAcademic || "Academic";
      } else if (isPhotoIndexHref(href)) {
        link.textContent = dict.navPhoto;
      } else if (isMusicIndexHref(href)) {
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
      if (/accessibility\.html|blank-1\.html/i.test(href)) {
        link.textContent = dict.a11y;
      } else if (/policy\.html|blank\.html/i.test(href)) {
        link.textContent = dict.siteNotes;
      }
    });
    ensureFooterFeedLinks(safeLang);

    Array.from(document.querySelectorAll(".footer-note")).forEach(function (note) {
      var mail =
        note.querySelector("a[data-email-link='1']") || note.querySelector("a[href^='mailto:']");
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

    Array.from(
      document.querySelectorAll(".track-date, .math-date, .article-meta, .photo-date")
    ).forEach(function (node) {
      node.textContent = normalizeDisplayDateText(node.textContent || "");
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
      if (isPhotoIndexHref(href)) {
        link.textContent = dict.backToPhoto;
      } else if (isMusicIndexHref(href)) {
        link.textContent = dict.backToMusic;
      } else if (isMathIndexHref(href)) {
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
      if (Array.isArray(dict.musicLongIntroParagraphs) && musicLongIntroNodes.length) {
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

      Array.from(document.querySelectorAll(".track-album-link")).forEach(function (link) {
        var href = String(link.getAttribute("href") || "").toLowerCase();
        if (/album-ipomoea-alba\.html(?:$|[?#])/.test(href)) {
          link.textContent =
            safeLang === "en" ? "15 tracks · Album page" : "15 首曲目 · 专辑页";
          return;
        }
        if (/album-teenage-best\.html(?:$|[?#])/.test(href)) {
          link.textContent =
            safeLang === "en"
              ? "A best-of collection from HazezZ’s teenage years · Album page"
              : "A best-of collection from HazezZ’s teenage years · 专辑页";
        }
      });

      document.title =
        safeLang === "en"
          ? "Music / Listening Room | Chronohaze"
          : "音乐 / Listening Room | Chronohaze";
      setMetaTagContent(
        'meta[name="description"]',
        safeLang === "en"
          ? "A music listening room: featured album, selected tracks, sound world, and a quieter archive."
          : "音乐 listening room：主推专辑、精选曲目、声音世界与较冷淡的归档索引。"
      );
      setMetaTagContent(
        'meta[property="og:title"]',
        safeLang === "en"
          ? "Music / Listening Room | Chronohaze"
          : "音乐 / Listening Room | Chronohaze"
      );
      setMetaTagContent(
        'meta[property="og:description"]',
        safeLang === "en"
          ? "A music listening room: featured album, selected tracks, sound world, and a quieter archive."
          : "音乐 listening room：主推专辑、精选曲目、声音世界与较冷淡的归档索引。"
      );
      setMetaTagContent(
        'meta[name="twitter:title"]',
        safeLang === "en"
          ? "Music / Listening Room | Chronohaze"
          : "音乐 / Listening Room | Chronohaze"
      );
      setMetaTagContent(
        'meta[name="twitter:description"]',
        safeLang === "en"
          ? "A music listening room: featured album, selected tracks, sound world, and a quieter archive."
          : "音乐 listening room：主推专辑、精选曲目、声音世界与较冷淡的归档索引。"
      );
    }

    if (document.body.classList.contains("music-album-page")) {
      var albumSubtitle = document.querySelector(".album-subtitle");
      var albumBackLink = document.querySelector(".album-back-link");
      var albumIntroNode = document.querySelector(".album-intro");
      var albumPath = (window.location.pathname || "")
        .toLowerCase()
        .replace(/^.*\/chronohaze\//, "")
        .replace(/^\//, "");

      if (albumSubtitle) {
        if (albumPath === "music/album-ipomoea-alba.html") {
          albumSubtitle.textContent =
            safeLang === "en"
              ? "Album page · click any track to open its work page"
              : "专辑页 · 点击曲目可跳转到对应作品页";
        } else if (albumPath === "music/album-teenage-best.html") {
          albumSubtitle.textContent =
            safeLang === "en"
              ? "A best-of collection from HazezZ’s teenage years"
              : "HazezZ 青少年时期精选集";
        }
      }

      if (albumBackLink) {
        albumBackLink.textContent = safeLang === "en" ? "Back to music" : "返回音乐作品集";
      }

      if (albumIntroNode) {
        albumIntroNode.setAttribute("aria-label", safeLang === "en" ? "Album intro" : "专辑介绍");
      }
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
      if (photoLongIntroNodes.length) {
        photoLongIntroNodes.forEach(function (node) {
          if (!node.hasAttribute("data-photo-intro-zh")) {
            node.setAttribute("data-photo-intro-zh", node.textContent);
          }
        });
      }
      if (
        Array.isArray(dict.photoLongIntroParagraphs) &&
        photoLongIntroNodes.length
      ) {
        photoLongIntroNodes.forEach(function (node, index) {
          if (safeLang === "en") {
            if (dict.photoLongIntroParagraphs[index]) {
              node.textContent = dict.photoLongIntroParagraphs[index];
              node.hidden = false;
              node.removeAttribute("aria-hidden");
            } else {
              node.hidden = true;
              node.setAttribute("aria-hidden", "true");
            }
            return;
          }
          var originalZh = node.getAttribute("data-photo-intro-zh");
          if (originalZh) {
            node.textContent = originalZh;
          }
          node.hidden = false;
          node.removeAttribute("aria-hidden");
        });
      }
      document.title = safeLang === "en" ? "Photography | Chronohaze" : "摄影 | Chronohaze";
      setMetaTagContent('meta[name="description"]', safeLang === "en"
        ? "Selected photographic series and a year-based archive: notes on light, structure, distance, and memory."
        : "摄影精选与按年份归档：关于光、结构、距离与记忆的视觉记录。");
      setMetaTagContent('meta[property="og:title"]', safeLang === "en" ? "Photography | Chronohaze" : "摄影 | Chronohaze");
      setMetaTagContent('meta[property="og:description"]', safeLang === "en"
        ? "Selected photographic series and a year-based archive: notes on light, structure, distance, and memory."
        : "摄影精选与按年份归档：关于光、结构、距离与记忆的视觉记录。");
      setMetaTagContent('meta[name="twitter:title"]', safeLang === "en" ? "Photography | Chronohaze" : "摄影 | Chronohaze");
      setMetaTagContent('meta[name="twitter:description"]', safeLang === "en"
        ? "Selected photographic series and a year-based archive: notes on light, structure, distance, and memory."
        : "摄影精选与按年份归档：关于光、结构、距离与记忆的视觉记录。");

      Array.from(document.querySelectorAll(".photo-subtitle")).forEach(function (node) {
        if (node.hasAttribute("data-copy-zh") || node.hasAttribute("data-copy-en")) {
          var subtitleKey = safeLang === "en" ? "data-copy-en" : "data-copy-zh";
          var subtitleValue = node.getAttribute(subtitleKey);
          if (subtitleValue) {
            node.textContent = subtitleValue;
          }
          return;
        }
        node.textContent = dict.readMore;
      });

      if (
        typeof window !== "undefined" &&
        typeof window.__chronohazeSyncPhotoCatalogLanguage === "function"
      ) {
        window.__chronohazeSyncPhotoCatalogLanguage(safeLang);
      }
    }

    if (document.body.classList.contains("math-index-page")) {
      var mathTitle = document.querySelector(".page-title");
      var mathIntro = document.querySelector(".page-head p");
      function syncMathDataCopy() {
        Array.from(
          document.querySelectorAll(".math-index-page [data-copy-zh][data-copy-en]")
        ).forEach(function (node) {
          var key = safeLang === "en" ? "data-copy-en" : "data-copy-zh";
          var value = node.getAttribute(key);
          if (value) {
            node.textContent = value;
          }
        });

        Array.from(document.querySelectorAll(".math-index-page .math-more")).forEach(function (node) {
          node.textContent = dict.readMore;
        });
      }
      if (mathTitle) {
        mathTitle.textContent = dict.mathPageTitle;
      }
      if (mathIntro) {
        mathIntro.textContent = dict.mathIntro;
      }
      syncMathDataCopy();
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(syncMathDataCopy);
      }
      setTimeout(syncMathDataCopy, 120);

      document.title = safeLang === "en" ? "Mathematics | Chronohaze" : "数学 | Chronohaze";
    }

    if (document.body.classList.contains("search-index-page")) {
      document.title = safeLang === "en" ? "Search | Chronohaze" : "搜索 | Chronohaze";
    }

    ensureMathPostAdjacentNavigation(safeLang);
    ensureUnifiedPageLastUpdatedBadge(safeLang);
    ensureMusicAlbumTrackStatuses();
    applyMusicAlbumTrackTitlesInEnglish(safeLang);
    applyIpomoeaAlbumIntroInEnglish(safeLang);

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
      applyJellyfishLakeIntroInEnglish(safeLang);
      applyJellyfishLakeLyricsInEnglish(safeLang);
      applyDaybreakBorderlineIntroInEnglish(safeLang);
      applyDaybreakBorderlineLyricsInEnglish(safeLang);
      applyCardiacAlarmIntroInEnglish(safeLang);
      applyCardiacAlarmLyricsInEnglish(safeLang);
      applyAfterimageIntroInEnglish(safeLang);
      applyAfterimageLyricsInEnglish(safeLang);
      applyFutureMeetIntroInEnglish(safeLang);
      applyFutureMeetLyricsInEnglish(safeLang);
      applyDissociativeAmnesiaIntroInEnglish(safeLang);
      applyDissociativeAmnesiaLyricsInEnglish(safeLang);
      applyLoneStarPreludeIntroInEnglish(safeLang);
      applyMrIdiographicLyricsInEnglish(safeLang);
      applyOrchidIntroInEnglish(safeLang);
      applyOrchidLyricsInEnglish(safeLang);
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
      decorateEnglishBilingualLyrics();
    }

    if (
      document.body.classList.contains("photo-detail-page") ||
      document.querySelector(".photo-detail-article")
    ) {
      var photoHeading = document.querySelector(".photo-detail-article h1");
      if (photoHeading) {
        var photoHeadingZh =
          photoHeading.getAttribute("data-copy-zh") || (photoHeading.textContent || "").trim();
        var photoHeadingEn =
          photoHeading.getAttribute("data-copy-en") ||
          localizeShortLabelText(photoHeadingZh, "en");
        photoHeading.setAttribute("data-copy-zh", photoHeadingZh);
        photoHeading.setAttribute("data-copy-en", photoHeadingEn);
        photoHeading.textContent = safeLang === "en" ? photoHeadingEn : photoHeadingZh;
      }

      Array.from(document.querySelectorAll(".photo-detail-article .article-meta")).forEach(function (
        node
      ) {
        var metaZh = node.getAttribute("data-copy-zh") || (node.textContent || "").trim();
        var metaEn = node.getAttribute("data-copy-en") || localizeShortLabelText(metaZh, "en");
        node.setAttribute("data-copy-zh", metaZh);
        node.setAttribute("data-copy-en", metaEn);
        node.textContent = safeLang === "en" ? metaEn : metaZh;
      });

      ensurePhotoDetailContactLayout(safeLang);

      Array.from(document.querySelectorAll(".photo-detail-article .read-more")).forEach(function (
        node
      ) {
        if (isPhotoIndexHref(node.getAttribute("href") || "")) {
          node.textContent = safeLang === "en" ? "Back to photography" : "返回摄影栏目";
        }
      });

      var photoTitleText = "";
      if (photoHeading && photoHeading.textContent) {
        photoTitleText = photoHeading.textContent.trim();
      }
      if (photoTitleText) {
        document.title =
          photoTitleText +
          " | " +
          (safeLang === "en" ? "Photography" : "摄影") +
          " | Chronohaze";
        var photoDesc = safeLang === "en"
          ? "Photo set: " + photoTitleText + "."
          : "摄影组图页面：" + photoTitleText + "。";
        setMetaTagContent('meta[name="description"]', photoDesc);
        setMetaTagContent('meta[property="og:title"]', photoTitleText + " | Chronohaze");
        setMetaTagContent('meta[property="og:description"]', photoDesc);
        setMetaTagContent('meta[name="twitter:title"]', photoTitleText + " | Chronohaze");
        setMetaTagContent('meta[name="twitter:description"]', photoDesc);
      }

      var videoFallback = document.querySelector(".photo-blue-video");
      if (videoFallback) {
        var fallbackText = safeLang === "en" ? "Your browser does not support video playback." : "您的浏览器暂不支持视频播放。";
        var textNodes = Array.from(videoFallback.childNodes).filter(function (node) {
          return node && node.nodeType === 3 && normalizeText(node.textContent || "");
        });
        if (textNodes.length) {
          textNodes.forEach(function (node) {
            node.textContent = fallbackText;
          });
        }
      }
    }

    ensureAccessibleControlLabels();
    ensureExternalLinkTargets();
    renderFirstIsabellePost(safeLang, dict);
    renderSubmodularGreedyPost(safeLang, dict);
    renderSpring2026Post(safeLang, dict);
    renderMetalcorePost(safeLang, dict);
  }

  function injectFloatingSiteLogo() {
    var existingFloatingLogo = document.querySelector(".floating-site-logo");
    if (existingFloatingLogo) {
      setupFloatingSiteLogoContrast(existingFloatingLogo);
      bridgeMobileShareWithFloatingLogo();
      return;
    }

    var styleId = "floating-site-logo-style";
    if (!document.getElementById(styleId)) {
      var style = document.createElement("style");
      style.id = styleId;
      style.textContent = [
        ".floating-site-logo{position:fixed;right:max(22px,calc(env(safe-area-inset-right,0px) + 16px));bottom:max(22px,calc(env(safe-area-inset-bottom,0px) + 16px));width:102px;height:102px;border-radius:999px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:68;background:radial-gradient(circle,rgba(238,244,253,.22) 0%,rgba(238,244,253,.12) 44%,rgba(238,244,253,0) 78%);box-shadow:none;will-change:transform;animation:floatingSiteLogoBreath var(--motion-rhythm-ambient,5200ms) var(--motion-ease-ambient,cubic-bezier(.37,0,.2,1)) infinite;transition:background var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease),box-shadow var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease),opacity var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease);}",
        ".floating-site-logo::before{content:'';position:absolute;inset:-24px;border-radius:inherit;background:radial-gradient(circle,rgba(205,216,236,.42) 0%,rgba(205,216,236,.18) 40%,rgba(205,216,236,0) 82%);filter:blur(9px);transition:background var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease),filter var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease),opacity var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease);}",
        ".floating-site-logo::after{content:'';position:absolute;inset:-4px;border-radius:inherit;background:radial-gradient(circle,rgba(255,255,255,0) 56%,rgba(214,223,240,.32) 70%,rgba(214,223,240,.12) 86%,rgba(214,223,240,0) 100%);filter:blur(4px);transition:background var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease),filter var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease),opacity var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease);}",
        ".floating-site-logo img{position:relative;z-index:1;width:76%;height:76%;object-fit:contain;opacity:.98;filter:contrast(1.05) saturate(.92) drop-shadow(0 0 1px rgba(255,255,255,.12)) drop-shadow(0 0 6px rgba(94,111,148,.16));transition:filter var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease),opacity var(--motion-rhythm-base,280ms) var(--motion-ease-unified,ease);}",
        ".floating-site-logo.is-contrast{background:radial-gradient(circle,rgba(56,70,101,.36) 0%,rgba(47,61,90,.26) 44%,rgba(44,58,87,0) 82%);}",
        ".floating-site-logo.is-contrast::before{background:radial-gradient(circle,rgba(39,50,76,.54) 0%,rgba(34,45,69,.27) 40%,rgba(34,45,69,0) 84%);filter:blur(10px);}",
        ".floating-site-logo.is-contrast::after{background:radial-gradient(circle,rgba(255,255,255,0) 54%,rgba(60,78,115,.36) 69%,rgba(49,63,94,.18) 86%,rgba(49,63,94,0) 100%);}",
        ".floating-site-logo.is-contrast img{opacity:.995;filter:contrast(1.18) saturate(.9) brightness(.88) drop-shadow(0 0 1px rgba(11,17,31,.66)) drop-shadow(0 0 5px rgba(19,30,50,.48)) drop-shadow(0 0 9px rgba(31,48,77,.26));}",
        "@keyframes floatingSiteLogoBreath{0%,100%{transform:translate3d(0,0,0) scale(1);}35%{transform:translate3d(.6px,-1.9px,0) scale(1.014);}65%{transform:translate3d(0,-4.2px,0) scale(1.028);}85%{transform:translate3d(-.55px,-1.8px,0) scale(1.016);}}",
        "@media (prefers-reduced-motion: reduce){.floating-site-logo{animation:none;transform:none;}.floating-site-logo::before,.floating-site-logo::after{filter:none;}}",
        "@media (max-width: 900px){.floating-site-logo{width:76px;height:76px;right:max(12px,calc(env(safe-area-inset-right,0px) + 10px));bottom:max(12px,calc(env(safe-area-inset-bottom,0px) + 10px));}.floating-site-logo::before{inset:-14px;}.floating-site-logo::after{inset:-4px;}}",
        "@media only screen and (min-width:390px) and (max-width:430px) and (orientation:portrait){.floating-site-logo{width:70px;height:70px;right:max(10px,calc(env(safe-area-inset-right,0px) + 8px));bottom:max(10px,calc(env(safe-area-inset-bottom,0px) + 8px));}}",
      ].join("");
      document.head.appendChild(style);
    }

    var wrapper = document.createElement("div");
    wrapper.className = "floating-site-logo";
    wrapper.setAttribute("aria-hidden", "true");

    var img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";

    var logoCandidates = getAssetCandidateUrls("assets/logo-float.png");
    if (!Array.isArray(logoCandidates) || !logoCandidates.length) {
      logoCandidates = ["assets/logo-float.png"];
    }
    var logoCandidateIndex = 0;
    function setNextLogoSource() {
      if (logoCandidateIndex >= logoCandidates.length) {
        return;
      }
      var candidate = logoCandidates[logoCandidateIndex++];
      try {
        img.src = new URL(candidate, window.location.href).toString();
      } catch (_error) {
        img.src = candidate;
      }
    }
    img.addEventListener("error", setNextLogoSource);
    setNextLogoSource();

    wrapper.appendChild(img);

    document.body.appendChild(wrapper);
    setupFloatingSiteLogoContrast(wrapper);
    bridgeMobileShareWithFloatingLogo();
  }

  function setupFloatingSiteLogoContrast(wrapper) {
    if (!wrapper || wrapper.dataset.contrastAdaptiveBound === "1") {
      return;
    }
    wrapper.dataset.contrastAdaptiveBound = "1";

    var rafId = 0;
    var intervalId = 0;
    var lastContrastState = null;
    var mediaLuminanceCache = new WeakMap();

    function parseRgbColor(input) {
      var value = String(input || "").trim();
      if (!value || value === "transparent") {
        return null;
      }
      var parts = value.match(/[\d.]+/g);
      if (!parts || parts.length < 3) {
        return null;
      }
      var r = Number(parts[0]);
      var g = Number(parts[1]);
      var b = Number(parts[2]);
      var a = parts.length > 3 ? Number(parts[3]) : 1;
      if (!isFinite(r) || !isFinite(g) || !isFinite(b) || !isFinite(a)) {
        return null;
      }
      return {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b)),
        a: Math.max(0, Math.min(1, a)),
      };
    }

    function getRelativeLuminance(color) {
      function channelToLinear(channel) {
        var c = channel / 255;
        if (c <= 0.03928) {
          return c / 12.92;
        }
        return Math.pow((c + 0.055) / 1.055, 2.4);
      }
      return (
        0.2126 * channelToLinear(color.r) +
        0.7152 * channelToLinear(color.g) +
        0.0722 * channelToLinear(color.b)
      );
    }

    function sampleImgLuminance(img, viewportX, viewportY) {
      if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
        return null;
      }
      var rect = img.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      var localX = (viewportX - rect.left) / rect.width;
      var localY = (viewportY - rect.top) / rect.height;
      if (!isFinite(localX) || !isFinite(localY)) {
        return null;
      }
      localX = Math.max(0, Math.min(1, localX));
      localY = Math.max(0, Math.min(1, localY));

      var px = Math.max(0, Math.min(img.naturalWidth - 1, Math.round(localX * (img.naturalWidth - 1))));
      var py = Math.max(0, Math.min(img.naturalHeight - 1, Math.round(localY * (img.naturalHeight - 1))));

      var cacheItem = mediaLuminanceCache.get(img);
      if (cacheItem && cacheItem.x === px && cacheItem.y === py && Date.now() - cacheItem.t < 1000) {
        return cacheItem.l;
      }

      try {
        var canvas = document.createElement("canvas");
        canvas.width = 6;
        canvas.height = 6;
        var ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          return null;
        }
        var sx = Math.max(0, Math.min(img.naturalWidth - 2, px - 1));
        var sy = Math.max(0, Math.min(img.naturalHeight - 2, py - 1));
        ctx.drawImage(img, sx, sy, 2, 2, 0, 0, 6, 6);
        var data = ctx.getImageData(0, 0, 6, 6).data;
        var lumSum = 0;
        var alphaSum = 0;
        for (var i = 0; i < data.length; i += 4) {
          var alpha = data[i + 3] / 255;
          if (alpha <= 0.02) {
            continue;
          }
          lumSum += getRelativeLuminance({
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
          }) * alpha;
          alphaSum += alpha;
        }
        if (!alphaSum) {
          return null;
        }
        var luminance = lumSum / alphaSum;
        mediaLuminanceCache.set(img, { x: px, y: py, l: luminance, t: Date.now() });
        return luminance;
      } catch (_error) {
        return null;
      }
    }

    function sampleVideoLuminance(video, viewportX, viewportY) {
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return null;
      }
      var rect = video.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }
      var localX = (viewportX - rect.left) / rect.width;
      var localY = (viewportY - rect.top) / rect.height;
      if (!isFinite(localX) || !isFinite(localY)) {
        return null;
      }
      localX = Math.max(0, Math.min(1, localX));
      localY = Math.max(0, Math.min(1, localY));

      var px = Math.max(0, Math.min(video.videoWidth - 1, Math.round(localX * (video.videoWidth - 1))));
      var py = Math.max(0, Math.min(video.videoHeight - 1, Math.round(localY * (video.videoHeight - 1))));

      var cacheItem = mediaLuminanceCache.get(video);
      if (cacheItem && cacheItem.x === px && cacheItem.y === py && Date.now() - cacheItem.t < 350) {
        return cacheItem.l;
      }

      try {
        var canvas = document.createElement("canvas");
        canvas.width = 6;
        canvas.height = 6;
        var ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          return null;
        }
        var sx = Math.max(0, Math.min(video.videoWidth - 2, px - 1));
        var sy = Math.max(0, Math.min(video.videoHeight - 2, py - 1));
        ctx.drawImage(video, sx, sy, 2, 2, 0, 0, 6, 6);
        var data = ctx.getImageData(0, 0, 6, 6).data;
        var lumSum = 0;
        for (var i = 0; i < data.length; i += 4) {
          lumSum += getRelativeLuminance({
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
          });
        }
        var luminance = lumSum / 36;
        mediaLuminanceCache.set(video, { x: px, y: py, l: luminance, t: Date.now() });
        return luminance;
      } catch (_error) {
        return null;
      }
    }

    function getSurfaceLuminance(target, sampleX, sampleY) {
      var node = target && target.nodeType === 1 ? target : null;
      if (node && node.closest) {
        var media = node.closest("img,video");
        if (media) {
          var mediaLum =
            media.tagName === "IMG"
              ? sampleImgLuminance(media, sampleX, sampleY)
              : sampleVideoLuminance(media, sampleX, sampleY);
          if (mediaLum !== null) {
            return mediaLum;
          }
        }
      }

      var depth = 0;
      while (node && depth < 12) {
        var styles = null;
        try {
          styles = window.getComputedStyle(node);
        } catch (_error) {
          styles = null;
        }
        if (styles) {
          var bgColor = parseRgbColor(styles.backgroundColor);
          if (bgColor && bgColor.a > 0.04) {
            return getRelativeLuminance(bgColor);
          }
        }
        node = node.parentElement;
        depth += 1;
      }
      var fallback = null;
      try {
        fallback = parseRgbColor(window.getComputedStyle(document.body).backgroundColor);
      } catch (_error) {
        fallback = null;
      }
      return fallback ? getRelativeLuminance(fallback) : 0.78;
    }

    function isInternalOverlayTarget(node) {
      return !!(
        node &&
        node.closest &&
        node.closest(".floating-site-logo, .cursor-atmosphere-layer, .site-share-shell")
      );
    }

    function findSampleTarget(sampleX, sampleY, rect) {
      var safeX = Math.min(window.innerWidth - 1, Math.max(0, sampleX));
      var safeY = Math.min(window.innerHeight - 1, Math.max(0, sampleY));
      var candidate = document.elementFromPoint(safeX, safeY);
      if (!isInternalOverlayTarget(candidate)) {
        return {
          target: candidate,
          x: safeX,
          y: safeY,
        };
      }

      var fallbackY = Math.max(0, safeY - rect.height * 0.66);
      var fallback = document.elementFromPoint(safeX, fallbackY);
      if (!isInternalOverlayTarget(fallback)) {
        return {
          target: fallback,
          x: safeX,
          y: fallbackY,
        };
      }

      return {
        target: candidate,
        x: safeX,
        y: safeY,
      };
    }

    function sampleContrastTarget() {
      rafId = 0;
      if (!wrapper.isConnected) {
        if (intervalId) {
          window.clearInterval(intervalId);
        }
        return;
      }
      var rect = wrapper.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      var points = [
        { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5, w: 0.34 },
        { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.25, w: 0.16 },
        { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.25, w: 0.16 },
        { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.75, w: 0.16 },
        { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.75, w: 0.18 },
      ];

      var weightedLuminance = 0;
      var weightSum = 0;
      var brightestPoint = 0;

      for (var i = 0; i < points.length; i += 1) {
        var point = points[i];
        var picked = findSampleTarget(point.x, point.y, rect);
        var luminance = getSurfaceLuminance(
          picked.target || document.documentElement,
          picked.x,
          picked.y
        );
        if (!isFinite(luminance)) {
          continue;
        }
        weightedLuminance += luminance * point.w;
        weightSum += point.w;
        if (luminance > brightestPoint) {
          brightestPoint = luminance;
        }
      }

      var avgLuminance = weightSum ? weightedLuminance / weightSum : 0.78;
      var sensedLuminance = Math.max(avgLuminance, brightestPoint * 0.94);

      var enterThreshold = 0.74;
      var exitThreshold = 0.64;
      var shouldUseContrast = lastContrastState
        ? sensedLuminance >= exitThreshold
        : sensedLuminance >= enterThreshold;

      if (shouldUseContrast !== lastContrastState) {
        wrapper.classList.toggle("is-contrast", shouldUseContrast);
        lastContrastState = shouldUseContrast;
      }
    }

    function requestSample() {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(sampleContrastTarget);
    }

    window.addEventListener("scroll", requestSample, { passive: true });
    window.addEventListener("resize", requestSample, { passive: true });
    window.addEventListener("orientationchange", requestSample, { passive: true });
    document.addEventListener("visibilitychange", requestSample);

    intervalId = window.setInterval(function () {
      if (document.hidden || !wrapper.isConnected) {
        return;
      }
      requestSample();
    }, 900);

    requestSample();
    window.setTimeout(requestSample, 140);
  }

  function setupDesktopCursorAtmosphere() {
    if (!document.body || document.querySelector(".cursor-atmosphere-layer")) {
      return;
    }
    if (!window.matchMedia) {
      return;
    }
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) {
      return;
    }
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      return;
    }

    var layer = document.createElement("div");
    layer.className = "cursor-atmosphere-layer";
    layer.setAttribute("aria-hidden", "true");
    var core = document.createElement("div");
    core.className = "cursor-atmosphere-core";
    layer.appendChild(core);
    document.body.appendChild(layer);

    var state = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      visible: false,
      muted: false,
      rafId: 0,
      lastSparkAt: 0,
      lastSparkX: 0,
      lastSparkY: 0,
      lastContrastSampleAt: 0,
      highContrast: false,
    };

    function isMutedTarget(target) {
      if (!target || !target.closest) {
        return false;
      }
      return !!target.closest(
        "input, textarea, select, option, audio, video, iframe, [contenteditable='true'], [contenteditable]:not([contenteditable='false'])"
      );
    }

    function syncLayerClasses() {
      layer.classList.toggle("is-visible", state.visible);
      layer.classList.toggle("is-muted", state.muted);
    }

    function parseRgbColor(value) {
      var input = String(value || "").trim();
      if (!input || input === "transparent") {
        return null;
      }
      var parts = input.match(/[\d.]+/g);
      if (!parts || parts.length < 3) {
        return null;
      }
      var r = Math.max(0, Math.min(255, Number(parts[0])));
      var g = Math.max(0, Math.min(255, Number(parts[1])));
      var b = Math.max(0, Math.min(255, Number(parts[2])));
      var a = parts.length > 3 ? Number(parts[3]) : 1;
      if (!isFinite(r) || !isFinite(g) || !isFinite(b) || !isFinite(a)) {
        return null;
      }
      return { r: r, g: g, b: b, a: Math.max(0, Math.min(1, a)) };
    }

    function getRelativeLuminance(color) {
      function toLinear(channel) {
        var c = channel / 255;
        if (c <= 0.03928) {
          return c / 12.92;
        }
        return Math.pow((c + 0.055) / 1.055, 2.4);
      }
      var r = toLinear(color.r);
      var g = toLinear(color.g);
      var b = toLinear(color.b);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function getSurfaceLuminance(target) {
      var node = target && target.nodeType === 1 ? target : null;
      var depth = 0;
      while (node && depth < 10) {
        var styles = null;
        try {
          styles = window.getComputedStyle(node);
        } catch (_error) {
          styles = null;
        }
        if (styles) {
          var bgColor = parseRgbColor(styles.backgroundColor);
          if (bgColor && bgColor.a > 0.04) {
            return getRelativeLuminance(bgColor);
          }
        }
        node = node.parentElement;
        depth += 1;
      }
      var bodyColor = parseRgbColor(window.getComputedStyle(document.body).backgroundColor);
      if (bodyColor) {
        return getRelativeLuminance(bodyColor);
      }
      return 0.5;
    }

    function syncCursorContrast(target, ts) {
      var now = ts || performance.now();
      if (now - state.lastContrastSampleAt < 84) {
        return;
      }
      state.lastContrastSampleAt = now;
      var luminance = getSurfaceLuminance(target);
      var nextHighContrast = state.highContrast ? luminance > 0.72 : luminance > 0.82;
      if (nextHighContrast === state.highContrast) {
        return;
      }
      state.highContrast = nextHighContrast;
      document.documentElement.classList.toggle("cursor-bright-bg", nextHighContrast);
    }

    function resetCursorContrast() {
      if (!state.highContrast) {
        return;
      }
      state.highContrast = false;
      document.documentElement.classList.remove("cursor-bright-bg");
    }

    function spawnSpark(ts) {
      var dx = state.targetX - state.lastSparkX;
      var dy = state.targetY - state.lastSparkY;
      var speed = Math.sqrt(dx * dx + dy * dy);
      if (speed < 6) {
        return;
      }
      if (ts - state.lastSparkAt < 52) {
        return;
      }

      state.lastSparkAt = ts;
      state.lastSparkX = state.targetX;
      state.lastSparkY = state.targetY;

      var spark = document.createElement("span");
      spark.className = "cursor-atmosphere-spark";
      if (Math.random() < 0.6) {
        spark.classList.add("is-star");
      }

      var offsetX = (Math.random() - 0.5) * 10 - dx * 0.07;
      var offsetY = (Math.random() - 0.5) * 10 - dy * 0.07;
      var driftX = -dx * (0.1 + Math.random() * 0.08) + (Math.random() - 0.5) * 10;
      var driftY = -dy * (0.1 + Math.random() * 0.08) + (Math.random() - 0.5) * 10;
      var size = 2.9 + Math.random() * 2.9;
      var life = 420 + Math.random() * 260;
      var opacity = 0.32 + Math.random() * 0.2;
      var rot = Math.round(Math.random() * 180 - 90);

      spark.style.setProperty("--spark-x", state.targetX + offsetX + "px");
      spark.style.setProperty("--spark-y", state.targetY + offsetY + "px");
      spark.style.setProperty("--spark-dx", driftX + "px");
      spark.style.setProperty("--spark-dy", driftY + "px");
      spark.style.setProperty("--spark-size", size.toFixed(2) + "px");
      spark.style.setProperty("--spark-life", Math.round(life) + "ms");
      spark.style.setProperty("--spark-opacity", opacity.toFixed(2));
      spark.style.setProperty("--spark-rot", rot + "deg");

      layer.appendChild(spark);

      if (Math.random() < 0.42) {
        var sparkCompanion = document.createElement("span");
        sparkCompanion.className = "cursor-atmosphere-spark is-star";
        sparkCompanion.style.setProperty("--spark-x", state.targetX + offsetX * 0.65 + (Math.random() - 0.5) * 8 + "px");
        sparkCompanion.style.setProperty("--spark-y", state.targetY + offsetY * 0.65 + (Math.random() - 0.5) * 8 + "px");
        sparkCompanion.style.setProperty("--spark-dx", driftX * 0.68 + "px");
        sparkCompanion.style.setProperty("--spark-dy", driftY * 0.68 + "px");
        sparkCompanion.style.setProperty("--spark-size", (size * (0.66 + Math.random() * 0.16)).toFixed(2) + "px");
        sparkCompanion.style.setProperty("--spark-life", Math.round(life * (0.82 + Math.random() * 0.14)) + "ms");
        sparkCompanion.style.setProperty("--spark-opacity", (opacity * 0.9).toFixed(2));
        sparkCompanion.style.setProperty("--spark-rot", Math.round(rot + (Math.random() - 0.5) * 64) + "deg");
        layer.appendChild(sparkCompanion);
        sparkCompanion.addEventListener("animationend", function () {
          if (sparkCompanion.parentNode) {
            sparkCompanion.parentNode.removeChild(sparkCompanion);
          }
        });
      }

      spark.addEventListener("animationend", function () {
        if (spark.parentNode) {
          spark.parentNode.removeChild(spark);
        }
      });

      var sparks = layer.querySelectorAll(".cursor-atmosphere-spark");
      if (sparks.length > 26) {
        var overflow = sparks.length - 26;
        for (var i = 0; i < overflow; i += 1) {
          if (sparks[i] && sparks[i].parentNode) {
            sparks[i].parentNode.removeChild(sparks[i]);
          }
        }
      }
    }

    function tick(ts) {
      state.rafId = 0;
      state.x = state.targetX;
      state.y = state.targetY;

      core.style.left = state.x.toFixed(2) + "px";
      core.style.top = state.y.toFixed(2) + "px";

      if (state.visible && !state.muted) {
        spawnSpark(ts || performance.now());
      }

      var needsContinue = false;

      if (needsContinue) {
        state.rafId = window.requestAnimationFrame(tick);
      }
    }

    function requestTick() {
      if (!state.rafId) {
        state.rafId = window.requestAnimationFrame(tick);
      }
    }

    document.addEventListener(
      "pointermove",
      function (event) {
        if (event.pointerType && event.pointerType !== "mouse") {
          return;
        }
        state.targetX = event.clientX;
        state.targetY = event.clientY;
        if (!state.visible) {
          state.x = state.targetX;
          state.y = state.targetY;
          state.lastSparkX = state.targetX;
          state.lastSparkY = state.targetY;
          state.visible = true;
        }
        state.muted = isMutedTarget(event.target);
        syncCursorContrast(event.target, performance.now());
        syncLayerClasses();
        requestTick();
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerdown",
      function (event) {
        if (event.pointerType && event.pointerType !== "mouse") {
          return;
        }
        layer.classList.add("is-pressed");
        state.muted = isMutedTarget(event.target);
        syncLayerClasses();
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerup",
      function () {
        layer.classList.remove("is-pressed");
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerleave",
      function (event) {
        if (event.target === document.documentElement || event.target === document.body) {
          state.visible = false;
          syncLayerClasses();
          layer.classList.remove("is-pressed");
          resetCursorContrast();
        }
      },
      { passive: true }
    );

    document.addEventListener(
      "visibilitychange",
      function () {
        if (document.hidden) {
          state.visible = false;
          syncLayerClasses();
          layer.classList.remove("is-pressed");
          resetCursorContrast();
        }
      },
      { passive: true }
    );

    window.addEventListener("blur", function () {
      state.visible = false;
      syncLayerClasses();
      layer.classList.remove("is-pressed");
      resetCursorContrast();
    });
  }

  function injectFloatingLanguageSwitch() {
    if (document.querySelector(".lang-pill")) {
      return;
    }

    var preferred = detectPreferredLanguage();
    persistPreferredLanguage(preferred);
    ensureSearchNavLink();
    dedupeNavLinks();
    applySecondaryPageLanguage(preferred);

    var existingPanel = document.querySelector(".floating-lang-switch");
    if (existingPanel) {
      Array.from(existingPanel.querySelectorAll(".floating-lang-btn[data-lang]")).forEach(function (btn) {
        var buttonLang = btn.getAttribute("data-lang");
        btn.classList.toggle("active", buttonLang === preferred);
        btn.setAttribute(
          "aria-label",
          buttonLang === "zh"
            ? "Switch site language to Chinese"
            : "Switch site language to English"
        );
      });
      existingPanel.setAttribute("aria-label", "Language switch");
      ensureAccessibleControlLabels();
      ensureExternalLinkTargets();
      return;
    }

    var panel = document.createElement("div");
    panel.className = "floating-lang-switch";
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "Language switch");

    function buildButton(lang, label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "floating-lang-btn";
      btn.setAttribute("data-lang", lang);
      btn.setAttribute(
        "aria-label",
        lang === "zh" ? "Switch site language to Chinese" : "Switch site language to English"
      );
      btn.textContent = label;
      if (lang === preferred) {
        btn.classList.add("active");
      }
      bindResponsivePress(btn, function () {
        if (lang === detectPreferredLanguage()) {
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
    ensureAccessibleControlLabels();
    ensureExternalLinkTargets();
  }

  var PHOTO_DETAIL_SERIES_META = {
    "photo/photo-07.html": {
      seriesZh: "参照系",
      seriesEn: "Reference Frame",
      locationZh: "中国重庆，2023",
      locationEn: "Chongqing, China · 2023",
      noteZh: "晃动不是失焦，而是把城市从确定性里移开。",
      noteEn: "Motion is not blur here, but a way of displacing the city from certainty.",
    },
    "photo/photo-08.html": {
      seriesZh: "隙光",
      seriesEn: "Slit of Light",
      locationZh: "中国重庆，2023",
      locationEn: "Chongqing, China · 2023",
      noteZh: "光从缝里落下，只留下轮廓和最轻的一层心事。",
      noteEn:
        "Light slips through the slit, leaving only outlines and the thinnest remainder of thought.",
    },
    "photo/photo-10.html": {
      seriesZh: "框景练习",
      seriesEn: "Framing Exercise",
      locationZh: "英国爱丁堡，2024",
      locationEn: "Edinburgh, UK · 2024",
      noteZh: "门洞、窗格与围栏轮流接管视线，春天被框成几何。",
      noteEn:
        "Doorways, windows, and railings take turns directing the eye; spring is held inside geometry.",
    },
    "photo/photo-11.html": {
      seriesZh: "铁与蕨",
      seriesEn: "Iron and Fern",
      locationZh: "英国格拉斯哥，2023",
      locationEn: "Glasgow, UK · 2023",
      noteZh: "人工的骨架和潮湿的植物并排生长，像一场被控制过的季节。",
      noteEn:
        "Metal and fern grow side by side, like a season already touched by design.",
    },
    "photo/photo-13.html": {
      seriesZh: "你的记忆",
      seriesEn: "Memories of You",
      locationZh: "英国爱丁堡，2025",
      locationEn: "Edinburgh, UK · 2025",
      noteZh: "风声和光粒先于叙述出现，记忆比说明更早抵达。",
      noteEn: "Wind and dusted light arrive before narrative; memory enters first.",
    },
    "photo/photo-14.html": {
      seriesZh: "隐入口",
      seriesEn: "Hidden Entrance",
      locationZh: "美国伊萨卡，2025",
      locationEn: "Ithaca, USA · 2025",
      noteZh: "潮湿的绿把声音吸走，入口像一段被收起的停留。",
      noteEn:
        "Damp greens absorb the sound; the entrance feels like a pause folded out of view.",
    },
  };

  function getCurrentChronohazePath() {
    return (window.location.pathname || "")
      .toLowerCase()
      .replace(/^.*\/chronohaze\//, "")
      .replace(/^\//, "");
  }

  var photoDetailLightboxState = null;

  function getPhotoDetailLightboxLabels(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    return {
      close: safeLang === "en" ? "Close viewer" : "关闭查看器",
      previous: safeLang === "en" ? "Previous image" : "上一张图片",
      next: safeLang === "en" ? "Next image" : "下一张图片",
      zoomOut: safeLang === "en" ? "Zoom out" : "缩小",
      zoomReset: safeLang === "en" ? "Reset zoom" : "重置缩放",
      zoomIn: safeLang === "en" ? "Zoom in" : "放大",
      loading: safeLang === "en" ? "Loading full image" : "正在载入完整图片",
      note:
        safeLang === "en"
          ? "View only · no direct download entry"
          : "仅浏览 · 不提供直接下载入口",
      metaPrefix: safeLang === "en" ? "Image" : "图片",
      figureTitle: safeLang === "en" ? "Click to open full image" : "点击查看完整图片",
    };
  }

  function clampPhotoDetailLightboxOffset(state) {
    if (!state || state.scale <= 1) {
      state.translateX = 0;
      state.translateY = 0;
      return;
    }

    var stageRect = state.stage.getBoundingClientRect();
    var baseWidth = state.baseWidth || state.image.getBoundingClientRect().width || 0;
    var baseHeight = state.baseHeight || state.image.getBoundingClientRect().height || 0;
    var maxX = Math.max(0, (baseWidth * state.scale - stageRect.width) / 2);
    var maxY = Math.max(0, (baseHeight * state.scale - stageRect.height) / 2);

    state.translateX = Math.max(-maxX, Math.min(maxX, state.translateX));
    state.translateY = Math.max(-maxY, Math.min(maxY, state.translateY));
  }

  function syncPhotoDetailLightboxTransform(state) {
    if (!state) {
      return;
    }

    clampPhotoDetailLightboxOffset(state);
    state.image.style.transform =
      "translate(" +
      state.translateX +
      "px, " +
      state.translateY +
      "px) scale(" +
      state.scale +
      ")";
    state.viewport.classList.toggle("is-zoomed", state.scale > 1.01);
    state.zoomOutButton.disabled = state.scale <= 1.01;
    state.zoomResetButton.disabled = state.scale <= 1.01;
  }

  function resetPhotoDetailLightboxTransform(state) {
    if (!state) {
      return;
    }
    state.scale = 1;
    state.translateX = 0;
    state.translateY = 0;
    syncPhotoDetailLightboxTransform(state);
  }

  function setPhotoDetailLightboxScale(state, nextScale) {
    if (!state) {
      return;
    }
    state.scale = Math.max(1, Math.min(4.5, nextScale));
    if (state.scale <= 1.01) {
      state.scale = 1;
      state.translateX = 0;
      state.translateY = 0;
    }
    syncPhotoDetailLightboxTransform(state);
  }

  function updatePhotoDetailLightboxMeta(state) {
    if (!state) {
      return;
    }
    var labels = getPhotoDetailLightboxLabels(state.lang);
    var articleTitleNode = document.querySelector(".photo-detail-article h1");
    var articleTitle = articleTitleNode ? normalizeText(articleTitleNode.textContent || "") : "";
    var countText =
      state.index >= 0 && state.items.length
        ? String(state.index + 1).padStart(2, "0") + " / " + String(state.items.length).padStart(2, "0")
        : "00 / 00";
    state.meta.textContent =
      (articleTitle ? articleTitle + " · " : labels.metaPrefix + " · ") + countText;
    state.prevButton.disabled = state.index <= 0;
    state.nextButton.disabled = state.index >= state.items.length - 1;
  }

  function finalizePhotoDetailLightboxImage(state, requestId) {
    if (!state || state.requestId !== requestId) {
      return;
    }
    state.baseWidth = state.image.getBoundingClientRect().width || 0;
    state.baseHeight = state.image.getBoundingClientRect().height || 0;
    state.loading.hidden = true;
    state.image.style.opacity = "1";
    syncPhotoDetailLightboxTransform(state);
  }

  function showPhotoDetailLightboxFigure(state, index) {
    if (!state || !state.items.length) {
      return;
    }

    state.index = Math.max(0, Math.min(index, state.items.length - 1));
    var figure = state.items[state.index];
    var sourceImage = figure ? figure.querySelector("img") : null;
    if (!sourceImage) {
      return;
    }

    updatePhotoDetailLightboxMeta(state);
    resetPhotoDetailLightboxTransform(state);

    var previewSrc = sourceImage.currentSrc || sourceImage.getAttribute("src") || "";
    var fullSrc =
      sourceImage.dataset.fullResSrc ||
      sourceImage.dataset.responsiveBaseSrc ||
      previewSrc;
    var requestId = String(Date.now()) + "-" + String(Math.random()).slice(2);
    state.requestId = requestId;
    state.image.alt = sourceImage.getAttribute("alt") || "";
    state.loading.hidden = false;
    state.loading.textContent = getPhotoDetailLightboxLabels(state.lang).loading;
    state.image.style.opacity = "0.94";

    if (previewSrc) {
      state.image.src = previewSrc;
    }

    if (!fullSrc || fullSrc === previewSrc) {
      if (sourceImage.dataset.fullResLoaded !== "1") {
        sourceImage.dataset.fullResLoaded = "1";
      }
      if (state.image.complete) {
        finalizePhotoDetailLightboxImage(state, requestId);
      } else {
        state.image.onload = function () {
          finalizePhotoDetailLightboxImage(state, requestId);
        };
      }
      return;
    }

    var loader = new Image();
    loader.decoding = "async";
    loader.onload = function () {
      if (state.requestId !== requestId) {
        return;
      }
      state.image.onload = function () {
        finalizePhotoDetailLightboxImage(state, requestId);
      };
      state.image.src = fullSrc;
      sourceImage.dataset.fullResLoaded = "1";
    };
    loader.onerror = function () {
      if (state.requestId !== requestId) {
        return;
      }
      if (state.image.complete) {
        finalizePhotoDetailLightboxImage(state, requestId);
      } else {
        state.image.onload = function () {
          finalizePhotoDetailLightboxImage(state, requestId);
        };
      }
    };
    loader.src = fullSrc;
  }

  function closePhotoDetailLightbox() {
    var state = photoDetailLightboxState;
    if (!state || !state.isOpen) {
      return;
    }

    state.isOpen = false;
    state.requestId = "";
    state.root.classList.remove("is-open");
    state.root.setAttribute("aria-hidden", "true");
    state.viewport.classList.remove("is-dragging");
    state.activePointerId = null;
    document.documentElement.classList.remove("photo-lightbox-open");
    document.body.classList.remove("photo-lightbox-open");
    resetPhotoDetailLightboxTransform(state);
    if (state.triggerFigure && typeof state.triggerFigure.focus === "function") {
      state.triggerFigure.focus({ preventScroll: true });
    }
  }

  function openPhotoDetailLightbox(figure, lang) {
    if (!figure) {
      return;
    }

    var state = ensurePhotoDetailImageViewer(lang);
    if (!state) {
      return;
    }

    state.items = Array.from(
      document.querySelectorAll(".photo-detail-gallery .photo-detail-item")
    ).filter(function (node) {
      return !!node.querySelector("img");
    });

    var index = state.items.indexOf(figure);
    if (index === -1) {
      return;
    }

    state.lang = lang === "en" ? "en" : "zh";
    state.triggerFigure = figure;
    state.root.classList.add("is-open");
    state.root.setAttribute("aria-hidden", "false");
    state.isOpen = true;
    document.documentElement.classList.add("photo-lightbox-open");
    document.body.classList.add("photo-lightbox-open");
    state.note.textContent = getPhotoDetailLightboxLabels(state.lang).note;
    showPhotoDetailLightboxFigure(state, index);
  }

  function ensurePhotoDetailImageViewer(lang) {
    if (
      !document.body ||
      (!document.body.classList.contains("photo-detail-page") &&
        !document.querySelector(".photo-detail-gallery"))
    ) {
      return null;
    }

    var safeLang = lang === "en" ? "en" : detectPreferredLanguage();
    safeLang = safeLang === "en" ? "en" : "zh";

    if (photoDetailLightboxState && photoDetailLightboxState.root.isConnected) {
      var existingLabels = getPhotoDetailLightboxLabels(safeLang);
      photoDetailLightboxState.lang = safeLang;
      photoDetailLightboxState.note.textContent = existingLabels.note;
      photoDetailLightboxState.closeButton.setAttribute("aria-label", existingLabels.close);
      photoDetailLightboxState.prevButton.setAttribute("aria-label", existingLabels.previous);
      photoDetailLightboxState.nextButton.setAttribute("aria-label", existingLabels.next);
      photoDetailLightboxState.zoomOutButton.setAttribute("aria-label", existingLabels.zoomOut);
      photoDetailLightboxState.zoomResetButton.setAttribute("aria-label", existingLabels.zoomReset);
      photoDetailLightboxState.zoomInButton.setAttribute("aria-label", existingLabels.zoomIn);
      return photoDetailLightboxState;
    }

    var labels = getPhotoDetailLightboxLabels(safeLang);
    var root = document.createElement("div");
    root.className = "photo-lightbox";
    root.setAttribute("aria-hidden", "true");

    var backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "photo-lightbox-backdrop";
    backdrop.setAttribute("aria-label", labels.close);
    root.appendChild(backdrop);

    var shell = document.createElement("div");
    shell.className = "photo-lightbox-shell";

    var toolbar = document.createElement("div");
    toolbar.className = "photo-lightbox-toolbar";

    var meta = document.createElement("div");
    meta.className = "photo-lightbox-meta";
    toolbar.appendChild(meta);

    var controls = document.createElement("div");
    controls.className = "photo-lightbox-controls";

    function buildLightboxButton(className, text, ariaLabel) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "photo-lightbox-btn " + className;
      button.textContent = text;
      button.setAttribute("aria-label", ariaLabel);
      return button;
    }

    var prevButton = buildLightboxButton("photo-lightbox-btn-prev", "←", labels.previous);
    var nextButton = buildLightboxButton("photo-lightbox-btn-next", "→", labels.next);
    var zoomOutButton = buildLightboxButton("photo-lightbox-btn-zoom-out", "−", labels.zoomOut);
    var zoomResetButton = buildLightboxButton("photo-lightbox-btn-zoom-reset", "1:1", labels.zoomReset);
    var zoomInButton = buildLightboxButton("photo-lightbox-btn-zoom-in", "+", labels.zoomIn);
    var closeButton = buildLightboxButton("photo-lightbox-btn-close", "×", labels.close);

    controls.appendChild(prevButton);
    controls.appendChild(nextButton);
    controls.appendChild(zoomOutButton);
    controls.appendChild(zoomResetButton);
    controls.appendChild(zoomInButton);
    controls.appendChild(closeButton);
    toolbar.appendChild(controls);

    var stage = document.createElement("div");
    stage.className = "photo-lightbox-stage";

    var viewport = document.createElement("div");
    viewport.className = "photo-lightbox-viewport";

    var image = document.createElement("img");
    image.className = "photo-lightbox-image";
    image.alt = "";
    image.draggable = false;
    image.setAttribute("oncontextmenu", "return false");
    viewport.appendChild(image);
    stage.appendChild(viewport);

    var loading = document.createElement("div");
    loading.className = "photo-lightbox-loading";
    loading.textContent = labels.loading;
    loading.hidden = true;
    stage.appendChild(loading);

    var footer = document.createElement("div");
    footer.className = "photo-lightbox-footer";

    var note = document.createElement("div");
    note.className = "photo-lightbox-note";
    note.textContent = labels.note;
    footer.appendChild(note);

    shell.appendChild(toolbar);
    shell.appendChild(stage);
    shell.appendChild(footer);
    root.appendChild(shell);
    document.body.appendChild(root);

    photoDetailLightboxState = {
      root: root,
      stage: stage,
      viewport: viewport,
      image: image,
      loading: loading,
      meta: meta,
      note: note,
      prevButton: prevButton,
      nextButton: nextButton,
      zoomOutButton: zoomOutButton,
      zoomResetButton: zoomResetButton,
      zoomInButton: zoomInButton,
      closeButton: closeButton,
      items: [],
      index: -1,
      scale: 1,
      translateX: 0,
      translateY: 0,
      baseWidth: 0,
      baseHeight: 0,
      isOpen: false,
      lang: safeLang,
      requestId: "",
      activePointerId: null,
      dragStartX: 0,
      dragStartY: 0,
      triggerFigure: null,
    };

    bindResponsivePress(backdrop, function () {
      closePhotoDetailLightbox();
    });
    bindResponsivePress(closeButton, function () {
      closePhotoDetailLightbox();
    });
    bindResponsivePress(prevButton, function () {
      if (!photoDetailLightboxState || photoDetailLightboxState.index <= 0) {
        return;
      }
      showPhotoDetailLightboxFigure(photoDetailLightboxState, photoDetailLightboxState.index - 1);
    });
    bindResponsivePress(nextButton, function () {
      if (
        !photoDetailLightboxState ||
        photoDetailLightboxState.index >= photoDetailLightboxState.items.length - 1
      ) {
        return;
      }
      showPhotoDetailLightboxFigure(photoDetailLightboxState, photoDetailLightboxState.index + 1);
    });
    bindResponsivePress(zoomOutButton, function () {
      if (!photoDetailLightboxState) {
        return;
      }
      setPhotoDetailLightboxScale(photoDetailLightboxState, photoDetailLightboxState.scale - 0.28);
    });
    bindResponsivePress(zoomResetButton, function () {
      resetPhotoDetailLightboxTransform(photoDetailLightboxState);
    });
    bindResponsivePress(zoomInButton, function () {
      if (!photoDetailLightboxState) {
        return;
      }
      setPhotoDetailLightboxScale(photoDetailLightboxState, photoDetailLightboxState.scale + 0.28);
    });

    viewport.addEventListener("dblclick", function (event) {
      if (!photoDetailLightboxState || !photoDetailLightboxState.isOpen) {
        return;
      }
      stopEvent(event);
      if (photoDetailLightboxState.scale > 1.01) {
        resetPhotoDetailLightboxTransform(photoDetailLightboxState);
      } else {
        setPhotoDetailLightboxScale(photoDetailLightboxState, 2.2);
      }
    });

    stage.addEventListener(
      "wheel",
      function (event) {
        if (!photoDetailLightboxState || !photoDetailLightboxState.isOpen) {
          return;
        }
        stopEvent(event);
        var delta = event.deltaY < 0 ? 0.24 : -0.24;
        setPhotoDetailLightboxScale(
          photoDetailLightboxState,
          photoDetailLightboxState.scale + delta
        );
      },
      { passive: false }
    );

    viewport.addEventListener("pointerdown", function (event) {
      if (!photoDetailLightboxState || photoDetailLightboxState.scale <= 1.01) {
        return;
      }
      photoDetailLightboxState.activePointerId = event.pointerId;
      photoDetailLightboxState.dragStartX = event.clientX - photoDetailLightboxState.translateX;
      photoDetailLightboxState.dragStartY = event.clientY - photoDetailLightboxState.translateY;
      photoDetailLightboxState.viewport.classList.add("is-dragging");
      viewport.setPointerCapture(event.pointerId);
      stopEvent(event);
    });

    viewport.addEventListener("pointermove", function (event) {
      if (
        !photoDetailLightboxState ||
        photoDetailLightboxState.activePointerId !== event.pointerId
      ) {
        return;
      }
      photoDetailLightboxState.translateX = event.clientX - photoDetailLightboxState.dragStartX;
      photoDetailLightboxState.translateY = event.clientY - photoDetailLightboxState.dragStartY;
      syncPhotoDetailLightboxTransform(photoDetailLightboxState);
      stopEvent(event);
    });

    function endLightboxDrag(event) {
      if (
        !photoDetailLightboxState ||
        photoDetailLightboxState.activePointerId !== event.pointerId
      ) {
        return;
      }
      photoDetailLightboxState.activePointerId = null;
      photoDetailLightboxState.viewport.classList.remove("is-dragging");
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
    }

    viewport.addEventListener("pointerup", endLightboxDrag);
    viewport.addEventListener("pointercancel", endLightboxDrag);

    window.addEventListener("resize", function () {
      if (!photoDetailLightboxState || !photoDetailLightboxState.isOpen) {
        return;
      }
      resetPhotoDetailLightboxTransform(photoDetailLightboxState);
    });

    document.addEventListener("keydown", function (event) {
      if (!photoDetailLightboxState || !photoDetailLightboxState.isOpen) {
        return;
      }
      if (event.key === "Escape") {
        stopEvent(event);
        closePhotoDetailLightbox();
        return;
      }
      if (event.key === "ArrowLeft" && photoDetailLightboxState.index > 0) {
        stopEvent(event);
        showPhotoDetailLightboxFigure(photoDetailLightboxState, photoDetailLightboxState.index - 1);
        return;
      }
      if (
        event.key === "ArrowRight" &&
        photoDetailLightboxState.index < photoDetailLightboxState.items.length - 1
      ) {
        stopEvent(event);
        showPhotoDetailLightboxFigure(photoDetailLightboxState, photoDetailLightboxState.index + 1);
      }
    });

    return photoDetailLightboxState;
  }

  function ensurePhotoDetailContactLayout(lang) {
    if (
      !document.body ||
      (!document.body.classList.contains("photo-detail-page") &&
        !document.querySelector(".photo-detail-article"))
    ) {
      return;
    }

    var article = document.querySelector(".photo-detail-article");
    var gallery = article ? article.querySelector(".photo-detail-gallery") : null;
    if (!article || !gallery) {
      return;
    }

    var safeLang = lang === "en" ? "en" : detectPreferredLanguage();
    safeLang = safeLang === "en" ? "en" : "zh";

    article.classList.add("photo-detail-article--contact-sheet");
    gallery.classList.add("photo-detail-gallery--contact-sheet");

    if (!gallery.querySelector(".photo-detail-lead-composition")) {
      var figures = Array.from(gallery.children).filter(function (node) {
        return node && node.classList && node.classList.contains("photo-detail-item");
      });

      if (figures.length) {
        var leadComposition = document.createElement("div");
        leadComposition.className = "photo-detail-lead-composition";

        var heroFigure = figures.shift();
        heroFigure.setAttribute("data-photo-slot", "hero");
        leadComposition.appendChild(heroFigure);

        if (figures.length) {
          var sideStack = document.createElement("div");
          sideStack.className = "photo-detail-side-stack";

          var sidePrimary = figures.shift();
          if (sidePrimary) {
            sidePrimary.setAttribute("data-photo-slot", "stack-a");
            sideStack.appendChild(sidePrimary);
          }

          var sideSecondary = figures.shift();
          if (sideSecondary) {
            sideSecondary.setAttribute("data-photo-slot", "stack-b");
            sideStack.appendChild(sideSecondary);
          }

          if (sideStack.children.length) {
            leadComposition.appendChild(sideStack);
          }
        }

        gallery.appendChild(leadComposition);

        if (figures.length) {
          var contactSheet = document.createElement("div");
          contactSheet.className = "photo-detail-contact-sheet";
          figures.forEach(function (figure, index) {
            figure.setAttribute("data-photo-slot", "sheet");
            figure.setAttribute("data-photo-sheet-index", String(index + 1));
            contactSheet.appendChild(figure);
          });
          gallery.appendChild(contactSheet);
        }
      }
    }

    var hero = gallery.querySelector(
      '.photo-detail-lead-composition .photo-detail-item[data-photo-slot="hero"]'
    );

    if (!hero) {
      return;
    }

    Array.from(gallery.querySelectorAll(".photo-detail-caption")).forEach(function (caption) {
      caption.remove();
    });
    article.classList.remove("has-photo-detail-series-note");
  }

  function setupPhotoDetailPager() {
    var article = document.querySelector(".photo-detail-article, .photo-blue-article");
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
    nav.appendChild(buildNavNode(dict.photoBackToArchive, "../photography.html", "back"));
    nav.appendChild(buildNavNode(dict.photoNextGroup, nextHref, "next"));

    var backLink = article.querySelector('a.read-more[href*="photography.html"]');
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

    if (article.dataset.photoKeyboardPagerBound !== "1") {
      article.dataset.photoKeyboardPagerBound = "1";
      article.setAttribute("data-photo-prev-href", prevHref || "");
      article.setAttribute("data-photo-next-href", nextHref || "");

      document.addEventListener("keydown", function (event) {
        if (!document.body || !document.body.contains(article)) {
          return;
        }
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
          return;
        }

        var target = event.target;
        if (
          target &&
          typeof target.closest === "function" &&
          target.closest("input, textarea, select, button, summary, [contenteditable='true']")
        ) {
          return;
        }

        var selection = typeof window.getSelection === "function" ? window.getSelection() : null;
        if (selection && String(selection).trim()) {
          return;
        }

        var direction = "";
        if (event.key === "ArrowLeft") {
          direction = "prev";
        } else if (event.key === "ArrowRight") {
          direction = "next";
        }
        if (!direction) {
          return;
        }

        var href =
          direction === "prev"
            ? article.getAttribute("data-photo-prev-href") || ""
            : article.getAttribute("data-photo-next-href") || "";
        if (!href) {
          return;
        }

        event.preventDefault();
        trackAnalyticsEvent("photo_group_open", {
          page_path: window.location.pathname,
          item_href: href,
          item_type: "photo-group-keyboard-nav",
          nav_direction: direction,
        });
        window.location.href = href;
      });
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
          if (row.classList.contains("track-row")) {
            trackAnalyticsEvent("music_row_open", {
              page_path: window.location.pathname,
              item_href: href,
              item_type: row.dataset.musicType || "",
            });
          } else if (row.classList.contains("math-card") || row.classList.contains("math-row")) {
            trackAnalyticsEvent("math_row_open", {
              page_path: window.location.pathname,
              item_href: href,
            });
          }
          if (typeof navigateChronohazeInternal === "function") {
            navigateChronohazeInternal(href);
          } else {
            window.location.href = href;
          }
        }
      }

      bindResponsivePress(row, function (event) {
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

  function bindCollectionLinkAnalytics() {
    var bindings = [
      {
        selector: ".photo-index-page .photo-feature-link, .photo-index-page .photo-card-link",
        eventName: "photo_group_open",
        type: "photo-group",
      },
      {
        selector: ".music-album-page .album-track-link:not(.is-disabled)",
        eventName: "album_track_open",
        type: "album-track",
      },
    ];

    bindings.forEach(function (config) {
      Array.from(document.querySelectorAll(config.selector)).forEach(function (link) {
        if (!link || link.dataset.analyticsBound === "1") {
          return;
        }
        link.dataset.analyticsBound = "1";
        link.addEventListener("click", function () {
          var href = link.getAttribute("href") || "";
          trackAnalyticsEvent(config.eventName, {
            page_path: window.location.pathname,
            item_href: href,
            item_type: config.type,
          });
        });
      });
    });
  }

  var fineMotionObserver = null;
  var pageTransitionBound = false;
  var pageTransitionNavigating = false;
  var pageSwapPrefetchTtlMs = 120000;
  var pageSwapPrefetchMaxEntries = 12;

  function isSecondaryPageSwapPath(pathname) {
    var path = String(pathname || "").toLowerCase();
    return (
      /(?:^|\/)(?:math|research|research-summary|projects|cv|music|photography|search|yin-le|portfolio-1|policy|accessibility|404)\.html$/.test(path) ||
      /(?:^|\/)music\/[^/]+\.html$/.test(path) ||
      /(?:^|\/)post\/[^/]+\.html$/.test(path) ||
      /(?:^|\/)photo\/[^/]+\.html$/.test(path)
    );
  }

  function shouldUsePageSwap(url) {
    if (!url || !document.body) {
      return false;
    }
    if (!/^https?:$/i.test(url.protocol)) {
      return false;
    }
    if (url.origin !== window.location.origin) {
      return false;
    }
    return isChronohazeSwappablePath(url.pathname || "");
  }

  function getPageSwapPrefetchCache() {
    window.ChronohazeShared = window.ChronohazeShared || {};
    if (!(window.ChronohazeShared.pageSwapPrefetchCache instanceof Map)) {
      window.ChronohazeShared.pageSwapPrefetchCache = new Map();
    }
    return window.ChronohazeShared.pageSwapPrefetchCache;
  }

  function trimPageSwapPrefetchCache() {
    var cache = getPageSwapPrefetchCache();
    while (cache.size > pageSwapPrefetchMaxEntries) {
      var oldestKey = cache.keys().next();
      if (oldestKey && !oldestKey.done) {
        cache.delete(oldestKey.value);
      } else {
        break;
      }
    }
  }

  function getPageSwapPrefetchEntry(url) {
    var cache = getPageSwapPrefetchCache();
    var key = url && url.href ? url.href : "";
    if (!key || !cache.has(key)) {
      return null;
    }
    var entry = cache.get(key);
    if (!entry || !entry.createdAt || Date.now() - entry.createdAt > pageSwapPrefetchTtlMs) {
      cache.delete(key);
      return null;
    }
    return entry;
  }

  function rememberPageSwapPrefetch(url, promise) {
    if (!url || !url.href || !promise) {
      return promise;
    }
    var cache = getPageSwapPrefetchCache();
    cache.set(url.href, {
      promise: promise,
      createdAt: Date.now(),
    });
    trimPageSwapPrefetchCache();
    return promise;
  }

  function fetchPageSwapHtml(url, options) {
    var opts = options || {};
    if (!url || !url.href) {
      return Promise.reject(new Error("invalid-url"));
    }

    var existing = !opts.forceFresh ? getPageSwapPrefetchEntry(url) : null;
    if (existing && existing.promise) {
      return existing.promise;
    }

    var requestPromise = fetch(url.href, {
      cache: opts.cacheMode || (opts.prefetch ? "force-cache" : "no-cache"),
      credentials: "same-origin",
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        return response.text();
      })
      .catch(function (error) {
        var cache = getPageSwapPrefetchCache();
        if (cache.get(url.href) && cache.get(url.href).promise === requestPromise) {
          cache.delete(url.href);
        }
        throw error;
      });

    if (opts.store !== false) {
      rememberPageSwapPrefetch(url, requestPromise);
    }

    return requestPromise;
  }

  function fetchPageSwapDocument(url, options) {
    return fetchPageSwapHtml(url, options).then(function (html) {
      var parser = new DOMParser();
      return parser.parseFromString(html, "text/html");
    });
  }

  function preloadPageSwapTarget(href) {
    var url;
    try {
      url = href instanceof URL ? href : new URL(href, window.location.href);
    } catch (_err) {
      return Promise.resolve(null);
    }

    if (!shouldUsePageSwap(url)) {
      return Promise.resolve(null);
    }

    var currentHref = "";
    try {
      currentHref = new URL(window.location.href).href;
    } catch (_err) {
      currentHref = window.location.href;
    }
    if (url.href === currentHref) {
      return Promise.resolve(null);
    }

    return fetchPageSwapHtml(url, { prefetch: true }).catch(function () {
      return null;
    });
  }

  function resolvePageSwapTarget(target) {
    if (!target || typeof target.closest !== "function") {
      return null;
    }

    var interactiveAncestor = target.closest(
      "a, button, input, select, textarea, summary, [contenteditable='true']"
    );
    var dataLinkTarget = target.closest("[data-post-url], [data-href]");
    if (dataLinkTarget && !interactiveAncestor) {
      var dataHref =
        dataLinkTarget.getAttribute("data-post-url") ||
        dataLinkTarget.getAttribute("data-href") ||
        "";
      if (dataHref) {
        return {
          href: dataHref,
          viaDataTarget: true,
          node: dataLinkTarget,
        };
      }
    }

    var link = target.closest("a[href]");
    if (!link) {
      return null;
    }

    if (
      link.dataset.noPageTransition === "1" ||
      link.hasAttribute("download") ||
      (link.getAttribute("target") || "").toLowerCase() === "_blank"
    ) {
      return null;
    }

    var rawHref = (link.getAttribute("href") || "").trim();
    if (!rawHref) {
      return null;
    }
    if (
      rawHref.charAt(0) === "#" ||
      /^(?:mailto|tel|javascript|data):/i.test(rawHref)
    ) {
      return null;
    }

    return {
      href: link.href,
      viaDataTarget: false,
      node: link,
    };
  }

  function syncHeadNode(selector, sourceDocument) {
    if (!document.head || !sourceDocument) {
      return;
    }
    var currentNode = document.head.querySelector(selector);
    var nextNode = sourceDocument.head ? sourceDocument.head.querySelector(selector) : null;
    if (!nextNode) {
      if (currentNode) {
        currentNode.parentNode.removeChild(currentNode);
      }
      return;
    }
    var imported = document.importNode(nextNode, true);
    if (currentNode && currentNode.parentNode) {
      currentNode.parentNode.replaceChild(imported, currentNode);
    } else {
      document.head.appendChild(imported);
    }
  }

  function syncHeadMetaFromDocument(sourceDocument, targetUrl) {
    if (!sourceDocument) {
      return;
    }

    document.title = sourceDocument.title || document.title;
    if (sourceDocument.documentElement && sourceDocument.documentElement.lang) {
      document.documentElement.lang = sourceDocument.documentElement.lang;
    }

    [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]',
      'meta[property="og:image"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
      'meta[name="twitter:image"]',
      'link[rel="canonical"]',
      'link[rel="icon"]',
      'link[rel="apple-touch-icon"]',
    ].forEach(function (selector) {
      syncHeadNode(selector, sourceDocument);
    });

    var canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical && targetUrl) {
      canonical.setAttribute("href", targetUrl.href);
    }
    var ogUrl = document.head.querySelector('meta[property="og:url"]');
    if (ogUrl && targetUrl) {
      ogUrl.setAttribute("content", targetUrl.href);
    }
  }

  function syncPageStylesFromDocument(sourceDocument, targetUrl) {
    if (!sourceDocument || !document.head) {
      return Promise.resolve();
    }

    var managedNames = ["styles.css", "styles.min.css", "home.css", "home.min.css"];

    function isManagedStylesheetHref(href) {
      var input = String(href || "").toLowerCase();
      return managedNames.some(function (name) {
        return input.indexOf(name) !== -1;
      });
    }

    function normalizeHref(node, baseUrl) {
      var raw = (node && node.getAttribute && node.getAttribute("href")) || "";
      if (!raw) {
        return "";
      }
      try {
        return new URL(raw, baseUrl || window.location.href).href;
      } catch (_err) {
        return raw;
      }
    }

    var currentNodes = Array.from(document.head.querySelectorAll('link[rel="stylesheet"][href]')).filter(function (node) {
      return isManagedStylesheetHref(node.getAttribute("href"));
    });
    var nextNodes = Array.from(sourceDocument.head.querySelectorAll('link[rel="stylesheet"][href]')).filter(function (node) {
      return isManagedStylesheetHref(node.getAttribute("href"));
    });

    var currentMap = new Map();
    currentNodes.forEach(function (node) {
      var currentHref = normalizeHref(node);
      if (currentHref) {
        node.setAttribute("href", currentHref);
        currentMap.set(currentHref, node);
      }
    });

    var nextHrefs = nextNodes.map(function (node) {
      return normalizeHref(node, (targetUrl && targetUrl.href) || sourceDocument.baseURI || window.location.href);
    }).filter(Boolean);

    currentNodes.forEach(function (node) {
      var href = normalizeHref(node);
      if (nextHrefs.indexOf(href) === -1 && node.parentNode) {
        node.parentNode.removeChild(node);
        return;
      }
      if (href) {
        node.setAttribute("href", href);
      }
    });

    var loadPromises = [];
    nextNodes.forEach(function (node) {
      var href = normalizeHref(node, (targetUrl && targetUrl.href) || sourceDocument.baseURI || window.location.href);
      if (!href || currentMap.has(href)) {
        return;
      }
      var imported = document.importNode(node, true);
      imported.setAttribute("href", href);
      loadPromises.push(
        new Promise(function (resolve) {
          imported.addEventListener("load", resolve, { once: true });
          imported.addEventListener("error", resolve, { once: true });
          document.head.appendChild(imported);
        })
      );
    });

    return Promise.all(loadPromises).then(function () {
      return true;
    });
  }

  function syncBodyAttributes(nextBody) {
    if (!document.body || !nextBody) {
      return;
    }

    var preserve = {
      pageTransitionEnabled: document.body.classList.contains("page-transition-enabled"),
      pageTransitionEntering: document.body.classList.contains("page-transition-entering"),
      pageTransitionLeaving: document.body.classList.contains("page-transition-leaving"),
      pageTransitionBusy: document.body.classList.contains("page-transition-busy"),
      pageTransitionSettled: document.body.classList.contains("page-transition-settled"),
      motionEnhanced: document.body.classList.contains("motion-enhanced"),
    };

    Array.from(document.body.attributes).forEach(function (attr) {
      document.body.removeAttribute(attr.name);
    });
    Array.from(nextBody.attributes).forEach(function (attr) {
      document.body.setAttribute(attr.name, attr.value);
    });

    if (preserve.pageTransitionEnabled) {
      document.body.classList.add("page-transition-enabled");
    }
    if (preserve.pageTransitionEntering) {
      document.body.classList.add("page-transition-entering");
    }
    if (preserve.pageTransitionLeaving) {
      document.body.classList.add("page-transition-leaving");
    }
    if (preserve.pageTransitionBusy) {
      document.body.classList.add("page-transition-busy");
    }
    if (preserve.pageTransitionSettled) {
      document.body.classList.add("page-transition-settled");
    }
    if (preserve.motionEnhanced) {
      document.body.classList.add("motion-enhanced");
    }
  }

  function removePjaxInjectedScripts() {
    Array.from(document.querySelectorAll("script[data-pjax-script='1']")).forEach(function (node) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  }

  function loadPageScriptsFromDocument(sourceDocument, targetUrl) {
    if (!sourceDocument) {
      return Promise.resolve();
    }

    removePjaxInjectedScripts();

    var scripts = Array.from(sourceDocument.querySelectorAll("script"));
    var chain = Promise.resolve();

    scripts.forEach(function (scriptNode) {
      var type = String(scriptNode.getAttribute("type") || "").trim().toLowerCase();
      if (
        type &&
        type !== "text/javascript" &&
        type !== "application/javascript" &&
        type !== "module"
      ) {
        return;
      }

      var src = (scriptNode.getAttribute("src") || "").trim();
      if (src) {
        if (/googletagmanager|protect-media(?:\.min)?\.js/i.test(src)) {
          return;
        }
        chain = chain.then(function () {
          return new Promise(function (resolve) {
            var script = document.createElement("script");
            script.dataset.pjaxScript = "1";
            if (type === "module") {
              script.type = "module";
            }
            try {
              script.src = new URL(src, (targetUrl && targetUrl.href) || window.location.href).href;
            } catch (_err) {
              script.src = src;
            }
            script.onload = resolve;
            script.onerror = resolve;
            document.body.appendChild(script);
          });
        });
        return;
      }

      var code = (scriptNode.textContent || "").trim();
      if (!code || /gtag\(|dataLayer/.test(code)) {
        return;
      }
      if (/chronohaze-critical-loading|__chronohazeReleaseCriticalLoader/.test(code)) {
        return;
      }

      chain = chain.then(function () {
        var script = document.createElement("script");
        script.dataset.pjaxScript = "1";
        if (type === "module") {
          script.type = "module";
        }
        script.textContent = code;
        document.body.appendChild(script);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    });

    return chain;
  }

  function replacePageShellFromDocument(sourceDocument) {
    if (!sourceDocument) {
      return false;
    }
    var nextPage = sourceDocument.querySelector(".home-page, .page");
    var currentPage = document.querySelector(".home-page, .page");
    if (!nextPage || !currentPage) {
      return false;
    }

    withMutationRefreshSuppressed(function () {
      destroyArticleScrollToc();
      document.body.classList.remove("menu-scroll-locked");
      document.documentElement.classList.remove("menu-scroll-locked");
      document.body.style.removeProperty("--menu-scroll-top");
      if (nextPage.classList && nextPage.classList.contains("home-page")) {
        Array.from(document.querySelectorAll('.floating-lang-switch')).forEach(function (node) {
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        });
      }
      syncBodyAttributes(sourceDocument.body);
      currentPage.replaceWith(document.importNode(nextPage, true));
    });

    return true;
  }

  function waitForPageSwapStability() {
    var waits = [
      new Promise(function (resolve) {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(resolve);
        });
      }),
      new Promise(function (resolve) {
        window.setTimeout(resolve, 240);
      }),
    ];

    if (
      document.fonts &&
      document.fonts.ready &&
      typeof document.fonts.ready.then === "function"
    ) {
      waits.push(
        Promise.race([
          document.fonts.ready.catch(function () {
            return null;
          }),
          new Promise(function (resolve) {
            window.setTimeout(resolve, 560);
          }),
        ])
      );
    }

    return Promise.allSettled(waits);
  }

  function finalizeSwappedPage(targetUrl) {
    pageTransitionNavigating = false;
    clearPendingPrimaryNav();
    if (document.body) {
      document.body.classList.remove("page-transition-leaving");
      document.body.classList.add("page-transition-entering");
    }

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (document.body) {
          document.body.classList.remove("page-transition-entering");
        }
      });
    });

    runTaskGroup(BOOT_TASK_GROUPS.navAndChrome);
    runTaskGroup(BOOT_TASK_GROUPS.pageArchitecture);
    runTaskGroup(BOOT_TASK_GROUPS.mediaAndProtection);
    runTaskGroup(BOOT_TASK_GROUPS.pagePolish);

    if (targetUrl && targetUrl.hash) {
      var hashTarget = document.getElementById(targetUrl.hash.replace(/^#/, ""));
      if (hashTarget && typeof hashTarget.scrollIntoView === "function") {
        hashTarget.scrollIntoView({ block: "start" });
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }

    try {
      window.dispatchEvent(new Event("pageshow"));
      document.dispatchEvent(new Event("chronohaze:page-swapped"));
    } catch (_err) {}

    return waitForPageSwapStability().then(function () {
      resolvePageSwapFeedback();
      return true;
    });
  }

  function navigateWithPageSwap(href, options) {
    var opts = options || {};
    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (_err) {
      window.location.href = href;
      return Promise.resolve(false);
    }

    if (!shouldUsePageSwap(url)) {
      pageTransitionNavigating = true;
      markPendingPrimaryNav(url.href);
      if (document.body) {
        document.body.classList.add("page-transition-leaving");
      }
      armPageSwapFeedback(url);
      window.setTimeout(function () {
        window.location.href = url.href;
      }, 120);
      return Promise.resolve(false);
    }

    pageTransitionNavigating = true;
    markPendingPrimaryNav(url.href);
    if (document.body) {
      document.body.classList.add("page-transition-leaving");
    }
    armPageSwapFeedback(url);

    if (opts.autoplayTrackOnArrival) {
      pendingPersistentTrackHref = opts.autoplayTrackOnArrival;
    }

    return fetchPageSwapDocument(url, { forceFresh: true, cacheMode: "no-cache", store: false })
      .then(function (nextDocument) {
        if (
          !nextDocument.body ||
          !isChronohazeSwappablePath(url.pathname)
        ) {
          throw new Error("unsupported-target");
        }

        syncHeadMetaFromDocument(nextDocument, url);
        return syncPageStylesFromDocument(nextDocument, url).then(function () {
          if (!opts.fromPopstate) {
            history.pushState({ chronohazePageSwap: true, href: url.href }, "", url.href);
          }

          if (!replacePageShellFromDocument(nextDocument)) {
            throw new Error("missing-page-shell");
          }

          return loadPageScriptsFromDocument(nextDocument, url).then(function () {
            return finalizeSwappedPage(url).then(function () {
              maybeAutoplayPendingPersistentTrack();
              return true;
            });
          });
        });
      })
      .catch(function (_error) {
        pageTransitionNavigating = false;
        cancelPageSwapFeedback();
        if (document.body) {
          document.body.classList.remove("page-transition-leaving");
        }
        if (!opts.fromPopstate) {
          window.location.href = url.href;
        }
        return false;
      });
  }

  function navigateChronohazeInternal(href, options) {
    var nextHref = toChronohazeAbsoluteUrl(href);
    if (!nextHref) {
      return Promise.resolve(false);
    }
    return navigateWithPageSwap(nextHref, options);
  }

  function setupPageTransitions() {
    if (
      pageTransitionBound ||
      !document.body ||
      (window.ChronohazeShared && window.ChronohazeShared.__pageTransitionBound)
    ) {
      return;
    }
    pageTransitionBound = true;
    window.ChronohazeShared = window.ChronohazeShared || {};
    window.ChronohazeShared.__pageTransitionBound = true;

    var reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    document.body.classList.add("page-transition-enabled");
    document.body.classList.add("page-transition-entering");

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (document.body) {
          document.body.classList.remove("page-transition-entering");
        }
      });
    });

    if (!history.state || !history.state.chronohazePageSwap) {
      try {
        history.replaceState({ chronohazePageSwap: true, href: window.location.href }, "", window.location.href);
      } catch (_err) {}
    }

    window.ChronohazeShared.navigateWithPageSwap = navigateWithPageSwap;

    window.addEventListener("pageshow", function () {
      pageTransitionNavigating = false;
      cancelPageSwapFeedback();
      clearPendingPrimaryNav();
      if (document.body) {
        document.body.classList.remove("page-transition-leaving");
        document.body.classList.remove("page-transition-entering");
      }
    });

    window.addEventListener("popstate", function () {
      if (!shouldUsePageSwap(new URL(window.location.href))) {
        return;
      }
      navigateWithPageSwap(window.location.href, { fromPopstate: true });
    });

    document.addEventListener(
      "pointerover",
      function (event) {
        if (!event || !event.target) {
          return;
        }
        var resolved = resolvePageSwapTarget(event.target);
        if (!resolved || !resolved.href) {
          return;
        }
        preloadPageSwapTarget(resolved.href);
      },
      true
    );

    document.addEventListener(
      "focusin",
      function (event) {
        if (!event || !event.target) {
          return;
        }
        var resolved = resolvePageSwapTarget(event.target);
        if (!resolved || !resolved.href) {
          return;
        }
        preloadPageSwapTarget(resolved.href);
      },
      true
    );

    document.addEventListener(
      "click",
      function (event) {
        if (pageTransitionNavigating || !event || event.defaultPrevented) {
          return;
        }

        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        var target = event.target;
        if (!target || typeof target.closest !== "function") {
          return;
        }

        var resolved = resolvePageSwapTarget(target);
        if (!resolved || !resolved.href) {
          return;
        }

        if (resolved.viaDataTarget) {
          event.preventDefault();
          event.stopImmediatePropagation();
          navigateChronohazeInternal(resolved.href);
          return;
        }

        var url;
        var current;
        try {
          url = new URL(resolved.href, window.location.href);
          current = new URL(window.location.href);
        } catch (_err) {
          return;
        }

        if (!/^https?:$/i.test(url.protocol) || url.origin !== current.origin) {
          return;
        }

        if (
          url.pathname === current.pathname &&
          url.search === current.search &&
          url.hash &&
          url.hash !== current.hash
        ) {
          return;
        }

        if (url.href === current.href) {
          return;
        }

        if (!shouldUsePageSwap(url)) {
          pageTransitionNavigating = true;
          markPendingPrimaryNav(url.href);
          if (document.body) {
            document.body.classList.add("page-transition-leaving");
          }
          armPageSwapFeedback(url);
          event.preventDefault();
          window.setTimeout(function () {
            window.location.href = url.href;
          }, 120);
          return;
        }

        event.preventDefault();
        navigateWithPageSwap(url.href);
      },
      true
    );

    document.addEventListener(
      "keydown",
      function (event) {
        if (
          pageTransitionNavigating ||
          !event ||
          event.defaultPrevented ||
          (event.key !== "Enter" && event.key !== " ")
        ) {
          return;
        }

        var target = event.target;
        if (!target || typeof target.closest !== "function") {
          return;
        }

        var dataLinkTarget = target.closest("[data-post-url], [data-href]");
        if (!dataLinkTarget) {
          return;
        }

        var dataHref =
          dataLinkTarget.getAttribute("data-post-url") ||
          dataLinkTarget.getAttribute("data-href") ||
          "";
        if (!dataHref) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        navigateChronohazeInternal(dataHref);
      },
      true
    );
  }

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

  function runTaskGroup(tasks) {
    tasks.forEach(function (task) {
      if (typeof task === "function") {
        try {
          task();
        } catch (error) {
          if (window.console && typeof window.console.error === "function") {
            window.console.error("[Chronohaze] task failed:", task.name || "anonymous", error);
          }
        }
      }
    });

    ensureSiteSharePanel();
  }

  var structuredDataModulePromise = null;

  function loadStructuredDataModule() {
    if (window.ChronohazeStructuredData && typeof window.ChronohazeStructuredData.ensureStructuredData === "function") {
      return Promise.resolve(window.ChronohazeStructuredData.ensureStructuredData);
    }

    if (structuredDataModulePromise) {
      return structuredDataModulePromise;
    }

    structuredDataModulePromise = new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src = resolveAssetCandidateUrl("assets/js/structured-data.js?v=20260322-schema2");
      script.async = true;
      script.onload = function () {
        if (window.ChronohazeStructuredData && typeof window.ChronohazeStructuredData.ensureStructuredData === "function") {
          resolve(window.ChronohazeStructuredData.ensureStructuredData);
          return;
        }
        resolve(null);
      };
      script.onerror = function () {
        resolve(null);
      };
      document.head.appendChild(script);
    }).then(function (impl) {
      structuredDataModulePromise = null;
      return impl;
    });

    return structuredDataModulePromise;
  }

  function ensureStructuredData() {
    if (!document.head) {
      return;
    }

    loadStructuredDataModule().then(function (ensureStructuredDataImpl) {
      if (typeof ensureStructuredDataImpl !== "function") {
        return;
      }
      ensureStructuredDataImpl({
        normalizeText: normalizeText,
      });
    });
  }

  window.ChronohazeShared = window.ChronohazeShared || {};
  window.ChronohazeShared.normalizeText = normalizeText;
  window.ChronohazeShared.detectPreferredLanguage = detectPreferredLanguage;
  window.ChronohazeShared.getSecondaryPageDictionary = getSecondaryPageDictionary;
  window.ChronohazeShared.uniqueMusicTags = uniqueMusicTags;
  window.ChronohazeShared.getMusicTagLabel = getMusicTagLabel;
  window.ChronohazeShared.trackAnalyticsEvent = trackAnalyticsEvent;

  var BOOT_TASK_GROUPS = {
    navAndChrome: [
      ensureSearchNavLink,
      dedupeNavLinks,
      ensureAccessibleControlLabels,
      enhanceObfuscatedEmailLinks,
      ensureSiteSharePanel,
      cacheMusicIntroPaletteSource,
      injectFloatingSiteLogo,
      injectFloatingLanguageSwitch,
    ],
    pageArchitecture: [setupMusicIndexListeningRoom],
    mediaAndProtection: [
      protectAllMedia,
      optimizeMediaLoading,
      upgradePhotoImageLoadingStrategy,
      optimizeImages,
    ],
    pagePolish: [
      ensureStructuredData,
      normalizeFooterMeta,
      ensureFooterFeedLinks,
      bindFooterMetaSync,
      ensureUnifiedPageLastUpdatedBadge,
      labelPhotoOrientation,
      ensurePhotoDetailContactLayout,
      setupPhotoDetailPager,
      ensureMusicDetailBackLink,
      ensurePersistentAudioDock,
      enhanceHomeFeaturedPlayer,
      enhanceMusicPlayers,
      enhanceMusicLyricsLayout,
      forceMusicLyricsVisibleOnCompactViewport,
      setupArticleScrollToc,
      ensureMathPostAdjacentNavigation,
      enableIndexRowLinks,
      bindCollectionLinkAnalytics,
      setupPageTransitions,
      setupFineMotionPass,
      setupDesktopCursorAtmosphere,
    ],
  };

  var MUTATION_REFRESH_TASKS = [
    ensureAccessibleControlLabels,
    enhanceObfuscatedEmailLinks,
    ensureStructuredData,
    ensureUnifiedPageLastUpdatedBadge,
    ensureFooterFeedLinks,
    optimizeMediaLoading,
    upgradePhotoImageLoadingStrategy,
    optimizeImages,
    labelPhotoOrientation,
    ensurePhotoDetailContactLayout,
    setupArticleScrollToc,
    ensureMathPostAdjacentNavigation,
    bindCollectionLinkAnalytics,
    forceMusicLyricsVisibleOnCompactViewport,
    setupFineMotionPass,
  ];

  var mutationRefreshScheduled = false;
  var mutationRefreshSuppressed = 0;

  function withMutationRefreshSuppressed(task) {
    mutationRefreshSuppressed += 1;
    try {
      return typeof task === "function" ? task() : undefined;
    } finally {
      mutationRefreshSuppressed = Math.max(0, mutationRefreshSuppressed - 1);
    }
  }

  function scheduleMutationRefresh() {
    if (mutationRefreshScheduled || mutationRefreshSuppressed > 0) {
      return;
    }
    mutationRefreshScheduled = true;
    window.requestAnimationFrame(function () {
      mutationRefreshScheduled = false;
      if (mutationRefreshSuppressed > 0) {
        return;
      }
      runTaskGroup(MUTATION_REFRESH_TASKS);
    });
  }

  function boot() {
    armBootFeedback();
    runTaskGroup(BOOT_TASK_GROUPS.navAndChrome);
    runTaskGroup(BOOT_TASK_GROUPS.pageArchitecture);
    runTaskGroup(BOOT_TASK_GROUPS.mediaAndProtection);
    runTaskGroup(BOOT_TASK_GROUPS.pagePolish);
    resolveBootFeedback();
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
    "selectstart",
    function (event) {
      if (isMediaTarget(event.target)) {
        stopEvent(event);
      }
    },
    true
  );

  document.addEventListener(
    "copy",
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

  window.addEventListener("pageshow", function (event) {
    if (!event || !event.persisted) {
      return;
    }
    if (!document.body) {
      return;
    }
    releaseCriticalLoader();
    document.body.classList.remove("page-booting");
    document.body.classList.remove("page-boot-ready");
    document.body.classList.remove("page-transition-busy");
    document.body.classList.remove("page-transition-settled");
  });

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

    scheduleMutationRefresh();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
