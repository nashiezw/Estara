import Link from "next/link";
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

export default async function DemoPage() {
  const platform = await getPlatformIdentity();
  return (
    <main className="demo-page">
      <nav>
        <Link href="/" className="home-logo">
          <i>{platform.shortName.slice(0, 1)}</i>
          <span>{platform.shortName}<small>Guided demo</small></span>
        </Link>
        <div>
          <Link href="/register">Create account</Link>
          <Link href="/login">Log in</Link>
        </div>
      </nav>
      <section className="demo-hero">
        <div>
          <p className="home-kicker">Safe product demo</p>
          <h1>See the ESTARA operating flow before signing in.</h1>
          <p>This demo uses sample data only. It shows the intended experience without opening private agency records or saving changes.</p>
          <div>
            <Link href="/register">Start your real workspace</Link>
            <Link href="/login">Log in to your workspace</Link>
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
        <Link href="/register">Create account</Link>
      </section>
    </main>
  );
}
