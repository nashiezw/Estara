import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type Asset = {
  objectKey: string;
  thumbnailObjectKey: string | null;
  mimeType: string;
  byteSize: number;
  thumbnailByteSize: number | null;
};

async function hasTable(table: string) {
  const row = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
  return Boolean(row);
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const variant = url.searchParams.get("variant") === "thumb" ? "thumb" : "main";
  const agentProfileJoin = await hasTable("agent_profiles")
    ? "LEFT JOIN agent_profiles ap ON ap.agency_id=m.agency_id AND ap.profile_photo_media_id=m.id AND ap.public_enabled=1"
    : "";
  const agentPhotoCondition = agentProfileJoin ? " OR (m.kind='agent_photo' AND ap.user_id IS NOT NULL)" : "";
  const asset = await env.DB.prepare(`SELECT m.object_key AS objectKey,m.thumbnail_object_key AS thumbnailObjectKey,m.mime_type AS mimeType,m.byte_size AS byteSize,m.thumbnail_byte_size AS thumbnailByteSize
    FROM media_assets m
    JOIN agencies a ON a.id=m.agency_id
    JOIN agency_settings s ON s.agency_id=a.id
    LEFT JOIN properties p ON p.id=m.property_id AND p.agency_id=m.agency_id
    ${agentProfileJoin}
    WHERE a.slug=? AND s.onboarding_complete=1 AND m.id=? AND (m.kind='agency_logo' OR m.kind='agency_icon' OR m.kind='website_image' OR (m.kind='property_photo' AND p.status='Available')${agentPhotoCondition})
    LIMIT 1`).bind(slug, id).first<Asset>();
  if (!asset) return Response.json({ error: "Media was not found." }, { status: 404 });
  const key = variant === "thumb" && asset.thumbnailObjectKey ? asset.thumbnailObjectKey : asset.objectKey;
  const size = variant === "thumb" && asset.thumbnailByteSize ? asset.thumbnailByteSize : asset.byteSize;
  const object = await (env as unknown as { MEDIA: R2Bucket }).MEDIA.get(key);
  if (!object) return Response.json({ error: "Media was not found." }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": asset.mimeType,
      "content-length": String(size),
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
