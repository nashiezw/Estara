import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
import test from"node:test";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");

test("workspace surfaces use platform identity instead of source-fixed labels",async()=>{
  const clientPath=name=>name==="marketing-studio"?"../app/marketing-studio/studio-client.tsx":`../app/${name}/${name==="ask-estara"?"ask":name}-client.tsx`;
  const covered=["branches","pipeline","contacts","deals","matching","marketing-studio","operations","roles","search","ask-estara","developer"];
  const pairs=[
    ["landing","../app/page.tsx"],
    ["workspace","../app/estara-app.tsx"],
    ["subscriptionApi","../app/api/subscription/route.ts"],
    ["subscription","../app/subscription/subscription-client.tsx"],
    ["sellerApi","../app/api/seller-portal/route.ts"],
    ["seller","../app/seller/seller-portal-client.tsx"],
    ["platformApi","../app/api/platform/route.ts"],
    ["admin","../app/admin/platform-admin-client.tsx"],
    ["invitePage","../app/invite/page.tsx"],
    ["invite","../app/invite/invite-client.tsx"],
    ["healthApi","../app/api/health/route.ts"],
    ["health","../app/health/health-client.tsx"],
    ["enterprisePage","../app/enterprise/page.tsx"],
    ["enterprise","../app/enterprise/enterprise-client.tsx"],
    ["reportsPage","../app/reports/page.tsx"],
    ["reports","../app/reports/reports-client.tsx"],
    ["recordPage","../app/properties/[id]/page.tsx"],
    ["record","../app/properties/[id]/property-record-client.tsx"],
    ["portalPage","../app/property-portal/page.tsx"],
    ["portal","../app/property-portal/portal-client.tsx"],
    ["shortlistPage","../app/shortlist/page.tsx"],
    ["shortlist","../app/shortlist/shortlist-client.tsx"],
    ["error","../app/error.tsx"],
    ["loading","../app/loading.tsx"],
    ["notFound","../app/not-found.tsx"],
    ["askApi","../app/api/ask-estara/route.ts"],
    ["checklist","../docs/DELIVERY-CHECKLIST.md"],
    ...covered.flatMap(name=>[[`${name}Page`,`../app/${name}/page.tsx`],[name,clientPath(name)]]),
  ];
  const sources=Object.fromEntries(await Promise.all(pairs.map(async([key,path])=>[key,await read(path)])));

  assert.match(sources.landing,/getPlatformIdentity/);
  assert.match(sources.landing,/platform\.shortName/);
  assert.match(sources.landing,/platform\.parentBrand/);
  assert.doesNotMatch(sources.landing,/A HouseLink product|Start inside ESTARA|Open ESTARA/);
  assert.match(sources.workspace,/p\.tenant_domain_suffix/);
  assert.match(sources.workspace,/brand\.platformName/);
  assert.match(sources.workspace,/brand\.tenantDomainSuffix/);
  assert.doesNotMatch(sources.workspace,/E <b>ESTARA|Ask ESTARA securely|Claim your ESTARA address|\.estara\.co\.zw<\/small>/);
  assert.match(sources.subscriptionApi,/getPlatformIdentity/);
  assert.match(sources.subscription,/platform\.shortName/);
  assert.match(sources.sellerApi,/getPlatformIdentity/);
  assert.match(sources.seller,/platform\.shortName/);
  assert.match(sources.platformApi,/getPlatformIdentity/);
  assert.match(sources.admin,/platform\.platformName/);
  assert.match(sources.invitePage,/getPlatformIdentity/);
  assert.match(sources.invite,/platform\.platformName/);
  assert.match(sources.healthApi,/getPlatformIdentity/);
  assert.match(sources.health,/data\.platform\?\.shortName/);
  assert.match(sources.enterprisePage,/getPlatformIdentity/);
  assert.match(sources.enterprise,/platform\.poweredByWording/);
  assert.match(sources.error,/DEFAULT_PLATFORM_IDENTITY\.shortName/);
  assert.match(sources.loading,/DEFAULT_PLATFORM_IDENTITY\.shortName/);
  assert.match(sources.notFound,/getPlatformIdentity/);
  assert.doesNotMatch(sources.askApi,/Ask ESTARA could not answer/);

  for(const name of covered)assert.match(sources[`${name}Page`],/getPlatformIdentity/,`${name} page should resolve platform identity`);
  for(const name of [...covered,"reports","record","portal","shortlist"])assert.match(sources[name],/platform\.(shortName|poweredByWording)/,`${name} client should consume platform identity`);
  for(const source of["subscription","seller","admin","invite","health","enterprise","reports","record","portal","shortlist",...covered])assert.doesNotMatch(sources[source],/ESTARA <small>|<strong>ESTARA|<span>ESTARA|Ask ESTARA|ESTARA universal|ESTARA stores|Return to ESTARA|ESTARA SHORTLIST|ESTARA PRODUCTION/);
  assert.match(sources.checklist,/landing, workspace shell, billing, seller portal, platform admin, invite, health, contacts, branches, pipeline, deals, matching, marketing studio, operations, roles, search, Ask, developer, reports, property record, property portal and shortlist branding now read platform settings/);
});
