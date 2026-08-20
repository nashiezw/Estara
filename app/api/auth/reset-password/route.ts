import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { resetPasswordWithToken } from "../../../../db/auth";
import { authRouteErrorResponse, ensureStandaloneAuthSchema } from "../../../../db/standalone-auth-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; password?: string };
    await ensureStandaloneAuthSchema();
    const actor = await getChatGPTUser().catch(() => null);
    await writeAuthAudit("auth.password_reset.completed", body.token || "missing-token", actor?.userId);
    await resetPasswordWithToken(String(body.token || ""), body.password);
    return Response.json({ reset: true, nextStep: "Your password has been changed. Log in with the new password." });
  } catch (error) {
    return authRouteErrorResponse(error, "Password reset failed.");
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
