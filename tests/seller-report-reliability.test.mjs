import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("seller delivery evidence is unique per recipient and channel", async () => {
  const migration = await read("../drizzle/0045_seller_report_reliability.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE seller_reports(id TEXT PRIMARY KEY)");
  db.exec("CREATE TABLE seller_deliveries(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,report_id TEXT,document_id TEXT,recipient_email TEXT NOT NULL,channel TEXT NOT NULL)");
  db.exec(migration);
  const insert = db.prepare("INSERT INTO seller_deliveries(id,agency_id,report_id,recipient_email,channel) VALUES(?,?,?,?,?)");
  insert.run("one", "agency", "report", "Seller@Example.com", "portal");
  assert.throws(() => insert.run("two", "agency", "report", "seller@example.com", "portal"));
  insert.run("three", "agency", "report", "seller@example.com", "email");
  assert.equal(db.prepare("SELECT COUNT(*) count FROM seller_deliveries").get().count, 2);
  db.close();
});

test("seller reports claim approval, recover missing artifacts and create deliveries atomically", async () => {
  const route = await read("../app/api/seller-management/route.ts");
  const operations = await read("../app/seller-operations.tsx");
  assert.match(route, /status='approving'/);
  assert.match(route, /datetime\(approval_started_at\)<datetime\(\?\)/);
  assert.match(route, /datetime\(r\.approval_started_at\)<datetime\('now','-10 minutes'\)/);
  assert.match(route, /await env\.MEDIA\.head\(report\.pdf_object_key\)/);
  assert.match(route, /status='approved' AND COALESCE\(pdf_object_key,''\)=\?/);
  assert.match(route, /This report is already being approved/);
  assert.match(route, /INSERT OR IGNORE INTO seller_deliveries/);
  assert.match(route, /const ownsApproval = "EXISTS\(SELECT 1 FROM seller_reports/);
  assert.match(route, /INSERT OR IGNORE INTO audit_logs/);
  assert.match(route, /INSERT OR IGNORE INTO domain_events/);
  assert.match(route, /approvedAt\.replaceAll\(":", "-"\)/);
  assert.match(route, /await env\.DB\.batch\(statements\)/);
  assert.match(route, /committed\[committed\.length - 1\]/);
  assert.match(route, /await env\.MEDIA\.delete\(key\)/);
  assert.match(route, /const failureStatus = recoveringPdf \? "approved" : "draft"/);
  assert.match(route, /const failureApprovedBy = recoveringPdf \? report\.approved_by \|\| null : null/);
  assert.match(route, /SET status=\?,approved_by=\?,approval_started_at=NULL/);
  assert.match(operations, /report\.status === "approved" && !report\.hasPdf/);
  assert.match(operations, /Create missing PDF/);
  assert.match(operations, /const downloadReport = async \(id: string\)/);
  assert.match(operations, /action: "approve_report", id, propertyId: selectedPropertyId/);
  assert.match(operations, /body\.recovered \? "Seller PDF recreated and download started\."/);
  assert.match(operations, /report\.status === "approving" && report\.approvalStale/);
  assert.match(operations, /Retry approval/);
});

test("seller report stale claims compare SQLite and ISO timestamps chronologically", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE seller_reports(id TEXT PRIMARY KEY,status TEXT NOT NULL,approval_started_at TEXT,approved_by TEXT)");
  const insert = db.prepare("INSERT INTO seller_reports VALUES(?,?,?,?)");
  insert.run("sqlite-stale", "approving", "2026-09-27 10:00:00", "old");
  insert.run("iso-stale", "approving", "2026-09-27T10:00:00.000Z", "old");
  insert.run("iso-fresh", "approving", "2026-09-27T11:59:00.000Z", "active");
  const claim = db.prepare("UPDATE seller_reports SET approved_by=? WHERE id=? AND status='approving' AND datetime(approval_started_at)<datetime(?)");
  assert.equal(claim.run("new", "sqlite-stale", "2026-09-27T11:50:00.000Z").changes, 1);
  assert.equal(claim.run("new", "iso-stale", "2026-09-27T11:50:00.000Z").changes, 1);
  assert.equal(claim.run("new", "iso-fresh", "2026-09-27T11:50:00.000Z").changes, 0);
  db.close();
});

test("scheduled seller reports are deterministic and compare-and-advance", async () => {
  const route = await read("../app/api/seller-management/route.ts");
  assert.match(route, /const reportId = `\$\{schedule\.id\}:\$\{schedule\.nextRunAt\}`/);
  assert.match(route, /INSERT OR IGNORE INTO seller_reports/);
  assert.match(route, /AND next_run_at=\?/);
  assert.match(route, /scheduled-report:\$\{reportId\}/);
  assert.match(route, /if \(result\[0\]\?\.meta\.changes\) created\+\+/);
});

test("offer and seller access audits only record successful transitions", async () => {
  const route = await read("../app/api/seller-management/route.ts");
  assert.equal((route.match(/WHERE changes\(\)>0/g) || []).length, 2);
  assert.match(route, /offer-status:\$\{id\}:\$\{status\}/);
  assert.match(route, /seller-access-revoked:\$\{id\}/);
});
