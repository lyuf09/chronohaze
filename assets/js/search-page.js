(function () {
  "use strict";

  function getShared() {
    return window.ChronohazeShared || null;
  }

  function normalizeText(value) {
    var shared = getShared();
    if (shared && typeof shared.normalizeText === "function") {
      return shared.normalizeText(value);
    }
    return String(value || "");
  }

  function detectPreferredLanguage() {
    var shared = getShared();
    if (shared && typeof shared.detectPreferredLanguage === "function") {
      return shared.detectPreferredLanguage();
    }
    return "zh";
  }

  function getSecondaryPageDictionary(lang) {
    var shared = getShared();
    if (shared && typeof shared.getSecondaryPageDictionary === "function") {
      return shared.getSecondaryPageDictionary(lang);
    }
    return {};
  }

  function uniqueMusicTags(tags) {
    var shared = getShared();
    if (shared && typeof shared.uniqueMusicTags === "function") {
      return shared.uniqueMusicTags(tags);
    }
    return Array.isArray(tags) ? tags : [];
  }

  function getMusicTagLabel(tag, dict) {
    var shared = getShared();
    if (shared && typeof shared.getMusicTagLabel === "function") {
      return shared.getMusicTagLabel(tag, dict || {});
    }
    return tag;
  }

  function trackAnalyticsEvent(name, params) {
    var shared = getShared();
    if (shared && typeof shared.trackAnalyticsEvent === "function") {
      shared.trackAnalyticsEvent(name, params || {});
    }
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
    if (document.body.dataset.searchPageReady === "1") {
      return;
    }
    document.body.dataset.searchPageReady = "1";

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
    var autoExternalRedirected = false;
    var scopeFiles = {
      math: "assets/search-data/math.json",
      photo: "assets/search-data/photo.json",
      music: "assets/search-data/music.json",
      cv: "assets/search-data/cv.json",
      site: "assets/search-data/site.json",
    };
    var allScopes = ["math", "photo", "music", "cv", "site"];
    var musicCatalogOverridesByUrl = null;
    var musicCatalogOverridesPromise = null;
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
        return "";
      }
      var query = normalizeText(inputNode.value || "").trim();
      var q = "site:chronohaze.space";
      if (query) {
        q += " " + query;
      }
      var href = "https://www.google.com/search?q=" + encodeURIComponent(q);
      fallbackExternalNode.href = href;
      return href;
    }

    function maybeRedirectToExternalSearch(rawQuery) {
      if (!loadError || autoExternalRedirected) {
        return false;
      }
      var query = String(rawQuery || "").trim();
      if (!query) {
        return false;
      }
      var externalHref = updateFallbackExternalLink();
      if (!externalHref) {
        return false;
      }
      autoExternalRedirected = true;
      window.location.assign(externalHref);
      return true;
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
        if (/\/chronohaze(?:\/|$)/.test(page.pathname || "")) {
          var repoBase = (page.pathname || "").replace(/^(.*?\/chronohaze)\/.*$/, "$1");
          if (repoBase && repoBase !== page.pathname) {
            push(repoBase + "/" + rel);
            push(page.origin + repoBase + "/" + rel);
          }
        }
      } catch (_error) {
      }

      var scriptNode = document.querySelector(
        'script[src*="search-page.js"], script[src*="protect-media.js"]'
      );
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
          if (scope !== "music") {
            scopeCache[scope] = items;
            return items;
          }
          return loadMusicCatalogOverrides().then(function (catalogMap) {
            var patched = items.map(function (item) {
              var key = String(item.url || "").replace(/^\.?\//, "");
              var catalogItem = catalogMap[key];
              if (!catalogItem) {
                return item;
              }
              var next = Object.assign({}, item);
              if (Array.isArray(catalogItem.tags) && catalogItem.tags.length) {
                next.tags = catalogItem.tags.slice();
              }
              if (catalogItem.date) {
                next.date = catalogItem.date;
              }
              return next;
            });
            scopeCache[scope] = patched;
            return patched;
          });
        });
    }

    function loadMusicCatalogOverrides() {
      if (musicCatalogOverridesByUrl) {
        return Promise.resolve(musicCatalogOverridesByUrl);
      }
      if (musicCatalogOverridesPromise) {
        return musicCatalogOverridesPromise;
      }
      musicCatalogOverridesPromise = fetchJsonFromCandidates("assets/data/music-catalog.json")
        .then(function (payload) {
          var items = Array.isArray(payload && payload.items) ? payload.items : [];
          var map = Object.create(null);
          items.forEach(function (item) {
            if (!item || typeof item !== "object" || !item.url) {
              return;
            }
            map[String(item.url).replace(/^\.?\//, "")] = item;
          });
          musicCatalogOverridesByUrl = map;
          return musicCatalogOverridesByUrl;
        })
        .catch(function () {
          musicCatalogOverridesByUrl = Object.create(null);
          return musicCatalogOverridesByUrl;
        })
        .then(function (result) {
          musicCatalogOverridesPromise = null;
          return result;
        });
      return musicCatalogOverridesPromise;
    }

    function loadCombinedFallback() {
      function parseInlineFallback() {
        var node = document.getElementById("search-inline-fallback");
        if (!node) {
          return [];
        }
        var raw = node.textContent || "[]";
        if (raw.length > 8000) {
          return [];
        }
        try {
          var payload = JSON.parse(raw);
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

    function escapeRegExp(value) {
      return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function dedupeTerms(terms) {
      var seen = Object.create(null);
      return (Array.isArray(terms) ? terms : []).filter(function (term) {
        var key = String(term || "").toLowerCase();
        if (!key || seen[key]) {
          return false;
        }
        seen[key] = true;
        return true;
      });
    }

    function setHighlightedText(node, text, terms) {
      if (!node) {
        return;
      }
      var content = String(text || "");
      var highlightTerms = dedupeTerms(terms).filter(function (term) {
        return term.length >= 1;
      });
      if (!highlightTerms.length) {
        node.textContent = content;
        return;
      }

      var pattern = new RegExp(
        "(" +
          highlightTerms
            .slice()
            .sort(function (a, b) {
              return b.length - a.length;
            })
            .map(escapeRegExp)
            .join("|") +
          ")",
        "ig"
      );

      var fragment = document.createDocumentFragment();
      var lastIndex = 0;
      var match;
      while ((match = pattern.exec(content))) {
        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(content.slice(lastIndex, match.index))
          );
        }
        var mark = document.createElement("mark");
        mark.className = "search-hit";
        mark.textContent = match[0];
        fragment.appendChild(mark);
        lastIndex = match.index + match[0].length;
        if (match[0].length === 0) {
          pattern.lastIndex += 1;
        }
      }
      if (lastIndex < content.length) {
        fragment.appendChild(document.createTextNode(content.slice(lastIndex)));
      }
      node.textContent = "";
      node.appendChild(fragment);
    }

    function buildSearchPools(item, itemTags) {
      var titleRaw = String(item.title || "");
      var excerptRaw = String(item.excerpt || "");
      var contentRaw = String(item.content || "");
      var dateRaw = String(item.date || "");
      var sectionRaw = String(item.section || "");
      var tagsRaw = itemTags.join(" ");
      return {
        title: normalizeText(titleRaw).toLowerCase(),
        excerpt: normalizeText(excerptRaw).toLowerCase(),
        content: normalizeText(contentRaw).toLowerCase(),
        meta: normalizeText([sectionRaw, tagsRaw, dateRaw].join(" ")).toLowerCase(),
        all: normalizeText(
          [titleRaw, excerptRaw, contentRaw, sectionRaw, tagsRaw, dateRaw].join(" ")
        ).toLowerCase(),
      };
    }

    function scoreSearchMatch(terms, pools) {
      if (!terms.length) {
        return 0;
      }
      var score = 0;
      terms.forEach(function (term) {
        if (pools.title.indexOf(term) >= 0) {
          score += 8;
        }
        if (pools.excerpt.indexOf(term) >= 0) {
          score += 4;
        }
        if (pools.meta.indexOf(term) >= 0) {
          score += 3;
        }
        if (pools.content.indexOf(term) >= 0) {
          score += 1;
        }
      });
      return score;
    }

    function renderResults() {
      var rawQuery = String(inputNode.value || "").trim();

      if (!loaded) {
        setLoadingState(statusNode.textContent || dict.searchLoading);
        return;
      }

      setLoadedState();

      if (loadError) {
        if (maybeRedirectToExternalSearch(rawQuery)) {
          statusNode.textContent =
            dict.searchFallbackRedirecting || dict.searchFallbackText || dict.searchFallbackExternal;
          emptyNode.hidden = true;
          emptyNode.textContent = "";
          listNode.textContent = "";
          setFallbackVisibility(true);
          return;
        }
        statusNode.textContent =
          dict.searchFallbackModeLabel || dict.searchFallbackText || dict.searchFallbackExternal;
        emptyNode.hidden = true;
        emptyNode.textContent = "";
        listNode.textContent = "";
        setFallbackVisibility(true);
        return;
      }

      var scope = scopeNode.value || "all";
      var tag = tagNode.value || "all";
      var terms = rawQuery
        ? rawQuery
            .split(/\s+/)
            .map(function (term) {
              return normalizeText(term || "").toLowerCase().trim();
            })
            .filter(Boolean)
        : [];
      var rawTerms = rawQuery
        ? dedupeTerms(
            rawQuery
              .split(/\s+/)
              .map(function (term) {
                return String(term || "").trim();
              })
              .filter(Boolean)
          )
        : [];

      var matched = allItems.map(function (item) {
        var itemScope = getSearchItemScope(item);
        var itemTags = getItemTagLabels(item);
        if (scope !== "all" && itemScope !== scope) {
          return null;
        }
        if (tag !== "all" && itemTags.indexOf(tag) < 0) {
          return null;
        }
        var pools = buildSearchPools(item, itemTags);
        if (!terms.length) {
          return {
            item: item,
            score: 0,
          };
        }
        var matches = terms.every(function (term) {
          return pools.all.indexOf(term) >= 0;
        });
        if (!matches) {
          return null;
        }
        return {
          item: item,
          score: scoreSearchMatch(terms, pools),
        };
      }).filter(Boolean);

      matched.sort(function (a, b) {
        if ((b.score || 0) !== (a.score || 0)) {
          return (b.score || 0) - (a.score || 0);
        }
        return Number(b.item.sort || 0) - Number(a.item.sort || 0);
      });

      updateSearchUrl(rawQuery, scope, tag);
      var status = dict.searchResultCount.replace("{count}", String(matched.length));
      if (usingFallback) {
        status += " · " + dict.searchFallbackNotice;
      }
      statusNode.textContent = status;
      setFallbackVisibility(false);

      listNode.textContent = "";
      if (!matched.length) {
        emptyNode.hidden = false;
        emptyNode.textContent = rawQuery || tag !== "all" ? dict.searchResultZero : dict.searchEmptyHint;
        return;
      }

      emptyNode.hidden = true;
      var fragment = document.createDocumentFragment();
      matched.forEach(function (entry, index) {
        var item = entry.item;
        var li = document.createElement("li");
        li.className = "search-result-item";

        var link = document.createElement("a");
        link.className = "search-result-link";
        link.href = item.url || "#";
        link.addEventListener("click", function () {
          trackAnalyticsEvent("search_result_open", {
            page_path: window.location.pathname,
            result_href: item.url || "",
            scope: getSearchItemScope(item),
            rank: index + 1,
            query_length: rawQuery.length,
          });
        });

        var title = document.createElement("h3");
        title.className = "search-result-title";
        setHighlightedText(title, item.title || "", rawTerms);

        var meta = document.createElement("p");
        meta.className = "search-result-meta";
        var sectionLabel = getSearchSectionLabel(item, dict);
        meta.textContent = [item.date || "", sectionLabel].filter(Boolean).join(" · ");

        var excerpt = document.createElement("p");
        excerpt.className = "search-result-excerpt";
        setHighlightedText(excerpt, item.excerpt || "", rawTerms);

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
      if (maybeRedirectToExternalSearch(String(inputNode.value || "").trim())) {
        return;
      }
      trackAnalyticsEvent("search_submit", {
        page_path: window.location.pathname,
        query_length: String(inputNode.value || "").trim().length,
        scope: scopeNode.value || "all",
        tag: tagNode.value || "all",
      });
      renderResults();
    });

    updateFallbackExternalLink();
    loadItemsForScope(scopeNode.value || "all");
  }


  window.ChronohazeSearchPage = {
    setup: setupSearchIndexPage,
  };

  function bootSearchPage() {
    setupSearchIndexPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootSearchPage, { once: true });
  } else {
    bootSearchPage();
  }
})();
