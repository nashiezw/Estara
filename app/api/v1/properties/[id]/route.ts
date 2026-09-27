import { env } from "cloudflare:workers";
import { logApiRequest, requireApiCredential } from "../../../../../db/api-auth";
import { clean, idempotent, propertyPayload, updateProperty } from "../../../../../db/public-api";

const route = "/api/v1/properties/:id";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let credential;
  try {
    credential = await requireApiCredential(request, "properties:read");
    const { id } = await params;
    const row = await env.DB.prepare(
      "SELECT id,reference,title,location,price_minor priceMinor,currency,transaction_type transactionType,property_type propertyType,price_label priceLabel,bedrooms,bathrooms,toilets,parking,garages,status,land_size landSize,building_size buildingSize,country,province,city,suburb,address,latitude,longitude,description,features,photo_count photoCount,created_at createdAt,updated_at updatedAt FROM properties WHERE id=? AND agency_id=?",
    ).bind(id, credential.agencyId).first<any>();
    if (!row) return Response.json({ error: "Property was not found." }, { status: 404 });
    const media = await env.DB.prepare(
      "SELECT id,category,sort_order sortOrder FROM media_assets WHERE agency_id=? AND property_id=? AND kind='property_photo' ORDER BY sort_order,created_at",
    ).bind(credential.agencyId, id).all<any>();
    await logApiRequest(credential, route, "GET", 200);
    return Response.json({
      data: {
        ...propertyPayload(row),
        media: media.results.map((item: any) => ({
          ...item,
          url: `/api/media?id=${encodeURIComponent(item.id)}`,
          thumbnailUrl: `/api/media?id=${encodeURIComponent(item.id)}&variant=thumb`,
        })),
      },
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (credential) await logApiRequest(credential, route, "GET", 400);
    return Response.json({ error: error instanceof Error ? error.message : "API request failed." }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let credential, keyHash = "", replayRoute = "";
  try {
    credential = await requireApiCredential(request, "properties:write");
    const { id } = await params;
    const body = await request.json();
    const key = clean(request.headers.get("idempotency-key"), 100);
    let idem: { keyHash: string; existing: any } | null = null;
    if (key) {
      replayRoute = `${route}:PATCH:${id}`;
      idem = await idempotent(credential, replayRoute, key);
      keyHash = idem.keyHash;
      if (idem.existing) return new Response(idem.existing.body, { status: idem.existing.status, headers: { "content-type": "application/json", "x-idempotent-replay": "true" } });
    }
    const updated = await updateProperty(credential, id, body, idem ? { route: replayRoute, keyHash: idem.keyHash, status: 200 } : undefined);
    const response = JSON.stringify({ data: updated });
    await logApiRequest(credential, route, "PATCH", 200);
    return new Response(response, { headers: { "content-type": "application/json" } });
  } catch (error) {
    if (credential && keyHash && replayRoute) {
      const replay = await env.DB.prepare("SELECT response_status status,response_body body FROM api_idempotency_keys WHERE credential_id=? AND route=? AND idempotency_key=?").bind(credential.id, replayRoute, keyHash).first<any>();
      if (replay) return new Response(replay.body, { status: replay.status, headers: { "content-type": "application/json", "x-idempotent-replay": "true" } });
    }
    if (credential) await logApiRequest(credential, route, "PATCH", 400);
    return Response.json({ error: error instanceof Error ? error.message : "API request failed." }, { status: 400 });
  }
}
