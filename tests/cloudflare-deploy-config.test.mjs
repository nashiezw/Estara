import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { prepareGeneratedWranglerConfig } from "../scripts/deploy-cloudflare.mjs";

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
  assert.match(deployScript, /const PRODUCTION_D1_DATABASE_NAME = "estara"/);
  assert.match(deployScript, /run\("npm", \["run", "build"\]\);[\s\S]*"d1", "migrations", "apply", PRODUCTION_D1_DATABASE_NAME, "--remote", "--config", GENERATED_WRANGLER_CONFIG/);
  assert.match(deployScript, /"deploy", "--config", GENERATED_WRANGLER_CONFIG/);
  assert.match(deployScript, /migrations_dir: "\.\.\/\.\.\/drizzle"/);
  assert.match(deployScript, /config\.d1_databases = \(config\.d1_databases \?\? \[\]\)\.map/);
  assert.match(deployScript, /validatedProductionVars/);
  assert.match(deployScript, /PRODUCTION_VARS_CONFIG = "config\/cloudflare-production-vars\.json"/);
  assert.match(deployScript, /\*.\$\{publicSiteDomain\}\/\*/);
  assert.match(deployScript, /custom_domain: true/);
  assert.match(deployScript, /zone_name: platformDomain/);
  assert.match(deployScript, /uniqueRoutes/);
  assert.match(deployScript, /prepareGeneratedWranglerConfig\(\)/);
  assert.equal(
    packageJson.scripts["deploy:dry-run"],
    "npm run build && node scripts/deploy-cloudflare.mjs --prepare-only && wrangler deploy --dry-run --outdir .wrangler-dry-run --config dist/server/wrangler.json",
  );
  assert.doesNotMatch(packageJson.scripts.deploy, /npx\s+wrangler\s+deploy/);
});

test("production deploy config owns non-secret vars and rejects secrets in vars", async () => {
  const vars = JSON.parse(await readFile("config/cloudflare-production-vars.json", "utf8"));
  assert.deepEqual(vars, {
    PUBLIC_SITE_DOMAIN: "estara.co.zw",
    MEDIA_BUCKET: "site-creator-r2",
    BACKUP_BUCKET: "estara-backups",
  });

  const dir = await mkdtemp(join(tmpdir(), "estara-wrangler-"));
  const configPath = join(dir, "wrangler.json");
  try {
    await writeFile(configPath, JSON.stringify({
      vars: {},
      routes: [],
      d1_databases: [{ binding: "DB", database_name: "site-creator-d1" }],
      r2_buckets: [{ binding: "MEDIA", bucket_name: "site-creator-r2" }],
    }));
    prepareGeneratedWranglerConfig(configPath);
    const prepared = JSON.parse(await readFile(configPath, "utf8"));
    assert.equal(prepared.d1_databases[0].binding, "DB");
    assert.equal(prepared.d1_databases[0].database_name, "estara");
    assert.equal(prepared.vars.PUBLIC_SITE_DOMAIN, "estara.co.zw");
    assert.equal(prepared.vars.MEDIA_BUCKET, "site-creator-r2");
    assert.equal(prepared.vars.BACKUP_BUCKET, "estara-backups");
    assert.equal(prepared.r2_buckets[0].binding, "MEDIA");
    assert.equal(prepared.r2_buckets[0].bucket_name, "site-creator-r2");

    await writeFile(configPath, JSON.stringify({ vars: { STRIPE_SECRET_KEY: "do-not-commit" }, d1_databases: [] }));
    assert.throws(() => prepareGeneratedWranglerConfig(configPath), /Refusing to write secret-like names to Wrangler vars/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("agency wildcard hostnames are routed as Worker routes, not unsupported wildcard custom domains", async () => {
  const deployScript = await readFile("scripts/deploy-cloudflare.mjs", "utf8");
  const ownerGuide = await readFile("docs/OWNER_SETUP_GUIDE.md", "utf8");

  assert.match(deployScript, /pattern: `\*.\$\{publicSiteDomain\}\/\*`, zone_name: platformDomain/);
  assert.doesNotMatch(deployScript, /pattern: `\*.\$\{publicSiteDomain\}`,\s*custom_domain: true/);
  assert.match(ownerGuide, /Type `AAAA`, Name `\*`, Content `100::`, Proxy status Proxied/);
  assert.match(ownerGuide, /Worker route `\*\.estara\.co\.zw\/\*`/);
});

test("Cloudflare deploy config does not depend on build-time dashboard variables", async () => {
  const deployScript = await readFile("scripts/deploy-cloudflare.mjs", "utf8");
  const viteConfig = await readFile("vite.config.ts", "utf8");

  assert.doesNotMatch(deployScript, /Missing CLOUDFLARE_D1_DATABASE_ID/);
  assert.match(deployScript, /ESTARA_PRODUCTION_DEPLOY/);
  assert.match(viteConfig, /ESTARA_PRODUCTION_D1_DATABASE_ID/);
  assert.match(viteConfig, /ESTARA_PRODUCTION_D1_DATABASE_NAME =\s*"estara"/);
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

test("Cloudflare clean install has optional Rolldown WASI lockfile entries", async () => {
  const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
  const packages = lock.packages || {};

  assert.equal(packages["node_modules/@rolldown/binding-wasm32-wasi"].dependencies["@emnapi/core"], "1.10.0");
  assert.equal(packages["node_modules/@rolldown/binding-wasm32-wasi"].dependencies["@emnapi/runtime"], "1.10.0");
  assert.equal(packages["node_modules/@rolldown/binding-wasm32-wasi/node_modules/@emnapi/core"].version, "1.10.0");
  assert.equal(packages["node_modules/@rolldown/binding-wasm32-wasi/node_modules/@emnapi/runtime"].version, "1.10.0");
  assert.equal(packages["node_modules/@rolldown/binding-wasm32-wasi/node_modules/@emnapi/wasi-threads"].version, "1.2.1");
});

test("late production migrations are safe on partially prepared databases", async () => {
  const [authMigration, accentMigration] = await Promise.all([
    readFile("drizzle/0028_standalone_auth.sql", "utf8"),
    readFile("drizzle/0029_platform_accent_color.sql", "utf8"),
  ]);

  assert.doesNotMatch(authMigration, /CREATE TABLE app_users/);
  assert.match(authMigration, /CREATE TABLE IF NOT EXISTS app_users/);
  assert.match(authMigration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email/);
  assert.doesNotMatch(accentMigration, /ALTER TABLE platform_settings ADD COLUMN accent_color/);
  assert.match(accentMigration, /SELECT 1/);
});
