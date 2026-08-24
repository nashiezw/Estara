"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Platform = { shortName: string; logoUrl?: string; iconUrl?: string; darkLogoUrl?: string; darkIconUrl?: string };
type NavId = (typeof demoNav)[number]["id"];
type Stage = "New" | "Qualified" | "Viewing booked" | "Offer watch" | "Nurture";

type Property = {
  id: string;
  ref: string;
  title: string;
  location: string;
  area: string;
  price: string;
  status: "Live" | "Draft" | "Under offer";
  type: string;
  owner: string;
  agent: string;
  readiness: number;
  enquiries: number;
  viewings: number;
  image: string;
  notes: string;
};

type Contact = { id: string; name: string; role: "Buyer" | "Seller" | "Landlord" | "Tenant"; phone: string; email: string; temperature: "Hot" | "Warm" | "Watching"; interest: string; agent: string };
type Enquiry = { id: string; contactId: string; propertyId: string; source: string; stage: Stage; urgency: string; lastTouch: string };
type Viewing = { id: string; propertyId: string; contactId: string; agent: string; when: string; status: "Confirmed" | "Needs confirmation" | "Completed"; feedback: string };
type ActionItem = { id: string; title: string; owner: string; due: string; priority: "High" | "Medium" | "Low"; status: "Open" | "Done" };
type Integration = { id: string; name: string; kind: string; connected: boolean; lastSync: string };

const demoNav = [
  { id: "today", label: "Today", icon: "T" },
  { id: "properties", label: "Properties", icon: "P" },
  { id: "enquiries", label: "Enquiries", icon: "E" },
  { id: "contacts", label: "Contacts", icon: "C" },
  { id: "viewings", label: "Viewings", icon: "V" },
  { id: "actions", label: "Actions", icon: "A" },
  { id: "marketing", label: "Marketing", icon: "M" },
  { id: "seller", label: "Seller portal", icon: "S" },
  { id: "reports", label: "Reports", icon: "R" },
  { id: "website", label: "Website", icon: "W" },
  { id: "team", label: "Team", icon: "U" },
  { id: "branches", label: "Branches", icon: "B" },
  { id: "integrations", label: "Integrations", icon: "I" },
  { id: "automations", label: "Automations", icon: "Z" },
  { id: "subscription", label: "Subscription", icon: "$" },
  { id: "settings", label: "Settings", icon: "G" },
] as const;

const imageBase = "https://images.unsplash.com";

