import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("tenant lifecycle has schema, API, enforcement and admin controls", async () => {
  const [migration, schema, policy, entitlements, route, client, css] = await Promise.all([
    read("../drizzle/0035_tenant_lifecycle.sql"),
    read("../db/schema.ts"),
    read("../db/billing-policy.ts"),
    read("../db/entitlements.ts"),
    read("../app/api/platform/route.ts"),
    read("../app/admin/platform-admin-client.tsx"),
    read("../app/admin/platform-admin.css"),
  ]);
  assert.match(migration, /ALTER TABLE agencies ADD COLUMN status TEXT NOT NULL DEFAULT 'active'/);
  assert.match(migration, /previous_plan_version_id/);
  assert.match(schema, /status:text\("status"\)\.notNull\(\)\.default\("active"\)/);
  assert.match(schema, /expiredAt:text\("expired_at"\)/);
  assert.match(policy, /"past_due"/);
  assert.match(policy, /AGENCY_STATUSES=\["active","suspended","disabled","archived"\]/);
  assert.match(entitlements, /syncSubscriptionLifecycle/);
  assert.match(entitlements, /\["suspended","disabled","archived"\]\.includes\(plan\.agencyStatus\)/);
  assert.match(route, /extend_trial/);
  assert.match(route, /update_agency_status/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /hardDeleteAgency/);
  assert.match(route, /agency\.hard_deleted/);
  assert.match(route, /subscription\.plan_changed/);
  assert.match(client, /Tenant command list/);
  assert.match(client, /platform-tenant-filters/);
  assert.match(client, /Manage/);
  assert.match(client, /Confirm/);
  assert.match(client, /Start trial/);
  assert.match(client, /Extend trial 7d/);
  assert.match(css, /platform-manage-panel/);
  assert.match(css, /platform-badge-stack/);
});
