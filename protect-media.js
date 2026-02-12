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

  function buildTrackArtist(article) {
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

  function buildTrackLabel(article) {
    var titleNode = article.querySelector("h1");
    var title = titleNode ? (titleNode.textContent || "").trim() : "TRACK";
    return {
      title: title.toUpperCase(),
      artist: buildTrackArtist(article),
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
        siteNotes: "网站说明",
        a11y: "无障碍支持",
        footerContactLead: "辗转不同国家无固定号码 请联系邮箱：",
        footerCities: "重庆 · Edinburgh · New york",
        musicPageTitle: "音乐作品集",
        musicIntro: "声音的纹理、情绪的回声、在时间里缓慢成形的片段。",
        musicLead: "仅收录 21 年开始的部分作品（我需要脸面）",
        mathPageTitle: "数学文章",
        mathIntro: "研究记录、实验笔记与结构化的思考。",
        photoPageTitle: "摄影作品集",
        photoIntro: "光的轨迹、线条的结构、人与空间的关系。",
        readMore: "查看更多",
        backToMusic: "返回音乐栏目",
        backToPhoto: "返回摄影栏目",
        backToMath: "返回数学栏目",
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
        siteNotes: "Privacy Policy",
        a11y: "Accessibility",
        footerContactLead:
          "No fixed phone number while moving across countries. Contact by email:",
        footerCities: "Chongqing · Edinburgh · New York",
        musicPageTitle: "Music Collection",
        musicIntro:
          "Textures of sound, echoes of emotion, fragments shaped slowly in time.",
        musicLead: "Selected works since 2021 (I need dignity).",
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
        readMore: "Read More",
        backToMusic: "Back to music",
        backToPhoto: "Back to photography",
        backToMath: "Back to mathematics",
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
        audio.closest(".music-detail-article") || document
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

    var introText =
      findSectionText(article, "作品介绍") ||
      findSectionText(article, "About the work");
    var palette = buildLyricsPalette(introText);

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
      [/作词作曲编曲吉他混音：/g, "Lyrics, composition, arrangement, guitar & mix: "],
      [/作词作曲编曲混音：/g, "Lyrics, composition, arrangement & mix: "],
      [/作词作曲编曲：/g, "Lyrics, composition & arrangement: "],
      [/作词编曲：/g, "Lyrics & arrangement: "],
      [/作词：/g, "Lyrics: "],
      [/作曲：/g, "Composition: "],
      [/编曲：/g, "Arrangement: "],
      [/钢琴与吉他录制：/g, "Piano & guitar recording: "],
      [/钢琴录制：/g, "Piano recording: "],
      [/吉他实录：/g, "Guitar tracking: "],
      [/吉他录音：/g, "Guitar recording: "],
      [/吉他录制：/g, "Guitar recording: "],
      [/贝斯录制：/g, "Bass recording: "],
      [/混音：/g, "Mix: "],
      [/作者：/g, "Artist: "],
    ];

    var translated = content;
    replacements.forEach(function (pair) {
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
      [/英国奥斯沃斯特里/g, "Oswestry, UK"],
      [/英国爱丁堡/g, "Edinburgh, UK"],
      [/英国韦茅斯/g, "Weymouth, UK"],
      [/中国重庆市/g, "Chongqing, China"],
      [/中国/g, "China"],
      [/英国/g, "UK "],
      [/重庆市/g, "Chongqing"],
      [/重庆/g, "Chongqing"],
      [/爱丁堡/g, "Edinburgh"],
      [/奥斯沃斯特里/g, "Oswestry"],
      [/韦茅斯/g, "Weymouth"],
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

  function setSamePageLanguageInUrl(lang) {
    var safeLang = lang === "en" ? "en" : "zh";
    var url = new URL(window.location.href);
    url.searchParams.set("lang", safeLang);
    window.location.href = url.toString();
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
      } else if (/Fay_Lyu_CV\.pdf/i.test(href)) {
        link.textContent = dict.navCV;
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

    if (document.body.classList.contains("music-index-page")) {
      var musicTitle = document.querySelector(".page-title");
      var musicIntro = document.querySelector(".page-head p");
      var musicLead = document.querySelector(".page-head .lead");
      var musicLongIntroNodes = Array.from(
        document.querySelectorAll(".music-intro-text p")
      );
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
      document.title = safeLang === "en" ? "Music | Chronohaze" : "音乐 | Chronohaze";
    }

    if (document.body.classList.contains("photo-index-page")) {
      var photoTitle = document.querySelector(".page-title");
      var photoIntro = document.querySelector(".page-head p");
      if (photoTitle) {
        photoTitle.textContent = dict.photoPageTitle;
      }
      if (photoIntro) {
        photoIntro.textContent = dict.photoIntro;
      }
      document.title = safeLang === "en" ? "Photography | Chronohaze" : "摄影 | Chronohaze";

      Array.from(document.querySelectorAll(".photo-subtitle")).forEach(function (node) {
        node.textContent = dict.readMore;
      });
    }

    if (document.body.classList.contains("math-index-page")) {
      var mathTitle = document.querySelector(".page-title");
      var mathIntro = document.querySelector(".page-head p");
      if (mathTitle) {
        mathTitle.textContent = dict.mathPageTitle;
      }
      if (mathIntro) {
        mathIntro.textContent = dict.mathIntro;
      }
      document.title = safeLang === "en" ? "Mathematics | Chronohaze" : "数学 | Chronohaze";
    }

    if (document.body.classList.contains("music-detail-page")) {
      var titleNode = document.querySelector(".music-detail-article h1");
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

  function boot() {
    injectFloatingLanguageSwitch();
    protectAllMedia();
    optimizeImages();
    labelPhotoOrientation();
    ensureMusicDetailBackLink();
    enhanceMusicPlayers();
    removeMusicDetailImages();
    enhanceMusicLyricsLayout();
    enableIndexRowLinks();
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
