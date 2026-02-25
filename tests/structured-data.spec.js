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

  const types = new Set();
  collectTypes(parsed["@graph"], types);
  return { parsed, types };
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
