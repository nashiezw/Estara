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
  return <div role="banner" style={{ maxWidth: 1320, margin: "0 auto 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 } as CSSProperties}>
    <a href="/workspace" aria-label="Return to workspace" style={{ display: "inline-flex", alignItems: "center", gap: 12, color: primary, textDecoration: "none", fontWeight: 900 }}>
      <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", border: "1px solid #dfe8e3", borderRadius: 10, background: "#fff" }}>‹</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        {platform.iconUrl ? <img src={platform.iconUrl} alt="" style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 9 }} /> : <i style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 9, background: primary, color: accent, fontStyle: "normal" }}>{name.slice(0, 1)}</i>}
        {platform.logoUrl ? <img src={platform.logoUrl} alt={name} style={{ maxWidth: 150, maxHeight: 34, objectFit: "contain" }} /> : <b style={{ letterSpacing: ".16em", fontSize: 14 }}>{name}</b>}
      </span>
    </a>
    <span style={{ color: "#6b7c75", fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>{section}</span>
  </div>;
}
