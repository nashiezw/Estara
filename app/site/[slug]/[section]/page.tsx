import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicAgency, listPublicAgents, listPublicProperties } from "../../../../db/public-site";
import { PublicSection } from "../public-website";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const ALLOWED = new Set(["properties", "sale", "rent", "agents", "services", "about", "contact"]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string; section: string }> }): Promise<Metadata> {
  const { slug, section } = await params;
  if (!ALLOWED.has(section)) return { robots: { index: false, follow: false } };
  const agency = await getPublicAgency(slug);
  if (!agency) return { robots: { index: false, follow: false } };
  return { title: `${section[0].toUpperCase() + section.slice(1)} | ${agency.name}`, description: `${section} from ${agency.name}.`, alternates: { canonical: `/site/${slug}/${section}` } };
}

export default async function Page({ params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params;
  if (!ALLOWED.has(section)) notFound();
  const agency = await getPublicAgency(slug);
  if (!agency) notFound();
  const type = section === "sale" ? "Sale" : section === "rent" ? "Rent" : undefined;
  const [properties, agents] = await Promise.all([
    listPublicProperties(agency.id, type),
    section === "agents" ? listPublicAgents(agency.id) : Promise.resolve([]),
  ]);
  return <PublicSection agency={agency} properties={properties} section={section} agents={agents} />;
}
