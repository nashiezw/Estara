import { logApiRequest, requireApiCredential } from "../../../../../../db/api-auth";
import { storePropertyMedia } from "../../../../../../db/public-api";

const route = "/api/v1/properties/:id/media";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let credential;
  try {
    credential = await requireApiCredential(request,"properties:media:write");
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    const category = String(form.get("category") || "other");
    if (!(file instanceof File)) throw new Error("Choose a property image.");
    const asset = await storePropertyMedia(credential, id, file, category);
    await logApiRequest(credential, route, "POST", 201);
    return Response.json({ data: asset }, { status: 201 });
  } catch (error) {
    if (credential) await logApiRequest(credential, route, "POST", 400);
    return Response.json({ error: error instanceof Error ? error.message : "API request failed." }, { status: 400 });
  }
}
