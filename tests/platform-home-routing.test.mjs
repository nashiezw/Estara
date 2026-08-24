import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("platform home treats first deploy hosts as the ESTARA landing page", async () => {
  const source = await readFile("app/page.tsx", "utf8");
  const domain = await readFile("db/domain.ts", "utf8");

  assert.match(source, /export function isPlatformHost/);
  assert.match(source, /isEstaraPlatformHost\(host, platform\.domain, platform\.tenantDomainSuffix\)/);
  assert.match(domain, /domain\.endsWith\("\.workers\.dev"\)/);
  assert.match(domain, /domain\.endsWith\("\.pages\.dev"\)/);
  assert.match(domain, /!root && !suffix/);
  assert.match(domain, /domain === `www\.\$\{root\}`/);
  assert.match(domain, /domain === `app\.\$\{root\}`/);
  assert.match(source, /function appHref/);
  assert.match(source, /function platformDomainFromHost/);
  assert.match(source, /`https:\/\/app\.\$\{domain\}\$\{cleanPath\}`/);
  assert.match(source, /const publicDomain = platformDomainFromHost\(host, platform\.domain\)/);
  assert.match(source, /const loginHref = appHref\("\/login", publicDomain\)/);
  assert.match(source, /<a href=\{workspaceHref\}>Open workspace<\/a>/);
  assert.match(source, /HomeMobileDrawer/);
  assert.match(source, /platform\.logoUrl/);
  const heroActions = source.match(/<div className="home-actions">([\s\S]*?)<\/div>/)?.[1] || "";
  assert.match(heroActions, /Start your agency setup/);
  assert.match(heroActions, /View demo/);
  assert.doesNotMatch(heroActions, /See how it works<\/a>/);
  assert.doesNotMatch(heroActions, /loginHref/);
  assert.doesNotMatch(source, /from "next\/link"/);
});

test("homepage mobile navigation uses a side drawer and preserves hero hierarchy", async () => {
  const [drawer, styles] = await Promise.all([
    readFile("app/home-mobile-drawer.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(drawer, /useState\(false\)/);
  assert.match(drawer, /document\.body\.style\.overflow = "hidden"/);
  assert.match(drawer, /home-drawer-overlay/);
  assert.match(drawer, /aria-label="Close menu"/);
  assert.match(drawer, /Create account/);
  assert.match(styles, /width:min\(82vw,360px\)/);
  assert.match(styles, /transform:translateX\(102%\)/);
  assert.match(styles, /transition:transform 300ms ease-out/);
  assert.match(styles, /clamp\(32px,8vw,40px\)/);
  assert.match(styles, /\.home-actions\{display:grid!important;grid-template-columns:1fr!important;width:100%;max-width:none\}/);
  assert.match(styles, /\.home-actions a:nth-child\(n\+3\)\{display:none!important\}/);
});

test("homepage sections keep heading, copy and action spacing scoped to the landing page", async () => {
  const styles = await readFile("app/globals.css", "utf8");

  assert.match(styles, /\.estara-home :is\(\.home-hero-copy,\.home-today>div:first-child/);
  assert.match(styles, /gap:clamp\(14px,2vw,24px\)/);
  assert.match(styles, /\.estara-home :is\(\.home-hero-copy,\.home-today,\.home-reuse,\.home-workflow,\.home-websites\) :is\(\.home-kicker,h1,h2,p\)\{margin:0\}/);
  assert.match(styles, /\.estara-home \.home-workflow li\{min-height:126px;padding:22px;align-content:start;gap:34px\}/);
  assert.doesNotMatch(styles, /:where\(\.estara-home/);
});

test("public pages expose mobile menus and demo app links use the app host", async () => {
  const [publicWebsite, demo, demoClient, styles] = await Promise.all([
    readFile("app/site/[slug]/public-website.tsx", "utf8"),
    readFile("app/demo/page.tsx", "utf8"),
    readFile("app/demo/demo-client.tsx", "utf8"),
    readFile("app/public-templates.css", "utf8"),
  ]);

  assert.match(publicWebsite, /public-mobile-menu/);
  assert.match(styles, /public-mobile-menu/);
  assert.match(demo, /const loginHref = appHref\("\/login", publicDomain\)/);
  assert.match(demo, /const registerHref = appHref\("\/register", publicDomain\)/);
  assert.match(demo, /DemoExperience/);
  assert.match(demoClient, /Safe sample data only/);
  assert.match(demoClient, /Start your real workspace/);
  assert.match(demoClient, /navigator\.clipboard/);
});

test("public host lookup is safe before D1 migrations have run", async () => {
  const source = await readFile("db/public-site.ts", "utf8");

  assert.match(source, /hasTable\(env,"custom_domains"\)/);
  assert.match(source, /catch{return null}/);
});
