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
    minHeight: 78,
    margin: "0 auto 24px",
    padding: "12px clamp(12px, 2vw, 18px)",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 8,
    background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 82%, #06110f) 100%)`,
    boxShadow: "0 22px 60px rgba(11, 40, 34, .14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    overflow: "hidden",
  } as CSSProperties;
  const logoShell = {
    display: "inline-flex",
    alignItems: "center",
    gap: 13,
    minWidth: 0,
    flex: "1 1 auto",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
  } as CSSProperties;
  return <div role="banner" style={shell}>
    <a href="/workspace" aria-label="Return to workspace" title="Return to workspace" style={{ width: 46, height: 46, display: "grid", placeItems: "center", flex: "0 0 auto", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, background: "rgba(255,255,255,.08)", fontSize: 24, fontWeight: 800 } as CSSProperties}>‹</a>
    <a href="/workspace" aria-label={`${name} workspace`} style={logoShell}>
      {icon ? <img src={icon} alt="" style={{ width: 46, height: 46, objectFit: "contain", borderRadius: hasDarkIcon ? 0 : 8, padding: hasDarkIcon ? 0 : 5, background: hasDarkIcon ? "transparent" : "#fff", flex: "0 0 auto" }} /> : <i style={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 8, background: accent, color: primary, fontStyle: "normal", fontWeight: 950 }}>{name.slice(0, 1)}</i>}
      <span style={{ display: "grid", minWidth: 0 }}>
        {logo ? <img src={logo} alt={name} style={{ width: "auto", maxWidth: "min(176px, 34vw)", maxHeight: 34, objectFit: "contain", objectPosition: "left center", padding: hasDarkLogo ? 0 : "5px 8px", borderRadius: hasDarkLogo ? 0 : 6, background: hasDarkLogo ? "transparent" : "#fff" }} /> : <b style={{ color: "#fff", letterSpacing: ".16em", fontSize: 15, lineHeight: 1 }}>{name}</b>}
      </span>
    </a>
    <span style={{ marginLeft: "auto", minHeight: 42, maxWidth: 220, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1px solid color-mix(in srgb, ${accent} 52%, transparent)`, borderRadius: 8, background: "rgba(255,255,255,.08)", color: "#fff", padding: "10px 14px", fontSize: 10, fontWeight: 950, letterSpacing: ".16em", textTransform: "uppercase", textAlign: "center", lineHeight: 1.2, overflowWrap: "anywhere" } as CSSProperties}>{section}</span>
  </div>;
}
