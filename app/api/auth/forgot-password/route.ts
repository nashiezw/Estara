import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createPasswordResetToken, publicAuthPreviewEnabled } from "../../../../db/auth";
import { authUrl, emailProviderConfigured, sendAuthEmail } from "../../../../db/email";
import { authRouteErrorResponse, ensureStandaloneAuthSchema } from "../../../../db/standalone-auth-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    await ensureStandaloneAuthSchema();
    const actor = await getChatGPTUser().catch(() => null);
    await writeAuthAudit("auth.password_reset.requested", body.email || "unknown", actor?.userId);
    if (!publicAuthPreviewEnabled(request) && !emailProviderConfigured()) {
      return Response.json({ error: "Email delivery must be configured before password reset can open." }, { status: 503 });
    }
    const reset = await createPasswordResetToken(body.email);
    const previewUrl = reset && publicAuthPreviewEnabled(request) ? `/reset-password?token=${encodeURIComponent(reset.token)}` : undefined;
    if (reset && !previewUrl) await sendAuthEmail({ kind: "reset", email: reset.email, url: authUrl(request, `/reset-password?token=${encodeURIComponent(reset.token)}`) });
    return Response.json({
      accepted: true,
      nextStep: "If an account exists, a password reset email will be sent.",
      resetPreviewUrl: previewUrl,
      resetExpiresAt: reset?.expiresAt,
    });
  } catch (error) {
    return authRouteErrorResponse(error, "Password reset could not be started.");
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
