import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { PlatformAuthorizationError, requirePlatformUser, writePlatformAudit } from "../../../../db/platform-auth";
import { ensurePlatformIdentity } from "../../../../db/platform-settings";
import { safeDownloadName, validateMediaFile } from "../../../../db/media-policy";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["logo", "icon"]);
const headers = { "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" };

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

const keyFor = (type: string) => `platform/brand/${type}.webp`;

async function optimize(bytes: ArrayBuffer, width: number, quality: number) {
  const result = await images().input(new Blob([bytes]).stream()).transform({ width, fit: "scale-down" }).output({ format: "webp", quality });
  const response = result.response();
  if (!response.ok) throw new Error("Image optimization failed.");
  return new Uint8Array(await response.arrayBuffer());
}

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type") || "";
  if (!allowedTypes.has(type)) return Response.json({ error: "Brand asset was not found." }, { status: 404 });
  const object = await bucket().get(keyFor(type));
  if (!object) return Response.json({ error: "Brand asset was not found." }, { status: 404 });
  return new Response(object.body, { headers: { ...headers, "content-type": "image/webp", "content-disposition": `inline; filename="${safeDownloadName(`estara-${type}.webp`)}"` } });
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const context = await requirePlatformUser(user, ["super_admin"]);
    const form = await request.formData();
    const type = String(form.get("type") || "");
    const file = form.get("file");
    if (!allowedTypes.has(type) || !(file instanceof File)) return Response.json({ error: "Choose a logo or icon image to upload." }, { status: 400 });
    const invalid = validateMediaFile(file);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    const source = await file.arrayBuffer();
    const asset = await optimize(source, type === "icon" ? 256 : 900, type === "icon" ? 90 : 84);
    await bucket().put(keyFor(type), asset, { httpMetadata: { contentType: "image/webp" }, customMetadata: { scope: "platform", type, uploadedBy: context.userId } });

    await ensurePlatformIdentity();
    const url = `/api/platform/asset?type=${type}&v=${encodeURIComponent(crypto.randomUUID())}`;
    await env.DB.prepare(`UPDATE platform_settings SET ${type === "logo" ? "logo_url" : "icon_url"}=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'`).bind(url).run();
    await writePlatformAudit(context, `platform.${type}.uploaded`, "platform_settings", "default", { sourceMimeType: file.type, sourceByteSize: file.size, optimizedByteSize: asset.byteLength });
    return Response.json({ type, url });
  } catch (error) {
    if (error instanceof PlatformAuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: error instanceof Error && error.message === "Image processing is unavailable." ? error.message : "Platform brand upload failed. Please retry." }, { status: 500 });
  }
}
