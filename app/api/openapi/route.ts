import { openApiSpec } from "../../../db/openapi";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(openApiSpec, { headers: { "content-disposition": "attachment; filename=estara-openapi.json", "cache-control": "public, max-age=300" } });
}
