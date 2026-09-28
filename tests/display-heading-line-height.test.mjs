import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("display headings keep safe line spacing across public and product surfaces", async () => {
  const [globalCss, publicCss, adminCss] = await Promise.all([
    readFile("app/globals.css", "utf8"),
    readFile("app/public-templates.css", "utf8"),
    readFile("app/admin/platform-admin.css", "utf8"),
  ]);

  assert.match(globalCss, /body :is\(h1,h2,h3\)\{line-height:1\.08!important\}/);
  assert.match(globalCss, /\.estara-home \.home-hero h1,\.demo-page \.demo-hero h1\{line-height:1\.08!important\}/);
  assert.match(publicCss, /\.public-site :is\(h1,h2,h3\)\{line-height:1\.08!important\}/);
  assert.match(adminCss, /\.platform-admin\.platform-admin-premium :is\(h1,h2,h3\).*line-height:1\.08!important/s);
});
