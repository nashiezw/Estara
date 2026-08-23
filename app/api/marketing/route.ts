import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { MARKETING_FORMATS, factualCopy, renderMarketingJob } from "../../../db/marketing-render";
import { accessiblePropertyIds, requirePropertyBranchAccess } from "../../../db/access-scope";
import { ESTARA_TENANT_DOMAIN_SUFFIX, hostedTenantUrl } from "../../../db/domain.ts";

const dynamic = "force-dynamic";
const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);

async function context() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const workspace = await requireWorkspace(user);
  await requirePermission(workspace, "property.publish");
  return { user, workspace };
}

const fail = (error: unknown) =>
  error instanceof AuthorizationError
    ? Response.json({ error: error.message }, { status: 403 })
    : Response.json({ error: String(error).slice(0, 300) || "Marketing operation failed." }, { status: 500 });
const designIcons = new Set(["home", "key", "pin", "camera"]);
const cleanDesignSettings = (value: unknown) => {
  const input = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const icon = clean(input.icon, 20);
  const textAlign = clean(input.textAlign, 20);
  return {
    photoMediaId: clean(input.photoMediaId, 100),
    photoUrl: /^https?:\/\//.test(clean(input.photoUrl, 800)) ? clean(input.photoUrl, 800) : "",
    badge: clean(input.badge, 48) || "Just listed",
    icon: designIcons.has(icon) ? icon : "home",
    showLogo: input.showLogo !== false,
    textAlign: textAlign === "center" ? "center" : "left",
  };
};

async function ensureTemplates(agencyId: string, userId: string) {
  await env.DB.batch(Object.entries(MARKETING_FORMATS).map(([key, spec]) =>
    env.DB.prepare("INSERT OR IGNORE INTO marketing_template_versions(id,agency_id,template_key,version,name,format,width,height,configuration,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,'published',?)")
      .bind(crypto.randomUUID(), agencyId, key, 1, spec.name, key, spec.width, spec.height, JSON.stringify({ layout: "signature", factBound: true }), userId)
  ));
}

async function propertySnapshot(agencyId: string, propertyId: string) {
  const [property, agency, hero] = await Promise.all([
    env.DB.prepare("SELECT * FROM properties WHERE id=? AND agency_id=?").bind(propertyId, agencyId).first<any>(),
    env.DB.prepare("SELECT a.id,a.name,a.slug,s.primary_color AS primaryColor,s.accent_color AS accentColor,s.typography,s.phone,s.whatsapp,s.email,s.website FROM agencies a JOIN agency_settings s ON s.agency_id=a.id WHERE a.id=?").bind(agencyId).first<any>(),
    env.DB.prepare("SELECT id FROM media_assets WHERE agency_id=? AND property_id=? AND kind='property_photo' ORDER BY sort_order,created_at LIMIT 1").bind(agencyId, propertyId).first<any>(),
  ]);
  if (!property) return null;
  return {
    property: {
      id: property.id,
      reference: property.reference,
      title: property.title,
      location: property.location,
      priceMinor: property.price_minor,
      currency: property.currency,
      transactionType: property.transaction_type,
      propertyType: property.property_type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      landSize: property.land_size,
      buildingSize: property.building_size,
      city: property.city,
      suburb: property.suburb,
      address: property.address,
      description: property.description,
      features: JSON.parse(property.features || "[]"),
    },
    agency,
    photoUrl: hero?.id ? `/api/media?id=${encodeURIComponent(hero.id)}` : "",
  };
}

