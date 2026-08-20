import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const GENERATED_WRANGLER_CONFIG = "dist/server/wrangler.json";

function run(command, args) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ESTARA_PRODUCTION_DEPLOY: "1" },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  run("npm", ["run", "build"]);
  prepareGeneratedWranglerConfig();
  run("wrangler", ["d1", "migrations", "apply", "site-creator-d1", "--remote", "--config", GENERATED_WRANGLER_CONFIG]);
  run("wrangler", ["deploy", "--config", GENERATED_WRANGLER_CONFIG]);
}

export function prepareGeneratedWranglerConfig(configPath = GENERATED_WRANGLER_CONFIG) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.d1_databases = (config.d1_databases ?? []).map((database) => {
    if (database.binding !== "DB" && database.database_name !== "site-creator-d1") {
      return database;
    }

    return { ...database, migrations_dir: "../../drizzle" };
  });
  writeFileSync(configPath, `${JSON.stringify(config)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
