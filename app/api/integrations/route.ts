import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { CONNECTOR_PRESETS, DEFAULT_FIELD_MAPS, runConnectionSync } from "../../../db/connectors";
import { PlanLimitError, requireEntitlement, resolveAgencyPlan } from "../../../db/entitlements";
import { requireWorkspace } from "../../../db/workspace";

const clean = (v: unknown, n = 500) => typeof v === "string" ? v.trim().slice(0, n) : "";
const safe = <T,>(value: string | null | undefined, fallback: T): T => { try { return JSON.parse(value || "") as T; } catch { return fallback; } };
const publicConfiguration = (value: string | null | undefined) => { const configuration = safe<Record<string, unknown>>(value, {}); delete configuration.bearerToken; return configuration; };
const providers = Object.fromEntries(Object.values(CONNECTOR_PRESETS).map(x => [x.kind, { ...(Object.fromEntries(Object.values(CONNECTOR_PRESETS).filter(y => y.kind === x.kind).map(y => [y.provider, y.label]))) }]));
const entitlementFor = (kind: string) => kind === "accounting" ? "accountingIntegrations" : "propertyPortalIntegrations";
class IntegrationConflictError extends Error {}
async function context() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const workspace = await requireWorkspace(user);
  await requirePermission(workspace, "integration.manage");
  const plan = await resolveAgencyPlan(workspace.agencyId, user.userId);
  return { user, workspace, plan };
}
const fail = (e: unknown) => {
  const phoneClaimConflict = e instanceof Error && e.message.includes("idx_whatsapp_routable_phone_number");
  const connectionConflict = e instanceof Error && e.message.includes("idx_integration_connection");
  const error = phoneClaimConflict ? "This WhatsApp phone number is already connected to an agency." : connectionConflict ? "This agency already has this integration connected or awaiting approval." : e instanceof Error ? e.message : "Integration operation failed.";
  return Response.json({ error }, { status: e instanceof AuthorizationError ? 403 : e instanceof PlanLimitError ? 402 : e instanceof IntegrationConflictError || phoneClaimConflict || connectionConflict ? 409 : 400 });
};

export async function GET() {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const [connections, runs, maps] = await Promise.all([
      env.DB.prepare("SELECT id,kind,provider,status,configuration,approved_by approvedBy,approved_at approvedAt,last_sync_at lastSyncAt,created_at createdAt FROM integration_connections WHERE agency_id=? ORDER BY created_at DESC").bind(c.workspace.agencyId).all<any>(),
      env.DB.prepare("SELECT id,connection_id connectionId,direction,resource_type resourceType,status,records_read recordsRead,records_written recordsWritten,failure_reason failureReason,idempotency_key idempotencyKey,started_at startedAt,completed_at completedAt FROM integration_sync_runs WHERE agency_id=? ORDER BY started_at DESC LIMIT 100").bind(c.workspace.agencyId).all<any>(),
      env.DB.prepare("SELECT id,connection_id connectionId,name,resource_type resourceType,direction,mapping,updated_at updatedAt FROM integration_field_maps WHERE agency_id=? ORDER BY updated_at DESC").bind(c.workspace.agencyId).all<any>()
    ]);
    return Response.json({
      providers, presets: CONNECTOR_PRESETS, defaultFieldMaps: DEFAULT_FIELD_MAPS,
      eligibility: { property_portal: c.plan.entitlements.propertyPortalIntegrations === true, accounting: c.plan.entitlements.accountingIntegrations === true, website: c.plan.entitlements.propertyPortalIntegrations === true, crm: c.plan.entitlements.propertyPortalIntegrations === true },
      planName: c.plan.planName,
      connections: connections.results.map(x => ({ ...x, configuration: publicConfiguration(x.configuration) })),
      fieldMaps: maps.results.map(x => ({ ...x, mapping: safe(x.mapping, {}) })),
      runs: runs.results
    });
  } catch (e) { return fail(e); }
}

