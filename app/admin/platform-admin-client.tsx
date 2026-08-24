"use client";
import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";

type Settings = {
  platformName: string; shortName: string; parentBrand: string; tagline: string; primaryColor: string; accentColor: string;
  supportEmail: string; supportPhone: string; supportWhatsapp: string; defaultCountry: string; defaultCurrency: string;
  timezone: string; domain: string; tenantDomainSuffix: string; poweredByWording: string; logoUrl: string; iconUrl: string; darkLogoUrl: string; darkIconUrl: string; updatedAt?: string;
};
type Data = { actor?: { role: string }; platform?: { platformName: string; shortName: string; logoUrl?: string; iconUrl?: string; darkLogoUrl?: string; darkIconUrl?: string }; settings?: Settings; operations?: any; platformUsers: any[]; plans: any[]; agencies: any[]; invoices: any[]; coupons: any[]; events: any[] };
type AdminThemeVars = CSSProperties & { "--admin-brand": string; "--admin-accent": string };
const empty: Data = { platformUsers: [], plans: [], agencies: [], invoices: [], coupons: [], events: [] };
const tabs = [
  { id: "overview", label: "Command centre", icon: "◈", group: "Operate" },
  { id: "agencies", label: "Agency intelligence", icon: "⌂", group: "Operate" },
  { id: "billing", label: "Revenue desk", icon: "$", group: "Operate" },
  { id: "settings", label: "Platform settings", icon: "⚙", group: "Configure" },
  { id: "plans", label: "Plans & entitlements", icon: "◇", group: "Configure" },
  { id: "team", label: "Operator access", icon: "◎", group: "Govern" },
  { id: "events", label: "Evidence ledger", icon: "≡", group: "Govern" },
] as const;
const navGroups = ["Operate", "Configure", "Govern"];
const normaliseHex = (value: string) => {
  const raw = value.trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : value;
};
const colourValue = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(normaliseHex(value)) ? normaliseHex(value) : fallback;
const defaultSettings: Settings = { platformName: "", shortName: "", parentBrand: "", tagline: "", primaryColor: "#153b34", accentColor: "#e6bd5f", supportEmail: "", supportPhone: "", supportWhatsapp: "", defaultCountry: "ZW", defaultCurrency: "USD", timezone: "Africa/Harare", domain: "", tenantDomainSuffix: "", poweredByWording: "Powered by ESTARA", logoUrl: "", iconUrl: "", darkLogoUrl: "", darkIconUrl: "" };
const normaliseSettings = (settings?: any): Settings => ({
  ...defaultSettings,
  ...(settings || {}),
  platformName: settings?.platformName ?? settings?.platform_name ?? defaultSettings.platformName,
  shortName: settings?.shortName ?? settings?.short_name ?? defaultSettings.shortName,
  parentBrand: settings?.parentBrand ?? settings?.parent_brand ?? defaultSettings.parentBrand,
  primaryColor: settings?.primaryColor ?? settings?.primary_color ?? defaultSettings.primaryColor,
  accentColor: settings?.accentColor ?? settings?.accent_color ?? defaultSettings.accentColor,
  supportEmail: settings?.supportEmail ?? settings?.support_email ?? defaultSettings.supportEmail,
  supportPhone: settings?.supportPhone ?? settings?.support_phone ?? defaultSettings.supportPhone,
  supportWhatsapp: settings?.supportWhatsapp ?? settings?.support_whatsapp ?? defaultSettings.supportWhatsapp,
  defaultCountry: settings?.defaultCountry ?? settings?.default_country ?? defaultSettings.defaultCountry,
  defaultCurrency: settings?.defaultCurrency ?? settings?.default_currency ?? defaultSettings.defaultCurrency,
  tenantDomainSuffix: settings?.tenantDomainSuffix ?? settings?.tenant_domain_suffix ?? defaultSettings.tenantDomainSuffix,
  poweredByWording: settings?.poweredByWording ?? settings?.powered_by_wording ?? defaultSettings.poweredByWording,
  logoUrl: settings?.logoUrl ?? settings?.logo_url ?? defaultSettings.logoUrl,
  iconUrl: settings?.iconUrl ?? settings?.icon_url ?? defaultSettings.iconUrl,
  darkLogoUrl: settings?.darkLogoUrl ?? settings?.dark_logo_url ?? defaultSettings.darkLogoUrl,
  darkIconUrl: settings?.darkIconUrl ?? settings?.dark_icon_url ?? defaultSettings.darkIconUrl,
});
const pageCopy: Record<string, { eyebrow: string; title: string; summary: string }> = {
  overview: { eyebrow: "PLATFORM OPERATIONS", title: "Super admin command centre", summary: "Operate ESTARA across tenants, revenue, identity, support, domains and launch evidence." },
  agencies: { eyebrow: "TENANT INTELLIGENCE", title: "Agency intelligence", summary: "Monitor tenant workspaces, subscriptions, usage, public activity and commercial risk." },
  settings: { eyebrow: "GLOBAL CONFIGURATION", title: "Platform settings", summary: "Control the platform identity, support channels, production domain and agency website routing." },
  plans: { eyebrow: "COMMERCIAL CONTROL", title: "Plans & entitlements", summary: "Version products, limits and entitlement packages before they reach agency workspaces." },
  billing: { eyebrow: "REVENUE OPERATIONS", title: "Revenue desk", summary: "Issue invoices, record receipts and keep commercial evidence tied to every agency." },
  team: { eyebrow: "PRIVILEGED ACCESS", title: "Operator access", summary: "Assign support, finance and super admin access with clear operational accountability." },
  events: { eyebrow: "EVIDENCE LEDGER", title: "Evidence ledger", summary: "Review platform activity and control-plane audit patterns across the estate." },
};

