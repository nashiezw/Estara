import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPlatformIdentity } from "../db/platform-settings";
import HomeMobileDrawer from "./home-mobile-drawer";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Today", href: "#today" },
  { label: "How it works", href: "#workflow" },
  { label: "Websites", href: "#websites" },
];

const todayItems = [
  ["New enquiries", "Respond before the lead goes cold.", "11 need attention"],
  ["Follow-ups due", "Clients waiting for the next useful step.", "24 open"],
  ["Viewings today", "Confirm access, reminders and feedback.", "8 scheduled"],
  ["Seller updates", "Reports ready from live property activity.", "6 ready"],
  ["Listings losing momentum", "Properties needing photos, copy or price review.", "4 at risk"],
];

const reuseOutputs = ["Agency website", "Property page", "WhatsApp advert", "Social creative", "Brochure", "Buyer matching", "Viewing", "Seller report"];

const promises = [
  ["Look professional", "Branded websites, polished listings, seller portals and professional documents."],
  ["Market faster", "Enter property facts once and reuse them across every public and marketing output."],
  ["Lose fewer clients", "Every enquiry, viewing and follow-up creates visible work instead of disappearing."],
  ["Run from one place", "Properties, clients, team, marketing, reports and daily actions stay connected."],
];

const firstRun = ["Create agency", "Add first property", "Upload photos", "Activate listing", "Publish website", "Create marketing", "Receive enquiry", "Book viewing", "Update seller"];

