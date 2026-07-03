const { test, expect } = require("@playwright/test");

function trackPageErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => {
    errors.push(String(err && err.message ? err.message : err));
  });
  return errors;
}

async function waitForCriticalLoaderRelease(page) {
  await page.waitForFunction(() => {
    return !document.documentElement.classList.contains("chronohaze-critical-loading");
  });
}

test("home page renders hero and player shell", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("index.html", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.home-body")).toBeVisible();
  await expect(page.locator(".hero-portrait")).toBeVisible();
  await expect(page.locator("#playerShell")).toBeVisible();
  await expect(page.locator("#playerTime")).not.toHaveText(/^$/);
  await expect(page.locator("#selected-evidence")).toBeVisible();
  await expect(page.locator(".selected-evidence-card")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Selected Evidence" })).toBeVisible();
  await expect(page.locator(".now-card").first()).toContainText("正式发表于 Archive of Formal Proofs");
  await expect(page.locator(".now-card").first().locator(".now-card-links a")).toHaveCount(4);
  await expect(page.locator(".math-grid article").first()).toHaveClass(/math-afp-card/);
  await expect(page.locator(".math-grid article").first()).toContainText(
    "Greedy Algorithms for Cardinality-Constrained Submodular Maximization"
  );
  await expect(page.locator(".math-grid article").first().locator(".math-evidence-links a")).toHaveCount(4);
  await expect(page.locator(".math-grid article").filter({ hasText: "TTGDA" })).toHaveCount(1);

  expect(errors).toEqual([]);
});

test("music index renders and remains interactive", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.music-index-page")).toBeVisible();
  await expect(page.locator(".music-room-shell").first()).toBeVisible();
  await expect(page.locator(".music-room-selected")).toBeVisible();
  await expect.poll(async () => page.locator(".music-room-track-card").count()).toBeGreaterThan(3);
  await expect(page.locator(".music-room-track-roles")).toHaveCount(5);
  await expect(page.locator(".music-room-track-card").first().locator(".music-room-track-role")).toHaveCount(6);
  await expect(page.locator(".music-room-track-card").first().locator(".music-room-track-roles")).toContainText("贝斯");
  await expect(page.locator(".music-room-track-card").nth(2).locator(".music-room-track-role")).toHaveCount(3);
  await expect.poll(async () => page.locator(".music-room-album").count()).toBeGreaterThan(1);
  await expect(page.locator(".music-room-album-credit")).toHaveText(
    "除特别说明外，作品的写作、编曲、演奏、录制与制作均由 HazezZ 完成。"
  );
  await expect(page.locator(".music-room-archive-section")).toBeVisible();
  await expect.poll(async () => page.locator(".music-room-archive-group").count()).toBeGreaterThan(2);

  const archiveFilter = page.locator(".music-room-archive-filter-select");
  if ((await archiveFilter.count()) > 0) {
    await archiveFilter.selectOption("progcore");
    await expect
      .poll(async () => page.locator(".music-room-archive-section .track-row:visible").count())
      .toBeGreaterThan(0);
  }

  await page.goto("music.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".music-room-track-card").first().locator(".music-room-track-roles")).toContainText(
    "writing"
  );
  await expect(page.locator(".music-room-album-credit")).toHaveText(
    "Written, arranged, performed and produced by HazezZ, unless otherwise noted."
  );

  expect(errors).toEqual([]);
});

test("search page loads grouped results and query state works", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("search.html", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.search-index-page")).toBeVisible();
  await expect(page.locator("#site-search-input")).toBeVisible();

  await page.fill("#site-search-input", "Affizieren");
  await page.click(".search-submit");

  await expect.poll(async () => page.locator(".search-result-link").count()).toBeGreaterThan(0);
  await expect.poll(async () => page.locator(".search-result-group").count()).toBeGreaterThan(0);
  await expect(page).toHaveURL(/[\?&]q=Affizieren/);

  expect(errors).toEqual([]);
});

