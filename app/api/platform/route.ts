import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { PLAN_ENTITLEMENT_KEYS, PLAN_LIMIT_DEFAULTS, ensurePlanCatalog } from "../../../db/entitlements";
import { PlatformAuthorizationError, requirePlatformUser, writePlatformAudit, type PlatformContext, type PlatformRole } from "../../../db/platform-auth";
import { calculateInvoiceDiscount, canReviewManualPayment, canSetAgencyStatus, canTransitionSubscription, invoiceTotal } from "../../../db/billing-policy";
import { ensurePlatformIdentity, getPlatformIdentity } from "../../../db/platform-settings";

export const dynamic = "force-dynamic";

const roles = ["super_admin", "support", "finance"] as const;
const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max);
const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const jsonRecord = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const hex = (value: unknown) => {
  const raw = clean(value, 20).replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toLowerCase()}` : "";
};
const planEntitlements = (value: unknown) => {
  const raw = jsonRecord(value);
  return Object.fromEntries(PLAN_ENTITLEMENT_KEYS.map(key => [key, raw[key] === true]));
};
const planLimits = (value: unknown) => {
  const raw = jsonRecord(value), limits: Record<string, number> = {};
  for (const [key, fallback] of Object.entries(PLAN_LIMIT_DEFAULTS)) {
    const next = Math.max(0, Math.round(Number(raw[key] ?? fallback)));
    limits[key] = Number.isFinite(next) ? next : fallback;
  }
  return limits;
};
const periodDays = (limits: Record<string, number>, state: "trialing" | "active") => state === "trialing" ? Math.max(1, limits.trialDays || 14) : 30;
const jsonArray = (value: unknown) => Array.isArray(value) ? value.map(item => clean(item, 120)).filter(Boolean) : [];
const paymentTypeOk = (value: string) => ["bank_transfer","ecocash","onemoney","innbucks","cash","mobile_money","stripe","other"].includes(value);

async function actor(allowed: readonly PlatformRole[] = roles) {
  const user = await getChatGPTUser();
  if (!user) return null;
  return { user, context: await requirePlatformUser(user, allowed) };
}

const failure = (error: unknown) =>
  error instanceof PlatformAuthorizationError
    ? Response.json({ error: error.message }, { status: 403 })
    : Response.json({ error: "Platform operation could not be completed." }, { status: 500 });

async function event(context: PlatformContext, agencyId: string, subscriptionId: string | null, invoiceId: string | null, eventType: string, detail: Record<string, unknown> = {}) {
  await env.DB.prepare("INSERT INTO billing_events (id,agency_id,subscription_id,invoice_id,event_type,detail,actor_user_id) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), agencyId, subscriptionId, invoiceId, eventType, JSON.stringify(detail), context.userId).run();
}

const agencyDeleteTables = [
  "webhook_deliveries","webhook_subscriptions","credential_security_events","api_request_events","api_idempotency_keys","api_credentials",
  "integration_sync_runs","integration_field_maps","integration_connections","ai_drafts","portal_document_shares","property_portal_updates",
  "lease_renewals","inspection_reports","inspection_media_assets","property_inspections","maintenance_media_assets","maintenance_updates",
  "maintenance_requests","contractors","property_portal_grants","landlord_statements","property_expenses","tenancy_deposits","rent_receipts",
  "payment_allocations","rent_payments","rent_charges","leases","managed_properties","backup_snapshots","deal_commission_splits","deal_stage_events",
  "deals","deal_stages","shortlist_items","shortlists","property_matches","property_requirements","seller_deliveries","seller_report_schedules",
  "offers","document_permissions","document_access_tokens","documents","marketing_outputs","marketing_render_jobs","marketing_template_versions",
  "marketing_copy_versions","notification_deliveries","notifications","automation_executions","automation_rule_versions","domain_events",
  "property_status_events","property_activation_channels","property_verification_items","mandates","property_feature_definitions","billing_events",
  "billing_payment_requests","billing_invoices","agency_subscriptions","development_units","developments","enterprise_branding","seller_reports","seller_access_grants",
  "media_assets","public_events","public_intake_attempts","viewings","contact_activities","agent_profiles","team_invitations","roles","audit_logs",
  "custom_domains","agency_settings","next_actions","enquiries","properties","contacts","branch_memberships","branches","agency_memberships",
] as const;
const tableNameOk = (name: string) => /^[a-z_]+$/.test(name);
async function agencyTablesInDeleteOrder() {
  const rows = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{ name: string }>();
  const existing = new Set(rows.results.map(row => row.name)), tables = new Set<string>();
  for (const row of rows.results) {
    if (!tableNameOk(row.name)) continue;
    const columns = await env.DB.prepare(`PRAGMA table_info(${row.name})`).all<{ name: string }>();
    if (columns.results.some(column => column.name === "agency_id")) tables.add(row.name);
  }
  const ordered = agencyDeleteTables.filter(table => existing.has(table) && tables.has(table));
  const extra = [...tables].filter(table => !agencyDeleteTables.includes(table as any)).sort();
  return { existing, ordered: [...extra, ...ordered] };
}
async function deleteTenantObjects(agencyId: string) {
  const bucket = (env as any).MEDIA;
  if (!bucket) throw new Error("Tenant media storage is unavailable.");
  let cursor: string | undefined, objectsDeleted = 0;
  do {
    const listed = await bucket.list({ prefix: `tenants/${agencyId}/`, cursor, limit: 1000 });
    const keys = (listed.objects || []).map((item: { key: string }) => item.key).filter(Boolean);
    if (keys.length) {
      await bucket.delete(keys);
      objectsDeleted += keys.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return { objectsDeleted, storage: "cleared" };
}
async function hardDeleteAgency(agencyId: string) {
  const { existing, ordered } = await agencyTablesInDeleteOrder(), statements = [];
  if (existing.has("role_permissions") && existing.has("roles")) statements.push(env.DB.prepare("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE agency_id=?)").bind(agencyId));
  for (const table of ordered) if (tableNameOk(table)) statements.push(env.DB.prepare(`DELETE FROM ${table} WHERE agency_id=?`).bind(agencyId));
  statements.push(env.DB.prepare("DELETE FROM agencies WHERE id=?").bind(agencyId));
  await env.DB.batch(statements);
  const remainingAgency = await env.DB.prepare("SELECT id FROM agencies WHERE id=?").bind(agencyId).first();
  if (remainingAgency) throw new Error("Agency delete verification failed.");
  return { tablesCleared: statements.length };
}

async function platformSettingsRow() {
  await ensurePlatformIdentity();
  return env.DB.prepare(`SELECT platform_name AS platformName,short_name AS shortName,parent_brand AS parentBrand,tagline,primary_color AS primaryColor,accent_color AS accentColor,
    support_email AS supportEmail,support_phone AS supportPhone,support_whatsapp AS supportWhatsapp,default_country AS defaultCountry,
    default_currency AS defaultCurrency,timezone,domain,tenant_domain_suffix AS tenantDomainSuffix,powered_by_wording AS poweredByWording,
    logo_url AS logoUrl,icon_url AS iconUrl,dark_logo_url AS darkLogoUrl,dark_icon_url AS darkIconUrl,
    updated_at AS updatedAt FROM platform_settings WHERE id='default'`).first<any>();
}

async function operations() {
  const [counts, intakes, media, domains, openInvoices, recentAudits] = await Promise.all([
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM agencies) agencies,
      (SELECT COUNT(*) FROM agency_memberships) users,
      (SELECT COUNT(*) FROM properties) properties,
      (SELECT COUNT(*) FROM enquiries) enquiries,
      (SELECT COUNT(*) FROM viewings) viewings,
      (SELECT COUNT(*) FROM public_events WHERE created_at>datetime('now','-24 hours')) publicEvents24h,
      (SELECT COUNT(*) FROM media_assets) mediaAssets,
      (SELECT COUNT(*) FROM custom_domains WHERE status='active') activeDomains`).first<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM public_intake_attempts WHERE created_at>datetime('now','-10 minutes')").first<any>(),
    env.DB.prepare("SELECT COALESCE(SUM(byte_size),0) AS bytes,COUNT(*) AS count FROM media_assets").first<any>(),
    env.DB.prepare("SELECT status,COUNT(*) AS count FROM custom_domains GROUP BY status").all<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(total_minor),0) AS totalMinor FROM billing_invoices WHERE status='open'").first<any>(),
    env.DB.prepare("SELECT action,COUNT(*) AS count FROM audit_logs WHERE agency_id IS NULL AND created_at>datetime('now','-7 days') GROUP BY action ORDER BY count DESC LIMIT 6").all<any>(),
  ]);
  return {
    ...counts,
    publicIntake10m: intakes?.count || 0,
    mediaBytes: media?.bytes || 0,
    openInvoices: openInvoices?.count || 0,
    openInvoiceMinor: openInvoices?.totalMinor || 0,
    domains: domains.results,
    recentPlatformAudits: recentAudits.results,
  };
}