function normalizeHost(host: string) {
  return host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function appHref(path: string, platformDomain: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const domain = normalizeHost(platformDomain);
  return domain ? `https://app.${domain}${cleanPath}` : cleanPath;
}

function platformDomainFromHost(host: string, configuredDomain: string) {
  const configured = normalizeHost(configuredDomain);
  if (configured) return configured;

  const domain = normalizeHost(host);
  if (!domain || domain === "localhost" || domain === "127.0.0.1" || domain === "::1") return "";
  if (domain.endsWith(".workers.dev") || domain.endsWith(".pages.dev")) return "";
  if (domain.startsWith("www.")) return domain.slice(4);
  if (domain.startsWith("app.")) return domain.slice(4);
  return domain;
}

export function isPlatformHost(host: string, platform: { domain: string; tenantDomainSuffix: string }) {
  const domain = normalizeHost(host);
  const platformDomain = normalizeHost(platform.domain);
  const tenantSuffix = normalizeHost(platform.tenantDomainSuffix);
  if (!domain || domain === "localhost" || domain === "127.0.0.1" || domain === "::1") return true;
  if (domain.endsWith(".workers.dev") || domain.endsWith(".pages.dev")) return true;
  if (!platformDomain && !tenantSuffix) return true;
  return domain === platformDomain || domain === `www.${platformDomain}` || domain === `app.${platformDomain}` || domain === tenantSuffix;
}

export default async function Home() {
  const platform = await getPlatformIdentity();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";

  if (!isPlatformHost(host, platform)) {
    const [{ getPublicAgencyByHost, listPublicProperties }, { PublicHome }] =
      await Promise.all([import("../db/public-site"), import("./site/[slug]/public-website")]);
    const agency = await getPublicAgencyByHost(host, platform.tenantDomainSuffix);
    if (agency) return <PublicHome agency={agency} properties={await listPublicProperties(agency.id)} pathMode="clean" />;
    notFound();
  }

  const initial = platform.shortName.slice(0, 1);
  const platformMark = platform.iconUrl || platform.logoUrl;
  const parent = platform.parentBrand ? `A ${platform.parentBrand} product` : platform.descriptor;
  const publicDomain = platformDomainFromHost(host, platform.domain);
  const loginHref = appHref("/login", publicDomain);
  const registerHref = appHref("/register", publicDomain);
  const workspaceHref = appHref("/workspace", publicDomain);
  const marketingHref = appHref("/marketing-studio", publicDomain);
  const sellerHref = appHref("/seller", publicDomain);
  const domainsHref = appHref("/domains", publicDomain);
  const contactsHref = appHref("/contacts", publicDomain);
  const propertiesHref = appHref("/property-operations", publicDomain);
  const reportsHref = appHref("/reports", publicDomain);

  return (
    <main className="estara-landing estara-home">
      <nav className="home-nav" aria-label="Primary navigation">
        <a href="/" className="home-logo" aria-label={`${platform.shortName} home`}>
          {platform.logoUrl || platformMark ? <img src={platform.logoUrl || platformMark} alt={`${platform.shortName} logo`} /> : <i>{initial}</i>}
          <span>{platform.shortName}<small>{parent}</small></span>
        </a>
        <div className="home-nav-links">{navLinks.map((link) => <a href={link.href} key={link.label}>{link.label}</a>)}</div>
        <span className="home-nav-actions"><a href={loginHref}>Log in</a><a href={registerHref}>Create account</a></span>
        <HomeMobileDrawer links={navLinks} loginHref={loginHref} registerHref={registerHref} />
      </nav>

      <section className="home-hero" id="product">
        <div className="home-hero-copy">
          <p className="home-kicker">Real estate operating system</p>
          <h1>Run your real estate agency from one place.</h1>
          <p>Add your properties once. Market them professionally. Capture every enquiry. Know who needs follow-up. Keep sellers informed. Let today&apos;s work become obvious.</p>
          <div className="home-actions">
            <a href={registerHref}>Start your agency setup</a>
            <a href="/demo">View demo</a>
          </div>
        </div>

        <aside className="home-command" aria-label="ESTARA product preview">
          <header><span>Today&apos;s Business</span><strong>Demo workspace preview</strong></header>
          <div className="home-command-grid">
            <article><small>New enquiries</small><b>11</b><span>Response timer active</span></article>
            <article><small>Follow-ups</small><b>24</b><span>Due today</span></article>
            <article><small>Viewings</small><b>8</b><span>Feedback needed</span></article>
          </div>
          <div className="home-command-list">
            {todayItems.slice(0, 3).map(([title, text, meta]) => (
              <div key={title}><i /><span><strong>{title}</strong><small>{text}</small></span><b>{meta}</b></div>
            ))}
          </div>
        </aside>
      </section>

      <section className="home-today" id="today">
        <div>
          <p className="home-kicker">Today&apos;s Business</p>
          <h2>ESTARA should tell the team where attention is needed.</h2>
          <p>The dashboard is not meant to be a pile of charts. It is the agency&apos;s daily operating room: what protects revenue, what needs follow-up and what moves next.</p>
        </div>
        <div className="home-today-list">
          {todayItems.map(([title, text, meta]) => <article key={title}><span>{meta}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="home-reuse">
        <div>
          <p className="home-kicker">Enter once. Use everywhere.</p>
          <h2>One property record becomes the whole sales machine.</h2>
          <p>A listing should not be retyped for every channel. ESTARA turns verified property data into the public website, marketing assets, enquiries, viewings and seller evidence.</p>
        </div>
        <div className="home-reuse-map">
          <strong>Property record</strong>
          {reuseOutputs.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="home-promises">
        {promises.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></article>)}
      </section>

      <section className="home-workflow" id="workflow">
        <div>
          <p className="home-kicker">First success moment</p>
          <h2>From empty account to live agency presence.</h2>
          <p>The first sellable ESTARA experience should take a new agency from setup to a live property, share-ready marketing, incoming enquiry, viewing and seller update.</p>
          <a href={registerHref}>Create account</a>
        </div>
        <ol>{firstRun.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></li>)}</ol>
      </section>

      <section className="home-websites" id="websites">
        <div>
          <p className="home-kicker">Professional public presence</p>
          <h2>Every agency should look like a serious brand.</h2>
          <p>Agency websites, property pages, agent profiles, custom colours, images, templates and seller-facing experiences all come from the same operating system.</p>
        </div>
        <aside>
          <a href="/demo">View guided demo</a>
          <a href={workspaceHref}>Open workspace</a>
          <a href={marketingHref}>Marketing studio</a>
          <a href={sellerHref}>Seller portal</a>
          <a href={domainsHref}>Domains</a>
        </aside>
      </section>

      <section className="home-final">
        <p className="home-kicker">Zimbabwe-first. World-class standard.</p>
        <h2>When a property enters your agency, it should enter ESTARA.</h2>
        <div><a href={registerHref}>Start setup</a><a href={loginHref}>Log in</a></div>
      </section>

      <footer className="home-footer">
        <a href="/" className="home-logo">{platform.logoUrl || platformMark ? <img src={platform.logoUrl || platformMark} alt={`${platform.shortName} logo`} /> : <i>{initial}</i>}<span>{platform.shortName}<small>{parent}</small></span></a>
        <nav>
          <a href={contactsHref}>Contacts</a>
          <a href={propertiesHref}>Properties</a>
          <a href={marketingHref}>Marketing</a>
          <a href={reportsHref}>Reports</a>
        </nav>
        <small>© 2026 {platform.shortName}. Real estate, professionally operated.</small>
      </footer>
    </main>
  );
}
