import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { safeDownloadName } from "../../../../db/media-policy";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { try {
    const user = await getChatGPTUser();
    if (!user)
        return Response.json({ error: "Sign in is required." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") || "", row = await env.DB.prepare(`SELECT im.object_key objectKey,im.original_name originalName,im.mime_type mimeType,im.byte_size byteSize FROM inspection_media_assets im JOIN property_inspections pi ON pi.id=im.inspection_id AND pi.agency_id=im.agency_id JOIN property_portal_grants pg ON pg.agency_id=pi.agency_id AND pg.managed_property_id=pi.managed_property_id WHERE im.id=? AND pg.accepted_user_id=? AND pg.accepted_at IS NOT NULL AND pg.revoked_at IS NULL LIMIT 1`).bind(id, user.userId).first<any>();
    if (!row)
        return Response.json({ error: "Inspection image is not available in your portal." }, { status: 404 });
    const object = await env.MEDIA.get(row.objectKey);
    if (!object)
        return Response.json({ error: "Inspection image is unavailable." }, { status: 404 });
    return new Response(object.body, { headers: { "content-type": row.mimeType, "content-length": String(row.byteSize), "content-disposition": `inline; filename="${safeDownloadName(row.originalName)}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
catch {
    return Response.json({ error: "Inspection image could not be loaded." }, { status: 500 });
} }
