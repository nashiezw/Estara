import { DEFAULT_PLATFORM_IDENTITY, type PlatformIdentity } from "./platform-defaults";

const pick = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;
const runtimeEnv = async () => (await import("cloudflare:workers")).env;

async function ensurePlatformColumns(env: any) {
  const rows = await env.DB.prepare("PRAGMA table_info(platform_settings)").all<{ name: string }>();
  const columns = new Set(rows.results.map(row => row.name));
  if (!columns.has("accent_color")) {
    await env.DB.prepare("ALTER TABLE platform_settings ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#e6bd5f'").run();
  }
  if (!columns.has("logo_url")) {
    await env.DB.prepare("ALTER TABLE platform_settings ADD COLUMN logo_url TEXT NOT NULL DEFAULT ''").run();
  }
  if (!columns.has("icon_url")) {
    await env.DB.prepare("ALTER TABLE platform_settings ADD COLUMN icon_url TEXT NOT NULL DEFAULT ''").run();
  }
  if (!columns.has("dark_logo_url")) {
    await env.DB.prepare("ALTER TABLE platform_settings ADD COLUMN dark_logo_url TEXT NOT NULL DEFAULT ''").run();
  }
  if (!columns.has("dark_icon_url")) {
    await env.DB.prepare("ALTER TABLE platform_settings ADD COLUMN dark_icon_url TEXT NOT NULL DEFAULT ''").run();
  }
}

export async function getPlatformIdentity(): Promise<PlatformIdentity> {
  try {
    const env = await runtimeEnv();
    await ensurePlatformColumns(env);
    const row = await env.DB.prepare("SELECT platform_name AS platformName,short_name AS shortName,parent_brand AS parentBrand,tagline,primary_color AS primaryColor,accent_color AS accentColor,default_country AS defaultCountry,default_currency AS defaultCurrency,timezone,domain,tenant_domain_suffix AS tenantDomainSuffix,powered_by_wording AS poweredByWording,logo_url AS logoUrl,icon_url AS iconUrl,dark_logo_url AS darkLogoUrl,dark_icon_url AS darkIconUrl FROM platform_settings WHERE id='default'").first<any>();
    if (!row) return DEFAULT_PLATFORM_IDENTITY;
    return {
      platformName: pick(row.platformName, DEFAULT_PLATFORM_IDENTITY.platformName),
      shortName: pick(row.shortName, DEFAULT_PLATFORM_IDENTITY.shortName),
      parentBrand: pick(row.parentBrand, DEFAULT_PLATFORM_IDENTITY.parentBrand),
      tagline: pick(row.tagline, DEFAULT_PLATFORM_IDENTITY.tagline),
      descriptor: DEFAULT_PLATFORM_IDENTITY.descriptor,
      primaryColor: pick(row.primaryColor, DEFAULT_PLATFORM_IDENTITY.primaryColor),
      accentColor: pick(row.accentColor, DEFAULT_PLATFORM_IDENTITY.accentColor),
      defaultCountry: pick(row.defaultCountry, DEFAULT_PLATFORM_IDENTITY.defaultCountry),
      defaultCurrency: pick(row.defaultCurrency, DEFAULT_PLATFORM_IDENTITY.defaultCurrency),
      timezone: pick(row.timezone, DEFAULT_PLATFORM_IDENTITY.timezone),
      domain: pick(row.domain, DEFAULT_PLATFORM_IDENTITY.domain),
      tenantDomainSuffix: pick(row.tenantDomainSuffix, DEFAULT_PLATFORM_IDENTITY.tenantDomainSuffix),
      poweredByWording: pick(row.poweredByWording, DEFAULT_PLATFORM_IDENTITY.poweredByWording),
      logoUrl: pick(row.logoUrl, DEFAULT_PLATFORM_IDENTITY.logoUrl),
      iconUrl: pick(row.iconUrl, DEFAULT_PLATFORM_IDENTITY.iconUrl),
      darkLogoUrl: pick(row.darkLogoUrl, DEFAULT_PLATFORM_IDENTITY.darkLogoUrl),
      darkIconUrl: pick(row.darkIconUrl, DEFAULT_PLATFORM_IDENTITY.darkIconUrl),
    };
  } catch {
    return DEFAULT_PLATFORM_IDENTITY;
  }
}

export async function ensurePlatformIdentity() {
  const env = await runtimeEnv();
  await ensurePlatformColumns(env);
  const p = DEFAULT_PLATFORM_IDENTITY;
  await env.DB.prepare("INSERT OR IGNORE INTO platform_settings (id,platform_name,short_name,parent_brand,tagline,primary_color,accent_color,default_country,default_currency,timezone,domain,tenant_domain_suffix,powered_by_wording,logo_url,icon_url,dark_logo_url,dark_icon_url) VALUES ('default',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(p.platformName, p.shortName, p.parentBrand, p.tagline, p.primaryColor, p.accentColor, p.defaultCountry, p.defaultCurrency, p.timezone, p.domain, p.tenantDomainSuffix, p.poweredByWording, p.logoUrl, p.iconUrl, p.darkLogoUrl, p.darkIconUrl)
    .run();
}
