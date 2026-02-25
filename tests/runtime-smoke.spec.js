const { test, expect } = require("@playwright/test");

function trackPageErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => {
    errors.push(String(err && err.message ? err.message : err));
  });
  return errors;
}

test("home page renders hero and player shell", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("index.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator("body.home-body")).toBeVisible();
  await expect(page.locator(".hero-portrait")).toBeVisible();
  await expect(page.locator("#playerShell")).toBeVisible();
  await expect(page.locator("#playerTime")).not.toHaveText(/^$/);

  expect(errors).toEqual([]);
});

test("music index renders and remains interactive", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("yin-le.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator("body.music-index-page")).toBeVisible();
  await expect(page.locator(".music-ia-shell")).toBeVisible();
  await expect(page.locator(".music-ia-tab")).toHaveCount(2);
  const initialTrackRows = page.locator(".track-row");
  await expect.poll(async () => initialTrackRows.count()).toBeGreaterThan(3);

  const singlesTab = page.locator(
    ".music-ia-tab[data-group-filter='single'], .music-ia-tab[data-group='single']"
  );
  await singlesTab.click();
  await expect(singlesTab).toHaveClass(/is-active/);
  await expect.poll(async () => page.locator(".music-group").count()).toBeGreaterThan(0);

  const audioSelect = page.locator("select[data-filter='audio']");
  if ((await audioSelect.count()) > 0) {
    await audioSelect.selectOption("ready");
    await expect.poll(async () => page.locator(".track-row:visible").count()).toBeGreaterThan(0);
  }

  expect(errors).toEqual([]);
});

test("search page loads grouped results and query state works", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("search.html", { waitUntil: "domcontentloaded" });

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
  await expect(page.locator(".cv-utility-bar")).toBeVisible();
  await expect(page.locator("a.cv-research-link")).toBeVisible();

  await page.goto("research.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body.research-landing-page")).toBeVisible();
  await expect(page.locator("#research-projects")).toBeVisible();
  await expect(page.locator("#research-outputs")).toBeVisible();
  await expect.poll(async () => page.locator(".research-project-card").count()).toBeGreaterThan(1);

  expect(errors).toEqual([]);
});

test("album page renders cover and track links", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music/album-ipomoea-alba.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".album-cover img")).toBeVisible();
  await expect.poll(async () => page.locator(".album-tracklist .album-track-link").count()).toBeGreaterThan(10);
  await expect
    .poll(async () => page.locator(".album-tracklist [data-track-status], .album-tracklist .track-status-badge").count())
    .toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test("photo detail page supports keyboard prev/next navigation", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("photo/photo-01.html", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".photo-detail-article, .photo-blue-article")).toBeVisible();
  await expect(page.locator(".photo-detail-pager")).toBeVisible();
  await expect(page.locator(".photo-detail-pager [data-photo-nav-label='next']")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/photo\/photo-02\.html$/);
  await expect(page.locator(".photo-detail-pager")).toBeVisible();

  expect(errors).toEqual([]);
});