test("cv and research pages render key faculty-entry nodes", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("cv.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  const cvEnglish = page.locator('[data-lang-block="en"]');
  await expect(page.locator(".cv-utility-bar")).toBeVisible();
  await expect(page.locator("a.cv-research-link")).toBeVisible();
  await expect(cvEnglish.locator("#cv-en-highlights")).toContainText("Expected graduation: 2027");
  await expect(cvEnglish.locator("#cv-en-projects")).toContainText("Published in the Archive of Formal Proofs");
  await expect(cvEnglish.getByRole("heading", { name: "Selected Evidence" })).toBeVisible();
  await expect(cvEnglish.getByRole("link", { name: "AFP entry" })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(cvEnglish.getByRole("link", { name: "Isabelle/HOL formalization repo" })).toBeVisible();
  await expect(cvEnglish.locator("#cv-en-experience")).toContainText("Location: currently between Chongqing, Edinburgh, and Ithaca");

  await page.goto("research.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator("body.research-landing-page")).toBeVisible();
  await expect(page.locator('.research-hero [data-lang-block="zh"] h1')).toHaveText("研究陈述");
  await expect(page.locator("#research-projects")).toBeVisible();
  await expect(page.locator("#research-outputs")).toBeVisible();
  await expect.poll(async () => page.locator(".research-project-card").count()).toBeGreaterThan(1);
  const formalizationLine = page.locator(
    '#research-projects [data-lang-block="zh"] .research-project-card'
  ).first();
  await expect(formalizationLine).toContainText("已正式发表于 Archive of Formal Proofs");
  await expect(formalizationLine).toContainText("future extension / experimental branch");
  await expect(formalizationLine.getByRole("link", { name: "AFP entry" })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(
    page.locator('#research-projects [data-lang-block="zh"] .research-project-card').nth(2)
  ).toContainText("这还不是一条成熟的研究线");

  expect(errors).toEqual([]);
});

test("album page renders cover and track links", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music/album-ipomoea-alba.html", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".album-cover img")).toBeVisible();
  await expect(page.locator(".album-authorship")).toHaveText(
    "除特别说明外，作品的写作、编曲、演奏、录制与制作均由 HazezZ 完成。"
  );
  await expect.poll(async () => page.locator(".album-tracklist .album-track-link").count()).toBeGreaterThan(10);
  await expect
    .poll(async () => page.locator(".album-tracklist [data-track-status], .album-tracklist .track-status-badge").count())
    .toBeGreaterThan(0);

  await page.goto("music/album-ipomoea-alba.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".album-authorship")).toHaveText(
    "Written, arranged, performed and produced by HazezZ, unless otherwise noted."
  );

  expect(errors).toEqual([]);
});

test("secondary pages keep mobile nav within the viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone13", "mobile-only nav safety check");

  const pages = [
    "policy.html",
    "accessibility.html",
    "search.html",
    "music/album-ipomoea-alba.html",
    "music/album-teenage-best.html",
  ];

  for (const path of pages) {
    const errors = trackPageErrors(page);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await waitForCriticalLoaderRelease(page);

    await expect(page.locator(".site-header .nav")).toBeVisible();
    await expect(page.locator(".site-header .nav a")).toHaveCount(5);

    const navTargets = await page.locator(".site-header .nav a").evaluateAll((links) =>
      links.map((link) => (link.getAttribute("href") || "").replace(/^\.\.\//, ""))
    );
    expect(navTargets).toEqual([
      "index.html",
      "academic.html",
      "music.html",
      "photography.html",
      "cv.html",
    ]);

    const metrics = await page.evaluate(() => {
      const nav = document.querySelector(".site-header .nav");
      const header = document.querySelector(".site-header");
      const body = document.body;
      const root = document.documentElement;
      return {
        viewport: window.innerWidth,
        rootScrollWidth: root ? root.scrollWidth : 0,
        bodyScrollWidth: body ? body.scrollWidth : 0,
        headerScrollWidth: header ? header.scrollWidth : 0,
        navScrollWidth: nav ? nav.scrollWidth : 0,
      };
    });

    expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.headerScrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.navScrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(errors).toEqual([]);
  }
});

test("academic page isolates languages and renders a concise academic index", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);

  await page.goto("academic.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const evidence = page.locator("#selected-academic-work");
  await expect(evidence).toBeVisible();
  await expect(evidence.locator('[data-lang-block="zh"]')).toBeVisible();
  await expect(page.locator('main [data-lang-block="en"]')).toHaveCount(0);
  await expect(page.locator('.research-hero [data-lang-block="zh"] .research-link-row a')).toHaveCount(3);
  await expect(evidence.locator('[data-lang-block="zh"] .academic-evidence-list li')).toHaveCount(4);
  await expect(evidence.getByRole("link", { name: "AFP entry" })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator("body")).toHaveAttribute("data-rendered-lang", "zh");

  await page.goto("academic.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator('main [data-lang-block="zh"]')).toHaveCount(0);
  await expect(evidence.locator('[data-lang-block="en"]')).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("body")).toHaveAttribute("data-rendered-lang", "en");
  await expect(page.getByText("Selected Academic Work", { exact: true })).toBeVisible();
  await expect(evidence.locator('[data-lang-block="en"] .academic-evidence-list li').first()).toContainText(
    "AFP publication"
  );

  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);

  await evidence.screenshot({
    path: `/tmp/chronohaze-academic-evidence-${testInfo.project.name}.png`,
  });
  expect(errors).toEqual([]);
});

