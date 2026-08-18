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

test("a brand-new agency completes the daily-value journey from four launch inputs", async () => {
  const db = await database();
  const agency = "agency-new", user = "principal-new", property = "property-new";
  const now = "2026-08-18T08:00:00.000Z", responseDue = "2026-08-18T08:30:00.000Z";

  db.exec("BEGIN");
  db.prepare("INSERT INTO agencies(id,name,slug) VALUES(?,?,?)").run(agency, "Moyo & Co", "moyo-co");
  db.prepare("INSERT INTO agency_memberships(id,agency_id,user_id,email,role) VALUES(?,?,?,?,?)").run("member-new", agency, user, "tariro@moyo.co.zw", "principal");
  db.prepare("INSERT INTO agency_settings(agency_id,phone,onboarding_complete) VALUES(?,?,1)").run(agency, "+263771234567");
  db.prepare("INSERT INTO media_assets(id,agency_id,kind,object_key,original_name,mime_type,byte_size,created_by) VALUES(?,?,?,?,?,?,?,?)").run("logo-new", agency, "agency_logo", `tenants/${agency}/media/logo.png`, "logo.png", "image/png", 2048, user);
  db.prepare("INSERT INTO properties(id,agency_id,reference,title,location,price_minor,price_label,bedrooms,bathrooms,owner_phone,land_size,description,photo_count,completeness,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(property, agency, "MC-001", "Borrowdale family home", "Borrowdale, Harare", 24500000, "US$245,000", 4, 3, "+263772000000", "2,000 m2", "Four-bedroom family home with solar and borehole.", 8, 100, user);
  for (let index = 0; index < 8; index++) db.prepare("INSERT INTO media_assets(id,agency_id,property_id,kind,object_key,original_name,mime_type,byte_size,created_by) VALUES(?,?,?,?,?,?,?,?,?)").run(`photo-${index}`, agency, property, "property_photo", `tenants/${agency}/media/photo-${index}.webp`, `${index}.webp`, "image/webp", 35000, user);
  db.prepare("INSERT INTO mandates(id,agency_id,property_id,type,starts_at,expires_at,created_by) VALUES(?,?,?,?,?,?,?)").run("mandate-new", agency, property, "Exclusive", now, "2027-02-18", user);
  for (const key of ["ownership", "mandate", "address", "price"]) db.prepare("INSERT INTO property_verification_items(id,agency_id,property_id,item_key,verified,verified_by,verified_at) VALUES(?,?,?,?,1,?,?)").run(`verify-${key}`, agency, property, key, user, now);
  db.prepare("UPDATE properties SET status='Available',mandate_id='mandate-new' WHERE id=? AND agency_id=?").run(property, agency);
  db.prepare("INSERT INTO property_activation_channels(id,agency_id,property_id,channel,status,activated_at) VALUES(?,?,?,?,?,?)").run("channel-web", agency, property, "website", "active", now);
  db.prepare("INSERT INTO property_status_events(id,agency_id,property_id,from_status,to_status,actor_user_id,created_at) VALUES(?,?,?,?,?,?,?)").run("history-live", agency, property, "Draft", "Available", user, now);
  db.exec("COMMIT");

  const contact = "contact-new", enquiry = "enquiry-new";
  db.prepare("INSERT INTO contacts(id,agency_id,full_name,phone_e164,email_normalized,roles,created_by) VALUES(?,?,?,?,?,?,?)").run(contact, agency, "Nyasha Dube", "+263773333333", "nyasha@example.com", '["buyer"]', user);
  db.prepare("INSERT INTO enquiries(id,agency_id,property_id,contact_id,assigned_user_id,stage,contact_name,initials,property_label,status,source,response_due_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(enquiry, agency, property, contact, user, "New", "Nyasha Dube", "ND", "Borrowdale family home", "New", "Website", responseDue, now);
  db.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,assigned_user_id) VALUES(?,?,?,?,?,?,?,?,?)").run("respond-new", agency, "enquiry", enquiry, "respond", "Respond to website enquiry", "urgent", responseDue, user);
  db.prepare("UPDATE enquiries SET status='Contacted',stage='Contacted',contacted_at='2026-08-18T08:12:00.000Z' WHERE id=? AND agency_id=?").run(enquiry, agency);
  db.prepare("UPDATE next_actions SET status='complete',completed_at='2026-08-18T08:12:00.000Z' WHERE id=? AND agency_id=?").run("respond-new", agency);
  db.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,due_at,assigned_user_id) VALUES(?,?,?,?,?,?,?,?)").run("followup-new", agency, "enquiry", enquiry, "follow_up", "Follow up after first contact", "2026-08-19T08:00:00.000Z", user);
  db.prepare("INSERT INTO viewings(id,agency_id,property_id,enquiry_id,contact_id,assigned_user_id,starts_at,ends_at,status,feedback,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run("viewing-new", agency, property, enquiry, contact, user, "2026-08-20T10:00:00.000Z", "2026-08-20T10:45:00.000Z", "Completed", "Buyer requested an offer pack.", user);
  db.prepare("INSERT INTO offers(id,agency_id,property_id,contact_id,amount_minor,currency,status,conditions,created_by) VALUES(?,?,?,?,?,?,?,?,?)").run("offer-new", agency, property, contact, 24000000, "USD", "submitted", "Subject to inspection", user);
  db.prepare("INSERT INTO seller_access_grants(id,agency_id,property_id,email,token_hash,expires_at,accepted_user_id,accepted_at,invited_by) VALUES(?,?,?,?,?,?,?,?,?)").run("grant-new", agency, property, "seller@example.com", "hash-new", "2026-09-01", "seller-new", "2026-08-18", user);
  db.prepare("INSERT INTO seller_reports(id,agency_id,property_id,period_start,period_end,views,enquiries,viewings,offers,momentum,summary,recommended_action,status,pdf_object_key,created_by,approved_by,approved_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("report-new", agency, property, "2026-08-01", "2026-08-18", 148, 1, 1, 1, "Offer activity", "Verified live listing activity.", "Review the submitted offer.", "approved", `tenants/${agency}/seller-reports/report-new.pdf`, user, user, "2026-08-18");
  for (const [id, action, type, resource] of [["a1", "agency.onboarded", "agency", agency], ["a2", "property.activated", "property", property], ["a3", "enquiry.created", "enquiry", enquiry], ["a4", "viewing.completed", "viewing", "viewing-new"], ["a5", "seller.report.approved", "seller_report", "report-new"]]) db.prepare("INSERT INTO audit_logs(id,agency_id,actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?,?,?)").run(id, agency, user, action, type, resource);

  assert.equal(db.prepare("SELECT COUNT(*) count FROM properties WHERE agency_id=? AND status='Available'").get(agency).count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM contacts WHERE agency_id=? AND phone_e164=?").get(agency, "+263773333333").count, 1);
  assert.equal((Date.parse(responseDue) - Date.parse(now)) / 60000, 30);
  assert.equal(db.prepare("SELECT status FROM viewings WHERE id=? AND agency_id=?").get("viewing-new", agency).status, "Completed");
  assert.equal(db.prepare("SELECT offers FROM seller_reports WHERE id=? AND agency_id=? AND status='approved'").get("report-new", agency).offers, 1);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM audit_logs WHERE agency_id=?").get(agency).count, 5);
});
