import { getChatGPTUser } from "../../../chatgpt-auth";
import { createPasswordResetToken, publicAuthPreviewEnabled } from "../../../../db/auth";
import { writeAuthAudit } from "../../../../db/auth-audit";
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
