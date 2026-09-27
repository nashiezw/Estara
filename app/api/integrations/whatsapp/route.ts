import { env } from "cloudflare:workers";
import { prepareDomainEvent, processAutomationEvents } from "../../../../db/automation";
import { normalizePhone, normalizeRoles } from "../../../../db/contact-policy";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const clean = (value: unknown, max = 1000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, "0")).join("");
const sha256 = async (value: string) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
function providerReceivedAt(value: unknown) {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    const date = new Date(seconds * 1000);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}
function contactRoles(value: unknown) {
  try { return normalizeRoles(JSON.parse(typeof value === "string" ? value : "[]")); } catch { return ["buyer"] as const; }
}

type InboundMessage = { id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string } };

async function processMessage(connection: any, value: any, message: InboundMessage, payloadHash: string) {
  const providerMessageId = clean(message.id, 200);
  if (!providerMessageId) return { ignored: true, reason: "missing_message_id" };
  const previous = await env.DB.prepare("SELECT status FROM whatsapp_inbound_events WHERE provider_message_id=?").bind(providerMessageId).first<{ status: string }>();
  if (previous && previous.status !== "failed") return { duplicate: true };
  if (previous?.status === "failed") await env.DB.prepare("DELETE FROM whatsapp_inbound_events WHERE provider_message_id=? AND status='failed'").bind(providerMessageId).run();

  const phoneNumberId = clean(value?.metadata?.phone_number_id, 100);
  const senderPhone = normalizePhone(message.from);
  const senderName = clean(value?.contacts?.find((contact: any) => contact.wa_id === message.from)?.profile?.name, 100) || senderPhone || "WhatsApp contact";
  const receivedAt = providerReceivedAt(message.timestamp);
  const eventId = crypto.randomUUID();
  if (message.type !== "text" || !senderPhone) {
    await env.DB.prepare("INSERT INTO whatsapp_inbound_events(id,agency_id,connection_id,provider_message_id,phone_number_id,sender_phone,sender_name,message_text,payload_hash,status,failure_reason,received_at) VALUES(?,?,?,?,?,?,?,?,?,'ignored',?,?)")
      .bind(eventId, connection.agencyId, connection.id, providerMessageId, phoneNumberId, senderPhone, senderName, "", payloadHash, message.type !== "text" ? "unsupported_message_type" : "invalid_sender_phone", receivedAt).run();
    return { ignored: true, reason: message.type !== "text" ? "unsupported_message_type" : "invalid_sender_phone" };
  }

  const messageText = clean(message.text?.body, 2000);
  if (!messageText) {
    await env.DB.prepare("INSERT INTO whatsapp_inbound_events(id,agency_id,connection_id,provider_message_id,phone_number_id,sender_phone,sender_name,message_text,payload_hash,status,failure_reason,received_at) VALUES(?,?,?,?,?,?,?,?,?,'ignored','empty_text',?)")
      .bind(eventId, connection.agencyId, connection.id, providerMessageId, phoneNumberId, senderPhone, senderName, "", payloadHash, receivedAt).run();
    return { ignored: true, reason: "empty_text" };
  }
  const reference = messageText.toUpperCase().match(/\b[A-Z]{2,10}-\d{2,12}\b/)?.[0] || "";
  const property = reference ? await env.DB.prepare("SELECT id,title,listing_agent_id AS listingAgentId FROM properties WHERE agency_id=? AND UPPER(reference)=? AND status='Available' LIMIT 1").bind(connection.agencyId, reference).first<any>() : null;
  const member = await env.DB.prepare(`SELECT m.user_id AS userId FROM agency_memberships m
    WHERE m.agency_id=? AND m.role IN ('principal','admin','agent')
    ORDER BY CASE WHEN m.user_id=? THEN 0 WHEN m.role='principal' THEN 1 WHEN m.role='admin' THEN 2 ELSE 3 END,
      (SELECT COUNT(*) FROM enquiries e WHERE e.agency_id=m.agency_id AND e.assigned_user_id=m.user_id AND e.status='New') ASC,
      m.created_at ASC LIMIT 1`).bind(connection.agencyId, property?.listingAgentId || "").first<{ userId: string }>();
  if (!member) throw new Error("The agency has no eligible enquiry assignee.");

  const existing = await env.DB.prepare("SELECT id,full_name AS fullName,roles FROM contacts WHERE agency_id=? AND phone_e164=? LIMIT 1").bind(connection.agencyId, senderPhone).first<any>();
  const contactId = existing?.id || crypto.randomUUID();
  const conversation = existing ? await env.DB.prepare(`SELECT id,property_id AS propertyId,assigned_user_id AS assignedUserId,response_due_at AS responseDueAt
    FROM enquiries
    WHERE agency_id=? AND contact_id=? AND source='WhatsApp' AND status NOT IN ('Won','Lost','Closed')
      AND (?='' OR property_id=? OR property_id IS NULL)
    ORDER BY CASE WHEN property_id=? THEN 0 WHEN property_id IS NULL THEN 1 ELSE 2 END,created_at DESC LIMIT 1`)
    .bind(connection.agencyId, contactId, property?.id || "", property?.id || "", property?.id || "").first<any>() : null;
  const enquiryId = conversation?.id || crypto.randomUUID(), assignedUserId = conversation?.assignedUserId || member.userId;
  const settings = await env.DB.prepare("SELECT response_sla_minutes AS minutes FROM agency_settings WHERE agency_id=?").bind(connection.agencyId).first<{ minutes: number }>();
  const dueAt = new Date(Date.now() + Math.min(1440, Math.max(5, Number(settings?.minutes || 30))) * 60000).toISOString();
  const roles = JSON.stringify(normalizeRoles([...(existing ? contactRoles(existing.roles) : []), "buyer"]));
  const contactName = clean(existing?.fullName, 100) || senderName;
  const initials = contactName.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "WA";
  const statements = [];
  if (existing) statements.push(env.DB.prepare("UPDATE contacts SET roles=?,requirements=CASE WHEN TRIM(requirements)='' THEN ? ELSE requirements END,assigned_user_id=COALESCE(assigned_user_id,?),updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(roles, messageText, assignedUserId, contactId, connection.agencyId));
  else statements.push(env.DB.prepare("INSERT INTO contacts(id,agency_id,full_name,phone_e164,roles,requirements,assigned_user_id,created_by) VALUES(?,?,?,?,?,?,?,'whatsapp-cloud')").bind(contactId, connection.agencyId, senderName, senderPhone, roles, messageText, assignedUserId));
  if (conversation) {
    if (property && !conversation.propertyId) statements.push(env.DB.prepare("UPDATE enquiries SET property_id=?,property_label=?,assigned_user_id=? WHERE id=? AND agency_id=? AND property_id IS NULL").bind(property.id, property.title, assignedUserId, enquiryId, connection.agencyId));
    const openResponse = await env.DB.prepare("SELECT id FROM next_actions WHERE agency_id=? AND resource_type='enquiry' AND resource_id=? AND action_type='respond' AND status='open' LIMIT 1").bind(connection.agencyId, enquiryId).first();
    if (!openResponse) statements.push(env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'enquiry',?,'respond',?,'high',?,'open',?)").bind(crypto.randomUUID(), connection.agencyId, enquiryId, `Reply to new WhatsApp message from ${contactName}`, dueAt, assignedUserId));
  } else {
    statements.push(
      env.DB.prepare("INSERT INTO enquiries(id,agency_id,property_id,contact_id,assigned_user_id,stage,contact_name,initials,property_label,status,source,response_due_at,created_at) VALUES(?,?,?,?,?,'New',?,?,?,'New','WhatsApp',?,?)").bind(enquiryId, connection.agencyId, property?.id || null, contactId, assignedUserId, contactName, initials, property?.title || (reference ? `Property ${reference}` : "General property enquiry"), dueAt, receivedAt),
      env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'enquiry',?,'respond',?,'high',?,'open',?)").bind(crypto.randomUUID(), connection.agencyId, enquiryId, `Respond to WhatsApp enquiry from ${contactName}`, dueAt, assignedUserId),
    );
  }
  statements.push(
    env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) VALUES(?,?,?,?,? ,?,'enquiry',?)").bind(crypto.randomUUID(), connection.agencyId, contactId, "whatsapp-cloud", "enquiry.whatsapp_received", messageText, enquiryId),
    env.DB.prepare("INSERT INTO whatsapp_inbound_events(id,agency_id,connection_id,provider_message_id,phone_number_id,sender_phone,sender_name,message_text,payload_hash,property_id,contact_id,enquiry_id,status,received_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?, 'processed',?)").bind(eventId, connection.agencyId, connection.id, providerMessageId, phoneNumberId, senderPhone, senderName, messageText, payloadHash, property?.id || null, contactId, enquiryId, receivedAt),
    env.DB.prepare("INSERT INTO audit_logs(id,agency_id,actor_user_id,action,resource_type,resource_id,detail) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(), connection.agencyId, "whatsapp-cloud", conversation ? "enquiry.whatsapp_message_received" : "enquiry.whatsapp_received", "enquiry", enquiryId, JSON.stringify({ providerMessageId, propertyId: property?.id || conversation?.propertyId || null, assignedUserId, responseDueAt: conversation?.responseDueAt || dueAt, continued: Boolean(conversation) }))
  );
  const event = prepareDomainEvent(connection.agencyId, conversation ? "enquiry.whatsapp_message_received" : "enquiry.created", "enquiry", enquiryId, { name: contactName, property: property?.title || "General property enquiry", assignedUserId, resourceType: "enquiry", resourceId: enquiryId, responseDueAt: conversation?.responseDueAt || dueAt, source: "WhatsApp" });
  statements.push(event.statement);
  await env.DB.batch(statements);
  try { await processAutomationEvents(connection.agencyId, assignedUserId); } catch {}
  return { enquiryId, responseDueAt: conversation?.responseDueAt || dueAt, continued: Boolean(conversation) };
}

export async function GET(request: Request) {
  const config = env as unknown as { WHATSAPP_VERIFY_TOKEN?: string };
  const params = new URL(request.url).searchParams;
  if (params.get("hub.mode") !== "subscribe" || !config.WHATSAPP_VERIFY_TOKEN || !safeEqual(params.get("hub.verify_token") || "", config.WHATSAPP_VERIFY_TOKEN)) return new Response("Forbidden", { status: 403 });
  return new Response(params.get("hub.challenge") || "", { status: 200, headers: { "content-type": "text/plain" } });
}

export async function POST(request: Request) {
  const config = env as unknown as { WHATSAPP_APP_SECRET?: string };
  if (!config.WHATSAPP_APP_SECRET) return Response.json({ error: "WhatsApp webhook is not configured." }, { status: 503 });
  const raw = await request.text(), signature = request.headers.get("x-hub-signature-256") || "";
  const expected = `sha256=${await hmac(config.WHATSAPP_APP_SECRET, raw)}`;
  if (!safeEqual(signature, expected)) return Response.json({ error: "Invalid WhatsApp signature." }, { status: 401 });
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return Response.json({ error: "Invalid JSON payload." }, { status: 400 }); }
  if (payload?.object !== "whatsapp_business_account") return Response.json({ received: true, ignored: true });
  const payloadHash = await sha256(raw), outcomes = [];
  for (const entry of payload.entry || []) for (const change of entry.changes || []) {
    const value = change?.value, phoneNumberId = clean(value?.metadata?.phone_number_id, 100);
    if (!phoneNumberId || !Array.isArray(value?.messages)) continue;
    const connection = await env.DB.prepare("SELECT id,agency_id AS agencyId FROM integration_connections WHERE kind='messaging' AND provider='whatsapp_cloud' AND status='active' AND json_extract(configuration,'$.phoneNumberId')=? LIMIT 1").bind(phoneNumberId).first<any>();
    if (!connection) { outcomes.push({ ignored: true, reason: "unmapped_phone_number" }); continue; }
    for (const message of value.messages as InboundMessage[]) {
      try {
        outcomes.push(await processMessage(connection, value, message, payloadHash));
      } catch {
        const providerMessageId = clean(message.id, 200);
        if (providerMessageId) {
          const committed = await env.DB.prepare("SELECT status FROM whatsapp_inbound_events WHERE provider_message_id=?").bind(providerMessageId).first<{ status: string }>();
          if (committed && committed.status !== "failed") { outcomes.push({ duplicate: true }); continue; }
          const senderPhone = normalizePhone(message.from);
          const senderName = clean(value?.contacts?.find((contact: any) => contact.wa_id === message.from)?.profile?.name, 100) || senderPhone || "WhatsApp contact";
          const receivedAt = providerReceivedAt(message.timestamp);
          await env.DB.prepare("INSERT OR IGNORE INTO whatsapp_inbound_events(id,agency_id,connection_id,provider_message_id,phone_number_id,sender_phone,sender_name,message_text,payload_hash,status,failure_reason,received_at) VALUES(?,?,?,?,?,?,?,?,?,'failed','processing_failed',?)")
            .bind(crypto.randomUUID(), connection.agencyId, connection.id, providerMessageId, phoneNumberId, senderPhone, senderName, clean(message.text?.body, 2000), payloadHash, receivedAt).run();
        }
        return Response.json({ error: "WhatsApp message processing failed." }, { status: 500 });
      }
    }
  }
  return Response.json({ received: true, processed: outcomes.filter((result: any) => result.enquiryId).length, created: outcomes.filter((result: any) => result.enquiryId && !result.continued).length, continued: outcomes.filter((result: any) => result.continued).length, duplicates: outcomes.filter((result: any) => result.duplicate).length, ignored: outcomes.filter((result: any) => result.ignored).length });
}
