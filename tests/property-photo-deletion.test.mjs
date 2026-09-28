import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { propertyCompleteness } from "../db/property-policy.ts";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("removing a property photo lowers completeness when the guided set becomes incomplete", () => {
  const property = {
    title: "Borrowdale home",
    transactionType: "Sale",
    propertyType: "House",
    priceMinor: 25000000,
    currency: "USD",
    bedrooms: 4,
    bathrooms: 3,
    country: "Zimbabwe",
    city: "Harare",
    suburb: "Borrowdale",
    address: "1 Example Road",
    description: "A complete and factual property description with enough useful detail.",
    ownerContactId: "owner",
    listingAgentId: "agent",
    mandateId: "mandate",
    landSize: "2000 sqm",
  };

  assert.equal(propertyCompleteness({ ...property, photoCount: 4 }).percentage, 100);
  const afterRemoval = propertyCompleteness({ ...property, photoCount: 3 });
  assert.ok(afterRemoval.percentage < 100);
  assert.ok(afterRemoval.missing.includes("4 photos"));
});

test("property media deletion is tenant scoped, permission checked, persisted and audited", async () => {
  const route = await read("../app/api/media/route.ts");
  const deletion = route.match(/async function DELETE[\s\S]*?export \{ DELETE/)?.[0] || "";

  assert.match(deletion, /WHERE id=\? AND agency_id=\?/);
  assert.match(deletion, /asset\.kind !== "property_photo"/);
  assert.match(deletion, /context\("property\.media\.manage"\)/);
  assert.match(deletion, /requirePropertyBranchAccess\(c\.workspace, asset\.propertyId\)/);
  assert.match(deletion, /INSERT INTO media_cleanup_jobs/);
  assert.match(deletion, /photo_count=\(SELECT COUNT\(\*\) FROM media_assets/);
  assert.match(deletion, /completeness=CASE WHEN/);
  assert.match(deletion, /item_key='photos'/);
  assert.match(deletion, /prepareAudit\(c\.workspace, "media\.deleted"/);
  assert.match(deletion, /await env\.DB\.batch\(statements\);[\s\S]*processMediaCleanupJob/);
  assert.match(deletion, /json_extract\(detail,'\$\.propertyId'\).*action='media\.deleted'.*resource_id=\?/);
  assert.match(deletion, /requirePropertyBranchAccess\(c\.workspace, deleted\.propertyId\)/);
  assert.match(deletion, /alreadyDeleted: true/);
  assert.match(deletion, /processMediaCleanupJob\(cleanupId, storage\)\.catch/);
  assert.match(deletion, /cacheInvalidationPending/);
  assert.match(deletion, /invalidatePublicSite/);
});

test("property photo object deletion is durable and retried after storage failure", async () => {
  const [migration, cleanup, worker, schema] = await Promise.all([
    read("../drizzle/0052_media_cleanup_queue.sql"),
    read("../db/media-cleanup.ts"),
    read("../worker/index.ts"),
    read("../db/schema.ts"),
  ]);
  assert.match(migration, /CREATE TABLE media_cleanup_jobs/);
  assert.match(migration, /next_attempt_at TEXT NOT NULL/);
  assert.match(cleanup, /storage\.delete\(objectKeys\)/);
  assert.match(cleanup, /UPDATE media_cleanup_jobs SET attempts=\?,last_error=\?,next_attempt_at=datetime/);
  assert.match(cleanup, /processDueMediaCleanupJobs/);
  assert.match(worker, /processDueMediaCleanupJobs\(\)/);
  assert.match(schema, /mediaCleanupJobs=sqliteTable\("media_cleanup_jobs"/);
});

test("media upload commits audit and replacement cleanup before reporting success", async () => {
  const route = await read("../app/api/media/route.ts");
  const upload = route.match(/async function POST[\s\S]*?async function DELETE/)?.[0] || "";
  assert.match(upload, /SELECT id,object_key AS objectKey,thumbnail_object_key AS thumbnailObjectKey/);
  assert.match(upload, /previous\.map\(asset => \(\{ id: crypto\.randomUUID\(\), asset \}\)\)/);
  assert.match(upload, /INSERT INTO media_cleanup_jobs/);
  assert.match(upload, /prepareAudit\(c\.workspace, "media\.uploaded"/);
  assert.match(upload, /await env\.DB\.batch\(statements\)/);
  assert.doesNotMatch(upload, /await writeAudit/);
  assert.match(upload, /cacheInvalidationPending/);
});

test("workspace and full property record expose confirmed photo removal controls", async () => {
  const [workspace, record, globalCss, mediaCss] = await Promise.all([
    read("../app/estara-app.tsx"),
    read("../app/properties/[id]/property-record-client.tsx"),
    read("../app/globals.css"),
    read("../app/properties/[id]/media.css"),
  ]);

  for (const source of [workspace, record]) {
    assert.match(source, /fetch\(`\/api\/media\?id=\$\{encodeURIComponent\([^}]+\)\}`,[\s\S]*?method:"DELETE"/);
    assert.match(source, /Remove photo/);
    assert.match(source, /role="alert"/);
  }
  assert.match(workspace, /aria-label=\{`Remove photo \$\{index\+1\} from \$\{selected\.title\}`\}/);
  assert.match(record, /aria-label=\{`Remove \$\{x\.category\} photo \$\{index\+1\}`\}/);
  assert.match(globalCss, /\.media-delete-confirm/);
  assert.match(mediaCss, /\.record-media-remove/);
});
