const { test, expect } = require("@playwright/test");

const MOBILE_PROJECTS = new Set([
  "iphone13",
  "iphone16",
  "iphone16promax",
  "iphone16promax-landscape",
]);

function isMobileProject(testInfo) {
  return MOBILE_PROJECTS.has(testInfo.project.name);
}

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
  await page.goto("index.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.home-body")).toBeVisible();
  await expect(page.locator(".hero-portrait")).toBeVisible();
  await expect(page.locator("#playerShell")).toBeVisible();
  await expect(page.locator(".identity-panel-creative #playerShell")).toHaveCount(1);
  await expect(page.locator("#playerTime")).not.toHaveText(/^$/);
  await expect(page.locator("#selected-evidence")).toBeVisible();
  await expect(page.locator(".selected-evidence-card")).toHaveCount(3);
  await expect(
    page.locator(".selected-evidence-card > .selected-evidence-status + h3")
  ).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "当前工作" })).toBeVisible();
  await expect(page.locator(".selected-evidence-status")).toHaveText([
    "已发表 · AFP · 2026 · 独立作者",
    "已发表 · AFP · 2026 · 形式化开发 · WENDA LI 指导",
    "进行中 · 合作研究",
  ]);
  await expect(page.getByRole("heading", { name: "Isabelle/HOL 中的光滑凸优化一阶方法" })).toBeVisible();
  await expect(page.locator(".selected-evidence-card").nth(0)).toContainText("投影几何、投影梯度映射、收敛证书与线性收敛率");
  await expect(page.getByRole("heading", { name: "基数约束子模最大化的贪心算法" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "网络定位中的负曲率证书" })
  ).toBeVisible();
  await expect(page.locator(".selected-evidence-card").nth(2)).toContainText(
    "与 Prof. Shoham Sabach 合作研究图结构负曲率证书与局部逃逸方向。"
  );
  await expect(page.locator(".identity-panel-math")).toContainText("学术身份 · FEIER LYU");
  await expect(page.locator(".identity-panel-creative")).toContainText("创作身份 · HAZEZZ");
  await expect(page.locator("#now")).toContainText("演奏视频");
  await expect(page.locator("#now")).toContainText("音乐制作");
  await expect(page.locator("#now")).toContainText("StochasticGreedy 概率语义");
  await expect(page.locator("#selected-evidence")).not.toContainText("Current research");
  await expect(page.locator("#welcome")).not.toContainText("Music & Image");
  await expect(page.locator("#now")).not.toContainText("Performance videos");
  await expect(page.locator("#homeMathPreview")).toHaveCount(0);
  await expect(page.locator("#now")).not.toContainText("正式发表于 AFP");
  await expect(page.locator(".hero-authority-line")).toHaveText(
    "University of Edinburgh, BSc Mathematics · Cornell University Exchange · Expected Graduation 2027"
  );
  await expect(page.locator(".hero-research-signal")).toHaveText(
    "2 项 AFP 正式成果 · 独立完成优化形式化 · 与 Shoham Sabach 教授合作研究"
  );
  await expect(page.locator(".hero-academic-links .hero-academic-link")).toHaveText([
    "学术",
    "研究陈述",
    "精选工作",
    "个人档案",
    "GitHub",
  ]);
  const evidenceStatusFontSize = await page
    .locator(".selected-evidence-status")
    .first()
    .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
  expect(evidenceStatusFontSize).toBeGreaterThanOrEqual(10.5);
  await expect(page.locator(".home-footer [data-i18n='footerCopy']")).toContainText(
    "由 GitHub Pages 托管"
  );
  await expect(page.locator("main")).not.toContainText("2005 年出生");
  await expect(page.locator("#welcome")).toContainText("理性与浪漫在这里并置");
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute(
    "imagesrcset",
    /hero_portrait-600\.webp 600w.*hero_portrait-960\.webp 960w.*hero_portrait-1600\.webp 1600w/
  );
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute(
    "imagesizes",
    /max-width: 640px/
  );

  expect(errors).toEqual([]);
});

test("bare home URL defaults to English and releases the critical loader at DOM ready", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("index.html?lang=zh", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.setItem("siteLang", "zh");
    window.localStorage.setItem("chronohaze-lang", "zh");
  });

  await page.goto("index.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).not.toHaveClass(/chronohaze-critical-loading/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveClass(/active/);
  await expect(page.locator(".hero-kicker")).toHaveText("Origin / Chronohaze");
  await expect(page.locator(".selected-evidence-status")).toHaveText([
    "PUBLISHED · AFP · 2026 · SOLE AUTHOR",
    "PUBLISHED · AFP · 2026 · FORMALIZATION · SUPERVISED BY WENDA LI",
    "ONGOING · JOINT RESEARCH",
  ]);
  await expect(page.getByRole("heading", { name: "First-Order Methods for Smooth Convex Optimization in Isabelle/HOL" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Greedy Algorithms for Cardinality-Constrained Submodular Maximization" })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Negative-Curvature Certificates for Network Localization",
    })
  ).toBeVisible();
  await expect(page).toHaveURL(/[?&]lang=en(?:&|$)/);
  await expect(page).toHaveTitle(
    "Feier Lyu | Optimization & Formal Verification | AFP Author"
  );

  expect(errors).toEqual([]);
});

test("compact desktop home keeps portrait, identity, and actions in the first viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "exact desktop-fold geometry check");
  const errors = trackPageErrors(page);

  await page.setViewportSize({ width: 1363, height: 936 });
  await page.goto("index.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const geometry = await page.evaluate(() => {
    const box = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    return {
      left: box(".hero-left"),
      right: box(".hero-right"),
      heading: box(".hero-right h1"),
      links: box(".hero-academic-links"),
      contact: box(".contact-btn"),
      researchSignal: box(".hero-research-signal"),
    };
  });

  expect(geometry.left).not.toBeNull();
  expect(geometry.right.left).toBeGreaterThanOrEqual(geometry.left.right - 2);
  expect(geometry.right.top).toBeLessThan(geometry.left.bottom);
  expect(geometry.heading.top).toBeGreaterThanOrEqual(70);
  expect(geometry.heading.bottom).toBeLessThan(936);
  expect(geometry.links.bottom).toBeLessThan(936);
  expect(geometry.contact.bottom).toBeLessThan(936);
  expect(geometry.researchSignal.bottom).toBeLessThan(936);

  expect(errors).toEqual([]);
});

