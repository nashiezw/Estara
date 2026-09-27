import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("action creation and mutations commit with their audit evidence", async () => {
  const [route, migration, schema] = await Promise.all([
    read("../app/api/actions/route.ts"),
    read("../drizzle/0048_next_action_mutation_ownership.sql"),
    read("../db/schema.ts"),
  ]);
  assert.match(migration, /ALTER TABLE next_actions ADD COLUMN mutation_token TEXT/);
  assert.match(schema, /mutationToken:text\("mutation_token"\)/);
  assert.match(route, /env\.DB\.batch\(\[env\.DB\.prepare\("INSERT INTO next_actions/);
  assert.match(route, /prepareAudit\(w,"next_action\.created"/);
  assert.match(route, /mutation_token=\?/);
  assert.match(route, /WHERE EXISTS\(SELECT 1 FROM next_actions WHERE id=\? AND agency_id=\? AND mutation_token=\?\)/);
  assert.match(route, /This action changed while you were updating it/);
  assert.doesNotMatch(route, /writeAudit/);
});

test("only one concurrent action mutation owns the open record", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE next_actions(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,status TEXT NOT NULL,assigned_user_id TEXT NOT NULL,mutation_token TEXT,completed_at TEXT)");
  db.prepare("INSERT INTO next_actions VALUES(?,?,?,?,?,?)").run("action", "agency", "open", "agent-a", null, null);
  const complete = db.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP,mutation_token=? WHERE id=? AND agency_id=? AND status='open'");
  const reassign = db.prepare("UPDATE next_actions SET assigned_user_id=?,mutation_token=? WHERE id=? AND agency_id=? AND status='open'");
  assert.equal(complete.run("winner", "action", "agency").changes, 1);
  assert.equal(reassign.run("agent-b", "loser", "action", "agency").changes, 0);
  assert.deepEqual({ ...db.prepare("SELECT status,assigned_user_id,mutation_token FROM next_actions WHERE id=?").get("action") }, { status: "complete", assigned_user_id: "agent-a", mutation_token: "winner" });
  db.close();
});
