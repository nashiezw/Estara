import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { PlatformAuthorizationError, requirePlatformUser } from "../../../../db/platform-auth";

export const dynamic = "force-dynamic";

const clean = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);
const filename = (value: string) => clean(value, 120).replace(/[\r\n"]/g, "-") || "payment-proof";

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    await requirePlatformUser(user, ["super_admin", "finance"]);

    const id = clean(new URL(request.url).searchParams.get("id"), 80);
    if (!id) return Response.json({ error: "Payment proof id is required." }, { status: 400 });

    const row = await env.DB.prepare(`SELECT proof_object_key AS objectKey,proof_original_name AS originalName,proof_mime_type AS mimeType
      FROM billing_payment_requests WHERE id=? AND proof_object_key IS NOT NULL`).bind(id).first<any>();
    if (!row?.objectKey) return Response.json({ error: "Payment proof was not found." }, { status: 404 });

    const bucket = (env as any).MEDIA;
    if (!bucket) return Response.json({ error: "Payment proof storage is not configured." }, { status: 503 });
    const object = await bucket.get(row.objectKey);
    if (!object?.body) return Response.json({ error: "Payment proof file is missing from storage." }, { status: 404 });

    const headers = new Headers();
    headers.set("content-type", row.mimeType || object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("content-disposition", `inline; filename="${filename(row.originalName)}"`);
    headers.set("cache-control", "private, no-store");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  } catch (error) {
    if (error instanceof PlatformAuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Payment proof could not be opened." }, { status: 500 });
  }
}
