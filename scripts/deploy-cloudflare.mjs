import { spawnSync } from "node:child_process";

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