test("mobile home keeps the portrait clear and moves the decorative logo into the menu drawer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "deterministic mobile portrait check");
  const errors = trackPageErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("index.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".hero-mobile-evidence")).toHaveCount(0);
  await expect(page.locator(".hero-authority-line")).toBeHidden();
  await expect(page.locator('.hero-academic-link[href*="github.com"]')).toBeHidden();
  const floatingLogo = page.locator(".floating-site-logo");
  await expect(floatingLogo).toBeHidden();
  await expect(floatingLogo).toHaveAttribute("data-mobile-anchor", "menu");
  await expect(floatingLogo).toHaveAttribute("aria-hidden", "true");
  await expect(floatingLogo).not.toHaveAttribute("role", "button");
  await expect(page.locator(".site-share-shell")).toBeHidden();
  const drawerLogo = page.locator(".drawer-logo-decoration");
  await expect(drawerLogo).toBeHidden();

  const mobileGeometry = await page.evaluate(() => {
    const frame = document.querySelector(".hero-portrait-frame")?.getBoundingClientRect();
    const portrait = document.querySelector(".hero-portrait")?.getBoundingClientRect();
    const visibleQuickLinks = Array.from(document.querySelectorAll(".hero-academic-link")).filter(
      (link) => window.getComputedStyle(link).display !== "none"
    );
    return {
      frame,
      portrait,
      visibleQuickLinks: visibleQuickLinks.length,
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(mobileGeometry.portrait.top).toBeGreaterThanOrEqual(mobileGeometry.frame.top);
  expect(mobileGeometry.portrait.bottom).toBeLessThanOrEqual(mobileGeometry.frame.bottom + 10);
  expect(mobileGeometry.visibleQuickLinks).toBe(4);
  expect(mobileGeometry.scrollWidth).toBeLessThanOrEqual(mobileGeometry.viewport);

  await page.locator(".menu-open").click();
  await expect(drawerLogo).toBeVisible();
  await expect(drawerLogo.locator("img")).toBeVisible();
  expect(errors).toEqual([]);
});

test("home keeps core first-view content readable outside the reveal sequence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "first-view reveal contract check");
  const errors = trackPageErrors(page);

  await page.goto("index.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const revealContract = await page.evaluate(() => {
    const selectors = [
      ".home-brand",
      ".lang-pill",
      ".menu-open",
      ".hero-kicker",
      ".hero-right h1",
      ".hero-role-line",
      ".hero-authority-line",
      ".hero-research-signal",
      ".hero-academic-module",
      ".contact-btn",
    ];
    return {
      core: selectors.map((selector) => {
        const node = document.querySelector(selector);
        const style = node ? window.getComputedStyle(node) : null;
        return {
          selector,
          exists: Boolean(node),
          reveal: node ? node.hasAttribute("data-reveal") : null,
          opacity: style ? Number(style.opacity) : null,
          visibility: style ? style.visibility : null,
        };
      }),
      portraitReveal: document.querySelector(".hero-portrait")?.getAttribute("data-reveal"),
    };
  });

  revealContract.core.forEach((item) => {
    expect(item.exists, item.selector).toBe(true);
    expect(item.reveal, item.selector).toBe(false);
    expect(item.opacity, item.selector).toBe(1);
    expect(item.visibility, item.selector).toBe("visible");
  });
  expect(revealContract.portraitReveal).toBe("zoom");
  expect(errors).toEqual([]);
});

test("floating logo uses a genuinely dark mark over declared light surfaces", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop and responsive contrast regression check");

  const errors = trackPageErrors(page);
  await page.goto("index.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const logo = page.locator(".floating-site-logo");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveClass(/is-contrast-ready/);

  async function placeLogoOver(selector) {
    await page.evaluate((targetSelector) => {
      const target = document.querySelector(targetSelector);
      const logoNode = document.querySelector(".floating-site-logo");
      if (!target || !logoNode) return;
      const targetRect = target.getBoundingClientRect();
      const logoRect = logoNode.getBoundingClientRect();
      const targetY = Math.min(
        targetRect.bottom - Math.min(24, targetRect.height / 4),
        targetRect.top + targetRect.height / 2
      );
      const logoY = logoRect.top + logoRect.height / 2;
      window.scrollBy(0, targetY - logoY);
    }, selector);
  }

  await placeLogoOver(".hero-right");
  await expect.poll(async () => logo.evaluate((node) => node.classList.contains("is-contrast"))).toBe(true);
  await expect(logo.locator("img")).toHaveCSS("filter", /brightness\(0\)/);

  await placeLogoOver(".identity-panel-creative");
  await expect.poll(async () => logo.evaluate((node) => node.classList.contains("is-contrast"))).toBe(false);

  await page.evaluate(() => {
    const overlay = document.createElement("div");
    overlay.dataset.logoSamplingOverlay = "";
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:transparent";
    document.body.appendChild(overlay);
  });
  await placeLogoOver(".home-footer");
  await expect.poll(async () => logo.evaluate((node) => node.classList.contains("is-contrast"))).toBe(true);
  await page.evaluate(() => document.querySelector("[data-logo-sampling-overlay]")?.remove());

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(logo).toBeHidden();
  await expect(logo).toHaveAttribute("data-mobile-anchor", "menu");
  await expect(page.locator(".site-share-shell")).toBeHidden();
  await page.locator(".menu-open").click();
  await expect(page.locator(".drawer-logo-decoration img")).toBeVisible();

  expect(errors).toEqual([]);
});

test("floating logo samples CSS gradients on non-home pages without a white flash", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop gradient contrast regression check");
  const errors = trackPageErrors(page);

  await page.goto("music.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  const logo = page.locator(".floating-site-logo");

  const initialState = await logo.evaluate((node) => ({
    ready: node.classList.contains("is-contrast-ready"),
    opacity: Number(window.getComputedStyle(node).opacity),
  }));
  expect(initialState.ready || initialState.opacity === 0).toBe(true);

  await page.evaluate(() => {
    const gradient = document.createElement("div");
    gradient.id = "logo-gradient-test-surface";
    gradient.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:60",
      "background:linear-gradient(135deg,#ffffff 0%,#e4eaf2 100%)",
    ].join(";");
    document.body.appendChild(gradient);
    window.dispatchEvent(new Event("resize"));
  });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveClass(/is-contrast-ready/);
  await expect.poll(async () => logo.evaluate((node) => node.classList.contains("is-contrast"))).toBe(true);

  await page.evaluate(() => {
    const gradient = document.querySelector("#logo-gradient-test-surface");
    gradient.style.background = "radial-gradient(circle at 72% 78%,#27303d 0%,#0b0f16 100%)";
    window.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => logo.evaluate((node) => node.classList.contains("is-contrast"))).toBe(false);

  expect(errors).toEqual([]);
});

test("home drawer keeps state, focus, and Escape handling in sync", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("index.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const openButton = page.locator("#openMenu");
  const closeButton = page.locator("#closeMenu");
  const drawer = page.locator("#drawer");
  const backdrop = page.locator("#backdrop");

  await openButton.click();
  await expect(openButton).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toHaveClass(/(?:^|\s)open(?:\s|$)/);
  await expect(drawer).toHaveAttribute("aria-hidden", "false");
  await expect(backdrop).toBeVisible();
  await expect(closeButton).toBeFocused();
  await expect(drawer.locator(".drawer-nav > a")).toHaveText([
    "Home",
    "Academic",
    "Profile",
    "Search",
  ]);
  await expect(drawer.locator(".drawer-studio-label")).toHaveText("Studio");
  await expect(drawer.locator(".drawer-studio-links a")).toHaveText([
    "Music",
    "Photography",
  ]);

  await page.keyboard.press("Escape");
  await expect(openButton).toHaveAttribute("aria-expanded", "false");
  await expect(drawer).not.toHaveClass(/(?:^|\s)open(?:\s|$)/);
  await expect(drawer).toHaveAttribute("aria-hidden", "true");
  await expect(backdrop).toBeHidden();
  await expect(openButton).toBeFocused();
  expect(errors).toEqual([]);
});

test("home hero keeps localized Chinese and English copy", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("index.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".hero-kicker")).toHaveText("起点 / Chronohaze");
  await expect(page.locator(".hero-primary-name")).toHaveText("Feier Lyu");
  await expect(page.locator(".hero-secondary-name")).toHaveText("Fay");
  await expect(page.locator(".hero-role-line")).toHaveText(
    "OPTIMIZATION · FORMAL VERIFICATION · MACHINE-CHECKED MATHEMATICS"
  );
  await expect(page.locator(".hero-poetic-line")).toHaveText("在时间的薄雾里，为复杂性寻找结构。");
  await expect(page.locator(".hero-identity-line")).toHaveText(
    "证明关心什么可以被确信；音乐与影像关心什么值得被记住。"
  );
  await expect(page.locator(".hero-world-line")).toHaveText("这里收录两者之间仍在继续的工作。");
  await expect(page.locator(".hero-authority-line")).toHaveText(
    "University of Edinburgh, BSc Mathematics · Cornell University Exchange · Expected Graduation 2027"
  );
  await expect(page.locator(".hero-research-signal")).toHaveText(
    "2 项 AFP 正式成果 · 独立完成优化形式化 · 与 Shoham Sabach 教授合作研究"
  );
  await expect(page.locator('.hero-academic-link[href="research.html"]')).toHaveText("研究陈述");
  await expect(page.locator('.hero-academic-link[href="projects.html"]')).toHaveText("精选工作");
  await expect(page.locator('.hero-academic-link[href="cv.html"]')).toHaveText("个人档案");
  await expect(page.locator('[data-i18n="nowCard1Body"]')).toHaveText(
    "正在使用新购入的相机与镜头制作贝斯演奏视频。"
  );
  await expect(page.locator('[data-i18n="nowCard2Body"]')).toHaveText(
    "正在制作一首合作单曲，并为一个地下偶像团体创作原创曲目。"
  );
  await expect(page.locator('[data-i18n="nowCard3Body"]')).toHaveText(
    "近似保证与 oracle-cost 定理链现已完成形式化；当前工作聚焦于 StochasticGreedy 所需的概率语义抽象缺口。"
  );
  await expect(page.locator('[data-i18n="nowTitle"]')).toHaveText("近况 / 2026年8月");

  await page.goto("index.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".hero-kicker")).toHaveText("Origin / Chronohaze");
  await expect(page.locator(".hero-primary-name")).toHaveText("Feier Lyu");
  await expect(page.locator(".hero-secondary-name")).toHaveText("Fay");
  await expect(page.locator(".hero-role-line")).toHaveText(
    "OPTIMIZATION · FORMAL VERIFICATION · MACHINE-CHECKED MATHEMATICS"
  );
  await expect(page.locator(".hero-poetic-line")).toHaveText(
    "In the haze of time, I look for structure in complexity."
  );
  await expect(page.locator(".hero-identity-line")).toHaveText(
    "Proof asks what can be trusted; music and image ask what deserves to be remembered."
  );
  await expect(page.locator(".hero-world-line")).toHaveText(
    "This site gathers the work that continues between them."
  );
  await expect(page.locator('[data-i18n="nowTitle"]')).toHaveText("Now / August 2026");
  await expect(page.locator('[data-i18n="nowCard1Body"]')).toHaveText(
    "Producing a new series of bass-performance videos with an upgraded camera setup."
  );
  await expect(page.locator('[data-i18n="nowCard2Body"]')).toHaveText(
    "Producing a collaborative single and composing an original track commissioned by an underground idol group."
  );
  await expect(page.locator('[data-i18n="nowCard3Body"]')).toHaveText(
    "The approximation and oracle-cost theorem line is now formalized; current work focuses on the probabilistic-semantics abstraction gap needed for StochasticGreedy."
  );
  await expect(page.locator(".hero-authority-line")).toHaveText(
    "University of Edinburgh, BSc Mathematics · Cornell University Exchange · Expected Graduation 2027"
  );
  await expect(page.locator(".hero-research-signal")).toHaveText(
    "2 AFP publications · Sole-authored optimization formalization · Research with Prof. Shoham Sabach"
  );
  await expect(page.locator("main")).not.toContainText("Born in 2005");
  await expect(page.getByRole("heading", { name: "Research Snapshot" })).toBeVisible();
  await expect(page.locator(".selected-evidence-card").nth(2)).toContainText(
    "Graph-structured negative-curvature certificates and local escape directions, with Prof. Shoham Sabach."
  );
  await expect(page.locator(".hero-portrait")).toHaveAttribute("alt", "Portrait of Feier Lyu (HazezZ)");
  await expect(page.locator(".now-grid")).toHaveAttribute(
    "aria-label",
    "Current research and studio work in August 2026"
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Mathematics BSc student at the University of Edinburgh/
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Feier Lyu | Optimization & Formal Verification | AFP Author"
  );
  await expect(page).toHaveURL(/[?&]lang=en(?:&|$)/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /[?&]lang=en$/);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /[?&]lang=en$/);
  await expect(page.locator('.home-footer-policy a[href="accessibility.html"]')).toHaveText(
    "Accessibility"
  );

  await page.locator('.lang-btn[data-lang="zh"]').click();
  await expect(page).toHaveURL(/[?&]lang=zh(?:&|$)/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /[?&]lang=zh$/);

  expect(errors).toEqual([]);
});

test("English page transitions keep the loading feedback in English", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("index.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const loaderCopy = await page.evaluate(() => {
    const target = new URL("policy.html?lang=en", window.location.href).href;
    window.ChronohazeShared.navigateWithPageSwap(target);
    const loader = document.querySelector(".chronohaze-loader");
    return {
      lang: loader && loader.getAttribute("lang"),
      status: loader && loader.querySelector(".chronohaze-loader__status")?.textContent,
      title: loader && loader.querySelector(".chronohaze-loader__title")?.textContent,
      meta: loader && loader.querySelector(".chronohaze-loader__meta")?.textContent,
    };
  });

  expect(loaderCopy).toEqual({
    lang: "en",
    status: "Opening",
    title: "Opening the next page",
    meta: "Please wait while the next page comes into focus.",
  });
  await expect(page).toHaveURL(/policy\.html\?lang=en/);
  expect(errors).toEqual([]);
});

test("page swaps preserve destination stylesheet order", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await page.locator(".music-performance-full-link").click();
  await expect(page).toHaveURL(/music\/live-003-chongqing-fuli\.html\?lang=en/);
  await expect(page.locator("body.music-live-archive-page")).toBeVisible();

  const swappedStyles = await page.locator('link[rel="stylesheet"][href]').evaluateAll((links) =>
    links.map((link) => new URL(link.getAttribute("href"), document.baseURI).pathname)
  );
  expect(swappedStyles.findIndex((href) => href.endsWith("/styles.min.css"))).toBeLessThan(
    swappedStyles.findIndex((href) => href.endsWith("/assets/css/performance-archive.min.css"))
  );
  await expect(page.locator(".performance-set-grid .performance-set-thumb")).toHaveCount(49);
  expect(errors).toEqual([]);
});

test("PGD note leads with its mathematical value", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("post/projected-gradient-descent-isabelle-hol.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);

  const article = page.locator('[data-lang-block="en"]');
  await expect(article.locator(".article-meta").first()).toContainText("Originally posted 2026-05-22");
  const publicationUpdate = article.locator(".math-post-update").first();
  const chronology = article.locator(".math-post-update").nth(1);
  await expect(chronology).toContainText("predates the submodular-greedy entry's AFP publication on May 26");
  await expect(publicationUpdate).toContainText("Publication update — August 2026");
  await expect(publicationUpdate).toContainText("accepted and published in the Archive of Formal Proofs");
  await expect(chronology).toContainText("Submitted: July 2, 2026 · Published in AFP: July 2, 2026");
  await expect(article).toContainText(
    "Projected gradient descent is one of the basic algorithmic templates for constrained smooth optimization."
  );
  await expect(article).toContainText("projection inequality");
  await expect(article).toContainText("projected-gradient mapping");
  await expect(article).toContainText("linear convergence under strong convexity");
  await expect(article).not.toContainText("strange open interval after exams");
  await expect(article).not.toContainText("temporarily blocked by a technical issue");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /A publication retrospective on the sole-authored AFP entry/
  );

  expect(errors).toEqual([]);
});

