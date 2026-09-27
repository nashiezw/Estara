import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("webhook delivery migration deduplicates legacy rows and enforces event idempotency", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE webhook_deliveries (
      id TEXT PRIMARY KEY,
      agency_id TEXT NOT NULL,
      subscription_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    INSERT INTO webhook_deliveries VALUES
      ('failed-old','agency-a','subscription-a','event-a','failed',3,'2026-01-01T00:00:00Z'),
      ('delivered-new','agency-a','subscription-a','event-a','delivered',1,'2026-01-02T00:00:00Z'),
      ('other-tenant','agency-b','subscription-a','event-a','failed',1,'2026-01-03T00:00:00Z');
  `);
  db.exec(await read("../drizzle/0043_durable_event_dispatch.sql"));

  assert.deepEqual(
    db.prepare("SELECT id FROM webhook_deliveries WHERE agency_id='agency-a'").all().map((row) => ({ ...row })),
    [{ id: "delivered-new" }],
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM webhook_deliveries").get().count, 2);
  assert.throws(() => db.prepare("INSERT INTO webhook_deliveries VALUES (?,?,?,?,?,?,?)").run(
    "duplicate",
    "agency-a",
    "subscription-a",
    "event-a",
    "pending",
    0,
    "2026-01-04T00:00:00Z",
  ), /UNIQUE constraint failed/);
});

test("durable domain-event processing owns webhook fan-out and scheduled recovery", async () => {
  const [automation, webhooks, worker, schema] = await Promise.all([
    read("../db/automation.ts"),
    read("../db/webhooks.ts"),
    read("../worker/index.ts"),
    read("../db/schema.ts"),
  ]);

  const publish = automation.slice(
    automation.indexOf("export async function publishDomainEvent"),
    automation.indexOf("async function perform"),
  );
  const process = automation.slice(
    automation.indexOf("export async function processAutomationEvents"),
    automation.indexOf("export async function processAllAutomationEvents"),
  );

  assert.doesNotMatch(publish, /dispatchWebhooks/);
  assert.match(process, /await dispatchWebhooks/);
  assert.match(process, /status IN \('pending','retry'\)/);
  assert.match(automation, /export async function processAllAutomationEvents/);
  assert.match(worker, /processAllAutomationEvents/);
  assert.match(worker, /automations\.process_scheduled/);
  assert.match(webhooks, /INSERT OR IGNORE INTO webhook_deliveries/);
  assert.match(webhooks, /if \(!queued\.meta\.changes\) return true/);
  assert.match(webhooks, /status='pending'.*datetime\('now','-5 minutes'\)/);
  assert.match(schema, /idx_webhook_delivery_event_once/);
});
