import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPlatformIdentity } from "../db/platform-settings";

const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Workflows", href: "#workflows" },
  { label: "Portals", href: "#portals" },
  { label: "Integrations", href: "/integrations" },
  { label: "Enterprise", href: "/enterprise" },
];

const spotlightRoutes = [
  { label: "Workspace", href: "/workspace", text: "Command centre for the agency", icon: "01" },
  { label: "Pipeline", href: "/pipeline", text: "Viewings, enquiries and next actions", icon: "02" },
  { label: "Properties", href: "/property-operations", text: "Capture, compliance and operations", icon: "03" },
  { label: "Marketing", href: "/marketing-studio", text: "Campaign assets and branded output", icon: "04" },
  { label: "Reports", href: "/reports", text: "Evidence, seller updates and exports", icon: "05" },
  { label: "AI Studio", href: "/ai-studio", text: "Assisted work across the platform", icon: "06" },
];

const operatingLayer = [
  { title: "Agency cockpit", href: "/workspace", text: "One live surface for listings, leads, viewings, team ownership and overdue work." },
  { title: "Property intelligence", href: "/property-compliance", text: "Media, compliance, documents, maintenance, seller records and portal access stay connected." },
  { title: "Marketing engine", href: "/marketing-studio", text: "Turn verified property facts into websites, output, campaigns and share-ready materials." },
  { title: "Trust layer", href: "/audit", text: "Roles, audit trails, recovery, backups and permission controls for serious operators." },
];

const workflow = [
  { step: "Onboard", href: "/invite", text: "Invite the right people and open a secure operating space." },
  { step: "Capture", href: "/property-operations", text: "Build a complete property record once, from field work to media." },
  { step: "Match", href: "/matching", text: "Connect clients to the right properties and move qualified demand forward." },
  { step: "Market", href: "/marketing-studio", text: "Publish beautiful agency output without losing factual control." },
  { step: "Report", href: "/reports", text: "Show sellers and leadership what happened, what changed and what comes next." },
];

const portalLinks = [
  { label: "Log in", href: "/workspace", text: "Return to your secure workspace", tone: "primary" },
  { label: "Agency workspace", href: "/workspace", text: "Run the day-to-day operating room", tone: "dark" },
  { label: "Seller portal", href: "/seller", text: "Owners see reviewed progress and reports", tone: "light" },
  { label: "Admin console", href: "/admin", text: "Govern platform settings and access", tone: "light" },
  { label: "Developer", href: "/developer", text: "API credentials and technical controls", tone: "light" },
  { label: "Billing", href: "/subscription", text: "Plan, invoices and account limits", tone: "light" },
];

const proof = ["Zimbabwe-first", "Mobile-led", "Seller-ready", "Enterprise governed", "Diaspora aware"];

