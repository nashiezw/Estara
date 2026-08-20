import { spawnSync } from "node:child_process";

const PLACEHOLDER_D1_ID = "00000000-0000-4000-8000-000000000000";

function requireValue(name, help) {
  const value = process.env[name]?.trim();
  if (!value || value === PLACEHOLDER_D1_ID) {
    console.error(`Missing ${name}. ${help}`);
    process.exit(1);
  }
  return value;
}

requireValue(
  "CLOUDFLARE_D1_DATABASE_ID",
  "In Cloudflare, open D1 SQL Database > your ESTARA database > Settings, copy Database ID, then add it as an environment variable.",
);

function run(command, args) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ESTARA_PRODUCTION_DEPLOY: "1" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);
run("wrangler", ["deploy", "--config", "dist/server/wrangler.json"]);
