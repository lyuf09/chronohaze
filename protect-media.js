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
      "music/track-08.html": "Honkaku mystery (本格推理) (audio pending upload)",
      "music/track-10.html": "I Can’t Fall in Love Again (恋に落ちられない) (audio pending upload)",
      "music/track-11.html": "I hate you all. (我恨你们所有人) (audio pending upload)",
      "music/track-13.html": "Red Sandalwood (小葉紫檀) (audio pending upload)",
      "music/track-14.html": "Willow (柳)",
      "music/track-15.html": "Yorugao (Moonflower) (夜顔)",
      "music/track-16.html": "Mortal Frame (Utsusemi) (現人)",
      "music/track-17.html": "Moonlapse (feat. Johnny Zhou) (audio pending upload)",
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
            titleNode.textContent = musicTitleOverridesEn[href];
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
          var metalcoreTitle = metalcoreCard.querySelector(".math-title");
          var metalcoreDesc = metalcoreCard.querySelector(".math-desc");
          if (metalcoreTitle) {
            metalcoreTitle.textContent =
              "Metalcore Piano Lab | From Audio to Chart: A Discretization Experiment (WIP)";
          }
          if (metalcoreDesc) {
            metalcoreDesc.textContent =
              "From continuous audio to playable charts: onset detection, beat grids, section alignment, and playability constraints.";
          }
        }
        if (springCard) {
          var springTitle = springCard.querySelector(".math-title");
          var springDesc = springCard.querySelector(".math-desc");
          if (springTitle) {
            springTitle.textContent = "Spring 2026 | A New Research Direction";
          }
          if (springDesc) {
            springDesc.textContent =
              "Beginning undergraduate research in Cornell ORIE on first-order methods for constrained and composite optimization.";
          }
        }
        if (firstIsabelleCard) {
          var cardTitle = firstIsabelleCard.querySelector(".math-title");
          var cardDesc = firstIsabelleCard.querySelector(".math-desc");
          if (cardTitle) {
            cardTitle.textContent = "My First Isabelle Formalization Project";
          }
          if (cardDesc) {
            cardDesc.textContent =
              "Embedding verifiability into proof writing: from motivation to the Nemhauser–Wolsey theorem.";
          }
        }
        if (submodularCard) {
          var submodularTitle = submodularCard.querySelector(".math-title");
          var submodularDesc = submodularCard.querySelector(".math-desc");
          if (submodularTitle) {
            submodularTitle.textContent =
              "An Ongoing Isabelle Research Project: Formalising Submodular Greedy";
          }
          if (submodularDesc) {
            submodularDesc.textContent =
              "Formalising the greedy (1 − 1/e) guarantee for monotone submodular maximisation under cardinality constraints.";
          }
        }
      }

      document.title = safeLang === "en" ? "Mathematics | Chronohaze" : "数学 | Chronohaze";
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
      applyAffizierenLyricsInEnglish(safeLang);
      applyHeAndMeLyricsInEnglish(safeLang);
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
        ".floating-site-logo{position:fixed;right:22px;bottom:22px;width:102px;height:102px;border-radius:999px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:68;background:radial-gradient(circle,rgba(238,244,253,.3) 0%,rgba(238,244,253,.14) 46%,rgba(238,244,253,0) 78%);box-shadow:none;will-change:transform;animation:floatingSiteLogoBreath 5.4s ease-in-out infinite;}",
        ".floating-site-logo::before{content:'';position:absolute;inset:-24px;border-radius:inherit;background:radial-gradient(circle,rgba(211,221,241,.44) 0%,rgba(211,221,241,.2) 42%,rgba(211,221,241,0) 80%);filter:blur(8px);}",
        ".floating-site-logo::after{content:'';position:absolute;inset:-6px;border-radius:inherit;background:radial-gradient(circle,rgba(236,242,252,.34) 0%,rgba(236,242,252,.14) 50%,rgba(236,242,252,0) 80%);filter:blur(5px);}",
        ".floating-site-logo img{position:relative;z-index:1;width:76%;height:76%;object-fit:contain;opacity:1;filter:invert(1) brightness(.3) contrast(1.45) saturate(.55) drop-shadow(0 0 1px rgba(255,255,255,.2)) drop-shadow(0 0 6px rgba(94,111,148,.22));}",
        "@keyframes floatingSiteLogoBreath{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-2px) scale(1.03);}}",
        "@media (max-width: 900px){.floating-site-logo{width:76px;height:76px;right:14px;bottom:14px;}.floating-site-logo::before{inset:-14px;}.floating-site-logo::after{inset:-4px;}}",
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
    injectFloatingSiteLogo();
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
