import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GENERATED_WRANGLER_CONFIG = "dist/server/wrangler.json";
const PRODUCTION_VARS_CONFIG = "config/cloudflare-production-vars.json";
const SECRET_VAR_NAMES = new Set([
  "BACKUP_ENCRYPTION_KEY",
  "CLOUDFLARE_API_TOKEN",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "FCM_PRIVATE_KEY",
  "SENTRY_AUTH_TOKEN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
]);
const REQUIRED_PRODUCTION_VARS = ["PUBLIC_SITE_DOMAIN", "MEDIA_BUCKET", "BACKUP_BUCKET"];

function run(command, args) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ESTARA_PRODUCTION_DEPLOY: "1" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  if (process.argv.includes("--prepare-only")) {
    prepareGeneratedWranglerConfig();
    return;
  }

  run("npm", ["run", "build"]);
  prepareGeneratedWranglerConfig();
  run("wrangler", ["d1", "migrations", "apply", "site-creator-d1", "--remote", "--config", GENERATED_WRANGLER_CONFIG]);
  run("wrangler", ["deploy", "--config", GENERATED_WRANGLER_CONFIG]);
}

export function prepareGeneratedWranglerConfig(configPath = GENERATED_WRANGLER_CONFIG) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const productionVars = productionVarsFromConfig(PRODUCTION_VARS_CONFIG);
  const platformDomain = cleanHost(process.env.ESTARA_PLATFORM_DOMAIN || "estara.co.zw");
  const appHost = cleanHost(process.env.ESTARA_APP_HOST || (platformDomain ? `app.${platformDomain}` : ""));
  const publicSiteDomain = cleanHost(productionVars.PUBLIC_SITE_DOMAIN || process.env.PUBLIC_SITE_DOMAIN || platformDomain || "estara.co.zw");

  config.d1_databases = (config.d1_databases ?? []).map((database) => {
    if (database.binding !== "DB" && database.database_name !== "site-creator-d1") {
      return database;
    }

    return { ...database, migrations_dir: "../../drizzle" };
  });
  config.vars = validatedProductionVars({ ...(config.vars ?? {}), ...productionVars, PUBLIC_SITE_DOMAIN: publicSiteDomain });
  config.routes = uniqueRoutes([
    ...(config.routes ?? []),
    ...(platformDomain ? [{ pattern: platformDomain, custom_domain: true }, { pattern: `www.${platformDomain}`, custom_domain: true }] : []),
    ...(appHost ? [{ pattern: appHost, custom_domain: true }] : []),
    ...(platformDomain && publicSiteDomain ? [{ pattern: `*.${publicSiteDomain}/*`, zone_name: platformDomain }] : []),
  ]);
  writeFileSync(configPath, `${JSON.stringify(config)}\n`);
}

function productionVarsFromConfig(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value ?? "").trim()]));
}

function validatedProductionVars(vars) {
  const secretNames = Object.keys(vars).filter((name) => SECRET_VAR_NAMES.has(name) || /(?:SECRET|TOKEN|PRIVATE_KEY|API_KEY|WEBHOOK_SECRET|PASSWORD)$/i.test(name));
  if (secretNames.length) {
    throw new Error(`Refusing to write secret-like names to Wrangler vars: ${secretNames.join(", ")}. Store them with Cloudflare secrets instead.`);
  }

  const missing = REQUIRED_PRODUCTION_VARS.filter((name) => !String(vars[name] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required non-secret production Wrangler vars: ${missing.join(", ")}. Update ${PRODUCTION_VARS_CONFIG} before deploying.`);
  }

  return vars;
}

function cleanHost(value) {
  return String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^\*\./, "").replace(/^\.+|\.+$/g, "");
}

function uniqueRoutes(routes) {
  const seen = new Set();
  return routes.filter((route) => {
    const key = `${route.pattern || ""}|${route.zone_name || ""}|${route.custom_domain || ""}`;
    if (!route.pattern || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