async function GET() {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    await ensureTemplates(c.workspace.agencyId, c.user.userId);
    const [agency, properties, photos, templates, jobs, copies] = await Promise.all([
      env.DB.prepare("SELECT a.id,a.name,a.slug,s.primary_color AS primaryColor,s.accent_color AS accentColor,s.typography,s.phone,s.whatsapp,s.email,s.website FROM agencies a JOIN agency_settings s ON s.agency_id=a.id WHERE a.id=?").bind(c.workspace.agencyId).first(),
      env.DB.prepare(`SELECT p.id,p.reference,p.title,p.location,p.status,p.price_label AS price,p.price_minor AS priceMinor,p.currency,p.transaction_type AS transactionType,p.property_type AS propertyType,p.bedrooms,p.bathrooms,p.land_size AS landSize,p.building_size AS buildingSize,p.city,p.suburb,p.address,p.description,p.features,p.photo_count AS photos,(SELECT m.id FROM media_assets m WHERE m.agency_id=p.agency_id AND m.property_id=p.id AND m.kind='property_photo' ORDER BY m.sort_order,m.created_at LIMIT 1) AS heroMediaId FROM properties p WHERE p.agency_id=? ORDER BY p.updated_at DESC`).bind(c.workspace.agencyId).all<any>(),
      env.DB.prepare("SELECT id,property_id AS propertyId,sort_order AS sortOrder FROM media_assets WHERE agency_id=? AND kind='property_photo' ORDER BY property_id,sort_order,created_at LIMIT 300").bind(c.workspace.agencyId).all<any>(),
      env.DB.prepare("SELECT id,template_key AS templateKey,version,name,format,width,height FROM marketing_template_versions WHERE agency_id=? AND status='published' ORDER BY format").bind(c.workspace.agencyId).all(),
      env.DB.prepare("SELECT j.id,j.property_id AS propertyId,j.format,j.status,j.attempts,j.review_status AS reviewStatus,j.last_error AS lastError,j.created_at AS createdAt,p.title,o.id AS outputId,o.kind,o.content_type AS contentType,o.byte_size AS byteSize FROM marketing_render_jobs j JOIN properties p ON p.id=j.property_id AND p.agency_id=j.agency_id LEFT JOIN marketing_outputs o ON o.job_id=j.id AND o.agency_id=j.agency_id WHERE j.agency_id=? ORDER BY j.created_at DESC LIMIT 80").bind(c.workspace.agencyId).all<any>(),
      env.DB.prepare("SELECT id,property_id AS propertyId,version,headline,listing_description AS listingDescription,social_caption AS socialCaption,status,created_at AS createdAt FROM marketing_copy_versions WHERE agency_id=? ORDER BY created_at DESC LIMIT 50").bind(c.workspace.agencyId).all<any>(),
    ]);
    const scope = await accessiblePropertyIds(c.workspace);
    const visibleProperties = scope ? properties.results.filter((row) => scope.has(row.id)) : properties.results;
    const photosByProperty = new Map<string, any[]>();
    for (const photo of photos.results) {
      if (scope && !scope.has(photo.propertyId)) continue;
      const list = photosByProperty.get(photo.propertyId) || [];
      if (list.length < 8) list.push({ id: photo.id, url: `/api/media?id=${encodeURIComponent(photo.id)}`, label: `Photo ${list.length + 1}` });
      photosByProperty.set(photo.propertyId, list);
    }
    return Response.json({
      agency,
      properties: visibleProperties.map((row) => ({
        ...row,
        features: JSON.parse(row.features || "[]"),
        photoUrl: row.heroMediaId ? `/api/media?id=${encodeURIComponent(row.heroMediaId)}` : "",
        media: photosByProperty.get(row.id) || [],
      })),
      templates: templates.results,
      jobs: scope ? jobs.results.filter((row) => scope.has(row.propertyId)) : jobs.results,
      copies: scope ? copies.results.filter((row) => scope.has(row.propertyId)) : copies.results,
      formats: MARKETING_FORMATS,
    });
  } catch (error) {
    return fail(error);
  }
}

