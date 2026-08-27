import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { publicPropertyFallbackDescription, publicPropertyFacts, publicPropertyFeatures, publicPropertySummaryItems } from "../../../../../db/public-property-display";
import { getPublicAgency, getPublicProperty, listPublicProperties, type PublicProperty } from "../../../../../db/public-site";
import { propertyDescription, propertyJsonLd, publicIconUrl, publicMediaUrl, publicOrigin, publicUrl, safeJsonLd } from "../../../../../db/public-seo";
import { PageView, PublicEnquiryForm, ShareButton, TrackedLink } from "../../public-client";
import { PropertyGrid, PublicFooter, PublicHeader } from "../../public-website";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const agency = await getPublicAgency(slug);
  if (!agency) return { robots: { index: false, follow: false } };
  const property = await getPublicProperty(agency.id, id);
  if (!property) return { robots: { index: false, follow: false } };
  const requestHeaders=await headers(),origin=publicOrigin(requestHeaders);
  const image = publicMediaUrl(origin, agency, property.heroMediaId);
  const icon = publicIconUrl(origin, agency);
  const description=propertyDescription(property,agency);
  const url=publicUrl(origin,agency,`/properties/${encodeURIComponent(id)}`);
  return {
    title: `${property.title} | ${agency.name}`,
    description,
    alternates: { canonical: url },
    robots:{index:true,follow:true},
    icons: icon ? { icon, apple: icon } : undefined,
    openGraph: { title: property.title, description, type: "website", url, siteName: agency.name, images:image?[image]:[] },
    twitter:{card:"summary_large_image",title:property.title,description,images:image?[image]:[]},
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const agency = await getPublicAgency(slug);
  if (!agency) notFound();
  const property = await getPublicProperty(agency.id, id);
  if (!property) notFound();
  const similar = (await listPublicProperties(agency.id, property.transactionType)).filter((item: PublicProperty) => item.id !== property.id).slice(0, 3);
  const contactPhone = property.branchPhone || agency.phone, contactWhatsapp = property.branchWhatsapp || agency.whatsapp || contactPhone, contactEmail = property.branchEmail || agency.email;
  const whatsapp = contactWhatsapp.replace(/\D/g, "");
  const photoStyle = property.heroMediaId ? { backgroundImage: `url(/api/public/${slug}/media?id=${encodeURIComponent(property.heroMediaId)})` } : undefined;
  const requestHeaders = await headers();
  const origin = publicOrigin(requestHeaders);
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "").toLowerCase();
  const pathMode = host.replace(/:\d+$/, "").startsWith(`${slug.toLowerCase()}.`) ? "clean" : "site";
  const facts = publicPropertyFacts(property);
  const summaryItems = publicPropertySummaryItems(property);
  const features = publicPropertyFeatures(property);
  const description = property.description || publicPropertyFallbackDescription(property, agency.name);
  return <div className={`public-site template-${agency.websiteTemplate} typography-${agency.typography || "classic"}`} style={{ "--agency-primary": agency.primaryColor, "--agency-accent": agency.accentColor } as any}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(propertyJsonLd(origin,agency,property))}}/>
    <PageView slug={slug} propertyId={id}/><PublicHeader agency={agency} pathMode={pathMode}/>
    <main id="main-content" className={`public-property public-layout public-layout-${agency.websiteTemplate}`} tabIndex={-1}>
      <aside className="public-template-rail" aria-hidden="true">
        <span>{agency.name}</span>
        <strong>{property.ref}</strong>
        <small>{property.transactionType}</small>
      </aside>
      <section className="public-property-hero">
        <div className="public-property-photo" style={photoStyle}><span>{property.transactionType}</span></div>
        <aside className="public-property-summary"><small>{property.ref} · {property.propertyType}</small><h1>{property.title}</h1><p>{property.location}</p><strong>{property.price}</strong>
          <div className="public-facts">{facts.slice(0, 4).map(fact => <span key={`${fact.label}-${fact.value}`}>{fact.value}<small>{fact.label}</small></span>)}</div>
          {property.branchName && <div className="public-property-branch"><span>Handled by</span><strong>{property.branchName}</strong><small>{property.branchLocation || property.branchAddress || property.branchOpeningHours}</small></div>}
          <div className="public-actions">{contactPhone && <TrackedLink slug={slug} propertyId={id} eventType="call" href={`tel:${contactPhone}`}>Call office</TrackedLink>}{whatsapp && <TrackedLink slug={slug} propertyId={id} eventType="whatsapp" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`I'm interested in ${property.title} (${property.ref})`)}`}>WhatsApp</TrackedLink>}{contactEmail && <a href={`mailto:${contactEmail}`}>Email</a>}<ShareButton title={property.title}/></div>
        </aside>
      </section>
      <section className="public-property-body">
        <article className="public-property-copy"><span>ABOUT THE PROPERTY</span><h2>{property.propertyType} in {property.location}</h2><p>{description}</p><ul>{summaryItems.map(item => <li key={item}>{item}</li>)}</ul>{features.length > 0 && <div className="public-property-feature-strip">{features.slice(0, 5).map(feature => <span key={feature}>{feature}</span>)}</div>}</article>
        <aside className="public-property-enquiry"><h2>Enquire or request a viewing</h2><PublicEnquiryForm slug={slug} propertyId={id}/></aside>
      </section>
      {similar.length > 0 && <section className="public-listings"><div className="public-section-head"><div><span>SIMILAR PROPERTIES</span><h2>You may also like</h2></div></div><PropertyGrid agency={agency} properties={similar} pathMode={pathMode}/></section>}
    </main><PublicFooter agency={agency} pathMode={pathMode}/>
  </div>;
}
