const { test, expect } = require('@playwright/test');

const player = page => page.locator('.selected-work .music-player-shell');

async function openPortfolio(page, suffix = '?lang=en') {
  await page.goto('selected-works.html' + suffix);
  await expect(player(page)).toHaveCount(3);
  await expect(page.locator('.floating-lang-btn[data-lang="ja"]')).toBeVisible();
}

test('portfolio localizes in place, exposes real metadata and preserves artist credits', async ({ page }) => {
  await openPortfolio(page, '?lang=ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('h1')).toHaveText('作品選集');
  await expect(page.locator('.floating-lang-btn[data-lang="ja"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.selected-work h2')).toHaveText(['Affizieren', 'Orchid', 'He and Me']);
  await expect(page.locator('#affizieren .selected-version')).toHaveText('HazezZ 歌唱版');
  await expect(page.locator('#orchid')).toContainText('Haze_zzZ feat. 初音ミク');
  await expect(page.locator('#orchid a[href="https://vocadb.net/Al/57003"]')).toBeVisible();
  await expect(page.locator('.selected-live')).toContainText('IMAGES © JUN');
  await expect.poll(() => page.locator('.selected-work audio').evaluateAll(nodes => nodes.every(a => a.duration > 180 && Number.isFinite(a.duration)))).toBe(true);
  const metadata = await page.locator('.selected-work audio').evaluateAll(nodes => nodes.map(a => ({src: a.getAttribute('src'), duration: a.duration, preload: a.preload, paused: a.paused, autoplay: a.autoplay})));
  console.log('Verified full-length audio metadata:', metadata);
  expect(metadata.every(a => a.paused && !a.autoplay && a.preload === 'metadata')).toBe(true);
  expect(metadata[0].src).toContain('d535eae92e52004a1b3bdb88eca4f651.mp3');
  for (const lang of ['zh', 'en', 'ja']) {
    await page.locator(`.floating-lang-btn[data-lang="${lang}"]`).click();
    await expect(page).toHaveURL(new RegExp(`lang=${lang}`));
    await expect(page.locator(`.floating-lang-btn[data-lang="${lang}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.selected-work-detail').first()).toHaveAttribute('href', new RegExp(`lang=${lang}`));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`lang=${lang}$`));
  }
  await expect(page.locator('link[hreflang="ja"]')).toHaveCount(1);
  expect(await page.locator('.selected-contact a[data-email-link]').getAttribute('href')).toMatch(/^mailto:/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('three full tracks share one player, support keyboard seeking and keep playing across language changes', async ({ page }) => {
  await openPortfolio(page);
  for (let i = 0; i < 3; i++) {
    await player(page).nth(i).locator('button').click();
    await expect.poll(() => page.evaluate(() => {
      const c = window.ChronohazeShared.persistentAudioController;
      return !!c.current && !c.audio.paused && c.audio.currentTime > .05;
    })).toBe(true);
    await expect.poll(() => page.locator('audio').evaluateAll(nodes => nodes.filter(a => !a.paused).length)).toBe(1);
    await expect(page.locator('.selected-work .is-playing')).toHaveCount(1);
    await expect(page.locator('.selected-player-status').nth(i)).toHaveText('Playing');
  }
  const duration = await page.evaluate(() => window.ChronohazeShared.persistentAudioController.audio.duration);
  await player(page).nth(2).locator('input[type=range]').press('Home');
  for (let i = 0; i < 10; i++) await player(page).nth(2).locator('input[type=range]').press('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.ChronohazeShared.persistentAudioController.audio.currentTime)).toBeGreaterThan(duration * .008);
  const before = await page.evaluate(() => window.ChronohazeShared.persistentAudioController.audio.currentTime);
  await page.locator('.floating-lang-btn[data-lang="ja"]').click();
  await expect(page.locator('.selected-player-status').nth(2)).toHaveText('再生中');
  expect(await page.evaluate(() => window.ChronohazeShared.persistentAudioController.audio.currentTime)).toBeGreaterThanOrEqual(before);
  await player(page).nth(2).locator('button').press('Space');
  await expect.poll(() => page.evaluate(() => window.ChronohazeShared.persistentAudioController.audio.paused)).toBe(true);
  await expect(page.locator('.selected-player-status').nth(2)).toHaveText('一時停止中');
  // Seeking another track before pressing play must not start audio automatically.
  await player(page).nth(0).locator('input[type=range]').press('End');
  expect(await page.evaluate(() => window.ChronohazeShared.persistentAudioController.audio.paused)).toBe(true);
});

test('no query uses saved site language, otherwise English, and page-swap entry loads page styles', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: 'zh-CN', ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await openPortfolio(page, '');
  await expect(page.locator('h1')).toHaveText('Selected Works');
  await page.locator('.floating-lang-btn[data-lang="ja"]').click();
  await page.goto('selected-works.html');
  await expect(page.locator('h1')).toHaveText('作品選集');
  await page.goto('music.html?lang=en');
  await expect(page.locator('.music-selected-works-link')).toBeVisible();
  await page.locator('.music-selected-works-link').click();
  await expect(player(page)).toHaveCount(3);
  await expect(page.locator('link[href*="selected-works.css"]')).toHaveCount(1);
  expect(await page.locator('.selected-work').first().evaluate(e => getComputedStyle(e).display)).toBe('grid');
  await context.close();
});