async function POST(request: Request) {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    await ensureTemplates(c.workspace.agencyId, c.user.userId);
    const body = await request.json() as Record<string, unknown>;
    const action = clean(body.action, 30);
    const propertyId = clean(body.propertyId, 100);
    const snapshot = propertyId ? await propertySnapshot(c.workspace.agencyId, propertyId) : null;
    if (propertyId && !snapshot) return Response.json({ error: "Property was not found." }, { status: 404 });
    if (propertyId) await requirePropertyBranchAccess(c.workspace, propertyId);

    if (action === "create_copy" && snapshot) {
      const copy = factualCopy(snapshot.property);
      const previous = await env.DB.prepare("SELECT MAX(version) AS version FROM marketing_copy_versions WHERE agency_id=? AND property_id=?").bind(c.workspace.agencyId, propertyId).first<any>();
      const version = Number(previous?.version || 0) + 1;
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO marketing_copy_versions(id,agency_id,property_id,version,headline,listing_description,social_caption,facts_snapshot,status,created_by) VALUES(?,?,?,?,?,?,?,?,'draft',?)")
        .bind(id, c.workspace.agencyId, propertyId, version, copy.headline, copy.listingDescription, copy.socialCaption, JSON.stringify(snapshot.property), c.user.userId).run();
      await writeAudit(c.workspace, "marketing.copy.drafted", "marketing_copy", id, { propertyId, version });
      return Response.json({ copy: { id, version, ...copy, status: "draft" } }, { status: 201 });
    }

    if (action === "render" && snapshot) {
      const formats = Array.isArray(body.formats) ? [...new Set(body.formats.map(String))].filter((format) => format in MARKETING_FORMATS).slice(0, 9) : [];
      if (!formats.length) return Response.json({ error: "Choose at least one output format." }, { status: 400 });
      const copyRow = await env.DB.prepare("SELECT headline,listing_description AS listingDescription,social_caption AS socialCaption FROM marketing_copy_versions WHERE agency_id=? AND property_id=? AND status='approved' ORDER BY version DESC LIMIT 1")
        .bind(c.workspace.agencyId, propertyId).first<any>();
      if (!copyRow) return Response.json({ error: "Approve factual marketing copy before rendering outputs." }, { status: 409 });
      const tenantSuffix = await env.DB.prepare("SELECT tenant_domain_suffix AS tenantDomainSuffix FROM platform_settings WHERE id='default'").first<{ tenantDomainSuffix?: string }>();
      const shareUrl = hostedTenantUrl(snapshot.agency.slug, tenantSuffix?.tenantDomainSuffix || env.PUBLIC_SITE_DOMAIN || ESTARA_TENANT_DOMAIN_SUFFIX, `/properties/${encodeURIComponent(propertyId)}`);
      const facts = factualCopy(snapshot.property);
      const design = clean(body.design, 40) || "signature";
      const designSettings = cleanDesignSettings(body.designSettings);
      if (designSettings.photoMediaId) {
        const media = await env.DB.prepare("SELECT id FROM media_assets WHERE id=? AND agency_id=? AND property_id=? AND kind='property_photo'").bind(designSettings.photoMediaId, c.workspace.agencyId, propertyId).first();
        if (!media) return Response.json({ error: "Selected marketing image was not found for this property." }, { status: 404 });
        designSettings.photoUrl = `/api/media?id=${encodeURIComponent(designSettings.photoMediaId)}`;
      }
      const inputSnapshot = JSON.stringify({ ...snapshot, design, designSettings, photoUrl: designSettings.photoUrl || snapshot.photoUrl, copy: { ...copyRow, facts: facts.facts }, shareUrl });
      const created = [];
      for (const format of formats) {
        const template = await env.DB.prepare("SELECT id FROM marketing_template_versions WHERE agency_id=? AND format=? AND status='published' ORDER BY version DESC LIMIT 1").bind(c.workspace.agencyId, format).first<any>();
        if (!template) continue;
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO marketing_render_jobs(id,agency_id,property_id,template_version_id,format,status,input_snapshot,created_by) VALUES(?,?,?,?,?,'running',?,?)")
          .bind(id, c.workspace.agencyId, propertyId, template.id, format, inputSnapshot, c.user.userId).run();
        try {
          const output = await renderMarketingJob(id, c.workspace.agencyId);
          created.push({ id, format, ...output });
        } catch (error) {
          await env.DB.prepare("UPDATE marketing_render_jobs SET status='failed',attempts=attempts+1,last_error=? WHERE id=? AND agency_id=?").bind(String(error).slice(0, 500), id, c.workspace.agencyId).run();
        }
      }
      await writeAudit(c.workspace, "marketing.outputs.rendered", "property", propertyId, { formats, design });
      return Response.json({ created }, { status: 201 });
    }

    if (action === "retry") {
      const jobId = clean(body.jobId, 100);
      const job = await env.DB.prepare("SELECT id FROM marketing_render_jobs WHERE id=? AND agency_id=? AND status='failed'").bind(jobId, c.workspace.agencyId).first();
      if (!job) return Response.json({ error: "Failed render job was not found." }, { status: 404 });
      await env.DB.prepare("UPDATE marketing_render_jobs SET status='running',attempts=attempts+1,last_error=NULL WHERE id=? AND agency_id=?").bind(jobId, c.workspace.agencyId).run();
      try {
        const output = await renderMarketingJob(jobId, c.workspace.agencyId);
        return Response.json({ output });
      } catch (error) {
        await env.DB.prepare("UPDATE marketing_render_jobs SET status=CASE WHEN attempts>=5 THEN 'dead_letter' ELSE 'failed' END,last_error=? WHERE id=? AND agency_id=?").bind(String(error).slice(0, 500), jobId, c.workspace.agencyId).run();
        throw error;
      }
    }

    return Response.json({ error: "Unknown marketing action." }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}

async function PATCH(request: Request) {
  try {
    const c = await context();
    if (!c) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const action = clean(body.action, 30);
    const id = clean(body.id, 100);
    const linked = action === "approve_copy" || action === "update_copy"
      ? await env.DB.prepare("SELECT property_id propertyId FROM marketing_copy_versions WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).first<any>()
      : await env.DB.prepare("SELECT property_id propertyId FROM marketing_render_jobs WHERE id=? AND agency_id=?").bind(id, c.workspace.agencyId).first<any>();
    if (linked) await requirePropertyBranchAccess(c.workspace, linked.propertyId);

    if (action === "update_copy") {
      const headline = clean(body.headline, 180);
      const listingDescription = clean(body.listingDescription, 1200);
      const socialCaption = clean(body.socialCaption, 900);
      if (!headline || !listingDescription || !socialCaption) return Response.json({ error: "Headline, description and caption are required." }, { status: 400 });
      const result = await env.DB.prepare("UPDATE marketing_copy_versions SET headline=?,listing_description=?,social_caption=? WHERE id=? AND agency_id=? AND status='draft'")
        .bind(headline, listingDescription, socialCaption, id, c.workspace.agencyId).run();
      if (!result.meta.changes) return Response.json({ error: "Draft copy was not found." }, { status: 404 });
      await writeAudit(c.workspace, "marketing.copy.edited", "marketing_copy", id);
      return Response.json({ saved: true });
    }

    if (action === "approve_copy") {
      const result = await env.DB.prepare("UPDATE marketing_copy_versions SET status='approved',approved_by=?,approved_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status='draft'")
        .bind(c.user.userId, id, c.workspace.agencyId).run();
      if (!result.meta.changes) return Response.json({ error: "Draft copy was not found." }, { status: 404 });
      await writeAudit(c.workspace, "marketing.copy.approved", "marketing_copy", id);
      return Response.json({ approved: true });
    }

    if (action === "approve_output") {
      const result = await env.DB.prepare("UPDATE marketing_render_jobs SET review_status='approved',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status='complete'")
        .bind(c.user.userId, id, c.workspace.agencyId).run();
      if (!result.meta.changes) return Response.json({ error: "Completed output was not found." }, { status: 404 });
      await writeAudit(c.workspace, "marketing.output.approved", "marketing_job", id);
      return Response.json({ approved: true });
    }

    return Response.json({ error: "Unknown marketing review action." }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}

export { GET, PATCH, POST, dynamic };
