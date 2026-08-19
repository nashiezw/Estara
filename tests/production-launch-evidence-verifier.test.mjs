import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { PRODUCTION_PROVIDER_DECISIONS } from "../db/production-providers.ts";
import {
  REQUIRED_LAUNCH_EVIDENCE_GATES,
  REQUIRED_LAUNCH_JOURNEYS,
  validateProductionLaunchEvidence,
} from "../db/production-launch-evidence.ts";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

function completeEvidence() {
  return {
    productionUrl: "https://app.estara.co.zw",
    commitSha: "0123456789abcdef",
    capturedAt: "2026-08-19T00:00:00.000Z",
    deployment: {
      sitesProjectId: "appgprj_6a83d143555c81918509011b784f3fdf",
      deploymentUrl: "https://app.estara.co.zw",
      commitSha: "0123456789abcdef",
      ready: true,
    },
    providers: PRODUCTION_PROVIDER_DECISIONS.map((decision) => ({
      area: decision.area,
      configuredEnv: true,
      healthReady: true,
      smokeTestPassed: true,
      activationEvidenceRefs: decision.activationEvidence.map((_, index) => `evidence/${decision.area}-${index}.txt`),
    })),
    domainTls: {
      domainAttached: true,
      dnsVerified: true,
      tlsActive: true,
      unknownHostFailClosed: true,
      publicRouteSmokeTestPassed: true,
    },
    d1Restore: {
      isolatedEnvironment: true,
      timeTravelRestoreVerified: true,
      tenantAttackSuitePassed: true,
      evidenceRef: "docs/evidence/d1-restore.md",
    },
    penetrationTest: {
      independentTester: true,
      launchBlockingFindingsOpen: 0,
      reportRef: "docs/evidence/penetration-test.pdf",
    },
    publicAccessApproval: {
      productOwner: "Product Owner",
      approvedAt: "2026-08-19T00:00:00.000Z",
      accessLevel: "public",
    },
    billingSettlement: {
      liveMode: true,
      paidInvoiceVerified: true,
      settlementReconciled: true,
      refundVerified: true,
      failedPaymentVerified: true,
      financeSignoff: "Finance Owner",
    },
    lowData: {
      verifierPassed: true,
      evidenceFile: "docs/evidence/low-data-production.json",
    },
    mobileAudit: {
      androidPassed: true,
      iosPassed: true,
      auditRef: "docs/evidence/mobile-audit.md",
    },
    mvpApproval: {
      productOwner: "Product Owner",
      approvedAt: "2026-08-19T00:00:00.000Z",
      journeysApproved: [...REQUIRED_LAUNCH_JOURNEYS],
    },
  };
}

async function writeEvidenceRefs(rootDir, evidence) {
  await mkdir(join(rootDir, "evidence"), { recursive: true });
  const refs = [
    ...evidence.providers.flatMap((provider) => provider.activationEvidenceRefs),
    evidence.d1Restore.evidenceRef,
    evidence.penetrationTest.reportRef,
    evidence.lowData.evidenceFile,
    evidence.mobileAudit.auditRef,
  ];
  for (const ref of refs) {
    const path = join(rootDir, ref);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, "verified evidence");
  }
}

test("production launch evidence verifier is documented and wired to npm", async () => {
  const [pkg, register, todo] = await Promise.all([
    read("../package.json"),
    read("../docs/PRODUCTION-LAUNCH-EVIDENCE.md"),
    read("../docs/PRODUCTION-READINESS-TODO.md"),
  ]);
  assert.equal(REQUIRED_LAUNCH_EVIDENCE_GATES.length, 10);
  assert.match(pkg, /"launch:evidence"/);
  assert.match(register, /npm run launch:evidence/);
  assert.match(todo, /machine-verifiable launch evidence bundle/);
});

test("production launch evidence validator accepts complete evidence", () => {
  assert.deepEqual(validateProductionLaunchEvidence(completeEvidence()), []);
});

test("production launch evidence command rejects incomplete launch proof", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-launch-evidence-"));
  const evidencePath = join(dir, "evidence.json");
  const evidence = completeEvidence();
  evidence.providers = [];
  evidence.mvpApproval.journeysApproved = ["landing-to-workspace"];
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = spawnSync(process.execPath, ["scripts/verify-production-launch-evidence.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /providers must include/);
  assert.match(result.stderr, /mvpApproval\.journeysApproved/);
});

test("production launch evidence command rejects missing local evidence references", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-launch-evidence-"));
  const evidencePath = join(dir, "production-launch.json");
  const evidence = completeEvidence();
  await writeEvidenceRefs(dir, evidence);
  evidence.lowData.evidenceFile = "evidence/missing-low-data.json";
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = spawnSync(process.execPath, ["scripts/verify-production-launch-evidence.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /lowData\.evidenceFile must point to an existing evidence file or external URL/);
});

test("production launch evidence command rejects refs outside the evidence bundle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-launch-evidence-"));
  const evidencePath = join(dir, "production-launch.json");
  const outsidePath = join(dir, "..", "outside-proof.txt");
  const evidence = completeEvidence();
  await writeEvidenceRefs(dir, evidence);
  await writeFile(outsidePath, "outside proof");
  evidence.d1Restore.evidenceRef = "../outside-proof.txt";
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = spawnSync(process.execPath, ["scripts/verify-production-launch-evidence.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /d1Restore\.evidenceRef must point to an existing evidence file or external URL/);
});

test("production launch evidence command accepts complete evidence with real refs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "estara-launch-evidence-"));
  const evidencePath = join(dir, "production-launch.json");
  const evidence = completeEvidence();
  await writeEvidenceRefs(dir, evidence);
  await writeFile(evidencePath, JSON.stringify(evidence));

  const result = spawnSync(process.execPath, ["scripts/verify-production-launch-evidence.mjs", evidencePath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Production launch evidence passed/);
});
