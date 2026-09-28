import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, prepareAudit, requirePermission } from "../../../db/authorization";
import { requirePropertyBranchAccess } from "../../../db/access-scope";
import { PHOTO_CATEGORIES, optimizedMediaObjectKey, safeDownloadName, validateMediaFile } from "../../../db/media-policy";
import { invalidatePublicSite } from "../../../db/public-cache";
import { propertyCompleteness } from "../../../db/property-policy";
import { processMediaCleanupJob } from "../../../db/media-cleanup";

const dynamic = "force-dynamic";
const headers = { "cache-control": "private, max-age=3600, stale-while-revalidate=86400", "x-content-type-options": "nosniff" };

const bucket = () => {
  const value = env.MEDIA;
  if (!value) throw new Error("Private R2 binding `MEDIA` is unavailable.");
  return value;
};

type ProcessedImage = { bytes: Uint8Array; mimeType: string; optimized: boolean };

const imageProcessor = () => {
  const value = (env as any).IMAGES;
  return value || null;
};

async function context(permission?: string) {
  const user = await getChatGPTUser();
  if (!user) return null;
  const workspace = await requireWorkspace(user);
  if (permission) await requirePermission(workspace,permission);
  return { user, workspace };
}

async function propertyMediaState(agencyId: string, propertyId: string, photoCount: number) {
  const property = await env.DB.prepare(`SELECT title,transaction_type AS transactionType,property_type AS propertyType,price_minor AS priceMinor,currency,bedrooms,bathrooms,country,city,suburb,address,description,owner_contact_id AS ownerContactId,listing_agent_id AS listingAgentId,mandate_id AS mandateId,land_size AS landSize FROM properties WHERE id=? AND agency_id=?`).bind(propertyId, agencyId).first<any>();
  if (!property) return null;
  return propertyCompleteness({ ...property, photoCount });
}

async function propertyMediaCompletenessRange(agencyId: string, propertyId: string) {
  const property = await env.DB.prepare(`SELECT title,transaction_type AS transactionType,property_type AS propertyType,price_minor AS priceMinor,currency,bedrooms,bathrooms,country,city,suburb,address,description,owner_contact_id AS ownerContactId,listing_agent_id AS listingAgentId,mandate_id AS mandateId,land_size AS landSize FROM properties WHERE id=? AND agency_id=?`).bind(propertyId, agencyId).first<any>();
  if (!property) return null;
  const incomplete = propertyCompleteness({ ...property, photoCount: 0 });
  const complete = propertyCompleteness({ ...property, photoCount: incomplete.photoRequirement });
  return { incomplete: incomplete.percentage, complete: complete.percentage, photoRequirement: incomplete.photoRequirement };
}

