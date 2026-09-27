import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("viewing transitions claim the prior state and guard every side effect", async () => {
  const [route, migration, schema] = await Promise.all([
    read("../app/api/viewings/route.ts"),
    read("../drizzle/0047_viewing_transition_ownership.sql"),
    read("../db/schema.ts"),
  ]);
  assert.match(migration, /ALTER TABLE viewings ADD COLUMN transition_token TEXT/);
  assert.match(schema, /transitionToken:text\("transition_token"\)/);
  assert.match(route, /AND status=\?"\)\.bind\(status, transitionToken, transitionedAt, id, workspace\.agencyId, viewing\.status\)/);
  assert.match(route, /const ownsTransition = "EXISTS\(SELECT 1 FROM viewings/);
  assert.match(route, /INSERT INTO domain_events[\s\S]*WHERE \$\{ownsTransition\}/);
  assert.match(route, /INSERT INTO audit_logs[\s\S]*WHERE \$\{ownsTransition\}/);
  assert.match(route, /if \(!committed\[0\]\?\.meta\.changes\)/);
  assert.match(route, /const ownsFeedback = "EXISTS\(SELECT 1 FROM viewings/);
  assert.match(route, /status='Completed' AND feedback=\? AND COALESCE\(interest_level,''\)=\?/);
  assert.match(route, /This viewing feedback changed while you were updating it/);
});

test("only one concurrent viewing transition token can own the original state", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE viewings(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,status TEXT NOT NULL,transition_token TEXT,updated_at TEXT)");
  db.prepare("INSERT INTO viewings VALUES(?,?,?,?,?)").run("viewing", "agency", "Requested", null, "2026-09-27T10:00:00.000Z");
  const claim = db.prepare("UPDATE viewings SET status=?,transition_token=?,updated_at=? WHERE id=? AND agency_id=? AND status=?");
  assert.equal(claim.run("Confirmed", "winner", "2026-09-27T11:00:00.000Z", "viewing", "agency", "Requested").changes, 1);
  assert.equal(claim.run("Cancelled", "loser", "2026-09-27T11:00:00.001Z", "viewing", "agency", "Requested").changes, 0);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM viewings WHERE id=? AND agency_id=? AND status=? AND transition_token=?").get("viewing", "agency", "Confirmed", "winner").count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM viewings WHERE id=? AND agency_id=? AND status=? AND transition_token=?").get("viewing", "agency", "Cancelled", "loser").count, 0);
  db.close();
});

test("only one concurrent feedback mutation can own the previous values", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE viewings(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,status TEXT NOT NULL,feedback TEXT NOT NULL,interest_level TEXT,transition_token TEXT,updated_at TEXT)");
  db.prepare("INSERT INTO viewings VALUES(?,?,?,?,?,?,?)").run("viewing", "agency", "Completed", "Old feedback", "unsure", null, "2026-09-27T10:00:00.000Z");
  const claim = db.prepare("UPDATE viewings SET feedback=?,interest_level=?,transition_token=?,updated_at=? WHERE id=? AND agency_id=? AND status='Completed' AND feedback=? AND COALESCE(interest_level,'')=?");
  assert.equal(claim.run("Strong interest", "interested", "winner", "2026-09-27T11:00:00.000Z", "viewing", "agency", "Old feedback", "unsure").changes, 1);
  assert.equal(claim.run("Not interested", "not_interested", "loser", "2026-09-27T11:00:00.001Z", "viewing", "agency", "Old feedback", "unsure").changes, 0);
  assert.deepEqual({ ...db.prepare("SELECT feedback,interest_level,transition_token FROM viewings WHERE id=?").get("viewing") }, { feedback: "Strong interest", interest_level: "interested", transition_token: "winner" });
  db.close();
});
