import { env } from "cloudflare:workers";

export const ALLOWED_WEBHOOK_EVENTS = ["property.created", "property.updated", "property.status.changed", "property.media.created", "enquiry.created", "contact.created", "contact.updated", "viewing.requested", "viewing.confirmed", "viewing.completed", "viewing.cancelled", "viewing.no_show"] as const;
const encoder = new TextEncoder();
const retryMinutes = [1, 5, 30, 120];

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");

export async function signWebhookPayload(secret: string, payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

function nextAttempt(attempts: number) {
  const minutes = retryMinutes[Math.min(retryMinutes.length - 1, Math.max(0, attempts - 1))];
  return new Date(Date.now() + minutes * 60000).toISOString();
}

async function deliver(row: any, event: { id: string; eventType: string; aggregateType: string; aggregateId: string; payload: Record<string, unknown>; createdAt?: string }, previous?: any) {
  const deliveryId = previous?.id || crypto.randomUUID();
  const body = previous?.requestBody || JSON.stringify({ id: event.id, type: event.eventType, createdAt: event.createdAt || new Date().toISOString(), data: event.payload, aggregate: { type: event.aggregateType, id: event.aggregateId } });
  const signature = previous?.signature || await signWebhookPayload(row.signingSecret, body);
  const attempts = Number(previous?.attempts || 0) + 1;
  if (!previous) await env.DB.prepare("INSERT INTO webhook_deliveries(id,agency_id,subscription_id,event_id,event_type,url,status,request_body,signature,attempts) VALUES(?,?,?,?,?,?, 'pending',?,?,0)").bind(deliveryId, row.agencyId, row.id, event.id, event.eventType, row.url, body, signature).run();
  try {
    const response = await fetch(row.url, { method: "POST", headers: { "content-type": "application/json", "user-agent": "Estara-Webhooks/1.0", "x-estara-event-id": event.id, "x-estara-delivery-id": deliveryId, "x-estara-signature": `sha256=${signature}` }, body });
    const text = (await response.text()).slice(0, 1000);
    await env.DB.prepare("UPDATE webhook_deliveries SET status=?,attempts=?,response_status=?,response_body=?,next_attempt_at=?,delivered_at=? WHERE id=? AND agency_id=?").bind(response.ok ? "delivered" : attempts >= 5 ? "dead" : "failed", attempts, response.status, text, response.ok ? null : nextAttempt(attempts), response.ok ? new Date().toISOString() : null, deliveryId, row.agencyId).run();
    return response.ok;
  } catch (error) {
    await env.DB.prepare("UPDATE webhook_deliveries SET status=?,attempts=?,response_body=?,next_attempt_at=? WHERE id=? AND agency_id=?").bind(attempts >= 5 ? "dead" : "failed", attempts, String(error).slice(0, 1000), attempts >= 5 ? null : nextAttempt(attempts), deliveryId, row.agencyId).run();
    return false;
  }
}

export async function dispatchWebhooks(agencyId: string, event: { id: string; eventType: string; aggregateType: string; aggregateId: string; payload: Record<string, unknown>; createdAt?: string }) {
  const rows = await env.DB.prepare("SELECT id,agency_id agencyId,url,events,signing_secret signingSecret FROM webhook_subscriptions WHERE agency_id=? AND status='active'").bind(agencyId).all<any>();
  for (const row of rows.results) {
    let events: string[] = [];
    try { events = JSON.parse(row.events || "[]"); } catch {}
    if (events.length && !events.includes(event.eventType)) continue;
    await deliver(row, event);
  }
}

export async function retryDueWebhooks(agencyId: string, limit = 20) {
  const rows = await env.DB.prepare("SELECT d.id,d.agency_id agencyId,d.subscription_id subscriptionId,d.event_id eventId,d.event_type eventType,d.request_body requestBody,d.signature,d.attempts,s.id,s.url,s.signing_secret signingSecret FROM webhook_deliveries d JOIN webhook_subscriptions s ON s.id=d.subscription_id AND s.agency_id=d.agency_id WHERE d.agency_id=? AND d.status='failed' AND d.next_attempt_at<=CURRENT_TIMESTAMP AND s.status='active' ORDER BY d.next_attempt_at LIMIT ?").bind(agencyId, Math.min(50, Math.max(1, limit))).all<any>();
  let delivered = 0;
  for (const row of rows.results) {
    const body = JSON.parse(row.requestBody || "{}");
    if (await deliver(row, { id: row.eventId, eventType: row.eventType, aggregateType: body.aggregate?.type || "unknown", aggregateId: body.aggregate?.id || "", payload: body.data || {}, createdAt: body.createdAt }, row)) delivered++;
  }
  return { processed: rows.results.length, delivered };
}

export async function retryAllDueWebhooks(limit = 100) {
  const rows = await env.DB.prepare("SELECT DISTINCT agency_id agencyId FROM webhook_deliveries WHERE status='failed' AND next_attempt_at<=CURRENT_TIMESTAMP ORDER BY next_attempt_at LIMIT ?").bind(Math.min(500, Math.max(1, limit))).all<any>();
  let processed = 0, delivered = 0;
  for (const row of rows.results) {
    const result = await retryDueWebhooks(row.agencyId, 25);
    processed += result.processed;
    delivered += result.delivered;
  }
  return { agencies: rows.results.length, processed, delivered };
}

export async function replayWebhookDelivery(agencyId: string, deliveryId: string) {
  const row = await env.DB.prepare("SELECT d.id,d.agency_id agencyId,d.subscription_id subscriptionId,d.event_id eventId,d.event_type eventType,d.request_body requestBody,d.signature,d.attempts,s.id,s.url,s.signing_secret signingSecret FROM webhook_deliveries d JOIN webhook_subscriptions s ON s.id=d.subscription_id AND s.agency_id=d.agency_id WHERE d.id=? AND d.agency_id=? AND s.status='active'").bind(deliveryId, agencyId).first<any>();
  if (!row) throw new Error("Replayable delivery was not found.");
  const body = JSON.parse(row.requestBody || "{}");
  const replay = { id: crypto.randomUUID(), agencyId, subscriptionId: row.subscriptionId, eventId: row.eventId, eventType: row.eventType, url: row.url, requestBody: row.requestBody, signature: row.signature, attempts: 0 };
  await env.DB.prepare("INSERT INTO webhook_deliveries(id,agency_id,subscription_id,event_id,event_type,url,status,request_body,signature,attempts) VALUES(?,?,?,?,?,?, 'pending',?,?,0)").bind(replay.id, agencyId, row.subscriptionId, row.eventId, row.eventType, row.url, row.requestBody, row.signature).run();
  await deliver(row, { id: row.eventId, eventType: row.eventType, aggregateType: body.aggregate?.type || "unknown", aggregateId: body.aggregate?.id || "", payload: body.data || {}, createdAt: body.createdAt }, replay);
  return replay.id;
}

export async function rotateWebhookSecret(agencyId: string, subscriptionId: string) {
  const secret = `whsec_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const result = await env.DB.prepare("UPDATE webhook_subscriptions SET signing_secret=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status='active'").bind(secret, subscriptionId, agencyId).run();
  if (!result.meta.changes) throw new Error("Active webhook was not found.");
  return secret;
}

export async function sendTestWebhook(agencyId: string, subscriptionId: string) {
  const row = await env.DB.prepare("SELECT id,agency_id agencyId,url,signing_secret signingSecret FROM webhook_subscriptions WHERE id=? AND agency_id=? AND status='active'").bind(subscriptionId, agencyId).first<any>();
  if (!row) throw new Error("Active webhook was not found.");
  const event = { id: crypto.randomUUID(), eventType: "property.updated", aggregateType: "property", aggregateId: "test", payload: { resourceType: "property", resourceId: "test", property: "Estara test listing", source: "Developer Portal" }, createdAt: new Date().toISOString() };
  await deliver(row, event);
  return event.id;
}
