import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicAgency, listPublicAgents, listPublicBranches, listPublicProperties } from "../../../../db/public-site";
import { agencyJsonLd, publicIconUrl, publicMediaUrl, publicOrigin, publicUrl, safeJsonLd, sectionDescription, sectionTitle } from "../../../../db/public-seo";
import { PublicSection } from "../public-website";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const ALLOWED = new Set(["properties", "sale", "rent", "agents", "services", "about", "contact"]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string; section: string }> }): Promise<Metadata> {
  const { slug, section } = await params;
  if (!ALLOWED.has(section)) return { robots: { index: false, follow: false } };
  const agency = await getPublicAgency(slug);
  if (!agency) return { robots: { index: false, follow: false } };
  const h = await headers();
  const origin = publicOrigin(h);
  const heroKey = `${section}HeroImageId` as keyof typeof agency.publicContent;
  const imageId = String(agency.publicContent[heroKey] || agency.publicContent.featuredImageId || agency.logoId || "");
  const icon = publicIconUrl(origin, agency);
  const description = sectionDescription(section, agency);
  const url = publicUrl(origin, agency, `/${section}`);
  return {
    title: sectionTitle(section, agency),
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    icons: icon ? { icon, apple: icon } : undefined,
    openGraph: { title: sectionTitle(section, agency), description, type: "website", url, siteName: agency.name, images: publicMediaUrl(origin, agency, imageId) ? [publicMediaUrl(origin, agency, imageId)!] : [] },
    twitter: { card: "summary_large_image", title: sectionTitle(section, agency), description, images: publicMediaUrl(origin, agency, imageId) ? [publicMediaUrl(origin, agency, imageId)!] : [] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params;
  if (!ALLOWED.has(section)) notFound();
  const agency = await getPublicAgency(slug);
  if (!agency) notFound();
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "").toLowerCase();
  const pathMode = host.replace(/:\d+$/, "").startsWith(`${slug.toLowerCase()}.`) ? "clean" : "site";
  const type = section === "sale" ? "Sale" : section === "rent" ? "Rent" : undefined;
  const [properties, agents, branches] = await Promise.all([
    listPublicProperties(agency.id, type),
    section === "agents" ? listPublicAgents(agency.id) : Promise.resolve([]),
    ["about", "contact"].includes(section) ? listPublicBranches(agency.id) : Promise.resolve([]),
  ]);
  const origin = publicOrigin(requestHeaders);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(agencyJsonLd(origin, agency)) }} />
    <PublicSection agency={agency} properties={properties} section={section} agents={agents} branches={branches} pathMode={pathMode} />
  </>;
}
