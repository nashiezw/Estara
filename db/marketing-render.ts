import { env } from "cloudflare:workers";
import QRCode from "../vendor/qrcode/lib/browser.js";
import { brochurePdf } from "./marketing-pdf";

export const MARKETING_FORMATS = {
  whatsapp_card: { name: "WhatsApp card", width: 1200, height: 628, kind: "creative.svg" },
  whatsapp_status: { name: "WhatsApp status", width: 1080, height: 1920, kind: "creative.svg" },
  facebook_square: { name: "Facebook 1:1", width: 1080, height: 1080, kind: "creative.svg" },
  facebook_portrait: { name: "Facebook 4:5", width: 1080, height: 1350, kind: "creative.svg" },
  instagram_post: { name: "Instagram post", width: 1080, height: 1080, kind: "creative.svg" },
  instagram_story: { name: "Instagram story", width: 1080, height: 1920, kind: "creative.svg" },
  flyer: { name: "Property flyer", width: 595, height: 842, kind: "flyer.pdf" },
  brochure: { name: "Property brochure", width: 595, height: 842, kind: "brochure.pdf" },
  qr: { name: "Share QR code", width: 600, height: 600, kind: "qr.svg" },
} as const;
export type MarketingFormat = keyof typeof MARKETING_FORMATS;

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));
const money = (minor: number, currency: string) => `${currency} ${(minor / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const bucket = () => {
  const value = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
  if (!value) throw new Error("Private media storage is unavailable.");
  return value;
};

export function factualCopy(property: any) {
  const facts = [
    property.bedrooms ? `${property.bedrooms} bedrooms` : "",
    property.bathrooms ? `${property.bathrooms} bathrooms` : "",
    property.landSize ? `${property.landSize} land` : "",
    property.features?.length ? property.features.slice(0, 5).join(", ") : "",
  ].filter(Boolean);
  const place = [property.suburb, property.city].filter(Boolean).join(", ") || property.location;
  const headline = `${property.propertyType || "Property"} for ${String(property.transactionType || "sale").toLowerCase()} in ${place}`;
  const listingDescription = [property.description, `${money(property.priceMinor, property.currency)}.`, facts.length ? `Key facts: ${facts.join("; ")}.` : ""].filter(Boolean).join(" ");
  const socialCaption = [headline, money(property.priceMinor, property.currency), facts.join(" - "), property.reference ? `Ref: ${property.reference}` : ""].filter(Boolean).join("\n");
  return { headline, listingDescription, socialCaption, facts };
}

function marks(snapshot: any, width: number, height: number, bodyFont: string) {
  const a = snapshot.agency, s = snapshot.designSettings || {};
  const align = s.textAlign === "center" ? "center" : "left";
  const anchor = align === "center" ? "middle" : "start";
  const x = align === "center" ? width * .36 : width * .08;
  const logo = s.showLogo === false ? "" : `<text x="${x}" y="${height * .17}" text-anchor="${anchor}" fill="${esc(a.accentColor)}" font-family="${bodyFont}" font-weight="900" font-size="${Math.round(width * .026)}">${esc(a.name.toUpperCase())}</text>`;
  const badge = `<circle cx="${x}" cy="${height * .235}" r="${Math.round(width * .026)}" fill="${esc(a.accentColor)}"/><text x="${x}" y="${height * .247}" text-anchor="middle" fill="${esc(a.primaryColor)}" font-family="${bodyFont}" font-weight="900" font-size="${Math.round(width * .022)}">${esc(String(s.icon || "home").slice(0, 1).toUpperCase())}</text><text x="${x}" y="${height * .305}" text-anchor="${anchor}" fill="${esc(a.accentColor)}" font-family="${bodyFont}" font-weight="900" font-size="${Math.round(width * .018)}">${esc(s.badge || "Just listed")}</text>`;
  return { align, anchor, x, logo, badge };
}

export function creativeSvg(snapshot: any, width: number, height: number) {
  const p = snapshot.property, a = snapshot.agency, copy = snapshot.copy, settings = snapshot.designSettings || {};
  const portrait = height / width > 1.3, titleSize = portrait ? 64 : 52, price = money(p.priceMinor, p.currency), facts = copy.facts.slice(0, 4);
  const typography = String(a.typography || "classic"), headingFont=typography==="modern"?"Arial":typography==="editorial"?"Times New Roman":"Georgia", bodyFont = typography === "editorial" ? "Georgia" : "Arial";
  const design = String(snapshot.design || "signature"), photo = String(settings.photoUrl || snapshot.photoUrl || "");
  const image = photo ? `<image href="${esc(photo)}" x="${width * .48}" y="${height * .08}" width="${width * .45}" height="${height * .72}" preserveAspectRatio="xMidYMid slice" opacity="${design === "minimal" ? .38 : .82}"/>` : "";
  const m = marks(snapshot, width, height, bodyFont);
  const title = (x: number, y: number, w: number, h: number, size: number, color = "white", family = headingFont, weight = 700, extra = "") => `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:${weight} ${size}px/1.02 ${family};color:${color};letter-spacing:0;text-align:${m.align};${extra}">${esc(p.title)}</div></foreignObject>`;
  if (design==="bold") return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${esc(a.primaryColor)}"/>${image}<rect x="${width * .05}" y="${height * .08}" width="${width * .9}" height="${height * .84}" fill="none" stroke="${esc(a.accentColor)}" stroke-width="10"/>${m.logo}${m.badge}${title(width * .08, height * .34, width * .58, height * .3, Math.round(titleSize * 1.08), "white", bodyFont, 900, "text-transform:uppercase")}<text x="${m.x}" y="${height * .74}" text-anchor="${m.anchor}" fill="#fff" font-family="${headingFont}" font-size="${Math.round(width * .05)}">${esc(price)}</text><text x="${m.x}" y="${height * .82}" text-anchor="${m.anchor}" fill="#fff" font-family="${bodyFont}" font-size="${Math.round(width * .018)}">${esc(facts.join("  -  "))}</text></svg>`;
  if (design === "editorial") return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fbfaf5"/><rect x="${width * .04}" y="${height * .05}" width="${width * .92}" height="${height * .9}" fill="none" stroke="${esc(a.primaryColor)}" stroke-width="2"/>${photo ? `<image href="${esc(photo)}" x="${width * .56}" y="${height * .12}" width="${width * .34}" height="${height * .62}" preserveAspectRatio="xMidYMid slice"/>` : ""}${m.logo}${m.badge}${title(width * .09, height * .34, width * .42, height * .3, titleSize, esc(a.primaryColor), headingFont, 500)}<text x="${m.x}" y="${height * .73}" text-anchor="${m.anchor}" fill="${esc(a.primaryColor)}" font-family="${headingFont}" font-size="${Math.round(width * .044)}">${esc(price)}</text><text x="${m.x}" y="${height * .82}" text-anchor="${m.anchor}" fill="${esc(a.primaryColor)}" font-family="${bodyFont}" font-size="${Math.round(width * .016)}">${esc([p.suburb, p.city].filter(Boolean).join(", ") || p.location)}</text><rect x="${width * .09}" y="${height * .88}" width="${width * .2}" height="5" fill="${esc(a.accentColor)}"/></svg>`;
  if (design === "minimal") return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f3f7f5"/>${image}<rect x="${width * .07}" y="${height * .1}" width="${width * .5}" height="${height * .74}" rx="22" fill="#ffffff" opacity=".94"/>${m.logo}${m.badge}${title(width * .11, height * .34, width * .39, height * .22, Math.round(titleSize * .8), esc(a.primaryColor))}<text x="${m.x}" y="${height * .63}" text-anchor="${m.anchor}" fill="${esc(a.primaryColor)}" font-family="${headingFont}" font-size="${Math.round(width * .036)}">${esc(price)}</text><text x="${m.x}" y="${height * .72}" text-anchor="${m.anchor}" fill="${esc(a.primaryColor)}" font-family="${bodyFont}" font-size="${Math.round(width * .015)}">${esc(facts.join("  -  "))}</text></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${esc(a.primaryColor)}"/>${image}<rect width="100%" height="100%" fill="url(#shade)"/><defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${esc(a.primaryColor)}" stop-opacity=".96"/><stop offset=".58" stop-color="${esc(a.primaryColor)}" stop-opacity=".62"/><stop offset="1" stop-color="${esc(a.primaryColor)}" stop-opacity=".12"/></linearGradient></defs><circle cx="${width * .88}" cy="${height * .12}" r="${Math.min(width, height) * .26}" fill="${esc(a.accentColor)}" opacity=".14"/><rect x="${width * .07}" y="${height * .08}" width="${width * .12}" height="6" rx="3" fill="${esc(a.accentColor)}"/>${m.logo}${m.badge}<text x="${m.x}" y="${height * (portrait ? .39 : .38)}" text-anchor="${m.anchor}" fill="${esc(a.accentColor)}" font-family="${bodyFont}" font-weight="700" font-size="${Math.round(width * .022)}">${esc(String(p.transactionType).toUpperCase())} - ${esc(p.propertyType)}</text>${title(width * .07, height * (portrait ? .43 : .42), width * .82, height * .25, titleSize)}<text x="${m.x}" y="${height * (portrait ? .66 : .74)}" text-anchor="${m.anchor}" fill="#fff" font-family="${headingFont}" font-size="${Math.round(width * .044)}">${esc(price)}</text><text x="${m.x}" y="${height * (portrait ? .72 : .82)}" text-anchor="${m.anchor}" fill="#d5e2dd" font-family="${bodyFont}" font-size="${Math.round(width * .018)}">${esc([p.suburb, p.city].filter(Boolean).join(", ") || p.location)}</text><text x="${m.x}" y="${height * (portrait ? .78 : .89)}" text-anchor="${m.anchor}" fill="#fff" font-family="${bodyFont}" font-size="${Math.round(width * .017)}">${esc(facts.join("  -  "))}</text><line x1="${width * .07}" y1="${height * .9}" x2="${width * .93}" y2="${height * .9}" stroke="#ffffff55"/><text x="${width * .07}" y="${height * .95}" fill="#d5e2dd" font-family="${bodyFont}" font-size="${Math.round(width * .014)}">${esc(p.reference)} - ${esc(a.phone || a.email || "")}</text></svg>`;
}

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
    bytes = new TextEncoder().encode(creativeSvg(snapshot, spec.width, spec.height));
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
