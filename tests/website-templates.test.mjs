import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { WEBSITE_TEMPLATES, isWebsiteTemplateKey, typographyForTemplate } from "../db/website-templates.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("agency website templates are numerous, curated and selectable end to end", async () => {
  const [catalogue, onboarding, settings, app, publicSite, propertyPage, css] = await Promise.all([
    read("../db/website-templates.ts"),
    read("../app/api/onboarding/route.ts"),
    read("../app/api/settings/route.ts"),
    read("../app/estara-app.tsx"),
    read("../app/site/[slug]/public-website.tsx"),
    read("../app/site/[slug]/properties/[id]/page.tsx"),
    read("../app/public-templates.css"),
  ]);

  assert.ok(WEBSITE_TEMPLATES.length >= 8);
  for (const template of WEBSITE_TEMPLATES) {
    assert.equal(isWebsiteTemplateKey(template.key), true);
    assert.match(catalogue, new RegExp(`key: "${template.key}"`));
    assert.match(css, new RegExp(`template-${template.key}`));
  }

  assert.equal(typographyForTemplate("skyline"), "modern");
  assert.equal(typographyForTemplate("boutique"), "editorial");
  assert.match(onboarding, /isWebsiteTemplateKey\(template\)/);
  assert.match(settings, /website_template=\?/);
  assert.match(settings, /invalidatePublicSite\(w\.agencyId\)/);
  assert.match(app, /WEBSITE_TEMPLATES\.map/);
  assert.match(app, /Website template<select/);
  assert.match(publicSite, /template-\$\{agency\.websiteTemplate\}/g);
  assert.match(publicSite, /public-layout-\$\{agency\.websiteTemplate\}/g);
  assert.match(publicSite, /public-feature-photo photo-\$\{properties\.length % 3\}/);
  assert.match(propertyPage, /template-\$\{agency\.websiteTemplate\}/);
  assert.match(propertyPage, /public-layout-\$\{agency\.websiteTemplate\}/);
  assert.match(publicSite, /public-templates\.css/);
});

test("website templates restyle the full public site journey, not only the home page", async () => {
  const css = await read("../app/public-templates.css");
  const pageSelectors = [
    "public-page-hero",
    "public-grid",
    "public-card",
    "public-agents-shell",
    "public-contact-shell",
    "public-property-hero",
    "public-property-body",
    "public-footer",
  ];

  assert.match(css, /SITE-WIDE TEMPLATE EXPERIENCE PACKS/);
  assert.match(css, /DISTINCT TEMPLATE LAYOUT MATRIX/);
  assert.match(css, /VISUAL STRUCTURE REPAIR/);
  assert.match(css, /INNER TEMPLATE REPAIR/);
  assert.match(css, /PUBLIC FOOTER EXPERIENCE/);
  assert.match(css, /public-template-rail/);
  assert.match(css, /public-footer-brand/);
  assert.match(css, /public-footer-actions/);
  assert.match(css, /public-page-hero-media\.photo-0[\s\S]*url\("/);
  assert.match(css, /public-feature-photo\.photo-0[\s\S]*url\("/);
  assert.match(css, /template-modern \.public-page-hero[\s\S]*url\("/);
  assert.match(css, /template-modern \.public-copy-services/);
  assert.match(css, /template-editorial \.public-inner\{display:block/);
  assert.match(css, /template-skyline \.public-process\{display:grid/);
  assert.match(css, /template-estate \.public-inner-properties \.public-grid/);
  assert.match(css, /template-coastal \.public-agents-shell\{display:grid/);
  assert.match(css, /template-classic \.public-inner-agents \.public-agents-shell\{display:block/);
  for (const template of WEBSITE_TEMPLATES) {
    for (const selector of pageSelectors) {
      assert.match(css, new RegExp(`\\.template-${template.key}[^{]*\\.${selector}`));
    }
    for (const section of ["properties", "agents", "services", "about", "contact"]) {
      assert.match(css, new RegExp(`\\.template-${template.key}[^{]*\\.public-inner-${section}`));
    }
  }
});
