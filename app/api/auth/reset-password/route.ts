import { getChatGPTUser } from "../../../chatgpt-auth";
import { resetPasswordWithToken } from "../../../../db/auth";
import { writeAuthAudit } from "../../../../db/auth-audit";
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