const seed = {
  properties: [
    { id: "p1", ref: "HL-1024", title: "Borrowdale Residence", location: "Crowhill Road, Borrowdale", area: "Borrowdale, Harare", price: "US$420,000", status: "Live", type: "Sale", owner: "Rutendo Moyo", agent: "Tariro Nyoni", readiness: 96, enquiries: 8, viewings: 4, image: `${imageBase}/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=86`, notes: "High-value family home with verified title, twilight photos and WhatsApp launch creative ready." },
    { id: "p2", ref: "HL-1031", title: "Garden Sanctuary in Greendale", location: "Kennedy Drive, Greendale", area: "Greendale, Harare", price: "US$180,000", status: "Live", type: "Sale", owner: "Blessing Chari", agent: "Ruvimbo Dube", readiness: 88, enquiries: 5, viewings: 2, image: `${imageBase}/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=86`, notes: "Strong first-home buyer interest. Needs fresh garden image before next Facebook creative." },
    { id: "p3", ref: "HL-1040", title: "Avondale Executive Apartment", location: "Bath Road, Avondale", area: "Avondale, Harare", price: "US$1,450/month", status: "Draft", type: "Rental", owner: "Farai Mutsvene", agent: "Kuda Maseko", readiness: 67, enquiries: 1, viewings: 0, image: `${imageBase}/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=86`, notes: "Capture appliance list, landlord ID and apartment photos before publishing." },
    { id: "p4", ref: "HL-1044", title: "Highlands Diplomatic Villa", location: "Glenara Avenue, Highlands", area: "Highlands, Harare", price: "US$3,200/month", status: "Under offer", type: "Rental", owner: "Nyasha Sithole", agent: "Tariro Nyoni", readiness: 91, enquiries: 6, viewings: 5, image: `${imageBase}/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=86`, notes: "Tenant compliance pack requested. Keep landlord updated every 48 hours." },
  ] satisfies Property[],
  contacts: [
    { id: "c1", name: "Chenai Ndlovu", role: "Buyer", phone: "+263 77 421 9030", email: "chenai@example.co.zw", temperature: "Hot", interest: "Borrowdale, cash buyer, needs staff quarters", agent: "Tariro Nyoni" },
    { id: "c2", name: "Michael Banda", role: "Tenant", phone: "+263 78 802 1199", email: "michael@example.co.zw", temperature: "Warm", interest: "Diplomatic rental, 4 bedrooms, borehole required", agent: "Kuda Maseko" },
    { id: "c3", name: "Rutendo Moyo", role: "Seller", phone: "+263 71 223 4510", email: "rutendo@example.co.zw", temperature: "Watching", interest: "Seller portal updates for Borrowdale Residence", agent: "Tariro Nyoni" },
    { id: "c4", name: "Farai Mutsvene", role: "Landlord", phone: "+263 77 909 1182", email: "farai@example.co.zw", temperature: "Warm", interest: "Avondale rental onboarding", agent: "Ruvimbo Dube" },
  ] satisfies Contact[],
  enquiries: [
    { id: "e1", contactId: "c1", propertyId: "p1", source: "Agency website", stage: "Qualified", urgency: "Viewing before Friday", lastTouch: "12 minutes ago" },
    { id: "e2", contactId: "c2", propertyId: "p4", source: "WhatsApp card", stage: "Viewing booked", urgency: "Relocation in 3 weeks", lastTouch: "34 minutes ago" },
    { id: "e3", contactId: "c4", propertyId: "p3", source: "Agent referral", stage: "New", urgency: "Needs listing live this week", lastTouch: "1 hour ago" },
  ] satisfies Enquiry[],
  viewings: [
    { id: "v1", propertyId: "p1", contactId: "c1", agent: "Tariro Nyoni", when: "Today, 15:30", status: "Confirmed", feedback: "Buyer wants title pack before second viewing." },
    { id: "v2", propertyId: "p4", contactId: "c2", agent: "Kuda Maseko", when: "Tomorrow, 10:00", status: "Needs confirmation", feedback: "Confirm school route and security requirements." },
    { id: "v3", propertyId: "p2", contactId: "c1", agent: "Ruvimbo Dube", when: "Friday, 12:00", status: "Completed", feedback: "Price sensitivity logged. Send comparable properties." },
  ] satisfies Viewing[],
  actions: [
    { id: "a1", title: "Send title pack to Chenai", owner: "Tariro Nyoni", due: "Today 16:00", priority: "High", status: "Open" },
    { id: "a2", title: "Upload Avondale apartment gallery", owner: "Ruvimbo Dube", due: "Tomorrow 09:00", priority: "High", status: "Open" },
    { id: "a3", title: "Publish weekly seller report", owner: "Kuda Maseko", due: "Friday 12:00", priority: "Medium", status: "Open" },
  ] satisfies ActionItem[],
  integrations: [
    { id: "i1", name: "Agency website API", kind: "Read and write properties, enquiries and bookings", connected: true, lastSync: "8 minutes ago" },
    { id: "i2", name: "WordPress connector", kind: "Property pages, web forms and lead capture", connected: false, lastSync: "Ready to connect" },
    { id: "i3", name: "CRM export", kind: "Contacts, buyer requirements and agent ownership", connected: true, lastSync: "Today 07:10" },
  ] satisfies Integration[],
};

