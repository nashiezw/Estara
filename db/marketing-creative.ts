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

export const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));
export const money = (minor: number, currency: string) => `${currency} ${(minor / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const hex = (value: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
const num = (value: unknown, fallback: number, min: number, max: number) => Math.max(min, Math.min(max, Number(value ?? fallback) || fallback));

export function propertyDetails(property?: any, settings?: any) {
  if (settings?.detailsLine) return String(settings.detailsLine).slice(0, 160);
  if (!property) return "Bedrooms, bathrooms and key features appear here.";
  return [property.bedrooms ? `${property.bedrooms} bedrooms` : "", property.bathrooms ? `${property.bathrooms} bathrooms` : "", ...(property.features || []).slice(0, 2)].filter(Boolean).join(" - ");
}

export function suggestedCaption(property?: any) {
  if (!property) return "";
  return [property.title, property.price || money(property.priceMinor || 0, property.currency || "USD"), propertyDetails(property), property.location].filter(Boolean).join("\n");
}

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

export function creativeSvg(snapshot: any, width: number, height: number) {
  const property = snapshot.property || {}, agency = snapshot.agency || {}, copy = snapshot.copy || {}, settings = snapshot.designSettings || {};
  const primary = hex(settings.brandPrimary, agency.primaryColor || "#153b34"), accent = hex(settings.brandAccent, agency.accentColor || "#e6bd5f");
  const design = String(snapshot.design || "signature"), layout = String(settings.layout || "image-led"), typography = String(agency.typography || "classic");
  const headingFont = typography === "modern" ? "Arial" : typography === "editorial" ? "Times New Roman" : "Georgia", bodyFont = typography === "editorial" ? "Georgia" : "Arial";
  const portrait = height / width > 1.3, overlay = num(settings.overlay, 72, 20, 92) / 100, headlineScale = num(settings.headlineScale, 100, 72, 132) / 100, radius = num(settings.radius, 8, 0, 32);
  const imageX = `${num(settings.imageX, 50, 0, 100)}%`, imageY = `${num(settings.imageY, 50, 0, 100)}%`, photo = String(settings.photoUrl || snapshot.photoUrl || "");
  const title = copy.headline || property.title || "Property marketing", details = propertyDetails(property, settings), price = settings.priceLabel || property.price || money(property.priceMinor || 0, property.currency || "USD");
  const align = settings.textAlign === "center" ? "center" : "left", anchor = align === "center" ? "middle" : "start", x = align === "center" ? width * .38 : width * .07;
  const textWidth = layout === "split" ? width * .43 : width * .72, imageWidth = layout === "split" ? width * .5 : width * .52, imageOpacity = layout === "text-first" ? .22 : design === "minimal" ? .42 : .9;
  const textColor = design === "minimal" || design === "editorial" ? primary : "#fff", mutedColor = design === "minimal" || design === "editorial" ? "#53675f" : "#e5eeea";
  const image = photo && settings.showImage !== false ? `<image href="${esc(photo)}" x="${layout === "text-first" ? 0 : width - imageWidth}" y="0" width="${layout === "text-first" ? width : imageWidth}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity="${imageOpacity}" style="object-position:${imageX} ${imageY}"/>` : "";
  const background = design === "editorial" ? "#fbfaf5" : design === "minimal" ? "#f3f7f5" : primary;
  const overlayFill = design === "editorial" || design === "minimal" ? `rgba(255,255,255,${overlay})` : `rgba(16,59,50,${overlay})`;
  const showBadge = settings.showBadge !== false, showFacts = settings.showFacts !== false, showPrice = settings.showPrice !== false, showBrand = settings.showLogo !== false;
  const brand = showBrand ? `<text x="${x}" y="${height * .15}" text-anchor="${anchor}" fill="${esc(accent)}" font-family="${bodyFont}" font-weight="900" font-size="${Math.round(width * .022)}">${esc((agency.name || "ESTARA").toUpperCase())}</text>` : "";
  const badge = showBadge ? `<circle cx="${x}" cy="${height * .22}" r="${Math.round(width * .027)}" fill="${esc(accent)}"/><text x="${x}" y="${height * .232}" text-anchor="middle" fill="${esc(primary)}" font-family="${bodyFont}" font-weight="900" font-size="${Math.round(width * .022)}">${esc(String(settings.icon || "home").slice(0, 1).toUpperCase())}</text><text x="${x}" y="${height * .29}" text-anchor="${anchor}" fill="${esc(accent)}" font-family="${bodyFont}" font-weight="900" font-size="${Math.round(width * .018)}">${esc(settings.badge || "Just listed")}</text>` : "";
  const headline = `<foreignObject x="${align === "center" ? width * .09 : width * .07}" y="${height * .35}" width="${textWidth}" height="${height * .27}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:800 ${Math.round((portrait ? 64 : 52) * headlineScale)}px/1 ${headingFont};color:${textColor};letter-spacing:0;text-align:${align};text-transform:${design === "bold" ? "uppercase" : "none"}">${esc(title)}</div></foreignObject>`;
  const priceLine = showPrice ? `<text x="${x}" y="${height * .73}" text-anchor="${anchor}" fill="${esc(textColor)}" font-family="${headingFont}" font-size="${Math.round(width * .043)}">${esc(price)}</text>` : "";
  const factsLine = showFacts ? `<text x="${x}" y="${height * .82}" text-anchor="${anchor}" fill="${esc(mutedColor)}" font-family="${bodyFont}" font-size="${Math.round(width * .017)}">${esc(details)}</text>` : "";
  const cta = settings.ctaLabel ? `<text x="${x}" y="${height * .91}" text-anchor="${anchor}" fill="${esc(accent)}" font-family="${bodyFont}" font-weight="900" font-size="${Math.round(width * .016)}">${esc(settings.ctaLabel)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><clipPath id="clip"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></clipPath></defs><g clip-path="url(#clip)"><rect width="100%" height="100%" fill="${esc(background)}"/>${image}<rect width="100%" height="100%" fill="${esc(overlayFill)}"/><rect x="${width * .055}" y="${height * .075}" width="${width * .89}" height="${height * .85}" fill="none" stroke="${esc(design === "bold" ? accent : "transparent")}" stroke-width="${design === "bold" ? 10 : 0}"/>${brand}${badge}${headline}${priceLine}${factsLine}${cta}</g></svg>`;
}
