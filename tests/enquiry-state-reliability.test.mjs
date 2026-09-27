import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("legacy enquiries beyond New are reconciled with response work", async () => {
  const migration = await read("../drizzle/0046_enquiry_state_reliability.sql");
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE enquiries(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,stage TEXT NOT NULL,status TEXT NOT NULL,contacted_at TEXT,created_at TEXT NOT NULL)");
  db.exec("CREATE TABLE next_actions(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL,action_type TEXT NOT NULL,status TEXT NOT NULL,completed_at TEXT)");
  db.prepare("INSERT INTO enquiries VALUES(?,?,?,?,?,?)").run("advanced", "agency", "Viewing", "New", null, "2026-09-01T08:00:00.000Z");
  db.prepare("INSERT INTO enquiries VALUES(?,?,?,?,?,?)").run("fresh", "agency", "New", "New", null, "2026-09-01T09:00:00.000Z");
  db.prepare("INSERT INTO next_actions VALUES(?,?,?,?,?,?,?)").run("respond-advanced", "agency", "enquiry", "advanced", "respond", "open", null);
  db.prepare("INSERT INTO next_actions VALUES(?,?,?,?,?,?,?)").run("respond-fresh", "agency", "enquiry", "fresh", "respond", "open", null);

  db.exec(migration);

  assert.deepEqual({ ...db.prepare("SELECT stage,status,contacted_at contactedAt FROM enquiries WHERE id='advanced'").get() }, { stage: "Viewing", status: "Contacted", contactedAt: "2026-09-01T08:00:00.000Z" });
  assert.deepEqual({ ...db.prepare("SELECT stage,status,contacted_at contactedAt FROM enquiries WHERE id='fresh'").get() }, { stage: "New", status: "New", contactedAt: null });
  assert.equal(db.prepare("SELECT status FROM next_actions WHERE id='respond-advanced'").get().status, "complete");
  assert.equal(db.prepare("SELECT status FROM next_actions WHERE id='respond-fresh'").get().status, "open");
  db.close();
});

test("local preview enquiry stages and response actions begin consistent", async () => {
  const source = await read("../db/workspace.ts");
  assert.match(source, /"Viewing",iso\(2\*day\).*"Contacted","WhatsApp"/);
  assert.match(source, /enquiryB,"viewing_confirm","Confirm Daniel Ncube's Newlands viewing"/);
  assert.doesNotMatch(source, /enquiryB,"respond","Respond to Daniel Ncube about Newlands viewing"/);
});
