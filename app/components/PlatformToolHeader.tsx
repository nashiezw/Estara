import type { CSSProperties } from "react";

export type PlatformBrand = {
  shortName: string;
  platformName?: string;
  logoUrl?: string;
  iconUrl?: string;
  darkLogoUrl?: string;
  darkIconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
};

export default function PlatformToolHeader({ platform, section }: { platform: PlatformBrand; section: string }) {
  const name = platform.platformName || platform.shortName || "ESTARA";
  const primary = platform.primaryColor || "#153b34";
  const accent = platform.accentColor || "#d4a934";
  const icon = platform.darkIconUrl || platform.iconUrl;
  const logo = platform.darkLogoUrl || platform.logoUrl;
  const hasDarkIcon = Boolean(platform.darkIconUrl);
  const hasDarkLogo = Boolean(platform.darkLogoUrl);
  const shell = {
    maxWidth: 1320,
    minHeight: 66,
    margin: "0 auto 22px",
    padding: "10px clamp(10px, 2vw, 16px)",
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 8,
    background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 94%, #071310) 0%, color-mix(in srgb, ${primary} 78%, #040b09) 100%)`,
    boxShadow: "0 16px 44px rgba(11, 40, 34, .13)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    overflow: "hidden",
  } as CSSProperties;
  const logoShell = {
    display: "inline-flex",
    alignItems: "center",
    gap: 11,
    minWidth: 0,
    flex: "1 1 auto",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
  } as CSSProperties;
  return <div role="banner" style={shell}>
    <a href="/workspace" aria-label="Return to workspace" title="Return to workspace" style={{ width: 42, height: 42, display: "grid", placeItems: "center", flex: "0 0 auto", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,.16)", borderRadius: 8, background: "rgba(255,255,255,.06)", fontSize: 23, fontWeight: 800 } as CSSProperties}>‹</a>
    <a href="/workspace" aria-label={`${name} workspace`} style={logoShell}>
      {icon ? <img src={icon} alt="" style={{ width: 42, height: 42, objectFit: "contain", borderRadius: hasDarkIcon ? 12 : 12, padding: hasDarkIcon ? 1 : 5, background: hasDarkIcon ? "rgba(255,255,255,.04)" : "#fff", flex: "0 0 auto" }} /> : <i style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: accent, color: primary, fontStyle: "normal", fontWeight: 950 }}>{name.slice(0, 1)}</i>}
      <span style={{ display: "grid", minWidth: 0 }}>
        {logo ? <img src={logo} alt={name} style={{ width: "auto", maxWidth: "min(168px, 32vw)", maxHeight: 29, objectFit: "contain", objectPosition: "left center", padding: hasDarkLogo ? 0 : "4px 7px", borderRadius: hasDarkLogo ? 0 : 7, background: hasDarkLogo ? "transparent" : "#fff" }} /> : <b style={{ color: "#fff", letterSpacing: ".16em", fontSize: 14, lineHeight: 1 }}>{name}</b>}
      </span>
    </a>
    <span style={{ marginLeft: "auto", minHeight: 38, maxWidth: 200, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1px solid color-mix(in srgb, ${accent} 42%, transparent)`, borderRadius: 8, background: "rgba(255,255,255,.055)", color: "rgba(255,255,255,.9)", padding: "9px 12px", fontSize: 9, fontWeight: 950, letterSpacing: ".15em", textTransform: "uppercase", textAlign: "center", lineHeight: 1.2, overflowWrap: "anywhere" } as CSSProperties}>{section}</span>
  </div>;
}
