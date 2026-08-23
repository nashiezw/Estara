import { env } from "cloudflare:workers";
import QRCode from "../vendor/qrcode/lib/browser.js";
import { brochurePdf } from "./marketing-pdf";
import { MARKETING_FORMATS, type MarketingFormat, creativeSvg, factualCopy } from "./marketing-creative";
import { marketingDocumentToSvg } from "./marketing-document";
export { MARKETING_FORMATS, factualCopy };
const bucket = () => {
  const value = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!value) throw new Error("Private media storage is unavailable.");
  return value;
};

export async function renderMarketingJob(jobId: string, agencyId: string) {
  const job = await env.DB.prepare("SELECT id,format,input_snapshot AS inputSnapshot FROM marketing_render_jobs WHERE id=? AND agency_id=?").bind(jobId, agencyId).first<any>();
  if (!job) throw new Error("Render job was not found.");
  const snapshot = JSON.parse(job.inputSnapshot), format = job.format as MarketingFormat, spec = MARKETING_FORMATS[format];
  if (!spec) throw new Error("Unsupported marketing format.");
  let bytes: Uint8Array, contentType: string, kind = spec.kind;
  if (format === "brochure" || format === "flyer") {
    bytes = await brochurePdf(snapshot, format === "flyer");
    contentType = "application/pdf";
  } else if (format === "qr") {
    const svg = await QRCode.toString(snapshot.shareUrl, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: snapshot.agency.primaryColor || "#153b34", light: "#ffffff" } });
    bytes = new TextEncoder().encode(svg);
    contentType = "image/svg+xml";
  } else {
    bytes = new TextEncoder().encode(snapshot.designSettings?.designDocument ? marketingDocumentToSvg(snapshot.designSettings.designDocument) : creativeSvg(snapshot, spec.width, spec.height));
    contentType = "image/svg+xml";
  }
  const objectKey = `tenants/${agencyId}/marketing/${jobId}/${kind}`;
  await bucket().put(objectKey, bytes, { httpMetadata: { contentType }, customMetadata: { agencyId, jobId, format } });
  await env.DB.batch([
    env.DB.prepare("INSERT INTO marketing_outputs(id,agency_id,job_id,kind,object_key,content_type,byte_size) VALUES(?,?,?,?,?,?,?) ON CONFLICT(job_id,kind) DO UPDATE SET object_key=excluded.object_key,content_type=excluded.content_type,byte_size=excluded.byte_size,created_at=CURRENT_TIMESTAMP").bind(crypto.randomUUID(), agencyId, jobId, kind, objectKey, contentType, bytes.byteLength),
    env.DB.prepare("UPDATE marketing_render_jobs SET status='complete',completed_at=CURRENT_TIMESTAMP,last_error=NULL WHERE id=? AND agency_id=?").bind(jobId, agencyId),
  ]);
  return { kind, contentType, byteSize: bytes.byteLength };
}
