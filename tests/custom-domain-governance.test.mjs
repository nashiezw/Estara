import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

async function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  const directory = new URL("../drizzle/", import.meta.url);
  const names = (await readdir(directory)).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
  for (const name of names) {
    const sql = await readFile(new URL(name, directory), "utf8");
    for (const statement of sql.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) db.exec(statement);
  }
  return db;
}

test("custom domains are tenant-owned and globally unique", async () => {
  const db = await database();
  db.prepare("INSERT INTO agencies(id,name,slug) VALUES(?,?,?)").run("agency-a", "Agency A", "agency-a");
  db.prepare("INSERT INTO agencies(id,name,slug) VALUES(?,?,?)").run("agency-b", "Agency B", "agency-b");
  db.prepare("INSERT INTO custom_domains(id,agency_id,domain,ownership_token,expected_cname,status,created_by) VALUES(?,?,?,?,?,?,?)").run("domain-a", "agency-a", "www.example.co.zw", "estara-domain-token", "agency-a.example.host", "setup_required", "user-a");
  assert.throws(() => db.prepare("INSERT INTO custom_domains(id,agency_id,domain,ownership_token,expected_cname,status,created_by) VALUES(?,?,?,?,?,?,?)").run("domain-b", "agency-b", "www.example.co.zw", "other-token", "agency-b.example.host", "setup_required", "user-b"));
  assert.equal(db.prepare("UPDATE custom_domains SET status='active' WHERE id=? AND agency_id=?").run("domain-a", "agency-b").changes, 0);
});

test("domain lifecycle proves ownership before activation", async () => {
  const db = await database();
  db.prepare("INSERT INTO agencies(id,name,slug) VALUES(?,?,?)").run("agency-a", "Agency A", "agency-a");
  db.prepare("INSERT INTO custom_domains(id,agency_id,domain,ownership_token,expected_cname,status,created_by) VALUES(?,?,?,?,?,?,?)").run("domain-a", "agency-a", "www.example.co.zw", "estara-domain-token", "agency-a.example.host", "setup_required", "user-a");
  const wrong = db.prepare("UPDATE custom_domains SET status='failed',failure_reason=? WHERE id=? AND agency_id=? AND ownership_token=? AND expected_cname=?").run("TXT ownership token or CNAME target does not match.", "domain-a", "agency-a", "wrong", "agency-a.example.host");
  assert.equal(wrong.changes, 0);
  const verified = db.prepare("UPDATE custom_domains SET status='verified',verified_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND ownership_token=? AND expected_cname=?").run("domain-a", "agency-a", "estara-domain-token", "agency-a.example.host");
  assert.equal(verified.changes, 1);
  assert.equal(db.prepare("UPDATE custom_domains SET status='active',activated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status IN ('verified','ssl_pending')").run("domain-a", "agency-a").changes, 1);
});

test("domain route is permission checked, entitlement gated and avoids fake TLS success", async () => {
  const route = await readFile(new URL("../app/api/domains/route.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/domains/page.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../app/domains/domains-client.tsx", import.meta.url), "utf8");
  const publicSite = await readFile(new URL("../db/public-site.ts", import.meta.url), "utf8");
  const root = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(route, /requirePermission\(workspace, "agency\.settings\.manage"\)/);
  assert.match(route, /requireEntitlement\(workspace\.agencyId, user\.userId, "customDomains"\)/);
  assert.match(route, /defaultSiteUrl/);
  assert.match(route, /customDomainsEligible/);
  assert.match(page, /workspace-tools\.css/);
  assert.match(page, /requireChatGPTUser\("\/domains"\)/);
  assert.match(client, /defaultSiteHost/);
  assert.match(route, /ownershipToken/);
  assert.match(route, /observedTxt === row\.ownershipToken/);
  assert.match(route, /observedCname === row\.expectedCname\.toLowerCase\(\)/);
  assert.match(route, /Awaiting hosting provider certificate activation/);
  assert.doesNotMatch(route, /status='active'.*request_ssl/s);
  assert.match(publicSite, /getPublicAgencyByHost/);
  assert.match(publicSite, /tenantSlugFromHost/);
  assert.match(publicSite, /d\.status='active'/);
  assert.match(root, /getPublicAgencyByHost\(host,\s*platform\.tenantDomainSuffix\)/);
  assert.match(root, /PublicHome agency=\{agency\}/);
  assert.match(root, /notFound\(\)/);
});

