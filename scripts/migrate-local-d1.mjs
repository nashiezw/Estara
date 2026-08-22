import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CONFIG_PATH = ".wrangler-local-d1.jsonc";
const LOCAL_CONFIG_HOME = ".wrangler-config";
const DATABASE_NAME = "site-creator-d1";
const DATABASE_ID = process.env.ESTARA_LOCAL_D1_DATABASE_ID || "e4fec45c-a64d-45f7-a056-58c19e6f34db";

function run(command, args) {
  const result = spawnSync(command, args, {
    env: {
      ...process.env,
      XDG_CONFIG_HOME: resolve(LOCAL_CONFIG_HOME),
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  mkdirSync(LOCAL_CONFIG_HOME, { recursive: true });
  writeFileSync(
    CONFIG_PATH,
    `${JSON.stringify({
      name: "estara-local-preview",
      compatibility_date: "2026-05-15",
      compatibility_flags: ["nodejs_compat"],
      d1_databases: [
        {
          binding: "DB",
          database_name: DATABASE_NAME,
          database_id: DATABASE_ID,
          migrations_dir: "drizzle",
        },
      ],
    }, null, 2)}\n`,
  );

  try {
    run("wrangler", ["d1", "migrations", "apply", DATABASE_NAME, "--local", "--config", CONFIG_PATH]);
  } finally {
    if (existsSync(CONFIG_PATH)) rmSync(CONFIG_PATH);
  }
}

main();
