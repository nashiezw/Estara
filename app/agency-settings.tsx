"use client";

import { FormEvent, useMemo, useState } from "react";
import { WEBSITE_TEMPLATES } from "../db/website-templates";
import TemplatePreview from "./template-preview";

type AgencySettingsProps = {
  brand: any;
  setBrand: (value: any | ((current: any) => any)) => void;
  notify: (message: string) => void;
};

const contentFields = [
  ["homeHeadline", "Home headline", "input"],
  ["homeIntro", "Home intro", "textarea"],
  ["propertiesIntro", "Properties page intro", "textarea"],
  ["saleIntro", "For sale intro", "textarea"],
  ["rentIntro", "To rent intro", "textarea"],
  ["agentsIntro", "Agents page intro", "textarea"],
  ["servicesIntro", "Services page intro", "textarea"],
  ["aboutIntro", "About page intro", "textarea"],
  ["contactIntro", "Contact page intro", "textarea"],
] as const;

const imageFields = [
  ["homeHeroImageId", "Home hero image"],
  ["featuredImageId", "Featured property image"],
  ["propertiesHeroImageId", "Properties hero image"],
  ["saleHeroImageId", "For sale hero image"],
  ["rentHeroImageId", "To rent hero image"],
  ["agentsHeroImageId", "Agents hero image"],
  ["servicesHeroImageId", "Services hero image"],
  ["aboutHeroImageId", "About hero image"],
  ["contactHeroImageId", "Contact hero image"],
] as const;

