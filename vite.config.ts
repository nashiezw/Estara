import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";
const ESTARA_PRODUCTION_D1_DATABASE_ID =
  "e4fec45c-a64d-45f7-a056-58c19e6f34db";
const ESTARA_PRODUCTION_D1_DATABASE_NAME = "estara";
const ESTARA_PRODUCTION_R2_BUCKET_NAME = "site-creator-r2";

const { d1, r2 } = hostingConfig;
const productionD1DatabaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID?.trim() ||
  process.env.CLOUDFLARE_DATABASE_ID?.trim() ||
  ESTARA_PRODUCTION_D1_DATABASE_ID;
const productionR2BucketName =
  process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim() ||
  ESTARA_PRODUCTION_R2_BUCKET_NAME;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: ESTARA_PRODUCTION_D1_DATABASE_NAME,
          database_id: productionD1DatabaseId,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: productionR2BucketName,
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
