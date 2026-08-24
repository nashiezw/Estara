"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PlatformBrand } from "../components/PlatformToolHeader";

type Credential = { id: string; name: string; keyPrefix: string; scopes: string[]; ipAllowlist?: string[]; rotationDueAt?: string | null; expiresAt?: string | null; lastUsedAt?: string | null; revokedAt?: string | null; createdAt: string };
type Hook = { id: string; name: string; url: string; events: string[]; status: string; createdAt: string };
type Delivery = { id: string; subscriptionId: string; eventType: string; status: string; responseStatus?: number | null; attempts: number; nextAttemptAt?: string | null; createdAt: string; deliveredAt?: string | null };

export default function DeveloperClient({ platform }: { platform: PlatformBrand }) {
  const [data, setData] = useState<any>({ allowedScopes: [], credentials: [], usage: {}, recentFailures: [] });
  const [hooks, setHooks] = useState<{ allowedEvents: string[]; subscriptions: Hook[]; deliveries: Delivery[] }>({ allowedEvents: [], subscriptions: [], deliveries: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState<Credential | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, w] = await Promise.all([fetch("/api/api-credentials", { cache: "no-store" }), fetch("/api/webhooks", { cache: "no-store" })]);
      const [ab, wb] = await Promise.all([a.json(), w.json()]);
      if (!a.ok) throw new Error(ab.error || "Developer access failed.");
      if (!w.ok) throw new Error(wb.error || "Webhook settings failed.");
      setData(ab);
      setHooks(wb);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Developer access failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const activeCredentials = data.credentials.filter((x: Credential) => !x.revokedAt).length;
  const activeHooks = hooks.subscriptions.filter(x => x.status === "active").length;

  async function mutate(path: string, init: RequestInit, ok: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(path, init), b = await r.json();
      if (!r.ok) throw new Error(b.error || ok);
      if (b.signingSecret) setSecret(b.signingSecret);
      setMessage(ok);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : ok);
    } finally {
      setBusy(false);
    }
  }

  const createCredential = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError(""); setMessage(""); setToken("");
    const f = new FormData(e.currentTarget), scopes = f.getAll("scopes"), ipAllowlist = String(f.get("ipAllowlist") || "").split(/[\s,]+/).filter(Boolean);
    try {
      const r = await fetch("/api/api-credentials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: f.get("name"), expiresAt: f.get("expiresAt") || null, scopes, ipAllowlist }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Credential could not be created.");
      setToken(b.token);
      setMessage("Credential created. Copy it now.");
      e.currentTarget.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Credential failed.");
    } finally {
      setBusy(false);
    }
  };

  const createWebhook = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setError(""); setMessage(""); setSecret("");
    const f = new FormData(e.currentTarget), events = f.getAll("events");
    try {
      const r = await fetch("/api/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: f.get("name"), url: f.get("url"), events }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Webhook could not be created.");
      setSecret(b.signingSecret);
      setMessage("Webhook created. Copy the secret and test it.");
      e.currentTarget.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Webhook failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="pm-state"><i className="pm-spinner" />Preparing developer access...</div>;

  return <>
    <header className="pm-hero dev-hero">
      <div><p className="pm-kicker">{platform.shortName} CONNECT</p><h1>Connect websites with control.</h1><p>Scoped API keys, signed events, delivery tests, failure logs and field mapping.</p></div>
    </header>
    {error && <div className="pm-alert pm-error" role="alert">{error}<button onClick={load}>Retry</button></div>}
    {message && <div className="pm-alert pm-success">{message}</div>}
    {token && <div className="pm-alert dev-secret"><strong>New API secret</strong><input readOnly value={token} onFocus={e => e.currentTarget.select()} /><button className="pm-primary" onClick={() => navigator.clipboard.writeText(token)}>Copy secret</button></div>}
    {secret && <div className="pm-alert dev-secret"><strong>Webhook signing secret</strong><input readOnly value={secret} onFocus={e => e.currentTarget.select()} /><button className="pm-primary" onClick={() => navigator.clipboard.writeText(secret)}>Copy secret</button></div>}
    <section className="pm-metrics">
      <article className="pm-metric"><small>Credentials</small><strong>{activeCredentials}</strong></article>
      <article className="pm-metric"><small>Webhooks</small><strong>{activeHooks}</strong></article>
      <article className="pm-metric"><small>Requests in 24h</small><strong>{data.usage.requests24h || 0}</strong></article>
      <article className={(data.usage.failed24h || 0) ? "pm-metric danger" : "pm-metric"}><small>Failed in 24h</small><strong>{data.usage.failed24h || 0}</strong></article>
    </section>
    <section className="pm-grid">
      <article className="pm-panel">
        <p className="pm-kicker">NEW CONNECTION</p><h2>Create scoped credential</h2>
        <form onSubmit={createCredential}><label>Connection name<input name="name" required maxLength={100} placeholder="WordPress website" /></label><label>Allowed IPs<textarea name="ipAllowlist" rows={2} placeholder="Optional. One IP or prefix per line" /></label><label>Expiry<input name="expiresAt" type="date" /></label><fieldset className="dev-scopes"><legend>Permitted operations</legend>{data.allowedScopes.map((scope: string) => <label key={scope}><input name="scopes" type="checkbox" value={scope} /><span>{scope}</span></label>)}</fieldset><button className="pm-primary" disabled={busy}>{busy ? "Saving..." : "Create credential"}</button></form>
      </article>
      <article className="pm-panel">
        <p className="pm-kicker">SIGNED EVENTS</p><h2>Create webhook</h2>
        <form onSubmit={createWebhook}><label>Name<input name="name" required placeholder="Website cache updater" /></label><label>HTTPS endpoint<input name="url" required inputMode="url" placeholder="https://example.com/estara-webhook" /></label><fieldset className="dev-scopes compact"><legend>Events</legend>{hooks.allowedEvents.map(event => <label key={event}><input name="events" type="checkbox" value={event} /><span>{event}</span></label>)}</fieldset><button className="pm-primary" disabled={busy}>Create webhook</button></form>
      </article>
      <article className="pm-panel pm-wide">
        <div className="pm-heading"><div><p className="pm-kicker">ACTIVE & HISTORIC</p><h2>Credentials</h2></div><span>{activeCredentials} active</span></div>
        {data.credentials.length ? data.credentials.map((x: Credential) => <div className="pm-row" key={x.id}><div><strong>{x.name}</strong><small>{x.keyPrefix}**** · {x.scopes.join(", ")}</small><small>{x.ipAllowlist?.length ? `IPs ${x.ipAllowlist.join(", ")}` : "Any IP"} · rotate by {x.rotationDueAt ? new Date(x.rotationDueAt).toLocaleDateString() : "not set"}</small><small>{x.lastUsedAt ? `Last used ${new Date(x.lastUsedAt).toLocaleString()}` : "Never used"} · created {new Date(x.createdAt).toLocaleDateString()}</small>{pendingRevoke?.id === x.id && <div className="credential-revoke-review"><strong>Revoke {x.name}?</strong><small>Connected software will immediately lose access.</small><button className="pm-secondary" disabled={busy} onClick={() => mutate(`/api/api-credentials?id=${encodeURIComponent(x.id)}`, { method: "DELETE" }, "Credential revoked.")}>Revoke credential</button><button className="pm-secondary" disabled={busy} onClick={() => setPendingRevoke(null)}>Cancel</button></div>}</div><div>{x.revokedAt ? <b>Revoked</b> : <button className="pm-secondary" disabled={busy} onClick={() => setPendingRevoke(x)}>Review revoke</button>}</div></div>) : <div className="pm-empty"><strong>No credentials yet.</strong><span>Create one for each website, CRM or connector.</span></div>}
      </article>
      <article className="pm-panel pm-wide">
        <div className="pm-heading"><div><p className="pm-kicker">WEBHOOKS</p><h2>Delivery control</h2></div><button className="pm-secondary" disabled={busy} onClick={() => mutate("/api/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "retry" }) }, "Due webhook retries processed.")}>Retry due</button></div>
        {hooks.subscriptions.length ? hooks.subscriptions.map(x => <div className="pm-row" key={x.id}><div><strong>{x.name}</strong><small>{x.url}</small><small>{x.events.join(", ")} · {x.status}</small></div><div className="dev-actions"><button className="pm-secondary" disabled={busy || x.status !== "active"} onClick={() => mutate("/api/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "test", id: x.id }) }, "Test webhook sent.")}>Send test</button><button className="pm-secondary" disabled={busy || x.status !== "active"} onClick={() => mutate("/api/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "rotate_secret", id: x.id }) }, "Webhook secret rotated. Copy the new secret.")}>Rotate secret</button><button className="pm-secondary" disabled={busy || x.status !== "active"} onClick={() => mutate(`/api/webhooks?id=${encodeURIComponent(x.id)}`, { method: "DELETE" }, "Webhook disabled.")}>Disable</button></div></div>) : <div className="pm-empty"><strong>No webhooks yet.</strong><span>Add an endpoint to receive property, enquiry and viewing events.</span></div>}
      </article>
      <article className="pm-panel"><p className="pm-kicker">DELIVERIES</p><h2>Webhooks</h2>{hooks.deliveries.length ? hooks.deliveries.slice(0, 8).map(x => <div className="pm-row" key={x.id}><div><strong>{x.eventType} · {x.status}</strong><small>{x.responseStatus || "no response"} · attempt {x.attempts}</small></div><button className="pm-secondary" disabled={busy} onClick={() => mutate("/api/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "replay", deliveryId: x.id }) }, "Webhook delivery replayed.")}>Replay</button></div>) : <div className="pm-empty"><strong>No deliveries yet.</strong><span>Send a test event after creating a webhook.</span></div>}</article>
    </section>
  </>;
}
