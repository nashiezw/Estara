import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public websites provide keyboard skip links and labelled navigation", async () => {
  const [publicSite, propertyPage, css] = await Promise.all([
    read("../app/site/[slug]/public-website.tsx"),
    read("../app/site/[slug]/properties/[id]/page.tsx"),
    read("../app/public-templates.css"),
  ]);

  assert.match(publicSite, /className="public-skip"/);
  assert.match(publicSite, /href="#main-content"/);
  assert.match(publicSite, /aria-label="Primary navigation"/);
  assert.match(publicSite, /<main id="main-content"/g);
  assert.match(publicSite, /tabIndex=\{-1\}/g);
  assert.match(propertyPage, /<main id="main-content"/);
  assert.match(propertyPage, /tabIndex=\{-1\}/);

  assert.match(css, /\.public-skip/);
  assert.match(css, /\.public-skip:focus/);
  assert.match(css, /outline:3px solid #fff/);
});
