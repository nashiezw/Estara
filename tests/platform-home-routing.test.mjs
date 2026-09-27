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
  assert.match(source, /Stop renting shelf space on someone else&apos;s portal/);
  assert.match(source, /Your agency&apos;s own front door/);
  assert.match(source, /your own branded website, your marketing and a system where no enquiry goes cold/);
  assert.match(source, /Own your agency brand/);
  assert.match(source, /Nothing goes cold/);
  assert.match(source, /One property, zero retyping/);
  assert.match(source, /Your own branded website, not a listing lost inside someone else's marketplace/);
  assert.match(source, /Other portals put your listing next to your competitors/);
  assert.match(source, /Your first week/);
  assert.match(source, /Set up your agency, add your first property and go live/);
  assert.match(source, /all in your first sitting/);
  assert.doesNotMatch(source, /First success moment|first sellable|experience should take|A property should not be retyped|Your buyers should remember/i);
  assert.doesNotMatch(source, /Real estate operating system|Run your real estate agency from one place/);
  assert.match(heroActions, /See \{platform\.shortName\} in action/);
  assert.match(heroActions, /Start your agency setup/);
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

test("homepage hero balances agency messaging and product proof in two columns", async () => {
  const styles = await readFile("app/globals.css", "utf8");

  assert.match(styles, /\.estara-home \.home-hero\{[^}]*grid-template-columns:minmax\(0,1\.05fr\) minmax\(480px,\.95fr\)/);
  assert.match(styles, /\.estara-home \.home-hero-copy\{width:100%;max-width:760px\}/);
  assert.match(styles, /\.estara-home \.home-command\{width:100%;max-width:620px;justify-self:end\}/);
  assert.match(styles, /\.estara-home \.home-command-list\{display:grid\}/);
  assert.match(styles, /\.estara-home \.home-command-grid b\{font-family:var\(--font\),Arial,sans-serif/);
  assert.match(styles, /\.estara-home \.home-actions a:last-child\{border-color:#93a69f/);
  assert.match(styles, /\.estara-home \.home-kicker\{color:#0a7469/);
  assert.match(styles, /@media\(max-width:1100px\)\{\.estara-home \.home-hero\{min-height:auto;grid-template-columns:1fr\}/);
});

test("homepage story sections use compact hierarchy without changing the approved closing band", async () => {
  const styles = await readFile("app/globals.css", "utf8");

  assert.match(styles, /:is\(\.home-today,\.home-reuse,\.home-workflow,\.home-websites\) h2\{max-width:720px;font-size:clamp\(44px,4\.6vw,66px\)/);
  assert.match(styles, /\.estara-home \.home-today-list\{gap:0;border:1px solid var\(--home-line\);border-radius:8px;overflow:hidden/);
  assert.match(styles, /\.estara-home \.home-reuse-map strong\{min-height:84px;border-radius:8px;font-family:var\(--font\),Arial,sans-serif/);
  assert.match(styles, /\.estara-home \.home-promises article:nth-child\(3\)\{border-top-color:var\(--home-coral\)\}/);
  assert.match(styles, /\.estara-home \.home-workflow li\{min-height:108px;padding:20px;gap:24px\}/);
  assert.match(styles, /\.estara-home \.home-websites aside a:first-child\{background:var\(--home-forest\)/);
  const refinement = styles.match(/\.estara-home :is\(\.home-today,\.home-reuse,\.home-workflow,\.home-websites\)\{[\s\S]*?(?=\n@media\(max-width:760px\))/)?.[0] || "";
  assert.doesNotMatch(refinement, /home-final|home-footer/);
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
