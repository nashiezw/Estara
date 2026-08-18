import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { downloadName } from "../../../../db/document-policy";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { try {
    const user = await getChatGPTUser();
    if (!user)
        return Response.json({ error: "Sign in is required." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") || "", row = await env.DB.prepare(`SELECT d.object_key objectKey,d.original_name originalName,d.mime_type mimeType,d.byte_size byteSize FROM portal_document_shares pds JOIN documents d ON d.id=pds.document_id AND d.agency_id=pds.agency_id JOIN property_portal_grants pg ON pg.agency_id=pds.agency_id AND pg.managed_property_id=pds.managed_property_id AND (pds.audience='all' OR pds.audience=pg.audience) WHERE d.id=? AND d.status='active' AND pg.accepted_user_id=? AND pg.accepted_at IS NOT NULL AND pg.revoked_at IS NULL LIMIT 1`).bind(id, user.userId).first<any>();
    if (!row)
        return Response.json({ error: "This document is not available in your portal." }, { status: 404 });
    const object = await env.MEDIA.get(row.objectKey);
    if (!object)
        return Response.json({ error: "Document file is unavailable." }, { status: 404 });
    return new Response(object.body, { headers: { "content-type": row.mimeType, "content-length": String(row.byteSize), "content-disposition": `attachment; filename="${downloadName(row.originalName)}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
catch {
    return Response.json({ error: "Document could not be downloaded." }, { status: 500 });
} }
