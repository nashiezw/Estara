import { getPlatformIdentity } from "../../db/platform-settings";
import { platformOrigin } from "../../db/public-seo";

export const dynamic = "force-dynamic";

const runtimeEnv = async () => (await import("cloudflare:workers")).env;
const publicPlatformPaths = ["", "/demo"];
const publicSections = ["properties", "sale", "rent", "agents", "services", "about", "contact"];

function xmlEscape(value: string) {
  return value.replace(/[<>&'"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" }[char] || char));
}

function urlEntry(loc: string, changefreq = "weekly", priority = "0.7") {
  return `<url><loc>${xmlEscape(loc)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

async function agencyEntries(origin: string) {
  try {
    const env = await runtimeEnv();
    const agencies = await env.DB.prepare("SELECT a.id,a.slug FROM agencies a JOIN agency_settings s ON s.agency_id=a.id WHERE s.onboarding_complete=1 ORDER BY a.created_at DESC LIMIT 500").all<{ id: string; slug: string }>();
    const entries: string[] = [];
    for (const agency of agencies.results) {
      const base = `${origin}/site/${encodeURIComponent(agency.slug)}`;
      entries.push(urlEntry(base, "weekly", "0.8"));
      for (const section of publicSections) entries.push(urlEntry(`${base}/${section}`, "weekly", "0.7"));
      const properties = await env.DB.prepare("SELECT id FROM properties WHERE agency_id=? AND status='Available' ORDER BY updated_at DESC LIMIT 500").bind(agency.id).all<{ id: string }>();
      for (const property of properties.results) entries.push(urlEntry(`${base}/properties/${encodeURIComponent(property.id)}`, "daily", "0.8"));
    }
    return entries;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const platform = await getPlatformIdentity();
  const origin = platformOrigin({ get: name => request.headers.get(name) }, platform);
  const entries = [
    ...publicPlatformPaths.map(path => urlEntry(`${origin}${path}`, path ? "monthly" : "weekly", path ? "0.6" : "1.0")),
    ...(await agencyEntries(origin)),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "content-type": "application/xml; charset=utf-8",
    },
  });
}
