import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { PlanLimitError, requireEntitlement } from "../../../db/entitlements";
import { ESTARA_TENANT_DOMAIN_SUFFIX, hostedTenantHost } from "../../../db/domain.ts";

export const dynamic = "force-dynamic";

const clean = (value: unknown, max = 255) => String(value ?? "").trim().slice(0, max);
const statuses = new Set(["setup_required", "checking", "verified", "ssl_pending", "active", "failed", "disabled"]);

function normalizeDomain(value: unknown) {
  const domain = clean(value).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  if (domain.length < 4 || domain.length > 253 || domain.includes("..")) return "";
  const labels = domain.split(".");
  if (labels.length < 2) return "";
  if (!labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return "";
  if (labels.at(-1)!.length < 2) return "";
  return domain;
}

async function domainTarget(agencySlug: string) {
  const platform = await env.DB.prepare("SELECT domain,tenant_domain_suffix FROM platform_settings WHERE id='default'").first<{ domain?: string; tenant_domain_suffix?: string }>();
  return hostedTenantHost(agencySlug, clean(platform?.tenant_domain_suffix || platform?.domain || env.PUBLIC_SITE_DOMAIN || ESTARA_TENANT_DOMAIN_SUFFIX));
}

async function context(requireCustomDomains = true) {
  const user = await getChatGPTUser();
  if (!user) return null;
  const workspace = await requireWorkspace(user);
  await requirePermission(workspace, "agency.settings.manage");
  let customDomainsEligible = true;
  try {
    await requireEntitlement(workspace.agencyId, user.userId, "customDomains");
  } catch (error) {
    if (requireCustomDomains) throw error;
    customDomainsEligible = false;
  }
  return { user, workspace, customDomainsEligible };
}

function fail(error: unknown) {
  if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
  if (error instanceof PlanLimitError) return Response.json({ error: error.message }, { status: 402 });
  return Response.json({ error: "Domain settings could not be updated." }, { status: 500 });
}

export async function GET() {
  try {
    const c = await context(false);
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const agency = await env.DB.prepare("SELECT slug FROM agencies WHERE id=?").bind(c.workspace.agencyId).first<{ slug: string }>();
    const defaultSiteUrl = agency?.slug ? await domainTarget(agency.slug) : "";
    const rows = await env.DB.prepare("SELECT id,domain,ownership_token AS ownershipToken,expected_cname AS expectedCname,status,failure_reason AS failureReason,verified_at AS verifiedAt,ssl_requested_at AS sslRequestedAt,activated_at AS activatedAt,disabled_at AS disabledAt,created_at AS createdAt FROM custom_domains WHERE agency_id=? ORDER BY created_at DESC").bind(c.workspace.agencyId).all();
    return Response.json({
      customDomainsEligible: c.customDomainsEligible,
      defaultSiteUrl: defaultSiteUrl ? `https://${defaultSiteUrl}` : "",
      defaultSiteHost: defaultSiteUrl,
      domains: rows.results.map((row: any) => ({ ...row, txtName: `_estara-domain.${row.domain}`, txtValue: row.ownershipToken })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const domain = normalizeDomain(body.domain);
    if (!domain) return Response.json({ error: "Enter a valid domain name." }, { status: 400 });
    const agency = await env.DB.prepare("SELECT slug FROM agencies WHERE id=?").bind(c.workspace.agencyId).first<{ slug: string }>();
    const expectedCname = await domainTarget(agency?.slug || "");
    if (!expectedCname) return Response.json({ error: "Platform domain routing is not configured yet." }, { status: 409 });
    const id = crypto.randomUUID();
    const token = `estara-domain-${crypto.randomUUID().replaceAll("-", "")}`;
    await env.DB.prepare("INSERT INTO custom_domains(id,agency_id,domain,ownership_token,expected_cname,status,created_by) VALUES(?,?,?,?,?,'setup_required',?)").bind(id, c.workspace.agencyId, domain, token, expectedCname, c.user.userId).run();
    await writeAudit(c.workspace, "domain.created", "custom_domain", id, { domain });
    return Response.json({ domain: { id, domain, ownershipToken: token, expectedCname, status: "setup_required", txtName: `_estara-domain.${domain}`, txtValue: token } }, { status: 201 });
  } catch (error: any) {
    if (String(error?.message || "").includes("UNIQUE")) return Response.json({ error: "That domain is already connected to an agency." }, { status: 409 });
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const id = clean(body.id, 100), action = clean(body.action, 40);
    const row = await env.DB.prepare("SELECT id,domain,ownership_token AS ownershipToken,expected_cname AS expectedCname,status FROM custom_domains WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).first<any>();
    if (!row) return Response.json({ error: "Domain was not found." }, { status: 404 });
    if (action === "check_dns") {
      const observedTxt = clean(body.observedTxt, 300);
      const observedCname = clean(body.observedCname, 300).toLowerCase().replace(/\.$/, "");
      const verified = observedTxt === row.ownershipToken && observedCname === row.expectedCname.toLowerCase();
      const status = verified ? "verified" : "failed";
      await env.DB.prepare("UPDATE custom_domains SET status=?,failure_reason=?,verified_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE verified_at END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(status, verified ? null : "TXT ownership token or CNAME target does not match.", verified ? 1 : 0, id, c.workspace.agencyId).run();
      await writeAudit(c.workspace, "domain.dns_checked", "custom_domain", id, { domain: row.domain, verified });
      return Response.json({ status, verified });
    }
    if (action === "request_ssl") {
      if (row.status !== "verified") return Response.json({ error: "Verify DNS ownership before requesting TLS activation." }, { status: 409 });
      await env.DB.prepare("UPDATE custom_domains SET status='ssl_pending',ssl_requested_at=CURRENT_TIMESTAMP,failure_reason='Awaiting hosting provider certificate activation.',updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).run();
      await writeAudit(c.workspace, "domain.ssl_requested", "custom_domain", id, { domain: row.domain });
      return Response.json({ status: "ssl_pending" });
    }
    if (action === "activate") {
      if (!["verified", "ssl_pending"].includes(row.status)) return Response.json({ error: "Only a verified domain can be activated." }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE custom_domains SET status='disabled',disabled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE agency_id=? AND status='active'").bind(c.workspace.agencyId),
        env.DB.prepare("UPDATE custom_domains SET status='active',activated_at=CURRENT_TIMESTAMP,failure_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId),
      ]);
      await writeAudit(c.workspace, "domain.activated", "custom_domain", id, { domain: row.domain });
      return Response.json({ status: "active" });
    }
    if (action === "disable") {
      await env.DB.prepare("UPDATE custom_domains SET status='disabled',disabled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).run();
      await writeAudit(c.workspace, "domain.disabled", "custom_domain", id, { domain: row.domain });
      return Response.json({ status: "disabled" });
    }
    if (statuses.has(action)) return Response.json({ error: "Use an explicit domain lifecycle action." }, { status: 400 });
    return Response.json({ error: "Unsupported domain action." }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const id = clean(new URL(request.url).searchParams.get("id"), 100);
    const row = await env.DB.prepare("SELECT id,domain,status FROM custom_domains WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).first<any>();
    if (!row) return Response.json({ error: "Domain was not found." }, { status: 404 });
    if (row.status === "active") return Response.json({ error: "Disable the active domain before deleting it." }, { status: 409 });
    await env.DB.prepare("DELETE FROM custom_domains WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).run();
    await writeAudit(c.workspace, "domain.deleted", "custom_domain", id, { domain: row.domain });
    return Response.json({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
