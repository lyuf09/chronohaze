const { test, expect } = require("@playwright/test");

function collectTypes(value, set) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectTypes(item, set));
    return;
  }
  if (typeof value !== "object") return;

  const t = value["@type"];
  if (Array.isArray(t)) {
    t.forEach((entry) => {
      if (typeof entry === "string" && entry.trim()) set.add(entry.trim());
    });
  } else if (typeof t === "string" && t.trim()) {
    set.add(t.trim());
  }

  Object.keys(value).forEach((key) => {
    if (key === "@type") return;
    collectTypes(value[key], set);
  });
}

function collectNodesByType(value, expectedType, nodes) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectNodesByType(item, expectedType, nodes));
    return;
  }
  if (typeof value !== "object") return;

  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.includes(expectedType)) {
    nodes.push(value);
  }
  Object.values(value).forEach((child) => collectNodesByType(child, expectedType, nodes));
}

async function readStructuredData(page) {
  const script = page.locator('script#chronohaze-structured-data[type="application/ld+json"]');
  await expect(script).toHaveCount(1);
  const raw = await script.textContent();
  expect(raw).toBeTruthy();

  let parsed;
  expect(() => {
    parsed = JSON.parse(raw);
  }).not.toThrow();

  expect(parsed).toBeTruthy();
  expect(parsed["@context"]).toBe("https://schema.org");
  expect(Array.isArray(parsed["@graph"])).toBeTruthy();
  expect(parsed["@graph"].length).toBeGreaterThan(0);

  const payloads = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((node) => JSON.parse(node.textContent)));
  const types = new Set();
  collectTypes(payloads, types);
  return { parsed, payloads, types };
}

async function expectStructuredTypes(page, url, expectedTypes) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect
    .poll(async () => page.locator('script#chronohaze-structured-data[type="application/ld+json"]').count())
    .toBe(1);

  const { types } = await readStructuredData(page);
  expectedTypes.forEach((type) => {
    expect(types.has(type)).toBeTruthy();
  });
}

test("structured data JSON-LD is parseable and page-specific types are present", async ({ page }) => {
  await expectStructuredTypes(page, "index.html", ["WebSite", "Person", "ProfilePage"]);
  await expectStructuredTypes(page, "cv.html", ["Person", "ProfilePage"]);
  await expectStructuredTypes(page, "research.html", ["Person", "AboutPage", "ItemList"]);
  await expectStructuredTypes(page, "music/album-ipomoea-alba.html", ["MusicAlbum", "CollectionPage"]);
  await expectStructuredTypes(page, "music/track-04.html", ["MusicRecording"]);
  await expectStructuredTypes(page, "music/track-18.html", ["MusicPlaylist", "MusicRecording"]);
  await expectStructuredTypes(page, "post/metalcore-piano-lab.html", ["BlogPosting"]);
});

