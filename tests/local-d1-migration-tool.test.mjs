import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("local D1 migration helper prepares the same preview database used by dev", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const script = readFileSync("scripts/migrate-local-d1.mjs", "utf8");

  assert.equal(packageJson.scripts["dev:migrate"], "node scripts/migrate-local-d1.mjs");
  assert.match(script, /DATABASE_NAME = "site-creator-d1"/);
  assert.match(script, /e4fec45c-a64d-45f7-a056-58c19e6f34db/);
  assert.match(script, /ESTARA_LOCAL_D1_DATABASE_ID/);
  assert.match(script, /XDG_CONFIG_HOME: resolve\(LOCAL_CONFIG_HOME\)/);
  assert.match(script, /migrations_dir: "drizzle"/);
  assert.match(script, /"d1", "migrations", "apply", DATABASE_NAME, "--local", "--config", CONFIG_PATH/);
  assert.match(script, /rmSync\(CONFIG_PATH\)/);
});