export default function PlatformAdminClient({ displayName }: { displayName: string }) {
  const [data, setData] = useState<Data>(empty), [tab, setTab] = useState("overview"), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [notice, setNotice] = useState(""), [error, setError] = useState(""), [menuOpen, setMenuOpen] = useState(false);
  const published = useMemo(() => data.plans.filter(plan => plan.status === "published"), [data.plans]);
  const platform = data.platform || { platformName: "Platform", shortName: "PL", logoUrl: "", iconUrl: "", darkLogoUrl: "", darkIconUrl: "" };
  const load = async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const response = await fetch("/api/platform", { cache: "no-store" }), body = await response.json();
      if (!response.ok) throw new Error(body.error || "Platform console could not be loaded.");
      setData({ ...body, settings: normaliseSettings(body.settings), platform: { ...body.platform, ...normaliseSettings(body.settings) } }); setError("");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(true).catch(reason => { setError(reason.message); setLoading(false); }); }, []);
  const send = async (method: string, body: any) => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/platform", { method, cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), result = await response.json();
      if (!response.ok) throw new Error(result.error || "Operation failed.");
      setNotice("Saved and recorded in the platform audit trail.");
      if (result.settings) setData(current => ({ ...current, settings: normaliseSettings(result.settings), platform: { ...current.platform, ...normaliseSettings(result.settings) } }));
      await load();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <main className="platform-admin-loading">
    <div>{platform.iconUrl ? <img src={platform.iconUrl} alt="" /> : <i>{platform.shortName.slice(0, 1)}</i>}<span>CONTROL PLANE</span><h1>Opening control plane</h1><p>Preparing tenant, revenue and evidence intelligence.</p></div>
  </main>;
  if (error) return <main className="platform-denied"><span>CONTROL PLANE</span><h1>Platform access is restricted.</h1><p>{error}</p><p>Use the normal ESTARA login first. The first signed-in user becomes Super Admin only when no platform operator exists yet. After that, an existing Super Admin must add your user ID under Operator access.</p><a href="/login">Log in</a><a href="/workspace">Return to workspace</a></main>;
  const activePage = pageCopy[tab] || pageCopy.overview;
  const showPageStrip = tab === "settings";
  const adminTheme: AdminThemeVars = { "--admin-brand": data.settings?.primaryColor || "#153b34", "--admin-accent": data.settings?.accentColor || "#e6bd5f" };
  const chooseTab = (id: string) => { setTab(id); setMenuOpen(false); };
  return <main className={`platform-admin platform-admin-premium platform-admin-compact${menuOpen ? " platform-menu-open" : ""}`} style={adminTheme}>
    <div className="platform-mobile-topbar">
      <button className="platform-menu-toggle" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>☰ Menu</button>
      <a className="platform-mobile-brand" href="/">{platform.iconUrl ? <img className="brand-icon" src={platform.iconUrl} alt="" /> : <i>{platform.shortName.slice(0, 1)}</i>}<span>{platform.logoUrl ? <img className="brand-logo" src={platform.logoUrl} alt={`${platform.platformName} logo`} /> : platform.platformName}</span></a>
    </div>
    <button className="platform-menu-scrim" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
    <aside className="platform-shell">
      <button className="platform-menu-close" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>×</button>
      <a className="platform-mark" href="/">{(platform.darkIconUrl || platform.iconUrl) ? <img className="brand-icon" src={platform.darkIconUrl || platform.iconUrl} alt="" /> : <i>{platform.shortName.slice(0, 1)}</i>}<span>{(platform.darkLogoUrl || platform.logoUrl) ? <img className="brand-logo" src={platform.darkLogoUrl || platform.logoUrl} alt={`${platform.platformName} logo`} /> : platform.platformName}<small>Control plane</small></span></a>
      <div className="platform-side-status"><span>Launch mode</span><strong>{data.settings?.domain ? "Production staging" : "Domain pending"}</strong><small>{data.operations?.publicIntake10m || 0} public intakes in 10m</small></div>
      <nav>{navGroups.map(group => <section className="platform-nav-group" key={group}><span>{group}</span>{tabs.filter(item => item.group === group).map(item => <button className={tab === item.id ? "active" : ""} onClick={() => chooseTab(item.id)} key={item.id}><i>{item.icon}</i><span>{item.label}</span></button>)}</section>)}</nav>
      <footer className="platform-operator-card">
        <span>Signed in as</span>
        <strong>{displayName}</strong>
        <small>{data.actor?.role?.replace("_", " ")}</small>
        <button type="button" disabled={busy} onClick={() => load(false)}>{busy ? "Refreshing..." : "Refresh console"}</button>
        <a href="/workspace">Agency workspace</a>
        <a href="/health">Platform health</a>
        <a href="/signout-with-chatgpt?return_to=/">Sign out</a>
      </footer>
    </aside>
    <section className="platform-main">
      <header className="platform-hero-bar">
        <div>
          <span>{activePage.eyebrow}</span>
          <h1>{activePage.title}</h1>
          <p>{activePage.summary}</p>
        </div>
        <aside className="platform-control-card">
          <span>ACTIVE SESSION</span>
          <b>{data.actor?.role === "super_admin" ? "Super Admin" : "Role Limited"}</b>
          <small>{data.settings?.domain || "Production domain pending"}</small>
          <button className="platform-refresh" disabled={busy} onClick={() => load(false)}>{busy ? "Refreshing..." : "Refresh console"}</button>
        </aside>
      </header>
      {notice && <div className="platform-notice">{notice}</div>}
      {tab === "overview" && <Overview data={data} setTab={setTab} />}
      {tab === "agencies" && <Agencies rows={data.agencies} plans={published} busy={busy} send={send} />}
      {tab === "settings" && <PlatformSettings settings={data.settings} busy={busy} send={send} onAssetUploaded={(field, url) => setData(current => ({ ...current, settings: normaliseSettings({ ...current.settings, [field]: url }), platform: { ...current.platform, [field]: url } }))} />}
      {tab === "plans" && <Plans rows={data.plans} busy={busy} send={send} />}
      {tab === "billing" && <Billing agencies={data.agencies} invoices={data.invoices} coupons={data.coupons} busy={busy} send={send} />}
      {tab === "team" && <PlatformTeam rows={data.platformUsers} busy={busy} send={send} />}
      {tab === "events" && <Events rows={data.events} audits={data.operations?.recentPlatformAudits || []} />}
    </section>
  </main>;
}

