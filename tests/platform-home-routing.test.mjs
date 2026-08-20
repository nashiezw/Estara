import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("platform home treats first deploy hosts as the ESTARA landing page", async () => {
  const source = await readFile("app/page.tsx", "utf8");

  assert.match(source, /export function isPlatformHost/);
  assert.match(source, /domain\.endsWith\("\.workers\.dev"\)/);
  assert.match(source, /domain\.endsWith\("\.pages\.dev"\)/);
  assert.match(source, /!platformDomain && !tenantSuffix/);
  assert.match(source, /domain === `www\.\$\{platformDomain\}`/);
  assert.match(source, /domain === `app\.\$\{platformDomain\}`/);
  assert.match(source, /function appHref/);
  assert.match(source, /function platformDomainFromHost/);
  assert.match(source, /`https:\/\/app\.\$\{domain\}\$\{cleanPath\}`/);
  assert.match(source, /const publicDomain = platformDomainFromHost\(host, platform\.domain\)/);
  assert.match(source, /const loginHref = appHref\("\/login", publicDomain\)/);
  assert.match(source, /<a href=\{workspaceHref\}>Open workspace<\/a>/);
  assert.match(source, /home-mobile-menu/);
  assert.match(source, /platform\.logoUrl/);
  assert.doesNotMatch(source, /from "next\/link"/);
});

test("public pages expose mobile menus and demo app links use the app host", async () => {
  const [publicWebsite, demo, styles] = await Promise.all([
    readFile("app/site/[slug]/public-website.tsx", "utf8"),
    readFile("app/demo/page.tsx", "utf8"),
    readFile("app/public-templates.css", "utf8"),
  ]);

  assert.match(publicWebsite, /public-mobile-menu/);
  assert.match(styles, /public-mobile-menu/);
  assert.match(demo, /const loginHref = appHref\("\/login", publicDomain\)/);
  assert.match(demo, /const registerHref = appHref\("\/register", publicDomain\)/);
  assert.match(demo, /platform\.logoUrl/);
});

test("public host lookup is safe before D1 migrations have run", async () => {
  const source = await readFile("db/public-site.ts", "utf8");

  assert.match(source, /hasTable\(env,"custom_domains"\)/);
  assert.match(source, /catch{return null}/);
});
