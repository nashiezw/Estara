"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PlatformBrand } from "../components/PlatformToolHeader";

type Row = Record<string, any>;

export default function IntegrationsClient({ platform }: { platform: PlatformBrand }) {
  const [data, setData] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preset, setPreset] = useState("wordpress");
  const presets = data?.presets ? Object.entries(data.presets) as [string, Row][] : [];
  const selectedPreset = data?.presets?.[preset];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load integrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function send(body: Row, success: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/integrations", {
        method: body.preset ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(success);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update integration.");
    } finally {
      setBusy(false);
    }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(Object.fromEntries(new FormData(event.currentTarget)), "Connection created for review.");
  }

  function saveMap(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const pairs = String(form.mapping || "").split("\n").map(line => line.split("=").map(value => value.trim())).filter(pair => pair[0] && pair[1]);
    void send({ id, action: "save_field_map", name: form.name, resourceType: form.resourceType, direction: form.direction, mapping: Object.fromEntries(pairs) }, "Field mapping saved.");
  }

  if (loading) return <div className="pm-state"><i className="pm-spinner"/>Preparing governed integrations...</div>;

  return <>
    {error && <div className="pm-alert pm-error" role="alert">{error}<button onClick={load}>Retry</button></div>}
    {message && <div className="pm-alert pm-success">{message}</div>}
    <section className="pm-grid">
      <article className="pm-panel">
        <p className="pm-kicker">DATA BRIDGES</p>
        <h1>{platform.shortName} integrations</h1>
        <form onSubmit={create}>
          <label>Preset<select name="preset" value={preset} onChange={event => setPreset(event.target.value)}>{presets.map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
          {selectedPreset?.provider === "whatsapp_cloud" ? <>
            <label>Phone number ID<input name="phoneNumberId" required autoComplete="off"/></label>
            <label>Business account ID<input name="businessAccountId" autoComplete="off"/></label>
            <p>Use <code>/api/integrations/whatsapp</code> as the Meta callback URL. The platform operator supplies the verify token and app secret as protected environment variables.</p>
          </> : <>
            <label>Pull URL<input name="sourceUrl" type="url"/></label>
            <label>Push URL<input name="destinationUrl" type="url"/></label>
            <label>Bearer token<input name="bearerToken" type="password" autoComplete="new-password"/></label>
          </>}
          <button className="pm-primary" disabled={busy}>{busy ? "Saving..." : "Create for review"}</button>
        </form>
        <p>Website <b>{data.eligibility.website ? "yes" : "no"}</b> · accounting <b>{data.eligibility.accounting ? "yes" : "no"}</b>.</p>
      </article>
      <article className="pm-panel pm-wide">
        <div className="pm-heading"><div><p className="pm-kicker">CONNECTIONS</p><h2>Approved bridges</h2></div><span>{data.connections.filter((row: Row) => row.status === "active").length} active</span></div>
        {data.connections.length ? data.connections.map((connection: Row) => {
          const definition = presets.find(([, value]) => value.provider === connection.provider)?.[1];
          const messaging = connection.provider === "whatsapp_cloud";
          return <div className="pm-row" key={connection.id}>
            <div><strong>{connection.kind.replaceAll("_", " ")} · {connection.provider}</strong><small>{connection.status} · {connection.lastSyncAt ? `last sync ${new Date(connection.lastSyncAt).toLocaleString()}` : messaging ? `phone ID ${connection.configuration.phoneNumberId || "not set"}` : "never synced"}</small></div>
            <div>
              {connection.status === "pending" && <button className="pm-primary" disabled={busy} onClick={() => send({ id: connection.id, action: "approve" }, "Connection approved.")}>Approve</button>}
              {connection.status === "active" && <>
                {definition?.directions?.includes("push") && definition?.resources?.includes("properties") && <button className="pm-secondary" disabled={busy} onClick={() => send({ id: connection.id, action: "sync", direction: "push", resourceType: "properties" }, "Push sync completed.")}>Push properties</button>}
                {definition?.directions?.includes("pull") && definition?.resources?.includes("contacts") && <button className="pm-secondary" disabled={busy} onClick={() => send({ id: connection.id, action: "sync", direction: "pull", resourceType: "contacts" }, "Pull sync completed.")}>Pull contacts</button>}
                <button className="pm-secondary" disabled={busy} onClick={() => send({ id: connection.id, action: "disable" }, "Connection disabled.")}>Disable</button>
              </>}
            </div>
            {!messaging && <form onSubmit={event => saveMap(event, connection.id)}>
              <label>Name<input name="name"/></label>
              <label>Resource<select name="resourceType"><option>contacts</option><option>properties</option><option>enquiries</option><option>viewings</option></select></label>
              <label>Direction<select name="direction"><option>pull</option><option>push</option></select></label>
              <label>Mapping<textarea name="mapping" placeholder={"fullName=name\nemail=email\nphone=phone"} rows={3}/></label>
              <button className="pm-secondary" disabled={busy}>Save map</button>
            </form>}
          </div>;
        }) : <div className="pm-empty"><strong>No integration connections yet.</strong><span>Create a bridge, then approve it.</span></div>}
      </article>
    </section>
  </>;
}