/* retired overview signals: platform-page-strip platform-analytics-grid platform-donut WEEKLY PLATFORM INSIGHTS conic-gradient(var(--admin-brand,#153b34) var(--admin-accent,#e6bd5f) 0deg */

function Overview({ data, setTab }: { data: Data; setTab: (tab: string) => void }) {
  const ops = data.operations || {}, openMoney = ((ops.openInvoiceMinor || 0) / 100).toFixed(2);
  const attention = attentionItems(data);
  return <>
    <section className="platform-command-hero">
      <div>
        <span>COMMAND BRIEF</span>
        <h2>Platform performance, risk and revenue in one control room.</h2>
        <p>Manage tenant health, plan access, billing, operator access and launch evidence without losing the operational signal.</p>
      </div>
      <div className="platform-command-actions">
        <button onClick={() => setTab("settings")}>Platform settings</button>
        <button onClick={() => setTab("agencies")}>Review agencies</button>
        <button onClick={() => setTab("billing")}>Revenue desk</button>
        <button onClick={() => setTab("events")}>Evidence ledger</button>
      </div>
    </section>
    <div className="platform-kpis platform-kpis-six">
      <article><span>AGENCIES</span><strong>{ops.agencies || data.agencies.length}</strong><small>Total tenant workspaces</small></article>
      <article><span>USERS</span><strong>{ops.users || 0}</strong><small>Across the platform</small></article>
      <article><span>PUBLIC EVENTS</span><strong>{ops.publicEvents24h || 0}</strong><small>Last 24 hours</small></article>
      <article><span>OPEN INVOICES</span><strong>{ops.openInvoices || 0}</strong><small>USD {openMoney}</small></article>
      <article><span>MEDIA STORAGE</span><strong>{formatBytes(ops.mediaBytes || 0)}</strong><small>{ops.mediaAssets || 0} stored assets</small></article>
      <article><span>INTAKE LOAD</span><strong>{ops.publicIntake10m || 0}</strong><small>Last 10 minutes</small></article>
    </div>
    <div className="platform-dashboard-grid">
      <section className="platform-card platform-attention">
        <span>NEEDS OPERATOR ATTENTION</span><h2>Platform risk queue</h2>
        {attention.length ? attention.map(item => <article key={item.title}><b>{item.level}</b><span><strong>{item.title}</strong><small>{item.detail}</small></span><button onClick={() => setTab(item.tab)}>Open</button></article>) : <p>No platform risk items are currently visible from local data.</p>}
      </section>
      <section className="platform-card platform-launch-panel">
        <span>LAUNCH CONTROL</span><h2>Production gates</h2>
        {["Provider accounts and live secrets", "Domain and TLS evidence", "D1 restore rehearsal", "Mobile device audit", "Owner launch approval"].map((item, index) => <div key={item}><i>{index < 2 ? "P0" : "P1"}</i><span><strong>{item}</strong><small>Owner or production evidence still required before public launch.</small></span></div>)}
      </section>
      <section className="platform-card platform-signal-list">
        <span>PLATFORM POSTURE</span><h2>Identity and routing</h2>
        <span><strong>{data.settings?.platformName || "Platform name missing"}</strong><small>Platform name</small></span>
        <span><strong>{data.settings?.supportEmail || "Support email missing"}</strong><small>Support inbox</small></span>
        <span><strong>{data.settings?.tenantDomainSuffix || "Tenant suffix missing"}</strong><small>Agency website suffix</small></span>
        {(ops.domains || []).map((item: any) => <span key={item.status}><strong>{item.count} {item.status}</strong><small>Custom domains</small></span>)}
      </section>
    </div>
  </>;
}

/* retired overview signals: platform-analytics-grid platform-donut WEEKLY PLATFORM INSIGHTS conic-gradient(var(--admin-brand,#153b34) */

