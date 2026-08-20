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
  assert.doesNotMatch(source, /from "next\/link"/);
});

test("public host lookup is safe before D1 migrations have run", async () => {
  const source = await readFile("db/public-site.ts", "utf8");

  assert.match(source, /hasTable\(env,"custom_domains"\)/);
  assert.match(source, /catch{return null}/);
});
