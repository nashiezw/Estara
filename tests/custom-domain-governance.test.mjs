import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

async function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  const directory = new URL("../drizzle/", import.meta.url);
  const names = (await readdir(directory)).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
  for (const name of names) {
    const sql = await readFile(new URL(name, directory), "utf8");
    for (const statement of sql.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) db.exec(statement);
  }
  return db;
}

test("custom domains are tenant-owned and globally unique", async () => {
  const db = await database();
  db.prepare("INSERT INTO agencies(id,name,slug) VALUES(?,?,?)").run("agency-a", "Agency A", "agency-a");
  db.prepare("INSERT INTO agencies(id,name,slug) VALUES(?,?,?)").run("agency-b", "Agency B", "agency-b");
  db.prepare("INSERT INTO custom_domains(id,agency_id,domain,ownership_token,expected_cname,status,created_by) VALUES(?,?,?,?,?,?,?)").run("domain-a", "agency-a", "www.example.co.zw", "estara-domain-token", "agency-a.example.host", "setup_required", "user-a");
  assert.throws(() => db.prepare("INSERT INTO custom_domains(id,agency_id,domain,ownership_token,expected_cname,status,created_by) VALUES(?,?,?,?,?,?,?)").run("domain-b", "agency-b", "www.example.co.zw", "other-token", "agency-b.example.host", "setup_required", "user-b"));
  assert.equal(db.prepare("UPDATE custom_domains SET status='active' WHERE id=? AND agency_id=?").run("domain-a", "agency-b").changes, 0);
});

test("domain lifecycle proves ownership before activation", async () => {
  const db = await database();
  db.prepare("INSERT INTO agencies(id,name,slug) VALUES(?,?,?)").run("agency-a", "Agency A", "agency-a");
  db.prepare("INSERT INTO custom_domains(id,agency_id,domain,ownership_token,expected_cname,status,created_by) VALUES(?,?,?,?,?,?,?)").run("domain-a", "agency-a", "www.example.co.zw", "estara-domain-token", "agency-a.example.host", "setup_required", "user-a");
  const wrong = db.prepare("UPDATE custom_domains SET status='failed',failure_reason=? WHERE id=? AND agency_id=? AND ownership_token=? AND expected_cname=?").run("TXT ownership token or CNAME target does not match.", "domain-a", "agency-a", "wrong", "agency-a.example.host");
  assert.equal(wrong.changes, 0);
  const verified = db.prepare("UPDATE custom_domains SET status='verified',verified_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND ownership_token=? AND expected_cname=?").run("domain-a", "agency-a", "estara-domain-token", "agency-a.example.host");
  assert.equal(verified.changes, 1);
  assert.equal(db.prepare("UPDATE custom_domains SET status='active',activated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status IN ('verified','ssl_pending')").run("domain-a", "agency-a").changes, 1);
});

test("domain route is permission checked, entitlement gated and avoids fake TLS success", async () => {
  const route = await readFile(new URL("../app/api/domains/route.ts", import.meta.url), "utf8");
  const publicSite = await readFile(new URL("../db/public-site.ts", import.meta.url), "utf8");
  assert.match(route, /requirePermission\(workspace, "agency\.settings\.manage"\)/);
  assert.match(route, /requireEntitlement\(workspace\.agencyId, user\.userId, "customDomains"\)/);
  assert.match(route, /ownershipToken/);
  assert.match(route, /observedTxt === row\.ownershipToken/);
  assert.match(route, /observedCname === row\.expectedCname\.toLowerCase\(\)/);
  assert.match(route, /Awaiting hosting provider certificate activation/);
  assert.doesNotMatch(route, /status='active'.*request_ssl/s);
  assert.match(publicSite, /getPublicAgencyByHost/);
  assert.match(publicSite, /d\.status='active'/);
});
