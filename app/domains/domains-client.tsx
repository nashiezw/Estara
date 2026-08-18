"use client";
import { FormEvent, useEffect, useState } from "react";

type DomainRecord = { id: string; domain: string; ownershipToken: string; expectedCname: string; txtName: string; txtValue: string; status: string; failureReason?: string | null };

export default function DomainClient() {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [domain, setDomain] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch("/api/domains", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Domains could not be loaded.");
    setDomains(body.domains || []);
  }
  useEffect(() => { load().catch((err) => setError(err.message)); }, []);
  async function call(method: string, body: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/domains", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Domain update failed.");
      setMessage("Domain settings updated.");
      setDomain("");
      await load();
    } catch (err: any) {
      setError(err.message || "Domain update failed.");
    } finally {
      setBusy(false);
    }
  }
  function add(event: FormEvent) {
    event.preventDefault();
    call("POST", { domain });
  }
  return <main className="tool-page">
    <a className="back" href="/workspace">Return to workspace</a>
    <section className="tool-hero"><span>Agency website</span><h1>Custom domains</h1><p>Connect an agency-owned domain with explicit ownership proof, DNS verification and provider-gated activation.</p></section>
    {error && <div className="notice" role="alert">{error}</div>}
    {message && <div className="notice success">{message}</div>}
    <form className="tool-card domain-form" onSubmit={add}>
      <label>Domain name<input required value={domain} onChange={event => setDomain(event.target.value)} placeholder="www.agency.co.zw" /></label>
      <button disabled={busy}>{busy ? "Saving..." : "Add domain"}</button>
    </form>
    <section className="tool-grid domain-grid">
      {domains.map(item => <article className="tool-card domain-card" key={item.id}>
        <header><div><small>{item.status.replaceAll("_", " ")}</small><h2>{item.domain}</h2></div><button disabled={busy} onClick={() => call("PATCH", { id: item.id, action: "disable" })}>Disable</button></header>
        <dl><div><dt>TXT name</dt><dd>{item.txtName}</dd></div><div><dt>TXT value</dt><dd>{item.txtValue}</dd></div><div><dt>CNAME target</dt><dd>{item.expectedCname}</dd></div></dl>
        {item.failureReason && <p className="notice">{item.failureReason}</p>}
        <DomainCheck id={item.id} busy={busy} call={call} />
        <footer><button disabled={busy || item.status !== "verified"} onClick={() => call("PATCH", { id: item.id, action: "request_ssl" })}>Request TLS</button><button disabled={busy || !["verified", "ssl_pending"].includes(item.status)} onClick={() => call("PATCH", { id: item.id, action: "activate" })}>Activate</button></footer>
      </article>)}
      {!domains.length && <article className="tool-card"><h2>No custom domains yet</h2><p>Add a domain when the agency is ready to route public visitors from its own website address.</p></article>}
    </section>
  </main>;
}

function DomainCheck({ id, busy, call }: { id: string; busy: boolean; call: (method: string, body: Record<string, unknown>) => void }) {
  const [observedTxt, setTxt] = useState("");
  const [observedCname, setCname] = useState("");
  return <form className="domain-check" onSubmit={event => { event.preventDefault(); call("PATCH", { id, action: "check_dns", observedTxt, observedCname }); }}>
    <label>Observed TXT<input required value={observedTxt} onChange={event => setTxt(event.target.value)} /></label>
    <label>Observed CNAME<input required value={observedCname} onChange={event => setCname(event.target.value)} /></label>
    <button disabled={busy}>Check DNS</button>
  </form>;
}
