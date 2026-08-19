import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("production launch evidence register covers every remaining public launch gate", async () => {
  const [register, todo] = await Promise.all([
    read("../docs/PRODUCTION-LAUNCH-EVIDENCE.md"),
    read("../docs/PRODUCTION-READINESS-TODO.md"),
  ]);
  for (const phrase of [
    "Provider activation",
    "Domain and TLS",
    "D1 restore rehearsal",
    "External penetration test",
    "Public access approval",
    "Billing settlement",
    "Low-data hosted measurement",
    "Mobile device audit",
    "First sellable MVP approval",
  ]) {
    assert.match(register, new RegExp(phrase));
  }
  assert.match(register, /Sites project/);
  assert.match(register, /no configured Git remote/);
  assert.match(register, /npm run launch:readiness/);
  assert.match(todo, /Production launch evidence register/);
});
