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
  assert.match(publicSite, /Your next property move, handled with care/);
  assert.match(publicSite, /public-footer-actions/);
  assert.match(publicSite, /public-footer-proof/);
  assert.match(publicSite, /Verified listings/);
  assert.match(publicSite, /public-footer-nav/);
  assert.match(publicSite, /aria-label="Footer navigation"/);
  assert.match(publicSite, /public-footer-services/);
  assert.match(publicSite, /public-footer-contact/);
  assert.match(publicSite, /public-footer-bottom/);
  assert.match(publicSite, /agency\.businessActivities\.slice\(0, 5\)/);
  assert.match(publicSite, /agency\.poweredByWording/);
  assert.match(publicSite, /footerLogoId/);
  assert.match(publicSite, /footerIconId/);
  assert.match(publicSite, /footerLogo \|\| \(agency\.logoId \? mediaUrl\(agency, agency\.logoId\) : ""\)/);
  assert.match(publicSite, /footerIcon \|\| \(agency\.iconId \? mediaUrl\(agency, agency\.iconId\) : ""\)/);
  assert.match(publicSite, /public-brand-dark-asset/);
  assert.match(publicSite, /public-brand-light-fallback/);

  assert.match(css, /\.public-footer\{position:relative/);
  assert.match(css, /\.public-footer-brand/);
  assert.match(css, /\.public-footer-actions/);
  assert.match(css, /\.public-footer-proof/);
  assert.match(css, /\.public-footer-nav/);
  assert.match(css, /\.public-footer-services/);
  assert.match(css, /\.public-footer-contact/);
  assert.match(css, /\.public-footer-bottom/);
  assert.match(css, /\.template-modern \.public-footer/);
  assert.match(css, /\.template-editorial \.public-footer/);
  assert.match(css, /\.template-skyline \.public-footer/);
  assert.match(css, /\.template-boutique \.public-footer/);
  assert.match(css, /\.template-estate \.public-footer/);
  assert.match(css, /\.template-coastal \.public-footer/);
  assert.match(css, /\.template-portfolio \.public-footer/);
  assert.match(css, /\.public-footer-mark\{padding:0!important;border:0!important;background:transparent!important/);
  assert.match(css, /\.public-footer-mark \.public-brand-icon\{width:58px!important;height:58px!important;padding:0!important;border-radius:0!important;background:transparent!important/);
  assert.match(css, /\.public-footer-mark \.public-brand-logo\{height:38px!important;max-width:250px!important;padding:0!important/);
  assert.match(css, /\.public-footer-mark \.public-brand-dark-asset\{background:transparent!important/);
  assert.match(css, /\.public-footer-mark \.public-brand-light-fallback\{background:#fff!important;border-radius:8px!important;padding:6px!important/);
  assert.match(css, /\.public-footer\{grid-template-columns:minmax\(300px,1\.02fr\)/);
  assert.match(css, /\.public-footer h2\{max-width:520px!important;margin:24px 0 12px!important;font:clamp\(30px,3\.4vw,48px\)\/1\.02 Georgia,serif!important/);
  assert.match(css, /\.public-footer-nav a,\.public-footer-services span,\.public-footer-contact a\{min-height:43px!important/);
});
