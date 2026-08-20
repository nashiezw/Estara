import { getChatGPTUser } from "../../../chatgpt-auth";
import { authenticatePassword, createEmailVerificationToken, createSession, publicAuthPreviewEnabled } from "../../../../db/auth";
import { writeAuthAudit } from "../../../../db/auth-audit";
import { authUrl, emailProviderConfigured, sendAuthEmail } from "../../../../db/email";
import { authRouteErrorResponse, ensureStandaloneAuthSchema } from "../../../../db/standalone-auth-schema";
import { setAuthCookie } from "../cookie";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    await ensureStandaloneAuthSchema();
    const actor = await getChatGPTUser().catch(() => null);
    await writeAuthAudit("auth.login.attempted", String(body.email || "unknown"), actor?.userId);
    const user = await authenticatePassword(body.email, body.password);
    if (!user.emailVerified) {
      if (!publicAuthPreviewEnabled(request) && !emailProviderConfigured()) {
        return Response.json({ error: "Email delivery is not configured, so verification cannot be resent yet.", verificationRequired: true }, { status: 503 });
      }
      const verification = await createEmailVerificationToken(user.userId, user.email);
      const previewUrl = publicAuthPreviewEnabled(request) ? `/verify-email?token=${encodeURIComponent(verification.token)}` : undefined;
      if (!previewUrl) await sendAuthEmail({ kind: "verify", email: user.email, url: authUrl(request, `/verify-email?token=${encodeURIComponent(verification.token)}`) });
      return Response.json({
        error: "Verify your email before logging in.",
        verificationRequired: true,
        verificationPreviewUrl: previewUrl,
      }, { status: 403 });
    }
    const session = await createSession(user.userId, {
      userAgent: request.headers.get("user-agent") || "",
      ip: request.headers.get("cf-connecting-ip") || "",
    });
    await setAuthCookie(session.token, session.expiresAt, request);
    return Response.json({ authenticated: true, user: { email: user.email, displayName: user.displayName } });
  } catch (error) {
    return authRouteErrorResponse(error, "Login failed.");
  }
}
