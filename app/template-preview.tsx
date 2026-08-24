export default function TemplatePreview({ template, brand }: { template: any; brand: any }) {
  const initials = (brand.name || "Agency").split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() || "EA";
  return <i className={`template-preview template-preview-${template.key}`} aria-hidden="true"><span className="tp-nav"><b>{initials}</b><em /><em /><em /></span><span className="tp-hero"><strong>{template.name}</strong><small>{brand.tagline || "Property, professionally handled."}</small><u>Explore</u></span><span className="tp-media" /><span className="tp-listings"><b /><b /><b /></span><span className="tp-services"><em /><em /><em /></span><span className="tp-footer" /></i>;
}
