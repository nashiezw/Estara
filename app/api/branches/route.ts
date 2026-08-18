import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
export const dynamic = "force-dynamic";
const clean = (v: unknown, n = 120) => String(v ?? "").trim().slice(0, n);
async function context(permission: "property.read" | "team.manage") { const user = await getChatGPTUser(); if (!user) return null; const workspace = await requireWorkspace(user); await requirePermission(workspace, permission); return { user, workspace }; }
const fail = (e: unknown) => e instanceof AuthorizationError ? Response.json({ error: e.message }, { status: 403 }) : Response.json({ error: "Branches could not be processed." }, { status: 500 });

export async function GET() { try {
  const c = await context("property.read"); if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const [rows, assignments] = await Promise.all([
    env.DB.prepare("SELECT b.id,b.name,b.location,b.phone,b.manager_user_id AS managerUserId,m.email AS managerEmail,b.active,b.created_at AS createdAt,(SELECT COUNT(*) FROM properties p WHERE p.agency_id=b.agency_id AND p.branch_id=b.id) AS properties FROM branches b LEFT JOIN agency_memberships m ON m.agency_id=b.agency_id AND m.user_id=b.manager_user_id WHERE b.agency_id=? ORDER BY b.active DESC,b.name").bind(c.workspace.agencyId).all(),
    env.DB.prepare("SELECT bm.branch_id AS branchId,bm.user_id AS userId,m.email,m.branch_scope_enabled AS branchScopeEnabled FROM branch_memberships bm JOIN agency_memberships m ON m.agency_id=bm.agency_id AND m.user_id=bm.user_id WHERE bm.agency_id=? ORDER BY m.email").bind(c.workspace.agencyId).all()
  ]);
  return Response.json({ branches: rows.results, assignments: assignments.results });
} catch (e) { return fail(e); } }

export async function POST(request: Request) { try {
  const c = await context("team.manage"); if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const body = await request.json() as Record<string, unknown>, name = clean(body.name, 80), location = clean(body.location), phone = clean(body.phone, 40), managerUserId = clean(body.managerUserId, 100) || null;
  if (name.length < 2) return Response.json({ error: "Branch name is required." }, { status: 400 });
  if (managerUserId && !await env.DB.prepare("SELECT 1 FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(c.workspace.agencyId, managerUserId).first()) return Response.json({ error: "Branch manager must belong to this agency." }, { status: 400 });
  const id = crypto.randomUUID(); await env.DB.prepare("INSERT INTO branches(id,agency_id,name,location,phone,manager_user_id,created_by) VALUES(?,?,?,?,?,?,?)").bind(id, c.workspace.agencyId, name, location, phone, managerUserId, c.user.userId).run();
  await writeAudit(c.workspace, "branch.created", "branch", id, { name, managerUserId }); return Response.json({ branch: { id, name, location, phone, managerUserId } }, { status: 201 });
} catch (e) { return fail(e); } }

export async function PATCH(request: Request) { try {
  const c = await context("team.manage"); if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const body = await request.json() as Record<string, unknown>, action = clean(body.action);
  if (action === "assign") {
    const branchId = clean(body.branchId), userId = clean(body.userId), assigned = body.assigned !== false;
    const valid = await env.DB.prepare("SELECT 1 FROM branches b JOIN agency_memberships m ON m.agency_id=b.agency_id WHERE b.id=? AND b.agency_id=? AND m.user_id=?").bind(branchId, c.workspace.agencyId, userId).first();
    if (!valid) return Response.json({ error: "Branch or team member was not found." }, { status: 404 });
    if (assigned) await env.DB.prepare("INSERT OR IGNORE INTO branch_memberships(id,agency_id,branch_id,user_id,created_by) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(), c.workspace.agencyId, branchId, userId, c.user.userId).run();
    else await env.DB.prepare("DELETE FROM branch_memberships WHERE agency_id=? AND branch_id=? AND user_id=?").bind(c.workspace.agencyId, branchId, userId).run();
    await env.DB.prepare("UPDATE agency_memberships SET branch_scope_enabled=? WHERE agency_id=? AND user_id=?").bind(body.scopeEnabled === false ? 0 : 1, c.workspace.agencyId, userId).run();
    await writeAudit(c.workspace, assigned ? "branch.member.assigned" : "branch.member.removed", "branch", branchId, { userId }); return Response.json({ assigned });
  }
  const id = clean(body.id), active = Boolean(body.active), result = await env.DB.prepare("UPDATE branches SET active=? WHERE id=? AND agency_id=?").bind(active ? 1 : 0, id, c.workspace.agencyId).run();
  if (!result.meta.changes) return Response.json({ error: "Branch was not found." }, { status: 404 });
  await writeAudit(c.workspace, "branch.status.changed", "branch", id, { active }); return Response.json({ active });
} catch (e) { return fail(e); } }
