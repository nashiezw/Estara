import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("enterprise branding is permission and plan gated, tenant scoped and audited", async () => {
  const route = await read("../app/api/enterprise/route.ts");
  assert.match(route, /enterprise\.manage/g);
  assert.match(route, /requireEntitlement/);
  assert.match(route, /whiteLabel/);
  assert.match(route, /agency_id=\?/g);
  assert.match(route, /kind='agency_logo'/);
  assert.match(route, /enterprise\.branding\.updated/);
});

test("white-label suppression is server-resolved and never controlled by public input", async () => {
  const [site, view] = await Promise.all([
    read("../db/public-site.ts"),
    read("../app/site/[slug]/public-website.tsx"),
  ]);
  assert.match(site, /LEFT JOIN enterprise_branding/);
  assert.match(site, /hide_parent_brand/);
  assert.match(site, /powered_by_wording/);
  assert.match(view, /!agency\.hideParentBrand/);
  assert.match(view, /agency\.poweredByWording/);
});

test("platform identity is centralized for metadata, defaults and public footer wording", async () => {
  const [defaults, platform, layout, workspace, migration, assetMigration, api, assetApi, settingsApi, admin] = await Promise.all([
    read("../db/platform-defaults.ts"),
    read("../db/platform-settings.ts"),
    read("../app/layout.tsx"),
    read("../db/workspace.ts"),
    read("../drizzle/0024_custom_domains.sql"),
    read("../drizzle/0030_platform_brand_assets.sql"),
    read("../app/api/platform/route.ts"),
    read("../app/api/platform/asset/route.ts"),
    read("../app/api/settings/route.ts"),
    read("../app/admin/platform-admin-client.tsx"),
  ]);
  assert.match(defaults, /DEFAULT_PLATFORM_IDENTITY/);
  assert.match(defaults, /logoUrl/);
  assert.match(defaults, /iconUrl/);
  assert.match(defaults, /darkLogoUrl/);
  assert.match(defaults, /darkIconUrl/);
  assert.match(platform, /getPlatformIdentity/);
  assert.match(platform, /ensurePlatformIdentity/);
  assert.match(platform, /ALTER TABLE platform_settings ADD COLUMN logo_url/);
  assert.match(platform, /ALTER TABLE platform_settings ADD COLUMN icon_url/);
  assert.match(platform, /ALTER TABLE platform_settings ADD COLUMN dark_logo_url/);
  assert.match(platform, /ALTER TABLE platform_settings ADD COLUMN dark_icon_url/);
  assert.match(platform, /logo_url AS logoUrl/);
  assert.match(platform, /dark_logo_url AS darkLogoUrl/);
  assert.match(layout, /getPlatformIdentity/);
  assert.match(layout, /platform\.iconUrl/);
  assert.match(layout, /platform\.logoUrl/);
  assert.doesNotMatch(layout, /cloudflare:workers/);
  assert.match(workspace, /ensurePlatformIdentity/);
  assert.match(migration, /powered_by_wording/);
  assert.match(migration, /tenant_domain_suffix/);
  assert.match(assetMigration, /SELECT 1/);
  assert.match(api, /logo_url AS logoUrl/);
  assert.match(api, /icon_url AS iconUrl/);
  assert.match(api, /dark_logo_url AS darkLogoUrl/);
  assert.match(api, /dark_icon_url AS darkIconUrl/);
  assert.match(api, /logoUrl: platform\.logoUrl/);
  assert.match(api, /darkLogoUrl: platform\.darkLogoUrl/);
  assert.match(assetApi, /requirePlatformUser\(user, \["super_admin"\]\)/);
  assert.match(assetApi, /platform\/brand\/\$\{type\}\.webp/);
  assert.match(assetApi, /"dark-logo"/);
  assert.match(assetApi, /"dark-icon"/);
  assert.match(assetApi, /UPDATE platform_settings SET/);
  assert.match(settingsApi, /SELECT \* FROM platform_settings/);
  assert.match(admin, /Upload platform logo/);
  assert.match(admin, /Upload browser icon/);
  assert.match(admin, /Upload dark logo/);
  assert.match(admin, /Upload dark browser icon/);
  assert.match(admin, /Platform logo URL/);
  assert.match(admin, /Browser icon URL/);
  assert.match(admin, /Dark logo URL/);
  assert.match(admin, /Dark browser icon URL/);
});

test("entitlements remain data-driven through immutable plan versions", async () => {
  const entitlements = await read("../db/entitlements.ts");
  assert.match(entitlements, /plan\.entitlements\[entitlement\]/);
  assert.match(entitlements, /resolveAgencyPlan/);
  assert.doesNotMatch(entitlements, /if\(entitlement===/);
});

test("enterprise shortcut buttons use a scoped spacing fix", async () => {
  const [client, css, globals] = await Promise.all([
    read("../app/enterprise/enterprise-client.tsx"),
    read("../app/management/management.css"),
    read("../app/globals.css"),
  ]);

  assert.match(client, /enterprise-panel-action/);
  assert.match(css, /\.enterprise-panel-action\{margin-top:14px;padding-inline:24px\}/);
  assert.doesNotMatch(globals, /padding-block:max\(10px,\s*\.72em\)/);
});
