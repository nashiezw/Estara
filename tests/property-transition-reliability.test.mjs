import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE properties(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,status TEXT NOT NULL,mutation_token TEXT);
    CREATE TABLE property_status_events(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,property_id TEXT NOT NULL,from_status TEXT NOT NULL,to_status TEXT NOT NULL);
    CREATE TABLE audit_logs(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,action TEXT NOT NULL,resource_id TEXT NOT NULL);
    CREATE TABLE domain_events(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,event_type TEXT NOT NULL,aggregate_id TEXT NOT NULL);
    CREATE TABLE property_activation_channels(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,property_id TEXT NOT NULL,channel TEXT NOT NULL,enabled INTEGER NOT NULL,status TEXT NOT NULL,activated_at TEXT,deactivated_at TEXT,UNIQUE(agency_id,property_id,channel));
    CREATE TABLE viewings(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,property_id TEXT NOT NULL,status TEXT NOT NULL);
    CREATE TABLE next_actions(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL,status TEXT NOT NULL);
  `);
  return db;
}

test("property lifecycle routes guard evidence and downstream effects with mutation ownership", async () => {
  const [workspaceRoute, detailRoute, schema, migration] = await Promise.all([
    read("../app/api/workspace/actions/route.ts"),
    read("../app/api/properties/[id]/route.ts"),
    read("../db/schema.ts"),
    read("../drizzle/0050_property_mutation_ownership.sql"),
  ]);
  assert.match(schema, /properties=sqliteTable[\s\S]*mutationToken:text\("mutation_token"\)/);
  assert.match(migration, /ALTER TABLE properties ADD COLUMN mutation_token TEXT/);
  assert.match(workspaceRoute, /This property is already published/);
  assert.match(workspaceRoute, /guardedPropertyAudit/);
  assert.match(workspaceRoute, /guardedPropertyEvent/);
  assert.match(detailRoute, /UPDATE properties SET status='Available',mutation_token=\?/);
  assert.match(detailRoute, /UPDATE properties SET status=\?,mutation_token=\?/);
  assert.match(detailRoute, /ON CONFLICT\(agency_id,property_id,channel\) DO UPDATE/);
  assert.match(detailRoute, /status='open' AND EXISTS\(SELECT 1 FROM properties/);
  assert.match(detailRoute, /if \(!result\[0\]\?\.meta\.changes\)/g);
});

test("only one draft publication owns channels, status history, audit and event evidence", () => {
  const db = database();
  db.prepare("INSERT INTO properties VALUES(?,?,?,?)").run("property", "agency", "Draft", null);
  const publish = token => {
    const mutation = db.prepare("UPDATE properties SET status='Available',mutation_token=? WHERE id='property' AND agency_id='agency' AND status='Draft'").run(token);
    db.prepare("INSERT INTO property_activation_channels(id,agency_id,property_id,channel,enabled,status) SELECT ?, 'agency','property','website',1,'active' WHERE EXISTS(SELECT 1 FROM properties WHERE id='property' AND mutation_token=?) ON CONFLICT(agency_id,property_id,channel) DO UPDATE SET enabled=1,status='active'").run(`channel-${token}`, token);
    db.prepare("INSERT INTO property_status_events SELECT ?, 'agency','property','Draft','Available' WHERE EXISTS(SELECT 1 FROM properties WHERE id='property' AND mutation_token=?)").run(`status-${token}`, token);
    db.prepare("INSERT INTO audit_logs SELECT ?, 'agency','property.published','property' WHERE EXISTS(SELECT 1 FROM properties WHERE id='property' AND mutation_token=?)").run(`audit-${token}`, token);
    db.prepare("INSERT INTO domain_events SELECT ?, 'agency','property.status.changed','property' WHERE EXISTS(SELECT 1 FROM properties WHERE id='property' AND mutation_token=?)").run(`event-${token}`, token);
    return mutation.changes;
  };
  assert.equal(publish("winner"), 1);
  assert.equal(publish("loser"), 0);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM property_activation_channels").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM property_status_events").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM audit_logs").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM domain_events").get().count, 1);
  db.close();
});

test("competing terminal transitions have one winner and retire demand once", () => {
  const db = database();
  db.prepare("INSERT INTO properties VALUES(?,?,?,?)").run("property", "agency", "Available", null);
  db.prepare("INSERT INTO viewings VALUES(?,?,?,?)").run("viewing", "agency", "property", "Confirmed");
  db.prepare("INSERT INTO next_actions VALUES(?,?,?,?,?)").run("action", "agency", "viewing", "viewing", "open");
  const transition = (status, token) => {
    const mutation = db.prepare("UPDATE properties SET status=?,mutation_token=? WHERE id='property' AND agency_id='agency' AND status='Available'").run(status, token);
    db.prepare("UPDATE viewings SET status='Cancelled' WHERE agency_id='agency' AND property_id='property' AND status IN ('Requested','Confirmed') AND EXISTS(SELECT 1 FROM properties WHERE id='property' AND mutation_token=?)").run(token);
    db.prepare("UPDATE next_actions SET status='complete' WHERE agency_id='agency' AND resource_type='viewing' AND resource_id='viewing' AND status='open' AND EXISTS(SELECT 1 FROM properties WHERE id='property' AND mutation_token=?)").run(token);
    db.prepare("INSERT INTO property_status_events SELECT ?, 'agency','property','Available',? WHERE EXISTS(SELECT 1 FROM properties WHERE id='property' AND mutation_token=?)").run(`status-${token}`, status, token);
    return mutation.changes;
  };
  assert.equal(transition("Sold", "winner"), 1);
  assert.equal(transition("Withdrawn", "loser"), 0);
  assert.equal(db.prepare("SELECT status FROM properties WHERE id='property'").get().status, "Sold");
  assert.equal(db.prepare("SELECT status FROM viewings WHERE id='viewing'").get().status, "Cancelled");
  assert.equal(db.prepare("SELECT status FROM next_actions WHERE id='action'").get().status, "complete");
  assert.equal(db.prepare("SELECT COUNT(*) count FROM property_status_events").get().count, 1);
  db.close();
});
