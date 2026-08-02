(function () {
  "use strict";

  function fallbackNormalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  var normalizeText = fallbackNormalizeText;

  var STRUCTURED_DATA_SCRIPT_ID = "chronohaze-structured-data";
  var CHRONOHAZE_SITE_URL = "https://lyuf09.github.io/chronohaze/";
  var CHRONOHAZE_WEBSITE_ID = CHRONOHAZE_SITE_URL + "#website";
  var CHRONOHAZE_PERSON_ID = CHRONOHAZE_SITE_URL + "#person";
  var CHRONOHAZE_PERSON_SAME_AS = [
    "https://github.com/lyuf09",
    "https://www.linkedin.com/in/fay-lyu-uoe/",
    "https://www.instagram.com/lyuf09",
    "https://space.bilibili.com/35902781",
  ];

  function getCanonicalPageUrl() {
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) {
      try {
        var canonicalUrl = new URL(canonical.href, window.location.href);
        canonicalUrl.hash = "";
        canonicalUrl.search = "";
        return canonicalUrl.toString();
      } catch (_canonicalError) {
        return canonical.href;
      }
    }
    try {
      var url = new URL(window.location.href);
      url.hash = "";
      url.search = "";
      return url.toString();
    } catch (_error) {
      return window.location.href;
    }
  }

  function absolutizeUrl(href) {
    if (!href) {
      return "";
    }
    try {
      return new URL(href, window.location.href).toString();
    } catch (_error) {
      return String(href || "");
    }
  }

  function textContentOf(node) {
    if (!node) {
      return "";
    }
    var renderedText =
      typeof node.innerText === "string" && node.innerText
        ? node.innerText
        : node.textContent || "";
    return normalizeText(renderedText);
  }

  function contentAttr(selector) {
    var node = document.querySelector(selector);
    return node && node.getAttribute ? normalizeText(node.getAttribute("content") || "") : "";
  }

  function getLanguageKey() {
    var root = document.documentElement;
    var explicit = root && root.getAttribute("data-site-lang");
    if (explicit === "zh" || explicit === "en") return explicit;
    var lang = String((root && root.lang) || "").toLowerCase();
    return lang.indexOf("zh") === 0 ? "zh" : "en";
  }

  function isNodeInSelectedLanguage(node) {
    if (!node || !node.closest) return !!node;
    var block = node.closest("[data-lang-block]");
    return !block || block.getAttribute("data-lang-block") === getLanguageKey();
  }

  function localizedQuery(root, selector) {
    var scope = root || document;
    var nodes = Array.prototype.slice.call(scope.querySelectorAll(selector));
    return nodes.find(isNodeInSelectedLanguage) || null;
  }

  function localizedQueryAll(root, selector) {
    var scope = root || document;
    return Array.prototype.slice.call(scope.querySelectorAll(selector)).filter(isNodeInSelectedLanguage);
  }

  function removeStaticPageEntity(canonical) {
    var targetId = canonical + "#page";
    Array.prototype.slice
      .call(document.querySelectorAll('script[type="application/ld+json"]:not(#chronohaze-structured-data)'))
      .forEach(function (script) {
        if ((script.textContent || "").indexOf(targetId) !== -1) script.remove();
      });
  }

  function buildBaseWebGraph() {
    var canonical = getCanonicalPageUrl();
    var pathname = "";
    try {
      pathname = new URL(canonical).pathname || "";
    } catch (_e) {
      pathname = window.location.pathname || "";
    }
    var htmlLang = (document.documentElement && document.documentElement.lang) || "zh-CN";
    var metaDescription = contentAttr('meta[name="description"]');
    var ogImage = contentAttr('meta[property="og:image"]');
    var pageTitle = normalizeText(document.title || "");
    var h1 = textContentOf(localizedQuery(document, "h1"));
    var pageName = h1 || pageTitle || "Chronohaze";
    var pageType = "WebPage";
    var body = document.body;

    if (body) {
      if (body.classList.contains("home-body")) pageType = "ProfilePage";
      else if (body.classList.contains("math-index-page")) pageType = "CollectionPage";
      else if (body.classList.contains("photo-index-page")) pageType = "CollectionPage";
      else if (body.classList.contains("music-index-page")) pageType = "CollectionPage";
      else if (body.classList.contains("music-album-page")) pageType = "CollectionPage";
      else if (body.classList.contains("music-detail-page")) pageType = "WebPage";
      else if (body.classList.contains("academic-page")) pageType = "ProfilePage";
      else if (body.classList.contains("research-page")) pageType = "AboutPage";
      else if (body.classList.contains("projects-page")) pageType = "CollectionPage";
      else if (body.classList.contains("search-index-page")) pageType = "SearchResultsPage";
    }
    if (/\/cv\.html$/i.test(pathname)) {
      pageType = "ProfilePage";
    }

    var page = {
      "@type": pageType,
      "@id": canonical + "#webpage",
      url: canonical,
      name: pageName,
      description: metaDescription || undefined,
      inLanguage: htmlLang,
      isPartOf: { "@id": CHRONOHAZE_WEBSITE_ID },
      about: { "@id": CHRONOHAZE_PERSON_ID },
    };
    if (pageType === "ProfilePage") {
      page.mainEntity = { "@id": CHRONOHAZE_PERSON_ID };
    }
    if (ogImage) {
      page.primaryImageOfPage = { "@type": "ImageObject", url: absolutizeUrl(ogImage) };
    }

    var website = {
      "@type": "WebSite",
      "@id": CHRONOHAZE_WEBSITE_ID,
      url: CHRONOHAZE_SITE_URL,
      name: "CHRONOHAZE",
      alternateName: "Chronohaze",
      inLanguage: htmlLang,
      potentialAction: {
        "@type": "SearchAction",
        target: CHRONOHAZE_SITE_URL + "search.html?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    };

    var person = {
      "@type": "Person",
      "@id": CHRONOHAZE_PERSON_ID,
      name: "Feier Lyu",
      alternateName: ["Fay Lyu", "Feier Lyu", "Feier", "HazezZ"],
      givenName: "Feier",
      familyName: "Lyu",
      url: CHRONOHAZE_SITE_URL,
      image: CHRONOHAZE_SITE_URL + "assets/template/hero_portrait-1600.jpg",
      description:
        "Feier Lyu (commonly Fay Lyu) is a mathematics student at The University of Edinburgh who was an exchange student at Cornell University in 2025–2026. HazezZ is the name used for music, performance, and cross-media work.",
      affiliation: {
        "@type": "CollegeOrUniversity",
        name: "The University of Edinburgh",
        url: "https://www.ed.ac.uk/",
      },
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: "Cornell University",
        url: "https://www.cornell.edu/",
      },
      knowsAbout: [
        "Optimization Theory",
        "Formal Verification",
        "First-Order Optimization",
        "Submodular Optimization",
        "Network Localization",
        "Nonconvex Optimization",
        "Isabelle/HOL",
      ],
      sameAs: CHRONOHAZE_PERSON_SAME_AS.slice(),
    };

    return {
      canonical: canonical,
      pathname: pathname,
      htmlLang: htmlLang,
      pageTitle: pageTitle,
      pageName: pageName,
      metaDescription: metaDescription,
      ogImage: ogImage,
      page: page,
      website: website,
      person: person,
    };
  }

  function buildMathIndexStructuredData(base) {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".math-card[data-href]"));
    if (!cards.length) {
      return null;
    }
    var items = [];
    cards.forEach(function (card, index) {
      var href = card.getAttribute("data-href");
      if (!href) return;
      var title = textContentOf(card.querySelector("h3"));
      if (!title) return;
      items.push({
        "@type": "ListItem",
        position: index + 1,
        url: absolutizeUrl(href),
        name: title,
      });
    });
    if (!items.length) return null;
    return {
      "@type": "ItemList",
      "@id": base.canonical + "#math-itemlist",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: items.length,
      itemListElement: items,
    };
  }

  function buildPhotoIndexStructuredData(base) {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll(".photo-feature-card a[href], .photo-archive-row[href], .photo-archive a[href]")
    );
    if (!nodes.length) {
      return null;
    }
    var seen = Object.create(null);
    var items = [];
    nodes.forEach(function (a) {
      if (!a || !a.getAttribute) return;
      var href = a.getAttribute("href");
      if (!href || seen[href]) return;
      seen[href] = true;
      var title =
        textContentOf(a.querySelector(".photo-feature-title")) ||
        textContentOf(a.querySelector(".photo-archive-title")) ||
        textContentOf(a);
      if (!title) return;
      items.push({
        "@type": "ListItem",
        position: items.length + 1,
        url: absolutizeUrl(href),
        name: title,
      });
    });
    if (!items.length) return null;
    return {
      "@type": "ItemList",
      "@id": base.canonical + "#photo-groups",
      numberOfItems: items.length,
      itemListElement: items,
    };
  }

  function buildResearchStructuredData(base) {
    if (!document.body || !document.body.classList.contains("research-landing-page")) {
      return null;
    }
    var projectCards = localizedQueryAll(document, ".research-project-card");
    var itemList = null;
    if (projectCards.length) {
      itemList = {
        "@type": "ItemList",
        "@id": base.canonical + "#research-projects",
        numberOfItems: projectCards.length,
        itemListElement: projectCards
          .map(function (card, idx) {
            var title = textContentOf(card.querySelector("h3"));
            if (!title) return null;
            var firstLink = card.querySelector(".research-link-row a[href]");
            return {
              "@type": "ListItem",
              position: idx + 1,
              name: title,
              url: firstLink ? absolutizeUrl(firstLink.getAttribute("href")) : base.canonical,
            };
          })
          .filter(Boolean),
      };
    }

    return itemList ? [itemList] : [];
  }

  function buildMusicAlbumStructuredData(base) {
    if (!document.body || !document.body.classList.contains("music-album-page")) {
      return null;
    }
    var title = textContentOf(document.querySelector("h1")) || base.pageName;
    var imageNode = document.querySelector(".album-cover img, .album-cover-image, .album-cover");
    var imageUrl =
      (imageNode && imageNode.getAttribute && (imageNode.getAttribute("src") || imageNode.getAttribute("data-src"))) || "";
    var trackLinks = Array.prototype.slice.call(document.querySelectorAll(".album-tracklist .album-track-link"));
    var tracks = [];
    trackLinks.forEach(function (link) {
      var nameNode = link.querySelector(".album-track-name");
      var noNode = link.querySelector(".album-track-no");
      var name = textContentOf(nameNode);
      var pos = parseInt((textContentOf(noNode).match(/(\d+)/) || [])[1], 10);
      if (!name) return;
      tracks.push({
        "@type": "MusicRecording",
        position: isFinite(pos) ? pos : tracks.length + 1,
        name: name,
        url: absolutizeUrl(link.getAttribute("href") || base.canonical),
      });
    });
    var album = {
      "@type": "MusicAlbum",
      "@id": base.canonical + "#album",
      url: base.canonical,
      name: title,
      byArtist: { "@id": CHRONOHAZE_PERSON_ID },
      inLanguage: base.htmlLang,
      numTracks: tracks.length || undefined,
      track: tracks.length ? tracks : undefined,
      image: imageUrl ? absolutizeUrl(imageUrl) : undefined,
      description: base.metaDescription || undefined,
    };
    return [album];
  }

  function buildMusicDetailStructuredData(base) {
    if (!document.body || !document.body.classList.contains("music-detail-page")) {
      return null;
    }
    var title = textContentOf(document.querySelector("h1")) || base.pageName;
    var audios = Array.prototype.slice.call(document.querySelectorAll("audio[src]"));
    if (!audios.length) return null;
    var tracks = audios
      .map(function (audio, idx) {
        var src = audio.getAttribute("src");
        if (!src) return null;
        var trackTitle = normalizeText(audio.getAttribute("data-track-title") || "");
        return {
          "@type": "MusicRecording",
          "@id": base.canonical + "#recording-" + (idx + 1),
          name: trackTitle || (idx === 0 ? title : title + " (" + (idx + 1) + ")"),
          byArtist: { "@id": CHRONOHAZE_PERSON_ID },
          url: base.canonical,
          contentUrl: absolutizeUrl(src),
          inLanguage: base.htmlLang,
        };
      })
      .filter(Boolean);

    if (!tracks.length) return null;
    if (tracks.length === 1) {
      return tracks;
    }
    return [
      {
        "@type": "MusicPlaylist",
        "@id": base.canonical + "#playlist",
        url: base.canonical,
        name: title,
        numTracks: tracks.length,
        track: tracks.map(function (t) {
          return { "@id": t["@id"] };
        }),
        description: base.metaDescription || undefined,
      },
    ].concat(tracks);
  }

  function buildPostStructuredData(base) {
    if (!/\/(?:post|notes)\/[^/]+\.html$/i.test(base.pathname || "")) {
      return null;
    }
    var article = document.querySelector("article.article");
    if (!article) return null;
    var languageBlock = localizedQuery(article, "[data-lang-block]") || article;
    var headline = textContentOf(localizedQuery(languageBlock, "h1")) || base.pageName;
    var paras = localizedQueryAll(languageBlock, "p").filter(function (p) {
      return !p.closest(".article-meta, nav, footer, .academic-hub-links");
    });
    var articleText = normalizeText(
      paras
        .map(function (p) {
          return p && p.textContent ? p.textContent : "";
        })
        .join(" ")
    );
    var keywords = Array.prototype.slice
      .call(document.querySelectorAll('meta[property="article:tag"]'))
      .map(function (node) {
        return normalizeText(node.getAttribute("content") || "");
      })
      .filter(Boolean);
    var metaLines = localizedQueryAll(languageBlock, ".article-meta").map(textContentOf);
    if (!keywords.length) {
      var tagLine = metaLines.find(function (text) {
        return /^(?:Tags|标签)\s*[:：]/i.test(text);
      });
      if (!tagLine) {
        tagLine = metaLines.find(function (text) {
          return !/(?:Feier Lyu|HazezZ|posted|read|分钟|\d{4}[年-]|\d{1,2}月\d{1,2}日)/i.test(text);
        });
      }
      keywords = normalizeText((tagLine || "").replace(/^(?:Tags|标签)\s*[:：]\s*/i, ""))
        .split(/\s*[·,，]\s*/)
        .filter(Boolean);
    }
    var datePublished = contentAttr('meta[property="article:published_time"]');
    if (!datePublished) {
      var dateText = metaLines.join(" ");
      var isoMatch = dateText.match(/(20\d{2})[年-](\d{1,2})[月-](\d{1,2})日?/);
      var englishMatch = dateText.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})/i
      );
      var shortChineseMatch = dateText.match(/(?:^|\s|·)(\d{1,2})月(\d{1,2})日/);
      var monthNames = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
      ];
      if (isoMatch) {
        datePublished =
          isoMatch[1] + "-" + isoMatch[2].padStart(2, "0") + "-" + isoMatch[3].padStart(2, "0");
      } else if (englishMatch) {
        datePublished =
          englishMatch[3] +
          "-" +
          String(monthNames.indexOf(englishMatch[1].toLowerCase()) + 1).padStart(2, "0") +
          "-" +
          englishMatch[2].padStart(2, "0");
      } else if (shortChineseMatch) {
        datePublished =
          "2026-" + shortChineseMatch[1].padStart(2, "0") + "-" + shortChineseMatch[2].padStart(2, "0");
      }
    }
    var dateModified = contentAttr('meta[property="article:modified_time"]') || datePublished;
    return [
      {
        "@type": "BlogPosting",
        "@id": base.canonical + "#article",
        mainEntityOfPage: { "@id": base.canonical + "#webpage" },
        headline: headline,
        name: headline,
        description: base.metaDescription || undefined,
        articleBody: articleText || undefined,
        articleSection: /^\/chronohaze\/notes\//i.test(base.pathname || "") ? "Research" : "Mathematics",
        author: { "@id": CHRONOHAZE_PERSON_ID },
        contributor: /\/notes\/network_localization_structural_certificates\.html$/i.test(
          base.pathname || ""
        )
          ? {
              "@type": "Person",
              name: "Shoham Sabach",
              affiliation: {
                "@type": "CollegeOrUniversity",
                name: "Cornell University",
              },
            }
          : undefined,
        publisher: { "@id": CHRONOHAZE_PERSON_ID },
        datePublished: datePublished || undefined,
        dateModified: dateModified || undefined,
        image: base.ogImage
          ? {
              "@type": "ImageObject",
              url: absolutizeUrl(base.ogImage),
              width: 1200,
              height: 630,
            }
          : undefined,
        url: base.canonical,
        inLanguage: base.htmlLang,
        keywords: keywords.length ? keywords : undefined,
      },
    ];
  }

  function buildCollectionPageItemList(base) {
    if (!document.body) return null;
    if (document.body.classList.contains("music-index-page")) {
      var rows = Array.prototype.slice.call(document.querySelectorAll(".music-entry-card, .music-row, .music-list-row a[href]"));
      var items = [];
      rows.forEach(function (row) {
        var link =
          (row.tagName === "A" ? row : row.querySelector("a[href]")) ||
          (row.getAttribute && row.getAttribute("data-href") ? row : null);
        var href = "";
        if (link) {
          href = link.getAttribute ? link.getAttribute("href") || link.getAttribute("data-href") || "" : "";
        }
        if (!href) return;
        var title =
          textContentOf(row.querySelector(".music-entry-title")) ||
          textContentOf(row.querySelector(".music-title")) ||
          textContentOf(row.querySelector(".music-item-title")) ||
          textContentOf(link);
        if (!title) return;
        items.push({
          "@type": "ListItem",
          position: items.length + 1,
          name: title,
          url: absolutizeUrl(href),
        });
      });
      if (items.length) {
        return {
          "@type": "ItemList",
          "@id": base.canonical + "#music-list",
          numberOfItems: items.length,
          itemListElement: items,
        };
      }
    }
    return null;
  }

  function buildStructuredDataGraph() {
    var base = buildBaseWebGraph();
    removeStaticPageEntity(base.canonical);
    var graph = [base.website, base.person, base.page];
    var extras = [];

    if (document.body) {
      if (document.body.classList.contains("math-index-page")) {
        extras.push(buildMathIndexStructuredData(base));
      } else if (document.body.classList.contains("photo-index-page")) {
        extras.push(buildPhotoIndexStructuredData(base));
      } else if (document.body.classList.contains("research-landing-page")) {
        extras = extras.concat(buildResearchStructuredData(base) || []);
      } else if (document.body.classList.contains("music-album-page")) {
        extras = extras.concat(buildMusicAlbumStructuredData(base) || []);
      } else if (document.body.classList.contains("music-detail-page")) {
        extras = extras.concat(buildMusicDetailStructuredData(base) || []);
      } else if (document.body.classList.contains("music-index-page")) {
        extras.push(buildCollectionPageItemList(base));
      }
    }
    extras = extras.concat(buildPostStructuredData(base) || []);

    extras.forEach(function (item) {
      if (!item) return;
      graph.push(item);
    });

    return {
      "@context": "https://schema.org",
      "@graph": graph.filter(Boolean),
    };
  }

  function ensureStructuredData(options) {
    if (options && typeof options.normalizeText === "function") {
      normalizeText = options.normalizeText;
    }
    if (!document.head) {
      return;
    }
    var payload = buildStructuredDataGraph();
    if (!payload || !Array.isArray(payload["@graph"]) || !payload["@graph"].length) {
      return;
    }
    var json = JSON.stringify(payload);
    var existing = document.getElementById(STRUCTURED_DATA_SCRIPT_ID);
    if (existing && existing.textContent === json) {
      return;
    }
    var script = existing || document.createElement("script");
    script.type = "application/ld+json";
    script.id = STRUCTURED_DATA_SCRIPT_ID;
    script.textContent = json;
    if (!existing) {
      document.head.appendChild(script);
    }
  }


  window.ChronohazeStructuredData = window.ChronohazeStructuredData || {};
  window.ChronohazeStructuredData.ensureStructuredData = ensureStructuredData;
})();
