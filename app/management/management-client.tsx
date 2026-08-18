"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
type Item = Record<string, string | number | null>;
type Data = {
    properties: Item[];
    contacts: Item[];
    managedProperties: Item[];
    leases: Item[];
    charges: Item[];
    payments: Item[];
    receipts: Item[];
    deposits: Item[];
    expenses: Item[];
    statements: Item[];
};
const empty: Data = { properties: [], contacts: [], managedProperties: [], leases: [], charges: [], payments: [], receipts: [], deposits: [], expenses: [], statements: [] };
const money = (minor: number | string | null, currency = "USD") => new Intl.NumberFormat("en-ZW", { style: "currency", currency }).format(Number(minor || 0) / 100);
const today = () => new Date().toISOString().slice(0, 10);
export default function ManagementClient() {
    const [data, setData] = useState<Data>(empty), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState("");
    const load = useCallback(async () => { setLoading(true); setError(""); try {
        const response = await fetch("/api/property-management", { cache: "no-store" }), body = await response.json();
        if (!response.ok)
            throw new Error(body.error || "Could not load property management.");
        setData(body);
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load property management.");
    }
    finally {
        setLoading(false);
    } }, []);
    useEffect(() => { void load(); }, [load]);
    const submit = async (event: FormEvent<HTMLFormElement>, action: string) => { event.preventDefault(); setBusy(action); setError(""); setNotice(""); const form = new FormData(event.currentTarget), payload = Object.fromEntries(form.entries()); try {
        const response = await fetch("/api/property-management", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, action }) }), body = await response.json();
        if (!response.ok)
            throw new Error(body.error || "The operation failed.");
        setNotice(action === "record_payment" ? `Payment saved. Receipt ${body.receiptNumber}.` : "Saved successfully.");
        event.currentTarget.reset();
        await load();
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : "The operation failed.");
    }
    finally {
        setBusy("");
    } };
    const totals = useMemo(() => { const due = data.charges.reduce((sum, row) => sum + Number(row.amountMinor) - Number(row.allocatedMinor), 0), collected = data.payments.reduce((sum, row) => sum + Number(row.amountMinor), 0), arrears = data.charges.filter(row => row.status === "overdue").reduce((sum, row) => sum + Number(row.amountMinor) - Number(row.allocatedMinor), 0), expenses = data.expenses.reduce((sum, row) => sum + Number(row.amountMinor), 0); return { due, collected, arrears, net: collected - expenses }; }, [data]);
    if (loading)
        return <main className="pm-shell"><div className="pm-state" role="status"><span className="pm-spinner"/>Preparing your rent desk…</div></main>;
    return <main className="pm-shell"><header className="pm-hero"><div><a href="/workspace" className="pm-back">← Workspace</a><p className="pm-kicker">ESTARA PROPERTY MANAGEMENT</p><h1>Rent operations, without the spreadsheet fog.</h1><p>Leases, collections, deposits and owner reporting in one tenant-safe workspace.</p></div><button className="pm-secondary" onClick={load}>Refresh</button></header>
 {error && <div className="pm-alert pm-error" role="alert"><span>{error}</span><button onClick={load}>Retry</button></div>}{notice && <div className="pm-alert pm-success" role="status">✓ {notice}</div>}
 <section className="pm-metrics" aria-label="Portfolio summary"><Metric label="Outstanding" value={money(totals.due)}/><Metric label="Collected" value={money(totals.collected)}/><Metric label="Arrears" value={money(totals.arrears)} danger/><Metric label="Net cash" value={money(totals.net)}/></section>
 <section className="pm-grid"><div className="pm-panel pm-wide"><div className="pm-heading"><div><p className="pm-kicker">LIVE PORTFOLIO</p><h2>Managed homes & leases</h2></div><span>{data.leases.length} leases</span></div>{data.leases.length ? <div className="pm-list">{data.leases.map(row => <article className="pm-row" key={String(row.id)}><div><strong>{row.property}</strong><small>{row.tenant} · {row.startsAt?.toString().slice(0, 10)} to {row.endsAt?.toString().slice(0, 10)}</small></div><div><strong>{money(row.rentMinor, row.currency as string)}</strong><small>due day {row.dueDay} · {row.status}</small></div></article>)}</div> : <Empty text="Create a managed-property relationship and its first lease."/>}</div>
 <div className="pm-panel"><p className="pm-kicker">SETUP</p><h2>Add managed property</h2><form onSubmit={event => submit(event, "create_management")}><Select name="propertyId" label="Property" items={data.properties} text="title"/><Select name="landlordContactId" label="Landlord" items={data.contacts} text="fullName"/><label>Management fee %<input name="feePercent" type="number" min="0" max="100" step="0.01" defaultValue="8" required/></label><label>Management starts<input name="startsAt" type="date" defaultValue={today()} required/></label><Submit busy={busy === "create_management"}>Start management</Submit></form></div>
 <div className="pm-panel"><p className="pm-kicker">TENANCY</p><h2>Activate lease</h2><form onSubmit={event => submit(event, "create_lease")}><Select name="managedPropertyId" label="Managed property" items={data.managedProperties} text="property"/><Select name="tenantContactId" label="Tenant" items={data.contacts} text="fullName"/><div className="pm-two"><label>Starts<input name="startsAt" type="date" required/></label><label>Ends<input name="endsAt" type="date" required/></label></div><div className="pm-two"><label>Monthly rent<input name="rent" type="number" min="0.01" step="0.01" required/></label><label>Deposit<input name="deposit" type="number" min="0" step="0.01" defaultValue="0"/></label></div><label>Due day<input name="dueDay" type="number" min="1" max="31" defaultValue="1" required/></label><input name="currency" type="hidden" value="USD"/><Submit busy={busy === "create_lease"}>Activate lease</Submit></form></div>
 <div className="pm-panel"><p className="pm-kicker">COLLECTIONS</p><h2>Post monthly rent</h2><form onSubmit={event => submit(event, "generate_rent")}><Select name="leaseId" label="Lease" items={data.leases} text="property"/><label>Rent period<input name="period" type="month" required/></label><Submit busy={busy === "generate_rent"}>Create charge</Submit></form><hr /><h2>Record payment</h2><form onSubmit={event => submit(event, "record_payment")}><Select name="leaseId" label="Lease" items={data.leases} text="property"/><div className="pm-two"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Received<input name="receivedAt" type="date" defaultValue={today()} required/></label></div><label>Method<select name="method" defaultValue="bank_transfer"><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="provider">Payment provider</option></select></label><div className="pm-two"><label>Provider<input name="provider" placeholder="Optional"/></label><label>Provider reference<input name="providerReference" placeholder="Optional"/></label></div><Submit busy={busy === "record_payment"}>Save & issue receipt</Submit></form><hr /><h2>Confirm deposit held</h2><form onSubmit={event => submit(event, "hold_deposit")}><Select name="leaseId" label="Lease" items={data.leases} text="property"/><label>Amount held<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Payment ID (optional)<input name="paymentId" placeholder="Link the receipt payment"/></label><label>Custody note<input name="note" placeholder="Trust account or holding note"/></label><Submit busy={busy === "hold_deposit"}>Confirm deposit</Submit></form></div>
 <div className="pm-panel"><p className="pm-kicker">OWNER ACCOUNT</p><h2>Record expense</h2><form onSubmit={event => submit(event, "record_expense")}><Select name="managedPropertyId" label="Managed property" items={data.managedProperties} text="property"/><label>Category<select name="category"><option>Repairs</option><option>Utilities</option><option>Rates</option><option>Compliance</option><option>Other</option></select></label><label>Description<input name="description" required/></label><div className="pm-two"><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required/></label><label>Incurred<input name="incurredAt" type="date" defaultValue={today()} required/></label></div><Submit busy={busy === "record_expense"}>Record expense</Submit></form><hr /><h2>Finalize statement</h2><form onSubmit={event => submit(event, "finalize_statement")}><Select name="landlordContactId" label="Landlord" items={data.contacts} text="fullName"/><div className="pm-two"><label>From<input name="periodStart" type="date" required/></label><label>To<input name="periodEnd" type="date" required/></label></div><Submit busy={busy === "finalize_statement"}>Lock final statement</Submit></form></div>
 <div className="pm-panel pm-wide"><div className="pm-heading"><div><p className="pm-kicker">RECENT ACTIVITY</p><h2>Money trail</h2></div><button className="pm-secondary" disabled={busy === "process_arrears"} onClick={async () => { setBusy("process_arrears"); setError(""); try {
        const response = await fetch("/api/property-management", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "process_arrears" }) }), body = await response.json();
        if (!response.ok)
            throw new Error(body.error || "Arrears review failed.");
        setNotice(`${body.processed} overdue charge${body.processed === 1 ? "" : "s"} queued for follow-up.`);
        await load();
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : "Arrears review failed.");
    }
    finally {
        setBusy("");
    } }}>Review arrears</button></div><div className="pm-list">{data.payments.slice(0, 8).map(row => <article className="pm-row" key={String(row.id)}><div><strong>Payment received</strong><small>{row.method} · {row.receivedAt?.toString().slice(0, 10)}</small></div><strong className="pm-positive">+{money(row.amountMinor, row.currency as string)}</strong></article>)}{!data.payments.length && <Empty text="Payments and their receipts will appear here."/>}</div></div></section></main>;
}
function Metric({ label, value, danger = false }: {
    label: string;
    value: string;
    danger?: boolean;
}) { return <article className={danger ? "pm-metric danger" : "pm-metric"}><small>{label}</small><strong>{value}</strong></article>; }
function Select({ name, label, items, text }: {
    name: string;
    label: string;
    items: Item[];
    text: string;
}) { return <label>{label}<select name={name} required defaultValue=""><option value="" disabled>Choose…</option>{items.map(item => <option key={String(item.id)} value={String(item.id)}>{String(item[text])}</option>)}</select></label>; }
function Submit({ busy, children }: {
    busy: boolean;
    children: React.ReactNode;
}) { return <button className="pm-primary" disabled={busy}>{busy ? "Saving…" : children}</button>; }
function Empty({ text }: {
    text: string;
}) { return <div className="pm-empty">{text}</div>; }