function freshDemo() {
  return JSON.parse(JSON.stringify(seed)) as typeof seed;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function DemoExperience({ platform, loginHref, registerHref }: { platform: Platform; loginHref: string; registerHref: string }) {
  const [module, setModule] = useState<NavId>("today");
  const [demo, setDemo] = useState(freshDemo);
  const [selectedPropertyId, setSelectedPropertyId] = useState("p1");
  const [selectedEnquiryId, setSelectedEnquiryId] = useState("e1");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("Demo Workspace - Sample Data");

  const selectedProperty = demo.properties.find((property) => property.id === selectedPropertyId) || demo.properties[0];
  const selectedEnquiry = demo.enquiries.find((enquiry) => enquiry.id === selectedEnquiryId) || demo.enquiries[0];
  const selectedContact = demo.contacts.find((contact) => contact.id === selectedEnquiry.contactId) || demo.contacts[0];
  const selectedLeadProperty = demo.properties.find((property) => property.id === selectedEnquiry.propertyId) || selectedProperty;

  const filteredProperties = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return demo.properties;
    return demo.properties.filter((property) => `${property.title} ${property.location} ${property.agent} ${property.status}`.toLowerCase().includes(term));
  }, [demo.properties, query]);

  const marketingCopy = useMemo(() => {
    return `${selectedProperty.title} in ${selectedProperty.area}. ${selectedProperty.price}. Verified facts, assigned agent and channel-ready creative prepared inside ${platform.shortName}.`;
  }, [platform.shortName, selectedProperty]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast("Demo Workspace - Sample Data"), 2600);
  };

  const choose = (id: NavId) => {
    setModule(id);
    setMenuOpen(false);
  };

  const resetDemo = () => {
    setDemo(freshDemo());
    setSelectedPropertyId("p1");
    setSelectedEnquiryId("e1");
    setQuery("");
    notify("Demo reset to the original sample account.");
  };

  const transitionEnquiry = (id: string, stage: Stage) => {
    setDemo((current) => ({ ...current, enquiries: current.enquiries.map((enquiry) => enquiry.id === id ? { ...enquiry, stage, lastTouch: "Just now" } : enquiry) }));
    notify(`Sample enquiry moved to ${stage}.`);
  };

  const bookViewing = (enquiry: Enquiry) => {
    const contact = demo.contacts.find((item) => item.id === enquiry.contactId);
    const property = demo.properties.find((item) => item.id === enquiry.propertyId);
    const next: Viewing = {
      id: `v${Date.now()}`,
      propertyId: enquiry.propertyId,
      contactId: enquiry.contactId,
      agent: contact?.agent || property?.agent || "Demo agent",
      when: "Tomorrow, 14:00",
      status: "Confirmed",
      feedback: "Created inside the demo only. No calendar invitation is sent.",
    };
    setDemo((current) => ({
      ...current,
      enquiries: current.enquiries.map((item) => item.id === enquiry.id ? { ...item, stage: "Viewing booked", lastTouch: "Just now" } : item),
      viewings: [next, ...current.viewings],
    }));
    setModule("viewings");
    notify("Sample viewing booked. Nothing was sent outside this demo.");
  };

  const completeAction = (id: string) => {
    setDemo((current) => ({ ...current, actions: current.actions.map((item) => item.id === id ? { ...item, status: item.status === "Done" ? "Open" : "Done" } : item) }));
    notify("Sample task status updated.");
  };

  const toggleIntegration = (id: string) => {
    setDemo((current) => ({ ...current, integrations: current.integrations.map((item) => item.id === id ? { ...item, connected: !item.connected, lastSync: item.connected ? "Paused in demo" : "Connected in demo" } : item) }));
    notify("Integration state changed locally for this demo session.");
  };

  const copyMarketing = async () => {
    await navigator.clipboard?.writeText(marketingCopy).catch(() => undefined);
    notify("Caption copied from sample marketing copy.");
  };

  const shellStyle = { "--green": "#153b34", "--gold": "#e2b84e" } as CSSProperties & Record<string, string>;

  return (
    <div className={`shell demo-mirror-shell typography-classic${menuOpen ? " workspace-menu-open" : ""}`} style={shellStyle}>
      <button className="workspace-menu-scrim" aria-label="Close demo menu" onClick={() => setMenuOpen(false)} />
      <aside>
        <button className="workspace-menu-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>x</button>
        <a href="/" className="brand demo-brand">
          {platform.darkIconUrl || platform.iconUrl ? <img className="brand-icon" src={platform.darkIconUrl || platform.iconUrl} alt={`${platform.shortName} icon`} /> : <i>{platform.shortName.slice(0, 1)}</i>}
          {platform.darkLogoUrl || platform.logoUrl ? <img className="brand-logo" src={platform.darkLogoUrl || platform.logoUrl} alt={`${platform.shortName} logo`} /> : <span>{platform.shortName}</span>}
        </a>
        <section className="agency demo-sample-card">
          <b>DE</b>
          <span><strong>Demo Workspace</strong><small>Sample Data</small></span>
          <em>Safe</em>
        </section>
        <nav aria-label="Demo workspace modules">
          {demoNav.map((item) => (
            <button className={module === item.id ? "active" : ""} onClick={() => choose(item.id)} key={item.id}>
              <i>{item.icon}</i><span>{item.label}</span>
              {item.id === "enquiries" ? <b>{demo.enquiries.length}</b> : null}
            </button>
          ))}
        </nav>
        <section className="user demo-user-card">
          <b>PM</b>
          <span><strong>Prime Metro Realty</strong><small>Safe sample data only</small></span>
        </section>
      </aside>

      <main>
        <header>
          <button className="workspace-menu-toggle" aria-label="Open menu" onClick={() => setMenuOpen(true)}>☰</button>
          <a className="mobile-logo" href="/">
            {platform.iconUrl || platform.darkIconUrl ? <img src={platform.iconUrl || platform.darkIconUrl} alt="" /> : null}
            {platform.logoUrl || platform.darkLogoUrl ? <img className="brand-logo" src={platform.logoUrl || platform.darkLogoUrl} alt={`${platform.shortName} logo`} /> : <b>{platform.shortName}</b>}
          </a>
          <button className="search" onClick={() => choose("properties")}><span>Search sample properties, contacts and enquiries</span><kbd>/</kbd></button>
          <div>
            <button className="outline demo-reset" onClick={resetDemo}>Reset demo data</button>
            <a className="outline demo-header-link" href={loginHref}>Log in</a>
            <a className="primary demo-header-link" href={registerHref}>Start your real workspace</a>
          </div>
        </header>

        <nav className="mobile-nav" aria-label="Mobile demo modules">
          {demoNav.slice(0, 4).map((item) => <button className={module === item.id ? "active" : ""} onClick={() => choose(item.id)} key={item.id}><i>{item.icon}</i>{item.label}</button>)}
        </nav>

        <section className="demo-status-bar">
          <span>{toast}</span>
          <strong>No production records, payments, emails or external writes happen in this demo.</strong>
        </section>

        {module === "today" ? <TodayModule platform={platform} demo={demo} choose={choose} /> : null}
        {module === "properties" ? <PropertiesModule properties={filteredProperties} selected={selectedProperty} query={query} setQuery={setQuery} pick={setSelectedPropertyId} choose={choose} /> : null}
        {module === "enquiries" ? <EnquiriesModule demo={demo} selected={selectedEnquiry} selectedContact={selectedContact} selectedProperty={selectedLeadProperty} pick={setSelectedEnquiryId} transitionEnquiry={transitionEnquiry} bookViewing={bookViewing} /> : null}
        {module === "contacts" ? <ContactsModule contacts={demo.contacts} choose={choose} /> : null}
        {module === "viewings" ? <ViewingsModule demo={demo} completeAction={completeAction} /> : null}
        {module === "actions" ? <ActionsModule actions={demo.actions} completeAction={completeAction} /> : null}
        {module === "marketing" ? <MarketingModule property={selectedProperty} copy={copyMarketing} marketingCopy={marketingCopy} /> : null}
        {module === "seller" ? <SellerModule property={selectedProperty} demo={demo} choose={choose} /> : null}
        {module === "reports" ? <ReportsModule demo={demo} /> : null}
        {module === "website" ? <WebsiteModule properties={demo.properties} notify={notify} /> : null}
        {module === "team" ? <TeamModule /> : null}
        {module === "branches" ? <BranchesModule /> : null}
        {module === "integrations" ? <IntegrationsModule integrations={demo.integrations} toggleIntegration={toggleIntegration} /> : null}
        {module === "automations" ? <AutomationsModule /> : null}
        {module === "subscription" ? <SubscriptionModule /> : null}
        {module === "settings" ? <SettingsModule platform={platform} /> : null}
      </main>
    </div>
  );
}

