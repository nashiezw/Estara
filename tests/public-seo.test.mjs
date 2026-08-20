import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public agency pages expose premium metadata and structured data", async () => {
  const [home, section, property, seo] = await Promise.all([
    read("../app/site/[slug]/page.tsx"),
    read("../app/site/[slug]/[section]/page.tsx"),
    read("../app/site/[slug]/properties/[id]/page.tsx"),
    read("../db/public-seo.ts"),
  ]);

  assert.match(seo, /RealEstateAgent/);
  assert.match(seo, /Residence/);
  assert.match(seo, /safeJsonLd/);
  assert.match(seo, /sectionDescription/);
  assert.match(seo, /propertyDescription/);

  assert.match(home, /agencyJsonLd/);
  assert.match(home, /application\/ld\+json/);
  assert.match(home, /openGraph/);
  assert.match(home, /twitter/);
  assert.match(home, /alternates:\{canonical:url\}/);

  assert.match(section, /sectionTitle\(section, agency\)/);
  assert.match(section, /sectionDescription\(section, agency\)/);
  assert.match(section, /openGraph/);
  assert.match(section, /twitter/);
  assert.match(section, /robots: \{ index: true, follow: true \}/);

  assert.match(property, /propertyJsonLd/);
  assert.match(property, /propertyDescription\(property,agency\)/);
  assert.match(property, /application\/ld\+json/);
  assert.match(property, /openGraph/);
  assert.match(property, /twitter:\{card:"summary_large_image"/);
  assert.match(property, /robots:\{index:true,follow:true\}/);
});