test("network-localization research record is bilingual and contains no public PDF shell", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("notes/network_localization_structural_certificates.html?lang=en", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", {
    name: "One Negative Residual Is Not Enough",
    exact: true,
  })).toBeVisible();
  const englishRecord = page.locator('[data-lang-block="en"]');
  await expect(englishRecord).toContainText("From Projected Budgets to Negative Curvature");
  await expect(englishRecord).toContainText("exactly one edge has negative residual");
  await expect(englishRecord).toContainText("Current draft · Not yet promoted to a theorem");
  await expect(englishRecord).toContainText("Three questions in the current draft");
  await expect(englishRecord).toContainText("The rank-one update criterion says");
  await expect(englishRecord).toContainText("βReff(e)=1");
  await expect(englishRecord).toContainText("positive-semidefinite boundary");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://lyuf09.github.io/chronohaze/assets/og/math/network-localization.png"
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    "https://lyuf09.github.io/chronohaze/assets/og/math/network-localization.png"
  );

  await page.goto("notes/network_localization_structural_certificates.html?lang=zh", {
    waitUntil: "domcontentloaded",
  });
  const chineseRecord = page.locator('[data-lang-block="zh"]');
  await expect(chineseRecord.getByRole("heading", {
    name: "一条负残差并不够",
    exact: true,
  })).toBeVisible();
  await expect(chineseRecord).toContainText("从投影预算到负曲率");
  await expect(chineseRecord).toContainText("当前工作稿 · 尚未升级为定理");
  await expect(page.locator('[data-lang-block="en"]')).toBeHidden();
  await expect(chineseRecord).toContainText("rank-one update 判据");
  await expect(chineseRecord).toContainText("βReff(e)=1");
  await expect(page.locator(".academic-local-nav a").first()).toHaveAttribute(
    "href",
    /projects\.html\?lang=zh/
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileRecordLayout = await page.evaluate(() => {
    const visibleRecord = document.querySelector('[data-lang-block="zh"]:not([hidden])');
    const recordRect = visibleRecord.getBoundingClientRect();
    const paragraphFonts = Array.from(visibleRecord.querySelectorAll("p")).map(
      (node) => window.getComputedStyle(node).fontFamily
    );
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      recordLeft: recordRect.left,
      recordRight: recordRect.right,
      paragraphFonts,
    };
  });
  expect(mobileRecordLayout.documentWidth).toBeLessThanOrEqual(mobileRecordLayout.viewportWidth);
  expect(mobileRecordLayout.recordLeft).toBeGreaterThanOrEqual(0);
  expect(mobileRecordLayout.recordRight).toBeLessThanOrEqual(mobileRecordLayout.viewportWidth);
  expect(mobileRecordLayout.paragraphFonts.every((font) => !/Cormorant/i.test(font))).toBe(true);

  const nextNote = page.getByRole("link", {
    name: "下一篇 · 子模贪心算法形式化正式进入 AFP",
    exact: true,
  });
  await expect(nextNote).toHaveAttribute(
    "href",
    /post\/submodular-greedy-formalization-enters-afp\.html\?lang=zh$/
  );
  await nextNote.click();
  await expect(page).toHaveURL(
    /post\/submodular-greedy-formalization-enters-afp\.html\?lang=zh$/
  );

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
  await expect(page.locator(".music-room-track-card").first().locator(".music-room-track-role")).toHaveCount(8);
  await expect(page.locator(".music-room-track-card").first().locator(".music-room-track-roles")).toContainText("贝斯");
  await expect(page.locator(".music-room-track-card").first().locator(".music-room-track-roles")).toContainText("编程");
  await expect(page.locator(".music-room-track-card").first().locator(".music-room-track-roles")).toContainText("混音");
  await expect(page.locator(".music-room-track-card").nth(2).locator(".music-room-track-role")).toHaveCount(3);
  await expect.poll(async () => page.locator(".music-room-album").count()).toBeGreaterThan(1);
  await expect(page.locator(".music-room-album-credit")).toHaveText(
    "除特别说明外，作品的写作、编曲、演奏、录制与制作均由 HazezZ 完成。"
  );
  await expect(page.locator(".music-hero-copy h1")).toHaveText("HAZEZZ");
  await expect(page.locator(".music-hero-kicker")).toHaveText("音乐 / 聆听室");
  await expect(page.locator(".music-hero-roles")).toHaveText("作曲 · 编曲 · 贝斯 · 吉他 · 制作");
  await expect(page.locator(".music-hero-statement")).toHaveText(
    "前卫金属核、日系摇滚，以及叙事型器乐创作。"
  );
  await expect(page.locator(".music-room-selected .music-room-section-kicker")).toHaveText("聆听室");
  await expect(page.locator(".music-room-selected .music-room-section-title")).toHaveText("精选作品");
  await expect(page.locator(".music-room-featured .music-room-section-title")).toHaveText(
    "专辑 / 概念项目"
  );
  const heroLayout = await page.evaluate(() => {
    const image = document.querySelector(".music-hero img");
    const copy = document.querySelector(".music-hero-copy");
    const imageRect = image ? image.getBoundingClientRect() : null;
    const copyRect = copy ? copy.getBoundingClientRect() : null;
    return {
      imageRatio: imageRect && imageRect.height ? imageRect.width / imageRect.height : 0,
      imageBottom: imageRect ? imageRect.bottom : 0,
      copyTop: copyRect ? copyRect.top : 0,
    };
  });
  expect(heroLayout.imageRatio).toBeGreaterThan(3.4);
  expect(heroLayout.copyTop).toBeGreaterThanOrEqual(heroLayout.imageBottom - 1);
  await expect(page.locator(".music-practice-copy")).toContainText("钢琴和小提琴");
  await expect(page.locator(".music-practice-path")).toHaveText(
    /钢琴\s*→\s*小提琴\s*→\s*作曲\s*→\s*贝斯 \/ 吉他\s*→\s*制作/
  );
  await expect(page.locator(".music-background-title").last()).toHaveText("演出档案");
  await expect(page.locator(".music-intro-figure img")).toHaveAttribute(
    "src",
    "assets/template/music-intro-img6370.jpg"
  );
  await expect(page.locator('a[href="music/live-002-xian.html"]')).toHaveCount(1);
  await expect(page.locator('a[href="music/early-performance-records.html"]')).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText("屏幕、时差");
  await expect(page.locator(".music-room-archive-section")).toBeVisible();
  await expect(page.locator(".music-room-archive .music-room-section-title")).toHaveText("作品档案");
  await expect(page.locator(".music-room-archive-group-title").first()).toHaveText("专辑与合集");
  await expect.poll(async () => page.locator(".music-room-archive-group").count()).toBeGreaterThan(2);
  await expect(page.locator('[data-archive-year="2025"] [data-date="2025-03-22"]')).toHaveCount(1);
  await expect(page.locator('[data-archive-year="2024"] [data-date="2024-02-14"]')).toHaveCount(1);
  await expect(page.locator('[data-archive-year="2024"]')).not.toHaveAttribute("open", "");
  await expect(page.locator("body.music-index-page")).toHaveAttribute(
    "data-music-listening-room-state",
    "ready"
  );
  await expect(page.locator('.music-room-archive [data-href="music/track-10.html"]')).toHaveCount(0);
  await expect(page.locator('.music-room-archive [data-href="music/track-felix.html"]')).toHaveCount(0);
  await expect(page.locator(".music-room-archive")).not.toContainText(/音频待上传|audio pending upload/i);

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
    "Lyrics"
  );
  await expect(page.locator(".music-hero-kicker")).toHaveText("MUSIC / LISTENING ROOM");
  await expect(page.locator(".music-hero-roles")).toHaveText(
    "Composer · Arranger · Bassist · Guitarist · Producer"
  );
  await expect(page.locator(".music-room-selected .music-room-section-title")).toHaveText(
    "Listening Room / Selected Works"
  );
  await expect(page.locator(".music-room-track-card").first().locator(".music-room-track-role")).toHaveCount(8);
  await expect(page.locator(".music-room-track-play").first()).toHaveText("Play");
  await expect(page.locator(".music-room-track-open").first()).toHaveText("Open Track");
  const workControlTypography = await page.evaluate(() => {
    const play = document.querySelector(".music-room-track-play");
    const open = document.querySelector(".music-room-track-open");
    const read = (node) => {
      if (!node) return null;
      const style = window.getComputedStyle(node);
      return {
        fontFamily: style.fontFamily,
        height: node.getBoundingClientRect().height,
      };
    };
    return { play: read(play), open: read(open) };
  });
  expect(workControlTypography.play.fontFamily).toContain("Chronohaze Sans SC");
  expect(workControlTypography.open.fontFamily).toContain("Chronohaze Sans SC");
  expect(workControlTypography.play.height).toBeGreaterThanOrEqual(40);
  expect(workControlTypography.open.height).toBeGreaterThanOrEqual(40);
  await expect(page.locator(".music-room-album-credit")).toHaveText(
    "Written, arranged, performed and produced by HazezZ, unless otherwise noted."
  );
  await expect(page.locator(".music-practice-copy")).toContainText(
    "My current practice treats songwriting, low-end design"
  );
  await expect(page.locator("main")).not.toContainText("across screens");
  await expect(page.locator(".music-hero")).toHaveAttribute(
    "aria-label",
    "HazezZ music portfolio"
  );
  await expect(page.locator(".music-hero img")).toHaveAttribute("alt", "HazezZ");
  await expect(page.locator(".music-intro img")).toHaveAttribute(
    "alt",
    "HazezZ playing bass beside a microphone under blue stage light"
  );
  await expect(page.locator(".music-bottom")).toHaveAttribute(
    "aria-label",
    "Performance archive"
  );
  await expect(page.locator(".music-performance-hero")).toHaveCount(1);
  await expect(page.locator(".music-editorial-gallery picture")).toHaveCount(6);
  await expect(page.locator(".music-performance-card-shell")).toHaveCount(3);
  await expect(page.locator(".music-performance-archive img[alt='']")).toHaveCount(0);
  await expect(page.locator(".music-performance-full-link")).toContainText("49 frames");
  const intrinsicImageSizes = await page
    .locator(".music-hero img, .music-intro img, .music-performance-archive img")
    .evaluateAll((images) =>
      images.map((image) => ({
        src: image.getAttribute("src"),
        width: Number(image.getAttribute("width") || 0),
        height: Number(image.getAttribute("height") || 0),
      }))
    );
  expect(intrinsicImageSizes.length).toBeGreaterThanOrEqual(10);
  expect(intrinsicImageSizes.filter((image) => image.width <= 0 || image.height <= 0)).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  const artworkSlots = page.locator(".music-room-album-cover, .music-room-track-cover");
  await expect
    .poll(async () =>
      artworkSlots.evaluateAll(
        (covers) =>
          covers.filter((cover) => {
            const style = window.getComputedStyle(cover);
            return style.aspectRatio === "auto" || cover.getBoundingClientRect().height <= 0;
          }).length
      )
    )
    .toBe(0);
  const reservedArtworkSlots = await artworkSlots.evaluateAll((covers) =>
    covers.map((cover) => ({
      aspectRatio: window.getComputedStyle(cover).aspectRatio,
      height: cover.getBoundingClientRect().height,
    }))
  );
  expect(reservedArtworkSlots.length).toBeGreaterThan(5);
  expect(
    reservedArtworkSlots.filter((slot) => slot.aspectRatio === "auto" || slot.height <= 0)
  ).toEqual([]);

  expect(errors).toEqual([]);
});

