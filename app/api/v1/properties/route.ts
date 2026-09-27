import { env } from "cloudflare:workers";
import { logApiRequest, requireApiCredential } from "../../../../db/api-auth";
import { applyFieldMap, idempotent, insertProperty, propertyPayload } from "../../../../db/public-api";

const route = "/api/v1/properties";

export async function GET(request: Request) {
  let credential;
  try {
    credential = await requireApiCredential(request,"properties:read");
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") || "";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
    const rows = await env.DB.prepare(
      "SELECT id,reference,title,location,price_minor priceMinor,currency,transaction_type transactionType,property_type propertyType,price_label priceLabel,bedrooms,bathrooms,toilets,parking,garages,status,land_size landSize,building_size buildingSize,country,province,city,suburb,address,latitude,longitude,features,photo_count photoCount,created_at createdAt,updated_at updatedAt FROM properties WHERE agency_id=? AND status='Available' AND id>? ORDER BY id LIMIT ?",
    ).bind(credential.agencyId, cursor, limit + 1).all<any>();
    const hasMore = rows.results.length > limit;
    const items = rows.results.slice(0, limit).map(propertyPayload);
    await logApiRequest(credential, route, "GET", 200);
    return Response.json({ data: items, nextCursor: hasMore ? items.at(-1)?.id : null }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (credential) await logApiRequest(credential, route, "GET", error instanceof Error && error.message.includes("rate limit") ? 429 : 403);
    return Response.json(
      { error: error instanceof Error ? error.message : "API request failed." },
      { status: error instanceof Error && error.message.includes("rate limit") ? 429 : 401, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  let credential, keyHash = "";
  try {
    credential = await requireApiCredential(request,"properties:write");
    const idem = await idempotent(credential, route, request.headers.get("idempotency-key") || "");
    keyHash = idem.keyHash;
    if (idem.existing) return new Response(idem.existing.body, { status: idem.existing.status, headers: { "content-type": "application/json", "x-idempotent-replay": "true" } });
    const created = await insertProperty(credential, applyFieldMap(await request.json()), { route, keyHash, status: 201 });
    const body = JSON.stringify({ data: created });
    await logApiRequest(credential, route, "POST", 201);
    return new Response(body, { status: 201, headers: { "content-type": "application/json" } });
  } catch (error) {
    if (credential && keyHash) {
      const replay = await env.DB.prepare("SELECT response_status status,response_body body FROM api_idempotency_keys WHERE credential_id=? AND route=? AND idempotency_key=?").bind(credential.id, route, keyHash).first<any>();
      if (replay) return new Response(replay.body, { status: replay.status, headers: { "content-type": "application/json", "x-idempotent-replay": "true" } });
    }
    if (credential) await logApiRequest(credential, route, "POST", 400);
    return Response.json({ error: error instanceof Error ? error.message : "API request failed." }, { status: 400 });
  }
}
