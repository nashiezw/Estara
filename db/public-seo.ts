import type { PublicAgency, PublicProperty } from "./public-site";
import type { PlatformIdentity } from "./platform-defaults";

type HeaderLike = { get(name: string): string | null };

const sectionNames: Record<string, string> = {
  properties: "Properties",
  sale: "For sale",
  rent: "To rent",
  agents: "Agents",
  services: "Services",
  about: "About",
  contact: "Contact",
};

export function publicOrigin(headers: HeaderLike) {
  const host = headers.get("x-forwarded-host") || headers.get("host") || "localhost:3000";
  const protocol = headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export function absolutePublicUrl(origin: string, value?: string | null) {
  if (!value) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    const clean = value.startsWith("/") ? value : `/${value}`;
    return `${origin}${clean}`;
  }
}

export function platformOrigin(headers: HeaderLike, platform: Pick<PlatformIdentity, "domain">) {
  const requestOrigin = publicOrigin(headers);
  const host = (() => {
    try {
      return new URL(requestOrigin).host;
    } catch {
      return "";
    }
  })();
  if (host.includes("localhost") || host.startsWith("127.0.0.1")) return requestOrigin;
  const domain = platform.domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return domain ? `https://${domain}` : requestOrigin;
}

export function platformIconUrl(origin: string, platform: Pick<PlatformIdentity, "iconUrl" | "darkIconUrl">) {
  const saved = absolutePublicUrl(origin, platform.iconUrl || platform.darkIconUrl);
  const browserIcon = absolutePublicUrl(origin, "/favicon.ico");
  return saved?.includes("/api/platform/asset") ? browserIcon : saved || browserIcon || absolutePublicUrl(origin, "/favicon.svg");
}

export function platformLogoUrl(origin: string, platform: Pick<PlatformIdentity, "logoUrl" | "darkLogoUrl" | "iconUrl">) {
  return absolutePublicUrl(origin, platform.logoUrl || platform.darkLogoUrl || platform.iconUrl || "/og.png");
}

export function platformSeoDescription(platform: Pick<PlatformIdentity, "descriptor" | "tagline">) {
  return platform.descriptor || platform.tagline || "A real estate operating system for property teams, marketing, enquiries and seller updates.";
}

export function publicUrl(origin: string, agency: PublicAgency, path = "") {
  const host = (() => {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  const websiteHost = (() => {
    try {
      return agency.website ? new URL(agency.website).hostname.toLowerCase() : "";
    } catch {
      return String(agency.website || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    }
  })();
  const platformHost = host === "estara.co.zw" || host === "www.estara.co.zw" || host === "app.estara.co.zw";
  const previewHost = host.includes("localhost") || host.startsWith("127.0.0.1") || host.endsWith(".workers.dev") || host.endsWith(".pages.dev");
  const agencySubdomain = host.startsWith(`${agency.slug.toLowerCase()}.`) && !host.startsWith("app.");
  const customAgencyDomain = Boolean(host && !platformHost && !previewHost && (host === websiteHost || !host.endsWith(".estara.co.zw")));
  if (agencySubdomain || customAgencyDomain) return `${origin}${path || ""}`;
  return `${origin}/site/${encodeURIComponent(agency.slug)}${path}`;
}

export function publicMediaUrl(origin: string, agency: PublicAgency, mediaId?: string | null) {
  return mediaId ? `${origin}/api/public/${encodeURIComponent(agency.slug)}/media?id=${encodeURIComponent(mediaId)}` : undefined;
}

export function publicIconUrl(origin: string, agency: PublicAgency) {
  return publicMediaUrl(origin, agency, agency.iconId || agency.logoId);
}

export function agencyDescription(agency: PublicAgency) {
  return agency.tagline || `${agency.name} shares verified property listings, local market guidance and direct enquiry support.`;
}

export function sectionTitle(section: string, agency: PublicAgency) {
  return `${sectionNames[section] || "Property"} | ${agency.name}`;
}

export function sectionDescription(section: string, agency: PublicAgency) {
  const name = agency.name;
  const base = agencyDescription(agency);
  const descriptions: Record<string, string> = {
    properties: `Explore live property listings from ${name}. ${base}`,
    sale: `Browse property for sale from ${name}, with verified details and direct enquiry support.`,
    rent: `Find rental property from ${name}, with agency-backed facts and viewing requests.`,
    agents: `Meet the ${name} team and contact the right property professional.`,
    services: `See the property services offered by ${name}, from sales and rentals to client support.`,
    about: `Learn about ${name}, its local expertise, service approach and property standards.`,
    contact: `Contact ${name} for property enquiries, viewings and agency support.`,
  };
  return descriptions[section] || base;
}

export function propertyDescription(property: PublicProperty, agency: PublicAgency) {
  const facts = [`${property.transactionType} in ${property.location}`];
  if (property.beds) facts.push(`${property.beds} bedrooms`);
  if (property.baths) facts.push(`${property.baths} bathrooms`);
  if (property.size) facts.push(property.size);
  return `${facts.join(", ")}. Enquire with ${agency.name} for verified details and viewing support.`;
}

export function agencyJsonLd(origin: string, agency: PublicAgency) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: agency.name,
    url: publicUrl(origin, agency),
    description: agencyDescription(agency),
    telephone: agency.phone || agency.whatsapp || undefined,
    email: agency.email || undefined,
    logo: publicMediaUrl(origin, agency, agency.logoId),
    image: publicMediaUrl(origin, agency, agency.publicContent.featuredImageId || agency.publicContent.homeHeroImageId || agency.logoId),
    areaServed: agency.businessActivities?.length ? agency.businessActivities.join(", ") : undefined,
  };
}

export function agencyWebsiteJsonLd(origin: string, agency: PublicAgency) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: agency.name,
    url: publicUrl(origin, agency),
    publisher: agencyJsonLd(origin, agency),
    potentialAction: {
      "@type": "SearchAction",
      target: `${publicUrl(origin, agency, "/properties")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function propertyJsonLd(origin: string, agency: PublicAgency, property: PublicProperty) {
  return {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: property.title,
    url: publicUrl(origin, agency, `/properties/${encodeURIComponent(property.id)}`),
    image: publicMediaUrl(origin, agency, property.heroMediaId),
    description: propertyDescription(property, agency),
    address: property.location,
    numberOfRooms: property.beds || undefined,
    amenityFeature: property.baths ? [{ "@type": "LocationFeatureSpecification", name: `${property.baths} bathrooms` }] : undefined,
    provider: agencyJsonLd(origin, agency),
  };
}

export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
