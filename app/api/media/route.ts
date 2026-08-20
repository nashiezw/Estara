import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { requirePropertyBranchAccess } from "../../../db/access-scope";
import { PHOTO_CATEGORIES, optimizedMediaObjectKey, safeDownloadName, validateMediaFile } from "../../../db/media-policy";
import { invalidatePublicSite } from "../../../db/public-cache";

const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };

const bucket = () => {
  const value = env.MEDIA;
  if (!value) throw new Error("Private R2 binding `MEDIA` is unavailable.");
  return value;
};

const images = () => {
  const value = env.IMAGES;
  if (!value) throw new Error("Image processing is unavailable.");
  return value;
};

async function context(permission?: string) {
  const user = await getChatGPTUser();
  if (!user) return null;
  const workspace = await requireWorkspace(user);
  if (permission) await requirePermission(workspace,permission);
  return { user, workspace };
}

async function optimize(bytes: ArrayBuffer, width: number, quality: number) {
  const result = await images().input(new Blob([bytes]).stream()).transform({ width, fit: "scale-down" }).output({ format:"webp", quality });
  const response = result.response();
  if (!response.ok) throw new Error("Image optimization failed.");
  return new Uint8Array(await response.arrayBuffer());
}

async function GET(request: Request) {
  try {
    const c = await context("property.read");
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    const variant = url.searchParams.get("variant") === "thumb" ? "thumb" : "main";
    const asset = await env.DB.prepare("SELECT id,object_key AS objectKey,thumbnail_object_key AS thumbnailObjectKey,original_name AS originalName,mime_type AS mimeType,byte_size AS byteSize,thumbnail_byte_size AS thumbnailByteSize,kind,category,property_id AS propertyId FROM media_assets WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).first<any>();
    if (!asset) return Response.json({ error: "Media was not found." }, { status: 404 });
    if (asset.propertyId) await requirePropertyBranchAccess(c.workspace, asset.propertyId);
    const key = variant === "thumb" && asset.thumbnailObjectKey ? asset.thumbnailObjectKey : asset.objectKey;
    const size = variant === "thumb" && asset.thumbnailByteSize ? asset.thumbnailByteSize : asset.byteSize;
    const object = await bucket().get(key);
    if (!object) return Response.json({ error: "Media object is unavailable." }, { status: 404 });
    return new Response(object.body, { headers: { ...headers, "content-type": asset.mimeType, "content-length": String(size), "content-disposition": `inline; filename="${safeDownloadName(asset.originalName)}"` } });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Media could not be loaded." }, { status: 500 });
  }
}

async function POST(request: Request) {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "");
    const propertyId = String(form.get("propertyId") || "").trim();
    const userId = String(form.get("userId") || c.user.userId).trim();
    const requested = String(form.get("category") || "other");
    const category = PHOTO_CATEGORIES.includes(requested) ? requested : "other";

    if (!(file instanceof File) || !["agency_logo", "property_photo", "agent_photo", "website_image"].includes(kind)) return Response.json({ error: "Choose an image and a valid destination." }, { status: 400 });
    const invalid = validateMediaFile(file);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    if (kind === "agent_photo") {
      const member = await env.DB.prepare("SELECT 1 FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(c.workspace.agencyId, userId).first();
      if (!member) return Response.json({ error: "Agent is not in this agency." }, { status: 404 });
      if (userId !== c.user.userId) await requirePermission(c.workspace, "team.manage");
    } else if (kind === "website_image") {
      await requirePermission(c.workspace, "agency.settings.manage");
    } else {
      await requirePermission(c.workspace, "property.media.manage");
    }

    if (kind === "property_photo") {
      if (!propertyId) return Response.json({ error: "Choose a property first." }, { status: 400 });
      if (!await env.DB.prepare("SELECT id FROM properties WHERE id=? AND agency_id=?").bind(propertyId, c.workspace.agencyId).first()) return Response.json({ error: "Property was not found." }, { status: 404 });
      await requirePropertyBranchAccess(c.workspace, propertyId);
    }

    const id = crypto.randomUUID();
    const source = await file.arrayBuffer();
    const main = kind === "agent_photo" ? await optimize(source, 900, 82) : await optimize(source,1920,82);
    const thumb = kind === "property_photo" || kind === "agent_photo" || kind === "website_image" ? await optimize(source,480,72) : null;
    const key = optimizedMediaObjectKey(c.workspace.agencyId, id, "main");
    const thumbKey = thumb ? optimizedMediaObjectKey(c.workspace.agencyId, id, "thumb") : null;
    const previous = kind === "agency_logo" ? await env.DB.prepare("SELECT object_key AS objectKey,thumbnail_object_key AS thumbnailObjectKey FROM media_assets WHERE agency_id=? AND kind='agency_logo' LIMIT 1").bind(c.workspace.agencyId).first<any>() : null;
    const sort = kind === "property_photo" ? await env.DB.prepare("SELECT COUNT(*) AS count FROM media_assets WHERE agency_id=? AND property_id=? AND kind='property_photo'").bind(c.workspace.agencyId, propertyId).first<any>() : { count: 0 };

    await bucket().put(key, main, { httpMetadata: { contentType: "image/webp" }, customMetadata: { agencyId: c.workspace.agencyId, assetId: id, variant: "main" } });
    if (thumb && thumbKey) await bucket().put(thumbKey, thumb, { httpMetadata: { contentType: "image/webp" }, customMetadata: { agencyId: c.workspace.agencyId, assetId: id, variant: "thumb" } });

    try {
      const insert = env.DB.prepare("INSERT INTO media_assets (id,agency_id,property_id,kind,category,object_key,thumbnail_object_key,original_name,mime_type,byte_size,thumbnail_byte_size,sort_order,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, c.workspace.agencyId, kind === "property_photo" ? propertyId : null, kind, category, key, thumbKey, file.name, "image/webp", main.byteLength, thumb?.byteLength || null, sort?.count || 0, c.user.userId);
      if (kind === "agency_logo") {
        await env.DB.batch([env.DB.prepare("DELETE FROM media_assets WHERE agency_id=? AND kind='agency_logo'").bind(c.workspace.agencyId), insert]);
      } else {
        const statements = [insert];
        if (kind === "property_photo") statements.push(env.DB.prepare("UPDATE properties SET photo_count=(SELECT COUNT(*) FROM media_assets WHERE agency_id=? AND property_id=? AND kind='property_photo'),updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(c.workspace.agencyId, propertyId, propertyId, c.workspace.agencyId));
        if (kind === "agent_photo") statements.push(env.DB.prepare("UPDATE agent_profiles SET profile_photo_media_id=?,updated_at=CURRENT_TIMESTAMP WHERE agency_id=? AND user_id=?").bind(id, c.workspace.agencyId, userId));
        await env.DB.batch(statements);
      }
    } catch (error) {
      await bucket().delete([key, ...thumbKey ? [thumbKey] : []]);
      throw error;
    }

    if (previous?.objectKey) await bucket().delete([previous.objectKey, ...previous.thumbnailObjectKey ? [previous.thumbnailObjectKey] : []]);
    await writeAudit(c.workspace, "media.uploaded", "media_asset", id, { kind, category, propertyId: propertyId || null, userId: kind === "agent_photo" ? userId : null, sourceMimeType: file.type, sourceByteSize: file.size, optimizedByteSize: main.byteLength, thumbnailByteSize: thumb?.byteLength || null });
    await invalidatePublicSite(c.workspace.agencyId,propertyId||null);
    return Response.json({ asset: { id, kind, category, propertyId: propertyId || null, url: `/api/media?id=${encodeURIComponent(id)}`, thumbnailUrl: thumbKey ? `/api/media?id=${encodeURIComponent(id)}&variant=thumb` : null }, optimization: { sourceBytes: file.size, outputBytes: main.byteLength, thumbnailBytes: thumb?.byteLength || 0 } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: error instanceof Error && error.message === "Image processing is unavailable." ? error.message : "Image upload failed. Please retry." }, { status: 500 });
  }
}

async function DELETE(request: Request) {
  try {
    const c = await context("property.media.manage");
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") || "";
    const asset = await env.DB.prepare("SELECT id,object_key AS objectKey,thumbnail_object_key AS thumbnailObjectKey,property_id AS propertyId,kind,category FROM media_assets WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).first<any>();
    if (!asset) return Response.json({ error: "Media was not found." }, { status: 404 });
    if (asset.propertyId) await requirePropertyBranchAccess(c.workspace, asset.propertyId);
    await bucket().delete([asset.objectKey, ...asset.thumbnailObjectKey ? [asset.thumbnailObjectKey] : []]);
    const statements = [env.DB.prepare("DELETE FROM media_assets WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId)];
    if (asset.propertyId) statements.push(env.DB.prepare("UPDATE properties SET photo_count=(SELECT COUNT(*) FROM media_assets WHERE agency_id=? AND property_id=? AND kind='property_photo'),updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(c.workspace.agencyId, asset.propertyId, asset.propertyId, c.workspace.agencyId));
    await env.DB.batch(statements);
    await writeAudit(c.workspace, "media.deleted", "media_asset", id, { kind: asset.kind, category: asset.category, propertyId: asset.propertyId });
    await invalidatePublicSite(c.workspace.agencyId,asset.propertyId||null);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Image could not be removed." }, { status: 500 });
  }
}

export { DELETE, GET, POST, dynamic };
