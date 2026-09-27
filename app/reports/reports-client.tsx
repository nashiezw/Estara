"use client";

import { useEffect, useState } from "react";

const money = (minor: number) => `USD ${(Number(minor || 0) / 100).toLocaleString()}`;
const metric = (value: number | null, suffix = "") => value === null ? "No data" : `${value}${suffix}`;

export default function ReportsClient({ platform }: { platform: { shortName: string } }) {
  const [data, setData] = useState<any>(null);
  const [pilot, setPilot] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }),
      fetch("/api/pilot-scorecard").then(async response => response.ok ? response.json() : null),
    ]).then(([reports, scorecard]) => { setData(reports); setPilot(scorecard); }).catch(cause => setError(cause.message));
  }, []);

  if (error) return <main className="report-empty"><h1>Business reports are unavailable.</h1><p>{error}</p></main>;
  if (!data) return <main className="report-empty"><h1>Preparing verified business reports...</h1></main>;

  const pilotMetrics = pilot ? [
    ["Answer rate", `${pilot.currentPeriod.answerRate}%`, `${pilot.baselinePeriod.answerRate}%`],
    ["Median response", metric(pilot.currentPeriod.medianResponseMinutes, " min"), metric(pilot.baselinePeriod.medianResponseMinutes, " min")],
    ["Follow-up completion", `${pilot.currentPeriod.followUpCompletionRate}%`, `${pilot.baselinePeriod.followUpCompletionRate}%`],
    ["Enquiry to viewing", `${pilot.currentPeriod.enquiryToViewingRate}%`, `${pilot.baselinePeriod.enquiryToViewingRate}%`],
    ["Enquiry to offer", `${pilot.currentPeriod.enquiryToOfferRate}%`, `${pilot.baselinePeriod.enquiryToOfferRate}%`],
    ["Won deals", pilot.currentPeriod.wonDeals, pilot.baselinePeriod.wonDeals],
    ["WhatsApp share", `${pilot.currentPeriod.whatsappShare}%`, `${pilot.baselinePeriod.whatsappShare}%`],
    ["Seller report approval", metric(pilot.currentPeriod.medianSellerReportApprovalMinutes, " min"), metric(pilot.baselinePeriod.medianSellerReportApprovalMinutes, " min")],
  ] : [];

  return <main className="report-page">
    <nav><a href="/deals">Deal desk</a><strong>{platform.shortName} <small>Business intelligence</small></strong><a href="/workspace">Workspace</a></nav>
    <header><span>VERIFIED BUSINESS PERFORMANCE</span><h1>Know what is moving, who is converting and what is likely to close.</h1><div><article><small>WEIGHTED PIPELINE</small><strong>{money(data.totals.projectedMinor)}</strong></article><article><small>WON COMMISSION</small><strong>{money(data.totals.commissionMinor)}</strong></article><article><small>30-DAY ENQUIRIES</small><strong>{data.activity.enquiries}</strong></article><article><small>30-DAY VIEWINGS</small><strong>{data.activity.viewings}</strong></article></div></header>
    {pilot && <section className="report-card pilot-scorecard">
      <div className="pilot-scorecard-title"><div><span>PILOT EVIDENCE</span><h2>Current 30 days against baseline</h2><p>Operational outcomes calculated from live enquiry, action, viewing, offer, deal and seller-report records.</p></div><a href="/api/pilot-scorecard?export=csv">Export scorecard CSV</a></div>
      <div className="pilot-scorecard-head"><span>Metric</span><span>Current</span><span>Baseline</span></div>
      {pilotMetrics.map(([label, current, baseline]) => <article key={String(label)}><strong>{label}</strong><b>{current}</b><span>{baseline}</span></article>)}
    </section>}
    <section className="report-grid">
      <div className="report-card"><h2>Deal pipeline</h2>{data.pipeline.map((row: any) => <article key={row.id}><span><strong>{row.name}</strong><small>{row.dealCount} deals · {row.probability}% probability</small></span><b>{money(row.valueMinor)}</b></article>)}</div>
      <div className="report-card"><h2>Agent performance</h2>{data.agents.map((row: any) => <article key={row.userId}><span><strong>{row.email}</strong><small>{row.deals} created deals · {money(row.commissionMinor)} commission</small></span><b>{money(row.wonValueMinor)}</b></article>)}</div>
      <div className="report-card"><h2>Branch portfolio</h2>{data.branches.map((row: any) => <article key={row.branch}><span><strong>{row.branch}</strong><small>{row.properties} properties</small></span><b>{row.enquiries} enquiries · {row.deals} deals</b></article>)}</div>
      <div className="report-card report-exports"><h2>Authorized exports</h2><p>CSV values are protected against spreadsheet formula injection and every export is recorded in the audit trail.</p>{["deals", "properties", "contacts"].map(type => <a href={`/api/reports?export=${type}`} key={type}>Export {type} CSV</a>)}</div>
    </section>
  </main>;
}
