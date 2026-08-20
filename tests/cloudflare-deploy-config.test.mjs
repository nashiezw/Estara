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
    "node scripts/deploy-cloudflare.mjs",
  );
  const deployScript = await readFile("scripts/deploy-cloudflare.mjs", "utf8");
  assert.match(deployScript, /const GENERATED_WRANGLER_CONFIG = "dist\/server\/wrangler\.json"/);
  assert.match(deployScript, /run\("npm", \["run", "build"\]\);[\s\S]*"d1", "migrations", "apply", "site-creator-d1", "--remote", "--config", GENERATED_WRANGLER_CONFIG/);
  assert.match(deployScript, /"deploy", "--config", GENERATED_WRANGLER_CONFIG/);
  assert.match(deployScript, /migrations_dir: "\.\.\/\.\.\/drizzle"/);
  assert.match(deployScript, /config\.d1_databases = \(config\.d1_databases \?\? \[\]\)\.map/);
  assert.match(deployScript, /prepareGeneratedWranglerConfig\(\)/);
  assert.equal(
    packageJson.scripts["deploy:dry-run"],
    "npm run build && wrangler deploy --dry-run --outdir .wrangler-dry-run --config dist/server/wrangler.json",
  );
  assert.doesNotMatch(packageJson.scripts.deploy, /npx\s+wrangler\s+deploy/);
});

test("Cloudflare deploy config does not depend on build-time dashboard variables", async () => {
  const deployScript = await readFile("scripts/deploy-cloudflare.mjs", "utf8");
  const viteConfig = await readFile("vite.config.ts", "utf8");

  assert.doesNotMatch(deployScript, /Missing CLOUDFLARE_D1_DATABASE_ID/);
  assert.match(deployScript, /ESTARA_PRODUCTION_DEPLOY/);
  assert.match(viteConfig, /ESTARA_PRODUCTION_D1_DATABASE_ID/);
  assert.match(viteConfig, /e4fec45c-a64d-45f7-a056-58c19e6f34db/);
  assert.match(viteConfig, /process\.env\.CLOUDFLARE_D1_DATABASE_ID/);
  assert.match(viteConfig, /process\.env\.CLOUDFLARE_DATABASE_ID/);
  assert.doesNotMatch(viteConfig, /database_id:\s*SITE_CREATOR_PLACEHOLDER_DATABASE_ID/);
  assert.doesNotMatch(viteConfig, /compatibility_flags:\s*\["nodejs_compat"\]/);
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
