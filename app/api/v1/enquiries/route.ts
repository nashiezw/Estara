import { env } from "cloudflare:workers";
import { logApiRequest, requireApiCredential } from "../../../../db/api-auth";
import { prepareDomainEvent, processAutomationEvents } from "../../../../db/automation";
import { normalizeEmail, normalizePhone, normalizeRoles } from "../../../../db/contact-policy";
import { applyFieldMap, clean, idempotent, prepareApiAudit, prepareRemember } from "../../../../db/public-api";

const route = "/api/v1/enquiries";

function contactRoles(value: unknown) {
  try { return normalizeRoles(JSON.parse(typeof value === "string" ? value : "[]")); } catch { return ["buyer"] as const; }
}

export async function GET(request: Request) {
  let credential: any;
  try {
    credential = await requireApiCredential(request, "enquiries:read");
    const url = new URL(request.url), cursor = url.searchParams.get("cursor") || "", limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
    const rows = await env.DB.prepare("SELECT id,property_id propertyId,contact_id contactId,contact_name fullName,property_label property,status,stage,source,response_due_at responseDueAt,next_follow_up_at nextFollowUpAt,created_at createdAt FROM enquiries WHERE agency_id=? AND id>? ORDER BY id LIMIT ?").bind(credential.agencyId, cursor, limit + 1).all<any>();
    const hasMore = rows.results.length > limit, items = rows.results.slice(0, limit);
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
    credential = await requireApiCredential(request, "enquiries:write");
    const replay = await idempotent(credential, route, request.headers.get("idempotency-key") || "");
    keyHash = replay.keyHash;
    if (replay.existing) return new Response(replay.existing.body, { status: replay.existing.status, headers: { "content-type": "application/json", "x-idempotent-replay": "true" } });

    const body = applyFieldMap(await request.json());
    const propertyId = clean(body.propertyId, 100);
    const fullName = clean(body.fullName || body.name, 150);
    const phone = normalizePhone(body.phone) || null;
    const email = normalizeEmail(body.email) || null;
    const requirements = clean(body.requirements, 1000);
    const property = propertyId ? await env.DB.prepare("SELECT id,title,listing_agent_id listingAgentId FROM properties WHERE id=? AND agency_id=? AND status='Available'").bind(propertyId, credential.agencyId).first<any>() : null;
    if (propertyId && !property) throw new Error("Published property was not found.");
    if (!fullName || !phone && !email) throw new Error("Name and phone or email are required.");

    const member = await env.DB.prepare(`SELECT user_id userId FROM agency_memberships
      WHERE agency_id=? AND role IN ('principal','admin','agent')
      ORDER BY CASE WHEN user_id=? THEN 0 WHEN role='principal' THEN 1 WHEN role='admin' THEN 2 ELSE 3 END,created_at LIMIT 1`)
      .bind(credential.agencyId, property?.listingAgentId || "").first<{ userId: string }>();
    if (!member) throw new Error("Add an active agency member before accepting enquiries.");
    const assignedUserId = member.userId;

    let contact = phone ? await env.DB.prepare("SELECT id,roles FROM contacts WHERE agency_id=? AND phone_e164=?").bind(credential.agencyId, phone).first<any>() : null;
    if (!contact && email) contact = await env.DB.prepare("SELECT id,roles FROM contacts WHERE agency_id=? AND email_normalized=?").bind(credential.agencyId, email).first<any>();
    const contactId = contact?.id || crypto.randomUUID(), enquiryId = crypto.randomUUID();
    const settings = await env.DB.prepare("SELECT response_sla_minutes sla FROM agency_settings WHERE agency_id=?").bind(credential.agencyId).first<any>();
    const due = new Date(Date.now() + Math.min(1440, Math.max(5, Number(settings?.sla || 30))) * 60000).toISOString();
    const initials = fullName.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "EN";
    const roles = JSON.stringify(normalizeRoles([...(contact ? contactRoles(contact.roles) : []), "buyer"]));
    const responseBody = JSON.stringify({ data: { id: enquiryId, contactId, assignedUserId, responseDueAt: due } });
    const statements = [];
    if (contact) statements.push(env.DB.prepare("UPDATE contacts SET phone_e164=COALESCE(?,phone_e164),email_normalized=COALESCE(?,email_normalized),roles=?,requirements=CASE WHEN TRIM(requirements)='' THEN ? ELSE requirements END,assigned_user_id=COALESCE(assigned_user_id,?),updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(phone, email, roles, requirements, assignedUserId, contactId, credential.agencyId));
    else statements.push(env.DB.prepare("INSERT INTO contacts(id,agency_id,full_name,phone_e164,email_normalized,roles,requirements,assigned_user_id,created_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(contactId, credential.agencyId, fullName, phone, email, roles, requirements, assignedUserId, `api:${credential.id}`));
    statements.push(
      env.DB.prepare("INSERT INTO enquiries(id,agency_id,property_id,contact_id,assigned_user_id,contact_name,initials,property_label,status,stage,source,response_due_at) VALUES(?,?,?,?,?,?,?,?,'New','New','Public API',?)").bind(enquiryId, credential.agencyId, propertyId || null, contactId, assignedUserId, fullName, initials, property?.title || "General enquiry", due),
      env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'enquiry',?,'respond',?,'high',?,'open',?)").bind(crypto.randomUUID(), credential.agencyId, enquiryId, `Respond to API enquiry from ${fullName}`, due, assignedUserId),
      prepareApiAudit(credential, "api.enquiry.created", "enquiry", enquiryId, { contactId, propertyId: propertyId || null, assignedUserId }),
      prepareRemember(credential, route, keyHash, 201, responseBody),
    );
    const event = prepareDomainEvent(credential.agencyId, "enquiry.created", "enquiry", enquiryId, { name: fullName, property: property?.title || "General enquiry", assignedUserId, resourceType: "enquiry", resourceId: enquiryId, source: "Public API", responseDueAt: due });
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