test("Xi'an performance archive exposes all frames and lightbox navigation", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music/live-002-xian.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.music-live-archive-page")).toBeVisible();
  await expect(page.locator(".performance-set-header")).toContainText("27 FRAMES");
  await expect(page.locator(".performance-set-thumb")).toHaveCount(27);
  await expect(page.locator(".performance-set-grid img[alt='']")).toHaveCount(0);

  await page.locator(".performance-set-thumb").nth(26).click();
  await expect(page.locator(".performance-lightbox")).toBeVisible();
  await expect(page.locator(".performance-lightbox figcaption")).toHaveText("27 / 27");
  await expect(page.locator(".performance-lightbox figure img")).toHaveAttribute(
    "src",
    /live-002-xian-img3391-1600\.webp$/
  );
  await page.locator(".performance-lightbox-prev").click();
  await expect(page.locator(".performance-lightbox figcaption")).toHaveText("26 / 27");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".performance-lightbox figcaption")).toHaveText("27 / 27");
  await page.locator(".performance-lightbox-close").click();
  await expect(page.locator(".performance-lightbox")).toBeHidden();
  expect(errors).toEqual([]);
});

test("Ice Lake is a standalone guitar portrait series", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music/guitar-portrait-ice-lake.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".performance-set-header")).toContainText("19 FRAMES");
  await expect(page.locator(".performance-set-header time")).toHaveAttribute("datetime", "2025-12");
  await expect(page.locator(".performance-set-header time")).toHaveText("DECEMBER 2025");
  await expect(page.locator(".portrait-tone-group")).toHaveCount(2);
  await expect(page.locator(".portrait-tone-group--warm .performance-set-thumb")).toHaveCount(8);
  await expect(page.locator(".portrait-tone-group--cool .performance-set-thumb")).toHaveCount(11);
  await expect(page.locator(".performance-set-thumb")).toHaveCount(19);
  await expect(page.locator(".performance-set-grid img[alt='']")).toHaveCount(0);
  await expect(page.locator('img[src*="IMG_6845"]')).toHaveCount(0);

  await expect(page.locator(".performance-set-thumb").first()).toHaveAttribute(
    "data-full",
    /ice-lake-10-1600\.webp$/
  );
  await expect(page.locator(".portrait-tone-group--cool .performance-set-thumb").first()).toHaveAttribute(
    "data-full",
    /ice-lake-19-1600\.webp$/
  );

  await page.locator(".performance-set-thumb").nth(18).click();
  await expect(page.locator(".performance-lightbox figcaption")).toHaveText("19 / 19");
  await expect(page.locator(".performance-lightbox figure img")).toHaveAttribute(
    "src",
    /ice-lake-12-1600\.webp$/
  );

  await page.goto("music/early-performance-records.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".performance-set-header")).toContainText("04 FRAMES");
  await expect(page.locator(".performance-set-thumb")).toHaveCount(4);
  await expect(page.locator('img[alt*="frozen lake"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("music index completes its layout before DOM ready settles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "deterministic desktop layout stability check");
  const errors = trackPageErrors(page);
  await page.setViewportSize({ width: 1363, height: 936 });
  await page.goto("music.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.music-index-page")).toHaveAttribute(
    "data-music-listening-room-state",
    "ready"
  );
  const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.waitForTimeout(1200);
  const settledHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(Math.abs(settledHeight - initialHeight)).toBeLessThanOrEqual(80);
  expect(errors).toEqual([]);
});

test("search page loads grouped results and query state works", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("search.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.search-index-page")).toBeVisible();
  await expect(page.locator("#site-search-input")).toBeVisible();
  await expect(page.locator(".search-status")).toHaveText(
    "Enter a keyword, or choose a scope / tag to start searching."
  );
  await expect(page.locator(".search-result-link")).toHaveCount(0);
  await expect(page.locator(".search-empty")).toBeHidden();
  await expect(page.locator(".search-no-results-panel")).toBeHidden();
  await expect(page.locator(".search-share-tools")).toBeHidden();
  await expect(page.locator(".search-submit")).toHaveCSS("color", "rgba(244, 248, 255, 0.96)");
  await expect(page.locator(".search-shortcuts")).toHaveText("/ or Ctrl/Cmd+K to focus search");
  await expect(page.locator("header .nav")).toHaveAttribute("aria-label", "Main navigation");
  await expect(page.locator("header .nav > a")).toHaveText([
    "Home",
    "Academic",
    "Profile",
    "Search",
  ]);
  await expect(page.locator("header .nav .nav-studio-trigger")).toHaveText("Studio");
  await expect(page.locator("header .nav .nav-studio-panel a")).toHaveText([
    "Music",
    "Photography",
  ]);
  await expect(page.locator("#site-search-scope option")).toHaveText([
    "All",
    "Technical Notes",
    "Photography",
    "Music",
    "Academic Profile",
  ]);
  await expect(page.locator(".site-share-fab")).toHaveAttribute(
    "aria-label",
    "Share this page"
  );
  await expect(page.locator(".search-form")).toHaveAttribute("aria-label", "Site search form");
  await expect(page.locator('.floating-lang-btn[data-lang="en"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.floating-lang-btn[data-lang="zh"]')).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Search Chronohaze across Technical Notes, photography, music, research, and Academic Profile content."
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /search\.html\?lang=en$/);
  await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]')).toHaveAttribute(
    "href",
    /search\.html\?lang=zh$/
  );
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    "href",
    /search\.html\?lang=en$/
  );
  const visibleTagLabels = await page.locator("#site-search-tag option").allTextContents();
  expect(visibleTagLabels).not.toEqual(expect.arrayContaining(["home", "work", "cv", "调香"]));

  await page.fill("#site-search-input", "Affizieren");
  await page.click(".search-submit");

  await expect.poll(async () => page.locator(".search-result-link").count()).toBeGreaterThan(0);
  await expect.poll(async () => page.locator(".search-result-group").count()).toBeGreaterThan(0);
  await expect(page.locator(".search-shortcuts")).toContainText("select");
  await expect(page).toHaveURL(/[\?&]q=Affizieren/);
  await expect(page).toHaveURL(/[\?&]lang=en/);

  await page.fill("#site-search-input", "projected gradient");
  await page.click(".search-submit");
  await expect(page.locator(".search-result-title").first()).toContainText(
    "Projected Gradient Descent"
  );
  await expect(page.locator(".search-result-excerpt").first()).toContainText("Isabelle/HOL");

  await page.fill("#site-search-input", "TTGDA");
  await page.click(".search-submit");
  const englishExcerpt = await page.locator(".search-result-excerpt").first().innerText();
  expect(englishExcerpt).not.toMatch(/[\u3400-\u9fff]/);

  await page.fill("#site-search-input", "AFP");
  await page.click(".search-submit");
  const homeResult = page.locator('.search-result-link[href="index.html"]');
  await expect(homeResult).toContainText(
    "Chronohaze brings together Feier Lyu’s current work in optimization"
  );
  await expect(homeResult).not.toContainText("AFFIZIEREN");
  await expect(homeResult).not.toContainText("00:00 / 00:00");
  await expect(page.locator(".search-results")).not.toContainText(
    "Chronohaze page for Academic"
  );

  await page.fill("#site-search-input", "__chronohaze_no_match__");
  await page.click(".search-submit");
  await expect(page.locator(".search-status")).toHaveText("0 results");
  await expect(page.locator(".search-empty")).toHaveText("No matching results.");
  await expect(page.locator(".search-no-results-lead")).toHaveText(
    "No matching results yet. Try these nearby tags or entry points:"
  );
  await expect(page.locator(".search-shortcuts")).toHaveText("/ or Ctrl/Cmd+K to focus search");

  expect(errors).toEqual([]);
});

test("English utility and music-detail pages expose English metadata", async ({ page }) => {
  const errors = trackPageErrors(page);
  const cases = [
    ["policy.html?lang=en", "Privacy, data handling, copyright, and content usage information"],
    ["accessibility.html?lang=en", "Accessibility support, current practices, known limitations"],
    ["music/track-04.html?lang=en", "Music work page for"],
  ];

  for (const [url, expectedDescription] of cases) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await waitForCriticalLoaderRelease(page);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toContain(expectedDescription);
    expect(description).not.toMatch(/[\u3400-\u9fff]/);
  }

  expect(errors).toEqual([]);
});

