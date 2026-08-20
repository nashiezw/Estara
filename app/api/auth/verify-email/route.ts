import { getChatGPTUser } from "../../../chatgpt-auth";
import { createSession, verifyEmailToken } from "../../../../db/auth";
import { writeAuthAudit } from "../../../../db/auth-audit";
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
