import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { PlanLimitError, requireCapacity } from "../../../db/entitlements";

export const dynamic = "force-dynamic";

const clean = (v: unknown, n = 120) => String(v ?? "").trim().slice(0, n);
const truthy = (v: unknown) => v !== false && v !== "false" && v !== 0 && v !== "0";
const fail = (e: unknown) =>
  e instanceof AuthorizationError ? Response.json({ error: e.message }, { status: 403 }) :
  e instanceof PlanLimitError ? Response.json({ error: e.message }, { status: 409 }) :
  Response.json({ error: "Branches could not be processed." }, { status: 500 });

async function context(permission: "property.read" | "team.manage") {
  const user = await getChatGPTUser();
  if (!user) return null;
  const workspace = await requireWorkspace(user);
  await requirePermission(workspace, permission);
  return { user, workspace };
}

async function ensureBranchColumns() {
  const rows = await env.DB.prepare("PRAGMA table_info(branches)").all<{ name: string }>();
  const names = new Set(rows.results.map(row => row.name));
  const additions = [
    ["email", "ALTER TABLE branches ADD COLUMN email TEXT NOT NULL DEFAULT ''"],
    ["whatsapp", "ALTER TABLE branches ADD COLUMN whatsapp TEXT NOT NULL DEFAULT ''"],
    ["address", "ALTER TABLE branches ADD COLUMN address TEXT NOT NULL DEFAULT ''"],
    ["description", "ALTER TABLE branches ADD COLUMN description TEXT NOT NULL DEFAULT ''"],
    ["opening_hours", "ALTER TABLE branches ADD COLUMN opening_hours TEXT NOT NULL DEFAULT ''"],
    ["public_enabled", "ALTER TABLE branches ADD COLUMN public_enabled INTEGER NOT NULL DEFAULT 1"],
    ["updated_at", "ALTER TABLE branches ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [name, sql] of additions) if (!names.has(name)) await env.DB.prepare(sql).run();
}

export async function GET() {
  try {
    const c = await context("property.read");
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    await ensureBranchColumns();
    const agencyId = c.workspace.agencyId;
    const [rows, assignments, properties] = await Promise.all([
      env.DB.prepare(`SELECT b.id,b.name,b.location,b.phone,b.whatsapp,b.email,b.address,b.description,b.opening_hours AS openingHours,
        b.public_enabled AS publicEnabled,b.manager_user_id AS managerUserId,m.email AS managerEmail,b.active,b.created_at AS createdAt,b.updated_at AS updatedAt,
        (SELECT COUNT(*) FROM properties p WHERE p.agency_id=b.agency_id AND p.branch_id=b.id) AS properties,
        (SELECT COUNT(*) FROM properties p WHERE p.agency_id=b.agency_id AND p.branch_id=b.id AND p.status='Available') AS liveProperties,
        (SELECT COUNT(*) FROM enquiries e JOIN properties p ON p.id=e.property_id AND p.agency_id=e.agency_id WHERE e.agency_id=b.agency_id AND p.branch_id=b.id) AS enquiries
        FROM branches b LEFT JOIN agency_memberships m ON m.agency_id=b.agency_id AND m.user_id=b.manager_user_id
        WHERE b.agency_id=? ORDER BY b.active DESC,b.name`).bind(agencyId).all(),
      env.DB.prepare("SELECT bm.branch_id AS branchId,bm.user_id AS userId,m.email,m.branch_scope_enabled AS branchScopeEnabled FROM branch_memberships bm JOIN agency_memberships m ON m.agency_id=bm.agency_id AND m.user_id=bm.user_id WHERE bm.agency_id=? ORDER BY m.email").bind(agencyId).all(),
      env.DB.prepare("SELECT id,title,reference AS ref,status,branch_id AS branchId FROM properties WHERE agency_id=? ORDER BY updated_at DESC LIMIT 200").bind(agencyId).all()
    ]);
    return Response.json({ branches: rows.results, assignments: assignments.results, properties: properties.results });
  } catch (e) { return fail(e); }
}

export async function POST(request: Request) {
  try {
    const c = await context("team.manage");
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    await ensureBranchColumns();
    const body = await request.json() as Record<string, unknown>;
    const name = clean(body.name, 80), location = clean(body.location), phone = clean(body.phone, 40), whatsapp = clean(body.whatsapp, 40);
    const email = clean(body.email, 160).toLowerCase(), address = clean(body.address, 240), description = clean(body.description, 700), openingHours = clean(body.openingHours, 240);
    const managerUserId = clean(body.managerUserId, 100) || null, publicEnabled = truthy(body.publicEnabled);
    if (name.length < 2) return Response.json({ error: "Branch name is required." }, { status: 400 });
    if (managerUserId && !await env.DB.prepare("SELECT 1 FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(c.workspace.agencyId, managerUserId).first()) return Response.json({ error: "Branch manager must belong to this agency." }, { status: 400 });
    await requireCapacity(c.workspace.agencyId, c.user.userId, "branches");
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO branches(id,agency_id,name,location,phone,whatsapp,email,address,description,opening_hours,public_enabled,manager_user_id,created_by)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, c.workspace.agencyId, name, location, phone, whatsapp, email, address, description, openingHours, publicEnabled ? 1 : 0, managerUserId, c.user.userId).run();
    await writeAudit(c.workspace, "branch.created", "branch", id, { name, managerUserId, publicEnabled });
    return Response.json({ branch: { id, name, location, phone, whatsapp, email, address, description, openingHours, publicEnabled, managerUserId } }, { status: 201 });
  } catch (e) { return fail(e); }
}

export async function PATCH(request: Request) {
  try {
    const c = await context("team.manage");
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    await ensureBranchColumns();
    const body = await request.json() as Record<string, unknown>, action = clean(body.action);
    if (action === "assign") {
      const branchId = clean(body.branchId), userId = clean(body.userId), assigned = body.assigned !== false;
      const valid = await env.DB.prepare("SELECT 1 FROM branches b JOIN agency_memberships m ON m.agency_id=b.agency_id WHERE b.id=? AND b.agency_id=? AND m.user_id=?").bind(branchId, c.workspace.agencyId, userId).first();
      if (!valid) return Response.json({ error: "Branch or team member was not found." }, { status: 404 });
      if (assigned) await env.DB.prepare("INSERT OR IGNORE INTO branch_memberships(id,agency_id,branch_id,user_id,created_by) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(), c.workspace.agencyId, branchId, userId, c.user.userId).run();
      else await env.DB.prepare("DELETE FROM branch_memberships WHERE agency_id=? AND branch_id=? AND user_id=?").bind(c.workspace.agencyId, branchId, userId).run();
      await env.DB.prepare("UPDATE agency_memberships SET branch_scope_enabled=? WHERE agency_id=? AND user_id=?").bind(body.scopeEnabled === false ? 0 : 1, c.workspace.agencyId, userId).run();
      await writeAudit(c.workspace, assigned ? "branch.member.assigned" : "branch.member.removed", "branch", branchId, { userId });
      return Response.json({ assigned });
    }
    if (action === "assign_properties") {
      const branchId = clean(body.branchId), propertyIds = Array.isArray(body.propertyIds) ? body.propertyIds.map(id => clean(id, 100)).filter(Boolean).slice(0, 200) : [];
      if (!await env.DB.prepare("SELECT 1 FROM branches WHERE id=? AND agency_id=?").bind(branchId, c.workspace.agencyId).first()) return Response.json({ error: "Branch was not found." }, { status: 404 });
      for (const propertyId of propertyIds) await env.DB.prepare("UPDATE properties SET branch_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(branchId, propertyId, c.workspace.agencyId).run();
      await writeAudit(c.workspace, "branch.properties.assigned", "branch", branchId, { count: propertyIds.length });
      return Response.json({ assigned: propertyIds.length });
    }
    const id = clean(body.id);
    if (action === "update") {
      const name = clean(body.name, 80), location = clean(body.location), phone = clean(body.phone, 40), whatsapp = clean(body.whatsapp, 40);
      const email = clean(body.email, 160).toLowerCase(), address = clean(body.address, 240), description = clean(body.description, 700), openingHours = clean(body.openingHours, 240);
      const managerUserId = clean(body.managerUserId, 100) || null, publicEnabled = truthy(body.publicEnabled);
      if (name.length < 2) return Response.json({ error: "Branch name is required." }, { status: 400 });
      if (managerUserId && !await env.DB.prepare("SELECT 1 FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(c.workspace.agencyId, managerUserId).first()) return Response.json({ error: "Branch manager must belong to this agency." }, { status: 400 });
      const result = await env.DB.prepare(`UPDATE branches SET name=?,location=?,phone=?,whatsapp=?,email=?,address=?,description=?,opening_hours=?,public_enabled=?,manager_user_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?`)
        .bind(name, location, phone, whatsapp, email, address, description, openingHours, publicEnabled ? 1 : 0, managerUserId, id, c.workspace.agencyId).run();
      if (!result.meta.changes) return Response.json({ error: "Branch was not found." }, { status: 404 });
      await writeAudit(c.workspace, "branch.updated", "branch", id, { name, managerUserId, publicEnabled });
      return Response.json({ updated: true });
    }
    const active = Boolean(body.active), result = await env.DB.prepare("UPDATE branches SET active=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(active ? 1 : 0, id, c.workspace.agencyId).run();
    if (!result.meta.changes) return Response.json({ error: "Branch was not found." }, { status: 404 });
    await writeAudit(c.workspace, "branch.status.changed", "branch", id, { active });
    return Response.json({ active });
  } catch (e) { return fail(e); }
}

export async function DELETE(request: Request) {
  try {
    const c = await context("team.manage");
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const id = clean(new URL(request.url).searchParams.get("id"), 100);
    const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM properties WHERE agency_id=? AND branch_id=?").bind(c.workspace.agencyId, id).first<{ count: number }>();
    if ((count?.count || 0) > 0) return Response.json({ error: "Archive this branch first or reassign its properties before deleting." }, { status: 409 });
    await env.DB.prepare("DELETE FROM branch_memberships WHERE agency_id=? AND branch_id=?").bind(c.workspace.agencyId, id).run();
    const result = await env.DB.prepare("DELETE FROM branches WHERE agency_id=? AND id=?").bind(c.workspace.agencyId, id).run();
    if (!result.meta.changes) return Response.json({ error: "Branch was not found." }, { status: 404 });
    await writeAudit(c.workspace, "branch.deleted", "branch", id);
    return Response.json({ deleted: true });
  } catch (e) { return fail(e); }
}