async function processImage(bytes: ArrayBuffer, sourceMimeType: string, width: number, quality: number): Promise<ProcessedImage> {
  const processor = imageProcessor();
  if (!processor) return { bytes: new Uint8Array(bytes), mimeType: sourceMimeType, optimized: false };
  const result = await processor.input(new Blob([bytes]).stream()).transform({ width, fit: "scale-down" }).output({ format:"webp", quality });
  const response = result.response();
  if (!response.ok) throw new Error("Image optimization failed.");
  return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType: "image/webp", optimized: true };
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

    if (!(file instanceof File) || !["agency_logo", "agency_icon", "agency_footer_logo", "agency_footer_icon", "property_photo", "agent_photo", "website_image"].includes(kind)) return Response.json({ error: "Choose an image and a valid destination." }, { status: 400 });
    const invalid = validateMediaFile(file);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    if (kind === "agent_photo") {
      const member = await env.DB.prepare("SELECT 1 FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(c.workspace.agencyId, userId).first();
      if (!member) return Response.json({ error: "Agent is not in this agency." }, { status: 404 });
      if (userId !== c.user.userId) await requirePermission(c.workspace, "team.manage");
    } else if (kind === "website_image" || kind === "agency_icon" || kind === "agency_logo" || kind === "agency_footer_icon" || kind === "agency_footer_logo") {
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
    const optimize = (input: ArrayBuffer, width: number, quality: number) => processImage(input, file.type, width, quality);
    const main = kind === "agent_photo" ? await optimize(source,900,82) : await optimize(source,1920,82);
    const thumb = kind === "property_photo" || kind === "agent_photo" || kind === "website_image" || kind === "agency_logo" || kind === "agency_icon" || kind === "agency_footer_logo" || kind === "agency_footer_icon" ? await optimize(source,480,72) : null;
    const key = optimizedMediaObjectKey(c.workspace.agencyId, id, "main");
    const thumbKey = thumb ? optimizedMediaObjectKey(c.workspace.agencyId, id, "thumb") : null;
    const replacesBrandAsset = kind === "agency_logo" || kind === "agency_icon" || kind === "agency_footer_logo" || kind === "agency_footer_icon";
    const previous = replacesBrandAsset ? (await env.DB.prepare("SELECT id,object_key AS objectKey,thumbnail_object_key AS thumbnailObjectKey FROM media_assets WHERE agency_id=? AND kind=?").bind(c.workspace.agencyId, kind).all<any>()).results : [];
    const sort = kind === "property_photo" ? await env.DB.prepare("SELECT COUNT(*) AS count FROM media_assets WHERE agency_id=? AND property_id=? AND kind='property_photo'").bind(c.workspace.agencyId, propertyId).first<any>() : { count: 0 };
    const completeness = kind === "property_photo" ? await propertyMediaState(c.workspace.agencyId, propertyId, Number(sort?.count || 0) + 1) : null;

    await bucket().put(key, main.bytes, { httpMetadata: { contentType: main.mimeType }, customMetadata: { agencyId: c.workspace.agencyId, assetId: id, variant: "main", optimized: String(main.optimized) } });
    if (thumb && thumbKey) await bucket().put(thumbKey, thumb.bytes, { httpMetadata: { contentType: thumb.mimeType }, customMetadata: { agencyId: c.workspace.agencyId, assetId: id, variant: "thumb", optimized: String(thumb.optimized) } });

    try {
      const insert = env.DB.prepare("INSERT INTO media_assets (id,agency_id,property_id,kind,category,object_key,thumbnail_object_key,original_name,mime_type,byte_size,thumbnail_byte_size,sort_order,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, c.workspace.agencyId, kind === "property_photo" ? propertyId : null, kind, category, key, thumbKey, file.name, main.mimeType, main.bytes.byteLength, thumb?.bytes.byteLength || null, sort?.count || 0, c.user.userId);
      const cleanupJobs = previous.map(asset => ({ id: crypto.randomUUID(), asset }));
      const statements = [];
      if (replacesBrandAsset) statements.push(env.DB.prepare("DELETE FROM media_assets WHERE agency_id=? AND kind=?").bind(c.workspace.agencyId, kind));
      statements.push(insert);
      if (kind === "property_photo") statements.push(env.DB.prepare("UPDATE properties SET photo_count=?,completeness=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(Number(sort?.count || 0) + 1, completeness?.percentage || 0, propertyId, c.workspace.agencyId));
      if (kind === "agent_photo") statements.push(env.DB.prepare("UPDATE agent_profiles SET profile_photo_media_id=?,updated_at=CURRENT_TIMESTAMP WHERE agency_id=? AND user_id=?").bind(id, c.workspace.agencyId, userId));
      for (const cleanup of cleanupJobs) statements.push(env.DB.prepare("INSERT INTO media_cleanup_jobs(id,agency_id,media_asset_id,object_keys,status,next_attempt_at) VALUES(?,?,?,?, 'pending',CURRENT_TIMESTAMP)").bind(cleanup.id, c.workspace.agencyId, cleanup.asset.id, JSON.stringify([cleanup.asset.objectKey, ...cleanup.asset.thumbnailObjectKey ? [cleanup.asset.thumbnailObjectKey] : []])));
      statements.push(prepareAudit(c.workspace, "media.uploaded", "media_asset", id, { kind, category, propertyId: propertyId || null, userId: kind === "agent_photo" ? userId : null, sourceMimeType: file.type, sourceByteSize: file.size, optimized: main.optimized, optimizedByteSize: main.bytes.byteLength, thumbnailByteSize: thumb?.bytes.byteLength || null }));
      await env.DB.batch(statements);
      for (const cleanup of cleanupJobs) await processMediaCleanupJob(cleanup.id).catch(() => ({ deleted: false, missing: false }));
    } catch (error) {
      await bucket().delete([key, ...thumbKey ? [thumbKey] : []]);
      throw error;
    }

    const cacheInvalidated = await invalidatePublicSite(c.workspace.agencyId,propertyId||null).then(() => true).catch(() => false);
    return Response.json({ asset: { id, kind, category, propertyId: propertyId || null, url: `/api/media?id=${encodeURIComponent(id)}`, thumbnailUrl: thumbKey ? `/api/media?id=${encodeURIComponent(id)}&variant=thumb` : null }, optimization: { sourceBytes: file.size, outputBytes: main.bytes.byteLength, thumbnailBytes: thumb?.bytes.byteLength || 0, optimized: main.optimized }, cacheInvalidationPending: !cacheInvalidated }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Image upload failed. Please retry." }, { status: 500 });
  }
}

async function DELETE(request: Request) {
  try {
    const c = await context("property.media.manage");
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") || "";
    const asset = await env.DB.prepare("SELECT id,object_key AS objectKey,thumbnail_object_key AS thumbnailObjectKey,property_id AS propertyId,kind,category FROM media_assets WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).first<any>();
    if (!asset) {
      const deleted = await env.DB.prepare("SELECT json_extract(detail,'$.propertyId') AS propertyId FROM audit_logs WHERE agency_id=? AND action='media.deleted' AND resource_type='media_asset' AND resource_id=? LIMIT 1").bind(c.workspace.agencyId, id).first<any>();
      if (deleted?.propertyId) {
        await requirePropertyBranchAccess(c.workspace, deleted.propertyId);
        return Response.json({ ok: true, alreadyDeleted: true });
      }
      return Response.json({ error: "Media was not found." }, { status: 404 });
    }
    if (asset.kind !== "property_photo") return Response.json({ error: "Only property photos can be removed here." }, { status: 400 });
    if (!asset.propertyId) return Response.json({ error: "Property photo is not attached to a property." }, { status: 409 });
    await requirePropertyBranchAccess(c.workspace, asset.propertyId);
    const storage = bucket();
    const completeness = await propertyMediaCompletenessRange(c.workspace.agencyId, asset.propertyId);
    if (!completeness) return Response.json({ error: "Property was not found." }, { status: 404 });
    const cleanupId = crypto.randomUUID();
    const objectKeys = [asset.objectKey, ...asset.thumbnailObjectKey ? [asset.thumbnailObjectKey] : []];
    const statements = [
      env.DB.prepare("DELETE FROM media_assets WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId),
      env.DB.prepare("INSERT INTO media_cleanup_jobs(id,agency_id,media_asset_id,object_keys,status,next_attempt_at) VALUES(?,?,?,?, 'pending',CURRENT_TIMESTAMP)").bind(cleanupId, c.workspace.agencyId, id, JSON.stringify(objectKeys)),
    ];
    if (asset.propertyId) {
      statements.push(env.DB.prepare(`UPDATE properties SET
        photo_count=(SELECT COUNT(*) FROM media_assets WHERE agency_id=? AND property_id=? AND kind='property_photo'),
        completeness=CASE WHEN (SELECT COUNT(*) FROM media_assets WHERE agency_id=? AND property_id=? AND kind='property_photo')>=? THEN ? ELSE ? END,
        updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?`).bind(c.workspace.agencyId, asset.propertyId, c.workspace.agencyId, asset.propertyId, completeness.photoRequirement, completeness.complete, completeness.incomplete, asset.propertyId, c.workspace.agencyId));
      statements.push(env.DB.prepare("UPDATE property_verification_items SET verified=0,verified_by=NULL,verified_at=NULL,note='Photo set changed; verify again.' WHERE agency_id=? AND property_id=? AND item_key='photos'").bind(c.workspace.agencyId, asset.propertyId));
    }
    statements.push(prepareAudit(c.workspace, "media.deleted", "media_asset", id, { kind: asset.kind, category: asset.category, propertyId: asset.propertyId, cleanupId }));
    await env.DB.batch(statements);
    const cleanup = await processMediaCleanupJob(cleanupId, storage).catch(() => ({ deleted: false, missing: false }));
    const remaining = await env.DB.prepare("SELECT photo_count AS count,completeness FROM properties WHERE id=? AND agency_id=?").bind(asset.propertyId, c.workspace.agencyId).first<any>();
    const cacheInvalidated = await invalidatePublicSite(c.workspace.agencyId,asset.propertyId||null).then(() => true).catch(() => false);
    return Response.json({ ok: true, propertyId: asset.propertyId || null, photoCount: Number(remaining?.count || 0), completeness: Number(remaining?.completeness || 0), cleanupPending: !cleanup.deleted, cacheInvalidationPending: !cacheInvalidated });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Image could not be removed." }, { status: 500 });
  }
}

export { DELETE, GET, POST, dynamic };
