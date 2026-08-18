import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { safeCsv } from "../db/deal-policy.ts";
import { normalizeEmail, normalizePhone } from "../db/contact-policy.ts";
const read = p => readFile(new URL(p, import.meta.url), "utf8");

test("hostile spreadsheet and identity inputs stay inert", () => {
  for (const value of ["=HYPERLINK(\"https://evil.invalid\")", "+cmd|' /C calc'!A0", "-1+2", "@SUM(1,1)"]) assert.match(safeCsv(value), /^"'/);
  assert.equal(normalizeEmail(" Victim@Example.COM "), "victim@example.com");
  assert.equal(normalizeEmail("victim@example.com\nBcc: attacker@example.com"), "");
  assert.equal(normalizePhone("+263 77 123 4567"), "+263771234567");
  assert.equal(normalizePhone("'; DROP TABLE contacts;--"), "");
});

test("global route boundaries provide loading, safe failure, retry and non-disclosing not-found states", async () => {
  const [loading, error, missing] = await Promise.all([read("../app/loading.tsx"), read("../app/error.tsx"), read("../app/not-found.tsx")]);
  assert.match(loading, /aria-busy/); assert.match(error, /Retry now/); assert.match(error, /saved records are unchanged/i); assert.match(error, /digest/); assert.match(missing, /No private information was revealed/);
});

test("every API write surface imports identity or uses an explicitly public bounded intake", async () => {
  const root = fileURLToPath(new URL("../app/api", import.meta.url));
  async function walk(dir) { const entries = await readdir(dir, { withFileTypes: true }), files = []; for (const entry of entries) { const item = path.join(dir, entry.name); if (entry.isDirectory()) files.push(...await walk(item)); else if (entry.name === "route.ts") files.push(item); } return files; }
  for (const file of await walk(root)) {
    const source = await readFile(file, "utf8");
    if (!/export (async )?function (POST|PATCH|DELETE)|async function (POST|PATCH|DELETE)/.test(source)) continue;
    const publicBounded = /api[\\/]public|public-shortlist/.test(file);
    assert.ok(publicBounded || /getChatGPTUser|requirePlatformUser|requireApiCredential/.test(source), `write route lacks identity boundary: ${file}`);
    if (publicBounded) assert.match(source, /rate|throttle|token|slug/i, `public write lacks bounded intake: ${file}`);
  }
});
