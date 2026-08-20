import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { invalidatePublicSite } from "../../../db/public-cache";
import { requireWorkspace } from "../../../db/workspace";
import { isTypographyKey, isWebsiteTemplateKey } from "../../../db/website-templates";

export const dynamic = "force-dynamic";

const safe = (value: unknown, length = 120) => (typeof value === "string" ? value.trim().slice(0, length) : "");
const safeImageId = (value: unknown) => safe(value, 100);
const safeContent = (value: unknown) => {
  const input = typeof value === "object" && value ? (value as Record<string, unknown>) : {};
  return {
    homeHeadline: safe(input.homeHeadline, 90),
    homeIntro: safe(input.homeIntro, 260),
    propertiesIntro: safe(input.propertiesIntro, 220),
    saleIntro: safe(input.saleIntro, 220),
    rentIntro: safe(input.rentIntro, 220),
    agentsIntro: safe(input.agentsIntro, 220),
    servicesIntro: safe(input.servicesIntro, 260),
    aboutIntro: safe(input.aboutIntro, 260),
    contactIntro: safe(input.contactIntro, 220),
    homeHeroImageId: safeImageId(input.homeHeroImageId),
    featuredImageId: safeImageId(input.featuredImageId),
    propertiesHeroImageId: safeImageId(input.propertiesHeroImageId),
    saleHeroImageId: safeImageId(input.saleHeroImageId),
    rentHeroImageId: safeImageId(input.rentHeroImageId),
    agentsHeroImageId: safeImageId(input.agentsHeroImageId),
    servicesHeroImageId: safeImageId(input.servicesHeroImageId),
    aboutHeroImageId: safeImageId(input.aboutHeroImageId),
    contactHeroImageId: safeImageId(input.contactHeroImageId),
  };
};
const imageContentKeys = ["homeHeroImageId", "featuredImageId", "propertiesHeroImageId", "saleHeroImageId", "rentHeroImageId", "agentsHeroImageId", "servicesHeroImageId", "aboutHeroImageId", "contactHeroImageId"] as const;
async function hasAgencySettingsColumn(column: string) {
  const rows = await env.DB.prepare("PRAGMA table_info(agency_settings)").all<{ name: string }>();
  return rows.results.some((row) => row.name === column);
}
async function ensurePublicContentColumn() {
  if (!(await hasAgencySettingsColumn("public_content"))) {
    await env.DB.prepare("ALTER TABLE agency_settings ADD COLUMN public_content TEXT NOT NULL DEFAULT '{}'").run();
  }
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const w = await requireWorkspace(user);
  const [platform, agency, logo] = await Promise.all([
    env.DB.prepare("SELECT * FROM platform_settings WHERE id='default'").first(),
    env.DB.prepare("SELECT a.name,a.slug,s.* FROM agencies a JOIN agency_settings s ON s.agency_id=a.id WHERE a.id=?")
      .bind(w.agencyId)
      .first(),
    env.DB.prepare("SELECT id FROM media_assets WHERE agency_id=? AND kind='agency_logo' LIMIT 1")
      .bind(w.agencyId)
      .first<{ id: string }>(),
  ]);
  return Response.json({ platform, agency: { ...(agency || {}), logo_id: logo?.id || null } });
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const w = await requireWorkspace(user);
    await requirePermission(w, "agency.settings.manage");
    const body = (await request.json()) as Record<string, unknown>;
    const name = safe(body.name);
    const tagline = safe(body.tagline);
    const primary = safe(body.primaryColor, 20);
    const accent = safe(body.accentColor, 20);
    const phone = safe(body.phone, 40);
    const whatsapp = safe(body.whatsapp, 40);
    const email = safe(body.email, 160);
    const website = safe(body.website, 240);
    const template = safe(body.websiteTemplate, 30);
    const websiteTemplate = isWebsiteTemplateKey(template) ? template : "classic";
    const font = safe(body.typography, 30);
    const typography = isTypographyKey(font) ? font : "classic";
    const responseSlaMinutes = Math.min(1440, Math.max(5, Math.round(Number(body.responseSlaMinutes) || 30)));
    const publicContent = safeContent(body.publicContent);

    if (!name || !/^#[0-9a-f]{6}$/i.test(primary) || !/^#[0-9a-f]{6}$/i.test(accent)) {
      return Response.json({ error: "A name and valid brand colours are required." }, { status: 400 });
    }
    await ensurePublicContentColumn();
    for (const key of imageContentKeys) {
      const mediaId = publicContent[key];
      if (mediaId && !await env.DB.prepare("SELECT id FROM media_assets WHERE id=? AND agency_id=? AND kind='website_image'").bind(mediaId, w.agencyId).first()) {
        return Response.json({ error: "Choose only agency-owned website images." }, { status: 400 });
      }
    }

    await env.DB.batch([
      env.DB.prepare("UPDATE agencies SET name=? WHERE id=?").bind(name, w.agencyId),
      env.DB.prepare(
        "UPDATE agency_settings SET tagline=?,primary_color=?,accent_color=?,phone=?,whatsapp=?,email=?,website=?,website_template=?,typography=?,public_content=?,response_sla_minutes=?,updated_at=CURRENT_TIMESTAMP WHERE agency_id=?",
      ).bind(
        tagline,
        primary,
        accent,
        phone,
        whatsapp,
        email,
        website,
        websiteTemplate,
        typography,
        JSON.stringify(publicContent),
        responseSlaMinutes,
        w.agencyId,
      ),
    ]);
    await writeAudit(w, "agency.settings.updated", "agency", w.agencyId, {
      name,
      primary,
      accent,
      websiteTemplate,
      typography,
      publicContent: true,
    });
    await invalidatePublicSite(w.agencyId);
    return Response.json({
      agency: {
        name,
        tagline,
        primaryColor: primary,
        accentColor: accent,
        phone,
        whatsapp,
        email,
        website,
        websiteTemplate,
        typography,
        publicContent,
        responseSlaMinutes,
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Settings could not be updated." }, { status: 500 });
  }
}
