import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public website page content is editable, persisted and rendered", async () => {
  const [migration, schema, settings, workspace, agencySettings, publicSite, publicData, css] = await Promise.all([
    read("../drizzle/0026_public_site_content.sql"),
    read("../db/schema.ts"),
    read("../app/api/settings/route.ts"),
    read("../app/estara-app.tsx"),
    read("../app/agency-settings.tsx"),
    read("../app/site/[slug]/public-website.tsx"),
    read("../db/public-site.ts"),
    read("../app/public-templates.css"),
  ]);

  assert.match(migration, /ADD COLUMN public_content TEXT NOT NULL DEFAULT '\{\}'/);
  assert.match(schema, /publicContent:text\("public_content"\)\.notNull\(\)\.default\("\{\}"\)/);
  assert.match(settings, /safeContent/);
  assert.match(settings, /homeHeroImageId/);
  assert.match(settings, /kind='website_image'/);
  assert.match(settings, /ensurePublicContentColumn/);
  assert.match(settings, /ALTER TABLE agency_settings ADD COLUMN public_content/);
  assert.match(settings, /public_content=\?/);
  assert.match(settings, /invalidatePublicSite\(w\.agencyId\)/);
  assert.match(agencySettings, /Website page content/);
  assert.match(agencySettings, /Website images/);
  assert.match(agencySettings, /Preview public website/);
  assert.match(agencySettings, /contentFields\.map/);
  assert.match(agencySettings, /imageFields\.map/);
  assert.match(agencySettings, /upload\("website_image", key/);
  assert.match(agencySettings, /Save public website content/);
  assert.match(publicSite, /agency\.publicContent/);
  assert.match(publicSite, /homeHeroImageId/);
  assert.match(publicSite, /featuredImageId/);
  assert.match(publicSite, /fallbackImages/);
  assert.match(publicData, /PRAGMA table_info\(agency_settings\)/);
  assert.match(publicData, /contentColumn\?"s\.public_content"/);
  assert.match(publicData, /isWebsiteTemplateKey/);
  assert.match(publicData, /websiteTemplate:isWebsiteTemplateKey\(String\(row\.websiteTemplate/);
  assert.match(publicData, /typography:isTypographyKey\(String\(row\.typography/);
  assert.match(publicSite, /public-agents-shell/);
  assert.match(publicSite, /public-about-story/);
  assert.match(publicSite, /public-process/);
  assert.match(css, /public-copy \.public-trust-strip\{width:100%;margin:30px 0 0\}/);
});