function PageHeading({ label, title, text, action }: { label: string; title: string; text: string; action?: ReactNode }) {
  return <div className="heading"><div><span className="eyebrow">{label}</span><h1>{title}</h1><p>{text}</p></div>{action}</div>;
}

function TodayModule({ platform, demo, choose }: { platform: Platform; demo: typeof seed; choose: (id: NavId) => void }) {
  const liveProperties = demo.properties.filter((property) => property.status === "Live").length;
  const openActions = demo.actions.filter((action) => action.status === "Open").length;
  return <div className="page">
    <PageHeading label="Demo command centre" title="A complete agency day, already populated." text={`Explore how ${platform.shortName} connects properties, leads, viewings, follow-ups, marketing, portals and management controls.`} action={<button className="primary" onClick={() => choose("properties")}>Open property pipeline</button>} />
    <section className="money demo-hero-panel">
      <div className="section-head"><div><h2>Prime Metro Realty</h2><p>Fictional Zimbabwe agency account with safe sample operations.</p></div><span className="live"><i /> Demo live</span></div>
      <div className="stats">
        <button className="stat green" onClick={() => choose("properties")}><i>P</i><strong>{liveProperties}</strong><b>Live listings</b><small>{demo.properties.length} total records</small></button>
        <button className="stat amber" onClick={() => choose("enquiries")}><i>E</i><strong>{demo.enquiries.length}</strong><b>Active enquiries</b><small>Website, WhatsApp and agent referral</small></button>
        <button className="stat blue" onClick={() => choose("viewings")}><i>V</i><strong>{demo.viewings.length}</strong><b>Viewings tracked</b><small>Calendar-ready workflow preview</small></button>
        <button className="stat coral" onClick={() => choose("actions")}><i>A</i><strong>{openActions}</strong><b>Open actions</b><small>Follow-ups and seller updates</small></button>
      </div>
    </section>
    <div className="columns">
      <section className="panel attention">
        <div className="panel-head"><div><h2>Needs attention</h2><p>Realistic next actions across the account.</p></div><button onClick={() => choose("actions")}>View all</button></div>
        {demo.actions.map((action) => <button key={action.id} onClick={() => choose("actions")}><i className={action.priority === "High" ? "red" : "amber"}>{action.priority[0]}</i><span><strong>{action.title}</strong><p>{action.owner} - {action.due}</p></span><b>{action.status}</b></button>)}
      </section>
      <section className="panel schedule">
        <div className="panel-head"><div><h2>Viewing schedule</h2><p>Connected to properties, buyers and agents.</p></div></div>
        {demo.viewings.map((viewing) => <div className={viewing.status === "Confirmed" ? "next" : ""} key={viewing.id}><time>{viewing.when.split(",")[0]}<small>{viewing.when.split(",")[1] || ""}</small></time><i /><span><strong>{propertyName(demo, viewing.propertyId)}</strong><small>{contactName(demo, viewing.contactId)} with {viewing.agent}</small></span><b>{viewing.status}</b></div>)}
      </section>
    </div>
    <ModuleLinks links={[{ href: "#properties", label: "Property capture" }, { href: "#contacts", label: "Contacts and CRM" }, { href: "#reports", label: "Reports and analytics" }, { href: "#integrations", label: "Website and connectors" }]} choose={choose} />
  </div>;
}

