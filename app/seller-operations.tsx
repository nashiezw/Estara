"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SellerProperty = { id: string | number; title: string };
type SellerData = {
  properties: SellerProperty[];
  grants: any[];
  reports: any[];
  offers: any[];
  documents: any[];
  schedules: any[];
  deliveries: any[];
  mandates: any[];
};

const emptyData = (properties: SellerProperty[]): SellerData => ({
  properties,
  grants: [],
  reports: [],
  offers: [],
  documents: [],
  schedules: [],
  deliveries: [],
  mandates: [],
});

export default function SellerOperations({
  properties,
  notify,
}: {
  properties: SellerProperty[];
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<SellerData>(() => emptyData(properties));
  const [busy, setBusy] = useState(false);
  const [propertyId, setPropertyId] = useState(String(properties[0]?.id || ""));
  const [sellerEmail, setSellerEmail] = useState("");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("fortnightly");

  const liveProperties = useMemo(
    () => (data.properties.length ? data.properties : properties),
    [data.properties, properties],
  );
  const selectedPropertyId = propertyId || String(liveProperties[0]?.id || "");
  const hasProperty = Boolean(selectedPropertyId);

  const load = async () => {
    const response = await fetch("/api/seller-management");
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    setData({
      ...emptyData(properties),
      ...body,
      properties: body.properties || properties,
    });
  };

  useEffect(() => {
    load().catch(() => notify("Seller centre could not be loaded."));
  }, []);

  useEffect(() => {
    if (!liveProperties.length) return;
    setPropertyId((current) =>
      liveProperties.some((p) => String(p.id) === current) ? current : String(liveProperties[0].id),
    );
  }, [liveProperties]);

  const act = async (action: string, payload: Record<string, any> = {}, patch = false) => {
    if (!hasProperty) {
      notify("Add or choose a property before running this seller workflow.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/seller-management", {
        method: patch ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, propertyId: selectedPropertyId, ...payload }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.grant?.acceptPath) {
        await navigator.clipboard?.writeText(new URL(body.grant.acceptPath, location.href).href);
        notify("Secure invitation copied.");
      } else {
        notify("Seller workflow updated.");
      }
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Seller action failed.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent, action: string, payload: Record<string, any>) => {
    event.preventDefault();
    act(action, payload);
  };

  return (
    <div className="page seller-admin-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRUSTED SELLER EXPERIENCE</span>
          <h1>Seller centre</h1>
          <p>Reports, offers, mandates, approved documents and delivery tracking in one secure workflow.</p>
        </div>
        <a className="primary seller-open" href="/seller" target="_blank" rel="noreferrer">
          Open seller portal
        </a>
      </div>

      <section className="seller-admin-hero">
        <div>
          <span>PROPERTY COMMAND</span>
          <h2>Keep sellers informed with verified, agency-approved facts.</h2>
          <p>Every access, approval, offer transition and delivery is tenant-scoped and audited.</p>
        </div>
        <label>
          Working property
          <select value={selectedPropertyId} onChange={(event) => setPropertyId(event.target.value)} disabled={!liveProperties.length}>
            {!liveProperties.length && <option value="">No properties available</option>}
            {liveProperties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!liveProperties.length && (
        <section className="panel seller-empty-state">
          <h2>No properties are ready for seller workflows.</h2>
          <p>Create a property first, then return here to invite sellers, publish reports and track offers.</p>
        </section>
      )}

      <div className="seller-admin-grid">
        <section className="panel seller-panel">
          <div className="panel-head compact">
            <div>
              <span className="eyebrow">ACCESS</span>
              <h2>Seller access</h2>
            </div>
          </div>
          <form onSubmit={(event) => submit(event, "invite", { email: sellerEmail })}>
            <label>
              Seller email
              <input
                required
                type="email"
                value={sellerEmail}
                onChange={(event) => {
                  const next = event.target.value;
                  setSellerEmail(next);
                  if (!scheduleEmail) setScheduleEmail(next);
                }}
                placeholder="seller@example.com"
              />
            </label>
            <button className="primary" disabled={busy || !hasProperty}>
              Create secure invitation
            </button>
          </form>
          <form onSubmit={(event) => submit(event, "create_schedule", { email: scheduleEmail || sellerEmail, frequency })}>
            <label>
              Report recipient
              <input
                required
                type="email"
                value={scheduleEmail}
                onChange={(event) => setScheduleEmail(event.target.value)}
                placeholder={sellerEmail || "seller@example.com"}
              />
            </label>
            <label>
              Report rhythm
              <select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <button className="outline" disabled={busy || !hasProperty}>
              Save schedule
            </button>
          </form>
          <div className="seller-stack">
            {data.schedules.map((schedule) => (
              <article className="seller-admin-row" key={schedule.id}>
                <span>
                  <strong>{schedule.frequency}</strong>
                  <small>
                    {schedule.recipientEmail} · next draft {new Date(schedule.nextRunAt).toLocaleDateString()}
                  </small>
                </span>
              </article>
            ))}
            {!data.schedules.length && <p className="empty-state">No report schedule has been created for this property.</p>}
          </div>
        </section>

        <section className="panel seller-panel seller-report-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">REPORTS</span>
              <h2>Review & publish</h2>
            </div>
            <button className="outline" disabled={busy || !hasProperty} onClick={() => act("create_report", { frequency })}>
              Draft now
            </button>
          </div>
          {data.reports.map((report) => (
            <article className="seller-report-row" key={report.id}>
              <div>
                <strong>
                  {report.property} · {report.momentum}
                </strong>
                <small>
                  {report.views} views · {report.enquiries} enquiries · {report.viewings} viewings · {report.offers} offers
                </small>
              </div>
              <p>{report.summary}</p>
              <footer>
                <em>{report.status}</em>
                {report.status === "draft" ? (
                  <button className="primary" disabled={busy} onClick={() => act("approve_report", { id: report.id }, true)}>
                    Approve & create PDF
                  </button>
                ) : (
                  report.hasPdf && <a href={`/api/seller-report-pdf?id=${report.id}`}>PDF</a>
                )}
              </footer>
            </article>
          ))}
          {!data.reports.length && <p className="empty-state">No seller reports yet. Draft one when the seller needs an update.</p>}
        </section>

        <section className="panel seller-panel">
          <div className="panel-head compact">
            <div>
              <span className="eyebrow">OFFERS</span>
              <h2>Offer desk</h2>
            </div>
          </div>
          <form onSubmit={(event) => submit(event, "create_offer", { amount, currency: "USD" })}>
            <label>
              Offer amount (USD)
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="125000"
              />
            </label>
            <button className="primary" disabled={busy || !hasProperty}>
              Record submitted offer
            </button>
          </form>
          <div className="seller-stack">
            {data.offers.map((offer) => (
              <div className="seller-admin-row" key={offer.id}>
                <span>
                  <strong>
                    {offer.currency} {(offer.amountMinor / 100).toLocaleString()}
                  </strong>
                  <small>
                    {offer.property} · {offer.status}
                  </small>
                </span>
                {offer.status === "submitted" && (
                  <>
                    <button className="outline" onClick={() => act("offer_status", { id: offer.id, status: "accepted" }, true)}>
                      Accept
                    </button>
                    <button className="outline" onClick={() => act("offer_status", { id: offer.id, status: "rejected" }, true)}>
                      Reject
                    </button>
                  </>
                )}
              </div>
            ))}
            {!data.offers.length && <p className="empty-state">Submitted offers will appear here for a clear accept or reject decision.</p>}
          </div>
        </section>

        <section className="panel seller-panel">
          <div className="panel-head compact">
            <div>
              <span className="eyebrow">COMPLIANCE</span>
              <h2>Mandates & documents</h2>
            </div>
          </div>
          <div className="seller-stack">
            {data.mandates.map((mandate) => (
              <p key={mandate.id}>
                <strong>
                  {mandate.property} · {mandate.type}
                </strong>
                <br />
                <small>
                  {mandate.status} · expires {new Date(mandate.expiresAt).toLocaleDateString()}
                </small>
              </p>
            ))}
            {data.documents.map((document) => (
              <div className="seller-admin-row" key={document.id}>
                <span>
                  <strong>{document.title}</strong>
                  <small>
                    {document.property} · {document.category}
                  </small>
                </span>
                {!document.sellerVisible ? (
                  <button className="outline" onClick={() => act("approve_document", { id: document.id }, true)}>
                    Approve for seller
                  </button>
                ) : (
                  <em className="accepted">Shared</em>
                )}
              </div>
            ))}
            {!data.mandates.length && !data.documents.length && (
              <p className="empty-state">Approved mandates and seller-visible documents will collect here.</p>
            )}
          </div>
        </section>

        <section className="panel seller-panel">
          <div className="panel-head compact">
            <div>
              <span className="eyebrow">DELIVERY</span>
              <h2>Delivery ledger</h2>
            </div>
          </div>
          <div className="seller-stack">
            {data.deliveries.length ? (
              data.deliveries.map((delivery) => (
                <p key={delivery.id}>
                  <strong>
                    {delivery.channel} · {delivery.status}
                  </strong>{" "}
                  <small>
                    {delivery.recipientEmail}
                    {delivery.lastError ? ` · ${delivery.lastError}` : ""}
                  </small>
                </p>
              ))
            ) : (
              <p className="empty-state">Approvals will create tracked portal and email delivery records.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
