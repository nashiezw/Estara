import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("platform home treats first deploy hosts as the ESTARA landing page", async () => {
  const source = await readFile("app/page.tsx", "utf8");

  assert.match(source, /export function isPlatformHost/);
  assert.match(source, /domain\.endsWith\("\.workers\.dev"\)/);
  assert.match(source, /domain\.endsWith\("\.pages\.dev"\)/);
  assert.match(source, /!platformDomain && !tenantSuffix/);
});

test("public host lookup is safe before D1 migrations have run", async () => {
  const source = await readFile("db/public-site.ts", "utf8");

  assert.match(source, /hasTable\(env,"custom_domains"\)/);
  assert.match(source, /catch{return null}/);
});
