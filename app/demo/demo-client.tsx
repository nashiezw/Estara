"use client";

import { useMemo, useState } from "react";

type Platform = { shortName: string; logoUrl?: string };
type DemoItem = { id: string; title: string; location: string; price: string; status: string; enquiry: string; score: number };

const modules = [
  { id: "today", label: "Today", icon: "◈" },
  { id: "properties", label: "Properties", icon: "⌂" },
  { id: "enquiries", label: "Enquiries", icon: "↗" },
  { id: "marketing", label: "Marketing", icon: "✦" },
  { id: "seller", label: "Seller portal", icon: "◉" },
] as const;

const properties: DemoItem[] = [
  { id: "demo-1", title: "Borrowdale Residence", location: "Borrowdale, Harare", price: "US$420,000", status: "Live", enquiry: "3 buyer enquiries", score: 94 },
  { id: "demo-2", title: "Greendale Garden Sanctuary", location: "Greendale, Harare", price: "US$180,000", status: "Live", enquiry: "1 viewing request", score: 88 },
  { id: "demo-3", title: "Newlands Townhouse", location: "Newlands, Harare", price: "US$1,450/month", status: "Draft", enquiry: "Needs photos", score: 61 },
];

const activity = [
  ["11", "New enquiries", "Respond before the leads go cold."],
  ["8", "Viewings today", "Confirm access and capture feedback."],
  ["6", "Seller updates", "Reports ready from live activity."],
  ["4", "Listings at risk", "Needs price, copy or photo attention."],
];

export default function DemoExperience({ platform, loginHref, registerHref }: { platform: Platform; loginHref: string; registerHref: string }) {
  const [module, setModule] = useState<(typeof modules)[number]["id"]>("today");
  const [selected, setSelected] = useState(properties[0]);
  const [copied, setCopied] = useState(false);
  const marketingCopy = useMemo(() => `${selected.title} in ${selected.location}. ${selected.price}. Verified by Prime Property and ready for qualified enquiries.`, [selected]);

  const copyMarketing = async () => {
    await navigator.clipboard?.writeText(marketingCopy).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="demo-workspace">
      <aside className="demo-workspace-rail">
        <a href="/" className="demo-workspace-brand">
          {platform.logoUrl ? <img src={platform.logoUrl} alt={`${platform.shortName} logo`} /> : <i>{platform.shortName.slice(0, 1)}</i>}
          <span>{platform.shortName}<small>Live product demo</small></span>
        </a>
        <nav aria-label="Demo workspace modules">
          {modules.map((item) => (
            <button className={module === item.id ? "active" : ""} onClick={() => setModule(item.id)} key={item.id}>
              <i>{item.icon}</i><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <section>
          <span>Safe sample data only</span>
          <p>This demo lets visitors experience the ESTARA operating flow before signing in. Nothing here opens private records or saves changes.</p>
        </section>
      </aside>
      <section className="demo-workspace-main">
        <header>
          <div>
            <span>Interactive demo</span>
            <h1>Explore the ESTARA workspace before creating an account.</h1>
            <p>Click through properties, enquiries, marketing and seller updates with realistic sample records.</p>
          </div>
          <nav>
            <a href={registerHref}>Start your real workspace</a>
            <a href={loginHref}>Log in</a>
          </nav>
        </header>

        {module === "today" && <TodayDemo choose={setModule} />}
        {module === "properties" && <PropertiesDemo selected={selected} setSelected={setSelected} />}
        {module === "enquiries" && <EnquiryDemo selected={selected} setModule={setModule} />}
        {module === "marketing" && <MarketingDemo selected={selected} marketingCopy={marketingCopy} copied={copied} copyMarketing={copyMarketing} />}
        {module === "seller" && <SellerDemo selected={selected} />}
      </section>
    </main>
  );
}

function TodayDemo({ choose }: { choose: (id: (typeof modules)[number]["id"]) => void }) {
  return <div className="demo-panel-grid">
    {activity.map(([value, label, text]) => <article className="demo-metric" key={label}><strong>{value}</strong><span>{label}</span><p>{text}</p></article>)}
    <section className="demo-feature-panel">
      <span>Today&apos;s command brief</span>
      <h2>ESTARA shows the work that protects revenue.</h2>
      <p>From one screen, an agency can see new leads, live viewings, listings needing attention and seller updates that are ready to send.</p>
      <div><button onClick={() => choose("properties")}>Inspect properties</button><button onClick={() => choose("enquiries")}>Review enquiries</button></div>
    </section>
  </div>;
}

function PropertiesDemo({ selected, setSelected }: { selected: DemoItem; setSelected: (item: DemoItem) => void }) {
  return <div className="demo-two-column">
    <section className="demo-list">
      <span>Property operations</span>
      {properties.map((item) => <button className={selected.id === item.id ? "active" : ""} onClick={() => setSelected(item)} key={item.id}><strong>{item.title}</strong><small>{item.location} · {item.status}</small></button>)}
    </section>
    <section className="demo-record">
      <span>Selected property</span>
      <h2>{selected.title}</h2>
      <p>{selected.location}</p>
      <strong>{selected.price}</strong>
      <div><i style={{ width: `${selected.score}%` }} /><small>{selected.score}% launch ready</small></div>
      <ul><li>{selected.enquiry}</li><li>Website page generated</li><li>Marketing assets available</li><li>Seller update ready</li></ul>
    </section>
  </div>;
}

function EnquiryDemo({ selected, setModule }: { selected: DemoItem; setModule: (id: (typeof modules)[number]["id"]) => void }) {
  return <section className="demo-feature-panel">
    <span>Lead workflow</span>
    <h2>Every enquiry becomes a visible next action.</h2>
    <p>A buyer interested in {selected.title} is assigned to an agent, given a response timer and linked back to the property record.</p>
    <div className="demo-timeline"><b>New enquiry</b><b>Agent assigned</b><b>Viewing requested</b><b>Follow-up due</b></div>
    <button onClick={() => setModule("marketing")}>Create marketing from this property</button>
  </section>;
}

function MarketingDemo({ selected, marketingCopy, copied, copyMarketing }: { selected: DemoItem; marketingCopy: string; copied: boolean; copyMarketing: () => void }) {
  return <div className="demo-two-column">
    <section className="demo-creative-card">
      <span>Prime Property</span>
      <h2>{selected.title}</h2>
      <p>{selected.location}</p>
      <strong>{selected.price}</strong>
    </section>
    <section className="demo-record">
      <span>Marketing studio</span>
      <h2>Channel-ready creative from saved facts.</h2>
      <p>{marketingCopy}</p>
      <div className="demo-action-row"><button onClick={copyMarketing}>{copied ? "Copied" : "Copy caption"}</button><button>Preview WhatsApp card</button><button>Preview Instagram post</button></div>
    </section>
  </div>;
}

function SellerDemo({ selected }: { selected: DemoItem }) {
  return <section className="demo-feature-panel">
    <span>Seller portal preview</span>
    <h2>Owners see approved facts, activity and next steps.</h2>
    <p>The seller for {selected.title} can receive a branded update showing enquiries, viewings, marketing activity and the next recommended move.</p>
    <div className="demo-panel-grid small"><article><strong>3</strong><span>Enquiries</span></article><article><strong>2</strong><span>Viewings</span></article><article><strong>94%</strong><span>Ready</span></article></div>
  </section>;
}

