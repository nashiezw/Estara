export const ESTARA_BASE_DOMAIN = "estara.co.zw";
export const ESTARA_APP_HOST = `app.${ESTARA_BASE_DOMAIN}`;
export const ESTARA_LEGACY_TENANT_DOMAIN_SUFFIX = "sites.estara.co.zw";
export const ESTARA_TENANT_DOMAIN_SUFFIX = ESTARA_BASE_DOMAIN;

export const RESERVED_TENANT_SUBDOMAINS = new Set([
  "app",
  "www",
  "api",
  "admin",
  "support",
  "mail",
  "status",
  "assets",
  "cdn",
  "docs",
  "help",
  "health",
  "login",
  "register",
  "demo",
  "developer",
]);

export function normalizeHost(value: string) {
  return value.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
}

export function normalizeTenantDomainSuffix(value = "") {
  return normalizeHost(value).replace(/^\*\./, "").replace(/^\./, "") || ESTARA_TENANT_DOMAIN_SUFFIX;
}

export function isValidTenantSlug(slug: string) {
  return /^[a-z][a-z0-9-]{3,58}[a-z0-9]$/.test(slug) && !slug.includes("--") && !RESERVED_TENANT_SUBDOMAINS.has(slug);
}

export function hostedTenantHost(slug: string, tenantDomainSuffix = ESTARA_TENANT_DOMAIN_SUFFIX) {
  const suffix = normalizeTenantDomainSuffix(tenantDomainSuffix);
  return isValidTenantSlug(slug) && suffix ? `${slug}.${suffix}` : "";
}

export function hostedTenantUrl(slug: string, tenantDomainSuffix = ESTARA_TENANT_DOMAIN_SUFFIX, path = "") {
  const host = hostedTenantHost(slug, tenantDomainSuffix);
  return host ? `https://${host}${path}` : "";
}

export function tenantSlugFromHost(host: string, tenantDomainSuffix = ESTARA_TENANT_DOMAIN_SUFFIX) {
  const domain = normalizeHost(host);
  const suffix = normalizeTenantDomainSuffix(tenantDomainSuffix);
  if (!suffix || domain === suffix || !domain.endsWith(`.${suffix}`)) return null;
  const slug = domain.slice(0, -suffix.length - 1);
  return isValidTenantSlug(slug) && !slug.includes(".") ? slug : null;
}

export function legacyTenantSlugFromHost(host: string) {
  return tenantSlugFromHost(host, ESTARA_LEGACY_TENANT_DOMAIN_SUFFIX);
}

export function isPlatformHost(host: string, platformDomain = ESTARA_BASE_DOMAIN, tenantDomainSuffix = ESTARA_TENANT_DOMAIN_SUFFIX) {
  const domain = normalizeHost(host);
  const root = normalizeHost(platformDomain);
  const suffix = normalizeTenantDomainSuffix(tenantDomainSuffix);
  if (!domain || domain === "localhost" || domain === "127.0.0.1" || domain === "::1") return true;
  if (domain.endsWith(".workers.dev") || domain.endsWith(".pages.dev")) return true;
  if (!root && !suffix) return true;
  return domain === root || domain === `www.${root}` || domain === `app.${root}`;
}