test("Affizieren shows metadata duration and progressive technical disclosure before playback", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music/track-04.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const metas = page.locator(".music-detail-meta");
  await expect(metas.nth(0)).toHaveText("Creation period · Sep–Dec 2024");
  await expect(metas.nth(1)).toContainText("Echoes of Two Years");
  await expect(metas.nth(1)).toContainText(
    "Lyrics · Composition · Arrangement · Guitar · Bass · Programming · Mixing · Production — HazezZ"
  );
  await expect(page.locator(".music-detail-article h2").first()).toHaveText("About the work");
  await expect(page.locator(".music-detail-article h2").first().locator("xpath=following-sibling::p[1]")).toContainText(
    "began in the autumn of my nineteenth year"
  );
  await expect(page.locator(".music-detail-article h2").first().locator("xpath=following-sibling::p[1]")).toContainText(
    "The line “vision shattered by rain” returns to the summer when I was seventeen"
  );
  await expect(page.locator(".affizieren-note-summary-card")).toHaveCount(4);
  await expect(page.locator(".affizieren-note-summary-grid")).toContainText("A♯–E–A–D–G–B–E");
  await expect(page.locator(".affizieren-note-details")).not.toHaveAttribute("open", "");
  await expect(page.locator(".affizieren-note-details > summary")).toHaveText(
    "Full production and arrangement notes"
  );
  await page.locator(".affizieren-note-details > summary").click();
  await expect(page.locator(".affizieren-note-full-copy")).toContainText(
    "The non-repeating guitar line makes this section deliberately difficult to reproduce live."
  );
  await expect(page.locator(".affizieren-note-full-copy")).toContainText(
    "the piano sound from Guitar Pro"
  );
  await expect(page.locator(".affizieren-note-full-copy")).not.toContainText(
    "isn’t a section I can perform perfectly live"
  );
  await expect(page.locator(".affizieren-note-full-copy")).not.toContainText("-bar");
  await expect
    .poll(async () => page.locator(".music-player-time").first().innerText())
    .not.toBe("00:00 / 00:00");

  await page.goto("music/track-20.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  const supernovaMetas = page.locator(".music-detail-meta");
  await expect(supernovaMetas.nth(0)).toHaveText("Creation period · Mar–May 2022");
  await expect(supernovaMetas.nth(1)).toContainText(
    "Lyrics · Composition · Arrangement — HazezZ"
  );
  await expect(supernovaMetas.nth(1)).toContainText("Guitar — Franklimn Zhang");
  await expect(supernovaMetas.nth(1)).toContainText("Mixing — Rinya");
  await expect(page.locator(".music-detail-article")).toContainText("mixed time signatures");
  await expect(page.locator(".music-detail-article")).not.toContainText(
    "The lyrics point to no specific person, instead"
  );

  await page.goto("music/track-18.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".music-detail-article")).toContainText(
    "I wrote that on an afternoon after the rain."
  );
  await expect(page.locator(".music-detail-article")).not.toContainText("thaton");

  await page.goto("music/album-teenage-best.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".album-intro")).toContainText("2022–2024");
  await expect(page.locator(".album-intro")).toContainText("HazezZ composed every track");
  await expect(page.locator(".album-intro")).toContainText(
    "leaving the older songs scattered"
  );

  expect(errors).toEqual([]);
});

test("mobile home hides sharing while secondary-page sharing manages focus", async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo), "mobile-only share interaction check");

  const errors = trackPageErrors(page);
  await page.goto("index.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const homeLogo = page.locator(".floating-site-logo");
  await expect(homeLogo).toBeHidden();
  await expect(homeLogo).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".site-share-shell")).toBeHidden();

  const drawer = page.locator("#drawer");
  const drawerLogo = drawer.locator(".drawer-logo-decoration");
  await expect(drawerLogo).toBeHidden();
  await page.locator("#openMenu").click();
  await expect(drawer).toHaveClass(/open/);
  await expect(drawerLogo).toBeVisible();
  await expect(drawerLogo.locator("img")).toHaveAttribute("src", "assets/logo-float.png");
  await page.locator("#closeMenu").click();
  await expect(drawerLogo).toBeHidden();

  const compactTargets = await page
    .locator(
      ".home-brand, .lang-btn, .menu-open, .hero-academic-link, .selected-evidence-link, " +
        ".home-footer-brand, .home-footer-email, .home-footer .obf-email-copy, .home-footer-policy a"
    )
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => window.getComputedStyle(node).display !== "none")
        .map((node) => ({
          target: `${node.tagName.toLowerCase()}.${node.className || ""}`,
          text: (node.textContent || "").trim(),
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        }))
    );
  expect(compactTargets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);
  await expect(page.locator(".hero-authority-line")).toBeHidden();

  await page.goto("music.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const logo = page.locator(".floating-site-logo.is-share-trigger");
  const panel = page.locator(".site-share-panel");
  const closeButton = panel.locator('[data-share-action="close"]');

  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("data-mobile-anchor", "header-language");
  await expect(logo).toHaveAttribute("aria-label", "Share this page");
  const logoBox = await logo.boundingBox();
  const headerBox = await page.locator(".site-header").boundingBox();
  const languageBox = await page.locator(".site-header .floating-lang-switch").boundingBox();
  expect(logoBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect(languageBox).not.toBeNull();
  expect(logoBox.width).toBeLessThanOrEqual(50);
  expect(logoBox.height).toBeLessThanOrEqual(50);
  expect(logoBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height + 8);
  expect(Math.abs(
    logoBox.x + logoBox.width - (languageBox.x + languageBox.width)
  )).toBeLessThanOrEqual(2);

  await logo.click({ force: true });
  await expect(panel).toBeVisible();
  await expect(closeButton).toBeFocused();

  await closeButton.click();
  await expect(panel).toBeHidden();
  await expect(logo).toBeFocused();
  expect(errors).toEqual([]);
});

test("share launcher rebinds when the viewport crosses the mobile breakpoint", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "desktop-to-mobile resize regression check");

  const errors = trackPageErrors(page);
  await page.goto("music.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const shell = page.locator(".site-share-shell");
  const launcher = page.locator(".site-share-fab");
  const logo = page.locator(".floating-site-logo");

  await expect(shell).not.toHaveAttribute("data-mobile-share-via-logo", "1");
  await expect(logo).not.toHaveClass(/is-share-trigger/);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(shell).toHaveAttribute("data-mobile-share-via-logo", "1");
  await expect(launcher).toBeHidden();
  await expect(logo).toHaveClass(/is-share-trigger/);
  await expect(logo).toHaveAttribute("role", "button");

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(shell).not.toHaveAttribute("data-mobile-share-via-logo", "1");
  await expect(launcher).toBeVisible();
  await expect(logo).not.toHaveClass(/is-share-trigger/);
  expect(errors).toEqual([]);
});

