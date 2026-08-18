import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  D1_POINT_IN_TIME_RECOVERY,
  RECOVERY_TARGETS,
  d1PointInTimeRecoverySupported,
} from "../db/recovery-policy.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("point-in-time recovery policy matches D1 production Time Travel constraints", async () => {
  const [runbook, checklist, securityReview] = await Promise.all([
    read("../docs/RECOVERY-RUNBOOK.md"),
    read("../docs/DELIVERY-CHECKLIST.md"),
    read("../docs/SECURITY-REVIEW-2026-08-18.md"),
  ]);

  assert.equal(RECOVERY_TARGETS.mvpRpoHours, 24);
  assert.equal(RECOVERY_TARGETS.mvpRtoHours, 4);
  assert.equal(RECOVERY_TARGETS.d1TimeTravelRetentionDays.freePlan, 7);
  assert.equal(RECOVERY_TARGETS.d1TimeTravelRetentionDays.paidPlan, 30);
  assert.equal(D1_POINT_IN_TIME_RECOVERY.restoreCommand, "wrangler d1 time-travel restore");
  assert.equal(D1_POINT_IN_TIME_RECOVERY.destructiveInPlaceRestore, true);
  assert.equal(D1_POINT_IN_TIME_RECOVERY.rehearsalRequiredBeforeLaunch, true);
  assert.equal(d1PointInTimeRecoverySupported("production"), true);
  assert.equal(d1PointInTimeRecoverySupported("alpha"), false);

  assert.match(runbook, /Cloudflare D1 Time Travel/);
  assert.match(runbook, /version: production/);
  assert.match(runbook, /destructive in-place operation/);
  assert.match(checklist, /Point-in-time recovery policy documented/);
  assert.match(securityReview, /D1 Time Travel/);
});