const subLabel = (value?: string) => ({ trialing: "Trial", active: "Active", past_due: "Past due", grace: "Grace", suspended: "Suspended", canceled: "Cancelled", expired: "Expired" } as Record<string, string>)[value || ""] || "Unassigned";
const tenantLabel = (value?: string) => ({ active: "Active", suspended: "Suspended", disabled: "Disabled", archived: "Archived" } as Record<string, string>)[value || ""] || "Unknown";
const dateShort = (value?: string) => value ? new Date(value).toLocaleDateString() : "Not set";
const needsCare = (x: any) => !x.subscriptionId || ["past_due", "grace", "suspended", "canceled", "expired"].includes(x.state) || ["suspended", "disabled", "archived"].includes(x.agencyStatus);
const subFilters = ["all","unassigned","trialing","active","past_due","grace","expired","suspended","canceled"], tenantFilters = ["all","active","suspended","disabled","archived"];

function Agencies({ rows, plans, busy, send }: any) {
  const [query, setQuery] = useState(""), [sub, setSub] = useState("all"), [tenant, setTenant] = useState("all");
  const filtered = rows.filter((x: any) => `${x.name} ${x.slug} ${x.state || ""} ${x.agencyStatus || ""}`.toLowerCase().includes(query.toLowerCase()) && (sub === "all" || (x.state || "unassigned") === sub) && (tenant === "all" || (x.agencyStatus || "active") === tenant));
  const totals = { active: rows.filter((x: any) => ["trialing", "active"].includes(x.state) && (x.agencyStatus || "active") === "active").length, attention: rows.filter(needsCare).length, publicEvents: rows.reduce((sum: number, x: any) => sum + Number(x.publicEvents24h || 0), 0), enquiries: rows.reduce((sum: number, x: any) => sum + Number(x.enquiries || 0), 0) };
  return <>
    <div className="platform-kpis"><article><span>OPERATIONAL</span><strong>{totals.active}</strong><small>Active tenants with live access</small></article><article><span>NEEDS ATTENTION</span><strong>{totals.attention}</strong><small>Billing or tenant controls</small></article><article><span>PUBLIC TRAFFIC</span><strong>{totals.publicEvents}</strong><small>Last 24 hours</small></article><article><span>ENQUIRIES</span><strong>{totals.enquiries}</strong><small>Across agencies</small></article></div>
    <section className="platform-card platform-directory">
      <div className="platform-section-title"><span>AGENCY PORTFOLIO</span><h2>Tenant command list</h2><input aria-label="Search agencies" placeholder="Search agency, slug or state" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="platform-tenant-filters"><select aria-label="Filter subscription" value={sub} onChange={event => setSub(event.target.value)}>{subFilters.map(item => <option key={item} value={item}>{item === "all" ? "All subscriptions" : subLabel(item)}</option>)}</select><select aria-label="Filter tenant status" value={tenant} onChange={event => setTenant(event.target.value)}>{tenantFilters.map(item => <option key={item} value={item}>{item === "all" ? "All tenant statuses" : tenantLabel(item)}</option>)}</select></div>
      <div className="platform-table">{filtered.length ? <><div className="platform-table-head"><span>Agency</span><span>Usage</span><span>Plan</span><span>Status</span><span>Manage</span></div>{filtered.map((agency: any) => <AgencyRow agency={agency} plans={plans} busy={busy} send={send} key={agency.id} />)}</> : <EmptyPanel title="No agencies found" detail="Try a different agency name, slug or subscription state." />}</div>
    </section>
  </>;
}
function AgencyRow({ agency, plans, busy, send }: any) {
  const [plan, setPlan] = useState(agency.planVersionId || plans[0]?.id || ""), [open, setOpen] = useState(false), [confirm, setConfirm] = useState<any>(null), [choice, setChoice] = useState("activate");
  const act = (label: string, fn: () => void, danger = false) => danger ? setConfirm({ label, fn }) : fn();
  const transition = (state: string) => send("PATCH", { action: "transition_subscription", id: agency.subscriptionId, state, reason: "Platform operator update" });
  const setStatus = (status: string) => send("PATCH", { action: "update_agency_status", agencyId: agency.id, status, reason: "Platform operator update" });
  const statusInfo = agency.state === "trialing" ? `Ends ${dateShort(agency.trialEndsAt)}` : agency.state === "grace" ? `Grace ${dateShort(agency.graceEndsAt)}` : agency.state === "active" ? `Renews ${dateShort(agency.currentPeriodEndsAt)}` : agency.statusReason || "";
  const actions: Record<string, [string, boolean, () => void]> = {
    activate: ["Activate subscription", !agency.subscriptionId || agency.state === "active", () => transition("active")],
    extend: ["Extend trial 7d", !agency.subscriptionId || !["trialing","expired"].includes(agency.state), () => send("POST", { action: "extend_trial", id: agency.subscriptionId, days: 7, reason: "Admin extension" })],
    grace: ["Start grace", !agency.subscriptionId || agency.state === "grace", () => transition("grace")],
    due: ["Mark past due", !agency.subscriptionId || agency.state === "past_due", () => transition("past_due")],
    subSuspend: ["Suspend subscription", !agency.subscriptionId || agency.state === "suspended", () => act("suspend this subscription", () => transition("suspended"), true)],
    subCancel: ["Cancel subscription", !agency.subscriptionId || agency.state === "canceled", () => act("cancel this subscription", () => transition("canceled"), true)],
    restore: ["Restore agency", (agency.agencyStatus || "active") === "active", () => setStatus("active")],
    tenantSuspend: ["Suspend agency", agency.agencyStatus === "suspended", () => act("suspend this agency", () => setStatus("suspended"), true)],
    archive: ["Archive agency", agency.agencyStatus === "archived", () => act("archive this agency", () => setStatus("archived"), true)],
    delete: ["Delete", false, () => act(`delete ${agency.slug}`, () => send("DELETE", { agencyId: agency.id, confirmSlug: agency.slug }), true)],
  };
  const selected = actions[choice] || actions.activate;
  return <div className="platform-agency-row"><span><strong>{agency.name}</strong><small>{agency.slug} · created {dateShort(agency.createdAt)}</small></span><span><strong>{agency.properties} properties</strong><small>{agency.users} users · {agency.enquiries} enquiries · {agency.viewings || 0} viewings</small></span><span><select aria-label={`Plan for ${agency.name}`} value={plan} onChange={event => setPlan(event.target.value)}>{plans.map((item: any) => <option value={item.id} key={item.id}>{item.name} v{item.version}</option>)}</select><button disabled={busy || !plan} onClick={() => send("POST", { action: "assign_subscription", agencyId: agency.id, planVersionId: plan, state: agency.state === "active" ? "active" : "trialing" })}>{busy ? "Applying..." : agency.subscriptionId ? "Apply plan" : "Start trial"}</button></span><span className="platform-badge-stack"><em className={`state-${agency.state || "unassigned"}`}>{subLabel(agency.state)}</em><em className={`state-${agency.agencyStatus || "active"}`}>{tenantLabel(agency.agencyStatus || "active")}</em><small>{statusInfo}</small></span><span className="platform-row-actions"><button onClick={() => setOpen(value => !value)}>{open ? "Close" : "Manage"}</button>{open && <div className="platform-manage-panel"><a href={`/site/${agency.slug}`} target="_blank">View site</a><select aria-label={`Action for ${agency.name}`} value={choice} onChange={event => setChoice(event.target.value)}>{Object.entries(actions).map(([key, action]) => <option key={key} value={key}>{action[0]}</option>)}</select><button disabled={busy || selected[1]} onClick={selected[2]}>Run action</button>{confirm && <span className="platform-confirm"><small>Confirm {confirm.label}</small><button disabled={busy} onClick={() => { confirm.fn(); setConfirm(null); }}>Confirm</button><button onClick={() => setConfirm(null)}>Cancel</button></span>}</div>}</span></div>;
}

