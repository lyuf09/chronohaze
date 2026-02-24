(function () {
  "use strict";

  function fetchJsonWithCandidates(relativePath) {
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
      if (i >= urls.length) {
        return Promise.reject(new Error("not found"));
      }
      var url = urls[i++];
      return fetch(url, { cache: "no-cache" })
        .then(function (res) {
          if (!res.ok) {
            throw new Error("HTTP " + res.status);
          }
          return res.json();
        })
        .catch(function () {
          return next();
        });
    }
    return next();
  }

  function buildProjectCard(project) {
    var card = document.createElement("article");
    card.className = "research-project-card";

    function appendPara(html) {
      var p = document.createElement("p");
      p.innerHTML = html;
      card.appendChild(p);
    }

    if (project.kind) {
      var kind = document.createElement("p");
      kind.className = "research-project-kind";
      kind.textContent = project.kind;
      card.appendChild(kind);
    }
    if (project.title) {
      var h3 = document.createElement("h3");
      h3.textContent = project.title;
      card.appendChild(h3);
    }
    if (project.problem) {
      appendPara("<strong>Problem:</strong> " + project.problem);
    }
    if (project.method) {
      appendPara("<strong>Method:</strong> " + project.method);
    }
    if (project.current_status) {
      appendPara("<strong>Current status:</strong> " + project.current_status);
    }
    if (project.contribution) {
      appendPara("<strong>Contribution:</strong> " + project.contribution);
    }

    var links = Array.isArray(project.links) ? project.links : [];
    if (links.length) {
      var row = document.createElement("div");
      row.className = "research-link-row";
      links.forEach(function (link) {
        if (!link || !link.href) {
          return;
        }
        var a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.label || link.href;
        if (link.external) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        row.appendChild(a);
      });
      if (row.childNodes.length) {
        card.appendChild(row);
      }
    }

    return card;
  }

  function buildFastLink(item) {
    var a = document.createElement("a");
    a.className = "research-fast-link";
    a.href = item.href || "#";
    if (item.external) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    var kicker = document.createElement("span");
    kicker.className = "research-fast-link-kicker";
    kicker.textContent = item.kicker || "";
    var strong = document.createElement("strong");
    strong.textContent = item.title || "";
    var desc = document.createElement("span");
    desc.textContent = item.description || "";
    a.appendChild(kicker);
    a.appendChild(strong);
    a.appendChild(desc);
    return a;
  }

  function applyResearchCatalog(payload) {
    if (!payload || typeof payload !== "object") {
      return;
    }

    var hero = payload.hero || {};
    var interests = payload.interests || {};
    var projects = Array.isArray(payload.projects) ? payload.projects : [];
    var links = Array.isArray(payload.links) ? payload.links : [];
    var projectsSection = payload.projects_section || {};
    var linksSection = payload.links_section || {};

    var heroRoot = document.querySelector(".research-hero");
    if (heroRoot) {
      var eyebrow = heroRoot.querySelector(".research-eyebrow");
      var h1 = heroRoot.querySelector(".research-hero-copy h1");
      var subtitle = heroRoot.querySelector(".research-subtitle");
      var positioning = heroRoot.querySelector(".research-positioning");
      var chipRow = heroRoot.querySelector(".research-chip-row");
      var interestsTitle = heroRoot.querySelector(".research-hero-panel h2");
      var interestsList = heroRoot.querySelector(".research-hero-panel ul");

      if (eyebrow && hero.eyebrow) eyebrow.textContent = hero.eyebrow;
      if (h1 && hero.name) h1.textContent = hero.name;
      if (subtitle && hero.subtitle) subtitle.textContent = hero.subtitle;
      if (positioning && hero.positioning) positioning.textContent = hero.positioning;

      if (chipRow && Array.isArray(hero.chips) && hero.chips.length) {
        chipRow.textContent = "";
        hero.chips.forEach(function (chipText) {
          var chip = document.createElement("span");
          chip.className = "research-chip";
          chip.textContent = chipText;
          chipRow.appendChild(chip);
        });
      }

      if (interestsTitle && interests.title) {
        interestsTitle.textContent = interests.title;
      }
      if (interestsList && Array.isArray(interests.items) && interests.items.length) {
        interestsList.textContent = "";
        interests.items.forEach(function (line) {
          var li = document.createElement("li");
          li.textContent = line;
          interestsList.appendChild(li);
        });
      }
    }

    var projectsSectionRoot = document.querySelector(".research-projects-section");
    if (projectsSectionRoot) {
      var head = projectsSectionRoot.querySelector(".research-section-head");
      if (head) {
        var h2 = head.querySelector("h2");
        var p = head.querySelector("p");
        if (h2 && projectsSection.title) h2.textContent = projectsSection.title;
        if (p && projectsSection.lead) p.textContent = projectsSection.lead;
      }
      var grid = projectsSectionRoot.querySelector(".research-project-grid");
      if (grid && projects.length) {
        grid.textContent = "";
        projects.forEach(function (project) {
          grid.appendChild(buildProjectCard(project));
        });
      }
    }

    var linksSectionRoot = document.querySelector(".research-fast-links-section");
    if (linksSectionRoot) {
      var head2 = linksSectionRoot.querySelector(".research-section-head");
      if (head2) {
        var h22 = head2.querySelector("h2");
        var p2 = head2.querySelector("p");
        if (h22 && linksSection.title) h22.textContent = linksSection.title;
        if (p2 && linksSection.lead) p2.textContent = linksSection.lead;
      }
      var grid2 = linksSectionRoot.querySelector(".research-fast-links-grid");
      if (grid2 && links.length) {
        grid2.textContent = "";
        links.forEach(function (item) {
          grid2.appendChild(buildFastLink(item));
        });
      }
    }
  }

  function bootResearchPage() {
    if (!document.body || !document.body.classList.contains("research-landing-page")) {
      return;
    }
    if (document.body.dataset.researchCatalogReady === "1") {
      return;
    }
    document.body.dataset.researchCatalogReady = "1";
    fetchJsonWithCandidates("assets/data/research-catalog.json")
      .then(applyResearchCatalog)
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootResearchPage, { once: true });
  } else {
    bootResearchPage();
  }
})();
