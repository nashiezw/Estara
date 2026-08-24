"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PlatformBrand } from "../components/PlatformToolHeader";

type Credential = { id: string; name: string; keyPrefix: string; scopes: string[]; expiresAt?: string | null; lastUsedAt?: string | null; revokedAt?: string | null; createdAt: string };

export default function DeveloperClient({ platform }: { platform: PlatformBrand }) {
  const [data, setData] = useState<{ allowedScopes: string[]; credentials: Credential[] }>({ allowedScopes: [], credentials: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState<Credential | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/api-credentials", { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Developer access could not be loaded.");
      setData(b);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Developer access could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setToken("");
    const f = new FormData(e.currentTarget), scopes = f.getAll("scopes");
    try {
      const r = await fetch("/api/api-credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: f.get("name"), expiresAt: f.get("expiresAt") || null, scopes }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Credential could not be created.");
      setToken(b.token);
      setMessage(`Credential created. Copy it now; ${platform.shortName} stores only its secure hash.`);
      e.currentTarget.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Credential could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/api-credentials?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setPendingRevoke(null);
      setMessage("Credential revoked.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Credential could not be revoked.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="pm-state"><i className="pm-spinner"/>Preparing secure developer access...</div>;
  return <><header className="pm-hero"><div><p className="pm-kicker">SCOPED PUBLIC API</p><h1>Connect without surrendering control.</h1><p>Create revocable, least-privilege credentials. Secrets are shown once, hashed at rest, rate limited and logged.</p></div></header>{error && <div className="pm-alert pm-error" role="alert">{error}<button onClick={load}>Retry</button></div>}{message && <div className="pm-alert pm-success">{message}</div>}{token && <div className="pm-alert" style={{ background: "#fff4cf", display: "grid" }}><strong>Copy this secret now. It cannot be recovered.</strong><input readOnly value={token} onFocus={e => e.currentTarget.select()} aria-label="New API secret"/><button className="pm-primary" onClick={() => navigator.clipboard.writeText(token)}>Copy secret</button></div>}<section className="pm-grid"><article className="pm-panel"><p className="pm-kicker">NEW CONNECTION</p><h2>Create scoped credential</h2><form onSubmit={create}><label>Connection name<input name="name" required maxLength={100} placeholder="Website lead importer"/></label><label>Expiry (maximum one year)<input name="expiresAt" type="date"/></label><fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}><legend style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>PERMITTED OPERATIONS</legend>{data.allowedScopes.map(scope => <label key={scope} style={{ display: "flex", alignItems: "center", gap: 9 }}><input name="scopes" type="checkbox" value={scope} style={{ width: 18, minHeight: 18 }}/>{scope}</label>)}</fieldset><button className="pm-primary" disabled={busy}>{busy ? "Creating securely..." : "Create credential"}</button></form></article><article className="pm-panel"><p className="pm-kicker">QUICK START</p><h2>Version 1 endpoints</h2><p><b>Properties</b><br/><code>GET /api/v1/properties</code>, <code>POST /api/v1/properties</code>, <code>PATCH /api/v1/properties/:id</code> and <code>POST /api/v1/properties/:id/media</code>.</p><p><b>Demand</b><br/><code>GET/POST /api/v1/enquiries</code>, <code>GET/POST /api/v1/viewings</code>, <code>PATCH /api/v1/viewings/:id</code> and <code>POST /api/v1/bookings</code>.</p><p><b>Webhooks</b><br/><code>GET/POST/DELETE /api/v1/webhooks</code> sends signed events for property, enquiry and viewing changes.</p><pre style={{ whiteSpace: "pre-wrap", background: "#123b33", color: "#eaf3ee", padding: 16, borderRadius: 14, overflow: "auto" }}>{`Authorization: Bearer est_live_...\nContent-Type: application/json\nIdempotency-Key: your-unique-request-id`}</pre><p>Responses never expose owner details, private notes, documents or internal commissions.</p></article><article className="pm-panel pm-wide"><div className="pm-heading"><div><p className="pm-kicker">ACTIVE & HISTORIC</p><h2>Credentials</h2></div><span>{data.credentials.filter(x => !x.revokedAt).length} active</span></div>{data.credentials.length ? data.credentials.map(x => <div className="pm-row" key={x.id}><div><strong>{x.name}</strong><small>{x.keyPrefix}**** · {x.scopes.join(", ")}</small><small>Created {new Date(x.createdAt).toLocaleDateString()}{x.lastUsedAt ? ` · last used ${new Date(x.lastUsedAt).toLocaleString()}` : " · never used"}</small>{pendingRevoke?.id === x.id && <div className="credential-revoke-review" role="region" aria-label={`Confirm revoke for ${x.name}`}><strong>Revoke {x.name}?</strong><small>Connected software will immediately lose access. This cannot reveal the secret again.</small><button className="pm-secondary" disabled={busy} onClick={() => revoke(x.id)}>Revoke credential</button><button className="pm-secondary" disabled={busy} onClick={() => setPendingRevoke(null)}>Cancel</button></div>}</div><div>{x.revokedAt ? <b>Revoked</b> : <button className="pm-secondary" disabled={busy} onClick={() => setPendingRevoke(x)}>Review revoke</button>}</div></div>) : <div className="pm-empty">No API credentials yet.</div>}</article></section></>;
}
