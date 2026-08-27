import { PublicEnquiryForm, TrackedLink } from "./public-client";
import { publicPropertyFacts } from "../../../db/public-property-display";
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
  iconId?: string | null;
  footerLogoId?: string | null;
  footerIconId?: string | null;
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
type PublicBranch = {
  id: string;
  name: string;
  location: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  description: string;
  openingHours: string;
  managerName: string;
  liveListings: number;
};
type PublicProperty = {
  id: string;
  ref: string;
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  toilets: number;
  parking: number;
  garages: number;
  photos: number;
  size: string;
  buildingSize: string;
  transactionType: string;
  propertyType: string;
  description: string;
  features: string[];
  heroMediaId: string | null;
  branchName?: string;
  branchLocation?: string;
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
const mediaUrl = (agency: PublicAgency, id: string, variant: "main" | "thumb" = "main") => `/api/public/${agency.slug}/media?id=${encodeURIComponent(id)}${variant === "thumb" ? "&variant=thumb" : ""}`;
const propertyImage = (agency: PublicAgency, property?: PublicProperty, index = 0, slot?: ImageSlot, variant: "main" | "thumb" = "main") => {
  const customMediaId = slot ? agency.publicContent?.[slot] : "";
  const mediaId = customMediaId || property?.heroMediaId || "";
  const fallback = fallbackImages[Math.abs(index) % fallbackImages.length];
  const layers = [
    "linear-gradient(115deg,rgba(8,30,26,.72),rgba(8,30,26,.18))",
    mediaId ? `url("${mediaUrl(agency, mediaId, variant)}")` : "",
    `url("${fallback}")`,
  ].filter(Boolean).join(",");
  return { backgroundImage: layers };
};
const content = (agency: PublicAgency, key: keyof PublicContent, fallback: string) => agency.publicContent?.[key] || fallback;
const layoutClass = (agency: PublicAgency) => `public-layout public-layout-${agency.websiteTemplate}`;
const sectionImageSlot = (section: string): ImageSlot => `${section}HeroImageId` as ImageSlot;
type PublicPathMode = "site" | "clean";
const publicPath = (agency: PublicAgency, path = "", mode: PublicPathMode = "site") =>
  mode === "clean" ? path || "/" : `/site/${agency.slug}${path}`;

export function PublicHeader({ agency, pathMode = "site" }: { agency: PublicAgency; pathMode?: PublicPathMode }) {
  const whatsapp = (agency.whatsapp || agency.phone).replace(/\D/g, "");
  const logo = agency.logoId ? mediaUrl(agency, agency.logoId, "thumb") : "";
  const icon = agency.iconId ? mediaUrl(agency, agency.iconId, "thumb") : "";
  const nav = [
    ["Home", publicPath(agency, "", pathMode)],
    ["Properties", publicPath(agency, "/properties", pathMode)],
    ["For sale", publicPath(agency, "/sale", pathMode)],
    ["To rent", publicPath(agency, "/rent", pathMode)],
    ["Agents", publicPath(agency, "/agents", pathMode)],
    ["Services", publicPath(agency, "/services", pathMode)],
    ["About", publicPath(agency, "/about", pathMode)],
  ];
  return (
    <header className="public-header">
      <a className="public-skip" href="#main-content">Skip to content</a>
      <a href={publicPath(agency, "", pathMode)} className="public-brand">
        {icon ? (
          <img className="public-brand-icon" src={icon} alt="" />
        ) : (
          <b>{initials(agency.name)}</b>
        )}
        <span>
          {logo ? <img className="public-brand-logo" src={logo} alt={`${agency.name} logo`} /> : agency.name}
          <small>{agency.tagline || "Property specialists"}</small>
        </span>
      </a>
      <nav aria-label="Primary navigation">
        {nav.map(([label, href]) => (
          <a href={href} key={href}>
            {label}
          </a>
        ))}
      </nav>
      <details className="public-mobile-menu">
        <summary>Menu</summary>
        <div>
          {nav.map(([label, href]) => (
            <a href={href} key={href}>{label}</a>
          ))}
          <a href={publicPath(agency, "/contact", pathMode)}>Contact</a>
        </div>
      </details>
      <div className="public-header-actions">
        {whatsapp ? (
          <TrackedLink slug={agency.slug} eventType="whatsapp" href={`https://wa.me/${whatsapp}`}>
            WhatsApp
          </TrackedLink>
        ) : (
          <a href={publicPath(agency, "/contact", pathMode)}>Contact</a>
        )}
      </div>
    </header>
  );
}

export function PropertyGrid({ agency, properties, pathMode = "site" }: { agency: PublicAgency; properties: PublicProperty[]; pathMode?: PublicPathMode }) {
  return (
    <div className="public-grid">
      {properties.map((property, index) => {
        const facts = publicPropertyFacts(property).slice(0, 3);
        return (
          <a href={publicPath(agency, `/properties/${property.id}`, pathMode)} className="public-card" key={property.id}>
            <div
              className={`public-photo photo-${index % 3}`}
              style={propertyImage(agency, property, index, undefined, "thumb")}
            >
              <span>{property.transactionType}</span>
              <b>{property.photos || 1} photos</b>
            </div>
            <article>
              <small>{property.ref} · {property.propertyType}</small>
              <h3>{property.title}</h3>
              <p>{property.location}</p>
              <strong>{property.price}</strong>
              <footer>
                {facts.map((fact) => <span key={`${fact.label}-${fact.value}`}>{fact.value}</span>)}
              </footer>
            </article>
          </a>
        );
      })}
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
            style={agent.photoMediaId ? { backgroundImage: `url(${mediaUrl(agency, agent.photoMediaId, "thumb")})` } : undefined}
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

export function PublicFooter({ agency, pathMode = "site" }: { agency: PublicAgency; pathMode?: PublicPathMode }) {
  const whatsapp = (agency.whatsapp || agency.phone).replace(/\D/g, "");
  const footerLogo = agency.footerLogoId ? mediaUrl(agency, agency.footerLogoId) : "";
  const footerIcon = agency.footerIconId ? mediaUrl(agency, agency.footerIconId) : "";
  const logo = footerLogo || (agency.logoId ? mediaUrl(agency, agency.logoId) : "");
  const icon = footerIcon || (agency.iconId ? mediaUrl(agency, agency.iconId) : "");
  const nav = [
    ["Properties", publicPath(agency, "/properties", pathMode)],
    ["For sale", publicPath(agency, "/sale", pathMode)],
    ["To rent", publicPath(agency, "/rent", pathMode)],
    ["Agents", publicPath(agency, "/agents", pathMode)],
    ["Services", publicPath(agency, "/services", pathMode)],
    ["Contact", publicPath(agency, "/contact", pathMode)],
  ];
  const services = agency.businessActivities.length
    ? agency.businessActivities.slice(0, 5)
    : ["Residential sales", "Residential rentals", "Property advice"];
  const proof = [
    ["Verified listings", "Current agency stock"],
    ["Responsive follow-up", "Direct enquiry routes"],
    ["Local guidance", "Market-ready advice"],
  ];
  return (
    <footer className="public-footer" aria-label="Agency website footer">
      <section className="public-footer-brand">
        <a href={publicPath(agency, "", pathMode)} className="public-footer-mark">
          {icon ? (
            <img className={`public-brand-icon ${footerIcon ? "public-brand-dark-asset" : "public-brand-light-fallback"}`} src={icon} alt="" />
          ) : (
            <b>{initials(agency.name)}</b>
          )}
          <span>
            {logo ? <img className={`public-brand-logo ${footerLogo ? "public-brand-dark-asset" : "public-brand-light-fallback"}`} src={logo} alt={`${agency.name} logo`} /> : agency.portalName || agency.name}
            <small>{agency.tagline || "Property specialists"}</small>
          </span>
        </a>
        <h2>Your next property move, handled with care.</h2>
        <p>{agency.tagline || `${agency.name} gives every client a direct path to verified property guidance, clear communication and responsive follow-through.`}</p>
        <div className="public-footer-actions">
          <a href={publicPath(agency, "/properties", pathMode)}>View listings</a>
          {whatsapp ? (
            <TrackedLink slug={agency.slug} eventType="whatsapp" href={`https://wa.me/${whatsapp}`}>
              Speak to an agent
            </TrackedLink>
          ) : (
            <a href={publicPath(agency, "/contact", pathMode)}>Speak to an agent</a>
          )}
        </div>
        <div className="public-footer-proof" aria-label="Agency service strengths">
          {proof.map(([label, detail]) => (
            <span key={label}>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
          ))}
        </div>
      </section>
      <nav className="public-footer-nav" aria-label="Footer navigation">
        <h3>Website</h3>
        {nav.map(([label, href]) => (
          <a href={href} key={href}>{label}</a>
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
      </div>
      <div className="public-footer-bottom">
        <small>{agency.name}</small>
        {!agency.hideParentBrand && <small>{agency.poweredByWording}</small>}
      </div>
    </footer>
  );
}

function BranchGrid({ branches }: { branches: PublicBranch[] }) {
  return (
    <div className="public-branch-grid">
      {branches.map((branch) => (
        <article key={branch.id}>
          <span>{branch.location || "Local office"}</span>
          <h3>{branch.name}</h3>
          <p>{branch.description || branch.address || "A local office for listings, enquiries and client follow-through."}</p>
          <dl>
            {branch.managerName && <><dt>Manager</dt><dd>{branch.managerName}</dd></>}
            {branch.openingHours && <><dt>Hours</dt><dd>{branch.openingHours}</dd></>}
            <dt>Listings</dt><dd>{branch.liveListings}</dd>
          </dl>
          <footer>
            {branch.phone && <a href={`tel:${branch.phone}`}>Call</a>}
            {branch.whatsapp && <a href={`https://wa.me/${branch.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a>}
            {branch.email && <a href={`mailto:${branch.email}`}>Email</a>}
          </footer>
        </article>
      ))}
    </div>
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

export function PublicHome({ agency, properties, branches = [], pathMode = "site" }: { agency: PublicAgency; properties: PublicProperty[]; branches?: PublicBranch[]; pathMode?: PublicPathMode }) {
  const whatsapp = (agency.whatsapp || agency.phone).replace(/\D/g, "");
  const featured = properties[0];
  return (
    <div
      className={`public-site template-${agency.websiteTemplate} typography-${agency.typography || "classic"}`}
      style={{ "--agency-primary": agency.primaryColor, "--agency-accent": agency.accentColor } as any}
    >
      <PublicHeader agency={agency} pathMode={pathMode} />
      <main id="main-content" className={`public-home public-home-${agency.websiteTemplate} ${layoutClass(agency)}`} tabIndex={-1}>
        <section className="public-hero" style={propertyImage(agency, featured, 0, "homeHeroImageId")}>
          <div>
            <span>PROPERTY, PROFESSIONALLY HANDLED</span>
            <h1>{content(agency, "homeHeadline", agency.name)}</h1>
            <p>{content(agency, "homeIntro", agency.tagline || `Local expertise, sharp presentation and trusted property advice from ${agency.name}.`)}</p>
            <div>
              <a href={publicPath(agency, "/properties", pathMode)}>Explore properties</a>
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
              <a href={publicPath(agency, `/properties/${featured.id}`, pathMode)}>View property</a>
            </article>
          </section>
        )}

        <section className="public-listings">
          <div className="public-section-head">
            <div>
              <span>LIVE LISTINGS</span>
              <h2>Properties worth seeing</h2>
            </div>
            <a href={publicPath(agency, "/properties", pathMode)}>View all</a>
          </div>
          <PropertyGrid agency={agency} properties={properties.slice(0, 6)} pathMode={pathMode} />
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
      <PublicFooter agency={agency} pathMode={pathMode} />
    </div>
  );
}

export function PublicSection({
  agency,
  properties,
  section,
  agents = [],
  branches = [],
  pathMode = "site",
}: {
  agency: PublicAgency;
  properties: PublicProperty[];
  section: string;
  agents?: PublicAgent[];
  branches?: PublicBranch[];
  pathMode?: PublicPathMode;
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
      <PublicHeader agency={agency} pathMode={pathMode} />
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
          <PropertyGrid agency={agency} properties={properties} pathMode={pathMode} />
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
            {branches.length > 0 && <BranchGrid branches={branches} />}
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
                {branches.length > 0 && <section className="public-offices"><div className="public-section-head"><div><span>OUR OFFICES</span><h2>Local teams, one standard.</h2></div></div><BranchGrid branches={branches} /></section>}
                <TrustStrip agency={agency} properties={properties} />
              </>
            )}
          </div>
        )}
      </main>
      <PublicFooter agency={agency} pathMode={pathMode} />
    </div>
  );
}

