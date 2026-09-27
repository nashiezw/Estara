import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE enquiries(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,stage TEXT NOT NULL,status TEXT NOT NULL,contacted_at TEXT,next_follow_up_at TEXT,mutation_token TEXT,assigned_user_id TEXT NOT NULL);
    CREATE TABLE next_actions(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL,action_type TEXT NOT NULL,reason TEXT NOT NULL,priority TEXT NOT NULL,due_at TEXT NOT NULL,status TEXT NOT NULL,assigned_user_id TEXT NOT NULL,completed_at TEXT);
    CREATE TABLE contact_activities(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,contact_id TEXT NOT NULL,activity_type TEXT NOT NULL,resource_id TEXT NOT NULL);
    CREATE TABLE audit_logs(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,action TEXT NOT NULL,resource_id TEXT NOT NULL);
  `);
  return db;
}

test("enquiry mutations are token-owned and commit their side effects in one batch", async () => {
  const [route, schema, migration] = await Promise.all([
    read("../app/api/workspace/actions/route.ts"),
    read("../db/schema.ts"),
    read("../drizzle/0049_enquiry_mutation_ownership.sql"),
  ]);
  assert.match(schema, /mutationToken:text\("mutation_token"\)/);
  assert.match(migration, /ALTER TABLE enquiries ADD COLUMN mutation_token TEXT/);
  assert.match(route, /contacted_at IS NULL/);
  assert.match(route, /AND stage=\?/);
  assert.match(route, /mutation_token=\?/g);
  assert.match(route, /INSERT INTO audit_logs[\s\S]*WHERE EXISTS\(SELECT 1 FROM enquiries/);
  assert.match(route, /const result = await env\.DB\.batch\(statements\)/g);
  assert.match(route, /assigned_user_id AS assignedUserId/);
});

test("only one initial-contact mutation creates follow-up and audit evidence", () => {
  const db = database();
  db.prepare("INSERT INTO enquiries VALUES(?,?,?,?,?,?,?,?)").run("enquiry", "agency", "New", "New", null, null, null, "agent");
  db.prepare("INSERT INTO next_actions VALUES(?,?,?,?,?,?,?,?,?,?,?)").run("respond", "agency", "enquiry", "enquiry", "respond", "Respond", "high", "2026-09-27T10:00:00Z", "open", "agent", null);

  const contact = token => {
    const mutation = db.prepare("UPDATE enquiries SET stage='Contacted',status='Contacted',contacted_at='2026-09-27T10:05:00Z',next_follow_up_at='2026-09-28T10:05:00Z',mutation_token=? WHERE id='enquiry' AND agency_id='agency' AND contacted_at IS NULL").run(token);
    db.prepare("UPDATE next_actions SET status='complete' WHERE id='respond' AND EXISTS(SELECT 1 FROM enquiries WHERE id='enquiry' AND mutation_token=?)").run(token);
    db.prepare("INSERT INTO next_actions SELECT ?, 'agency','enquiry','enquiry','follow_up','Follow up','normal','2026-09-28T10:05:00Z','open','agent',NULL WHERE EXISTS(SELECT 1 FROM enquiries WHERE id='enquiry' AND mutation_token=?)").run(`follow-${token}`, token);
    db.prepare("INSERT INTO audit_logs SELECT ?, 'agency','enquiry.contacted','enquiry' WHERE EXISTS(SELECT 1 FROM enquiries WHERE id='enquiry' AND mutation_token=?)").run(`audit-${token}`, token);
    return mutation.changes;
  };

  assert.equal(contact("winner"), 1);
  assert.equal(contact("loser"), 0);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM next_actions WHERE action_type='follow_up'").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM audit_logs WHERE action='enquiry.contacted'").get().count, 1);
  assert.equal(db.prepare("SELECT assigned_user_id owner FROM next_actions WHERE action_type='follow_up'").get().owner, "agent");
  db.close();
});

test("concurrent stage moves have one winner and terminal stages retire open work", () => {
  const db = database();
  db.prepare("INSERT INTO enquiries VALUES(?,?,?,?,?,?,?,?)").run("moving", "agency", "Contacted", "Contacted", "2026-09-27T10:05:00Z", "2026-09-28T10:05:00Z", null, "agent");
  const move = (next, token) => db.prepare("UPDATE enquiries SET stage=?,status='Contacted',mutation_token=? WHERE id='moving' AND agency_id='agency' AND stage='Contacted'").run(next, token).changes;
  assert.equal(move("Qualified", "winner"), 1);
  assert.equal(move("Viewing", "loser"), 0);
  assert.equal(db.prepare("SELECT stage FROM enquiries WHERE id='moving'").get().stage, "Qualified");

  db.prepare("INSERT INTO enquiries VALUES(?,?,?,?,?,?,?,?)").run("terminal", "agency", "Offer", "Contacted", "2026-09-27T10:05:00Z", "2026-09-28T10:05:00Z", null, "agent");
  db.prepare("INSERT INTO next_actions VALUES(?,?,?,?,?,?,?,?,?,?,?)").run("offer-work", "agency", "enquiry", "terminal", "follow_up", "Discuss offer", "high", "2026-09-28T10:05:00Z", "open", "agent", null);
  assert.equal(db.prepare("UPDATE enquiries SET stage='Won',status='Won',next_follow_up_at=NULL,mutation_token='terminal-winner' WHERE id='terminal' AND agency_id='agency' AND stage='Offer'").run().changes, 1);
  db.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id='agency' AND resource_type='enquiry' AND resource_id='terminal' AND status='open' AND EXISTS(SELECT 1 FROM enquiries WHERE id='terminal' AND mutation_token='terminal-winner')").run();
  assert.deepEqual({ ...db.prepare("SELECT stage,status,next_follow_up_at nextFollowUpAt FROM enquiries WHERE id='terminal'").get() }, { stage: "Won", status: "Won", nextFollowUpAt: null });
  assert.equal(db.prepare("SELECT status FROM next_actions WHERE id='offer-work'").get().status, "complete");
  db.close();
});
