"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlatformBrand } from "../components/PlatformToolHeader";

const label = (value: string) => ({
  free: "Free",
  trialing: "Trial",
  pending_payment: "Pending payment",
  pending_manual_review: "Manual review",
  active: "Active",
  past_due: "Past due",
  grace: "Grace period",
  trial_expired: "Trial expired",
  suspended: "Suspended",
  canceled: "Cancelled",
  expired: "Expired",
} as Record<string, string>)[value] || value;
const periodCopy = (plan: any) => plan.state === "trialing" ? "Trial ends" : plan.state === "grace" ? "Grace ends" : plan.state === "active" ? "Renews" : plan.state === "trial_expired" ? "Trial expired" : plan.state === "expired" ? "Expired" : "Current period";
const money = (currency: string, minor: number) => `${currency} ${(Number(minor || 0) / 100).toFixed(2)}`;
const methodType = (value: string) => String(value || "").replaceAll("_", " ");
const methodDetails = (method: any) => [
  method.mobileNumber && ["Send to", method.mobileNumber],
  method.accountNumber && ["Account", method.accountNumber],
  method.merchantNumber && ["Merchant", method.merchantNumber],
  method.accountHolder && ["Account holder", method.accountHolder],
  method.bankName && ["Provider", method.bankName],
  method.referenceInstructions && ["Reference", method.referenceInstructions],
].filter(Boolean) as string[][];

