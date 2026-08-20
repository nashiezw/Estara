import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { SESSION_COOKIE, revokeSession } from "../../../../db/auth";
import { clearAuthCookie } from "../cookie";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const actor = await getChatGPTUser().catch(() => null);
  await writeAuthAudit("auth.logout", actor?.email || "unknown", actor?.userId);
  const cookieStore = await cookies();
  await revokeSession(cookieStore.get(SESSION_COOKIE)?.value || "");
  await clearAuthCookie(request);
  return Response.json({ signedOut: true });
}

async function writeAuthAudit(action: string, resource: string, actorUserId?: string | null) {
  await env.DB.prepare("INSERT INTO audit_logs (id,agency_id,actor_user_id,action,resource_type,resource_id,detail) VALUES (?,NULL,?,?,?,?,?)")
    .bind(crypto.randomUUID(), actorUserId || "public-auth", action, "auth", await hashAuditResource(resource), "{}").run();
}

async function hashAuditResource(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase().slice(0, 254))));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
