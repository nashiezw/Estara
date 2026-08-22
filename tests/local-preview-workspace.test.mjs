import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("local preview workspace uses one deterministic agency and slug", () => {
  const workspace = readFileSync("db/workspace.ts", "utf8");

  assert.match(workspace, /user\.userId==="local-preview-principal"/);
  assert.match(workspace, /const agencyId="local-preview-agency"/);
  assert.match(workspace, /INSERT OR IGNORE INTO agencies/);
  assert.match(workspace, /"prime-property"/);
  assert.match(workspace, /"skyline","modern"/);
  assert.doesNotMatch(workspace, /website_template=\?,typography=\?[\s\S]{0,220}"signature"/);
  assert.match(workspace, /INSERT OR IGNORE INTO agency_memberships/);
  assert.match(workspace, /"local-preview-membership"/);
  assert.match(workspace, /ensureLocalPreviewData\(agencyId,user\)/);
});
