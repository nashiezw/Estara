import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPlatformIdentity } from "../db/platform-settings";

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

export function isPlatformHost(host: string, platform: { domain: string; tenantDomainSuffix: string }) {
  const domain = normalizeHost(host);
  const platformDomain = normalizeHost(platform.domain);
  const tenantSuffix = normalizeHost(platform.tenantDomainSuffix);
  if (!domain || domain === "localhost" || domain === "127.0.0.1" || domain === "::1") return true;
  if (domain.endsWith(".workers.dev") || domain.endsWith(".pages.dev")) return true;
  if (!platformDomain && !tenantSuffix) return true;
  return domain === platformDomain || domain === tenantSuffix;
}

export default async function Home() {
  const platform = await getPlatformIdentity();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";

  if (!isPlatformHost(host, platform)) {
    const [{ getPublicAgencyByHost, listPublicProperties }, { PublicHome }] =
      await Promise.all([import("../db/public-site"), import("./site/[slug]/public-website")]);
    const agency = await getPublicAgencyByHost(host, platform.tenantDomainSuffix);
    if (agency) return <PublicHome agency={agency} properties={await listPublicProperties(agency.id)} />;
    notFound();
  }

  const initial = platform.shortName.slice(0, 1);
  const parent = platform.parentBrand ? `A ${platform.parentBrand} product` : platform.descriptor;

  return (
    <main className="estara-landing estara-home">
      <nav className="home-nav" aria-label="Primary navigation">
        <Link href="/" className="home-logo" aria-label={`${platform.shortName} home`}>
          <i>{initial}</i>
          <span>{platform.shortName}<small>{parent}</small></span>
        </Link>
        <div>{navLinks.map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}</div>
        <span><Link href="/login">Log in</Link><Link href="/register">Create account</Link></span>
      </nav>

      <section className="home-hero" id="product">
        <div className="home-hero-copy">
          <p className="home-kicker">Real estate operating system</p>
          <h1>Run your real estate agency from one place.</h1>
          <p>Add your properties once. Market them professionally. Capture every enquiry. Know who needs follow-up. Keep sellers informed. Let today&apos;s work become obvious.</p>
          <div className="home-actions">
            <Link href="/register">Start your agency setup</Link>
            <Link href="/login">Log in</Link>
            <Link href="#workflow">See how it works</Link>
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
          <Link href="/register">Create account</Link>
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
          <Link href="/workspace">Open workspace</Link>
          <Link href="/marketing-studio">Marketing studio</Link>
          <Link href="/seller">Seller portal</Link>
          <Link href="/domains">Domains</Link>
        </aside>
      </section>

      <section className="home-final">
        <p className="home-kicker">Zimbabwe-first. World-class standard.</p>
        <h2>When a property enters your agency, it should enter ESTARA.</h2>
        <div><Link href="/register">Start setup</Link><Link href="/login">Log in</Link></div>
      </section>

      <footer className="home-footer">
        <Link href="/" className="home-logo"><i>{initial}</i><span>{platform.shortName}<small>{parent}</small></span></Link>
        <nav>
          <Link href="/contacts">Contacts</Link>
          <Link href="/property-operations">Properties</Link>
          <Link href="/marketing-studio">Marketing</Link>
          <Link href="/reports">Reports</Link>
        </nav>
        <small>© 2026 {platform.shortName}. Real estate, professionally operated.</small>
      </footer>
    </main>
  );
}
