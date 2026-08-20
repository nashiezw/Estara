import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public footer is a premium agency conversion footer, not a plain contact strip", async () => {
  const [publicSite, css] = await Promise.all([
    read("../app/site/[slug]/public-website.tsx"),
    read("../app/public-templates.css"),
  ]);

  assert.match(publicSite, /aria-label="Agency website footer"/);
  assert.match(publicSite, /public-footer-brand/);
  assert.match(publicSite, /public-footer-mark/);
  assert.match(publicSite, /Ready for a clearer property move/);
  assert.match(publicSite, /public-footer-actions/);
  assert.match(publicSite, /public-footer-nav/);
  assert.match(publicSite, /aria-label="Footer navigation"/);
  assert.match(publicSite, /public-footer-services/);
  assert.match(publicSite, /public-footer-contact/);
  assert.match(publicSite, /agency\.businessActivities\.slice\(0, 5\)/);
  assert.match(publicSite, /agency\.poweredByWording/);

  assert.match(css, /\.public-footer\{position:relative/);
  assert.match(css, /\.public-footer-brand/);
  assert.match(css, /\.public-footer-actions/);
  assert.match(css, /\.public-footer-nav/);
  assert.match(css, /\.public-footer-services/);
  assert.match(css, /\.public-footer-contact/);
  assert.match(css, /\.template-modern \.public-footer/);
  assert.match(css, /\.template-editorial \.public-footer/);
  assert.match(css, /\.template-skyline \.public-footer/);
  assert.match(css, /\.template-boutique \.public-footer/);
  assert.match(css, /\.template-estate \.public-footer/);
  assert.match(css, /\.template-coastal \.public-footer/);
  assert.match(css, /\.template-portfolio \.public-footer/);
});