test("olfactory notes page keeps Chinese and English content separated", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("olfactory.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator("body.olfactory-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Olfactory Notes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected Scents" })).toHaveCount(0);
  await expect(page.locator(".scent-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Scent as Structure" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scent Archive" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/[\u3400-\u9fff]/);

  await page.goto("olfactory.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.getByRole("heading", { name: "调香手记" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "气味作为结构" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "气味档案" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("cv and research pages render key faculty-entry nodes", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("cv.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  const cvEnglish = page.locator('[data-lang-block="en"]');
  await expect(page.locator('main [data-lang-block="zh"]')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-rendered-lang', 'en');
  await expect(page.locator(".cv-utility-bar")).toBeVisible();
  await expect(page.locator("a.cv-research-link")).toBeVisible();
  await expect(page.locator(".page-last-updated-label")).toHaveText("Last updated:");
  await expect(page.locator(".page-last-updated-time")).toHaveText("August 2026");
  await expect(cvEnglish.locator("#cv-en-highlights")).toContainText("Expected graduation: 2027");
  await expect(cvEnglish.getByRole("heading", { name: "Academic Profile" })).toBeVisible();
  await expect(cvEnglish.locator("#cv-en-projects")).toContainText("Archive of Formal Proofs · July 2026 · Sole author");
  await expect(cvEnglish.locator("#cv-en-projects > .cv-project-list").first().locator("li")).toHaveCount(2);
  await expect(cvEnglish.getByRole("heading", { name: "Selected Evidence" })).toHaveCount(0);
  await expect(cvEnglish.getByRole("link", { name: "AFP entry" }).first()).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Projected_Gradient_Descent.html"
  );
  await expect(cvEnglish.getByRole("link", { name: "AFP entry" }).nth(1)).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(cvEnglish.getByRole("link", { name: "Proof document" }).nth(1)).toHaveAttribute(
    "href",
    "https://isa-afp.org/browser_info/current/AFP/Submodular_Greedy/document.pdf"
  );
  await expect(cvEnglish.locator("#cv-en-highlights")).toContainText("BSc Mathematics, University of Edinburgh");
  await expect(cvEnglish.locator("#cv-en-highlights")).toContainText("Exchange student at Cornell University, 2025–2026");
  await expect(page.locator("main")).toContainText("Feier Lyu (Fay Lyu)");
  await expect(page.locator("main")).not.toContainText("currently between");
  const collaboration = cvEnglish.locator(".cv-experience-item").filter({
    has: page.getByRole("heading", { name: "Research Collaboration with Prof. Shoham Sabach" }),
  });
  await expect(collaboration).toContainText("2026–Present");
  await expect(collaboration).toContainText("structural negative-curvature certificates and local escape directions");
  await expect(collaboration).toContainText("edge-level curvature interact in the reduced Hessian");
  await expect(cvEnglish.locator("#cv-en-projects")).not.toContainText("Independent Research — Optimization");
  const pgdProject = cvEnglish.locator(".cv-project-list li").filter({
    has: page.getByRole("heading", { name: "First-Order Methods for Smooth Convex Optimization in Isabelle/HOL" }),
  });
  await expect(pgdProject).toContainText("Archive of Formal Proofs · July 2026 · Sole author");
  await expect(pgdProject).toContainText("residual certificates");
  const submodularProject = cvEnglish.locator(".cv-project-list li").filter({ hasText: "Wenda Li" });
  await expect(submodularProject).toContainText("I was responsible for the full Isabelle/HOL development");
  const industry = cvEnglish.locator(".cv-experience-item").filter({
    has: page.getByRole("heading", { name: "Data Engineering Intern" }),
  });
  await expect(industry).toContainText("Liblib AI (Beijing Qidian Xingyu Technology Co., Ltd.)");
  await expect(industry).toContainText("Jun 2025 – Jul 2025");
  await expect(industry).toContainText(
    "Wrote SQL in Alibaba Cloud DataWorks to answer data requests from the operations team"
  );
  await expect(cvEnglish.getByRole("heading", { name: "Patents" })).toBeVisible();
  await expect(cvEnglish.locator("#cv-en-projects")).toContainText(
    "Application No. 202411275605.1, pending"
  );
  await expect(cvEnglish.locator("#cv-en-projects")).toContainText("Role: Co-inventor");
  await expect(cvEnglish.locator("#cv-en-projects")).toContainText(
    "Patent No. ZL202422234130.3, granted July 4, 2025"
  );
  await expect(cvEnglish.locator("#cv-en-experience")).not.toContainText("Data Analytics");
  await expect(cvEnglish.locator("#cv-en-experience")).not.toContainText("Modeling and Engineering Analysis");

  await page.goto("cv.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  const cvChinese = page.locator('[data-lang-block="zh"]');
  await expect(page.locator(".page-last-updated-label")).toHaveText("最近更新：");
  await expect(page.locator(".page-last-updated-time")).toHaveText("2026 年 8 月");
  await expect(cvChinese.locator("#cv-zh-projects")).toContainText("Archive of Formal Proofs · 2026年7月 · 独立作者");
  await expect(cvChinese.locator("#cv-zh-projects")).not.toContainText("等待审核");
  await expect(cvChinese.locator("#cv-zh-projects")).toContainText(
    "在 Wenda Li 指导下负责完整的 Isabelle/HOL 形式化开发"
  );
  await expect(cvChinese.locator("#cv-zh-projects")).not.toContainText(
    /Selected Work|Submitted Formalization|Patents|development/
  );
  await expect(cvChinese.locator("#cv-zh-projects")).toContainText("图结构、不变性与边层级曲率");
  await expect(cvChinese.locator("#cv-zh-experience")).toContainText("数据工程实习生");
  await expect(cvChinese.locator("#cv-zh-experience")).toContainText("2025 年 6 月–7 月");
  await expect(page.locator(".footer-copy")).toHaveText(
    "© 2026 CHRONOHAZE。由 GitHub Pages 托管。"
  );

  await page.goto("research.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator("body.research-landing-page")).toBeVisible();
  await expect(page.locator('.research-hero [data-lang-block="zh"] h1')).toHaveText("研究陈述");
  await expect(page.locator('.research-hero [data-lang-block="zh"]')).toContainText(
    "结构性假设如何决定优化算法的保证"
  );
  await expect(page.locator('#research-questions [data-lang-block="zh"] li')).toHaveCount(3);
  await expect(page.locator('#research-questions ol[data-lang-block="zh"]')).toContainText(
    "统一的概率运行语义"
  );
  await expect(page.locator('#research-questions ol[data-lang-block="zh"]')).toContainText("可计算的负曲率证书和局部逃逸方向");
  await expect(page.locator("#research-projects")).toBeVisible();
  await expect(page.locator("#research-outputs")).toBeVisible();
  await expect(page.locator('#research-projects [data-lang-block="zh"] .research-project-card')).toHaveCount(2);
  await expect(page.locator('main [data-lang-block="en"]')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-rendered-lang', 'zh');
  const formalizationLine = page.locator(
    '#research-projects [data-lang-block="zh"] .research-project-card'
  ).first();
  await expect(formalizationLine).toContainText("2026年5月26日正式发表于 AFP");
  await expect(formalizationLine).toContainText("发表后，当前仓库继续发展");
  await expect(formalizationLine).toContainText("采样模型、近似证明与预言机调用复杂度界");
  await expect(page.locator("#research-outputs .research-output-card")).toHaveCount(0);
  await expect(page.locator("#research-outputs a")).toHaveText("查看代表性工作");
  await expect(page.locator("#research-outputs a")).toHaveAttribute("href", "projects.html");
  await expect(page.locator("#research-now")).toContainText(
    "机器检查优化，以及通过不变性与对偶研究非凸定位问题的结构"
  );
  await expect(formalizationLine.getByRole("link", { name: "PGD AFP 条目", exact: true })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Projected_Gradient_Descent.html"
  );
  await expect(formalizationLine.getByRole("link", { name: "Submodular AFP 条目", exact: true })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(page.locator('main')).not.toContainText('Metalcore Piano Lab');
  await expect(page.locator('main')).not.toContainText('SUPPORTING COMPUTATIONAL');

  await page.goto("research.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".research-thesis-line")).toHaveText(
    "My work currently has two main directions. The first is formal verification of optimization algorithms in Isabelle/HOL, including submodular greedy methods and projected gradient descent. The second is nonconvex network localization, where I study stationary points, Hessian structure, and negative-curvature directions."
  );
  await expect(page.locator("#research-questions .research-question-list")).toContainText(
    "How can the expected approximation guarantee and the executable trace-level oracle-cost guarantee be unified within a single probabilistic run semantics?"
  );
  await expect(page.locator("#research-outputs .research-output-card")).toHaveCount(0);
  await expect(page.locator("#research-outputs a")).toHaveText("View Selected Work");

  expect(errors).toEqual([]);
});

test("Chinese academic surfaces do not expose English interface labels", async ({ page }) => {
  const bannedInterfaceCopy =
    /Selected Work|Submitted Formalization|Patents|PUBLISHED|ONGOING COLLABORATION|EXPLORATORY NOTE|full Isabelle\/HOL development/;

  for (const path of ["academic.html", "projects.html", "cv.html"]) {
    await page.goto(`${path}?lang=zh`, { waitUntil: "domcontentloaded" });
    await waitForCriticalLoaderRelease(page);
    const chineseBlocks = await page
      .locator('main [data-lang-block="zh"]')
      .allInnerTexts();
    expect(chineseBlocks.join(" ")).not.toMatch(bannedInterfaceCopy);
  }
});

test("selected work page primary navigation omits Work and follows the language switch", async ({ page }) => {
  await page.goto("projects.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const primaryLinks = page.locator(".site-header .nav > a");
  await expect(primaryLinks).toHaveText(["Home", "Academic", "Profile", "Search"]);
  await expect(primaryLinks.filter({ hasText: "Work" })).toHaveCount(0);
  await expect(page.locator('.site-header .nav > a[data-nav-key="academic"]')).toHaveClass(
    /active/
  );

  await page.locator('.floating-lang-btn[data-lang="zh"]').click();
  await expect(page).toHaveURL(/(?:\?|&)lang=zh(?:&|$)/);
  await expect(primaryLinks).toHaveText(["主页", "学术", "个人档案", "搜索"]);
  await expect(page.locator(".site-header .nav .nav-studio-trigger")).toHaveText("工作室");
  await expect(page.locator('.floating-lang-btn[data-lang="zh"]')).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".site-header .nav > a")).toHaveText([
    "主页",
    "学术",
    "个人档案",
    "搜索",
  ]);
});

test("academic section navigation stays on the three canonical destinations", async ({ page }) => {
  const pages = [
    { path: "academic.html", active: null },
    { path: "research.html", active: "研究陈述" },
    { path: "projects.html", active: "代表性工作" },
    { path: "math.html", active: "技术笔记" },
    { path: "notes/huber_glm_sparsification_refinement_note.html", active: "技术笔记", back: true },
    { path: "notes/theorem11_convexity_note.html", active: "技术笔记", back: true },
    { path: "notes/ttgda_second_order_tracking_note.html", active: "技术笔记", back: true },
    { path: "post/dual-score-saddle-certificates.html", active: "技术笔记", footerNav: true },
    { path: "post/first-isabelle-proof.html", active: "技术笔记", footerNav: true },
    { path: "post/isabelle-submodular-greedy.html", active: "技术笔记", footerNav: true },
    { path: "post/metalcore-piano-lab.html", active: "技术笔记", footerNav: true },
    { path: "post/projected-gradient-descent-isabelle-hol.html", active: "技术笔记", footerNav: true },
    { path: "post/spring-2026.html", active: "技术笔记", footerNav: true },
    { path: "post/submodular-greedy-formalization-enters-afp.html", active: "技术笔记", footerNav: true },
    { path: "post/theorem-to-framework-isabelle-submodular.html", active: "技术笔记", footerNav: true },
    { path: "post/what-i-really-got-when-a-dual-route-failed.html", active: "技术笔记", footerNav: true },
  ];
  const expectedLabels = ["代表性工作", "研究陈述", "技术笔记"];
  const expectedPaths = ["/projects.html", "/research.html", "/math.html"];

  for (const item of pages) {
    await page.goto(`${item.path}?lang=zh`, { waitUntil: "domcontentloaded" });
    await waitForCriticalLoaderRelease(page);

    const nav = page.locator(".academic-local-nav");
    const links = nav.locator(".academic-local-link");
    await expect(links).toHaveCount(3);
    await expect(links).toHaveText(expectedLabels);

    const destinations = await links.evaluateAll((anchors) =>
      anchors.map((anchor) => new URL(anchor.href).pathname)
    );
    expectedPaths.forEach((expectedPath, index) => {
      expect(destinations[index]).toMatch(new RegExp(`${expectedPath.replace(".", "\\.")}$`));
    });

    const activeLinks = nav.locator(".academic-local-link.is-active");
    if (item.active) {
      await expect(activeLinks).toHaveCount(1);
      await expect(activeLinks).toHaveText(item.active);
    } else {
      await expect(activeLinks).toHaveCount(0);
    }

    if (item.back) {
      await expect(page.locator(".note-detail-back")).toHaveText("返回技术笔记");
    }

    if (item.footerNav) {
      const footerRows = page.locator(".academic-hub-links-label + .research-link-row");
      await expect.poll(async () => footerRows.count()).toBeGreaterThan(0);
      for (let index = 0; index < await footerRows.count(); index += 1) {
        await expect(footerRows.nth(index).locator("a")).toHaveText(expectedLabels);
      }
    }
  }
});

test("album page renders cover and track links", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("music/album-ipomoea-alba.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".album-cover img")).toBeVisible();
  await expect(page.locator(".album-authorship")).toHaveText(
    "除特别说明外，作品的写作、编曲、演奏、录制与制作均由 HazezZ 完成。"
  );
  await expect(page.locator(".album-note")).toHaveCount(6);
  await expect(page.locator(".album-intro")).toContainText("作品本身就是留下来的部分");
  await expect(page.locator(".album-intro")).not.toContainText("屏幕、时差");
  await expect(page.locator(".album-intro")).not.toContainText("如果有一天被听见");
  await expect.poll(async () => page.locator(".album-tracklist .album-track-link").count()).toBeGreaterThan(10);
  await expect
    .poll(async () => page.locator(".album-tracklist [data-track-status], .album-tracklist .track-status-badge").count())
    .toBeGreaterThan(0);

  await page.goto("music/album-ipomoea-alba.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".album-authorship")).toHaveText(
    "Written, arranged, performed and produced by HazezZ, unless otherwise noted."
  );
  await expect(page.locator(".album-note")).toHaveText(
    "This evolving album gathers rain, sea air, deep-blue persistence, imagined futures, and the distance between reality and ideal."
  );
  await expect(page.locator(".album-production-note")).toHaveText(
    "This is an evolving archive; several tracks are being re-recorded and revised."
  );
  await expect(page.locator(".album-intro")).not.toContainText("This albu");
  await expect(page.locator(".album-intro")).not.toContainText(
    "or more like a collection for now"
  );
  await expect(page.locator(".page-last-updated-row")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("最近更新");

  expect(errors).toEqual([]);
});

test("Studio tab shares the desktop navigation box alignment", async ({ page }, testInfo) => {
  test.skip(
    !["chromium", "webkit"].includes(testInfo.project.name),
    "desktop-engine geometry regression check"
  );
  await page.setViewportSize({ width: 1468, height: 500 });

  for (const lang of ["zh", "en"]) {
    const errors = trackPageErrors(page);
    await page.goto(`academic.html?lang=${lang}`, { waitUntil: "domcontentloaded" });
    await waitForCriticalLoaderRelease(page);

    const alignment = await page.evaluate(() => {
      const reference = document.querySelector(".site-header .nav > a");
      const studio = document.querySelector(".site-header .nav-studio-trigger");
      if (!reference || !studio) return null;
      const referenceRect = reference.getBoundingClientRect();
      const studioRect = studio.getBoundingClientRect();
      return {
        topDelta: studioRect.top - referenceRect.top,
        heightDelta: studioRect.height - referenceRect.height,
        referencePaddingBottom: window.getComputedStyle(reference).paddingBottom,
        studioPaddingBottom: window.getComputedStyle(studio).paddingBottom,
      };
    });

    expect(alignment).not.toBeNull();
    expect(Math.abs(alignment.topDelta)).toBeLessThan(0.1);
    expect(Math.abs(alignment.heightDelta)).toBeLessThan(0.1);
    expect(alignment.studioPaddingBottom).toBe(alignment.referencePaddingBottom);
    expect(errors).toEqual([]);
  }
});

test("secondary pages keep mobile nav within the viewport", async ({ page }, testInfo) => {
  const runsMobileNavCheck = isMobileProject(testInfo) || testInfo.project.name === "chromium";
  test.skip(!runsMobileNavCheck, "mobile-only nav safety check");

  if (testInfo.project.name === "chromium") {
    await page.setViewportSize({ width: 390, height: 844 });
  }

  const pages = [
    "policy.html",
    "accessibility.html",
    "olfactory.html",
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
    await expect(page.locator(".site-header .brand img")).toHaveAttribute(
      "src",
      /logo-header\.png$/
    );
    await expect(page.locator(".cursor-atmosphere-layer")).toHaveCount(0);

    const navTargets = await page.locator(".site-header .nav a").evaluateAll((links) =>
      links.map((link) => (link.getAttribute("href") || "").replace(/^\.\.\//, ""))
    );
    expect(navTargets).toEqual([
      "index.html",
      "academic.html",
      "cv.html",
      "music.html",
      "photography.html",
      "search.html",
    ]);

    const metrics = await page.evaluate(() => {
      const nav = document.querySelector(".site-header .nav");
      const header = document.querySelector(".site-header");
      const body = document.body;
      const root = document.documentElement;
      const visibleTargetHeights = nav
        ? Array.from(nav.querySelectorAll("a, .nav-studio-trigger"))
            .map((target) => target.getBoundingClientRect().height)
            .filter((height) => height > 0)
        : [];
      return {
        viewport: window.innerWidth,
        filmGrainContent: window.getComputedStyle(document.body, "::before").content,
        rootScrollWidth: root ? root.scrollWidth : 0,
        bodyScrollWidth: body ? body.scrollWidth : 0,
        headerScrollWidth: header ? header.scrollWidth : 0,
        navScrollWidth: nav ? nav.scrollWidth : 0,
        minNavTargetHeight: visibleTargetHeights.length
          ? Math.min(...visibleTargetHeights)
          : 0,
      };
    });

    expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.filmGrainContent).toBe("none");
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.headerScrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.navScrollWidth).toBeLessThanOrEqual(metrics.viewport + 2);
    expect(metrics.minNavTargetHeight).toBeGreaterThanOrEqual(44);

    const studioMenu = page.locator(".site-header .nav-studio-menu");
    const studioTrigger = studioMenu.locator(".nav-studio-trigger");
    const triggerTopBeforeOpen = await studioTrigger.evaluate(
      (trigger) => trigger.getBoundingClientRect().top
    );
    await studioTrigger.click();
    await expect(studioMenu).toHaveAttribute("open", "");
    const triggerTopWhileOpen = await studioTrigger.evaluate(
      (trigger) => trigger.getBoundingClientRect().top
    );
    expect(Math.abs(triggerTopWhileOpen - triggerTopBeforeOpen)).toBeLessThan(1);
    const studioTargetHeights = await studioMenu
      .locator(".nav-studio-panel a")
      .evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height));
    expect(studioTargetHeights.every((height) => height >= 44)).toBe(true);

    await page.locator("main").dispatchEvent("click");
    await expect(studioMenu).not.toHaveAttribute("open", "");
    await expect(studioTrigger).not.toBeFocused();
    const triggerTopAfterDismiss = await studioTrigger.evaluate(
      (trigger) => trigger.getBoundingClientRect().top
    );
    expect(Math.abs(triggerTopAfterDismiss - triggerTopBeforeOpen)).toBeLessThan(1);

    expect(errors).toEqual([]);
  }
});

test("music detail lyrics span the full mobile viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "single-engine geometry regression check");
  await page.setViewportSize({ width: 390, height: 844 });

  const errors = trackPageErrors(page);
  await page.goto("music/track-04.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const lyrics = page.locator(".music-detail-article > .lyrics-showcase");
  await expect(lyrics).toBeVisible();

  const geometry = await lyrics.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewport: window.innerWidth,
      rootScrollWidth: document.documentElement.scrollWidth,
    };
  });

  expect(Math.abs(geometry.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.right - geometry.viewport)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.width - geometry.viewport)).toBeLessThanOrEqual(1);
  expect(geometry.rootScrollWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(errors).toEqual([]);
});

test("Chinese mobile pages avoid mixed Latin and CJK font stacks", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "single-engine font cascade regression check");
  await page.setViewportSize({ width: 390, height: 844 });

  const pages = [
    "academic.html?lang=zh",
    "music.html?lang=zh",
    "music/track-04.html?lang=zh",
    "photography.html?lang=zh",
  ];

  for (const path of pages) {
    const errors = trackPageErrors(page);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await waitForCriticalLoaderRelease(page);

    const mixedRuns = await page.locator("body *").evaluateAll((nodes) =>
      nodes
        .filter((node) =>
          Array.from(node.childNodes).some(
            (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim()
          )
        )
        .filter((node) => window.getComputedStyle(node).fontFamily.includes("Cormorant Garamond"))
        .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80))
    );

    expect(mixedRuns).toEqual([]);
    expect(errors).toEqual([]);
  }

  await page.goto("music/track-04.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".music-detail-article h1")).toHaveCSS(
    "font-family",
    /Cormorant Garamond/
  );
});

