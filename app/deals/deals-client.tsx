"use client";

import { FormEvent, useEffect, useState } from "react";

const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 16);

export default function DealsClient({ platform }: { platform: { shortName: string } }) {
  const [data, setData] = useState<any>({ stages: [], deals: [], properties: [], contacts: [], members: [], splits: [] });
  const [form, setForm] = useState({
    title: "",
    propertyId: "",
    contactId: "",
    stageId: "",
    value: "",
    currency: "USD",
    commissionPercent: "3",
    expectedCloseAt: "",
    nextAction: "Confirm transaction documents",
    dueAt: tomorrow(),
  });
  const [transition, setTransition] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const r = await fetch("/api/deals");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
    setForm((x: any) => ({
      ...x,
      propertyId: x.propertyId || d.properties[0]?.id || "",
      contactId: x.contactId || d.contacts[0]?.id || "",
      stageId: x.stageId || d.stages.find((s: any) => s.outcome === "open")?.id || "",
    }));
  };

  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  const call = async (method: string, body: any) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const r = await fetch("/api/deals", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage("Deal workflow updated and audited.");
      setTransition(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deal action failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    call("POST", { action: "create_deal", ...form });
  };

  const startMove = (deal: any, stageId: string) => {
    const stage = data.stages.find((x: any) => x.id === stageId);
    if (!stage || stageId === deal.stageId) return;
    setTransition({
      deal,
      stageId,
      stageName: stage.name,
      outcome: stage.outcome,
      nextAction: stage.outcome === "open" ? "Follow up on deal conditions" : "",
      dueAt: stage.outcome === "open" ? tomorrow() : "",
      lostReason: "",
    });
  };

  const confirmMove = () => {
    if (!transition) return;
    call("PATCH", {
      id: transition.deal.id,
      stageId: transition.stageId,
      nextAction: transition.outcome === "open" ? transition.nextAction : "",
      dueAt: transition.outcome === "open" ? transition.dueAt : "",
      lostReason: transition.outcome === "lost" ? transition.lostReason : "",
    });
  };

  const split = (deal: any) => {
    if (!data.members.length) return;
    const percent = 100 / data.members.length;
    call("POST", {
      action: "finalize_splits",
      dealId: deal.id,
      splits: data.members.map((m: any, i: number) => ({
        userId: m.userId,
        percent: i === data.members.length - 1 ? 100 - Math.round(percent * (data.members.length - 1) * 100) / 100 : Math.round(percent * 100) / 100,
      })),
    });
  };

  return <main className="deal-page"><nav><a href="/workspace">← Workspace</a><strong>{platform.shortName} <small>Deal desk</small></strong><a href="/reports">Business reports →</a></nav><header><div><span>REVENUE EXECUTION</span><h1>Every deal has a stage, value and next action.</h1><p>Move transactions through a configurable pipeline, close the loop on activity and finalize commission splits without floating-point money errors.</p></div><aside><strong>{data.deals.filter((x: any) => x.status === "open").length}</strong><small>open deals</small><strong>{data.deals.filter((x: any) => x.status === "won").length}</strong><small>closed won</small></aside></header>{error && <p className="deal-error" role="alert">{error}</p>}{message && <p className="deal-message" role="status">{message}</p>}{!data.stages.length ? <section className="deal-setup"><h2>Configure your deal pipeline</h2><p>Start with a proven five-stage workflow, then add agency-specific stages.</p><button disabled={busy} onClick={() => call("POST", { action: "seed_stages" })}>Create default stages</button></section> : <><section className="deal-create"><form onSubmit={save}><span>NEW DEAL</span><h2>Open a transaction</h2><label>Deal title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Moyo purchase · Borrowdale"/></label><div><label>Property<select required value={form.propertyId} onChange={e => setForm({ ...form, propertyId: e.target.value })}>{data.properties.map((x: any) => <option value={x.id} key={x.id}>{x.title}</option>)}</select></label><label>Client<select required value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}>{data.contacts.map((x: any) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label>Opening stage<select required value={form.stageId} onChange={e => setForm({ ...form, stageId: e.target.value })}>{data.stages.filter((x: any) => x.outcome === "open").map((x: any) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label></div><div><label>Deal value<input required type="number" inputMode="decimal" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}/></label><label>Commission %<input required type="number" step="0.01" min="0" max="100" value={form.commissionPercent} onChange={e => setForm({ ...form, commissionPercent: e.target.value })}/></label><label>Expected close<input type="date" value={form.expectedCloseAt} onChange={e => setForm({ ...form, expectedCloseAt: e.target.value })}/></label></div><div><label>Required next action<input required value={form.nextAction} onChange={e => setForm({ ...form, nextAction: e.target.value })}/></label><label>Due<input required type="datetime-local" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })}/></label></div><button disabled={busy}>Open deal</button></form></section><section className="deal-board">{data.stages.map((stage: any) => <div className="deal-column" key={stage.id}><header><strong>{stage.name}</strong><small>{stage.probability}% probability · {stage.outcome}</small></header>{data.deals.filter((x: any) => x.stageId === stage.id).map((deal: any) => <article key={deal.id}><span>{deal.currency} {(deal.valueMinor / 100).toLocaleString()}</span><h2>{deal.title}</h2><p>{deal.property}<br/>{deal.contact}</p><small>{deal.openActions} open next action{deal.openActions === 1 ? "" : "s"}</small>{deal.status === "open" && <select aria-label={`Move ${deal.title}`} value={transition?.deal.id === deal.id ? transition.stageId : deal.stageId} onChange={e => startMove(deal, e.target.value)}>{data.stages.map((x: any) => <option value={x.id} key={x.id}>{x.name}</option>)}</select>}{transition?.deal.id === deal.id && <div className="deal-transition" role="region" aria-label={`Confirm move for ${deal.title}`}><strong>Move to {transition.stageName}</strong>{transition.outcome === "open" && <><label>Required next action<input required value={transition.nextAction} onChange={e => setTransition({ ...transition, nextAction: e.target.value })}/></label><label>Due<input required type="datetime-local" value={transition.dueAt} onChange={e => setTransition({ ...transition, dueAt: e.target.value })}/></label></>}{transition.outcome === "lost" && <label>Lost reason<textarea required value={transition.lostReason} onChange={e => setTransition({ ...transition, lostReason: e.target.value })}/></label>}<footer><button type="button" className="deal-secondary" disabled={busy} onClick={() => setTransition(null)}>Cancel</button><button type="button" disabled={busy || (transition.outcome === "open" && (!transition.nextAction || !transition.dueAt)) || (transition.outcome === "lost" && !transition.lostReason)} onClick={confirmMove}>Confirm move</button></footer></div>}{deal.status === "won" && !data.splits.some((x: any) => x.dealId === deal.id) && <button onClick={() => split(deal)}>Finalize equal commission split</button>}{data.splits.filter((x: any) => x.dealId === deal.id).map((x: any) => <small key={x.id}>{x.email}: {(x.basisPoints / 100).toFixed(2)}% · {deal.currency} {(x.amountMinor / 100).toLocaleString()}</small>)}</article>)}</div>)}</section></>}</main>;
}
