import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("local preview smoke tool checks workspace and seeded public website routes", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const script = readFileSync("scripts/smoke-local-preview.mjs", "utf8");

  assert.equal(packageJson.scripts["dev:smoke"], "node scripts/smoke-local-preview.mjs");
  assert.match(script, /ESTARA_LOCAL_PREVIEW_URL/);
  assert.match(script, /http:\/\/localhost:3004/);
  for (const path of [
    "/api/workspace",
    "/api/settings",
    "/workspace",
    "/site/prime-property",
    "/site/prime-property/properties",
    "/site/prime-property/about",
    "/site/prime-property/contact",
  ]) {
    assert.match(script, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(script, /Prime Property/);
  assert.match(script, /Borrowdale Residence/);
  assert.match(script, /WhatsApp/);
  assert.match(script, /Run `npm run dev:migrate` first/);
});