function PropertiesModule({ properties, selected, query, setQuery, pick, choose }: { properties: Property[]; selected: Property; query: string; setQuery: (value: string) => void; pick: (id: string) => void; choose: (id: NavId) => void }) {
  return <div className="page">
    <PageHeading label="Agency portfolio" title="Properties that power every workflow." text="Saved facts, media readiness, owners, enquiries and marketing availability all stay connected." action={<button className="primary" onClick={() => choose("marketing")}>Create marketing</button>} />
    <div className="demo-filter-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by location, agent or status" /><button className="outline" onClick={() => setQuery("")}>Clear</button></div>
    <div className="property-work">
      <section className="panel property-list">
        <div className="panel-head"><h2>{properties.length} properties</h2><span>{properties.filter((item) => item.status === "Live").length} live</span></div>
        {properties.map((property) => <button className={property.id === selected.id ? "selected" : ""} onClick={() => pick(property.id)} key={property.id}><img className="thumb" loading="lazy" src={property.image} alt="" /><span><small>{property.ref} - {property.status}</small><strong>{property.title}</strong><p>{property.location}</p><b>{property.price}</b></span><em>›</em></button>)}
      </section>
      <section className="panel detail">
        <div className="detail-hero" style={{ backgroundImage: `linear-gradient(0deg,rgba(10,38,32,.78),rgba(10,38,32,.06)),url(${selected.image})` }}><span>{selected.status}</span><div><small>{selected.ref}</small><h2>{selected.title}</h2><p>{selected.location}</p></div></div>
        <article><div className="price"><strong>{selected.price}</strong><span>{selected.type} - {selected.agent}</span></div><p>{selected.notes}</p><div className="complete"><div><strong>Launch readiness</strong><b>{selected.readiness}%</b></div><span><i style={{ width: `${selected.readiness}%` }} /></span><p>{selected.enquiries} enquiries, {selected.viewings} viewings and owner updates connected.</p></div><div className="actions"><button className="primary" onClick={() => choose("enquiries")}>Open enquiries</button><button className="outline" onClick={() => choose("seller")}>Seller portal</button></div></article>
      </section>
    </div>
  </div>;
}