test("bilingual research posts expose one localized BlogPosting with real metadata", async ({ page }) => {
  const cases = [
    {
      url: "post/projected-gradient-descent-isabelle-hol.html?lang=en",
      headline: "Moving Forward After Submodular Optimization: Projected Gradient Descent in Isabelle/HOL",
      bodyIncludes: "Projected gradient descent is one of the basic algorithmic templates",
      bodyExcludes: "带约束光滑优化",
      published: "2026-05-22",
      modified: "2026-08-01",
      keywords: ["Isabelle/HOL", "Optimization", "Formalisation", "AFP"],
    },
    {
      url: "notes/network_localization_structural_certificates.html?lang=en",
      headline: "One Negative Residual Is Not Enough",
      bodyIncludes: "Ongoing research collaboration with Prof. Shoham Sabach.",
      bodyExcludes: "一条负残差并不够",
      published: "2026-07-22",
      modified: "2026-08-01",
      keywords: ["Network Localization", "Nonconvex Optimization", "Negative Curvature", "Stress-Rigidity"],
      image: "https://lyuf09.github.io/chronohaze/assets/og/math/network-localization.png",
    },
  ];

  for (const expected of cases) {
    await page.goto(expected.url, { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => page.locator('script#chronohaze-structured-data[type="application/ld+json"]').count())
      .toBe(1);
    const { payloads } = await readStructuredData(page);
    const posts = [];
    collectNodesByType(payloads, "BlogPosting", posts);
    expect(posts).toHaveLength(1);
    expect(posts[0].headline).toBe(expected.headline);
    expect(posts[0].name).toBe(expected.headline);
    expect(posts[0].articleBody).toContain(expected.bodyIncludes);
    expect(posts[0].articleBody).not.toContain(expected.bodyExcludes);
    expect(posts[0].author).toEqual({ "@id": "https://lyuf09.github.io/chronohaze/#person" });
    expect(posts[0].datePublished).toBe(expected.published);
    expect(posts[0].dateModified).toBe(expected.modified);
    expect(posts[0].keywords).toEqual(expected.keywords);
    if (expected.image) {
      expect(posts[0].image).toEqual({
        "@type": "ImageObject",
        url: expected.image,
        width: 1200,
        height: 630,
      });
    }
    expect(JSON.stringify(posts[0].keywords)).not.toContain("Feier Lyu");
    expect(JSON.stringify(posts[0].keywords)).not.toContain("min read");
  }

  await page.goto("post/projected-gradient-descent-isabelle-hol.html?lang=zh", {
    waitUntil: "domcontentloaded",
  });
  const { payloads } = await readStructuredData(page);
  const posts = [];
  collectNodesByType(payloads, "BlogPosting", posts);
  expect(posts).toHaveLength(1);
  expect(posts[0].headline).toBe("从子模优化之后继续往前：Projected Gradient Descent in Isabelle/HOL");
  expect(posts[0].articleBody).toContain("带约束光滑优化");
  expect(posts[0].articleBody).not.toContain("Projected gradient descent is one of the basic algorithmic templates");
});

test("Academic and Research expose one page entity instead of duplicate AboutPage nodes", async ({ page }) => {
  for (const [url, expectedType] of [
    ["academic.html?lang=en", "ProfilePage"],
    ["research.html?lang=en", "AboutPage"],
  ]) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => page.locator('script#chronohaze-structured-data[type="application/ld+json"]').count())
      .toBe(1);
    const { payloads } = await readStructuredData(page);
    const pageNodes = [];
    collectNodesByType(payloads, expectedType, pageNodes);
    expect(pageNodes).toHaveLength(1);
    const aboutPages = [];
    collectNodesByType(payloads, "AboutPage", aboutPages);
    expect(aboutPages).toHaveLength(expectedType === "AboutPage" ? 1 : 0);
  }
});

test("x-default HTML and sitemap remain useful without JavaScript", async ({ request }) => {
  for (const [url, title, descriptionStart] of [
    [
      "post/projected-gradient-descent-isabelle-hol.html",
      "Moving Forward After Submodular Optimization: Projected Gradient Descent in Isabelle/HOL | Chronohaze",
      "A machine-checked development of projected gradient descent",
    ],
    [
      "photography.html",
      "Photography | Chronohaze",
      "Selected photography and yearly archives",
    ],
  ]) {
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toContain(`>${title}</title>`);
    expect(html).toContain(`content=\"${descriptionStart}`);
    expect(html).toContain(title);
  }

  const sitemap = await (await request.get("sitemap.xml")).text();
  const currentUtcDate = new Date().toISOString().slice(0, 10);
  const refreshedToday = new Set([
    "https://lyuf09.github.io/chronohaze/",
    "https://lyuf09.github.io/chronohaze/notes/network_localization_structural_certificates.html",
  ]);
  for (const url of [
    "https://lyuf09.github.io/chronohaze/",
    "https://lyuf09.github.io/chronohaze/academic.html",
    "https://lyuf09.github.io/chronohaze/projects.html",
    "https://lyuf09.github.io/chronohaze/research.html",
    "https://lyuf09.github.io/chronohaze/math.html",
    "https://lyuf09.github.io/chronohaze/notes/network_localization_structural_certificates.html",
  ]) {
    const location = `<loc>${url}</loc>`;
    const locationIndex = sitemap.indexOf(location);
    expect(locationIndex).toBeGreaterThanOrEqual(0);
    const entry = sitemap.slice(locationIndex, locationIndex + location.length + 80);
    const lastmod = entry.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1];
    expect(lastmod).toBeTruthy();
    expect(lastmod >= "2026-08-01").toBe(true);
    expect(lastmod <= currentUtcDate).toBe(true);
    if (refreshedToday.has(url)) {
      expect(lastmod).toBe(currentUtcDate);
    }
  }
});