function PlatformSettings({ settings, busy, send, onAssetUploaded }: { settings?: Settings; busy: boolean; send: (method: string, body: any) => void; onAssetUploaded: (field: keyof Settings, url: string) => void }) {
  const [form, setForm] = useState<Settings>(normaliseSettings(settings));
  const [uploading, setUploading] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  useEffect(() => { if (settings) setForm(normaliseSettings(settings)); }, [settings]);
  const change = (key: keyof Settings, value: string) => setForm(current => ({ ...current, [key]: value }));
  const changeColour = (key: "primaryColor" | "accentColor", value: string) => setForm(current => ({ ...current, [key]: normaliseHex(value) }));
  const uploadBrandAsset = async (type: "logo" | "icon" | "dark-logo" | "dark-icon", file?: File) => {
    if (!file) return;
    setUploading(type);
    setUploadError("");
    setUploadNotice("");
    try {
      const body = new FormData();
      body.set("type", type);
      body.set("file", file);
      const response = await fetch("/api/platform/asset", { method: "POST", body }), result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      const field: keyof Settings = type === "logo" ? "logoUrl" : type === "icon" ? "iconUrl" : type === "dark-logo" ? "darkLogoUrl" : "darkIconUrl";
      setForm(current => ({ ...current, [field]: result.url }));
      onAssetUploaded(field, result.url);
      setUploadNotice(`${type.replace("-", " ")} uploaded and saved to platform settings.`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading("");
    }
  };
  return <form className="platform-settings-workbench" onSubmit={(event: FormEvent) => { event.preventDefault(); send("PATCH", { action: "update_platform_settings", ...form, primaryColor: normaliseHex(form.primaryColor), accentColor: normaliseHex(form.accentColor) }); }}>
    <section className="platform-card platform-brand-console">
      <span>PLATFORM BRAND</span><h2>{form.platformName || "Platform identity"}</h2><p>{form.tagline || "Set the commercial promise every login, workspace and public footer can inherit."}</p>
      <div style={{ background: form.primaryColor, borderTop: `8px solid ${form.accentColor}` }}>{(form.darkIconUrl || form.iconUrl) ? <img src={form.darkIconUrl || form.iconUrl} alt={`${form.platformName || "Platform"} icon preview`} /> : <b style={{ color: form.accentColor }}>{form.shortName?.slice(0, 1) || "E"}</b>}<span>{form.poweredByWording || "Powered by platform"}</span></div>
      <div className="platform-brand-assets">
        <span><strong>Logo</strong><small>{form.logoUrl ? "Custom logo URL saved" : "Uses short-name initial until a logo URL is added"}</small></span>
        <span><strong>Browser icon</strong><small>{form.iconUrl ? "Custom browser icon URL saved" : "Uses default favicon until an icon URL is added"}</small></span>
        <span><strong>Dark logo</strong><small>{form.darkLogoUrl ? "Custom dark-surface logo saved" : "Dark screens fall back to the normal logo"}</small></span>
        <span><strong>Dark icon</strong><small>{form.darkIconUrl ? "Custom dark-surface icon saved" : "Dark saved-site surfaces fall back to the normal icon"}</small></span>
      </div>
      {uploadNotice && <p className="platform-notice" role="status">{uploadNotice}</p>}
      {uploadError && <p className="platform-error" role="alert">{uploadError}</p>}
    </section>
    <section className="platform-card platform-settings-form">
      <span>GLOBAL PLATFORM CONFIGURATION</span><h2>Identity, support and public routing</h2>
      <div className="platform-config-grid">
        <fieldset>
          <legend>Brand System</legend>
          <label>Platform name<input value={form.platformName} onChange={event => change("platformName", event.target.value)} /></label>
          <label>Short name<input value={form.shortName} onChange={event => change("shortName", event.target.value)} /></label>
          <label>Parent brand<input value={form.parentBrand} onChange={event => change("parentBrand", event.target.value)} /></label>
          <label>Primary colour<input type="color" value={colourValue(form.primaryColor, "#153b34")} onChange={event => changeColour("primaryColor", event.target.value)} /><input value={form.primaryColor} onChange={event => changeColour("primaryColor", event.target.value)} /></label>
          <label>Accent colour<input type="color" value={colourValue(form.accentColor, "#e6bd5f")} onChange={event => changeColour("accentColor", event.target.value)} /><input value={form.accentColor} onChange={event => changeColour("accentColor", event.target.value)} /></label>
          <label className="wide">Tagline<input value={form.tagline} onChange={event => change("tagline", event.target.value)} /></label>
          <label className="wide">Powered-by wording<input value={form.poweredByWording} onChange={event => change("poweredByWording", event.target.value)} /></label>
        </fieldset>
        <fieldset>
          <legend>Logo & Icon</legend>
          <label className="wide platform-asset-upload"><strong>{uploading === "logo" ? "Uploading platform logo..." : "Upload platform logo"}</strong><small>This controls the ESTARA wordmark on the homepage, demo, workspace, Super Admin and share previews.</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(uploading)} onChange={event => uploadBrandAsset("logo", event.target.files?.[0])} /></label>
          <label className="wide platform-asset-upload"><strong>{uploading === "icon" ? "Uploading browser icon..." : "Upload browser icon"}</strong><small>This replaces the letter mark, tab icon and mobile saved-site icon where the browser supports it.</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(uploading)} onChange={event => uploadBrandAsset("icon", event.target.files?.[0])} /></label>
          <label className="wide platform-asset-upload"><strong>{uploading === "dark-logo" ? "Uploading dark logo..." : "Upload dark logo"}</strong><small>This logo is used on dark sidebars, dark admin panels and dark demo/workspace surfaces.</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(uploading)} onChange={event => uploadBrandAsset("dark-logo", event.target.files?.[0])} /></label>
          <label className="wide platform-asset-upload"><strong>{uploading === "dark-icon" ? "Uploading dark browser icon..." : "Upload dark browser icon"}</strong><small>Optional dark-mode icon. If empty, the main platform icon is used.</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(uploading)} onChange={event => uploadBrandAsset("dark-icon", event.target.files?.[0])} /></label>
          <label className="wide">Platform logo URL<input value={form.logoUrl} onChange={event => change("logoUrl", event.target.value)} placeholder="/api/platform/asset?type=logo" /></label>
          <label className="wide">Browser icon URL<input value={form.iconUrl} onChange={event => change("iconUrl", event.target.value)} placeholder="/api/platform/asset?type=icon" /></label>
          <label className="wide">Dark logo URL<input value={form.darkLogoUrl} onChange={event => change("darkLogoUrl", event.target.value)} placeholder="/api/platform/asset?type=dark-logo" /></label>
          <label className="wide">Dark browser icon URL<input value={form.darkIconUrl} onChange={event => change("darkIconUrl", event.target.value)} placeholder="/api/platform/asset?type=dark-icon" /></label>
        </fieldset>
        <fieldset>
          <legend>Support Desk</legend>
          <label>Support email<input type="email" value={form.supportEmail} onChange={event => change("supportEmail", event.target.value)} /></label>
          <label>Support phone<input value={form.supportPhone} onChange={event => change("supportPhone", event.target.value)} /></label>
          <label className="wide">Support WhatsApp<input value={form.supportWhatsapp} onChange={event => change("supportWhatsapp", event.target.value)} /></label>
        </fieldset>
        <fieldset>
          <legend>Regional Defaults</legend>
          <label>Default country<input maxLength={2} value={form.defaultCountry} onChange={event => change("defaultCountry", event.target.value)} /></label>
          <label>Default currency<input maxLength={3} value={form.defaultCurrency} onChange={event => change("defaultCurrency", event.target.value)} /></label>
          <label className="wide">Timezone<input value={form.timezone} onChange={event => change("timezone", event.target.value)} /></label>
        </fieldset>
        <fieldset>
          <legend>Public Routing</legend>
          <label>Platform domain<input value={form.domain} onChange={event => change("domain", event.target.value)} /></label>
          <label>Tenant domain suffix<input value={form.tenantDomainSuffix} onChange={event => change("tenantDomainSuffix", event.target.value)} /></label>
          <div className="platform-domain-guide">
            <span><strong>{form.domain || "estara.co.zw"}</strong><small>Public homepage and marketing website</small></span>
            <span><strong>{form.domain ? `app.${form.domain}` : "app.estara.co.zw"}</strong><small>Login, workspace and Super Admin</small></span>
            <span><strong>{form.tenantDomainSuffix || "estara.co.zw"}</strong><small>Default agency website subdomains</small></span>
          </div>
        </fieldset>
      </div>
      <button disabled={busy || Boolean(uploading)}>{busy ? "Saving platform settings..." : "Save platform settings"}</button>
    </section>
  </form>;
}