async function parse(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

export default function SubscriptionClient({ platform }: { platform: PlatformBrand }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [proof, setProof] = useState<any>({ paymentRequestId: "", amountPaid: "", transactionReference: "", paymentDate: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);

  const load = () => fetch("/api/subscription").then(parse).then(body => {
    setData(body);
    setSelectedPlan(body.plan?.planVersionId || body.availablePlans?.[0]?.id || "");
    setSelectedMethod(body.paymentMethods?.[0]?.id || "");
  }).catch(reason => setError(reason.message || "Billing information could not be loaded."));

  useEffect(load, []);

  const selected = useMemo(() => data?.availablePlans?.find((plan: any) => plan.id === selectedPlan), [data, selectedPlan]);
  const selectedHasTrial = Boolean(selected?.trialAvailable) && Number(selected?.trialDays || 0) > 0;
  const methods = useMemo(() => !data || !selected ? [] : data.paymentMethods.filter((method: any) => {
    const currencies = Array.isArray(method.currencies) ? method.currencies : [];
    const plans = Array.isArray(method.allowedPlanVersionIds) ? method.allowedPlanVersionIds : [];
    return (!currencies.length || currencies.includes(selected.currency)) && (!plans.length || plans.includes(selected.id));
  }), [data, selected]);

  const requestJson = async (action: string, body: any = {}) => {
    setBusy(action);
    setError("");
    try {
      const result = await fetch("/api/subscription", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...body }) }).then(parse);
      if (result.checkoutUrl) {
        location.href = result.checkoutUrl;
        return;
      }
      if (result.portalUrl) {
        location.href = result.portalUrl;
        return;
      }
      await load();
    } catch (reason: any) {
      setError(reason.message || "Could not update subscription.");
    } finally {
      setBusy("");
    }
  };

  const uploadProof = async (event: any) => {
    event.preventDefault();
    if (!proof.paymentRequestId || !file) return;
    setBusy("proof");
    setError("");
    try {
      const form = new FormData();
      form.set("action", "submit_manual_proof");
      form.set("paymentRequestId", proof.paymentRequestId);
      form.set("amountPaid", proof.amountPaid);
      form.set("transactionReference", proof.transactionReference);
      form.set("paymentDate", proof.paymentDate);
      form.set("notes", proof.notes);
      form.set("proof", file);
      await fetch("/api/subscription", { method: "POST", body: form }).then(parse);
      setProof({ paymentRequestId: "", amountPaid: "", transactionReference: "", paymentDate: "", notes: "" });
      setFile(null);
      await load();
    } catch (reason: any) {
      setError(reason.message || "Proof could not be submitted.");
    } finally {
      setBusy("");
    }
  };

  if (error && !data) return <section className="subscription-empty"><h1>Billing information is unavailable.</h1><p>{error}</p><a href="/workspace">Return to workspace</a></section>;
  if (!data) return <section className="subscription-empty"><h1>Opening plan and billing...</h1></section>;

  const { agency, plan, invoices, paymentRequests } = data;
  const period = plan.trialEndsAt || plan.graceEndsAt || plan.currentPeriodEndsAt || plan.expiredAt;
  const pending = paymentRequests.filter((item: any) => !["approved", "cancelled", "expired"].includes(item.status));
  const canCancel = ["trialing", "active", "past_due", "grace"].includes(plan.state);

  return <>
    <header><div><span>AGENCY SUBSCRIPTION</span><h1>{agency.name}</h1><p>Choose a plan, start an eligible trial, submit payment proof, and keep receipts under one controlled billing record.</p></div><em className={`subscription-${plan.state}`}>{label(plan.state)}</em></header>
    {error && <p className="subscription-alert">{error}</p>}
    <section className="subscription-grid subscription-top-grid">
      <article className="subscription-plan">
        <span>CURRENT PLAN</span><h2>{plan.planName}</h2><strong>{money(plan.currency, plan.priceMinor)}<small>/{plan.billingPeriod || "month"}</small></strong>
        {period && <p>{periodCopy(plan)} {new Date(period).toLocaleDateString()}</p>}
        <div>{Object.entries(plan.entitlements).filter(([, enabled]) => enabled).slice(0, 8).map(([name]) => <span className="enabled" key={name}>✓ {name.replace(/([A-Z])/g, " $1")}</span>)}</div>
        {plan.state === "active" && <button disabled={busy === "create_stripe_portal"} onClick={() => requestJson("create_stripe_portal")}>{busy === "create_stripe_portal" ? "Opening Stripe..." : "Manage Stripe billing"}</button>}
        {canCancel && <button className="subscription-cancel" disabled={busy === "cancel_subscription"} onClick={() => requestJson("cancel_subscription")}>{busy === "cancel_subscription" ? "Cancelling..." : "Cancel subscription"}</button>}
      </article>
      <article className="subscription-limits"><span>USAGE LIMITS</span><h2>Capacity now</h2>{Object.entries(plan.limits).filter(([name]) => name.startsWith("max")).slice(0, 9).map(([name, value]) => <div key={name}><span>{name.replace("max", "").replace(/([A-Z])/g, " $1")}</span><strong>{String(value)}</strong></div>)}<p>Access is enforced by the server. Payment uploads stay pending until finance approves them.</p></article>
    </section>
    <section className="subscription-shop">
      <div><span>AVAILABLE PLANS</span><h2>Choose how your agency pays</h2></div>
      <div className="subscription-plan-options">{data.availablePlans.map((item: any) => <button className={selectedPlan === item.id ? "selected" : ""} key={item.id} onClick={() => { setSelectedPlan(item.id); setSelectedMethod(""); }}><span>{item.featured ? "Recommended" : "Plan"}</span><strong>{item.name}</strong><b>{money(item.currency, item.priceMinor)}<small>/{item.billingPeriod}</small></b><small>{item.description || `${item.trialAvailable && Number(item.trialDays || 0) > 0 ? `${item.trialDays} day trial available` : "No trial"} · version ${item.version}`}</small></button>)}</div>
      {selected && <div className="subscription-checkout"><section className="subscription-action-panel"><span>NEXT STEP</span><h3>{selected.name}</h3><p>{selected.priceMinor === 0 ? "Move to the free plan immediately." : selectedHasTrial ? `Try this plan for ${selected.trialDays} days, or create a payment request now.` : "Create a payment request and submit proof after paying through an approved channel."}</p>{selected.priceMinor === 0 ? <button className="subscription-primary-action" disabled={busy === "start_free"} onClick={() => requestJson("start_free", { planVersionId: selected.id })}>{busy === "start_free" ? "Starting free plan..." : "Start free plan"}</button> : <>{selectedHasTrial && <button className="subscription-secondary-action" disabled={busy === "start_trial"} onClick={() => requestJson("start_trial", { planVersionId: selected.id })}>{busy === "start_trial" ? "Starting trial..." : `Start ${selected.trialDays} day trial`}</button>}<button className="subscription-primary-action" disabled={!selectedMethod || busy === "create_manual_payment"} onClick={() => requestJson("create_manual_payment", { planVersionId: selected.id, paymentMethodId: selectedMethod })}>{busy === "create_manual_payment" ? "Creating payment..." : "Create payment request"}</button></>}</section><section><span>PAYMENT METHOD</span><div className="subscription-methods">{methods.length ? methods.map((method: any) => <button className={selectedMethod === method.id ? "selected" : ""} key={method.id} onClick={() => setSelectedMethod(method.id)}><strong>{method.name}</strong><small>{methodType(method.type)} · {method.currency}</small>{methodDetails(method).length > 0 && <div className="subscription-method-detail">{methodDetails(method).map(([name, value]) => <span key={`${name}-${value}`}><small>{name}</small><b>{value}</b></span>)}</div>}{method.instructions && <p>{method.instructions}</p>}</button>) : <p>No enabled payment method is available for this plan yet.</p>}</div></section></div>}
    </section>
    <section className="subscription-grid">
      <form className="subscription-proof" onSubmit={uploadProof}><span>MANUAL PAYMENT PROOF</span><h2>Submit for review</h2><label>Payment request<select value={proof.paymentRequestId} onChange={event => setProof({ ...proof, paymentRequestId: event.target.value })}><option value="">Choose pending request</option>{pending.map((item: any) => <option value={item.id} key={item.id}>{item.planName} · {item.paymentReference} · {label(item.status)}</option>)}</select></label><label>Amount paid<input value={proof.amountPaid} inputMode="decimal" onChange={event => setProof({ ...proof, amountPaid: event.target.value })} placeholder="49.00" /></label><label>Transaction reference<input value={proof.transactionReference} onChange={event => setProof({ ...proof, transactionReference: event.target.value })} /></label><label>Payment date<input type="date" value={proof.paymentDate} onChange={event => setProof({ ...proof, paymentDate: event.target.value })} /></label><label className="wide">Note<input value={proof.notes} onChange={event => setProof({ ...proof, notes: event.target.value })} /></label><label className="wide">Proof file<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={event => setFile(event.target.files?.[0] || null)} /></label><button disabled={busy === "proof" || !proof.paymentRequestId || !file}>{busy === "proof" ? "Submitting proof..." : "Submit proof for review"}</button></form>
      <section className="subscription-requests"><span>PAYMENT REQUESTS</span><h2>Status trail</h2>{paymentRequests.length ? paymentRequests.map((item: any) => <article key={item.id}><strong>{item.planName}</strong><small>{item.paymentReference} · {item.paymentMethod || item.paymentMethodType} · {label(item.status)}</small><b>{money(item.currency, item.amountDueMinor)}</b>{["awaiting_payment", "rejected", "resubmission_requested"].includes(item.status) && <button onClick={() => requestJson("cancel_payment_request", { id: item.id })}>Cancel request</button>}</article>) : <p>No payment requests yet.</p>}</section>
    </section>
    <section className="subscription-invoices"><div><span>BILLING LEDGER</span><h2>Invoices & receipts</h2></div>{invoices.length ? <div>{invoices.map((invoice: any) => <article key={invoice.id}><span><strong>{invoice.invoiceNumber}</strong><small>Issued {new Date(invoice.issuedAt).toLocaleDateString()} · Due {new Date(invoice.dueAt).toLocaleDateString()}</small></span><b>{money(invoice.currency, invoice.totalMinor)}</b><em>{invoice.status}</em>{invoice.status === "paid" && <small>Receipt {invoice.providerReference}</small>}</article>)}</div> : <p>No invoices have been issued for this agency.</p>}</section>
  </>;
}
