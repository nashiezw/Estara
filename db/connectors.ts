import { env } from "cloudflare:workers";
import { normalizeEmail, normalizePhone, normalizeRoles } from "./contact-policy";

export const CONNECTOR_PRESETS = {
  wordpress: { label: "WordPress", kind: "website", provider: "wordpress", directions: ["pull", "push"], resources: ["properties", "contacts", "enquiries", "viewings"] },
  webflow: { label: "Webflow", kind: "website", provider: "webflow", directions: ["push"], resources: ["properties", "enquiries"] },
  custom_website: { label: "Custom agency website", kind: "website", provider: "custom_json", directions: ["pull", "push"], resources: ["properties", "contacts", "enquiries", "viewings"] },
  property_portal: { label: "Property portal", kind: "property_portal", provider: "estara_json_feed", directions: ["push"], resources: ["properties"] },
  crm: { label: "CRM", kind: "crm", provider: "generic_crm", directions: ["pull", "push"], resources: ["contacts", "enquiries", "viewings"] }
} as const;

export const DEFAULT_FIELD_MAPS = {
  wordpress: { properties: { title: "post_title", description: "post_content", priceMinor: "price_minor", location: "location" }, contacts: { fullName: "name", email: "email", phone: "phone" }, enquiries: { fullName: "your-name", email: "your-email", phone: "your-phone", requirements: "message" }, viewings: { fullName: "client_name", startsAt: "visit_start" } },
  webflow: { properties: { title: "name", description: "description", priceMinor: "price", location: "address" }, enquiries: { fullName: "lead_name", requirements: "message" } },
  custom_website: { properties: { title: "title", location: "location", priceMinor: "price" }, contacts: { fullName: "name", phone: "phone", email: "email" }, enquiries: { fullName: "name", requirements: "message" } },
  crm: { contacts: { fullName: "full_name", phone: "phone", email: "email", roles: "roles" }, enquiries: { fullName: "lead_name", requirements: "message" }, viewings: { startsAt: "starts_at", notes: "notes" } }
} as const;

const clean = (v: unknown, n = 500) => typeof v === "string" ? v.trim().slice(0, n) : "";
const safe = <T>(value: string | null | undefined, fallback: T): T => { try { return JSON.parse(value || "") as T; } catch { return fallback; } };
const list = (body: any) => Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : [];
const mapped = (row: any, map: Record<string, string>) => Object.fromEntries(Object.entries(map).map(([local, remote]) => [local, row?.[remote]]));

export function presetFor(provider: string) {
  return Object.values(CONNECTOR_PRESETS).find(x => x.provider === provider);
}

async function fieldMap(agencyId: string, connectionId: string, provider: string, resourceType: string, direction: string) {
  const saved = await env.DB.prepare("SELECT mapping FROM integration_field_maps WHERE agency_id=? AND connection_id=? AND resource_type=? AND direction=? ORDER BY updated_at DESC LIMIT 1").bind(agencyId, connectionId, resourceType, direction).first<any>();
  if (saved) return safe<Record<string, string>>(saved.mapping, {});
  return ((DEFAULT_FIELD_MAPS as any)[provider]?.[resourceType] || {}) as Record<string, string>;
}

async function startRun(agencyId: string, connectionId: string, direction: string, resourceType: string) {
  const idempotencyKey = `${direction}:${resourceType}:${new Date().toISOString().slice(0, 16)}`;
  const existing = await env.DB.prepare("SELECT id,status,records_read recordsRead,records_written recordsWritten FROM integration_sync_runs WHERE connection_id=? AND idempotency_key=?").bind(connectionId, idempotencyKey).first<any>();
  if (existing) return { id: existing.id, idempotencyKey, existing };
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO integration_sync_runs(id,agency_id,connection_id,direction,resource_type,status,idempotency_key) VALUES(?,?,?,?,?,'running',?)").bind(id, agencyId, connectionId, direction, resourceType, idempotencyKey).run();
  return { id, idempotencyKey };
}

async function pullRows(config: any) {
  const sourceUrl = clean(config.sourceUrl, 600);
  if (!sourceUrl) return [];
  const response = await fetch(sourceUrl, { headers: config.bearerToken ? { authorization: `Bearer ${clean(config.bearerToken, 300)}` } : {} });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return list(await response.json());
}

