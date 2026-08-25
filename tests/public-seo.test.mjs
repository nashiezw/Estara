import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public agency pages expose premium metadata and structured data", async () => {
  const [home, root, section, property, seo, layout, manifest, favicon, touchIcon, robots, sitemap, workspace, workspaceApi] = await Promise.all([
    read("../app/site/[slug]/page.tsx"),
    read("../app/page.tsx"),
    read("../app/site/[slug]/[section]/page.tsx"),
    read("../app/site/[slug]/properties/[id]/page.tsx"),
    read("../db/public-seo.ts"),
    read("../app/layout.tsx"),
    read("../app/manifest.webmanifest/route.ts"),
    read("../app/favicon.ico/route.ts"),
    read("../app/apple-touch-icon.png/route.ts"),
    read("../app/robots.txt/route.ts"),
    read("../app/sitemap.xml/route.ts"),
    read("../app/estara-app.tsx"),
    read("../app/api/workspace/route.ts"),
  ]);

  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(layout, /platformIconUrl/);
  assert.match(layout, /platform\.iconUrl/);
  assert.match(layout, /metadataBase: new URL\(origin\)/);
  assert.match(manifest, /platformIconUrl/);
  assert.match(manifest, /application\/manifest\+json/);
  assert.match(favicon, /platform\/brand\/icon\.webp/);
  assert.match(favicon, /platform\/brand\/dark-icon\.webp/);
  assert.match(touchIcon, /favicon\.ico\/route/);
  assert.match(robots, /Disallow: \$\{path\}/);
  assert.match(robots, /Sitemap: \$\{origin\}\/sitemap\.xml/);
  assert.match(sitemap, /agencyEntries/);
  assert.match(sitemap, /\/site\/\$\{encodeURIComponent\(agency\.slug\)\}/);
  assert.match(workspaceApi, /menuCounts:\{enquiries:activeEnquiryCount/);
  assert.match(workspaceApi, /visibleEnquiries\.filter/);
  assert.doesNotMatch(workspace, /n\[0\]==="enquiries"&&<b>3<\/b>/);
  assert.match(workspace, /setMenuCounts\(data\.menuCounts/);
  assert.match(workspace, /navCount\(n\[0\]\)>0&&<b>\{navCount\(n\[0\]\)\}<\/b>/);

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
