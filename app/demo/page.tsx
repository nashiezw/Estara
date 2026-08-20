import Link from "next/link";
import { headers } from "next/headers";
import { getPlatformIdentity } from "../../db/platform-settings";

export const dynamic = "force-dynamic";

const demoStats = [
  ["New enquiries", "11", "3 need a response"],
  ["Listings live", "18", "4 gaining momentum"],
  ["Viewings today", "8", "2 feedback reports due"],
  ["Marketing assets", "26", "Ready to share"],
];

const demoFlow = [
  ["Capture", "Add verified property facts, photos, seller details and mandate status."],
  ["Publish", "Turn the record into a branded website, public property page and enquiry form."],
  ["Market", "Create WhatsApp, Instagram, Facebook, flyer and brochure assets from the same facts."],
  ["Operate", "Track enquiries, viewings, follow-ups, seller updates and next actions."],
];

function normalizeHost(host: string) {
  return host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
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

function appHref(path: string, platformDomain: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const domain = normalizeHost(platformDomain);
  return domain ? `https://app.${domain}${cleanPath}` : cleanPath;
}

export default async function DemoPage() {
  const platform = await getPlatformIdentity();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const publicDomain = platformDomainFromHost(host, platform.domain);
  const loginHref = appHref("/login", publicDomain);
  const registerHref = appHref("/register", publicDomain);
  return (
    <main className="demo-page">
      <nav>
        <Link href="/" className="home-logo">
          {platform.logoUrl ? <img src={platform.logoUrl} alt={`${platform.shortName} logo`} /> : <i>{platform.shortName.slice(0, 1)}</i>}
          <span>{platform.shortName}<small>Guided demo</small></span>
        </Link>
        <div>
          <a href={registerHref}>Create account</a>
          <a href={loginHref}>Log in</a>
        </div>
      </nav>
      <section className="demo-hero">
        <div>
          <p className="home-kicker">Safe product demo</p>
          <h1>See the ESTARA operating flow before signing in.</h1>
          <p>This demo uses sample data only. It shows the intended experience without opening private agency records or saving changes.</p>
          <div>
            <a href={registerHref}>Start your real workspace</a>
            <a href={loginHref}>Log in to your workspace</a>
          </div>
        </div>
        <aside aria-label="Demo workspace preview">
          <header>
            <span>Prime Property</span>
            <b>Demo only</b>
          </header>
          <section>
            {demoStats.map(([label, value, note]) => (
              <article key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
                <span>{note}</span>
              </article>
            ))}
          </section>
        </aside>
      </section>
      <section className="demo-flow">
        {demoFlow.map(([title, text], index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section className="demo-note">
        <h2>Private workspace access stays private.</h2>
        <p>The real workspace, Marketing Studio and account records require login. Public visitors only see this demo when they intentionally choose it.</p>
        <a href={registerHref}>Create account</a>
      </section>
    </main>
  );
}