function EnquiriesModule({ demo, selected, selectedContact, selectedProperty, pick, transitionEnquiry, bookViewing }: { demo: typeof seed; selected: Enquiry; selectedContact: Contact; selectedProperty: Property; pick: (id: string) => void; transitionEnquiry: (id: string, stage: Stage) => void; bookViewing: (enquiry: Enquiry) => void }) {
  const stages: Stage[] = ["New", "Qualified", "Viewing booked", "Offer watch", "Nurture"];
  return <div className="page">
    <PageHeading label="Lead desk" title="Enquiries move from message to next action." text="Every lead is attached to the property, contact profile, source, urgency and agent ownership." />
    <section className="panel enquiry">
      <div className="tabs">{stages.map((stage) => <button className={selected.stage === stage ? "active" : ""} key={stage} onClick={() => transitionEnquiry(selected.id, stage)}>{stage} <b>{demo.enquiries.filter((item) => item.stage === stage).length}</b></button>)}</div>
      {demo.enquiries.map((enquiry) => <LeadRow demo={demo} enquiry={enquiry} selected={selected.id === enquiry.id} pick={pick} key={enquiry.id} />)}
    </section>
    <div className="columns demo-detail-columns">
      <section className="panel demo-record-panel"><div className="panel-head"><h2>{selectedContact.name}</h2><span>{selectedContact.temperature}</span></div><article><p>{selectedContact.interest}</p><p>{selectedContact.phone} - {selectedContact.email}</p><div className="actions"><button className="primary" onClick={() => bookViewing(selected)}>Book viewing</button><button className="outline" onClick={() => transitionEnquiry(selected.id, "Offer watch")}>Move to offer watch</button></div></article></section>
      <section className="panel demo-record-panel"><div className="panel-head"><h2>{selectedProperty.title}</h2><span>{selected.source}</span></div><article><p>{selectedProperty.location}</p><strong>{selectedProperty.price}</strong><p>{selected.urgency}</p></article></section>
    </div>
  </div>;
}

function ContactsModule({ contacts, choose }: { contacts: Contact[]; choose: (id: NavId) => void }) {
  return <div className="page"><PageHeading label="Relationship memory" title="Buyers, sellers, landlords and tenants in one CRM." text="The demo shows how contacts remain linked to requirements, property interest, owners and follow-up work." action={<button className="primary" onClick={() => choose("actions")}>Create follow-up</button>} /><section className="panel demo-table">{contacts.map((contact) => <article key={contact.id}><b>{initials(contact.name)}</b><span><strong>{contact.name}</strong><small>{contact.role} - {contact.temperature}</small></span><p>{contact.interest}</p><em>{contact.agent}</em></article>)}</section></div>;
}

function ViewingsModule({ demo, completeAction }: { demo: typeof seed; completeAction: (id: string) => void }) {
  return <div className="page"><PageHeading label="Viewing control" title="Appointments stay attached to the deal." text="Agents can see who is coming, where they are going, confirmation status and post-viewing feedback." /><section className="panel viewing-list">{demo.viewings.map((viewing) => <div className="viewing-row" key={viewing.id}><time>{viewing.when}</time><span><strong>{propertyName(demo, viewing.propertyId)}</strong><small>{contactName(demo, viewing.contactId)} - {viewing.feedback}</small></span><em>{viewing.status}</em><div><button onClick={() => completeAction("a3")}>Log feedback</button></div></div>)}</section></div>;
}

function ActionsModule({ actions, completeAction }: { actions: ActionItem[]; completeAction: (id: string) => void }) {
  return <div className="page"><PageHeading label="Action centre" title="Follow-up work has ownership and urgency." text="This mirrors the operational list an agency team uses to protect revenue after a lead comes in." /><section className="panel action-centre">{actions.map((action) => <div className="action-row" key={action.id}><i>{action.priority[0]}</i><span><strong>{action.title}</strong><small>{action.owner} - due {action.due}</small></span><select value={action.priority} onChange={() => undefined}><option>{action.priority}</option></select><input value={action.status} readOnly /><button onClick={() => completeAction(action.id)}>{action.status === "Done" ? "Reopen" : "Mark done"}</button></div>)}</section></div>;
}

