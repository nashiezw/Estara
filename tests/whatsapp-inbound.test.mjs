import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("WhatsApp inbound ledger enforces provider idempotency and tenant ownership", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys=ON; CREATE TABLE agencies(id TEXT PRIMARY KEY); CREATE TABLE integration_connections(id TEXT PRIMARY KEY); CREATE TABLE properties(id TEXT PRIMARY KEY); CREATE TABLE contacts(id TEXT PRIMARY KEY); CREATE TABLE enquiries(id TEXT PRIMARY KEY);");
  database.exec(await read("../drizzle/0039_whatsapp_inbound.sql"));
  database.exec("INSERT INTO agencies VALUES('agency-a'); INSERT INTO integration_connections VALUES('connection-a');");
  const insert = "INSERT INTO whatsapp_inbound_events(id,agency_id,connection_id,provider_message_id,phone_number_id,sender_phone,payload_hash,received_at) VALUES(?,?,?,?,?,?,?,?)";
  database.prepare(insert).run("event-a", "agency-a", "connection-a", "wamid.1", "phone-1", "+263771234567", "hash", "2026-09-26T08:00:00Z");
  assert.throws(() => database.prepare(insert).run("event-b", "agency-a", "connection-a", "wamid.1", "phone-1", "+263771234567", "hash", "2026-09-26T08:00:01Z"), /UNIQUE/);
  assert.throws(() => database.prepare(insert).run("event-c", "missing", "connection-a", "wamid.2", "phone-1", "+263771234567", "hash", "2026-09-26T08:00:02Z"), /FOREIGN KEY/);
  database.prepare("UPDATE whatsapp_inbound_events SET status='failed',failure_reason='processing_failed' WHERE provider_message_id=?").run("wamid.1");
  assert.equal(database.prepare("DELETE FROM whatsapp_inbound_events WHERE provider_message_id=? AND status='failed'").run("wamid.1").changes, 1);
  database.prepare(insert).run("event-retry", "agency-a", "connection-a", "wamid.1", "phone-1", "+263771234567", "hash-2", "2026-09-26T08:00:03Z");
  const retried = database.prepare("SELECT id,status FROM whatsapp_inbound_events WHERE provider_message_id=?").get("wamid.1");
  assert.equal(retried.id, "event-retry");
  assert.equal(retried.status, "processed");
});

