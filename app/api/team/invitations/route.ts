import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { requireWorkspace } from "../../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../../db/authorization";
import { PlanLimitError, requireCapacity } from "../../../../db/entitlements";
import { invalidatePublicSite } from "../../../../db/public-cache";

const ROLES = new Set(["admin", "agent", "marketing", "viewer"]);
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const hash = async (v: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))).map((x) => x.toString(16).padStart(2, "0")).join("");
const safe = (v: unknown, n = 400) => typeof v === "string" ? v.trim().slice(0, n) : "";

async function ensureAgentProfilesTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agent_profiles (
    agency_id text NOT NULL,
    user_id text NOT NULL,
    display_name text DEFAULT '' NOT NULL,
    title text DEFAULT '' NOT NULL,
    phone text DEFAULT '' NOT NULL,
    whatsapp text DEFAULT '' NOT NULL,
    experience text DEFAULT '' NOT NULL,
    bio text DEFAULT '' NOT NULL,
    areas text DEFAULT '' NOT NULL,
    languages text DEFAULT '' NOT NULL,
    profile_photo_media_id text,
    public_enabled integer DEFAULT 1 NOT NULL,
    updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`).run();
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_profiles_member ON agent_profiles(agency_id,user_id)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_agent_profiles_public ON agent_profiles(agency_id,public_enabled)").run();
}

async function canManageTeam(workspace: { agencyId: string; userId: string }) {
  try {
    await requirePermission(workspace, "team.manage");
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const u = await getChatGPTUser();
    if (!u) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const w = await requireWorkspace(u);
    const manage = await canManageTeam(w);
    await ensureAgentProfilesTable();
    const memberFilter = manage ? "" : " AND m.user_id=?";
    const bindMembers = manage ? [w.agencyId] : [w.agencyId, w.userId];
    const [members, invites, customRoles] = await Promise.all([
      env.DB.prepare(`SELECT m.user_id AS userId,m.email,m.role,COALESCE(r.name,m.role) AS roleName,m.created_at AS joinedAt,
        ap.display_name AS displayName,ap.title,ap.phone,ap.whatsapp,ap.experience,ap.bio,ap.areas,ap.languages,ap.profile_photo_media_id AS profilePhotoMediaId,COALESCE(ap.public_enabled,1) AS publicEnabled
        FROM agency_memberships m
        LEFT JOIN roles r ON r.id=m.role AND r.agency_id=m.agency_id
        LEFT JOIN agent_profiles ap ON ap.agency_id=m.agency_id AND ap.user_id=m.user_id
        WHERE m.agency_id=?${memberFilter}
        ORDER BY m.created_at`).bind(...bindMembers).all(),
      manage ? env.DB.prepare("SELECT i.id,i.email,i.role,COALESCE(r.name,i.role) AS roleName,i.expires_at AS expiresAt,i.created_at AS createdAt FROM team_invitations i LEFT JOIN roles r ON r.id=i.role AND r.agency_id=i.agency_id WHERE i.agency_id=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>CURRENT_TIMESTAMP ORDER BY i.created_at DESC").bind(w.agencyId).all() : Promise.resolve({ results: [] }),
      manage ? env.DB.prepare("SELECT id,name FROM roles WHERE agency_id=? AND is_system=0 ORDER BY name").bind(w.agencyId).all() : Promise.resolve({ results: [] }),
    ]);
    return Response.json({ members: members.results, invitations: invites.results, customRoles: customRoles.results, canManageTeam: manage });
  } catch (e) {
    if (e instanceof AuthorizationError) return Response.json({ error: e.message }, { status: 403 });
    return Response.json({ error: "Team could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(r: Request) {
  try {
    const u = await getChatGPTUser();
    if (!u) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const w = await requireWorkspace(u);
    await ensureAgentProfilesTable();
    const b = await r.json() as Record<string, unknown>;
    const userId = safe(b.userId, 100) || u.userId;
    const manage = await canManageTeam(w);
    if (userId !== u.userId && !manage) return Response.json({ error: "You can only edit your own public profile." }, { status: 403 });
    const member = await env.DB.prepare("SELECT user_id AS userId FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(w.agencyId, userId).first();
    if (!member) return Response.json({ error: "Team member was not found." }, { status: 404 });
    const photo = safe(b.profilePhotoMediaId, 100);
    if (photo) {
      const asset = await env.DB.prepare("SELECT id FROM media_assets WHERE id=? AND agency_id=? AND kind='agent_photo'").bind(photo, w.agencyId).first();
      if (!asset) return Response.json({ error: "Profile photo was not found." }, { status: 404 });
    }
    await env.DB.prepare(`INSERT INTO agent_profiles (agency_id,user_id,display_name,title,phone,whatsapp,experience,bio,areas,languages,profile_photo_media_id,public_enabled,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(agency_id,user_id) DO UPDATE SET display_name=excluded.display_name,title=excluded.title,phone=excluded.phone,whatsapp=excluded.whatsapp,experience=excluded.experience,bio=excluded.bio,areas=excluded.areas,languages=excluded.languages,profile_photo_media_id=COALESCE(excluded.profile_photo_media_id,agent_profiles.profile_photo_media_id),public_enabled=excluded.public_enabled,updated_at=CURRENT_TIMESTAMP`)
      .bind(w.agencyId, userId, safe(b.displayName, 100), safe(b.title, 100), safe(b.phone, 40), safe(b.whatsapp, 40), safe(b.experience, 80), safe(b.bio, 700), safe(b.areas, 240), safe(b.languages, 180), photo || null, b.publicEnabled === false ? 0 : 1)
      .run();
    await writeAudit(w, "agent_profile.updated", "agent_profile", userId, { self: userId === u.userId });
    await invalidatePublicSite(w.agencyId, null);
    return Response.json({ updated: true });
  } catch (e) {
    if (e instanceof AuthorizationError) return Response.json({ error: e.message }, { status: 403 });
    return Response.json({ error: "Profile could not be saved." }, { status: 500 });
  }
}

export async function POST(r: Request) {
  try {
    const u = await getChatGPTUser();
    if (!u) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const w = await requireWorkspace(u);
    await requirePermission(w, "team.manage");
    await requireCapacity(w.agencyId, w.userId, "users");
    const b = await r.json() as { email?: string; role?: string };
    const email = String(b.email || "").trim().toLowerCase();
    const role = String(b.role || "");
    const customRole = !ROLES.has(role) && role ? await env.DB.prepare("SELECT id FROM roles WHERE id=? AND agency_id=? AND is_system=0 LIMIT 1").bind(role, w.agencyId).first() : null;
    if (!emailOk(email) || (!ROLES.has(role) && !customRole)) return Response.json({ error: "A valid email and role are required." }, { status: 400 });
    const member = await env.DB.prepare("SELECT 1 FROM agency_memberships WHERE agency_id=? AND lower(email)=?").bind(w.agencyId, email).first();
    if (member) return Response.json({ error: "This person is already a team member." }, { status: 409 });
    await env.DB.prepare("UPDATE team_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE agency_id=? AND lower(email)=? AND accepted_at IS NULL AND revoked_at IS NULL").bind(w.agencyId, email).run();
    const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
    const id = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    await env.DB.prepare("INSERT INTO team_invitations (id,agency_id,email,role,token_hash,expires_at,invited_by) VALUES (?,?,?,?,?,?,?)").bind(id, w.agencyId, email, role, await hash(token), expires, w.userId).run();
    await writeAudit(w, "team.invitation.created", "team_invitation", id, { email, role });
    return Response.json({ invitation: { id, email, role, expiresAt: expires, acceptPath: `/invite?token=${encodeURIComponent(token)}` } }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthorizationError) return Response.json({ error: e.message }, { status: 403 });
    if (e instanceof PlanLimitError) return Response.json({ error: e.message }, { status: 409 });
    return Response.json({ error: "Invitation could not be created." }, { status: 500 });
  }
}

export async function DELETE(r: Request) {
  try {
    const u = await getChatGPTUser();
    if (!u) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const w = await requireWorkspace(u);
    await requirePermission(w, "team.manage");
    const id = new URL(r.url).searchParams.get("id") || "";
    const x = await env.DB.prepare("UPDATE team_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND accepted_at IS NULL AND revoked_at IS NULL").bind(id, w.agencyId).run();
    if (!x.meta.changes) return Response.json({ error: "Invitation was not found." }, { status: 404 });
    await writeAudit(w, "team.invitation.revoked", "team_invitation", id);
    return Response.json({ revoked: true });
  } catch (e) {
    if (e instanceof AuthorizationError) return Response.json({ error: e.message }, { status: 403 });
    return Response.json({ error: "Invitation could not be revoked." }, { status: 500 });
  }
}