test("academic gateway pages mount only the selected language", async ({ page }) => {
  const pages = [
    { path: "academic.html?lang=zh", active: "zh", inactive: "en" },
    { path: "research.html?lang=en", active: "en", inactive: "zh" },
    { path: "cv.html?lang=zh", active: "zh", inactive: "en" },
    { path: "projects.html?lang=en", active: "en", inactive: "zh" },
  ];

  for (const item of pages) {
    await page.goto(item.path, { waitUntil: "domcontentloaded" });
    await waitForCriticalLoaderRelease(page);
    await expect(page.locator("body")).toHaveAttribute("data-rendered-lang", item.active);
    await expect(page.locator(`main [data-lang-block="${item.inactive}"]`)).toHaveCount(0);
    await expect(page.locator(`main [data-lang-block="${item.active}"]`).first()).toBeVisible();
    await expect(page.locator(".site-header .floating-lang-switch")).toHaveCount(1);
    await expect(page.locator(".site-header .floating-lang-switch")).toBeVisible();

    const nextLang = item.active === "zh" ? "en" : "zh";
    await page.locator(`.site-header .floating-lang-btn[data-lang="${nextLang}"]`).click();
    await expect(page.locator("body")).toHaveAttribute("data-rendered-lang", nextLang);
    await expect(page).toHaveURL(new RegExp(`[?&]lang=${nextLang}(?:&|$)`));
    await expect(page.locator(`main [data-lang-block="${item.active}"]`)).toHaveCount(0);
    await expect(page.locator(`main [data-lang-block="${nextLang}"]`).first()).toBeVisible();
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
  await expect(page.locator('.research-hero [data-lang-block="zh"] .academic-snapshot-list')).toHaveCount(2);
  await expect(page.locator('.research-hero [data-lang-block="zh"] .academic-snapshot-list li')).toHaveCount(4);
  await expect(page.locator('.research-hero [data-lang-block="zh"]')).toContainText(
    "我研究优化理论与形式化验证"
  );
  await expect(page.locator('.research-hero [data-lang-block="zh"]')).toContainText(
    '与 Prof. Shoham Sabach 合作研究负曲率证书与局部逃逸方向'
  );
  await expect(evidence.getByRole("link", { name: "AFP 条目" }).first()).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(evidence.getByRole("link", { name: "个人档案" })).toHaveAttribute("href", "cv.html");
  await expect(evidence.getByRole("link", { name: "研究陈述" })).toHaveAttribute(
    "href",
    "research.html"
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator("body")).toHaveAttribute("data-rendered-lang", "zh");

  await page.goto("academic.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator('main [data-lang-block="zh"]')).toHaveCount(0);
  await expect(evidence.locator('[data-lang-block="en"]')).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("body")).toHaveAttribute("data-rendered-lang", "en");
  await expect(page.getByText("Selected Research Outputs", { exact: true })).toBeVisible();
  await expect(page.locator('.research-hero [data-lang-block="en"]')).toContainText("Feier Lyu (Fay Lyu)");
  await expect(page.locator('.research-hero [data-lang-block="en"]')).toContainText(
    "My current work centers on reusable Isabelle/HOL infrastructure"
  );
  await expect(page.locator('.research-hero [data-lang-block="en"]')).toContainText(
    'Negative-curvature certificates and local escape directions, with Prof. Shoham Sabach'
  );
  await expect(evidence.locator('[data-lang-block="en"]')).toContainText("Published May 26, 2026");
  await expect(evidence.locator('[data-lang-block="en"]')).toContainText("AFP · 2026 · SOLE AUTHOR");
  await expect(evidence.locator('[data-lang-block="en"]')).toContainText("Ongoing collaboration with Prof. Shoham Sabach");
  await expect(page.locator("main")).not.toContainText("Born in 2005");
  await expect(page.locator("main")).not.toContainText("HazezZ");

  const academicActionSizes = await page
    .locator(".academic-local-link, .academic-proof-links a, .academic-evidence-list a")
    .evaluateAll((links) => links.map((link) => parseFloat(window.getComputedStyle(link).fontSize)));
  expect(academicActionSizes.length).toBeGreaterThan(0);
  expect(academicActionSizes.every((size) => size >= 14)).toBe(true);

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
  await expect(page.locator('main [data-lang-block="zh"]')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-rendered-lang', 'en');
  await expect(
    page.locator('#selected-work-list [data-lang-block="en"] > .academic-evidence > .academic-evidence-list li')
  ).toHaveCount(3);
  const pgdProject = page.locator(
    '#selected-work-list [data-lang-block="en"] > .academic-evidence > .academic-evidence-list li'
  ).first();
  await expect(pgdProject).toContainText("Published in the Archive of Formal Proofs on July 2, 2026");
  await expect(pgdProject).toContainText("Sole-authored formalization");
  await expect(pgdProject).toContainText("projection geometry");
  await expect(pgdProject).toContainText("projected-gradient mappings");
  await expect(pgdProject).toContainText("residual certificates");
  await expect(pgdProject.getByRole("link", { name: "AFP", exact: true })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Projected_Gradient_Descent.html"
  );
  const publishedProject = page.locator(
    '#selected-work-list [data-lang-block="en"] > .academic-evidence > .academic-evidence-list li'
  ).nth(1);
  await expect(publishedProject).toContainText("Published in the Archive of Formal Proofs on May 26, 2026");
  await expect(publishedProject).toContainText("under the supervision of Wenda Li");
  await expect(publishedProject).toContainText("post-publication stochastic-greedy extension");
  await expect(publishedProject.getByRole("link", { name: "DOI", exact: true })).toHaveAttribute(
    "href",
    "https://doi.org/10.5281/zenodo.21054718"
  );
  const localizationProject = page.locator(
    '#selected-work-list [data-lang-block="en"] > .academic-evidence > .academic-evidence-list li'
  ).nth(2);
  await expect(localizationProject).toContainText("Ongoing collaboration with Prof. Shoham Sabach");
  await expect(localizationProject).toContainText(
    "My current work develops and checks projected-edge budget conditions"
  );
  await expect(localizationProject.getByRole("link", { name: "Research record" })).toHaveAttribute(
    "href",
    "notes/network_localization_structural_certificates.html?lang=en"
  );
  const exploratoryArchive = page.locator("#exploratory-work-en");
  await expect(exploratoryArchive).toContainText("Exploratory Archive");
  await expect(exploratoryArchive).toContainText("TTGDA and Second-Order Tracking");
  await expect(exploratoryArchive).toContainText("not part of the primary Selected Work sequence");
  const bodyReadability = await publishedProject.locator("p:not(.academic-proof-kicker)").first().evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
  expect(bodyReadability.fontSize).toBeGreaterThanOrEqual(14);
  expect(bodyReadability.lineHeight / bodyReadability.fontSize).toBeGreaterThanOrEqual(1.55);
  const creativePrototype = page.locator(
    '#selected-work-list [data-lang-block="en"] .academic-hub-links:not(#exploratory-work-en)'
  );
  await expect(creativePrototype).toContainText("CREATIVE COMPUTATION");
  await expect(creativePrototype).toContainText("Experimental Prototype");
  await expect(creativePrototype).toContainText("Side project");
  await expect(creativePrototype).toContainText("not presented as a research output");
  await expect(creativePrototype).toContainText("Metalcore Piano Lab");

  await page.goto("post/theorem-to-framework-isabelle-submodular.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);
  const update = page.locator('[data-lang-block="en"] .math-post-update');
  await expect(update).toBeVisible();
  await expect(update).toContainText("Published May 26, 2026");
  await expect(update).toContainText("original March 14 date");
  await expect(update).toContainText("Post-publication extension");
  await expect(update.getByRole("link", { name: "AFP entry" })).toHaveAttribute(
    "href",
    "https://isa-afp.org/entries/Submodular_Greedy.html#"
  );
  await expect(update.getByRole("link", { name: "DOI: 10.5281/zenodo.21054718" })).toHaveAttribute(
    "href",
    "https://doi.org/10.5281/zenodo.21054718"
  );

  await page.goto("post/isabelle-submodular-greedy.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await waitForCriticalLoaderRelease(page);
  await expect(page.getByRole("heading", { name: "Early Project Note: Formalising Submodular Greedy" })).toBeVisible();
  await expect(page.locator(".article-meta")).toContainText("Feier Lyu");
  await expect(page.locator(".article-meta")).not.toContainText("HazezZ");
  await expect(page.locator(".math-post-update")).toContainText("Published in AFP on May 26, 2026");
  await expect(page.locator(".math-post-update")).toContainText("Post-publication extension");

  expect(errors).toEqual([]);
});

test("technical notes use explicit status labels and a local Julia fractal", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.setViewportSize({ width: 1363, height: 936 });
  await page.goto("math.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const fractal = page.locator(".math-fractal-highlight");
  await expect(fractal).toBeVisible();
  await expect(fractal.locator("img")).toHaveAttribute("src", "assets/template/julia.png");
  await expect(fractal.locator("img")).toHaveAttribute("alt", "Julia fractal image");
  await expect(fractal.locator("figcaption")).toHaveAttribute("data-copy-zh", "侧边视觉 · 我最喜欢的 Julia 分形");
  await expect(fractal.locator("figcaption")).toHaveAttribute("data-copy-en", "Side visual · My favorite Julia fractal");
  await expect(fractal.locator("a")).toHaveCount(0);
  await expect(page.locator("#pinned-notes .math-note-status")).toHaveCount(3);
  await expect(page.locator("#exploratory-archive .math-note-status")).toHaveCount(1);
  await expect(page.locator("#notes-archive .math-note-status")).toHaveCount(10);
  const labels = await page.locator(".math-note-status").allTextContents();
  const allowed = new Set([
    "Published formalization",
    "Published · AFP · Sole author",
    "Publication retrospective · AFP",
    "Ongoing joint research",
    "Historical note · Superseded",
    "Exploratory derivation",
    "Reading note",
  ]);
  expect(labels.every((label) => allowed.has(label.trim()))).toBe(true);
  const verticalOrder = await page.evaluate(() => ({
    pinned: document.querySelector("#pinned-notes").getBoundingClientRect().top,
    fractal: document.querySelector(".math-fractal-banner").getBoundingClientRect().top,
  }));
  expect(verticalOrder.pinned).toBeLessThan(936);
  expect(verticalOrder.pinned).toBeLessThan(verticalOrder.fractal);

  await page.goto("notes/theorem11_convexity_note.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".note-detail-meta")).toContainText("Reading note");
  await expect(page.locator(".note-detail-citation")).toContainText(
    "Characterizing Online and Private Learnability under Distributional Constraints via Generalized Smoothness"
  );
  await expect(page.getByRole("link", { name: "arXiv:2602.20585" })).toHaveAttribute(
    "href",
    "https://arxiv.org/abs/2602.20585"
  );
  expect(errors).toEqual([]);
});

test("shared modal-invariants note is formal, direct-link only, and non-indexable", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("shared/modal_invariants_symplectic_euler.html", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", {
      name: "Modal Invariants and a Sharp Stability Threshold for Quadratic Symplectic Euler",
    })
  ).toBeVisible();
  await expect(page.locator(".shared-affiliation")).toHaveText(
    "BSc Mathematics (expected 2027), University of Edinburgh"
  );
  await expect(page.locator(".shared-abstract")).toContainText(
    "symplectic Euler applied to a positive-definite separable quadratic Hamiltonian"
  );
  await expect(page.locator(".shared-abstract")).toContainText(
    "power-boundedness of the linear symplectic Euler update"
  );
  await expect(page.locator(".site-header .nav a")).toHaveCount(5);
  await expect(page.locator(".academic-local-nav a")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Back to Academic" })).toHaveAttribute(
    "href",
    "../academic.html"
  );
  await expect(page.locator("main article > section")).toHaveCount(5);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, noarchive, nosnippet"
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://lyuf09.github.io/chronohaze/shared/modal_invariants_symplectic_euler.html"
  );
  await expect(page.getByText("Back to Technical Notes")).toHaveCount(0);
  await expect(page.locator('a[href="modal_invariants_symplectic_euler.pdf"]')).toHaveCount(2);
  await expect(page.locator(".shared-pdf-frame")).toHaveAttribute(
    "src",
    "modal_invariants_symplectic_euler.pdf#view=FitH"
  );
  await expect(page.getByRole("link", { name: "Academic Profile", exact: true })).toHaveAttribute(
    "href",
    "../academic.html"
  );
  await expect(page.getByRole("link", { name: "View at JMLR" })).toHaveAttribute(
    "href",
    "https://jmlr.org/papers/v27/24-0792.html"
  );

  const discoveryData = await page.evaluate(async () => {
    const [search, sitemap] = await Promise.all([
      fetch("../assets/search-index.json").then((response) => response.text()),
      fetch("../sitemap.xml").then((response) => response.text()),
    ]);
    return { search, sitemap };
  });
  expect(discoveryData.search).not.toContain("shared/modal_invariants_symplectic_euler");
  expect(discoveryData.sitemap).not.toContain("shared/modal_invariants_symplectic_euler");

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasOverflow).toBe(false);
  expect(errors).toEqual([]);
});