test("WhatsApp phone routing has one pending or active owner across agencies", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE agencies(id TEXT PRIMARY KEY);
    CREATE TABLE audit_logs(id TEXT PRIMARY KEY,agency_id TEXT,actor_user_id TEXT NOT NULL,action TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL,detail TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE integration_connections(id TEXT PRIMARY KEY,agency_id TEXT NOT NULL REFERENCES agencies(id),kind TEXT NOT NULL,provider TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',configuration TEXT NOT NULL DEFAULT '{}',approved_by TEXT,approved_at TEXT,last_sync_at TEXT,created_by TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO agencies VALUES('agency-a');
    INSERT INTO agencies VALUES('agency-b');
    INSERT INTO integration_connections(id,agency_id,kind,provider,status,configuration,created_by,created_at) VALUES
      ('active-a','agency-a','messaging','whatsapp_cloud','active','{"phoneNumberId":"phone-1"}','user-a','2026-01-02'),
      ('pending-b','agency-b','messaging','whatsapp_cloud','pending','{"phoneNumberId":"phone-1"}','user-b','2026-01-01');
  `);
  database.exec(await read("../drizzle/0044_whatsapp_connection_routing.sql"));
  assert.equal(database.prepare("SELECT status FROM integration_connections WHERE id='active-a'").get().status, "active");
  assert.equal(database.prepare("SELECT status FROM integration_connections WHERE id='pending-b'").get().status, "disabled");
  assert.equal(database.prepare("SELECT action FROM audit_logs WHERE resource_id='pending-b'").get().action, "integration.connection_disabled_duplicate_phone");
  assert.throws(() => database.prepare("UPDATE integration_connections SET status='pending' WHERE id='pending-b'").run(), /UNIQUE/);
  database.prepare("UPDATE integration_connections SET configuration=? WHERE id='pending-b'").run(JSON.stringify({ phoneNumberId: "phone-2" }));
  database.prepare("UPDATE integration_connections SET status='pending' WHERE id='pending-b'").run();
  assert.equal(database.prepare("SELECT status FROM integration_connections WHERE id='pending-b'").get().status, "pending");
});

test("WhatsApp follow-up messages reuse the matching active enquiry", async () => {
  const route = await read("../app/api/integrations/whatsapp/route.ts");
  const conversationSql = route.match(/const conversation = existing \? await env\.DB\.prepare\(`([\s\S]*?)`\)/)?.[1];
  assert.ok(conversationSql, "the production conversation query should be extractable");
  const database = new DatabaseSync(":memory:");
  database.exec(`CREATE TABLE enquiries(
    id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,contact_id TEXT,source TEXT NOT NULL,status TEXT NOT NULL,
    property_id TEXT,assigned_user_id TEXT,response_due_at TEXT NOT NULL,created_at TEXT NOT NULL
  );`);
  const insert = database.prepare("INSERT INTO enquiries VALUES(?,?,?,?,?,?,?,?,?)");
  insert.run("general", "agency-a", "contact-a", "WhatsApp", "New", null, "principal", "2026-09-27T09:30:00Z", "2026-09-27T09:00:00Z");
  insert.run("exact", "agency-a", "contact-a", "WhatsApp", "Contacted", "property-a", "agent-a", "2026-09-27T08:30:00Z", "2026-09-27T08:00:00Z");
  insert.run("closed", "agency-a", "contact-a", "WhatsApp", "Closed", "property-b", "agent-b", "2026-09-27T10:30:00Z", "2026-09-27T10:00:00Z");
  insert.run("other-tenant", "agency-b", "contact-a", "WhatsApp", "New", "property-a", "other", "2026-09-27T11:30:00Z", "2026-09-27T11:00:00Z");
  assert.equal(database.prepare(conversationSql).get("agency-a", "contact-a", "property-a", "property-a", "property-a").id, "exact");
  assert.equal(database.prepare(conversationSql).get("agency-a", "contact-a", "property-b", "property-b", "property-b").id, "general");
  assert.equal(database.prepare(conversationSql).get("agency-a", "contact-a", "", "", "").id, "general");
});

test("concurrent WhatsApp messages keep one open response action", async () => {
  const [route, migration, schema] = await Promise.all([
    read("../app/api/integrations/whatsapp/route.ts"),
    read("../drizzle/0051_unique_open_enquiry_response.sql"),
    read("../db/schema.ts"),
  ]);
  const database = new DatabaseSync(":memory:");
  database.exec(`CREATE TABLE next_actions(
    id TEXT PRIMARY KEY,agency_id TEXT NOT NULL,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL,
    action_type TEXT NOT NULL,status TEXT NOT NULL,completed_at TEXT,created_at TEXT NOT NULL
  );`);
  const insert = database.prepare("INSERT INTO next_actions VALUES(?,?,?,?,?,?,?,?)");
  insert.run("first", "agency-a", "enquiry", "enquiry-a", "respond", "open", null, "2026-09-27T08:00:00Z");
  insert.run("duplicate", "agency-a", "enquiry", "enquiry-a", "respond", "open", null, "2026-09-27T08:01:00Z");
  database.exec(migration);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM next_actions WHERE agency_id='agency-a' AND resource_id='enquiry-a' AND action_type='respond' AND status='open'").get().count, 1);
  assert.equal(database.prepare("SELECT status FROM next_actions WHERE id='duplicate'").get().status, "complete");
  assert.equal(database.prepare("INSERT OR IGNORE INTO next_actions VALUES(?,?,?,?,?,?,?,?)").run("racing", "agency-a", "enquiry", "enquiry-a", "respond", "open", null, "2026-09-27T08:02:00Z").changes, 0);
  assert.match(route, /INSERT OR IGNORE INTO next_actions/);
  assert.doesNotMatch(route, /const openResponse/);
  assert.match(schema, /idx_unique_open_enquiry_response/);
  database.close();
});

test("signed WhatsApp intake creates the complete enquiry workflow", async () => {
  const [route, migration, routingMigration, integrations, client, providers, backup, schema, automation, webhooks] = await Promise.all([
    read("../app/api/integrations/whatsapp/route.ts"),
    read("../drizzle/0039_whatsapp_inbound.sql"),
    read("../drizzle/0044_whatsapp_connection_routing.sql"),
    read("../app/api/integrations/route.ts"),
    read("../app/integrations/integrations-client.tsx"),
    read("../db/production-providers.ts"),
    read("../db/backup.ts"),
    read("../db/schema.ts"),
    read("../db/automation.ts"),
    read("../db/webhooks.ts"),
  ]);
  assert.match(route, /x-hub-signature-256/);
  assert.match(route, /HMAC.*SHA-256/);
  assert.match(route, /safeEqual\(signature, expected\)/);
  assert.match(route, /WHATSAPP_VERIFY_TOKEN/);
  assert.match(route, /json_extract\(configuration,'\$\.phoneNumberId'\)=\?/);
  assert.match(route, /provider_message_id=\?/);
  assert.match(route, /previous\.status !== "failed"/);
  assert.match(route, /DELETE FROM whatsapp_inbound_events WHERE provider_message_id=\? AND status='failed'/);
  assert.match(route, /'ignored','empty_text'/);
  assert.match(route, /'failed','processing_failed'/);
  assert.match(route, /WhatsApp message processing failed/);
  assert.match(route, /providerReceivedAt/);
  assert.match(route, /contactRoles/);
  assert.match(route, /requirements=CASE WHEN TRIM\(requirements\)='' THEN \? ELSE requirements END/);
  assert.doesNotMatch(route, /SET full_name=\?,roles=\?,requirements=\?/);
  assert.match(route, /status NOT IN \('Won','Lost','Closed'\)/);
  assert.match(route, /INSERT OR IGNORE INTO next_actions/);
  assert.match(route, /enquiry\.whatsapp_message_received/);
  assert.match(route, /continued: Boolean\(conversation\)/);
  assert.match(route, /INSERT INTO contacts/);
  assert.match(route, /INSERT INTO enquiries/);
  assert.match(route, /INSERT INTO next_actions/);
  assert.match(route, /INSERT INTO contact_activities/);
  assert.match(route, /INSERT INTO audit_logs/);
  assert.match(route, /prepareDomainEvent/);
  assert.match(route, /statements\.push\(event\.statement\)[\s\S]*env\.DB\.batch\(statements\)/);
  assert.match(route, /processAutomationEvents/);
  assert.match(route, /committed && committed\.status !== "failed"/);
  assert.match(route, /agency_id=\?/g);
  assert.match(migration, /UNIQUE INDEX idx_whatsapp_provider_message/);
  assert.match(routingMigration, /UNIQUE INDEX idx_whatsapp_routable_phone_number/);
  assert.match(routingMigration, /status IN \('pending','active'\)/);
  assert.match(routingMigration, /integration\.connection_disabled_duplicate_phone/);
  assert.match(integrations, /publicConfiguration/);
  assert.match(integrations, /delete configuration\.bearerToken/);
  assert.match(integrations, /status IN \('pending','active'\).*duplicatePhone|duplicatePhone[\s\S]*status IN \('pending','active'\)/);
  assert.match(integrations, /integration\.connection_reconfigured/);
  assert.match(integrations, /IntegrationConflictError/);
  assert.match(client, /Phone number ID/);
  assert.match(client, /\/api\/integrations\/whatsapp/);
  assert.match(providers, /Meta WhatsApp Cloud API/);
  assert.match(backup, /whatsapp_inbound_events/);
  assert.match(schema, /idx_whatsapp_routable_phone_number/);
  assert.match(automation, /event: "enquiry\.whatsapp_message_received"/);
  assert.match(webhooks, /"enquiry\.whatsapp_message_received"/);
});
