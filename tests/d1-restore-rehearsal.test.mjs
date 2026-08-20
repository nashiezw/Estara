import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  D1_RESTORE_REHEARSAL_ATTACK_COMMAND,
  REQUIRED_D1_RESTORE_VALIDATIONS,
  validateD1RestoreRehearsalEvidence,
} from "../db/d1-restore-rehearsal.ts";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

function completeEvidence() {
  return {
    rehearsalId: "d1-restore-2026-08-19",
    startedAt: "2026-08-19T08:00:00.000Z",
    completedAt: "2026-08-19T08:42:00.000Z",
    appRevision: "0123456789abcdef",
    isolatedEnvironment: true,
    productionBackendVersion: "production",
    restoreTarget: "estara-recovery-2026-08-19",
    sourceDatabase: "estara-prod",
    restoredDatabaseBinding: "ESTARA_RECOVERY_D1",
    sourceBookmark: "00000000-0000-0000-0000-000000000000",
    restoredBookmark: "11111111-1111-1111-1111-111111111111",
    snapshotId: "snapshot-2026-08-19",
    rpoHours: 1,
    rtoMinutes: 42,
    validations: Object.fromEntries(REQUIRED_D1_RESTORE_VALIDATIONS.map((key) => [key, true])),
    tenantAttackSuite: {
      command: D1_RESTORE_REHEARSAL_ATTACK_COMMAND,
      exitCode: 0,
      completedAt: "2026-08-19T08:39:00.000Z",
      outputRef: "d1-restore-tenant-attacks.txt",
    },
    approval: {
      recoveryOwner: "Recovery Owner",
      dataOwner: "Data Owner",
      decision: "accepted",
    },
  };
}

test("D1 restore rehearsal verifier is documented and wired to npm", async () => {
  const [pkg, runbook, rehearsal, register, todo] = await Promise.all([
    read("../package.json"),
    read("../docs/RECOVERY-RUNBOOK.md"),
    read("../docs/D1-RESTORE-REHEARSAL.md"),
    read("../docs/PRODUCTION-LAUNCH-EVIDENCE.md"),
    read("../docs/PRODUCTION-READINESS-TODO.md"),
  ]);

  assert.match(pkg, /"d1:restore:verify"/);
  assert.match(runbook, /npm run d1:restore:verify/);
  assert.match(rehearsal, /node --test tests\/cross-tenant-attacks\.test\.mjs/);
  assert.match(register, /docs\/evidence\/d1-restore-rehearsal\.json/);
  assert.match(todo, /D1 restore rehearsal evidence verifier/);
});

test("D1 restore rehearsal validator accepts complete isolated evidence", () => {
  assert.deepEqual(validateD1RestoreRehearsalEvidence(completeEvidence()), []);
});

test("D1 restore rehearsal command rejects unsafe or incomplete proof", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-d1-restore-"));
  const evidencePath = join(dir, "d1-restore-rehearsal.json");
  const evidence = completeEvidence();
  evidence.restoreTarget = "production";
  evidence.tenantAttackSuite.exitCode = 1;
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = spawnSync(process.execPath, ["scripts/verify-d1-restore-rehearsal.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /restoreTarget must not be production/);
  assert.match(result.stderr, /tenantAttackSuite\.exitCode must be 0/);
});

test("D1 restore rehearsal command requires attack output inside evidence bundle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-d1-restore-"));
  const evidencePath = join(dir, "d1-restore-rehearsal.json");
  const outsidePath = join(dir, "..", "outside-attacks.txt");
  const evidence = completeEvidence();
  evidence.tenantAttackSuite.outputRef = "../outside-attacks.txt";
  await writeFile(outsidePath, "passing output");
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = spawnSync(process.execPath, ["scripts/verify-d1-restore-rehearsal.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /tenantAttackSuite\.outputRef must point to an existing evidence file/);
});

test("D1 restore rehearsal command accepts complete proof with local output", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-d1-restore-"));
  const evidencePath = join(dir, "d1-restore-rehearsal.json");
  const evidence = completeEvidence();
  const outputPath = join(dir, evidence.tenantAttackSuite.outputRef);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, "ok 1 - cross tenant attacks");
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = spawnSync(process.execPath, ["scripts/verify-d1-restore-rehearsal.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /D1 restore rehearsal evidence passed/);
});
