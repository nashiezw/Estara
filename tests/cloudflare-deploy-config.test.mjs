import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function parseJsonc(source) {
  return JSON.parse(source.replace(/^\s*\/\/.*$/gm, ""));
}

test("Cloudflare deploy command uses the generated Vinext Worker config", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(
    packageJson.scripts.deploy,
    "npm run build && wrangler deploy --config dist/server/wrangler.json",
  );
  assert.equal(
    packageJson.scripts["deploy:dry-run"],
    "npm run build && wrangler deploy --dry-run --outdir .wrangler-dry-run --config dist/server/wrangler.json",
  );
  assert.doesNotMatch(packageJson.scripts.deploy, /npx\s+wrangler\s+deploy/);
});

test("root Wrangler config prevents non-interactive setup prompts", async () => {
  const config = parseJsonc(await readFile("wrangler.jsonc", "utf8"));

  assert.equal(config.name, "estara");
  assert.equal(config.main, "dist/server/index.js");
  assert.equal(config.assets.directory, "dist/client");
  assert.equal(config.build, undefined);
  assert.deepEqual(config.compatibility_flags, ["nodejs_compat"]);
  assert.equal(config.observability.enabled, true);
});

test("Cloudflare build allows every esbuild version seen in install and deploy logs", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  for (const version of ["0.18.20", "0.25.12", "0.27.3", "0.28.0", "0.28.1"]) {
    assert.equal(packageJson.allowScripts[`esbuild@${version}`], true);
  }
});
