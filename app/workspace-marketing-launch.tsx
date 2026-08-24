"use client";

import { useState } from "react";

type MarketingLaunchProps = {
  property: any;
  notify: (message: string) => void;
  brand: any;
};

const formatSpecs = [
  { name: "WhatsApp card", size: [1200, 628], sizeLabel: "1200 x 628", note: "Fast share card", tone: "Signature" },
  { name: "Instagram post", size: [1080, 1350], sizeLabel: "1080 x 1350", note: "Feed creative", tone: "Social" },
  { name: "Instagram story", size: [1080, 1920], sizeLabel: "1080 x 1920", note: "Vertical story", tone: "Story" },
  { name: "Facebook creative", size: [1200, 1500], sizeLabel: "1200 x 1500", note: "Paid/social creative", tone: "Campaign" },
  { name: "Property brochure", size: [1200, 1600], sizeLabel: "1200 x 1600", note: "Listing brochure", tone: "Brochure" },
  { name: "Social caption", size: null, sizeLabel: "Caption", note: "Copy-ready text", tone: "Copy" },
] as const;

const formatMap = Object.fromEntries(formatSpecs.map((spec) => [spec.name, spec]));

export default function MarketingLaunch({ property, notify, brand }: MarketingLaunchProps) {
  const safeProperty = property || {
    title: "Select a property",
    location: "Workspace",
    price: "US$0",
    beds: 0,
    baths: 0,
    ref: "ESTARA",
    transactionType: "Sale",
    media: [],
  };
  const [format, setFormat] = useState("WhatsApp card");
  const current = formatMap[format] || formatSpecs[0];
  const headingFont = brand.typography === "modern" ? "Arial" : brand.typography === "editorial" ? "Times New Roman" : "Georgia";
  const bodyFont = brand.typography === "editorial" ? "Georgia" : "Arial";
  const photo = safeProperty.media?.[0]?.url;
  const caption = `${safeProperty.title} in ${safeProperty.location}. ${safeProperty.beds} bedrooms, ${safeProperty.baths} bathrooms - ${safeProperty.price}. Contact ${brand.name}${brand.whatsapp ? ` on ${brand.whatsapp}` : ""}.`;

  const esc = (x: unknown) =>
    String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c] || c));

  const asset = () => {
    const [w, h] = current.size || formatSpecs[0].size!;
    const image = photo ? new URL(photo, location.href).href : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${esc(brand.primaryColor)}"/>${image ? `<image href="${esc(image)}" width="${w}" height="${Math.round(h * 0.58)}" preserveAspectRatio="xMidYMid slice"/>` : ""}<rect y="${Math.round(h * 0.50)}" width="${w}" height="${h}" fill="${esc(brand.primaryColor)}"/><text x="72" y="${Math.round(h * 0.60)}" fill="${esc(brand.accentColor)}" font-family="${bodyFont}" font-size="30" font-weight="700">${esc(brand.name.toUpperCase())}</text><text x="72" y="${Math.round(h * 0.70)}" fill="white" font-family="${headingFont}" font-size="58" font-weight="700">${esc(safeProperty.title.slice(0, 32))}</text><text x="72" y="${Math.round(h * 0.78)}" fill="white" font-family="${bodyFont}" font-size="28">${esc(safeProperty.location)} · ${safeProperty.beds} beds · ${safeProperty.baths} baths</text><text x="72" y="${Math.round(h * 0.88)}" fill="${esc(brand.accentColor)}" font-family="${bodyFont}" font-size="50" font-weight="700">${esc(safeProperty.price)}</text></svg>`;
  };

  const download = () => {
    if (format === "Social caption") {
      navigator.clipboard?.writeText(caption);
      notify("Verified property caption copied.");
      return;
    }
    const blob = new Blob([asset()], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeProperty.ref}-${format.toLowerCase().replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`${format} downloaded.`);
  };

  const share = async () => {
    if (format === "Social caption") {
      await navigator.clipboard?.writeText(caption);
      notify("Caption copied for sharing.");
      return;
    }
    const file = new File([asset()], `${safeProperty.ref}.svg`, { type: "image/svg+xml" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: safeProperty.title, text: caption, files: [file] });
    } else {
      download();
      await navigator.clipboard?.writeText(caption);
      notify("Asset downloaded and caption copied.");
    }
  };

  return (
    <div className="page">
      <section className="money">
        <div className="section-head">
          <div>
            <span className="eyebrow">MARKET FASTER</span>
            <h1>Marketing studio</h1>
            <p>Launch branded, channel-ready assets from saved property facts, then finish precision edits in the full production studio.</p>
          </div>
          <span className="live"><i />{current.sizeLabel}</span>
        </div>
        <div className="actions">
          <a className="primary" href="/marketing-studio">Open full editor</a>
          <button className="outline" onClick={download}>{format === "Social caption" ? "Copy current" : "Download current"}</button>
          <button className="outline" onClick={share}>Share</button>
        </div>
      </section>

      <div className="market">
        <section className="creative">
          {format === "Social caption" ? (
            <div className="caption-preview">
              <small>REVIEW BEFORE SHARING</small>
              <p>{caption}</p>
            </div>
          ) : (
            <div
              className={`art typography-${brand.typography}`}
              style={photo ? { backgroundImage: `linear-gradient(90deg,${brand.primaryColor} 0 48%,rgba(12,45,37,.10) 76%),url(${photo})` } : undefined}
            >
              <b>{brand.name.toUpperCase()}</b>
              <div>
                <small>{safeProperty.transactionType?.toUpperCase()} · {safeProperty.location.toUpperCase()}</small>
                <h2>{safeProperty.title}</h2>
                <p>{safeProperty.beds} bedrooms · {safeProperty.baths} bathrooms</p>
                <strong>{safeProperty.price}</strong>
              </div>
            </div>
          )}

          <footer>
            <span>
              <strong>{current.note}</strong>
              <small>{format === "Social caption" ? "Ready for WhatsApp, Facebook, and Instagram captions." : "Downloadable SVG using agency colours and verified property data."}</small>
            </span>
            <button className="outline" onClick={download}>{format === "Social caption" ? "Copy" : "Download"}</button>
            <button className="primary" onClick={share}>Share</button>
          </footer>
        </section>

        <aside>
          <section className="panel formats">
            <div className="panel-head compact">
              <div>
                <h2>Choose output</h2>
                <p>Each option inherits the current brand kit.</p>
              </div>
            </div>
            {formatSpecs.map((spec) => <button className={format === spec.name ? "active" : ""} onClick={() => setFormat(spec.name)} key={spec.name}><i>✦</i>{spec.name}<b>{spec.sizeLabel}</b></button>)}
          </section>

          <section className="panel attention">
            <div className="panel-head compact">
              <div>
                <h2>Ready in this workspace</h2>
                <p>Everything starts from the selected property.</p>
              </div>
            </div>
            <button><i className="blue">1</i><span><strong>Property facts</strong><p>{safeProperty.location}</p></span></button>
            <button><i className="amber">2</i><span><strong>Brand system</strong><p>{brand.name}</p></span></button>
            <button><i className="blue">3</i><span><strong>Studio editor</strong><p>Templates, uploads, layers, export</p></span></button>
          </section>
        </aside>
      </div>
    </div>
  );
}