test("tenant subdomain proxy keeps agency website paths clean", async () => {
  const proxy = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  const root = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const publicWebsite = await readFile(new URL("../app/site/[slug]/public-website.tsx", import.meta.url), "utf8");
  const sectionPage = await readFile(new URL("../app/site/[slug]/[section]/page.tsx", import.meta.url), "utf8");
  const propertyPage = await readFile(new URL("../app/site/[slug]/properties/[id]/page.tsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../app/estara-app.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../app/domains/domains-client.tsx", import.meta.url), "utf8");
  const seo = await readFile(new URL("../db/public-seo.ts", import.meta.url), "utf8");
  assert.match(proxy, /PUBLIC_SITE_DOMAIN \|\| ESTARA_TENANT_DOMAIN_SUFFIX/);
  assert.match(proxy, /export function proxy/);
  assert.match(proxy, /NextResponse\.rewrite/);
  assert.match(proxy, /NextResponse\.redirect\(url, 308\)/);
  assert.match(root, /pathMode="clean"/);
  assert.match(publicWebsite, /mode === "clean"/);
  assert.match(publicWebsite, /publicPath\(agency/);
  assert.match(sectionPage, /pathMode = host\.replace/);
  assert.match(propertyPage, /pathMode = host\.replace/);
  assert.match(workspace, /publicWebsiteHref\(brand\)/);
  assert.match(client, /proxied wildcard DNS record/);
  assert.match(client, /\*\.estara\.co\.zw\/\*/);
  assert.match(seo, /host\.startsWith\(`\$\{agency\.slug\.toLowerCase\(\)\}\.`\)/);
});

test("tenant subdomain routing is single-label and slug-safe", async () => {
  const [{ tenantSlugFromHost }, publicSite] = await Promise.all([
    import("../db/public-site.ts"),
    readFile(new URL("../db/public-site.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(tenantSlugFromHost("houselink.estara.co.zw", "estara.co.zw"), "houselink");
  assert.equal(tenantSlugFromHost("houselink.estara.co.zw:443", ".estara.co.zw"), "houselink");
  assert.equal(tenantSlugFromHost("prime.estara.co.zw", "estara.co.zw"), "prime");
  assert.equal(tenantSlugFromHost("prime.estara.co.zw:443", ".estara.co.zw"), "prime");
  assert.equal(tenantSlugFromHost("estara.co.zw", "estara.co.zw"), null);
  assert.equal(tenantSlugFromHost("app.estara.co.zw", "estara.co.zw"), null);
  assert.equal(tenantSlugFromHost("www.estara.co.zw", "estara.co.zw"), null);
  assert.equal(tenantSlugFromHost("a.b.estara.co.zw", "estara.co.zw"), null);
  assert.equal(tenantSlugFromHost("bad--slug.estara.co.zw", "estara.co.zw"), null);
  assert.match(publicSite, /tenantDomainSuffix\|\|env\.PUBLIC_SITE_DOMAIN\|\|ESTARA_TENANT_DOMAIN_SUFFIX/);
});

test("default platform identity uses the production agency website suffix", async () => {
  const defaults = await readFile(new URL("../db/platform-defaults.ts", import.meta.url), "utf8");
  const settings = await readFile(new URL("../db/platform-settings.ts", import.meta.url), "utf8");
  const proxy = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(defaults, /domain: "estara\.co\.zw"/);
  assert.match(defaults, /tenantDomainSuffix: "estara\.co\.zw"/);
  assert.match(settings, /tenantDomainSuffix: pick\(row\.tenantDomainSuffix, DEFAULT_PLATFORM_IDENTITY\.tenantDomainSuffix\)/);
  assert.match(proxy, /legacyTenantSlugFromHost/);
  assert.match(proxy, /PUBLIC_SITE_DOMAIN \|\| ESTARA_TENANT_DOMAIN_SUFFIX/);
});

test("tenant domain source of truth reserves system subdomains", async () => {
  const domain = await import("../db/domain.ts");
  assert.equal(domain.hostedTenantHost("houselink"), "houselink.estara.co.zw");
  assert.equal(domain.hostedTenantUrl("houselink", undefined, "/properties/prop-1"), "https://houselink.estara.co.zw/properties/prop-1");
  for (const slug of ["app", "www", "api", "admin", "support", "mail", "status", "assets", "cdn"]) {
    assert.equal(domain.isValidTenantSlug(slug), false);
    assert.equal(domain.tenantSlugFromHost(`${slug}.estara.co.zw`, "estara.co.zw"), null);
  }
  assert.equal(domain.legacyTenantSlugFromHost("houselink.sites.estara.co.zw"), "houselink");
});
