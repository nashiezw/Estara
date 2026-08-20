import { getChatGPTUser } from "../../../chatgpt-auth";
import { createAppUser, publicAuthPreviewEnabled } from "../../../../db/auth";
import { writeAuthAudit } from "../../../../db/auth-audit";
import { authUrl, emailProviderConfigured, sendAuthEmail } from "../../../../db/email";
import { authRouteErrorResponse, ensureStandaloneAuthSchema } from "../../../../db/standalone-auth-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    await ensureStandaloneAuthSchema();
    const actor = await getChatGPTUser().catch(() => null);
    await writeAuthAudit("auth.register.attempted", String(body.email || "unknown"), actor?.userId);
    if (!publicAuthPreviewEnabled(request) && !emailProviderConfigured()) {
      return Response.json({ error: "Email delivery must be configured before public registration can open." }, { status: 503 });
    }
    const user = await createAppUser({ email: String(body.email || ""), displayName: String(body.displayName || ""), password: String(body.password || "") });
    const previewUrl = publicAuthPreviewEnabled(request) ? `/verify-email?token=${encodeURIComponent(user.verificationToken)}` : undefined;
    if (!previewUrl) await sendAuthEmail({ kind: "verify", email: user.email, url: authUrl(request, `/verify-email?token=${encodeURIComponent(user.verificationToken)}`) });
    return Response.json({
      registered: true,
      email: user.email,
      nextStep: "Check your email and verify your account before logging in.",
      verificationPreviewUrl: previewUrl,
      verificationExpiresAt: user.verificationExpiresAt,
    }, { status: 201 });
  } catch (error) {
    return authRouteErrorResponse(error, "Registration failed.");
  }
}
