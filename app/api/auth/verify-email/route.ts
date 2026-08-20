import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createSession, verifyEmailToken } from "../../../../db/auth";
import { authRouteErrorResponse, ensureStandaloneAuthSchema } from "../../../../db/standalone-auth-schema";
import { setAuthCookie } from "../cookie";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    await ensureStandaloneAuthSchema();
    const actor = await getChatGPTUser().catch(() => null);
    await writeAuthAudit("auth.email_verified", body.token || "missing-token", actor?.userId);
    const verified = await verifyEmailToken(String(body.token || ""));
    const session = await createSession(verified.userId, {
      userAgent: request.headers.get("user-agent") || "",
      ip: request.headers.get("cf-connecting-ip") || "",
    });
    await setAuthCookie(session.token, session.expiresAt, request);
    return Response.json({ verified: true, email: verified.email });
  } catch (error) {
    return authRouteErrorResponse(error, "Verification failed.");
  }
}

async function writeAuthAudit(action: string, resource: string, actorUserId?: string | null) {
  await env.DB.prepare("INSERT INTO audit_logs (id,agency_id,actor_user_id,action,resource_type,resource_id,detail) VALUES (?,NULL,?,?,?,?,?)")
    .bind(crypto.randomUUID(), actorUserId || "public-auth", action, "auth", await hashAuditResource(resource), "{}").run();
}

async function hashAuditResource(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase().slice(0, 254))));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