export default function AgencySettings({ brand, setBrand, notify }: AgencySettingsProps) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const selectedTemplate = useMemo(() => WEBSITE_TEMPLATES.find((item) => item.key === brand.websiteTemplate) || WEBSITE_TEMPLATES[0], [brand.websiteTemplate]);
  const previewHref = publicPreviewHref(brand);
  const updateBrand = (patch: any) => setBrand({ ...brand, ...patch });
  const updatePublicContent = (key: string, value: string) => updateBrand({ publicContent: { ...(brand.publicContent || {}), [key]: value } });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(brand) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setBrand((current: any) => ({ ...current, ...data.agency }));
      notify("Agency settings saved.");
    } catch {
      notify("Settings could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (kind: "agency_logo" | "agency_icon" | "website_image", key: string, file?: File) => {
    if (!file) return;
    setUploading(key);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      if (kind === "agency_logo") updateBrand({ logoId: data.asset.id });
      else if (kind === "agency_icon") updateBrand({ iconId: data.asset.id });
      else updatePublicContent(key, data.asset.id);
      notify(kind === "website_image" ? "Website image uploaded. Save settings to publish it." : "Brand asset uploaded. Save settings to publish changes.");
    } catch (error: any) {
      notify(error.message || "Upload failed.");
    } finally {
      setUploading("");
    }
  };

  return (
    <div className="page agency-settings-page">
      <section className="money agency-settings-hero">
        <div className="section-head">
          <div>
            <span className="eyebrow">ADMINISTRATION</span>
            <h1 style={{ font: "42px Georgia,serif", margin: "8px 0" }}>Agency settings</h1>
            <p>Control the agency identity, public website, enquiry response promise and marketing defaults from one governed place.</p>
          </div>
          {brand.slug && <a className="outline" style={{ background: "#ffffff14", color: "#fff", borderColor: "#ffffff40", textDecoration: "none" }} href={previewHref} target="_blank" rel="noreferrer">Preview public site</a>}
        </div>
      </section>

      <form className="columns" onSubmit={save}>
        <section className="panel form agency-settings-main">
          <div className="panel-head compact wide"><div><h2>Identity and contact</h2><p>These details appear across the workspace, website, enquiries and marketing exports.</p></div></div>
          <div className="wide agency-brand-uploads">
            <AssetUpload label="Agency logo" assetId={brand.logoId} alt={`${brand.name} logo`} busy={busy || Boolean(uploading)} uploading={uploading === "agency_logo"} onFile={(file) => upload("agency_logo", "agency_logo", file)} />
            <AssetUpload label="Agency icon" assetId={brand.iconId} alt={`${brand.name} icon`} busy={busy || Boolean(uploading)} uploading={uploading === "agency_icon"} onFile={(file) => upload("agency_icon", "agency_icon", file)} />
          </div>
          <label className="wide">Agency name<input required value={brand.name || ""} onChange={(event) => updateBrand({ name: event.target.value })} /></label>
          <label className="wide">Tagline<input value={brand.tagline || ""} onChange={(event) => updateBrand({ tagline: event.target.value })} /></label>
          <label>Phone<input value={brand.phone || ""} onChange={(event) => updateBrand({ phone: event.target.value })} /></label>
          <label>WhatsApp<input value={brand.whatsapp || ""} onChange={(event) => updateBrand({ whatsapp: event.target.value })} /></label>
          <label>Email<input type="email" value={brand.email || ""} onChange={(event) => updateBrand({ email: event.target.value })} /></label>
          <label>Website<input value={brand.website || ""} onChange={(event) => updateBrand({ website: event.target.value })} /></label>
          <label>Response deadline (minutes)<input type="number" min="5" max="1440" value={brand.responseSlaMinutes || 0} onChange={(event) => updateBrand({ responseSlaMinutes: Number(event.target.value) })} /></label>
          <button className="primary" disabled={busy || Boolean(uploading)}>{busy ? "Saving..." : "Save settings"}</button>
        </section>

        <aside style={{ display: "grid", gap: 18 }}>
          <section className="panel agency-structure-card">
            <span className="eyebrow">AGENCY STRUCTURE</span>
            <h2>Branches & offices</h2>
            <p>Create offices, assign managers, restrict branch-scoped members and keep listings owned by the right team.</p>
            <a className="primary" href="/branches">Manage branches</a>
          </section>
          <section className="panel form">
            <div className="panel-head compact wide"><div><h2>Brand system</h2><p>Choose the visual base every public surface inherits.</p></div></div>
            <label>Primary colour<input type="color" value={brand.primaryColor} onChange={(event) => updateBrand({ primaryColor: event.target.value })} /></label>
            <label>Accent colour<input type="color" value={brand.accentColor} onChange={(event) => updateBrand({ accentColor: event.target.value })} /></label>
            <label className="wide">Website template<select value={brand.websiteTemplate} onChange={(event) => {
              const template = WEBSITE_TEMPLATES.find((item) => item.key === event.target.value);
              updateBrand({ websiteTemplate: event.target.value, typography: template?.typography || brand.typography });
            }}>{WEBSITE_TEMPLATES.map((template) => <option value={template.key} key={template.key}>{template.name}</option>)}</select></label>
            <label className="wide">Typography<select value={brand.typography} onChange={(event) => updateBrand({ typography: event.target.value })}><option value="classic">Classic</option><option value="modern">Modern</option><option value="editorial">Editorial</option></select></label>
            <div className="template-selected-preview wide"><TemplatePreview template={selectedTemplate} brand={brand} /></div>
          </section>
        </aside>

        <section className="panel form" style={{ gridColumn: "1 / -1" }}>
          <div className="panel-head compact wide"><div><h2>Website page content</h2><p>Review and edit the copy and images used by the public website pages.</p></div></div>
          {contentFields.map(([key, label, type]) => <label className={key === "homeHeadline" ? "wide" : ""} key={key}>{label}{type === "input" ? <input value={brand.publicContent?.[key] || ""} onChange={(event) => updatePublicContent(key, event.target.value)} placeholder={brand.name} /> : <textarea value={brand.publicContent?.[key] || ""} onChange={(event) => updatePublicContent(key, event.target.value)} placeholder="Write the public page copy clients should see." />}</label>)}
          <section className="website-image-editor wide">
            <h3>Website images</h3>
            {imageFields.map(([key, label]) => <label className="website-image-slot" key={key}>{brand.publicContent?.[key] ? <img src={`/api/media?id=${encodeURIComponent(brand.publicContent[key])}&variant=thumb`} alt="" /> : <i />}<span><strong>{label}</strong><small>{uploading === key ? "Uploading..." : "JPG, PNG or WebP used on the public website"}</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(uploading)} onChange={(event) => upload("website_image", key, event.target.files?.[0])} /></span></label>)}
          </section>
          <button className="primary" disabled={busy || Boolean(uploading)}>{busy ? "Saving..." : "Save public website content"}</button>
        </section>
      </form>
    </div>
  );
}

function AssetUpload({ label, assetId, alt, busy, uploading, onFile }: { label: string; assetId?: string; alt: string; busy: boolean; uploading: boolean; onFile: (file?: File) => void }) {
  return <label className="logo-upload">{label}{assetId && <img src={`/api/media?id=${encodeURIComponent(assetId)}&variant=thumb`} alt={alt} />}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => onFile(event.target.files?.[0])} /><small>{uploading ? "Uploading..." : "JPG, PNG or WebP. Save settings to publish changes."}</small></label>;
}

function publicWebsiteHref(brand: any) {
  return brand.slug ? `/site/${brand.slug}` : "";
}

function canonicalPublicWebsiteHref(brand: any) {
  const suffix = String(brand.tenantDomainSuffix || "").trim().replace(/^\*\./, "").replace(/^\.+|\.+$/g, "");
  return brand.slug && suffix ? `https://${brand.slug}.${suffix}` : "";
}

function publicPreviewHref(brand: any) {
  return canonicalPublicWebsiteHref(brand) || publicWebsiteHref(brand);
}
