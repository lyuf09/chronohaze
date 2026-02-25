(function () {
  "use strict";

  function fetchJsonWithCandidates(relativePath) {
    var rel = String(relativePath || "").replace(/^\.\//, "");
    var urls = [];

    function push(url) {
      if (!url || urls.indexOf(url) >= 0) return;
      urls.push(url);
    }

    push(rel);
    push("./" + rel);

    try {
      var page = new URL(window.location.href);
      var pageBase = String(page.pathname || "").replace(/[^/]*$/, "/");
      push(pageBase + rel);
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

    var i = 0;
    function next() {
      if (i >= urls.length) return Promise.reject(new Error("not found"));
      var url = urls[i++];
      return fetch(url, { cache: "no-cache" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .catch(function () {
          return next();
        });
    }
    return next();
  }

  function textNode(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value || "";
    return node;
  }

  function setBilingualCopy(node, obj) {
    if (!node || !obj || typeof obj !== "object") return;
    if (typeof obj.zh === "string") node.setAttribute("data-copy-zh", obj.zh);
    if (typeof obj.en === "string") node.setAttribute("data-copy-en", obj.en);
    node.textContent = typeof obj.zh === "string" ? obj.zh : node.textContent;
  }

  function buildMathCard(item) {
    var href = (item && (item.url || item.readmore_url)) || "#";
    var article = document.createElement("article");
    article.className = "math-card";
    article.setAttribute("data-href", href);
    article.setAttribute("tabindex", "0");
    article.setAttribute("role", "link");

    article.appendChild(textNode("p", "math-date", item.date || ""));

    var h3 = textNode("h3", "math-title", "");
    var titleLink = textNode("a", "math-title-link", item.title || "");
    titleLink.href = href;
    h3.appendChild(titleLink);
    article.appendChild(h3);

    article.appendChild(textNode("p", "math-desc", item.excerpt || ""));

    var more = textNode("a", "math-more", "阅读全文");
    more.href = href;
    article.appendChild(more);

    return article;
  }

  function renderMathCatalog(payload) {
    if (!payload || !Array.isArray(payload.items)) return;
    var list = document.querySelector(".math-index-page .math-list");
    if (!list) return;
    var frag = document.createDocumentFragment();
    payload.items.forEach(function (item) {
      if (!item || !item.url) return;
      frag.appendChild(buildMathCard(item));
    });
    if (!frag.childNodes.length) return;
    list.textContent = "";
    list.appendChild(frag);
    list.dataset.catalogRendered = "1";
  }

  function buildPhotoFeaturedCard(item) {
    var article = document.createElement("article");
    article.className = "photo-feature-card";

    var a = document.createElement("a");
    a.className = "photo-feature-link";
    a.href = (item && item.url) || "#";

    var img = document.createElement("img");
    img.src = item.cover || "";
    img.alt = item.title || "";
    img.loading = "lazy";
    img.decoding = "async";
    a.appendChild(img);

    var meta = document.createElement("div");
    meta.className = "photo-feature-meta";

    var theme = textNode("p", "photo-feature-theme", "");
    var location = textNode("p", "photo-feature-location", "");
    var concept = textNode("p", "photo-feature-concept", "");
    setBilingualCopy(theme, item.theme);
    setBilingualCopy(location, item.location);
    setBilingualCopy(concept, item.concept);
    meta.appendChild(theme);
    meta.appendChild(location);
    meta.appendChild(concept);

    a.appendChild(meta);
    article.appendChild(a);
    return article;
  }

  function buildPhotoArchiveCard(item) {
    var isFilm = !!(item && item.is_film);
    var article = document.createElement("article");
    article.className = isFilm ? "photo-card photo-card-film" : "photo-card";

    var a = document.createElement("a");
    a.className = "photo-card-link";
    a.href = (item && item.url) || "#";

    if (isFilm) {
      var filmThumb = document.createElement("div");
      filmThumb.className = "photo-film-thumb";
      filmThumb.setAttribute("aria-hidden", "true");
      filmThumb.textContent = "▶";
      a.appendChild(filmThumb);
    } else {
      var img = document.createElement("img");
      img.src = item.cover || "";
      img.alt = item.alt || item.title || item.date || "";
      img.loading = "lazy";
      img.decoding = "async";
      a.appendChild(img);
    }

    var meta = document.createElement("div");
    meta.className = "photo-meta";
    meta.appendChild(textNode("p", "photo-date", item.date || item.title || ""));
    var subtitle = (item && item.subtitle) || "";
    if (typeof subtitle === "string" && subtitle.trim().toLowerCase() === "read more") {
      subtitle = "阅读全文";
    }
    meta.appendChild(textNode("p", "photo-subtitle", subtitle || "阅读全文"));
    a.appendChild(meta);
    article.appendChild(a);

    return article;
  }

  function renderPhotoCatalog(payload) {
    if (!payload || typeof payload !== "object") return;
    var featuredGrid = document.querySelector(".photo-index-page .photo-featured-grid");
    var archiveGrid = document.querySelector(".photo-index-page .photo-grid");

    if (featuredGrid && Array.isArray(payload.featured) && payload.featured.length) {
      var fragFeatured = document.createDocumentFragment();
      payload.featured.forEach(function (item) {
        if (!item || !item.url) return;
        fragFeatured.appendChild(buildPhotoFeaturedCard(item));
      });
      if (fragFeatured.childNodes.length) {
        featuredGrid.textContent = "";
        featuredGrid.appendChild(fragFeatured);
        featuredGrid.dataset.catalogRendered = "1";
      }
    }

    if (archiveGrid && Array.isArray(payload.archive) && payload.archive.length) {
      var fragArchive = document.createDocumentFragment();
      payload.archive.forEach(function (item) {
        if (!item || !item.url) return;
        fragArchive.appendChild(buildPhotoArchiveCard(item));
      });
      if (fragArchive.childNodes.length) {
        archiveGrid.textContent = "";
        archiveGrid.appendChild(fragArchive);
        archiveGrid.dataset.catalogRendered = "1";
      }
    }
  }

  function bootMathCatalogPage() {
    if (!document.body || !document.body.classList.contains("math-index-page")) return;
    if (document.body.dataset.mathCatalogBooted === "1") return;
    document.body.dataset.mathCatalogBooted = "1";
    fetchJsonWithCandidates("assets/data/math-catalog.json")
      .then(renderMathCatalog)
      .catch(function () {});
  }

  function bootPhotoCatalogPage() {
    if (!document.body || !document.body.classList.contains("photo-index-page")) return;
    if (document.body.dataset.photoCatalogBooted === "1") return;
    document.body.dataset.photoCatalogBooted = "1";
    fetchJsonWithCandidates("assets/data/photo-catalog.json")
      .then(renderPhotoCatalog)
      .catch(function () {});
  }

  function boot() {
    bootMathCatalogPage();
    bootPhotoCatalogPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