export async function POST(request: Request) {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const b = await request.json(), presetKey = clean(b.preset, 50), preset = (CONNECTOR_PRESETS as any)[presetKey] || Object.values(CONNECTOR_PRESETS).find(x => x.provider === clean(b.provider, 50));
    if (!preset) throw new Error("Choose a supported integration bridge.");
    await requireEntitlement(c.workspace.agencyId, c.user.userId, entitlementFor(preset.kind) as any);
    const phoneNumberId = clean(b.phoneNumberId, 100), businessAccountId = clean(b.businessAccountId, 100);
    if (preset.provider === "whatsapp_cloud" && !phoneNumberId) throw new Error("WhatsApp phone number ID is required.");
    const existing = await env.DB.prepare("SELECT id,status FROM integration_connections WHERE agency_id=? AND kind=? AND provider=? LIMIT 1").bind(c.workspace.agencyId, preset.kind, preset.provider).first<{ id: string; status: string }>();
    if (existing && existing.status !== "disabled") throw new IntegrationConflictError("This agency already has this integration connected or awaiting approval.");
    const duplicatePhone = preset.provider === "whatsapp_cloud" ? await env.DB.prepare("SELECT 1 FROM integration_connections WHERE provider='whatsapp_cloud' AND status IN ('pending','active') AND json_extract(configuration,'$.phoneNumberId')=? AND id<>?").bind(phoneNumberId, existing?.id || "").first() : null;
    if (duplicatePhone) throw new IntegrationConflictError("This WhatsApp phone number is already connected to an agency.");
    const id = existing?.id || crypto.randomUUID(), config = { sourceUrl: clean(b.sourceUrl, 600), destinationUrl: clean(b.destinationUrl, 600), bearerToken: clean(b.bearerToken, 300), phoneNumberId, businessAccountId };
    if (existing) {
      const reconfigured = await env.DB.prepare("UPDATE integration_connections SET status='pending',configuration=?,approved_by=NULL,approved_at=NULL,created_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status='disabled'").bind(JSON.stringify(config), c.user.userId, id, c.workspace.agencyId).run();
      if (!reconfigured.meta.changes) throw new IntegrationConflictError("This integration changed while it was being reconfigured. Refresh and try again.");
      await writeAudit(c.workspace, "integration.connection_reconfigured", "integration_connection", id, { kind: preset.kind, provider: preset.provider });
      return Response.json({ id, status: "pending", reconfigured: true });
    }
    await env.DB.prepare("INSERT INTO integration_connections(id,agency_id,kind,provider,status,configuration,created_by) VALUES(?,?,?,?, 'pending',?,?)").bind(id, c.workspace.agencyId, preset.kind, preset.provider, JSON.stringify(config), c.user.userId).run();
    await writeAudit(c.workspace, "integration.connection_created", "integration_connection", id, { kind: preset.kind, provider: preset.provider });
    return Response.json({ id, status: "pending", reconfigured: false }, { status: 201 });
  } catch (e) { return fail(e); }
}

export async function PATCH(request: Request) {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const b = await request.json(), id = clean(b.id), action = clean(b.action, 30), row = await env.DB.prepare("SELECT id,kind,provider,status FROM integration_connections WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).first<any>();
    if (!row) throw new Error("Integration connection was not found.");
    if (action === "approve") {
      await requireEntitlement(c.workspace.agencyId, c.user.userId, entitlementFor(row.kind) as any);
      if (row.status !== "pending") throw new IntegrationConflictError("Only a pending integration can be approved.");
      const approved = await env.DB.prepare("UPDATE integration_connections SET status='active',approved_by=?,approved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status='pending'").bind(c.user.userId, id, c.workspace.agencyId).run();
      if (!approved.meta.changes) throw new IntegrationConflictError("This integration changed while it was being approved. Refresh and try again.");
      await writeAudit(c.workspace, "integration.connection_approved", "integration_connection", id, { kind: row.kind });
      return Response.json({ status: "active" });
    }
    if (action === "disable") {
      await env.DB.prepare("UPDATE integration_connections SET status='disabled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).run();
      await writeAudit(c.workspace, "integration.connection_disabled", "integration_connection", id, { kind: row.kind });
      return Response.json({ status: "disabled" });
    }
    if (action === "save_field_map") {
      const mapId = clean(b.mapId, 100) || crypto.randomUUID(), name = clean(b.name, 100) || "Default mapping", resourceType = clean(b.resourceType, 30) || "contacts", direction = clean(b.direction, 20) || "pull";
      const mapping = typeof b.mapping === "object" && b.mapping ? b.mapping : {};
      await env.DB.prepare("INSERT OR REPLACE INTO integration_field_maps(id,agency_id,connection_id,name,resource_type,direction,mapping,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").bind(mapId, c.workspace.agencyId, id, name, resourceType, direction, JSON.stringify(mapping), c.user.userId).run();
      await writeAudit(c.workspace, "integration.field_map_saved", "integration_field_map", mapId, { connectionId: id, resourceType, direction });
      return Response.json({ id: mapId, saved: true });
    }
    if (action === "sync") return Response.json(await runConnectionSync(c.workspace.agencyId, id, clean(b.direction, 10) === "pull" ? "pull" : "push", clean(b.resourceType, 30) || "properties"));
    throw new Error("Unknown integration action.");
  } catch (e) { return fail(e); }
}
