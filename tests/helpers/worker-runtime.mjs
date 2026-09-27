import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";

const root = fileURLToPath(new URL("../../", import.meta.url));
const serverRoot = path.join(root, "dist", "server");

async function workerModules(directory) {
  const modules = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) modules.push(...await workerModules(target));
    else if (/\.(?:js|mjs)$/.test(entry.name)) modules.push({ type: "ESModule", path: target });
  }
  return modules;
}

export async function withWorkerRuntime(run) {
  const main = path.join(serverRoot, "index.js");
  const discovered = await workerModules(serverRoot);
  const runtime = new Miniflare({
    modules: [{ type: "ESModule", path: main }, ...discovered.filter(module => module.path !== main)],
    compatibilityDate: "2026-05-15",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "estara-test" },
    r2Buckets: ["MEDIA"],
    serviceBindings: { ASSETS: async () => new Response("Not found", { status: 404 }) },
  });
  try {
    return await run(runtime);
  } finally {
    await runtime.dispose();
  }
}
