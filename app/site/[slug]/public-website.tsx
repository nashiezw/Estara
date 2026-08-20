import Link from "next/link";
import { PublicEnquiryForm, TrackedLink } from "./public-client";
import "../../public-templates.css";

type PublicAgency = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  businessActivities: string[];
  publicContent?: PublicContent;
  websiteTemplate: string;
  typography: string;
  responseSlaMinutes: number;
  logoId: string | null;
  portalName: string;
  hideParentBrand: boolean;
  poweredByWording: string;
};
type PublicContent = {
  homeHeadline?: string;
  homeIntro?: string;
  propertiesIntro?: string;
  saleIntro?: string;
  rentIntro?: string;
  agentsIntro?: string;
  servicesIntro?: string;
  aboutIntro?: string;
  contactIntro?: string;
  homeHeroImageId?: string;
  featuredImageId?: string;
  propertiesHeroImageId?: string;
  saleHeroImageId?: string;
  rentHeroImageId?: string;
  agentsHeroImageId?: string;
  servicesHeroImageId?: string;
  aboutHeroImageId?: string;
  contactHeroImageId?: string;
};
type PublicAgent = {
  userId: string;
  name: string;
  role: string;
  listings: number;
  phone: string;
  whatsapp: string;
  experience: string;
  bio: string;
  areas: string[];
  languages: string[];
  photoMediaId: string | null;
};
type PublicProperty = {
  id: string;
  ref: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  photos: number;
  size: string;
  transactionType: string;
  heroMediaId: string | null;
};

const initials = (value: string) =>
  value
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const fallbackImages = [
  "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1800&q=86",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1800&q=86",
  "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1800&q=86",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1900&q=86",
];
type ImageSlot = "homeHeroImageId" | "featuredImageId" | "propertiesHeroImageId" | "saleHeroImageId" | "rentHeroImageId" | "agentsHeroImageId" | "servicesHeroImageId" | "aboutHeroImageId" | "contactHeroImageId";
const mediaUrl = (agency: PublicAgency, id: string) => `/api/public/${agency.slug}/media?id=${encodeURIComponent(id)}`;
const propertyImage = (agency: PublicAgency, property?: PublicProperty, index = 0, slot?: ImageSlot) => {
  const customMediaId = slot ? agency.publicContent?.[slot] : "";
  const mediaId = customMediaId || property?.heroMediaId || "";
  const fallback = fallbackImages[Math.abs(index) % fallbackImages.length];
  const layers = [
    "linear-gradient(115deg,rgba(8,30,26,.72),rgba(8,30,26,.18))",
    mediaId ? `url("${mediaUrl(agency, mediaId)}")` : "",
    `url("${fallback}")`,
  ].filter(Boolean).join(",");
  return { backgroundImage: layers };
};
const content = (agency: PublicAgency, key: keyof PublicContent, fallback: string) => agency.publicContent?.[key] || fallback;
const layoutClass = (agency: PublicAgency) => `public-layout public-layout-${agency.websiteTemplate}`;
const sectionImageSlot = (section: string): ImageSlot => `${section}HeroImageId` as ImageSlot;

