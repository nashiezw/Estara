import { env } from "cloudflare:workers";
import { DEFAULT_PLATFORM_IDENTITY, type PlatformIdentity } from "./platform-defaults";

const pick = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;

export async function getPlatformIdentity(): Promise<PlatformIdentity> {
  try {
    const row = await env.DB.prepare("SELECT platform_name AS platformName,short_name AS shortName,parent_brand AS parentBrand,tagline,primary_color AS primaryColor,default_country AS defaultCountry,default_currency AS defaultCurrency,timezone,domain,tenant_domain_suffix AS tenantDomainSuffix,powered_by_wording AS poweredByWording FROM platform_settings WHERE id='default'").first<any>();
    if (!row) return DEFAULT_PLATFORM_IDENTITY;
    return {
      platformName: pick(row.platformName, DEFAULT_PLATFORM_IDENTITY.platformName),
      shortName: pick(row.shortName, DEFAULT_PLATFORM_IDENTITY.shortName),
      parentBrand: pick(row.parentBrand, DEFAULT_PLATFORM_IDENTITY.parentBrand),
      tagline: pick(row.tagline, DEFAULT_PLATFORM_IDENTITY.tagline),
      descriptor: DEFAULT_PLATFORM_IDENTITY.descriptor,
      primaryColor: pick(row.primaryColor, DEFAULT_PLATFORM_IDENTITY.primaryColor),
      defaultCountry: pick(row.defaultCountry, DEFAULT_PLATFORM_IDENTITY.defaultCountry),
      defaultCurrency: pick(row.defaultCurrency, DEFAULT_PLATFORM_IDENTITY.defaultCurrency),
      timezone: pick(row.timezone, DEFAULT_PLATFORM_IDENTITY.timezone),
      domain: pick(row.domain, ""),
      tenantDomainSuffix: pick(row.tenantDomainSuffix, ""),
      poweredByWording: pick(row.poweredByWording, DEFAULT_PLATFORM_IDENTITY.poweredByWording),
    };
  } catch {
    return DEFAULT_PLATFORM_IDENTITY;
  }
}

export async function ensurePlatformIdentity() {
  const p = DEFAULT_PLATFORM_IDENTITY;
  await env.DB.prepare("INSERT OR IGNORE INTO platform_settings (id,platform_name,short_name,parent_brand,tagline,primary_color,default_country,default_currency,timezone,domain,tenant_domain_suffix,powered_by_wording) VALUES ('default',?,?,?,?,?,?,?,?,?,?,?)")
    .bind(p.platformName, p.shortName, p.parentBrand, p.tagline, p.primaryColor, p.defaultCountry, p.defaultCurrency, p.timezone, p.domain, p.tenantDomainSuffix, p.poweredByWording)
    .run();
}
