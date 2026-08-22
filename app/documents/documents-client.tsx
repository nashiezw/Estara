"use client";

import { FormEvent, useEffect, useState } from "react";

export default function DocumentsClient() {
  const [docs, setDocs] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [grant, setGrant] = useState<Record<string, string>>({});
  const [pendingRemove, setPendingRemove] = useState("");

  const load = () => fetch("/api/documents").then(r => r.json()).then(j => setDocs(j.documents || []));
  useEffect(() => { load(); }, []);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/documents", { method: "POST", body: new FormData(e.currentTarget) }), j = await r.json();
    setNotice(r.ok ? "Document stored securely." : j.error);
    if (r.ok) {
      e.currentTarget.reset();
      load();
    }
    setBusy(false);
  }

  async function link(id: string) {
    const r = await fetch("/api/documents", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }), j = await r.json();
    if (r.ok) {
      await navigator.clipboard.writeText(location.origin + j.url);
      setNotice("Single-use 15-minute access link copied.");
    } else setNotice(j.error);
  }

  async function allow(id: string) {
    const subjectId = (grant[id] || "").trim();
    if (!subjectId) return setNotice("Enter the member user ID to grant access.");
    const r = await fetch("/api/documents", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "grant", id, subjectType: "user", subjectId, capability: "read" }) }), j = await r.json();
    setNotice(r.ok ? "Restricted access granted and audited." : j.error);
    if (r.ok) load();
  }

  async function remove(id: string) {
    setBusy(true);
    const r = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) {
      setNotice("Document removed.");
      setPendingRemove("");
      load();
    } else setNotice("Document could not be removed.");
    setBusy(false);
  }

  return <main className="tool-page"><a className="back" href="/">Back to workspace</a><section className="tool-hero"><span>Private document vault</span><h1>Records protected by design.</h1><p>Agency-isolated storage, user-level grants, branch-aware access and expiring single-use links.</p></section><form className="upload-card" onSubmit={upload}><label>Document title<input name="title" required minLength={2} placeholder="Signed sole mandate"/></label><label>Category<select name="category"><option>Mandate</option><option>Offer</option><option>Identity</option><option>Contract</option><option>Inspection</option><option>Other</option></select></label><label>Access<select name="accessMode" defaultValue="agency"><option value="agency">Agency members</option><option value="restricted">Restricted - grant explicitly</option></select></label><label>File<input name="file" type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" required/></label><button disabled={busy}>{busy ? "Securing..." : "Secure upload"}</button></form>{notice && <div className="notice" role="status">{notice}</div>}<section className="doc-grid">{docs.map(d => <article key={d.id}><i>{d.mimeType.includes("pdf") ? "PDF" : "FILE"}</i><small>{d.category} · {d.accessMode === "restricted" ? "RESTRICTED" : "AGENCY"}</small><h3>{d.title}</h3><p>{d.originalName} · {(d.byteSize / 1024).toFixed(0)} KB</p>{d.accessMode === "restricted" && <label>Grant member by user ID<input value={grant[d.id] || ""} onChange={e => setGrant({ ...grant, [d.id]: e.target.value })} placeholder="Member user ID"/><button onClick={() => allow(d.id)} type="button">Grant read access</button></label>}{pendingRemove === d.id && <div className="document-remove-review" role="region" aria-label={`Confirm removal for ${d.title}`}><strong>Remove this document?</strong><small>This permanently removes the stored record after the server approves the request.</small><button className="danger" disabled={busy} onClick={() => remove(d.id)}>Remove document</button><button disabled={busy} onClick={() => setPendingRemove("")}>Cancel</button></div>}<footer><button onClick={() => link(d.id)}>Copy secure link</button><button className="danger" onClick={() => setPendingRemove(d.id)}>Review removal</button></footer></article>)}{!docs.length && <p>No private documents are available to you.</p>}</section></main>;
}