export async function GET() {
  try {
    const access = await actor();
    if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
    await ensurePlanCatalog(access.user.userId);
    const [platform, settings, platformUsers, plans, agencies, invoices, coupons, events, paymentMethods, manualPayments, ops] = await Promise.all([
      getPlatformIdentity(),
      platformSettingsRow(),
      env.DB.prepare("SELECT user_id AS userId,email,role,active,created_at AS createdAt FROM platform_users ORDER BY created_at").all(),
      env.DB.prepare("SELECT id,plan_key AS planKey,version,name,description,currency,price_minor AS priceMinor,billing_period AS billingPeriod,entitlements,limits,featured,trial_available AS trialAvailable,trial_days AS trialDays,allow_trial_without_payment AS allowTrialWithoutPayment,trial_once AS trialOnce,status,published_at AS publishedAt,(SELECT COUNT(*) FROM agency_subscriptions s WHERE s.plan_version_id=plan_versions.id) AS agenciesUsing FROM plan_versions ORDER BY plan_key,version DESC").all(),
      env.DB.prepare(`SELECT a.id,a.name,a.slug,a.status AS agencyStatus,a.disabled_at AS disabledAt,a.archived_at AS archivedAt,a.created_at AS createdAt,s.id AS subscriptionId,s.state,s.trial_ends_at AS trialEndsAt,s.grace_ends_at AS graceEndsAt,s.current_period_ends_at AS currentPeriodEndsAt,s.expired_at AS expiredAt,s.status_reason AS statusReason,s.previous_plan_version_id AS previousPlanVersionId,s.plan_changed_at AS planChangedAt,p.id AS planVersionId,p.name AS planName,prev.name AS previousPlanName,
        (SELECT COUNT(*) FROM agency_memberships m WHERE m.agency_id=a.id) AS users,
        (SELECT COUNT(*) FROM properties x WHERE x.agency_id=a.id) AS properties,
        (SELECT COUNT(*) FROM enquiries q WHERE q.agency_id=a.id) AS enquiries,
        (SELECT COUNT(*) FROM viewings v WHERE v.agency_id=a.id) AS viewings,
        (SELECT COUNT(*) FROM public_events e WHERE e.agency_id=a.id AND e.created_at>datetime('now','-24 hours')) AS publicEvents24h
        FROM agencies a LEFT JOIN agency_subscriptions s ON s.agency_id=a.id LEFT JOIN plan_versions p ON p.id=s.plan_version_id LEFT JOIN plan_versions prev ON prev.id=s.previous_plan_version_id WHERE a.status<>'archived' ORDER BY a.created_at DESC`).all(),
      env.DB.prepare("SELECT i.id,i.agency_id AS agencyId,a.name AS agency,i.subscription_id AS subscriptionId,i.invoice_number AS invoiceNumber,i.status,i.currency,i.subtotal_minor AS subtotalMinor,i.discount_minor AS discountMinor,i.total_minor AS totalMinor,i.due_at AS dueAt,i.issued_at AS issuedAt,i.paid_at AS paidAt,i.payment_method AS paymentMethod,i.provider_reference AS providerReference FROM billing_invoices i JOIN agencies a ON a.id=i.agency_id ORDER BY i.issued_at DESC LIMIT 100").all(),
      env.DB.prepare("SELECT code,kind,amount,active,valid_until AS validUntil,max_redemptions AS maxRedemptions,redemptions FROM billing_coupons ORDER BY created_at DESC").all(),
      env.DB.prepare("SELECT b.id,b.agency_id AS agencyId,a.name AS agency,b.event_type AS eventType,b.detail,b.created_at AS createdAt FROM billing_events b JOIN agencies a ON a.id=b.agency_id ORDER BY b.created_at DESC LIMIT 100").all(),
      env.DB.prepare("SELECT id,name,type,account_holder AS accountHolder,bank_name AS bankName,branch,account_number AS accountNumber,merchant_number AS merchantNumber,mobile_number AS mobileNumber,reference_instructions AS referenceInstructions,currency,instructions,qr_media_id AS qrMediaId,enabled,display_order AS displayOrder,countries,currencies,allowed_plan_version_ids AS allowedPlanVersionIds,stripe_mode AS stripeMode,updated_at AS updatedAt FROM billing_payment_methods ORDER BY display_order,name").all(),
      env.DB.prepare(`SELECT r.id,r.agency_id AS agencyId,a.name AS agency,r.subscription_id AS subscriptionId,r.invoice_id AS invoiceId,r.plan_version_id AS planVersionId,p.name AS planName,r.payment_method_id AS paymentMethodId,m.name AS paymentMethod,m.type AS paymentMethodType,r.provider,r.status,r.currency,r.amount_due_minor AS amountDueMinor,r.amount_paid_minor AS amountPaidMinor,r.payment_reference AS paymentReference,r.transaction_reference AS transactionReference,r.payment_date AS paymentDate,r.agency_notes AS agencyNotes,r.proof_object_key AS proofObjectKey,r.proof_original_name AS proofOriginalName,r.proof_mime_type AS proofMimeType,r.proof_byte_size AS proofByteSize,r.submitted_at AS submittedAt,r.reviewed_by AS reviewedBy,r.reviewed_at AS reviewedAt,r.review_note AS reviewNote,r.rejection_reason AS rejectionReason,r.created_at AS createdAt
        FROM billing_payment_requests r JOIN agencies a ON a.id=r.agency_id JOIN plan_versions p ON p.id=r.plan_version_id LEFT JOIN billing_payment_methods m ON m.id=r.payment_method_id ORDER BY r.created_at DESC LIMIT 120`).all(),
      operations(),
    ]);
    return Response.json({
      actor: access.context,
      platform: { platformName: platform.platformName, shortName: platform.shortName, logoUrl: platform.logoUrl, iconUrl: platform.iconUrl, darkLogoUrl: platform.darkLogoUrl, darkIconUrl: platform.darkIconUrl },
      settings,
      operations: ops,
      platformUsers: platformUsers.results,
      plans: plans.results.map((plan: any) => ({ ...plan, featured: Boolean(plan.featured), trialAvailable: Boolean(plan.trialAvailable), allowTrialWithoutPayment: Boolean(plan.allowTrialWithoutPayment), trialOnce: Boolean(plan.trialOnce), entitlements: JSON.parse(plan.entitlements || "{}"), limits: JSON.parse(plan.limits || "{}") })),
      agencies: agencies.results,
      invoices: invoices.results,
      coupons: coupons.results,
      events: events.results,
      paymentMethods: paymentMethods.results.map((method: any) => ({ ...method, enabled: Boolean(method.enabled), countries: JSON.parse(method.countries || "[]"), currencies: JSON.parse(method.currencies || "[]"), allowedPlanVersionIds: JSON.parse(method.allowedPlanVersionIds || "[]") })),
      manualPayments: manualPayments.results,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = clean(body.action, 40);

    if (action === "create_platform_user") {
      const access = await actor(["super_admin"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const email = clean(body.email).toLowerCase(), userId = clean(body.userId), role = clean(body.role) as PlatformRole;
      if (!userId || !emailOk(email) || !roles.includes(role)) return Response.json({ error: "A valid user ID, email and platform role are required." }, { status: 400 });
      await env.DB.prepare("INSERT INTO platform_users (user_id,email,role,created_by) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,role=excluded.role,active=1,updated_at=CURRENT_TIMESTAMP")
        .bind(userId, email, role, access.context.userId).run();
      await writePlatformAudit(access.context, "platform.user.assigned", "platform_user", userId, { email, role });
      return Response.json({ created: true }, { status: 201 });
    }

    if (action === "create_plan_version") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const planKey = clean(body.planKey, 50).toLowerCase().replace(/[^a-z0-9-]/g, "-"), name = clean(body.name, 80), description = clean(body.description, 500), currency = clean(body.currency, 3).toUpperCase(), priceMinor = Math.max(0, Math.round(Number(body.priceMinor))), billingPeriod = clean(body.billingPeriod, 20), status = body.status === "published" ? "published" : "draft", entitlements = planEntitlements(body.entitlements), limits = planLimits(body.limits), featured = body.featured === true ? 1 : 0, trialAvailable = body.trialAvailable === true ? 1 : 0, trialDays = Math.max(0, Math.round(Number(body.trialDays ?? limits.trialDays ?? 0))), allowTrialWithoutPayment = body.allowTrialWithoutPayment === false ? 0 : 1, trialOnce = body.trialOnce === false ? 0 : 1;
      if (!planKey || !name || !/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(priceMinor) || !["month", "year"].includes(billingPeriod)) return Response.json({ error: "Complete every plan field with valid values." }, { status: 400 });
      const latest = await env.DB.prepare("SELECT COALESCE(MAX(version),0) AS version FROM plan_versions WHERE plan_key=?").bind(planKey).first<{ version: number }>(), version = Number(latest?.version || 0) + 1, id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO plan_versions (id,plan_key,version,name,description,currency,price_minor,billing_period,entitlements,limits,featured,trial_available,trial_days,allow_trial_without_payment,trial_once,status,published_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(id, planKey, version, name, description, currency, priceMinor, billingPeriod, JSON.stringify(entitlements), JSON.stringify({...limits,trialDays}), featured, trialAvailable, trialDays, allowTrialWithoutPayment, trialOnce, status, status === "published" ? new Date().toISOString() : null, access.context.userId).run();
      await writePlatformAudit(access.context, "plan.version.created", "plan_version", id, { planKey, version, status });
      return Response.json({ plan: { id, planKey, version, name, status } }, { status: 201 });
    }

    if (action === "clone_plan_version") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const sourceId = clean(body.id), source = await env.DB.prepare("SELECT plan_key AS planKey,name,description,currency,price_minor AS priceMinor,billing_period AS billingPeriod,entitlements,limits,featured,trial_available AS trialAvailable,trial_days AS trialDays,allow_trial_without_payment AS allowTrialWithoutPayment,trial_once AS trialOnce FROM plan_versions WHERE id=?").bind(sourceId).first<any>();
      if (!source) return Response.json({ error: "Plan version was not found." }, { status: 404 });
      const latest = await env.DB.prepare("SELECT COALESCE(MAX(version),0) AS version FROM plan_versions WHERE plan_key=?").bind(source.planKey).first<{ version: number }>(), version = Number(latest?.version || 0) + 1, id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO plan_versions (id,plan_key,version,name,description,currency,price_minor,billing_period,entitlements,limits,featured,trial_available,trial_days,allow_trial_without_payment,trial_once,status,published_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',NULL,?)")
        .bind(id, source.planKey, version, `${source.name} v${version}`, source.description || "", source.currency, source.priceMinor, source.billingPeriod, source.entitlements, source.limits, source.featured ? 1 : 0, source.trialAvailable ? 1 : 0, Number(source.trialDays || 0), source.allowTrialWithoutPayment ? 1 : 0, source.trialOnce ? 1 : 0, access.context.userId).run();
      await writePlatformAudit(access.context, "plan.version.cloned", "plan_version", id, { fromPlanVersionId: sourceId, planKey: source.planKey, version });
      return Response.json({ plan: { id, planKey: source.planKey, version, status: "draft" } }, { status: 201 });
    }

    if (action === "bulk_migrate_plan") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const fromPlanVersionId = clean(body.fromPlanVersionId), toPlanVersionId = clean(body.toPlanVersionId), reason = clean(body.reason, 240);
      const target = await env.DB.prepare("SELECT id,limits FROM plan_versions WHERE id=? AND status='published'").bind(toPlanVersionId).first<any>();
      if (!fromPlanVersionId || !target || fromPlanVersionId === toPlanVersionId) return Response.json({ error: "Choose different source and published target plan versions." }, { status: 400 });
      const affected = await env.DB.prepare("SELECT id,agency_id AS agencyId FROM agency_subscriptions WHERE plan_version_id=?").bind(fromPlanVersionId).all<any>();
      await env.DB.prepare("UPDATE agency_subscriptions SET previous_plan_version_id=plan_version_id,plan_version_id=?,plan_changed_at=CURRENT_TIMESTAMP,plan_changed_by=?,status_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE plan_version_id=?")
        .bind(toPlanVersionId, access.context.userId, reason, access.context.userId, fromPlanVersionId).run();
      for (const row of affected.results) await event(access.context, row.agencyId, row.id, null, "subscription.plan_migrated", { fromPlanVersionId, toPlanVersionId, reason });
      await writePlatformAudit(access.context, "plan.version.bulk_migrated", "plan_version", toPlanVersionId, { fromPlanVersionId, toPlanVersionId, affected: affected.results.length, reason });
      return Response.json({ migrated: affected.results.length });
    }

    if (action === "assign_subscription") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const agencyId = clean(body.agencyId), planVersionId = clean(body.planVersionId), plan = await env.DB.prepare("SELECT id,price_minor AS priceMinor,limits,trial_available AS trialAvailable,trial_days AS trialDays FROM plan_versions WHERE id=? AND status='published'").bind(planVersionId).first<any>();
      if (!plan || !await env.DB.prepare("SELECT id FROM agencies WHERE id=?").bind(agencyId).first()) return Response.json({ error: "Agency or published plan was not found." }, { status: 404 });
      const requested = clean(body.state), state = Number(plan.priceMinor) === 0 ? "free" : requested === "active" ? "active" : "trialing";
      if (state === "trialing" && (!plan.trialAvailable || Number(plan.trialDays) <= 0)) return Response.json({ error: "This paid plan does not allow a trial. Use active assignment after payment approval." }, { status: 400 });
      const now = new Date(), limits = planLimits(JSON.parse(plan.limits || "{}")), end = new Date(now.getTime() + (state === "trialing" ? Math.max(1, Number(plan.trialDays || limits.trialDays || 1)) : periodDays(limits, "active")) * 86400000), existing = await env.DB.prepare("SELECT id,plan_version_id AS planVersionId,state FROM agency_subscriptions WHERE agency_id=?").bind(agencyId).first<{ id: string; planVersionId: string; state: string }>(), subscriptionId = existing?.id || crypto.randomUUID(), changed = existing && existing.planVersionId !== planVersionId;
      await env.DB.prepare(`INSERT INTO agency_subscriptions (id,agency_id,plan_version_id,state,trial_starts_at,trial_ends_at,current_period_starts_at,current_period_ends_at,updated_by,previous_plan_version_id,plan_changed_at,plan_changed_by,status_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(agency_id) DO UPDATE SET plan_version_id=excluded.plan_version_id,state=excluded.state,trial_starts_at=excluded.trial_starts_at,trial_ends_at=excluded.trial_ends_at,current_period_starts_at=excluded.current_period_starts_at,current_period_ends_at=excluded.current_period_ends_at,grace_ends_at=NULL,suspended_at=NULL,canceled_at=NULL,expired_at=NULL,updated_by=excluded.updated_by,previous_plan_version_id=excluded.previous_plan_version_id,plan_changed_at=excluded.plan_changed_at,plan_changed_by=excluded.plan_changed_by,status_reason='',updated_at=CURRENT_TIMESTAMP`)
        .bind(subscriptionId, agencyId, planVersionId, state, state === "trialing" ? now.toISOString() : null, state === "trialing" ? end.toISOString() : null, state === "free" ? null : now.toISOString(), state === "free" ? null : end.toISOString(), access.context.userId, changed ? existing.planVersionId : null, changed ? now.toISOString() : null, changed ? access.context.userId : null, "").run();
      await event(access.context, agencyId, subscriptionId, null, changed ? "subscription.plan_changed" : "subscription.assigned", { fromPlanVersionId: existing?.planVersionId || null, planVersionId, state });
      await writePlatformAudit(access.context, changed ? "subscription.plan.changed" : "subscription.assigned", "agency_subscription", subscriptionId, { agencyId, fromPlanVersionId: existing?.planVersionId || null, planVersionId, state });
      return Response.json({ subscriptionId, state }, { status: 201 });
    }

    if (action === "extend_trial") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const id = clean(body.id), days = Math.min(60, Math.max(1, Math.round(Number(body.days || 7)))), reason = clean(body.reason, 240);
      const subscription = await env.DB.prepare("SELECT id,agency_id AS agencyId,state,trial_ends_at AS trialEndsAt FROM agency_subscriptions WHERE id=?").bind(id).first<{ id: string; agencyId: string; state: string; trialEndsAt: string | null }>();
      if (!subscription || !["trialing","trial_expired","expired"].includes(subscription.state)) return Response.json({ error: "Only trial or expired subscriptions can be extended." }, { status: 409 });
      const base = subscription.trialEndsAt && Date.parse(subscription.trialEndsAt) > Date.now() ? Date.parse(subscription.trialEndsAt) : Date.now(), trialEndsAt = new Date(base + days * 86400000).toISOString();
      await env.DB.prepare("UPDATE agency_subscriptions SET state='trialing',trial_ends_at=?,current_period_ends_at=?,expired_at=NULL,status_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(trialEndsAt, trialEndsAt, reason, access.context.userId, id).run();
      await event(access.context, subscription.agencyId, id, null, "subscription.trial_extended", { days, trialEndsAt, reason });
      await writePlatformAudit(access.context, "subscription.trial.extended", "agency_subscription", id, { days, trialEndsAt, reason });
      return Response.json({ state: "trialing", trialEndsAt });
    }

    if (action === "create_coupon") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const code = clean(body.code, 30).toUpperCase().replace(/[^A-Z0-9-]/g, ""), kind = body.kind === "fixed" ? "fixed" : "percent", amount = Math.max(1, Math.round(Number(body.amount))), validUntil = body.validUntil ? new Date(String(body.validUntil)).toISOString() : null, maxRedemptions = body.maxRedemptions ? Math.max(1, Math.round(Number(body.maxRedemptions))) : null;
      if (!code || !Number.isSafeInteger(amount) || (kind === "percent" && amount > 100)) return Response.json({ error: "Enter a valid coupon." }, { status: 400 });
      await env.DB.prepare("INSERT INTO billing_coupons (code,kind,amount,valid_until,max_redemptions,created_by) VALUES (?,?,?,?,?,?)").bind(code, kind, amount, validUntil, maxRedemptions, access.context.userId).run();
      await writePlatformAudit(access.context, "billing.coupon.created", "billing_coupon", code, { kind, amount });
      return Response.json({ code }, { status: 201 });
    }

    if (action === "create_payment_method") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const name = clean(body.name, 80), type = clean(body.type, 30), currency = clean(body.currency, 3).toUpperCase() || "USD";
      if (!name || !paymentTypeOk(type) || !/^[A-Z]{3}$/.test(currency)) return Response.json({ error: "Payment method name, type and currency are required." }, { status: 400 });
      const id = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO billing_payment_methods (id,name,type,account_holder,bank_name,branch,account_number,merchant_number,mobile_number,reference_instructions,currency,instructions,qr_media_id,enabled,display_order,countries,currencies,allowed_plan_version_ids,stripe_mode,created_by,updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, name, type, clean(body.accountHolder, 120), clean(body.bankName, 120), clean(body.branch, 120), clean(body.accountNumber, 120), clean(body.merchantNumber, 120), clean(body.mobileNumber, 120), clean(body.referenceInstructions, 500), currency, clean(body.instructions, 900), clean(body.qrMediaId, 500) || null, body.enabled === false ? 0 : 1, Math.round(Number(body.displayOrder || 100)), JSON.stringify(jsonArray(body.countries)), JSON.stringify(jsonArray(body.currencies).length ? jsonArray(body.currencies) : [currency]), JSON.stringify(jsonArray(body.allowedPlanVersionIds)), clean(body.stripeMode, 30), access.context.userId, access.context.userId).run();
      await writePlatformAudit(access.context, "billing.payment_method.created", "billing_payment_method", id, { name, type, currency });
      return Response.json({ id }, { status: 201 });
    }

    if (action === "create_invoice") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const agencyId = clean(body.agencyId), subscription = await env.DB.prepare("SELECT s.id,p.price_minor AS priceMinor,p.currency FROM agency_subscriptions s JOIN plan_versions p ON p.id=s.plan_version_id WHERE s.agency_id=?").bind(agencyId).first<{ id: string; priceMinor: number; currency: string }>();
      if (!subscription) return Response.json({ error: "Agency subscription was not found." }, { status: 404 });
      const couponCode = clean(body.couponCode, 30).toUpperCase(), coupon = couponCode ? await env.DB.prepare("SELECT kind,amount FROM billing_coupons WHERE code=? AND active=1 AND (valid_until IS NULL OR valid_until>CURRENT_TIMESTAMP) AND (max_redemptions IS NULL OR redemptions<max_redemptions)").bind(couponCode).first<{ kind: string; amount: number }>() : null;
      if (couponCode && !coupon) return Response.json({ error: "Coupon is invalid or exhausted." }, { status: 400 });
      const subtotal = subscription.priceMinor, discount = calculateInvoiceDiscount(subtotal, coupon), total = invoiceTotal(subtotal, coupon), id = crypto.randomUUID(), number = `EST-${Date.now().toString().slice(-10)}`, dueAt = new Date(Date.now() + 7 * 86400000).toISOString();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO billing_invoices (id,agency_id,subscription_id,invoice_number,status,currency,subtotal_minor,discount_minor,total_minor,due_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id, agencyId, subscription.id, number, "open", subscription.currency, subtotal, discount, total, dueAt, access.context.userId),
        ...(coupon ? [env.DB.prepare("UPDATE billing_coupons SET redemptions=redemptions+1 WHERE code=?").bind(couponCode)] : []),
      ]);
      await event(access.context, agencyId, subscription.id, id, "invoice.issued", { number, subtotal, discount, total, couponCode: couponCode || null });
      await writePlatformAudit(access.context, "billing.invoice.issued", "billing_invoice", id, { agencyId, number, total });
      return Response.json({ invoice: { id, number, total, currency: subscription.currency, dueAt } }, { status: 201 });
    }

    return Response.json({ error: "Unsupported platform action." }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = clean(body.action, 40);

    if (action === "update_platform_settings") {
      const access = await actor(["super_admin"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const settings = {
        platformName: clean(body.platformName, 80),
        shortName: clean(body.shortName, 24),
        parentBrand: clean(body.parentBrand, 80),
        tagline: clean(body.tagline, 180),
        primaryColor: hex(body.primaryColor),
        accentColor: hex(body.accentColor),
        supportEmail: clean(body.supportEmail, 120).toLowerCase(),
        supportPhone: clean(body.supportPhone, 40),
        supportWhatsapp: clean(body.supportWhatsapp, 40),
        defaultCountry: clean(body.defaultCountry, 2).toUpperCase(),
        defaultCurrency: clean(body.defaultCurrency, 3).toUpperCase(),
        timezone: clean(body.timezone, 80),
        domain: clean(body.domain, 120).toLowerCase(),
        tenantDomainSuffix: clean(body.tenantDomainSuffix, 120).toLowerCase(),
        poweredByWording: clean(body.poweredByWording, 120),
        logoUrl: clean(body.logoUrl, 500),
        iconUrl: clean(body.iconUrl, 500),
        darkLogoUrl: clean(body.darkLogoUrl, 500),
        darkIconUrl: clean(body.darkIconUrl, 500),
      };
      if (!settings.platformName || !settings.shortName || !/^#[0-9a-f]{6}$/i.test(settings.primaryColor) || !/^#[0-9a-f]{6}$/i.test(settings.accentColor) || !/^[A-Z]{2}$/.test(settings.defaultCountry) || !/^[A-Z]{3}$/.test(settings.defaultCurrency)) {
        return Response.json({ error: "Complete platform name, short name, colours, country and currency with valid values." }, { status: 400 });
      }
      if (settings.supportEmail && !emailOk(settings.supportEmail)) return Response.json({ error: "Enter a valid support email." }, { status: 400 });
      await ensurePlatformIdentity();
      await env.DB.prepare(`UPDATE platform_settings SET platform_name=?,short_name=?,parent_brand=?,tagline=?,primary_color=?,accent_color=?,support_email=?,support_phone=?,support_whatsapp=?,default_country=?,default_currency=?,timezone=?,domain=?,tenant_domain_suffix=?,powered_by_wording=?,logo_url=?,icon_url=?,dark_logo_url=?,dark_icon_url=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'`)
        .bind(settings.platformName, settings.shortName, settings.parentBrand, settings.tagline, settings.primaryColor, settings.accentColor, settings.supportEmail, settings.supportPhone, settings.supportWhatsapp, settings.defaultCountry, settings.defaultCurrency, settings.timezone, settings.domain, settings.tenantDomainSuffix, settings.poweredByWording, settings.logoUrl, settings.iconUrl, settings.darkLogoUrl, settings.darkIconUrl).run();
      await writePlatformAudit(access.context, "platform.settings.updated", "platform_settings", "default", settings);
      return Response.json({ settings: await platformSettingsRow() });
    }

    if (action === "transition_subscription") {
      const access = await actor(["super_admin","finance","support"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const id = clean(body.id), next = clean(body.state), reason = clean(body.reason, 240), subscription = await env.DB.prepare("SELECT id,agency_id AS agencyId,state FROM agency_subscriptions WHERE id=?").bind(id).first<{ id: string; agencyId: string; state: string }>();
      if (!subscription) return Response.json({ error: "Subscription was not found." }, { status: 404 });
      if (!canTransitionSubscription(subscription.state, next)) return Response.json({ error: `Cannot move a subscription from ${subscription.state} to ${next}.` }, { status: 409 });
      const graceEnds = next === "grace" ? new Date(Date.now() + 7 * 86400000).toISOString() : null, suspendedAt = next === "suspended" ? new Date().toISOString() : null, canceledAt = next === "canceled" ? new Date().toISOString() : null, expiredAt = next === "expired" ? new Date().toISOString() : null;
      await env.DB.prepare("UPDATE agency_subscriptions SET state=?,grace_ends_at=?,suspended_at=?,canceled_at=?,expired_at=?,status_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(next, graceEnds, suspendedAt, canceledAt, expiredAt, next === "active" ? "" : reason, access.context.userId, id).run();
      await event(access.context, subscription.agencyId, id, null, "subscription.state_changed", { from: subscription.state, to: next, reason });
      await writePlatformAudit(access.context, "subscription.state.changed", "agency_subscription", id, { from: subscription.state, to: next, reason });
      return Response.json({ state: next });
    }

    if (action === "update_plan_version") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const id = clean(body.id), current = await env.DB.prepare("SELECT id,status FROM plan_versions WHERE id=?").bind(id).first<{ id: string; status: string }>();
      if (!current) return Response.json({ error: "Plan version was not found." }, { status: 404 });
      if (current.status !== "draft") return Response.json({ error: "Published and archived plan versions are locked. Create a new version to change customer contracts." }, { status: 409 });
      const name = clean(body.name, 80), description = clean(body.description, 500), currency = clean(body.currency, 3).toUpperCase(), priceMinor = Math.max(0, Math.round(Number(body.priceMinor))), billingPeriod = clean(body.billingPeriod, 20), entitlements = planEntitlements(body.entitlements), limits = planLimits(body.limits), featured = body.featured === true ? 1 : 0, trialAvailable = body.trialAvailable === true ? 1 : 0, trialDays = Math.max(0, Math.round(Number(body.trialDays ?? limits.trialDays ?? 0))), allowTrialWithoutPayment = body.allowTrialWithoutPayment === false ? 0 : 1, trialOnce = body.trialOnce === false ? 0 : 1;
      if (!name || !/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(priceMinor) || !["month", "year"].includes(billingPeriod)) return Response.json({ error: "Complete every plan field with valid values." }, { status: 400 });
      await env.DB.prepare("UPDATE plan_versions SET name=?,description=?,currency=?,price_minor=?,billing_period=?,entitlements=?,limits=?,featured=?,trial_available=?,trial_days=?,allow_trial_without_payment=?,trial_once=? WHERE id=? AND status='draft'")
        .bind(name, description, currency, priceMinor, billingPeriod, JSON.stringify(entitlements), JSON.stringify({...limits,trialDays}), featured, trialAvailable, trialDays, allowTrialWithoutPayment, trialOnce, id).run();
      await writePlatformAudit(access.context, "plan.version.updated", "plan_version", id, { name, priceMinor, billingPeriod });
      return Response.json({ updated: true });
    }

    if (action === "publish_plan_version" || action === "archive_plan_version") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const id = clean(body.id), current = await env.DB.prepare("SELECT id,status FROM plan_versions WHERE id=?").bind(id).first<{ id: string; status: string }>();
      if (!current) return Response.json({ error: "Plan version was not found." }, { status: 404 });
      if (action === "publish_plan_version" && current.status !== "draft") return Response.json({ error: "Only draft plan versions can be published." }, { status: 409 });
      if (action === "archive_plan_version" && current.status === "published" && await env.DB.prepare("SELECT 1 FROM agency_subscriptions WHERE plan_version_id=? LIMIT 1").bind(id).first()) return Response.json({ error: "This published plan is assigned to agencies. Migrate them before archiving it." }, { status: 409 });
      const status = action === "publish_plan_version" ? "published" : "archived";
      await env.DB.prepare("UPDATE plan_versions SET status=?,published_at=CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id=?").bind(status, status, id).run();
      await writePlatformAudit(access.context, action === "publish_plan_version" ? "plan.version.published" : "plan.version.archived", "plan_version", id, { from: current.status, to: status });
      return Response.json({ status });
    }

    if (action === "update_agency_status") {
      const access = await actor(["super_admin","support"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const agencyId = clean(body.agencyId), status = clean(body.status), reason = clean(body.reason, 240);
      if (!canSetAgencyStatus(status)) return Response.json({ error: "Choose a valid agency status." }, { status: 400 });
      const agency = await env.DB.prepare("SELECT id,status FROM agencies WHERE id=?").bind(agencyId).first<{ id: string; status: string }>();
      if (!agency) return Response.json({ error: "Agency was not found." }, { status: 404 });
      await env.DB.prepare("UPDATE agencies SET status=?,disabled_at=CASE WHEN ? IN ('disabled','suspended') THEN CURRENT_TIMESTAMP ELSE NULL END,archived_at=CASE WHEN ?='archived' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?").bind(status, status, status, agencyId).run();
      await writePlatformAudit(access.context, "agency.status.changed", "agency", agencyId, { from: agency.status, to: status, reason });
      return Response.json({ status });
    }

    if (action === "mark_invoice_paid") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const id = clean(body.id), reference = clean(body.reference, 120), method = clean(body.method, 40);
      if (!reference || !method) return Response.json({ error: "Payment method and receipt reference are required." }, { status: 400 });
      const invoice = await env.DB.prepare("SELECT id,agency_id AS agencyId,subscription_id AS subscriptionId FROM billing_invoices WHERE id=? AND status='open'").bind(id).first<{ id: string; agencyId: string; subscriptionId: string }>();
      if (!invoice) return Response.json({ error: "Open invoice was not found." }, { status: 404 });
      await env.DB.batch([
        env.DB.prepare("UPDATE billing_invoices SET status='paid',paid_at=CURRENT_TIMESTAMP,payment_method=?,provider_reference=? WHERE id=? AND status='open'").bind(method, reference, id),
        env.DB.prepare("UPDATE agency_subscriptions SET state='active',grace_ends_at=NULL,suspended_at=NULL,expired_at=NULL,status_reason='',updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state<>'canceled'").bind(access.context.userId, invoice.subscriptionId),
      ]);
      await event(access.context, invoice.agencyId, invoice.subscriptionId, id, "invoice.paid", { method, reference });
      await writePlatformAudit(access.context, "billing.invoice.paid", "billing_invoice", id, { method, reference });
      return Response.json({ paid: true });
    }

    if (action === "update_payment_method") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const id = clean(body.id), current = await env.DB.prepare("SELECT id FROM billing_payment_methods WHERE id=?").bind(id).first();
      if (!current) return Response.json({ error: "Payment method was not found." }, { status: 404 });
      const name = clean(body.name, 80), type = clean(body.type, 30), currency = clean(body.currency, 3).toUpperCase() || "USD";
      if (!name || !paymentTypeOk(type) || !/^[A-Z]{3}$/.test(currency)) return Response.json({ error: "Payment method name, type and currency are required." }, { status: 400 });
      await env.DB.prepare(`UPDATE billing_payment_methods SET name=?,type=?,account_holder=?,bank_name=?,branch=?,account_number=?,merchant_number=?,mobile_number=?,reference_instructions=?,currency=?,instructions=?,qr_media_id=?,enabled=?,display_order=?,countries=?,currencies=?,allowed_plan_version_ids=?,stripe_mode=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(name, type, clean(body.accountHolder, 120), clean(body.bankName, 120), clean(body.branch, 120), clean(body.accountNumber, 120), clean(body.merchantNumber, 120), clean(body.mobileNumber, 120), clean(body.referenceInstructions, 500), currency, clean(body.instructions, 900), clean(body.qrMediaId, 500) || null, body.enabled === false ? 0 : 1, Math.round(Number(body.displayOrder || 100)), JSON.stringify(jsonArray(body.countries)), JSON.stringify(jsonArray(body.currencies).length ? jsonArray(body.currencies) : [currency]), JSON.stringify(jsonArray(body.allowedPlanVersionIds)), clean(body.stripeMode, 30), access.context.userId, id).run();
      await writePlatformAudit(access.context, "billing.payment_method.updated", "billing_payment_method", id, { name, type, currency, enabled: body.enabled !== false });
      return Response.json({ updated: true });
    }

    if (action === "review_manual_payment") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const id = clean(body.id), decision = clean(body.decision, 30), note = clean(body.note, 600);
      const requestRow = await env.DB.prepare("SELECT r.id,r.status,r.agency_id AS agencyId,r.subscription_id AS subscriptionId,r.invoice_id AS invoiceId,r.plan_version_id AS planVersionId,r.provider,r.period_starts_at AS periodStartsAt,r.period_ends_at AS periodEndsAt,r.payment_reference AS paymentReference FROM billing_payment_requests r WHERE r.id=?").bind(id).first<any>();
      if (!requestRow) return Response.json({ error: "Manual payment request was not found." }, { status: 404 });
      if (!canReviewManualPayment(requestRow.status)) return Response.json({ error: "This payment request is not ready for review." }, { status: 409 });
      if (decision === "approve") {
        if (requestRow.status !== "approved") {
          await env.DB.batch([
            env.DB.prepare("UPDATE billing_payment_requests SET status='approved',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,review_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'approved'").bind(access.context.userId, note, id),
            env.DB.prepare("UPDATE billing_invoices SET status='paid',paid_at=CURRENT_TIMESTAMP,payment_method=?,provider_reference=? WHERE id=? AND status='open'").bind(requestRow.provider, requestRow.paymentReference, requestRow.invoiceId),
            env.DB.prepare("UPDATE agency_subscriptions SET plan_version_id=?,state='active',current_period_starts_at=COALESCE(?,CURRENT_TIMESTAMP),current_period_ends_at=?,payment_provider=?,grace_ends_at=NULL,suspended_at=NULL,canceled_at=NULL,expired_at=NULL,status_reason='',updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state<>'canceled'").bind(requestRow.planVersionId, requestRow.periodStartsAt, requestRow.periodEndsAt, requestRow.provider, access.context.userId, requestRow.subscriptionId),
          ]);
        }
        await event(access.context, requestRow.agencyId, requestRow.subscriptionId, requestRow.invoiceId, "payment.manual_approved", { paymentRequestId: id, note });
        await writePlatformAudit(access.context, "billing.manual_payment.approved", "billing_payment_request", id, { agencyId: requestRow.agencyId });
        return Response.json({ approved: true });
      }
      if (decision === "reject" || decision === "resubmit") {
        const status = decision === "resubmit" ? "resubmission_requested" : "rejected";
        await env.DB.prepare("UPDATE billing_payment_requests SET status=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,review_note=?,rejection_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, access.context.userId, note, note, id).run();
        await env.DB.prepare("UPDATE agency_subscriptions SET state='pending_payment',status_reason=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(note || "Payment proof requires correction.", access.context.userId, requestRow.subscriptionId).run();
        await event(access.context, requestRow.agencyId, requestRow.subscriptionId, requestRow.invoiceId, `payment.manual_${decision}`, { paymentRequestId: id, note });
        await writePlatformAudit(access.context, `billing.manual_payment.${decision}`, "billing_payment_request", id, { agencyId: requestRow.agencyId, note });
        return Response.json({ status });
      }
      return Response.json({ error: "Choose approve, reject or resubmit." }, { status: 400 });
    }

    return Response.json({ error: "Unsupported platform action." }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await actor(["super_admin"]);
    if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json() as Record<string, unknown>, agencyId = clean(body.agencyId), confirmSlug = clean(body.confirmSlug, 120);
    const agency = await env.DB.prepare("SELECT id,name,slug,status FROM agencies WHERE id=?").bind(agencyId).first<{ id: string; name: string; slug: string; status: string }>();
    if (!agency) return Response.json({ error: "Agency was not found." }, { status: 404 });
    if (confirmSlug !== agency.slug) return Response.json({ error: "Type or pass the agency slug before deleting." }, { status: 400 });
    const storage = await deleteTenantObjects(agencyId);
    const deletion = await hardDeleteAgency(agencyId);
    await writePlatformAudit(access.context, "agency.hard_deleted", "agency", agencyId, { name: agency.name, slug: agency.slug, ...storage, ...deletion });
    return Response.json({ deleted: true, message: "Agency and all tenant-owned records were permanently deleted.", ...storage, ...deletion });
  } catch (error) {
    if (error instanceof PlatformAuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: error instanceof Error ? `Agency delete failed: ${error.message}` : "Agency delete failed." }, { status: 500 });
  }
}