function normalizeHost(host: string) {
  return host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function isPlatformHost(host: string, platform: { domain: string; tenantDomainSuffix: string }) {
  const domain = normalizeHost(host);
  return (
    !domain ||
    domain === "localhost" ||
    domain === "127.0.0.1" ||
    domain === "::1" ||
    domain === normalizeHost(platform.domain) ||
    domain === normalizeHost(platform.tenantDomainSuffix)
  );
}

export default async function Home() {
  const platform = await getPlatformIdentity();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";

  if (!isPlatformHost(host, platform)) {
    const [{ getPublicAgencyByHost, listPublicProperties }, { PublicHome }] =
      await Promise.all([import("../db/public-site"), import("./site/[slug]/public-website")]);
    const agency = await getPublicAgencyByHost(host, platform.tenantDomainSuffix);
    if (agency) {
      const properties = await listPublicProperties(agency.id);
      return <PublicHome agency={agency} properties={properties} />;
    }
    notFound();
  }

  const initial = platform.shortName.slice(0, 1);
  const parent = platform.parentBrand ? `A ${platform.parentBrand} product` : platform.descriptor;
  return (
    <main className="estara-landing">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Link href="/" className="landing-logo" aria-label={`${platform.shortName} home`}>
          <i>{initial}</i>
          <span>
            {platform.shortName}
            <small>{parent}</small>
          </span>
        </Link>
        <div className="landing-nav-links">
          {navLinks.map((link) => (
            <Link href={link.href} key={link.label}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="landing-nav-actions">
          <Link href="/workspace">Log in</Link>
          <Link href="/workspace">Open workspace</Link>
        </div>
      </nav>

      <section className="landing-hero landing-hero-premium" id="top">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Real estate operating system</span>
          <h1>The platform ambitious agencies choose when ordinary software is too small.</h1>
          <h2>Run a beautiful, connected property business from one command centre.</h2>
          <p>
            A premium operating layer for agencies that need listings, enquiries, viewings,
            seller reporting, marketing, deals, roles, domains and AI-assisted execution to
            move as one product.
          </p>
          <div className="landing-hero-actions">
            <Link href="/workspace">Log in securely</Link>
            <Link href="/workspace">Launch workspace</Link>
            <Link href="#platform">Explore platform</Link>
          </div>
          <div className="landing-hero-proof">
            {proof.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="landing-visual" aria-label="Platform preview">
          <div className="landing-photo-panel">
            <span>Flagship listing live</span>
            <strong>Borrowdale Residence</strong>
            <small>Media verified - seller report ready - 14 matched buyers</small>
          </div>
          <div className="landing-command-panel">
            <header>
              <span>Today</span>
              <strong>Agency command</strong>
            </header>
            <div className="landing-command-grid">
              <article>
                <small>New enquiries</small>
                <strong>32</strong>
                <span>11 high intent</span>
              </article>
              <article>
                <small>Viewings</small>
                <strong>18</strong>
                <span>5 confirmed</span>
              </article>
              <article>
                <small>Seller updates</small>
                <strong>9</strong>
                <span>Ready to send</span>
              </article>
            </div>
            <div className="landing-command-list">
              {[
                ["Match buyer", "Avondale townhouse", "/matching"],
                ["Approve campaign", "Luxury family home", "/marketing-studio"],
                ["Review portal", "Diaspora owner pack", "/property-portal"],
              ].map(([title, text, href]) => (
                <Link href={href} key={title}>
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                  <b>Open</b>
                </Link>
              ))}
            </div>
          </div>
          <div className="landing-hero-card">
            <strong>One platform</strong>
            <span>Capture once. Match intelligently. Market beautifully. Report with proof.</span>
          </div>
        </div>
      </section>

      <section className="landing-route-strip" aria-label="Key platform destinations">
        {spotlightRoutes.map((route) => (
          <Link href={route.href} key={route.label}>
            <b>{route.icon}</b>
            <span>
              <strong>{route.label}</strong>
              <small>{route.text}</small>
            </span>
          </Link>
        ))}
      </section>

      <section className="landing-platform" id="platform">
        <header>
          <span className="landing-eyebrow">Complete platform</span>
          <h2>Beautiful on the surface. Serious underneath.</h2>
          <p>
            The landing page now reflects the actual product: a connected operating layer
            for elite real estate teams, with every major module reachable from here.
          </p>
        </header>
        <div className="landing-platform-grid">
          {operatingLayer.map((item) => (
            <Link href={item.href} key={item.title}>
              <span>Open module</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-workflows" id="workflows">
        <div>
          <span className="landing-eyebrow">End-to-end workflow</span>
          <h2>From first instruction to boardroom-ready evidence.</h2>
          <p>
            Each stage routes into a real page in the app, so the homepage works as a
            launchpad for daily work as well as a premium brand moment.
          </p>
          <Link href="/search">Search across the platform</Link>
        </div>
        <ol>
          {workflow.map((item, index) => (
            <li key={item.step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.step}</strong>
              <p>{item.text}</p>
              <Link href={item.href}>Go</Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-portals" id="portals">
        <header>
          <span className="landing-eyebrow">Access points</span>
          <h2>Everyone lands in the right place.</h2>
        </header>
        <div>
          {portalLinks.map((portal) => (
            <Link className={`landing-portal-card ${portal.tone}`} href={portal.href} key={portal.label}>
              <strong>{portal.label}</strong>
              <small>{portal.text}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-world">
        <div>
          <span className="landing-eyebrow">Built for expansion</span>
          <h2>Zimbabwe first. Africa ready. Global standard.</h2>
          <p>
            Mobile-first field work, low-data discipline, USD-aware operations, diaspora
            seller visibility and enterprise governance belong in the same product.
          </p>
        </div>
        <aside>
          <Link href="/domains">Custom domains</Link>
          <Link href="/roles">Roles and permissions</Link>
          <Link href="/backups">Backups and recovery</Link>
          <Link href="/health">Platform health</Link>
        </aside>
      </section>

      <section className="landing-final">
        <span className="landing-eyebrow">Ready when you are</span>
        <h2>Run the real estate platform your ambition already imagines.</h2>
        <div>
          <Link href="/workspace">Log in</Link>
          <Link href="/workspace">Open {platform.shortName}</Link>
          <Link href="/invite">Invite your team</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <Link href="/" className="landing-logo">
          <i>{initial}</i>
          <span>
            {platform.shortName}
            <small>{parent}</small>
          </span>
        </Link>
        <div>
          <Link href="/contacts">Contacts</Link>
          <Link href="/documents">Documents</Link>
          <Link href="/deals">Deals</Link>
          <Link href="/reports">Reports</Link>
          <Link href="/integrations">Integrations</Link>
        </div>
        <small>© 2026 {platform.shortName}. Real estate, professionally operated.</small>
      </footer>
    </main>
  );
}
