import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { safeDownloadName, validateMediaFile } from "../../../db/media-policy";
export const dynamic = "force-dynamic";
async function requestAccess(userId: string, requestId: string) { const row = await env.DB.prepare(`SELECT mr.id,mr.agency_id agencyId,mr.managed_property_id managedPropertyId FROM maintenance_requests mr WHERE mr.id=?`).bind(requestId).first<any>(); if (!row)
    return null; const staff = await env.DB.prepare("SELECT role FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(row.agencyId, userId).first<any>(), portal = staff ? null : await env.DB.prepare("SELECT id,audience FROM property_portal_grants WHERE agency_id=? AND managed_property_id=? AND accepted_user_id=? AND accepted_at IS NOT NULL AND revoked_at IS NULL").bind(row.agencyId, row.managedPropertyId, userId).first<any>(); return staff || portal ? { ...row, staff: Boolean(staff), audience: portal?.audience } : null; }
export async function POST(request: Request) { try {
    const user = await getChatGPTUser();
    if (!user)
        return Response.json({ error: "Sign in is required." }, { status: 401 });
    const form = await request.formData(), file = form.get("file"), requestId = String(form.get("requestId") || "");
    if (!(file instanceof File))
        return Response.json({ error: "Choose a maintenance photo." }, { status: 400 });
    const invalid = validateMediaFile(file);
    if (invalid)
        return Response.json({ error: invalid }, { status: 400 });
    const access = await requestAccess(user.userId, requestId);
    if (!access)
        return Response.json({ error: "Maintenance request was not found." }, { status: 404 });
    const id = crypto.randomUUID(), key = `tenants/${access.agencyId}/maintenance/${requestId}/${id}`;
    await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { agencyId: access.agencyId, requestId, private: "true" } });
    try {
        await env.DB.prepare("INSERT INTO maintenance_media_assets(id,agency_id,request_id,object_key,original_name,mime_type,byte_size,created_by) VALUES(?,?,?,?,?,?,?,?)").bind(id, access.agencyId, requestId, key, file.name, file.type, file.size, user.userId).run();
    }
    catch (e) {
        await env.MEDIA.delete(key);
        throw e;
    }
    return Response.json({ id, url: `/api/maintenance-media?id=${encodeURIComponent(id)}` }, { status: 201 });
}
catch {
    return Response.json({ error: "Maintenance photo upload failed." }, { status: 500 });
} }
export async function GET(request: Request) { try {
    const user = await getChatGPTUser();
    if (!user)
        return Response.json({ error: "Sign in is required." }, { status: 401 });
    const params = new URL(request.url).searchParams, requestId=params.get("requestId")||"";
    if(requestId){if(!await requestAccess(user.userId,requestId))return Response.json({error:"Maintenance request was not found."},{status:404});const rows=await env.DB.prepare("SELECT id,original_name originalName,mime_type mimeType,byte_size byteSize,created_at createdAt FROM maintenance_media_assets WHERE request_id=? ORDER BY created_at DESC").bind(requestId).all();return Response.json({media:rows.results.map((row:any)=>({...row,url:`/api/maintenance-media?id=${encodeURIComponent(row.id)}`}))})}
    const id = params.get("id") || "", asset = await env.DB.prepare("SELECT request_id requestId,object_key objectKey,original_name originalName,mime_type mimeType,byte_size byteSize FROM maintenance_media_assets WHERE id=?").bind(id).first<any>();
    if (!asset || !await requestAccess(user.userId, asset.requestId))
        return Response.json({ error: "Maintenance photo was not found." }, { status: 404 });
    const object = await env.MEDIA.get(asset.objectKey);
    if (!object)
        return Response.json({ error: "Maintenance photo is unavailable." }, { status: 404 });
    return new Response(object.body, { headers: { "content-type": asset.mimeType, "content-length": String(asset.byteSize), "content-disposition": `inline; filename="${safeDownloadName(asset.originalName)}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
catch {
    return Response.json({ error: "Maintenance photo could not be loaded." }, { status: 500 });
} }
