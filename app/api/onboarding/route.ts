import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { invalidatePublicSite } from "../../../db/public-cache";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { isTypographyKey, isWebsiteTemplateKey, typographyForTemplate } from "../../../db/website-templates";
import { RESERVED_TENANT_SUBDOMAINS } from "../../../db/domain.ts";

const clean = (v: unknown, n = 160) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const hex = (v: unknown, fallback: string) => {
  const value = clean(v, 20).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(value) ? value : fallback;
};
const numberInRange = (v: unknown, fallback: number, min: number, max: number) => {
  const value = Number(v);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
};

export async function POST(r: Request) {
  try {
    const u = await getChatGPTUser();
    if (!u) return Response.json({ error: "Sign in is required." }, { status: 401 });

    const w = await requireWorkspace(u);
    await requirePermission(w, "agency.settings.manage");

    const b = (await r.json()) as Record<string, unknown>;
    const name = clean(b.name);
    const tagline = clean(b.tagline, 180);
    const phone = clean(b.phone, 40);
    const whatsapp = clean(b.whatsapp, 40) || phone;
    const email = clean(b.email, 180).toLowerCase();
    const slug = clean(b.slug, 60).toLowerCase();
    const primaryColor = hex(b.primaryColor, "#153b34");
    const accentColor = hex(b.accentColor, "#e6bd5f");
    const template = clean(b.websiteTemplate, 30);
    const requestedTypography = clean(b.typography, 30);
    const typography = isTypographyKey(requestedTypography) ? requestedTypography : typographyForTemplate(template);
    const responseSlaMinutes = numberInRange(b.responseSlaMinutes, 30, 5, 1440);
    const activities = Array.isArray(b.businessActivities)
      ? b.businessActivities.map((x) => clean(x, 40)).filter(Boolean).slice(0, 12)
      : [];

    if (
      !name ||
      !phone ||
      !activities.length ||
      !isWebsiteTemplateKey(template) ||
      !/^[a-z][a-z0-9-]{3,58}[a-z0-9]$/.test(slug) ||
      slug.includes("--")
    ) {
      return Response.json({ error: "Complete every onboarding step with a valid subdomain." }, { status: 400 });
    }

    if (RESERVED_TENANT_SUBDOMAINS.has(slug)) {
      return Response.json({ error: "That subdomain is reserved for ESTARA system use." }, { status: 409 });
    }

    const taken = await env.DB.prepare("SELECT id FROM agencies WHERE slug=? AND id<>?")
      .bind(slug, w.agencyId)
      .first();
    if (taken) return Response.json({ error: "That subdomain is already in use." }, { status: 409 });

    await env.DB.batch([
      env.DB.prepare("UPDATE agencies SET name=?,slug=? WHERE id=?").bind(name, slug, w.agencyId),
      env.DB.prepare(
        "UPDATE agency_settings SET tagline=?,primary_color=?,accent_color=?,phone=?,whatsapp=?,email=?,business_activities=?,website_template=?,typography=?,response_sla_minutes=?,onboarding_complete=1,updated_at=CURRENT_TIMESTAMP WHERE agency_id=?",
      ).bind(
        tagline,
        primaryColor,
        accentColor,
        phone,
        whatsapp,
        email,
        JSON.stringify(activities),
        template,
        typography,
        responseSlaMinutes,
        w.agencyId,
      ),
    ]);

    await invalidatePublicSite(w.agencyId);
    await writeAudit(w, "agency.onboarding.completed", "agency", w.agencyId, {
      name,
      slug,
      template,
      typography,
      activities,
      primaryColor,
      accentColor,
    });

    return Response.json({
      agency: {
        name,
        tagline,
        primaryColor,
        accentColor,
        phone,
        whatsapp,
        email,
        slug,
        websiteTemplate: template,
        typography,
        responseSlaMinutes,
        businessActivities: activities,
        onboardingComplete: true,
      },
    });
  } catch (e) {
    if (e instanceof AuthorizationError) return Response.json({ error: e.message }, { status: 403 });
    return Response.json({ error: "Onboarding could not be completed." }, { status: 500 });
  }
}