function Plans({ rows, busy, send }: any) {
  const [form, setForm] = useState({ planKey: "professional", name: "Professional", currency: "USD", priceMinor: 4900, billingPeriod: "month", status: "draft", maxProperties: 500, maxUsers: 25, maxBranches: 5 });
  const submit = (event: FormEvent) => { event.preventDefault(); send("POST", { action: "create_plan_version", ...form, entitlements: { publicWebsite: true, marketing: true, sellerPortal: true, automation: true, customDomains: true }, limits: { maxProperties: Number(form.maxProperties), maxUsers: Number(form.maxUsers), maxBranches: Number(form.maxBranches) } }); };
  return <div className="platform-split platform-plan-desk"><section className="platform-card"><span>IMMUTABLE CATALOGUE</span><h2>Versioned plans</h2>{rows.length ? rows.map((plan: any) => <article className="plan-version" key={plan.id}><div><strong>{plan.name}</strong><small>{plan.planKey} · version {plan.version}</small></div><b>{plan.currency} {(plan.priceMinor / 100).toFixed(0)}<small>/{plan.billingPeriod}</small></b><em>{plan.status}</em><footer>{Object.entries(plan.limits).map(([key, value]) => <span key={key}>{String(value)} {key.replace("max", "").toLowerCase()}</span>)}</footer></article>) : <EmptyPanel title="No plan versions yet" detail="Create the first immutable plan version to control agency entitlements." />}</section><form className="platform-card platform-form" onSubmit={submit}><span>CREATE A NEW VERSION</span><h2>Plan definition</h2><label>Plan key<input value={form.planKey} onChange={event => setForm({ ...form, planKey: event.target.value })} /></label><label>Name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><div><label>Currency<input maxLength={3} value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value })} /></label><label>Monthly price, cents<input type="number" min="0" value={form.priceMinor} onChange={event => setForm({ ...form, priceMinor: Number(event.target.value) })} /></label></div><div><label>Properties<input type="number" min="1" value={form.maxProperties} onChange={event => setForm({ ...form, maxProperties: Number(event.target.value) })} /></label><label>Users<input type="number" min="1" value={form.maxUsers} onChange={event => setForm({ ...form, maxUsers: Number(event.target.value) })} /></label><label>Branches<input type="number" min="1" value={form.maxBranches} onChange={event => setForm({ ...form, maxBranches: Number(event.target.value) })} /></label></div><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></label><button disabled={busy}>{busy ? "Creating version..." : "Create immutable version"}</button></form></div>;
}