export function PublicHeader({ agency }: { agency: PublicAgency }) {
  const whatsapp = (agency.whatsapp || agency.phone).replace(/\D/g, "");
  const nav = [
    ["Home", `/site/${agency.slug}`],
    ["Properties", `/site/${agency.slug}/properties`],
    ["For sale", `/site/${agency.slug}/sale`],
    ["To rent", `/site/${agency.slug}/rent`],
    ["Agents", `/site/${agency.slug}/agents`],
    ["Services", `/site/${agency.slug}/services`],
    ["About", `/site/${agency.slug}/about`],
  ];
  return (
    <header className="public-header">
      <a className="public-skip" href="#main-content">Skip to content</a>
      <Link href={`/site/${agency.slug}`} className="public-brand">
        {agency.logoId ? (
          <img src={`/api/public/${agency.slug}/media?id=${encodeURIComponent(agency.logoId)}`} alt={`${agency.name} logo`} />
        ) : (
          <b>{initials(agency.name)}</b>
        )}
        <span>
          {agency.name}
          <small>{agency.tagline || "Property specialists"}</small>
        </span>
      </Link>
      <nav aria-label="Primary navigation">
        {nav.map(([label, href]) => (
          <Link href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="public-header-actions">
        {whatsapp ? (
          <TrackedLink slug={agency.slug} eventType="whatsapp" href={`https://wa.me/${whatsapp}`}>
            WhatsApp
          </TrackedLink>
        ) : (
          <Link href={`/site/${agency.slug}/contact`}>Contact</Link>
        )}
      </div>
    </header>
  );
}

export function PropertyGrid({ agency, properties }: { agency: PublicAgency; properties: PublicProperty[] }) {
  return (
    <div className="public-grid">
      {properties.map((property, index) => (
        <Link href={`/site/${agency.slug}/properties/${property.id}`} className="public-card" key={property.id}>
          <div
            className={`public-photo photo-${index % 3}`}
            style={propertyImage(agency, property, index)}
          >
            <span>{property.transactionType}</span>
            <b>{property.photos || 1} photos</b>
          </div>
          <article>
            <small>{property.ref}</small>
            <h3>{property.title}</h3>
            <p>{property.location}</p>
            <strong>{property.price}</strong>
            <footer>
              <span>{property.beds} beds</span>
              <span>{property.baths} baths</span>
              {property.size && <span>{property.size}</span>}
            </footer>
          </article>
        </Link>
      ))}
      {!properties.length && <p className="public-empty">No live properties match this page yet.</p>}
    </div>
  );
}

function AgentGrid({ agency, agents }: { agency: PublicAgency; agents: PublicAgent[] }) {
  return (
    <div className="public-agent-grid">
      {agents.map((agent) => (
        <article key={agent.userId}>
          <div
            className="public-agent-photo"
            style={agent.photoMediaId ? { backgroundImage: `url(/api/public/${agency.slug}/media?id=${encodeURIComponent(agent.photoMediaId)})` } : undefined}
          >
            {!agent.photoMediaId && <b>{initials(agent.name)}</b>}
          </div>
          <span>{agent.role}</span>
          <h2>{agent.name}</h2>
          <p>{agent.bio || (agent.listings ? `${agent.listings} live listing${agent.listings === 1 ? "" : "s"} with responsive local guidance.` : "Available for property guidance and client follow-through.")}</p>
          <footer>
            {agent.experience && <small>{agent.experience}</small>}
            {agent.areas.map((area) => <small key={area}>{area}</small>)}
            {agent.languages.map((language) => <small key={language}>{language}</small>)}
          </footer>
          {agent.phone && <a href={`tel:${agent.phone}`}>{agent.phone}</a>}
        </article>
      ))}
      {!agents.length && <p className="public-empty">Agent profiles will appear here once the agency team is active.</p>}
    </div>
  );
}

export function PublicFooter({ agency }: { agency: PublicAgency }) {
  const whatsapp = (agency.whatsapp || agency.phone).replace(/\D/g, "");
  const nav = [
    ["Properties", `/site/${agency.slug}/properties`],
    ["For sale", `/site/${agency.slug}/sale`],
    ["To rent", `/site/${agency.slug}/rent`],
    ["Agents", `/site/${agency.slug}/agents`],
    ["Services", `/site/${agency.slug}/services`],
    ["Contact", `/site/${agency.slug}/contact`],
  ];
  const services = agency.businessActivities.length
    ? agency.businessActivities.slice(0, 5)
    : ["Residential sales", "Residential rentals", "Property advice"];
  return (
    <footer className="public-footer" aria-label="Agency website footer">
      <section className="public-footer-brand">
        <Link href={`/site/${agency.slug}`} className="public-footer-mark">
          {agency.logoId ? (
            <img src={`/api/public/${agency.slug}/media?id=${encodeURIComponent(agency.logoId)}`} alt={`${agency.name} logo`} />
          ) : (
            <b>{initials(agency.name)}</b>
          )}
          <span>
            {agency.portalName || agency.name}
            <small>{agency.tagline || "Property specialists"}</small>
          </span>
        </Link>
        <h2>Ready for a clearer property move?</h2>
        <p>{agency.tagline || `${agency.name} gives every client a direct path to verified property guidance and responsive follow-through.`}</p>
        <div className="public-footer-actions">
          <Link href={`/site/${agency.slug}/properties`}>Explore properties</Link>
          {whatsapp ? (
            <TrackedLink slug={agency.slug} eventType="whatsapp" href={`https://wa.me/${whatsapp}`}>
              WhatsApp the agency
            </TrackedLink>
          ) : (
            <Link href={`/site/${agency.slug}/contact`}>Contact the agency</Link>
          )}
        </div>
      </section>
      <nav className="public-footer-nav" aria-label="Footer navigation">
        <h3>Website</h3>
        {nav.map(([label, href]) => (
          <Link href={href} key={href}>{label}</Link>
        ))}
      </nav>
      <div className="public-footer-services">
        <h3>Services</h3>
        {services.map((service) => <span key={service}>{service}</span>)}
      </div>
      <div className="public-footer-contact">
        <h3>Contact</h3>
        <address>
          {agency.phone && <a href={`tel:${agency.phone}`}>{agency.phone}</a>}
          {agency.email && <a href={`mailto:${agency.email}`}>{agency.email}</a>}
          {agency.website && <a href={agency.website}>{agency.website.replace(/^https?:\/\//, "")}</a>}
        </address>
        {!agency.hideParentBrand && <small>{agency.poweredByWording}</small>}
      </div>
    </footer>
  );
}

function ServiceCards({ agency }: { agency: PublicAgency }) {
  const items = agency.businessActivities.length
    ? agency.businessActivities
    : ["Residential sales", "Residential rentals", "Property advice"];
  return (
    <div>
      {items.map((item, index) => (
        <article key={item}>
          <b>{String(index + 1).padStart(2, "0")}</b>
          <h3>{item}</h3>
          <p>Calm advice, polished presentation and accountable follow-through from first conversation to completion.</p>
        </article>
      ))}
    </div>
  );
}

function TrustStrip({ agency, properties }: { agency: PublicAgency; properties: PublicProperty[] }) {
  return (
    <section className="public-trust-strip">
      <article>
        <strong>{properties.length}</strong>
        <span>live listings</span>
      </article>
      <article>
        <strong>{agency.responseSlaMinutes}</strong>
        <span>minute response target</span>
      </article>
      <article>
        <strong>{agency.businessActivities.length || 3}</strong>
        <span>service areas</span>
      </article>
    </section>
  );
}

export function PublicHome({ agency, properties }: { agency: PublicAgency; properties: PublicProperty[] }) {
  const whatsapp = (agency.whatsapp || agency.phone).replace(/\D/g, "");
  const featured = properties[0];
  return (
    <div
      className={`public-site template-${agency.websiteTemplate} typography-${agency.typography || "classic"}`}
      style={{ "--agency-primary": agency.primaryColor, "--agency-accent": agency.accentColor } as any}
    >
      <PublicHeader agency={agency} />
      <main id="main-content" className={`public-home public-home-${agency.websiteTemplate} ${layoutClass(agency)}`} tabIndex={-1}>
        <section className="public-hero" style={propertyImage(agency, featured, 0, "homeHeroImageId")}>
          <div>
            <span>PROPERTY, PROFESSIONALLY HANDLED</span>
            <h1>{content(agency, "homeHeadline", agency.name)}</h1>
            <p>{content(agency, "homeIntro", agency.tagline || `Local expertise, sharp presentation and trusted property advice from ${agency.name}.`)}</p>
            <div>
              <Link href={`/site/${agency.slug}/properties`}>Explore properties</Link>
              {whatsapp && (
                <TrackedLink slug={agency.slug} eventType="whatsapp" href={`https://wa.me/${whatsapp}`}>
                  WhatsApp us
                </TrackedLink>
              )}
            </div>
          </div>
          <aside>
            <PublicEnquiryForm slug={agency.slug} />
          </aside>
        </section>

        <TrustStrip agency={agency} properties={properties} />

        {featured && (
          <section className="public-feature">
            <div className={`public-feature-photo photo-${properties.length % 3}`} style={propertyImage(agency, featured, properties.length, "featuredImageId")} />
            <article>
              <span>FEATURED PROPERTY</span>
              <h2>{featured.title}</h2>
              <p>{featured.location}</p>
              <strong>{featured.price}</strong>
              <Link href={`/site/${agency.slug}/properties/${featured.id}`}>View property</Link>
            </article>
          </section>
        )}

        <section className="public-listings">
          <div className="public-section-head">
            <div>
              <span>LIVE LISTINGS</span>
              <h2>Properties worth seeing</h2>
            </div>
            <Link href={`/site/${agency.slug}/properties`}>View all</Link>
          </div>
          <PropertyGrid agency={agency} properties={properties.slice(0, 6)} />
        </section>

        <section className="public-services">
          <span>HOW WE HELP</span>
          <h2>One agency for every property move.</h2>
          <ServiceCards agency={agency} />
        </section>

        <section className="public-about">
          <div>
            <span>LOCAL KNOWLEDGE</span>
            <h2>Property decisions deserve experienced people.</h2>
            <p>{agency.name} combines market knowledge, thoughtful service and modern marketing to help clients move with confidence.</p>
          </div>
          <aside>
            <strong>{properties.length}</strong>
            <small>live properties</small>
            <strong>{agency.responseSlaMinutes} min</strong>
            <small>response target</small>
          </aside>
        </section>
      </main>
      <PublicFooter agency={agency} />
    </div>
  );
}

export function PublicSection({
  agency,
  properties,
  section,
  agents = [],
}: {
  agency: PublicAgency;
  properties: PublicProperty[];
  section: string;
  agents?: PublicAgent[];
}) {
  const titles: Record<string, [string, string]> = {
    properties: ["All properties", content(agency, "propertiesIntro", "Explore every live listing from our agency.")],
    sale: ["Property for sale", content(agency, "saleIntro", "Homes and investments currently available to buy.")],
    rent: ["Property to rent", content(agency, "rentIntro", "Quality rental opportunities available now.")],
    agents: ["Meet the agency", content(agency, "agentsIntro", "A responsive local team, backed by one operating system.")],
    services: ["Property services", content(agency, "servicesIntro", "Professional support for every property move.")],
    about: [`About ${agency.name}`, content(agency, "aboutIntro", "Local expertise, modern presentation and accountable service.")],
    contact: ["Let's talk property", content(agency, "contactIntro", "Tell us what you need and our team will respond quickly.")],
  };
  const copy = titles[section];
  return (
    <div
      className={`public-site template-${agency.websiteTemplate} typography-${agency.typography || "classic"}`}
      style={{ "--agency-primary": agency.primaryColor, "--agency-accent": agency.accentColor } as any}
    >
      <PublicHeader agency={agency} />
      <main id="main-content" className={`public-inner public-inner-${section} ${layoutClass(agency)}`} tabIndex={-1}>
        <aside className="public-template-rail" aria-hidden="true">
          <span>{agency.name}</span>
          <strong>{String(section).padStart(2, "0")}</strong>
          <small>{properties.length} live</small>
        </aside>
        <section className={`public-page-hero public-page-hero-${section}`}>
          <div className="public-page-hero-copy">
            <span className="public-kicker">{section.toUpperCase()}</span>
            <h1>{copy[0]}</h1>
            <p>{copy[1]}</p>
          </div>
          <div className={`public-page-hero-media photo-${section.length % 3}`} style={propertyImage(agency, properties[0], section.length, sectionImageSlot(section))} />
        </section>

        {["properties", "sale", "rent"].includes(section) ? (
          <PropertyGrid agency={agency} properties={properties} />
        ) : section === "agents" ? (
          <section className="public-agents-shell">
            <article>
              <span>PEOPLE FIRST</span>
              <h2>Experienced guidance with a clear next step.</h2>
              <p>{content(agency, "agentsIntro", `${agency.name} gives buyers, sellers, tenants and landlords a direct path to a capable person.`)}</p>
            </article>
            <AgentGrid agency={agency} agents={agents} />
          </section>
        ) : section === "contact" ? (
          <section className="public-contact-shell">
            <article>
              <span>START HERE</span>
              <h2>A good move starts with a clear conversation.</h2>
              <p>{agency.tagline || "Send a brief note and the team will come back with the right next step."}</p>
              {agency.phone && <a href={`tel:${agency.phone}`}>{agency.phone}</a>}
              {agency.email && <a href={`mailto:${agency.email}`}>{agency.email}</a>}
            </article>
            <PublicEnquiryForm slug={agency.slug} allowViewing={false} />
          </section>
        ) : (
          <div className={`public-copy public-copy-${section}`}>
            <h2>{section === "services" ? "Practical support, clearly delivered." : "Property, professionally handled."}</h2>
            <p>
              {copy[1] || agency.tagline || `${agency.name} helps clients make confident property decisions.`} Our team uses live information,
              clear next steps and measurable service standards to keep every opportunity moving.
            </p>
            {section === "services" ? (
              <>
                <ServiceCards agency={agency} />
                <section className="public-process">
                  <article><b>01</b><strong>Listen</strong><p>Understand the move, the budget, the timing and the non-negotiables.</p></article>
                  <article><b>02</b><strong>Prepare</strong><p>Package the property, advice or shortlist with clean facts and polished presentation.</p></article>
                  <article><b>03</b><strong>Progress</strong><p>Keep communication moving until the decision is made and the next action is clear.</p></article>
                </section>
              </>
            ) : (
              <>
                <section className="public-about-story">
                  <article><span>STANDARD</span><h3>Premium presentation</h3><p>Every public page uses the agency brand, selected visual style and live property data.</p></article>
                  <article><span>SERVICE</span><h3>Responsive by design</h3><p>Enquiries route into the operating workspace so the team can respond and follow through.</p></article>
                </section>
                <TrustStrip agency={agency} properties={properties} />
              </>
            )}
          </div>
        )}
      </main>
      <PublicFooter agency={agency} />
    </div>
  );
}
