import { spawnSync } from "node:child_process";

const PLACEHOLDER_D1_ID = "00000000-0000-4000-8000-000000000000";

function firstConfiguredValue(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return { name: names[0], value: "" };
}

function requireValue(names, help) {
  const { name, value } = firstConfiguredValue(names);
  if (!value || value === PLACEHOLDER_D1_ID) {
    console.error(`Missing ${names.join(" or ")}. ${help}`);
    process.exit(1);
  }
  if (name !== names[0]) {
    console.log(`Using ${name}. ${names[0]} is the preferred variable name.`);
  }
  return value;
}

requireValue(
  ["CLOUDFLARE_D1_DATABASE_ID", "CLOUDFLARE_DATABASE_ID"],
  "In Cloudflare, open D1 SQL Database > your ESTARA database > Settings, copy Database ID, then add it as CLOUDFLARE_D1_DATABASE_ID.",
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