test("AFP publication status stays synchronized across work page and project history", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("projects.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  const publishedProject = page.locator(
    '#selected-work-list [data-lang-block="en"] > .academic-evidence > .academic-evidence-list li'
  ).first();
  await expect(publishedProject).toContainText("Published in the Archive of Formal Proofs, 2026");
  await expect(publishedProject.getByRole("link", { name: "AFP", exact: true })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(publishedProject.getByRole("link", { name: "DOI", exact: true })).toHaveAttribute(
    "href",
    "https://doi.org/10.5281/zenodo.21054718"
  );
  await expect(
    page.locator('#selected-work-list [data-lang-block="en"] .academic-hub-links .academic-evidence-list li')
  ).toContainText("Metalcore Piano Lab");

  await page.goto("post/theorem-to-framework-isabelle-submodular.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);
  const update = page.locator('[data-lang-block="en"] .math-post-update');
  await expect(update).toBeVisible();
  await expect(update).toContainText("accepted and published in the Archive of Formal Proofs");
  await expect(update.getByRole("link", { name: "AFP entry" })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(update.getByRole("link", { name: "DOI: 10.5281/zenodo.21054718" })).toHaveAttribute(
    "href",
    "https://doi.org/10.5281/zenodo.21054718"
  );

  expect(errors).toEqual([]);
});

test("new AFP note leads the math archive and exposes primary evidence", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("math.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.getByRole("heading", { name: "学术笔记 / Technical Notes" })).toBeVisible();
  await expect(page.locator("#pinned-notes .academic-evidence-list li")).toHaveCount(4);
  await expect(page.locator("#pinned-notes .academic-evidence-list li").nth(0)).toContainText(
    "TTGDA and Second-Order Tracking"
  );
  await expect(page.locator("#pinned-notes .academic-evidence-list li").nth(1)).toContainText(
    "Projected Gradient Descent in Isabelle/HOL"
  );
  await expect(page.locator("#pinned-notes .academic-evidence-list li").nth(2)).toContainText(
    "Dual Score to Saddle Certificates"
  );
  await expect(page.locator("#pinned-notes .academic-evidence-list li").nth(3)).toContainText(
    "Isabelle Submodular Greedy Project"
  );
  await expect(page.locator("#notes-archive")).toBeVisible();
  const firstNote = page.locator(".math-list .math-card").first();
  await expect(firstNote).toContainText("子模贪心算法形式化正式进入 AFP");
  await expect(firstNote.locator(".math-date")).toContainText("2026-06-30");

  await page.goto("post/submodular-greedy-formalization-enters-afp.html?lang=zh", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);
  const zhNote = page.locator('[data-lang-block="zh"]');
  await expect(zhNote.getByRole("heading", { name: "子模贪心算法形式化正式进入 AFP" })).toBeVisible();
  await expect(zhNote).toContainText("Isabelle/HOL, submodular maximization, greedy algorithms");
  await expect(zhNote.getByRole("link", { name: "AFP entry" })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(zhNote.getByRole("link", { name: "DOI: 10.5281/zenodo.21054718" })).toHaveAttribute(
    "href",
    "https://doi.org/10.5281/zenodo.21054718"
  );
  await expect(zhNote.getByRole("link", { name: "GitHub repository" })).toHaveAttribute(
    "href",
    "https://github.com/lyuf09/isabelle-submodular-greedy/tree/afp-cleanup"
  );

  await page.goto("post/submodular-greedy-formalization-enters-afp.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);
  await expect(page.getByRole("heading", { name: "Formalizing Submodular Greedy Is Now in the AFP" })).toBeVisible();
  await expect(page.locator('[data-lang-block="zh"]')).toBeHidden();

  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
  expect(errors).toEqual([]);
});

test("photography vocabulary and Blue still frames render without overflow", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);

  await page.goto("photography.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".photo-vocabulary")).toBeVisible();
  await expect(page.locator(".photo-vocabulary")).toContainText("蓝灰色光线");
  await expect(page.locator(".photo-feature-why")).toHaveCount(3);
  await expect(page.locator(".photo-feature-view")).toHaveCount(3);
  await expect(page.locator(".photo-feature-view").first()).toHaveText("进入系列");
  await expect(page.getByRole("heading", { name: "Blue / Moving Image Work" })).toBeVisible();
  await expect(page.locator(".photo-blue-evidence-result")).toContainText("满分");
  await expect(page.locator(".photo-blue-evidence-stills img")).toHaveCount(5);

  const photographyMetrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(photographyMetrics.scrollWidth).toBeLessThanOrEqual(photographyMetrics.viewport + 2);

  await page.locator(".photo-vocabulary").screenshot({
    path: `/tmp/chronohaze-photo-vocabulary-${testInfo.project.name}.png`,
  });

  await page.route("**/assets/template/blue.mp4", (route) => route.abort());
  await page.goto("photo/blue.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".photo-blue-statement")).toContainText("同一个记忆空间");
  await expect(page.locator(".photo-blue-award")).toContainText("满分");
  await expect(page.locator(".photo-blue-still-grid img")).toHaveCount(5);
  await expect
    .poll(async () => {
      return page.locator(".photo-blue-still-grid img").evaluateAll((images) => {
        return images.filter((image) => image.complete && image.naturalWidth > 0).length;
      });
    })
    .toBe(5);

  const blueMetrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    columns: getComputedStyle(document.querySelector(".photo-blue-still-grid")).gridTemplateColumns,
  }));
  expect(blueMetrics.scrollWidth).toBeLessThanOrEqual(blueMetrics.viewport + 2);
  if (testInfo.project.name === "iphone13") {
    expect(blueMetrics.columns.trim().split(/\s+/)).toHaveLength(1);
  }

  await page.locator(".photo-blue-stills").screenshot({
    path: `/tmp/chronohaze-blue-stills-${testInfo.project.name}.png`,
  });
  expect(errors).toEqual([]);
});

test("photo detail page supports keyboard prev/next navigation", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("photo/photo-01.html", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".photo-detail-article, .photo-blue-article")).toBeVisible();
  await expect(page.locator(".photo-detail-pager")).toBeVisible();
  await expect(page.locator(".photo-detail-pager [data-photo-nav-label='next']")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/photo\/photo-02\.html$/);
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".photo-detail-pager")).toBeVisible();

  expect(errors).toEqual([]);
});