function MarketingModule({ property, copy, marketingCopy }: { property: Property; copy: () => void; marketingCopy: string }) {
  return <div className="page"><PageHeading label="Market faster" title="Channel-ready assets from trusted property facts." text="The full studio has deeper editing; this demo mirrors the connected output workflow without saving exports." action={<button className="primary" onClick={copy}>Copy caption</button>} /><div className="market"><section className="panel formats"><h2>Formats</h2>{["WhatsApp card", "Instagram post", "Instagram story", "Facebook creative", "Property brochure", "Social caption"].map((format, index) => <button className={index === 0 ? "active" : ""} key={format}><i>✦</i>{format}<b>›</b></button>)}</section><section className="creative"><div className="art" style={{ backgroundImage: `linear-gradient(90deg,rgba(12,45,37,.94) 0 45%,rgba(12,45,37,.08) 72%),url(${property.image})` }}><b>PRIME METRO</b><div><small>{property.area}</small><h2>{property.title}</h2><p>{marketingCopy}</p><strong>{property.price}</strong></div></div><footer><span><strong>{property.type} launch pack</strong><small>Copy, image, layout and export options simulated.</small></span><button className="outline" onClick={copy}>Copy</button></footer></section></div></div>;
}

function SellerModule({ property, demo, choose }: { property: Property; demo: typeof seed; choose: (id: NavId) => void }) {
  return <div className="page"><PageHeading label="Owner confidence" title="Seller and landlord updates, ready to share." text="Sample portal data shows performance, activity and recommended next steps without exposing private owner records." action={<button className="primary" onClick={() => choose("reports")}>Open report</button>} /><section className="panel seller-hero"><div className="portal"><b>{initials(property.owner)}</b><span><strong>{property.owner}</strong><small>{property.title}</small></span><button>Preview portal</button></div><h1>{property.enquiries} enquiries since launch</h1><p>{property.notes}</p><div><span><strong>{property.viewings}</strong><small>Viewings</small></span><span><strong>{property.readiness}%</strong><small>Ready</small></span><span><strong>{demo.actions.filter((item) => item.status === "Open").length}</strong><small>Open actions</small></span></div></section></div>;
}

function ReportsModule({ demo }: { demo: typeof seed }) {
  return <div className="page"><PageHeading label="Analytics" title="Management reports built from live operations." text="Leadership can understand property health, agent responsiveness, conversion signals and source quality." /><div className="demo-report-grid"><ReportCard label="Response speed" value="12 min" text="Median first response across active sample enquiries." /><ReportCard label="Viewing conversion" value="43%" text={`${demo.viewings.length} viewings from ${demo.enquiries.length} active enquiries.`} /><ReportCard label="Portfolio readiness" value="86%" text="Average readiness across sale and rental stock." /><ReportCard label="Top source" value="Website" text="Agency website is driving the strongest qualified leads." /></div></div>;
}

function WebsiteModule({ properties, notify }: { properties: Property[]; notify: (message: string) => void }) {
  return <div className="page"><PageHeading label="Agency website" title="A public site fed by the workspace." text="The demo mirrors listings, enquiry capture, domain readiness and published brand controls." action={<button className="primary" onClick={() => notify("Website preview opened in demo mode.")}>Preview website</button>} /><section className="panel demo-website-card"><div><span className="eyebrow">Published</span><h2>primemetro.estara.co.zw</h2><p>{properties.filter((item) => item.status !== "Draft").length} listings ready for public enquiry capture.</p></div><div className="module-links"><a href="#domains">Custom domains<span>→</span></a><a href="#templates">Website templates<span>→</span></a><a href="#forms">Lead forms<span>→</span></a></div></section></div>;
}

function TeamModule() {
  const rows = ["Tariro Nyoni - Principal agent", "Kuda Maseko - Lettings lead", "Ruvimbo Dube - Sales associate", "Ashley Ncube - Administrator"];
  return <div className="page"><PageHeading label="Team operations" title="Roles, branches and agent performance." text="The sample account includes a complete team structure with controlled access and clear ownership." /><section className="panel team-list">{rows.map((row) => <div className="team-row" key={row}><b>{initials(row)}</b><span><strong>{row.split(" - ")[0]}</strong><small>{row.split(" - ")[1]}</small></span><button>Review access</button></div>)}</section></div>;
}

function BranchesModule() {
  return <div className="page"><PageHeading label="Branch network" title="Harare and Bulawayo teams under one view." text="Branch records help route enquiries, assign agents and report performance by office." /><div className="demo-report-grid"><ReportCard label="Harare North" value="14" text="Active listings, premium residential focus." /><ReportCard label="Harare East" value="9" text="Family homes, townhouse and rental demand." /><ReportCard label="Bulawayo Desk" value="4" text="Remote capture and partner referrals." /></div></div>;
}

