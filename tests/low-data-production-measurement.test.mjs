import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { LOW_DATA_MEASUREMENT_VIEWPORTS } from "../db/low-data-budget.ts";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("production low-data evidence is documented and machine verifiable", async () => {
  const [script, docs, checklist, pkg] = await Promise.all([
    read("../scripts/verify-low-data-production.mjs"),
    read("../docs/LOW-DATA-PRODUCTION-MEASUREMENT.md"),
    read("../docs/DELIVERY-CHECKLIST.md"),
    read("../package.json"),
  ]);
  assert.match(script, /LOW_DATA_MEASUREMENT_VIEWPORTS/);
  assert.match(docs, /npm run low-data:verify/);
  assert.match(checklist, /production measurement verifier/);
  assert.match(pkg, /"low-data:verify"/);
});

test("production low-data verifier accepts complete hosted evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-low-data-"));
  const evidencePath = join(dir, "evidence.json");
  await writeFile(evidencePath, JSON.stringify({
    productionUrl: "https://example.estara.co.zw",
    commitSha: "0123456789abcdef",
    capturedAt: new Date("2026-08-19T00:00:00.000Z").toISOString(),
    measurements: LOW_DATA_MEASUREMENT_VIEWPORTS.map((viewport) => ({
      viewport: viewport.name,
      fullMode: { imageRequests: 10, transferBytes: 500000 },
      lowDataMode: { imageRequests: 0, transferBytes: 20000 },
    })),
  }));
  const result = spawnSync(process.execPath, ["scripts/verify-low-data-production.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Low-data production evidence passed/);
});

test("production low-data verifier rejects missing viewports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-low-data-"));
  const evidencePath = join(dir, "evidence.json");
  await writeFile(evidencePath, JSON.stringify({
    productionUrl: "https://example.estara.co.zw",
    commitSha: "0123456789abcdef",
    capturedAt: "2026-08-19T00:00:00.000Z",
    measurements: [],
  }));
  const result = spawnSync(process.execPath, ["scripts/verify-low-data-production.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing measurement/);
});
