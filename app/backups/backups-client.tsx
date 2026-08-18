"use client";
import { useEffect, useState } from "react";
export default function BackupsClient() { const [rows, setRows] = useState<any[]>([]), [policy, setPolicy] = useState<any>(), [notice, setNotice] = useState("Loading encrypted backup status…"), [busy, setBusy] = useState(false); async function load() { try {
    const r = await fetch("/api/backups"), j = await r.json();
    if (!r.ok)
        throw new Error(j.error);
    setRows(j.snapshots || []);
    setPolicy(j.policy);
    setNotice("Backup status is current.");
}
catch (e) {
    setNotice(e instanceof Error ? `${e.message} Retry when ready.` : "Backup status could not be loaded. Retry when ready.");
} } useEffect(() => { load(); }, []); async function create() { setBusy(true); setNotice("Encrypting a new tenant-isolated snapshot…"); try {
    const r = await fetch("/api/backups", { method: "POST" }), j = await r.json();
    if (!r.ok)
        throw new Error(j.error);
    setNotice("Encrypted snapshot completed and verified.");
    await load();
}
catch (e) {
    setNotice(e instanceof Error ? `${e.message} Retry the backup.` : "Backup failed. Retry the backup.");
}
finally {
    setBusy(false);
} }async function verify(){setBusy(true);setNotice("Decrypting the latest snapshot in an isolated recovery drill…");try{const r=await fetch("/api/backups",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"verify"})}),j=await r.json();if(!r.ok)throw new Error(j.error);setNotice(`Recovery drill passed: ${j.drill.recordCount} records across ${j.drill.tableCount} tables.`)}catch(e){setNotice(e instanceof Error?`${e.message} Retry the recovery drill.`:"Recovery drill failed. Retry when ready.")}finally{setBusy(false)}} return <main className="tool-page"><a className="back" href="/">← Workspace</a><section className="tool-hero"><span>Recovery controls</span><h1>Encrypted agency backups.</h1><p>Daily AES-256-GCM snapshots are isolated by agency, integrity-checked, retained for 35 days and recorded in the audit trail.</p></section><div className="notice" role="status">{notice}</div><section className="upload-card"><h2>Protection policy</h2><p>{policy ? `${policy.frequency} · ${policy.encryption} · ${policy.retentionDays}-day retention` : "Loading policy…"}</p><button disabled={busy} onClick={create}>{busy ? "Working…" : "Create verified snapshot now"}</button><button disabled={busy||!rows.some(x=>x.status==="complete")} onClick={verify}>Run non-destructive recovery drill</button></section><section className="doc-grid">{rows.map(x => <article key={x.id}><small>{String(x.status).toUpperCase()}</small><h3>{x.completedAt ? new Date(x.completedAt).toLocaleString() : "Backup in progress"}</h3><p>{x.encryptedBytes ? `${Math.ceil(x.encryptedBytes / 1024)} KB encrypted` : x.failureReason || "Preparing snapshot"}</p><code>{x.checksum ? `${x.checksum.slice(0, 18)}…` : "Integrity check pending"}</code></article>)}{!rows.length && <p>No snapshots yet. ESTARA will create the first encrypted snapshot automatically.</p>}</section></main>; }
