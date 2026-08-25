import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public agency pages expose premium metadata and structured data", async () => {
  const [home, root, section, property, seo, layout, manifest, robots, sitemap] = await Promise.all([
    read("../app/site/[slug]/page.tsx"),
    read("../app/page.tsx"),
    read("../app/site/[slug]/[section]/page.tsx"),
    read("../app/site/[slug]/properties/[id]/page.tsx"),
    read("../db/public-seo.ts"),
    read("../app/layout.tsx"),
    read("../app/manifest.webmanifest/route.ts"),
    read("../app/robots.txt/route.ts"),
    read("../app/sitemap.xml/route.ts"),
  ]);

  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(layout, /platformIconUrl/);
  assert.match(layout, /metadataBase: new URL\(origin\)/);
  assert.match(manifest, /platformIconUrl/);
  assert.match(manifest, /application\/manifest\+json/);
  assert.match(robots, /Disallow: \$\{path\}/);
  assert.match(robots, /Sitemap: \$\{origin\}\/sitemap\.xml/);
  assert.match(sitemap, /agencyEntries/);
  assert.match(sitemap, /\/site\/\$\{encodeURIComponent\(agency\.slug\)\}/);

  assert.match(seo, /RealEstateAgent/);
  assert.match(seo, /WebSite/);
  assert.match(seo, /Residence/);
  assert.match(seo, /safeJsonLd/);
  assert.match(seo, /platformOrigin/);
  assert.match(seo, /platformIconUrl/);
  assert.match(seo, /sectionDescription/);
  assert.match(seo, /propertyDescription/);

  assert.match(home, /agencyJsonLd/);
  assert.match(home, /agencyWebsiteJsonLd/);
  assert.match(home, /application\/ld\+json/);
  assert.match(home, /openGraph/);
  assert.match(home, /twitter/);
  assert.match(home, /alternates:\{canonical:url\}/);

  assert.match(root, /export async function generateMetadata/);
  assert.match(root, /getPublicAgencyByHost/);
  assert.match(root, /agencyWebsiteJsonLd/);
  assert.match(root, /pathMode="clean"/);
  assert.match(root, /icons: \{ icon, apple: icon \}/);

  assert.match(section, /sectionTitle\(section, agency\)/);
  assert.match(section, /sectionDescription\(section, agency\)/);
  assert.match(section, /agencyJsonLd/);
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
