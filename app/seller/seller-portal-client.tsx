"use client";

import { useEffect, useState } from "react";

type Report = {
  id: string;
  periodStart: string;
  periodEnd: string;
  views: number;
  enquiries: number;
  viewings: number;
  offers: number;
  momentum: string;
  summary: string;
  feedbackSummary: string;
  recommendedAction: string;
  approvedAt: string;
  hasPdf: boolean;
};

type Property = {
  grantId: string;
  propertyId: string;
  title: string;
  location: string;
  ref: string;
  status: string;
  agency: string;
  heroUrl: string | null;
  momentum: string;
  metrics: { views: number; enquiries: number; viewings: number; offers: number };
  reports: Report[];
  documents: { id: string; title: string; category: string; downloadUrl: string }[];
  mandates: { type: string; expiresAt: string; status: string }[];
  offers: { amountMinor: number; currency: string; status: string; submittedAt: string }[];
};

export default function SellerPortalClient({ displayName, token }: { displayName: string; token: string }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [platform, setPlatform] = useState({ shortName: "Platform" });
  const [selected, setSelected] = useState(0);
  const [state, setState] = useState(token ? "accepting" : "loading");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/seller-portal");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Seller portal could not be loaded.");
    setPlatform(data.platform || { shortName: "Platform" });
    setProperties(data.properties || []);
    setState("ready");
  };

  useEffect(() => {
    (async () => {
      try {
        if (token) {
          const response = await fetch("/api/seller-portal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Invitation could not be accepted.");
          history.replaceState({}, "", "/seller");
        }
        await load();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Seller portal could not be loaded.");
        setState("error");
      }
    })();
  }, [token]);

  const property = properties[selected];
  const report = property?.reports?.[0];
  const mandate = property?.mandates?.[0];

  return <main className="seller-public">
    <header>
      <div className="seller-wordmark"><i>{platform.shortName.slice(0, 2).toUpperCase()}</i><span><strong>{platform.shortName}</strong><small>Seller experience</small></span></div>
      <div><span>Welcome, {displayName}</span><a href="/signout-with-chatgpt?return_to=/seller">Sign out</a></div>
    </header>
    {state === "accepting" || state === "loading" ? <section className="seller-loading"><i /><h1>{state === "accepting" ? "Securing your property access…" : "Preparing your seller updates…"}</h1></section>
      : state === "error" ? <section className="seller-empty"><span>ACCESS</span><h1>We could not open this seller invitation.</h1><p>{error}</p></section>
        : !property ? <section className="seller-empty"><span>SELLER CENTRE</span><h1>Your approved property updates will appear here.</h1><p>Ask your agency to invite this signed-in email address to a property.</p></section>
          : <>
            <section className="seller-cover" style={property.heroUrl ? { backgroundImage: `linear-gradient(90deg,rgba(12,39,34,.96),rgba(12,39,34,.42)),url(${property.heroUrl})` } : undefined}>
              <div>
                <span>YOUR PROPERTY · {property.ref}</span><h1>{property.title}</h1><p>{property.location} · Managed by {property.agency}</p>
                {properties.length > 1 && <select aria-label="Choose property" value={selected} onChange={event => setSelected(Number(event.target.value))}>{properties.map((item, index) => <option value={index} key={item.grantId}>{item.title}</option>)}</select>}
              </div>
              <aside><em>{property.status}</em><small>Listing status</small></aside>
            </section>
            <section className="seller-metrics">{[[property.metrics.views, "Verified listing views"], [property.metrics.enquiries, "Enquiries received"], [property.metrics.viewings, "Viewings confirmed or completed"], [property.metrics.offers, "Offers recorded"]].map(([value, label]) => <article key={String(label)}><strong>{String(value)}</strong><span>{label}</span></article>)}</section>
            <section className="seller-report-grid">
              <article className="seller-report-card">
                <div><span>{property.momentum.toUpperCase()}</span>{report && <time>{new Date(report.periodStart).toLocaleDateString()} – {new Date(report.periodEnd).toLocaleDateString()}</time>}</div>
                {report ? <>
                  <h2>{report.summary}</h2>
                  <div className="seller-report-facts"><span><strong>{report.views}</strong> views</span><span><strong>{report.enquiries}</strong> enquiries</span><span><strong>{report.viewings}</strong> viewings</span><span><strong>{report.offers}</strong> offers</span></div>
                  {report.feedbackSummary && <section className="seller-feedback-summary"><small>ANONYMIZED VIEWING FEEDBACK</small><p>{report.feedbackSummary}</p></section>}
                  <aside><small>RECOMMENDED NEXT STEP</small><p>{report.recommendedAction}</p></aside>
                  <footer>Approved {new Date(report.approvedAt).toLocaleDateString()} · {report.hasPdf && <a href={`/api/seller-report-pdf?id=${encodeURIComponent(report.id)}`}>Download branded PDF</a>}</footer>
                </> : <><h2>Your agency has not approved a report yet.</h2><p>Only reviewed, fact-based updates become visible here.</p></>}
              </article>
              <aside className="seller-trust">
                <span>MANDATE & DOCUMENTS</span><h2>{mandate ? `${mandate.type} mandate · ${mandate.status}` : "No mandate shared"}</h2>{mandate && <p>Expiry: {new Date(mandate.expiresAt).toLocaleDateString()}</p>}
                {property.documents.length ? <>{property.documents.map(document => <a key={document.id} href={document.downloadUrl}>{document.category}: {document.title}</a>)}</> : <p>No agency-approved documents are available yet.</p>}
                <a href={`mailto:?subject=${encodeURIComponent(property.title)}`}>Contact your agency</a>
              </aside>
            </section>
          </>}
  </main>;
}
