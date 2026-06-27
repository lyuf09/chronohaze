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

  expect(errors).toEqual([]);
});

test("music index renders and remains interactive", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music.html", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.music-index-page")).toBeVisible();
  await expect(page.locator(".music-room-shell").first()).toBeVisible();
  await expect(page.locator(".music-room-selected")).toBeVisible();
  await expect.poll(async () => page.locator(".music-room-track-card").count()).toBeGreaterThan(3);
  await expect.poll(async () => page.locator(".music-room-album").count()).toBeGreaterThan(1);
  await expect(page.locator(".music-room-archive-section")).toBeVisible();
  await expect.poll(async () => page.locator(".music-room-archive-group").count()).toBeGreaterThan(2);

  const archiveFilter = page.locator(".music-room-archive-filter-select");
  if ((await archiveFilter.count()) > 0) {
    await archiveFilter.selectOption("progcore");
    await expect
      .poll(async () => page.locator(".music-room-archive-section .track-row:visible").count())
      .toBeGreaterThan(0);
  }

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

  await page.goto("cv.html", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".cv-utility-bar")).toBeVisible();
  await expect(page.locator("a.cv-research-link")).toBeVisible();

  await page.goto("research.html", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator("body.research-landing-page")).toBeVisible();
  await expect(page.locator("#research-projects")).toBeVisible();
  await expect(page.locator("#research-outputs")).toBeVisible();
  await expect.poll(async () => page.locator(".research-project-card").count()).toBeGreaterThan(1);

  expect(errors).toEqual([]);
});

test("album page renders cover and track links", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music/album-ipomoea-alba.html", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".album-cover img")).toBeVisible();
  await expect.poll(async () => page.locator(".album-tracklist .album-track-link").count()).toBeGreaterThan(10);
  await expect
    .poll(async () => page.locator(".album-tracklist [data-track-status], .album-tracklist .track-status-badge").count())
    .toBeGreaterThan(0);

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
    await expect(page.locator(".site-header .nav a")).toHaveCount(6);

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

test("academic page isolates languages and renders formalization evidence", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);

  await page.goto("academic.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const evidence = page.locator("#academic-proof-evidence");
  await expect(evidence).toBeVisible();
  await expect(evidence.locator('[data-lang-block="zh"]')).toBeVisible();
  await expect(evidence.locator('[data-lang-block="en"]')).toBeHidden();
  await expect(evidence.locator('[data-lang-block="zh"] .academic-evidence-list li')).toHaveCount(3);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

  await page.goto("academic.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(evidence.locator('[data-lang-block="zh"]')).toBeHidden();
  await expect(evidence.locator('[data-lang-block="en"]')).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("Formalization evidence", { exact: true })).toBeVisible();

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

test("photography vocabulary and Blue still frames render without overflow", async ({ page }, testInfo) => {
  const errors = trackPageErrors(page);

  await page.goto("photography.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".photo-vocabulary")).toBeVisible();
  await expect(page.locator(".photo-vocabulary")).toContainText("蓝灰色光线");
  await expect(page.locator(".photo-feature-why")).toHaveCount(3);

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
