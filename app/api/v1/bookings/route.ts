import { env } from "cloudflare:workers";
import { logApiRequest, requireApiCredential } from "../../../../db/api-auth";
import { prepareDomainEvent, processAutomationEvents } from "../../../../db/automation";
import { normalizeEmail, normalizePhone } from "../../../../db/contact-policy";
import { reminderTime, validViewingWindow } from "../../../../db/viewing-policy";
import { applyFieldMap, clean, idempotent, prepareApiAudit, prepareRemember } from "../../../../db/public-api";

const route = "/api/v1/bookings";

export async function POST(request: Request) {
  let credential: any, keyHash = "";
  try {
    credential = await requireApiCredential(request, "bookings:write");
    const replay = await idempotent(credential, route, request.headers.get("idempotency-key") || "");
    keyHash = replay.keyHash;
    if (replay.existing) return new Response(replay.existing.body, { status: replay.existing.status, headers: { "content-type": "application/json", "x-idempotent-replay": "true" } });

    const body = applyFieldMap(await request.json());
    const propertyId = clean(body.propertyId, 100);
    const startsAt = clean(body.startsAt, 40), endsAt = clean(body.endsAt, 40);
    const fullName = clean(body.fullName || body.name, 150);
    const phone = normalizePhone(body.phone) || null, email = normalizeEmail(body.email) || null;
    const notes = clean(body.notes, 800);
    if (!propertyId || !validViewingWindow(startsAt, endsAt) || !fullName || !phone && !email) throw new Error("Property, client, contact detail and a valid booking window are required.");

    const property = await env.DB.prepare("SELECT id,title,listing_agent_id listingAgentId FROM properties WHERE id=? AND agency_id=? AND status='Available'").bind(propertyId, credential.agencyId).first<any>();
    if (!property) throw new Error("Published property was not found.");
    const assignee = await env.DB.prepare(`SELECT user_id userId FROM agency_memberships
      WHERE agency_id=? AND role IN ('principal','admin','agent')
      ORDER BY CASE WHEN user_id=? THEN 0 WHEN role='principal' THEN 1 WHEN role='admin' THEN 2 ELSE 3 END,created_at LIMIT 1`)
      .bind(credential.agencyId, property.listingAgentId || "").first<{ userId: string }>();
    if (!assignee) throw new Error("Add an active agency member before accepting bookings.");

    let contact = phone ? await env.DB.prepare("SELECT id FROM contacts WHERE agency_id=? AND phone_e164=?").bind(credential.agencyId, phone).first<any>() : null;
    if (!contact && email) contact = await env.DB.prepare("SELECT id FROM contacts WHERE agency_id=? AND email_normalized=?").bind(credential.agencyId, email).first<any>();
    const contactId = contact?.id || crypto.randomUUID(), assignedUserId = assignee.userId;
    const start = new Date(Date.parse(startsAt)).toISOString(), end = new Date(Date.parse(endsAt)).toISOString();
    const conflict = await env.DB.prepare("SELECT id FROM viewings WHERE agency_id=? AND status IN ('Requested','Confirmed') AND starts_at<? AND ends_at>? AND (property_id=? OR assigned_user_id=?) LIMIT 1").bind(credential.agencyId, end, start, propertyId, assignedUserId).first();
    if (conflict) throw new Error("The property or assigned agent already has a viewing at that time.");

    const viewingId = crypto.randomUUID(), reminder = reminderTime(start);
    const due = Date.parse(reminder) > Date.now() ? reminder : new Date().toISOString();
    const responseBody = JSON.stringify({ data: { id: viewingId, propertyId, contactId, assignedUserId, startsAt: start, endsAt: end, status: "Requested", reminderAt: reminder } });
    const statements = [];
    if (!contact) statements.push(env.DB.prepare("INSERT INTO contacts(id,agency_id,full_name,phone_e164,email_normalized,roles,assigned_user_id,created_by) VALUES(?,?,?,?,?,'[\"buyer\"]',?,?)").bind(contactId, credential.agencyId, fullName, phone, email, assignedUserId, `api:${credential.id}`));
    statements.push(
      env.DB.prepare("INSERT INTO viewings(id,agency_id,property_id,contact_id,assigned_user_id,starts_at,ends_at,status,notes,reminder_at,created_by) VALUES(?,?,?,?,?,?,?,'Requested',?,?,?)").bind(viewingId, credential.agencyId, propertyId, contactId, assignedUserId, start, end, notes, reminder, `api:${credential.id}`),
      env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'viewing',?,'viewing_reminder','Prepare for requested viewing','normal',?,'open',?)").bind(crypto.randomUUID(), credential.agencyId, viewingId, due, assignedUserId),
      prepareApiAudit(credential, "api.booking.requested", "viewing", viewingId, { propertyId, contactId, startsAt: start, assignedUserId }),
      prepareRemember(credential, route, keyHash, 201, responseBody),
    );
    const event = prepareDomainEvent(credential.agencyId, "viewing.requested", "viewing", viewingId, { assignedUserId, property: property.title, resourceType: "viewing", resourceId: viewingId, startsAt: start, source: "Public API" });
    statements.push(event.statement);
    await env.DB.batch(statements);
    try { await processAutomationEvents(credential.agencyId, `api:${credential.id}`); } catch {}
    await logApiRequest(credential, route, "POST", 201);
    return new Response(responseBody, { status: 201, headers: { "content-type": "application/json" } });
  } catch (error) {
    if (credential && keyHash) {
      const replay = await env.DB.prepare("SELECT response_status status,response_body body FROM api_idempotency_keys WHERE credential_id=? AND route=? AND idempotency_key=?").bind(credential.id, route, keyHash).first<any>();
      if (replay) return new Response(replay.body, { status: replay.status, headers: { "content-type": "application/json", "x-idempotent-replay": "true" } });
    }
    if (credential) await logApiRequest(credential, route, "POST", 400);
    return Response.json({ error: error instanceof Error ? error.message : "API request failed." }, { status: 400 });
  }
}
