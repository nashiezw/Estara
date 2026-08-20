import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { WEBSITE_TEMPLATES } from "../db/website-templates.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

function templateBlock(css, key) {
  const matches = [...css.matchAll(new RegExp(`\\.template-${key}[^{}]*\\{[^}]+\\}`, "g"))].map((match) => match[0]);
  return matches.join("\n");
}

test("public website templates keep distinct visual layout signatures", async () => {
  const css = await read("../app/public-templates.css");
  const signatures = new Set();

  for (const template of WEBSITE_TEMPLATES) {
    const block = templateBlock(css, template.key);
    assert.ok(block.length > 500, `${template.key} needs enough custom styling to feel distinct`);
    assert.match(block, /public-(hero|page-hero)/, `${template.key} must style the first viewport`);
    assert.match(block, /public-(grid|card|photo|agents-shell|copy|process)/, `${template.key} must change page body structure`);
    assert.match(block, /public-footer/, `${template.key} must customize the footer experience`);
    assert.doesNotMatch(block, /boring gradient|placeholder|TODO|stock-like/i);

    const signature = [
      /grid-template-columns:[^;}]+/.exec(block)?.[0] || "",
      /background(?:-image)?:[^;}]+/.exec(block)?.[0] || "",
      /border-radius:[^;}]+/.exec(block)?.[0] || "",
      /font-family:[^;}]+/.exec(block)?.[0] || "",
    ].join("|");
    assert.ok(signature.length > 20, `${template.key} needs a measurable visual signature`);
    signatures.add(signature);
  }

  assert.ok(signatures.size >= WEBSITE_TEMPLATES.length - 1, "templates should not collapse into repeated visual signatures");
});

test("public inner pages retain media-led, page-specific structures", async () => {
  const [css, publicSite] = await Promise.all([
    read("../app/public-templates.css"),
    read("../app/site/[slug]/public-website.tsx"),
  ]);

  for (const section of ["properties", "sale", "rent", "agents", "services", "about", "contact"]) {
    assert.match(publicSite, new RegExp(`public-page-hero-\\$\\{section\\}`));
    assert.match(publicSite, new RegExp(`sectionImageSlot\\(section\\)`));
    assert.match(css, new RegExp(`public-inner-${section}`));
  }

  assert.match(publicSite, /public-page-hero-media/);
  assert.match(publicSite, /propertyImage\(agency, properties\[0\], section\.length, sectionImageSlot\(section\)\)/);
  assert.match(css, /public-page-hero-media\.photo-0[\s\S]*url\("/);
  assert.match(css, /public-page-hero-media\.photo-1[\s\S]*url\("/);
  assert.match(css, /public-page-hero-media\.photo-2[\s\S]*url\("/);
});