async function upsertContacts(agencyId: string, connectionId: string, provider: string, rows: any[]) {
  const map = await fieldMap(agencyId, connectionId, provider, "contacts", "pull");
  let written = 0;
  for (const raw of rows) {
    const row = mapped(raw, map), fullName = clean(row.fullName || raw.fullName || raw.name, 150), phone = normalizePhone(row.phone), email = normalizeEmail(row.email), roles = normalizeRoles(row.roles || ["buyer"]);
    if (!fullName || !phone && !email) continue;
    let existing = phone ? await env.DB.prepare("SELECT id FROM contacts WHERE agency_id=? AND phone_e164=?").bind(agencyId, phone).first<any>() : null;
    if (!existing && email) existing = await env.DB.prepare("SELECT id FROM contacts WHERE agency_id=? AND email_normalized=?").bind(agencyId, email).first<any>();
    if (existing) await env.DB.prepare("UPDATE contacts SET full_name=?,phone_e164=COALESCE(?,phone_e164),email_normalized=COALESCE(?,email_normalized),roles=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(fullName, phone || null, email || null, JSON.stringify(roles), existing.id, agencyId).run();
    else await env.DB.prepare("INSERT INTO contacts(id,agency_id,full_name,phone_e164,email_normalized,roles,created_by) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(), agencyId, fullName, phone || null, email || null, JSON.stringify(roles), `integration:${connectionId}`).run();
    written++;
  }
  return written;
}

async function pushRows(agencyId: string, config: any, resourceType: string) {
  const destinationUrl = clean(config.destinationUrl, 600);
  if (!destinationUrl) return { read: 0, written: 0 };
  const sql = resourceType === "contacts" ? "SELECT id,full_name fullName,phone_e164 phone,email_normalized email,roles,updated_at updatedAt FROM contacts WHERE agency_id=? ORDER BY updated_at DESC LIMIT 100" : "SELECT id,reference,title,location,price_minor priceMinor,status,updated_at updatedAt FROM properties WHERE agency_id=? ORDER BY updated_at DESC LIMIT 100";
  const rows = await env.DB.prepare(sql).bind(agencyId).all<any>();
  const response = await fetch(destinationUrl, { method: "POST", headers: { "content-type": "application/json", ...(config.bearerToken ? { authorization: `Bearer ${clean(config.bearerToken, 300)}` } : {}) }, body: JSON.stringify({ resourceType, data: rows.results }) });
  if (!response.ok) throw new Error(`Destination returned ${response.status}`);
  return { read: rows.results.length, written: rows.results.length };
}

export async function runConnectionSync(agencyId: string, connectionId: string, direction: "pull" | "push", resourceType = "properties") {
  const connection = await env.DB.prepare("SELECT id,kind,provider,configuration FROM integration_connections WHERE id=? AND agency_id=? AND status='active'").bind(connectionId, agencyId).first<any>();
  if (!connection) throw new Error("Active integration connection was not found.");
  const preset = presetFor(connection.provider);
  if (!preset || !(preset.directions as readonly string[]).includes(direction) || !(preset.resources as readonly string[]).includes(resourceType)) throw new Error("This connector does not support that sync.");
  const run = await startRun(agencyId, connectionId, direction, resourceType);
  if (run.existing) return { runId: run.id, status: run.existing.status, recordsRead: run.existing.recordsRead, recordsWritten: run.existing.recordsWritten, idempotent: true };
  try {
    let read = 0, written = 0;
    const config = safe<any>(connection.configuration, {});
    if (direction === "pull") {
      const rows = await pullRows(config);
      read = rows.length;
      if (resourceType === "contacts") written = await upsertContacts(agencyId, connectionId, connection.provider, rows);
    } else {
      const result = await pushRows(agencyId, config, resourceType);
      read = result.read;
      written = result.written;
    }
    await env.DB.prepare("UPDATE integration_sync_runs SET status='complete',records_read=?,records_written=?,completed_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(read, written, run.id, agencyId).run();
    await env.DB.prepare("UPDATE integration_connections SET last_sync_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(connectionId, agencyId).run();
    return { runId: run.id, status: "complete", recordsRead: read, recordsWritten: written };
  } catch (e) {
    await env.DB.prepare("UPDATE integration_sync_runs SET status='failed',failure_reason=?,completed_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(e instanceof Error ? e.message : String(e), run.id, agencyId).run();
    throw e;
  }
}
