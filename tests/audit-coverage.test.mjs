import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }), files = [];
  for (const entry of entries) {
    const item = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(item));
    else if (entry.name === "route.ts") files.push(item);
  }
  return files;
}

test("protected business mutations leave audit, ledger, or event evidence", async () => {
  const root = fileURLToPath(new URL("../app/api", import.meta.url));
  const allowed = [
    "notifications/route.ts",
    "public/[slug]/events/route.ts",
  ];
  for (const file of await walk(root)) {
    const source = await readFile(file, "utf8");
    if (!/export (async )?function (POST|PATCH|DELETE)|async function (POST|PATCH|DELETE)/.test(source)) continue;
    const normalized = file.replaceAll("\\", "/");
    if (allowed.some((suffix) => normalized.endsWith(suffix))) continue;
    assert.match(source, /writeAudit|writeAuthAudit|writePlatformAudit|INSERT INTO audit_logs|billing_events|integration_sync_runs|api_idempotency_keys|public_intake_attempts|publishDomainEvent|createAgencyBackup|verifyAgencyBackup/, `mutation lacks durable audit evidence: ${normalized}`);
  }
});

test("portal-originated maintenance and renewal decisions are audited", async () => {
  const [portal, media] = await Promise.all([
    readFile(new URL("../app/api/property-portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/maintenance-media/route.ts", import.meta.url), "utf8"),
  ]);
  for (const action of [
    "property_portal.accepted",
    "maintenance.reported_from_portal",
    "maintenance.landlord_approval",
    "lease_renewal.tenant_decision",
  ]) assert.match(portal, new RegExp(action.replace(".", "\\.")));
  assert.match(media, /maintenance\.media_uploaded/);
  assert.match(media, /audit_logs/);
});