function Billing({ agencies, invoices, coupons, busy, send }: any) {
  const [agencyId, setAgencyId] = useState(agencies.find((x: any) => x.subscriptionId)?.id || ""), [couponCode, setCouponCode] = useState(""), [coupon, setCoupon] = useState({ code: "", kind: "percent", amount: 10 });
  const [receipt, setReceipt] = useState({ invoiceId: "", reference: "" });
  const open = invoices.filter((x: any) => x.status === "open"), paid = invoices.filter((x: any) => x.status === "paid");
  const recordPayment = () => { if (!receipt.invoiceId || !receipt.reference.trim()) return; send("PATCH", { action: "mark_invoice_paid", id: receipt.invoiceId, method: "manual", reference: receipt.reference.trim() }); setReceipt({ invoiceId: "", reference: "" }); };
  return <div className="platform-split platform-revenue-desk"><section className="platform-card"><span>INVOICES & RECEIPTS</span><h2>Billing ledger</h2><div className="platform-mini-kpis"><span><strong>{open.length}</strong><small>Open invoices</small></span><span><strong>{paid.length}</strong><small>Paid invoices</small></span></div><div className="invoice-create"><select value={agencyId} onChange={event => setAgencyId(event.target.value)}>{agencies.filter((x: any) => x.subscriptionId).map((item: any) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><input placeholder="Coupon (optional)" value={couponCode} onChange={event => setCouponCode(event.target.value)} /><button disabled={busy || !agencyId} onClick={() => send("POST", { action: "create_invoice", agencyId, couponCode })}>{busy ? "Issuing..." : "Issue invoice"}</button></div>{invoices.map((invoice: any) => <article className="invoice-row" key={invoice.id}><span><strong>{invoice.invoiceNumber}</strong><small>{invoice.agency} · due {new Date(invoice.dueAt).toLocaleDateString()}</small></span><b>{invoice.currency} {(invoice.totalMinor / 100).toFixed(2)}</b><em>{invoice.status}</em>{invoice.status === "open" && <button disabled={busy} onClick={() => setReceipt({ invoiceId: invoice.id, reference: receipt.invoiceId === invoice.id ? receipt.reference : "" })}>{busy ? "Opening..." : "Record payment"}</button>}{receipt.invoiceId === invoice.id && <div className="invoice-receipt"><label>Receipt or provider reference<input autoFocus value={receipt.reference} onChange={event => setReceipt({ ...receipt, reference: event.target.value })} /></label><button disabled={busy || !receipt.reference.trim()} onClick={recordPayment}>{busy ? "Saving..." : "Save receipt"}</button><button className="invoice-secondary" disabled={busy} onClick={() => setReceipt({ invoiceId: "", reference: "" })}>Cancel</button></div>}</article>)}</section><section className="platform-card platform-form"><span>DISCOUNTS</span><h2>Coupons</h2><label>Code<input value={coupon.code} onChange={event => setCoupon({ ...coupon, code: event.target.value })} /></label><label>Type<select value={coupon.kind} onChange={event => setCoupon({ ...coupon, kind: event.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed cents</option></select></label><label>Amount<input type="number" min="1" value={coupon.amount} onChange={event => setCoupon({ ...coupon, amount: Number(event.target.value) })} /></label><button disabled={busy || !coupon.code} onClick={() => send("POST", { action: "create_coupon", ...coupon })}>{busy ? "Creating coupon..." : "Create coupon"}</button><div className="coupon-list">{coupons.map((item: any) => <span key={item.code}><strong>{item.code}</strong><small>{item.kind === "percent" ? `${item.amount}%` : `${item.amount} cents`} · {item.redemptions} used</small></span>)}</div></section></div>;
}
function PlatformTeam({ rows, busy, send }: any) {
  const [form, setForm] = useState({ userId: "", email: "", role: "support" });
  return <div className="platform-split"><section className="platform-card"><span>PRIVILEGED IDENTITIES</span><h2>Platform operators</h2><div className="platform-access-guide"><strong>How Super Admin login works</strong><p>Super Admins use the normal login page. The role is not a separate password. After someone creates and verifies an account, add their authenticated user ID here and choose Super admin.</p></div>{rows.map((user: any) => <article className="platform-user" key={user.userId}><i>{user.email.slice(0, 2).toUpperCase()}</i><span><strong>{user.email}</strong><small>{user.userId}</small></span><em>{user.role.replace("_", " ")}</em></article>)}</section><form className="platform-card platform-form" onSubmit={event => { event.preventDefault(); send("POST", { action: "create_platform_user", ...form }); }}><span>ASSIGN ACCESS</span><h2>Add platform operator</h2><label>Authenticated user ID<input required value={form.userId} onChange={event => setForm({ ...form, userId: event.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><label>Role<select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option value="support">Support</option><option value="finance">Finance</option><option value="super_admin">Super admin</option></select></label><button disabled={busy}>{busy ? "Assigning access..." : "Assign platform access"}</button></form></div>;
}
function Events({ rows, audits }: any) {
  return <div className="platform-split"><section className="platform-card"><span>IMMUTABLE OPERATIONS HISTORY</span><h2>Recent platform activity</h2>{rows.map((item: any) => <article className="platform-event" key={item.id}><i>•</i><span><strong>{item.eventType.replaceAll(".", " ")}</strong><small>{item.agency}</small></span><time>{new Date(item.createdAt).toLocaleString()}</time></article>)}</section><section className="platform-card"><span>CONTROL PLANE AUDITS</span><h2>Last 7 days</h2>{audits.map((item: any) => <article className="platform-event" key={item.action}><i>•</i><span><strong>{item.action.replaceAll(".", " ")}</strong><small>{item.count} event{item.count === 1 ? "" : "s"}</small></span></article>)}</section></div>;
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <div className="platform-empty-panel"><strong>{title}</strong><small>{detail}</small></div>;
}

function attentionItems(data: Data) {
  const ops = data.operations || {}, rows = data.agencies || [], items = [];
  const unassigned = rows.filter((x: any) => !x.subscriptionId).length, suspended = rows.filter((x: any) => ["grace", "suspended"].includes(x.state)).length;
  if (!data.settings?.domain) items.push({ level: "P0", title: "Primary platform domain is not set", detail: "Set the production domain before launch evidence can be complete.", tab: "settings" });
  if (!data.settings?.tenantDomainSuffix) items.push({ level: "P0", title: "Tenant website suffix is missing", detail: "Agency public websites need a controlled default domain path.", tab: "settings" });
  if (unassigned) items.push({ level: "P1", title: `${unassigned} agenc${unassigned === 1 ? "y has" : "ies have"} no subscription`, detail: "Assign a published plan so entitlements and limits are explicit.", tab: "agencies" });
  if (suspended) items.push({ level: "P1", title: `${suspended} agenc${suspended === 1 ? "y needs" : "ies need"} commercial attention`, detail: "Grace or suspended subscriptions can block agency operations.", tab: "agencies" });
  if (ops.openInvoices) items.push({ level: "P1", title: `${ops.openInvoices} open invoice${ops.openInvoices === 1 ? "" : "s"}`, detail: "Record payment only when a real provider/reference exists.", tab: "billing" });
  return items;
}
function formatBytes(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} GB`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} KB`;
  return `${value} B`;
}
