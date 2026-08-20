"use client";

import { useEffect, useMemo, useState } from "react";

type CopyState = { headline: string; listingDescription: string; socialCaption: string };
type Row = Record<string, any>;

const designOptions = [
  { key: "signature", name: "Signature", note: "Premium image-led card" },
  { key: "bold", name: "Bold", note: "High-impact social creative" },
  { key: "editorial", name: "Editorial", note: "Magazine-style property story" },
  { key: "minimal", name: "Minimal", note: "Clean image and facts layout" },
];

const defaultCopy: CopyState = { headline: "", listingDescription: "", socialCaption: "" };

export default function MarketingStudioClient({ platform }: { platform: { shortName: string } }) {
  const [data, setData] = useState<Row | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [selected, setSelected] = useState<string[]>(["whatsapp_card"]);
  const [previewFormat, setPreviewFormat] = useState("whatsapp_card");
  const [design, setDesign] = useState("signature");
  const [copy, setCopy] = useState<CopyState>(defaultCopy);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const response = await fetch("/api/marketing", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Marketing Studio could not be loaded.");
      setData(body);
      setPropertyId((current) => current || body.properties[0]?.id || "");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Marketing Studio could not be loaded.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const property = useMemo(() => data?.properties.find((item: Row) => item.id === propertyId), [data, propertyId]);
  const copies = useMemo(() => data?.copies.filter((item: Row) => item.propertyId === propertyId) || [], [data, propertyId]);
  const jobs = useMemo(() => data?.jobs.filter((item: Row) => item.propertyId === propertyId) || [], [data, propertyId]);
  const approvedCopy = copies.find((item: Row) => item.status === "approved");
  const draft = copies.find((item: Row) => item.status === "draft");
  const activeCopy = draft || approvedCopy;
  const formats = data?.formats || {};
  const activeFormat: Row = formats[previewFormat] || Object.values(formats)[0] || { name: "Creative", width: 1200, height: 628 };

  useEffect(() => {
    setCopy(activeCopy ? {
      headline: activeCopy.headline || "",
      listingDescription: activeCopy.listingDescription || "",
      socialCaption: activeCopy.socialCaption || "",
    } : defaultCopy);
  }, [activeCopy?.id, activeCopy?.headline, activeCopy?.listingDescription, activeCopy?.socialCaption]);

  async function call(method: string, body: Row, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/marketing", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "That marketing action could not be completed.");
      setMessage(success);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That marketing action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const createCopy = () => call("POST", { action: "create_copy", propertyId }, "A fact-bound draft is ready to edit.");
  const saveCopy = () => draft ? call("PATCH", { action: "update_copy", id: draft.id, ...copy }, "Copy saved.") : Promise.resolve();
  const approveCopy = async () => {
    if (!draft) return;
    await call("PATCH", { action: "update_copy", id: draft.id, ...copy }, "Copy saved.");
    await call("PATCH", { action: "approve_copy", id: draft.id }, "Copy approved for rendering.");
  };
  const renderOutputs = () => call("POST", { action: "render", propertyId, formats: selected, design }, "Selected marketing outputs were generated.");

  function toggleFormat(key: string) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
    setPreviewFormat(key);
  }

  function downloadPreview() {
    if (!property) return;
    const blob = previewFormat === "social_caption"
      ? new Blob([copy.socialCaption || suggestedCaption(property)], { type: "text/plain" })
      : new Blob([creativeSvg({ property, agency: data?.agency || {}, copy, design, photoUrl: property.photoUrl }, activeFormat.width, activeFormat.height)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${property.reference || "estara"}-${previewFormat}.${previewFormat === "social_caption" ? "txt" : "svg"}`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Preview downloaded.");
  }

  async function sharePreview() {
    const text = copy.socialCaption || suggestedCaption(property);
    try {
      if (navigator.share) await navigator.share({ title: copy.headline || property?.title || "Property marketing", text });
      else await navigator.clipboard.writeText(text);
      setMessage(navigator.share ? "Share sheet opened." : "Caption copied for sharing.");
    } catch {
      setError("Sharing was cancelled or unavailable.");
    }
  }

  if (!data) return <main className="studio-empty"><h1>{error || "Opening Marketing Studio..."}</h1></main>;

  return (
    <main className="studio-page">
      <nav>
        <a href="/workspace">Workspace</a>
        <strong>{platform.shortName} <small>Marketing Studio</small></strong>
      </nav>
      <header>
        <div>
          <span>DESIGN CANVAS</span>
          <h1>Create channel-ready property marketing.</h1>
          <p>Choose a format, pick a design direction, edit the copy, preview the asset, then download, share or render approved outputs from real property facts.</p>
        </div>
        <label>Working property<select value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>{data.properties.map((item: Row) => <option value={item.id} key={item.id}>{item.reference} - {item.title}</option>)}</select></label>
      </header>

      {error && <p className="studio-error">{error}</p>}
      {message && <p className="studio-message">{message}</p>}

      <section className="studio-grid studio-grid-pro">
        <aside>
          <span>FORMAT LIBRARY</span>
          <h2>Choose output</h2>
          {Object.entries(formats).map(([key, spec]: any) => (
            <button className={selected.includes(key) ? "active" : ""} onClick={() => toggleFormat(key)} key={key}>
              <i>{selected.includes(key) ? "✓" : "+"}</i>
              <span><strong>{spec.name}</strong><small>{spec.width} x {spec.height}</small></span>
            </button>
          ))}
          <button className="studio-generate" disabled={busy || !approvedCopy || !selected.length} onClick={renderOutputs}>{busy ? "Rendering..." : "Render approved outputs"}</button>
          {!approvedCopy && <p>Approve the edited copy before rendering permanent outputs.</p>}
        </aside>

        <div>
          <section className="studio-canvas">
            <div className="studio-toolbar">
              <div>
                <span>LIVE PREVIEW</span>
                <h2>{activeFormat.name}</h2>
              </div>
              <div>
                <button onClick={downloadPreview} disabled={!property}>Download</button>
                <button onClick={sharePreview} disabled={!property}>Share</button>
              </div>
            </div>
            <div className="studio-preview-stage">
              <article className={`studio-live-card studio-live-${design}`} style={{ aspectRatio: `${activeFormat.width}/${activeFormat.height}` }}>
                {property?.photoUrl && <img src={property.photoUrl} alt="" />}
                <div>
                  <span>{data.agency?.name || platform.shortName}</span>
                  <small>{property ? `${property.transactionType || "Sale"} - ${property.location || ""}` : "Choose a property"}</small>
                  <h3>{copy.headline || property?.title || "Marketing headline"}</h3>
                  <p>{propertyDetails(property)}</p>
                  <strong>{property?.price || "Price on application"}</strong>
                </div>
              </article>
            </div>
            <div className="studio-designs" aria-label="Design styles">
              {designOptions.map((item) => <button className={design === item.key ? "active" : ""} onClick={() => setDesign(item.key)} key={item.key}><b>{item.name}</b><small>{item.note}</small></button>)}
            </div>
          </section>

          <section className="studio-copy studio-editor">
            <div>
              <span>EDITABLE COPY</span>
              <h2>Approved facts, polished wording</h2>
              {!activeCopy && <button onClick={createCopy} disabled={busy || !property}>Draft from verified facts</button>}
            </div>
            {activeCopy ? (
              <div className="studio-copy-editor">
                <label>Headline<input value={copy.headline} onChange={(event) => setCopy({ ...copy, headline: event.target.value })} /></label>
                <label>Listing description<textarea value={copy.listingDescription} onChange={(event) => setCopy({ ...copy, listingDescription: event.target.value })} /></label>
                <label>Social caption<textarea value={copy.socialCaption} onChange={(event) => setCopy({ ...copy, socialCaption: event.target.value })} /></label>
                <footer>
                  <em>{activeCopy.status}</em>
                  {draft ? <><button onClick={saveCopy} disabled={busy}>Save edits</button><button onClick={approveCopy} disabled={busy}>Approve copy</button></> : <button onClick={createCopy} disabled={busy}>Create new editable draft</button>}
                </footer>
              </div>
            ) : (
              <div className="studio-blank">No marketing copy exists yet. Draft it from the selected property facts.</div>
            )}
          </section>

          <section className="studio-output">
            <div><span>RENDERED FILES</span><h2>Ready to publish</h2></div>
            <div className="studio-cards">
              {jobs.length ? jobs.map((job: Row) => (
                <article key={job.id}>
                  <header><span>{formats[job.format]?.name || job.format}</span><em className={job.status}>{job.status}</em></header>
                  {job.outputId ? <a className="studio-preview" href={`/api/marketing/output?id=${encodeURIComponent(job.outputId)}`} target="_blank" rel="noreferrer"><object data={`/api/marketing/output?id=${encodeURIComponent(job.outputId)}`} type={job.contentType} aria-label={job.format} /><b>Open output</b></a> : <div className="studio-failed">{job.lastError || "Output is queued."}</div>}
                  <footer><small>{job.byteSize ? `${Math.ceil(job.byteSize / 1024)} KB` : "No file"} - {job.reviewStatus}</small>{job.status === "failed" && <button onClick={() => call("POST", { action: "retry", jobId: job.id }, "Render job retried.")}>Retry</button>}{job.status === "complete" && job.reviewStatus !== "approved" && <button onClick={() => call("PATCH", { action: "approve_output", id: job.id }, "Output approved.")}>Approve</button>}</footer>
                </article>
              )) : <div className="studio-blank">Render approved formats to create durable downloadable outputs.</div>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function propertyDetails(property?: Row) {
  if (!property) return "Bedrooms, bathrooms and key features appear here.";
  return [property.bedrooms ? `${property.bedrooms} bedrooms` : "", property.bathrooms ? `${property.bathrooms} bathrooms` : "", ...(property.features || []).slice(0, 2)].filter(Boolean).join(" - ");
}

function suggestedCaption(property?: Row) {
  if (!property) return "";
  return [property.title, property.price, propertyDetails(property), property.location].filter(Boolean).join("\n");
}

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));
}

function creativeSvg(snapshot: Row, width: number, height: number) {
  const property = snapshot.property || {};
  const agency = snapshot.agency || {};
  const copy = snapshot.copy || {};
  const primary = agency.primaryColor || "#153b34";
  const accent = agency.accentColor || "#4fcfd2";
  const photo = snapshot.photoUrl || property.photoUrl || "";
  const title = copy.headline || property.title || "Property marketing";
  const details = propertyDetails(property);
  const price = property.price || "Price on application";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${esc(snapshot.design === "editorial" ? "#fbfaf5" : primary)}"/>${photo ? `<image href="${esc(photo)}" x="${width * .48}" y="${height * .08}" width="${width * .45}" height="${height * .74}" preserveAspectRatio="xMidYMid slice"/>` : ""}<rect width="100%" height="100%" fill="url(#shade)"/><defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${esc(primary)}" stop-opacity=".94"/><stop offset=".65" stop-color="${esc(primary)}" stop-opacity=".48"/><stop offset="1" stop-color="${esc(primary)}" stop-opacity=".1"/></linearGradient></defs><text x="${width * .07}" y="${height * .16}" fill="${esc(accent)}" font-family="Arial" font-weight="900" font-size="${Math.round(width * .022)}">${esc((agency.name || "ESTARA").toUpperCase())}</text><foreignObject x="${width * .07}" y="${height * .34}" width="${width * .7}" height="${height * .28}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:800 ${Math.round(width * .052)}px/.98 Georgia;color:white;letter-spacing:0">${esc(title)}</div></foreignObject><text x="${width * .07}" y="${height * .75}" fill="#fff" font-family="Georgia" font-size="${Math.round(width * .044)}">${esc(price)}</text><text x="${width * .07}" y="${height * .84}" fill="#fff" font-family="Arial" font-size="${Math.round(width * .018)}">${esc(details)}</text></svg>`;
}