function IntegrationsModule({ integrations, toggleIntegration }: { integrations: Integration[]; toggleIntegration: (id: string) => void }) {
  return <div className="page"><PageHeading label="Estara Connect" title="External websites can read and write safely." text="This mirrors API credentials, connector presets, webhooks, CRM sync and portal integrations in demo mode." /><section className="panel demo-table">{integrations.map((integration) => <article key={integration.id}><b>{integration.connected ? "ON" : "OFF"}</b><span><strong>{integration.name}</strong><small>{integration.kind}</small></span><p>{integration.lastSync}</p><button className="outline" onClick={() => toggleIntegration(integration.id)}>{integration.connected ? "Pause" : "Connect"}</button></article>)}</section></div>;
}

function AutomationsModule() {
  return <div className="page"><PageHeading label="Automation rules" title="Repeatable work becomes governed workflows." text="The demo includes reminders, seller updates, webhook retries and viewing follow-ups as simulated automations." /><div className="demo-report-grid"><ReportCard label="Webhook retry" value="On" text="Failed webhooks are retried on a production schedule in the real account." /><ReportCard label="Seller update" value="Fri" text="Weekly portal digest prepared for active owners." /><ReportCard label="Lead SLA" value="15 min" text="Urgent enquiries trigger agent reminders." /></div></div>;
}

function SubscriptionModule() {
  return <div className="page"><PageHeading label="Plan and billing" title="Trial, subscription and limits are visible." text="A real account would show trial activation, plan benefits, invoices, usage limits and upgrade controls." /><section className="panel subscription-plan"><span className="eyebrow">Current demo plan</span><h2>Professional Trial</h2><strong>USD 0.00</strong><p>14 days, sample billing only. No payment method is collected in this demo.</p><div className="actions"><button className="primary">Start trial flow</button><button className="outline">Review limits</button></div></section></div>;
}

function SettingsModule({ platform }: { platform: Platform }) {
  return <div className="page"><PageHeading label="Agency settings" title="Brand, security and governance in one place." text="The sample account mirrors logo controls, custom domains, API credentials, roles, audit evidence and platform-safe AI settings." /><ModuleLinks links={[{ href: "#branding", label: `${platform.shortName} brand kit` }, { href: "#domains", label: "Custom domains and DNS" }, { href: "#roles", label: "Roles and permissions" }, { href: "#api", label: "Developer API credentials" }, { href: "#audit", label: "Evidence ledger" }, { href: "#security", label: "Security controls" }]} /></div>;
}

function LeadRow({ demo, enquiry, selected, pick }: { demo: typeof seed; enquiry: Enquiry; selected: boolean; pick: (id: string) => void }) {
  return <div className={`lead${selected ? " demo-selected-lead" : ""}`}><i>{initials(contactName(demo, enquiry.contactId))}</i><span><strong>{contactName(demo, enquiry.contactId)}</strong><p>{propertyName(demo, enquiry.propertyId)} - {enquiry.urgency}</p></span><em className={enquiry.stage === "New" ? "new" : enquiry.stage === "Qualified" ? "contacted" : "waiting"}>{enquiry.stage}</em><small>{enquiry.lastTouch}</small><button onClick={() => pick(enquiry.id)} disabled={selected}>{selected ? "Selected" : "Open"}</button></div>;
}

function ModuleLinks({ links, choose }: { links: { href: string; label: string }[]; choose?: (id: NavId) => void }) {
  return <nav className="module-links" aria-label="Connected platform modules">{links.map((link) => <a href={link.href} key={link.href} onClick={(event) => { const id = link.href.replace("#", "") as NavId; if (choose && demoNav.some((item) => item.id === id)) { event.preventDefault(); choose(id); } }}>{link.label}<span>→</span></a>)}</nav>;
}

function ReportCard({ label, value, text }: { label: string; value: string; text: string }) {
  return <article className="panel report-card"><span className="eyebrow">{label}</span><h2>{value}</h2><p>{text}</p></article>;
}

function propertyName(demo: typeof seed, id: string) {
  return demo.properties.find((property) => property.id === id)?.title || "Sample property";
}

function contactName(demo: typeof seed, id: string) {
  return demo.contacts.find((contact) => contact.id === id)?.name || "Sample contact";
}
