import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("offer migration backfills and preserves enquiry lineage when deals are opened", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE agencies(id TEXT PRIMARY KEY);
    CREATE TABLE properties(id TEXT PRIMARY KEY, agency_id TEXT NOT NULL);
    CREATE TABLE contacts(id TEXT PRIMARY KEY, agency_id TEXT NOT NULL);
    CREATE TABLE enquiries(id TEXT PRIMARY KEY, agency_id TEXT NOT NULL, property_id TEXT, contact_id TEXT, created_at TEXT NOT NULL);
    CREATE TABLE offers(id TEXT PRIMARY KEY, agency_id TEXT NOT NULL, property_id TEXT NOT NULL, contact_id TEXT, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL DEFAULT 'submitted', conditions TEXT NOT NULL DEFAULT '', submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE deals(id TEXT PRIMARY KEY, agency_id TEXT NOT NULL, property_id TEXT NOT NULL, contact_id TEXT NOT NULL, enquiry_id TEXT, offer_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO agencies VALUES ('agency-a'),('agency-b');
    INSERT INTO properties VALUES ('property-a','agency-a'),('property-b','agency-b');
    INSERT INTO contacts VALUES ('contact-a','agency-a'),('contact-b','agency-b');
    INSERT INTO enquiries VALUES ('enquiry-a','agency-a','property-a','contact-a','2026-01-01T08:00:00Z');
    INSERT INTO offers(id,agency_id,property_id,contact_id,amount_minor,created_by,submitted_at) VALUES ('offer-legacy','agency-a','property-a','contact-a',10000,'user-a','2026-01-02T08:00:00Z');
    INSERT INTO deals VALUES ('deal-legacy','agency-a','property-a','contact-a',NULL,NULL,'2026-01-03T08:00:00Z');
  `);

  database.exec(await read("../drizzle/0042_offer_enquiry_lineage.sql"));
  assert.deepEqual(
    { ...database.prepare("SELECT enquiry_id enquiryId,offer_id offerId FROM deals WHERE id='deal-legacy'").get() },
    { enquiryId: "enquiry-a", offerId: "offer-legacy" },
  );

  database.exec(`
    INSERT INTO enquiries VALUES ('enquiry-new','agency-a','property-a','contact-a','2026-02-01T08:00:00Z');
    INSERT INTO offers(id,agency_id,property_id,contact_id,enquiry_id,amount_minor,created_by,submitted_at) VALUES ('offer-new','agency-a','property-a','contact-a','enquiry-new',20000,'user-a','2026-02-02T08:00:00Z');
    INSERT INTO deals(id,agency_id,property_id,contact_id) VALUES ('deal-new','agency-a','property-a','contact-a');
    INSERT INTO deals(id,agency_id,property_id,contact_id) VALUES ('deal-b','agency-b','property-b','contact-b');
  `);
  assert.deepEqual(
    { ...database.prepare("SELECT enquiry_id enquiryId,offer_id offerId FROM deals WHERE id='deal-new'").get() },
    { enquiryId: "enquiry-new", offerId: "offer-new" },
  );
  assert.deepEqual(
    { ...database.prepare("SELECT enquiry_id enquiryId,offer_id offerId FROM deals WHERE id='deal-b'").get() },
    { enquiryId: null, offerId: null },
  );
});

test("offer capture advances the enquiry and creates attributable follow-up work", async () => {
  const [route, client, schema, scorecard] = await Promise.all([
    read("../app/api/seller-management/route.ts"),
    read("../app/seller-operations.tsx"),
    read("../db/schema.ts"),
    read("../db/pilot-scorecard.ts"),
  ]);

  assert.match(schema, /enquiryId:text\("enquiry_id"\)\.references\(\(\)=>enquiries\.id\)/);
  assert.match(route, /WHERE id=\? AND agency_id=\? AND property_id=\?/);
  assert.match(route, /stage NOT IN \('Lost','Closed'\)/);
  assert.match(route, /INSERT INTO offers \(id,agency_id,property_id,contact_id,enquiry_id/);
  assert.match(route, /UPDATE enquiries SET stage='Offer'/);
  assert.doesNotMatch(route, /enquiries e[\s\S]*?e\.updated_at|UPDATE enquiries SET[^\n"]*updated_at/);
  assert.match(route, /action_type,reason,priority[\s\S]*offer_follow_up/);
  assert.match(route, /contact_activities[\s\S]*offer\.submitted/);
  assert.match(client, /Buyer enquiry/);
  assert.match(client, /No active enquiries for this property/);
  assert.match(client, /disabled=\{busy \|\| !hasProperty \|\| !enquiryId\}/);
  assert.match(scorecard, /COUNT\(DISTINCT enquiry_id\) AS converted FROM offers/);
  assert.doesNotMatch(scorecard, /offer_id IS NOT NULL/);
});