test("July notes lead the math archive and AFP work exposes primary evidence", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("math.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.getByRole("heading", { name: "技术笔记" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Feier Lyu（Fay Lyu）");
  await expect(page.locator("#pinned-notes .academic-evidence-list li")).toHaveCount(3);
  await expect(page.locator("#pinned-notes .academic-evidence-list li").nth(0)).toContainText(
    "Isabelle Submodular Greedy Project"
  );
  await expect(page.locator("#pinned-notes .academic-evidence-list li").nth(1)).toContainText(
    "Projected Gradient Descent in Isabelle/HOL"
  );
  await expect(page.locator("#pinned-notes .academic-evidence-list li").nth(2)).toContainText(
    "一条负残差并不够"
  );
  await expect(page.locator("#pinned-notes .academic-evidence-list li").nth(2)).toContainText(
    "2026 年 7 月研究记录 · 持续合作"
  );
  await expect(page.locator("#exploratory-archive")).toContainText("TTGDA and Second-Order Tracking");
  await expect(page.locator("#exploratory-archive")).toContainText("探索性归档");
  await expect(page.locator("#notes-archive")).toBeVisible();
  const archiveNotes = page.locator(".math-list .math-card");
  await expect(archiveNotes).toHaveCount(10);
  await expect(archiveNotes.nth(0)).toContainText("一条负残差并不够：网络定位中负曲率的结构");
  await expect(archiveNotes.nth(0)).toContainText("进行中的合作研究");
  await expect(archiveNotes.nth(1)).toContainText("子模贪心算法形式化正式进入 AFP");
  await expect(archiveNotes.nth(1).locator(".math-date")).toContainText("原始发布 · 2026-06-30");
  await expect(page.locator('a[href="notes/theorem11_convexity_note.html"]')).toHaveCount(0);
  await expect(page.locator('a[href="notes/huber_glm_sparsification_refinement_note.html"]')).toHaveCount(0);

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
    "https://github.com/lyuf09/isabelle-submodular-greedy"
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
  await expect(page.getByRole("heading", { name: "Blue / 跨媒介作品" })).toBeVisible();
  await expect(page.locator(".photo-blue-evidence-result")).toContainText("满分");
  await expect(page.locator(".photo-blue-evidence-stills img")).toHaveCount(5);
  await expect(page.locator("a.photo-blue-evidence-stills")).toHaveCount(1);
  await expect(page.locator(".photo-archive img[alt='']")).toHaveCount(0);
  await expect(page.locator(".photo-archive img[aria-hidden='true']")).toHaveCount(0);
  await expect(page.locator(".photo-archive img[data-alt-en][data-alt-zh]")).toHaveCount(17);
  await expect(page.locator(".nav a.active")).toHaveAttribute("aria-current", "page");

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

test("photography archive dates use one numeric format", async ({ page }) => {
  await page.goto("photography.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const exactDates = await page.locator(".photo-archive .photo-date").evaluateAll((nodes) =>
    nodes
      .map((node) => (node.textContent || "").trim())
      .filter((value) => /^\d/.test(value) && !value.includes("·"))
  );
  expect(exactDates).toEqual(expect.arrayContaining(["18/05/2026", "30/08/2025"]));
  expect(exactDates.every((value) => /^\d{2}\/\d{2}\/\d{4}$/.test(value))).toBe(true);
});

test("photo detail lead image prefers a landscape composition", async ({ page }) => {
  await page.goto("photo/photo-13.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  const hero = page.locator(
    '.photo-detail-lead-composition .photo-detail-item[data-photo-slot="hero"] img'
  );
  await expect(hero).toHaveCount(1);
  await expect(hero).toHaveAttribute(
    "data-full-res-src",
    /64569d_db5c80b9c2dc4e60bd05ff0831f66e12~mv2\.jpg$/
  );
});

test("photo detail page supports keyboard prev/next navigation", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("photo/photo-01.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);

  await expect(page.locator(".photo-detail-article, .photo-blue-article")).toBeVisible();
  await expect(page.locator(".photo-detail-pager")).toBeVisible();
  await expect(page.locator(".photo-detail-pager [data-photo-nav-label='next']")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/photo\/photo-02\.html\?lang=zh$/);
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".photo-detail-pager")).toBeVisible();

  expect(errors).toEqual([]);
});

test("photo detail metadata localizes dates, places, statements, and image alt text", async ({
  page,
}) => {
  const errors = trackPageErrors(page);

  await page.goto("photo/photo-17.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".photo-detail-date")).toHaveText("18 May 2026");
  await expect(page.locator(".photo-detail-article .article-meta")).toHaveText(
    "Ithaca, USA · 2026"
  );
  await expect(page.locator(".photo-detail-statement")).toContainText(
    "one of my last ordinary walks in Ithaca"
  );
  const englishPhotoAlts = await page
    .locator(".photo-detail-gallery img")
    .evaluateAll((images) => images.map((image) => image.getAttribute("alt") || ""));
  expect(englishPhotoAlts.every((alt) => alt.includes("Ithaca, USA · 2026"))).toBe(true);
  expect(englishPhotoAlts.join(" ")).not.toMatch(/[\u3400-\u9fff]/);

  await page.goto("photo/photo-17.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".photo-detail-date")).toHaveText("2026 年 5 月 18 日");
  await expect(page.locator(".photo-detail-statement")).toContainText(
    "观察普通景象怎样慢慢变成记忆"
  );

  await page.goto("photo/photo-14.html?lang=en", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".photo-detail-date")).toHaveText("30 August 2025");

  await page.goto("photo/photo-14.html?lang=zh", { waitUntil: "domcontentloaded" });
  await waitForCriticalLoaderRelease(page);
  await expect(page.locator(".photo-detail-date")).toHaveText("2025 年 8 月 30 日");

  expect(errors).toEqual([]);
});
