import { revalidatePath } from "next/cache";
import { env } from "cloudflare:workers";

export const PUBLIC_SITE_REVALIDATE_SECONDS = 300;

export function publicSitePaths(slug: string, propertyId?: string | null) {
  const base = `/site/${slug}`;
  const paths = [base, `${base}/properties`, `${base}/sale`, `${base}/rent`, `${base}/agents`, `${base}/services`, `${base}/about`, `${base}/contact`];
  if (propertyId) paths.push(`${base}/properties/${propertyId}`);
  return paths;
}

export async function invalidatePublicSite(agencyId: string, propertyId?: string | null) {
  const agency = await env.DB.prepare("SELECT slug FROM agencies WHERE id=?").bind(agencyId).first<{ slug: string }>();
  if (!agency?.slug) return [];
  const paths = publicSitePaths(agency.slug, propertyId);
  for (const path of paths) revalidatePath(path);
  return paths;
}