test("each page exposes one canonical Person with the current and past institutions in the right fields", async ({
  page,
}) => {
  for (const url of [
    "index.html?lang=en",
    "olfactory.html?lang=en",
    "music/album-ipomoea-alba.html?lang=en",
    "music/track-18.html?lang=en",
  ]) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => page.locator('script#chronohaze-structured-data[type="application/ld+json"]').count())
      .toBe(1);

    const payloads = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent)));
    const people = [];
    collectNodesByType(payloads, "Person", people);

    expect(people).toHaveLength(1);
    expect(people[0]["@id"]).toBe("https://lyuf09.github.io/chronohaze/#person");
    expect(people[0].affiliation.name).toBe("The University of Edinburgh");
    expect(people[0].alumniOf.name).toBe("Cornell University");
  }
});

test("structured-data cleanup preserves spaces inside English strings", async ({ page }) => {
  await page.goto("research.html?lang=en", { waitUntil: "domcontentloaded" });
  await expect
    .poll(async () => page.locator('script#chronohaze-structured-data[type="application/ld+json"]').count())
    .toBe(1);

  const raw = await page
    .locator('script#chronohaze-structured-data[type="application/ld+json"]')
    .textContent();
  expect(raw).toContain("Research Statement");
  expect(raw).toContain("Research statement by Feier Lyu");
  expect(raw).toContain("Machine-checked optimization and reusable proof structure");
  expect(raw).not.toContain("Researchstatementby");
});

test("localized descriptions and social metadata stay in the selected language", async ({ page }) => {
  const cases = [
    ["academic.html?lang=zh", "Feier Lyu（Fay Lyu）的学术主页"],
    ["cv.html?lang=zh", "Feier Lyu（Fay Lyu）的公开学术档案"],
    ["research.html?lang=zh", "Feier Lyu（Fay Lyu）的研究陈述"],
    ["projects.html?lang=zh", "Feier Lyu（Fay Lyu）的代表性学术工作"],
    ["music/album-ipomoea-alba.html?lang=en", "Ipomoea Alba album page by HazezZ"],
    [
      "music/album-teenage-best.html?lang=en",
      "A best-of collection from HazezZ's teenage years",
    ],
    [
      "post/dual-score-saddle-certificates.html?lang=en",
      "An update connecting an instance-level dual score",
    ],
    [
      "post/first-isabelle-proof.html?lang=en",
      "My first Isabelle formalization project",
    ],
    [
      "post/isabelle-submodular-greedy.html?lang=en",
      "A December 2025 project note",
    ],
    ["post/metalcore-piano-lab.html?lang=en", "Metalcore Piano Lab is a structured experiment"],
    ["post/spring-2026.html?lang=en", "A Spring 2026 research note"],
    [
      "post/submodular-greedy-formalization-enters-afp.html?lang=en",
      "A record of the Isabelle/HOL submodular greedy formalization",
    ],
    [
      "post/theorem-to-framework-isabelle-submodular.html?lang=en",
      "The AFP 2026 entry covers classical greedy",
    ],
    [
      "post/what-i-really-got-when-a-dual-route-failed.html?lang=en",
      "What remained after two natural Lagrangian dual routes",
    ],
  ];

  for (const [url, expectedDescriptionStart] of cases) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      new RegExp(`^${expectedDescriptionStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
    );
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      description
    );
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
      "content",
      description
    );
  }

  for (const [url, expectedTitle] of [
    ["academic.html?lang=en", "Academic | Feier Lyu — Optimization & Formal Verification"],
    ["research.html?lang=en", "Research Statement | Feier Lyu"],
    ["projects.html?lang=en", "Selected Work | Feier Lyu"],
    ["cv.html?lang=en", "Academic Profile | Feier Lyu"],
  ]) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(expectedTitle);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      expectedTitle
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      expectedTitle
    );
  }

  await page.goto("photo/blue.html?lang=en", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Blue | Photography | Chronohaze");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Blue | Photography | Chronohaze"
  );
});
