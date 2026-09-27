import { env } from "cloudflare:workers";
import { logApiRequest, requireApiCredential } from "../../../../db/api-auth";
import { prepareDomainEvent, processAutomationEvents } from "../../../../db/automation";
import { reminderTime, validViewingWindow } from "../../../../db/viewing-policy";
import { applyFieldMap, clean, idempotent, prepareApiAudit, prepareRemember } from "../../../../db/public-api";

const route = "/api/v1/viewings";

export async function GET(request: Request) {
  let credential: any;
  try {
    credential = await requireApiCredential(request, "viewings:read");
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") || "";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
    const rows = await env.DB.prepare("SELECT id,property_id propertyId,enquiry_id enquiryId,contact_id contactId,assigned_user_id assignedUserId,starts_at startsAt,ends_at endsAt,status,notes,feedback,interest_level interestLevel,created_at createdAt,updated_at updatedAt FROM viewings WHERE agency_id=? AND id>? ORDER BY id LIMIT ?").bind(credential.agencyId, cursor, limit + 1).all<any>();
    const hasMore = rows.results.length > limit;
    const items = rows.results.slice(0, limit);
    await logApiRequest(credential, route, "GET", 200);
    return Response.json({ data: items, nextCursor: hasMore ? items.at(-1)?.id : null }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (credential) await logApiRequest(credential, route, "GET", 400);
    return Response.json({ error: error instanceof Error ? error.message : "API request failed." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  let credential: any, keyHash = "";
  try {
    credential = await requireApiCredential(request, "viewings:write");
    const replay = await idempotent(credential, route, request.headers.get("idempotency-key") || "");
    keyHash = replay.keyHash;
    if (replay.existing) return new Response(replay.existing.body, { status: replay.existing.status, headers: { "content-type": "application/json", "x-idempotent-replay": "true" } });

    const body = applyFieldMap(await request.json());
    const propertyId = clean(body.propertyId, 100);
    const enquiryId = clean(body.enquiryId, 100) || null;
    let contactId = clean(body.contactId, 100) || null;
    const startsAt = clean(body.startsAt, 40);
    const endsAt = clean(body.endsAt, 40);
    const notes = clean(body.notes, 800);
    if (!propertyId || !validViewingWindow(startsAt, endsAt)) throw new Error("Choose a valid property and viewing time.");

    const listing = await env.DB.prepare("SELECT id,title,listing_agent_id listingAgentId FROM properties WHERE id=? AND agency_id=? AND status='Available'").bind(propertyId, credential.agencyId).first<any>();
    if (!listing) throw new Error("Published property was not found.");
    if (enquiryId) {
      const enquiry = await env.DB.prepare("SELECT property_id propertyId,contact_id contactId FROM enquiries WHERE id=? AND agency_id=?").bind(enquiryId, credential.agencyId).first<any>();
      if (!enquiry || (enquiry.propertyId && enquiry.propertyId !== propertyId) || (contactId && enquiry.contactId && enquiry.contactId !== contactId)) throw new Error("The enquiry does not belong to this property or client.");
      contactId ||= enquiry.contactId || null;
    }
    if (contactId && !await env.DB.prepare("SELECT id FROM contacts WHERE id=? AND agency_id=?").bind(contactId, credential.agencyId).first()) throw new Error("Client is outside this agency.");

    const explicitAssignee = clean(body.assignedUserId, 100);
    const requestedAssignee = explicitAssignee || listing.listingAgentId || "";
    let assignee = requestedAssignee ? await env.DB.prepare("SELECT user_id userId FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(credential.agencyId, requestedAssignee).first<any>() : null;
    if (explicitAssignee && !assignee) throw new Error("Assigned agent is outside this agency.");
    assignee ||= await env.DB.prepare("SELECT user_id userId FROM agency_memberships WHERE agency_id=? AND role IN ('principal','admin','agent') ORDER BY CASE role WHEN 'principal' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,created_at LIMIT 1").bind(credential.agencyId).first<any>();
    if (!assignee) throw new Error("Add an active agency member before booking a viewing.");
    const assignedUserId = assignee.userId;

    const start = new Date(Date.parse(startsAt)).toISOString();
    const end = new Date(Date.parse(endsAt)).toISOString();
    const conflict = await env.DB.prepare("SELECT id FROM viewings WHERE agency_id=? AND status IN ('Requested','Confirmed') AND starts_at<? AND ends_at>? AND (property_id=? OR assigned_user_id=?) LIMIT 1").bind(credential.agencyId, end, start, propertyId, assignedUserId).first();
    if (conflict) throw new Error("The property or assigned agent already has a viewing at that time.");

    const id = crypto.randomUUID();
    const reminder = reminderTime(start);
    const due = Date.parse(reminder) > Date.now() ? reminder : new Date().toISOString();
    const responseBody = JSON.stringify({ data: { id, propertyId, enquiryId, contactId, assignedUserId, startsAt: start, endsAt: end, status: "Requested", reminderAt: reminder } });
    const statements = [
      env.DB.prepare("INSERT INTO viewings(id,agency_id,property_id,enquiry_id,contact_id,assigned_user_id,starts_at,ends_at,status,notes,reminder_at,created_by) VALUES(?,?,?,?,?,?,?,?,'Requested',?,?,?)").bind(id, credential.agencyId, propertyId, enquiryId, contactId, assignedUserId, start, end, notes, reminder, `api:${credential.id}`),
      env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'viewing',?,'viewing_reminder','Prepare for scheduled viewing','normal',?,'open',?)").bind(crypto.randomUUID(), credential.agencyId, id, due, assignedUserId),
      prepareApiAudit(credential, "api.viewing.requested", "viewing", id, { propertyId, startsAt: start, assignedUserId }),
      prepareRemember(credential, route, keyHash, 201, responseBody),
    ];
    if (contactId) statements.push(env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) VALUES(?,?,?,?,?,'Viewing requested','viewing',?)").bind(crypto.randomUUID(), credential.agencyId, contactId, `api:${credential.id}`, "viewing.requested", id));
    const event = prepareDomainEvent(credential.agencyId, "viewing.requested", "viewing", id, { assignedUserId, property: listing.title, resourceType: "viewing", resourceId: id, startsAt: start, source: "Public API" });
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
