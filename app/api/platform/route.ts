import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensurePlanCatalog } from "../../../db/entitlements";
import { PlatformAuthorizationError, requirePlatformUser, writePlatformAudit, type PlatformContext, type PlatformRole } from "../../../db/platform-auth";
import { calculateInvoiceDiscount, canTransitionSubscription, invoiceTotal } from "../../../db/billing-policy";
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

async function platformSettingsRow() {
  await ensurePlatformIdentity();
  return env.DB.prepare(`SELECT platform_name AS platformName,short_name AS shortName,parent_brand AS parentBrand,tagline,primary_color AS primaryColor,accent_color AS accentColor,
    support_email AS supportEmail,support_phone AS supportPhone,support_whatsapp AS supportWhatsapp,default_country AS defaultCountry,
    default_currency AS defaultCurrency,timezone,domain,tenant_domain_suffix AS tenantDomainSuffix,powered_by_wording AS poweredByWording,
    logo_url AS logoUrl,icon_url AS iconUrl,
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
    const [platform, settings, platformUsers, plans, agencies, invoices, coupons, events, ops] = await Promise.all([
      getPlatformIdentity(),
      platformSettingsRow(),
      env.DB.prepare("SELECT user_id AS userId,email,role,active,created_at AS createdAt FROM platform_users ORDER BY created_at").all(),
      env.DB.prepare("SELECT id,plan_key AS planKey,version,name,currency,price_minor AS priceMinor,billing_period AS billingPeriod,entitlements,limits,status,published_at AS publishedAt FROM plan_versions ORDER BY plan_key,version DESC").all(),
      env.DB.prepare(`SELECT a.id,a.name,a.slug,a.created_at AS createdAt,s.id AS subscriptionId,s.state,s.trial_ends_at AS trialEndsAt,s.grace_ends_at AS graceEndsAt,s.current_period_ends_at AS currentPeriodEndsAt,p.id AS planVersionId,p.name AS planName,
        (SELECT COUNT(*) FROM agency_memberships m WHERE m.agency_id=a.id) AS users,
        (SELECT COUNT(*) FROM properties x WHERE x.agency_id=a.id) AS properties,
        (SELECT COUNT(*) FROM enquiries q WHERE q.agency_id=a.id) AS enquiries,
        (SELECT COUNT(*) FROM viewings v WHERE v.agency_id=a.id) AS viewings,
        (SELECT COUNT(*) FROM public_events e WHERE e.agency_id=a.id AND e.created_at>datetime('now','-24 hours')) AS publicEvents24h
        FROM agencies a LEFT JOIN agency_subscriptions s ON s.agency_id=a.id LEFT JOIN plan_versions p ON p.id=s.plan_version_id ORDER BY a.created_at DESC`).all(),
      env.DB.prepare("SELECT i.id,i.agency_id AS agencyId,a.name AS agency,i.subscription_id AS subscriptionId,i.invoice_number AS invoiceNumber,i.status,i.currency,i.subtotal_minor AS subtotalMinor,i.discount_minor AS discountMinor,i.total_minor AS totalMinor,i.due_at AS dueAt,i.issued_at AS issuedAt,i.paid_at AS paidAt,i.payment_method AS paymentMethod,i.provider_reference AS providerReference FROM billing_invoices i JOIN agencies a ON a.id=i.agency_id ORDER BY i.issued_at DESC LIMIT 100").all(),
      env.DB.prepare("SELECT code,kind,amount,active,valid_until AS validUntil,max_redemptions AS maxRedemptions,redemptions FROM billing_coupons ORDER BY created_at DESC").all(),
      env.DB.prepare("SELECT b.id,b.agency_id AS agencyId,a.name AS agency,b.event_type AS eventType,b.detail,b.created_at AS createdAt FROM billing_events b JOIN agencies a ON a.id=b.agency_id ORDER BY b.created_at DESC LIMIT 100").all(),
      operations(),
    ]);
    return Response.json({
      actor: access.context,
      platform: { platformName: platform.platformName, shortName: platform.shortName },
      settings,
      operations: ops,
      platformUsers: platformUsers.results,
      plans: plans.results.map((plan: any) => ({ ...plan, entitlements: JSON.parse(plan.entitlements || "{}"), limits: JSON.parse(plan.limits || "{}") })),
      agencies: agencies.results,
      invoices: invoices.results,
      coupons: coupons.results,
      events: events.results,
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
      const planKey = clean(body.planKey, 50).toLowerCase().replace(/[^a-z0-9-]/g, "-"), name = clean(body.name, 80), currency = clean(body.currency, 3).toUpperCase(), priceMinor = Math.max(0, Math.round(Number(body.priceMinor))), billingPeriod = clean(body.billingPeriod, 20), status = body.status === "published" ? "published" : "draft", entitlements = jsonRecord(body.entitlements), limits = jsonRecord(body.limits);
      if (!planKey || !name || !/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(priceMinor) || !["month", "year"].includes(billingPeriod)) return Response.json({ error: "Complete every plan field with valid values." }, { status: 400 });
      const latest = await env.DB.prepare("SELECT COALESCE(MAX(version),0) AS version FROM plan_versions WHERE plan_key=?").bind(planKey).first<{ version: number }>(), version = Number(latest?.version || 0) + 1, id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO plan_versions (id,plan_key,version,name,currency,price_minor,billing_period,entitlements,limits,status,published_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(id, planKey, version, name, currency, priceMinor, billingPeriod, JSON.stringify(entitlements), JSON.stringify(limits), status, status === "published" ? new Date().toISOString() : null, access.context.userId).run();
      await writePlatformAudit(access.context, "plan.version.created", "plan_version", id, { planKey, version, status });
      return Response.json({ plan: { id, planKey, version, name, status } }, { status: 201 });
    }

    if (action === "assign_subscription") {
      const access = await actor(["super_admin","finance"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const agencyId = clean(body.agencyId), planVersionId = clean(body.planVersionId), state = body.state === "active" ? "active" : "trialing", plan = await env.DB.prepare("SELECT id FROM plan_versions WHERE id=? AND status='published'").bind(planVersionId).first();
      if (!plan || !await env.DB.prepare("SELECT id FROM agencies WHERE id=?").bind(agencyId).first()) return Response.json({ error: "Agency or published plan was not found." }, { status: 404 });
      const now = new Date(), end = new Date(now.getTime() + (state === "trialing" ? 14 : 30) * 86400000), existing = await env.DB.prepare("SELECT id FROM agency_subscriptions WHERE agency_id=?").bind(agencyId).first<{ id: string }>(), subscriptionId = existing?.id || crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO agency_subscriptions (id,agency_id,plan_version_id,state,trial_starts_at,trial_ends_at,current_period_starts_at,current_period_ends_at,updated_by) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(agency_id) DO UPDATE SET plan_version_id=excluded.plan_version_id,state=excluded.state,trial_starts_at=excluded.trial_starts_at,trial_ends_at=excluded.trial_ends_at,current_period_starts_at=excluded.current_period_starts_at,current_period_ends_at=excluded.current_period_ends_at,grace_ends_at=NULL,suspended_at=NULL,canceled_at=NULL,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
        .bind(subscriptionId, agencyId, planVersionId, state, state === "trialing" ? now.toISOString() : null, state === "trialing" ? end.toISOString() : null, now.toISOString(), end.toISOString(), access.context.userId).run();
      await event(access.context, agencyId, subscriptionId, null, "subscription.assigned", { planVersionId, state });
      await writePlatformAudit(access.context, "subscription.assigned", "agency_subscription", subscriptionId, { agencyId, planVersionId, state });
      return Response.json({ subscriptionId, state }, { status: 201 });
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
      };
      if (!settings.platformName || !settings.shortName || !/^#[0-9a-f]{6}$/i.test(settings.primaryColor) || !/^#[0-9a-f]{6}$/i.test(settings.accentColor) || !/^[A-Z]{2}$/.test(settings.defaultCountry) || !/^[A-Z]{3}$/.test(settings.defaultCurrency)) {
        return Response.json({ error: "Complete platform name, short name, colours, country and currency with valid values." }, { status: 400 });
      }
      if (settings.supportEmail && !emailOk(settings.supportEmail)) return Response.json({ error: "Enter a valid support email." }, { status: 400 });
      await ensurePlatformIdentity();
      await env.DB.prepare(`UPDATE platform_settings SET platform_name=?,short_name=?,parent_brand=?,tagline=?,primary_color=?,accent_color=?,support_email=?,support_phone=?,support_whatsapp=?,default_country=?,default_currency=?,timezone=?,domain=?,tenant_domain_suffix=?,powered_by_wording=?,logo_url=?,icon_url=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'`)
        .bind(settings.platformName, settings.shortName, settings.parentBrand, settings.tagline, settings.primaryColor, settings.accentColor, settings.supportEmail, settings.supportPhone, settings.supportWhatsapp, settings.defaultCountry, settings.defaultCurrency, settings.timezone, settings.domain, settings.tenantDomainSuffix, settings.poweredByWording, settings.logoUrl, settings.iconUrl).run();
      await writePlatformAudit(access.context, "platform.settings.updated", "platform_settings", "default", settings);
      return Response.json({ settings: await platformSettingsRow() });
    }

    if (action === "transition_subscription") {
      const access = await actor(["super_admin","finance","support"]);
      if (!access) return Response.json({ error: "Sign in is required." }, { status: 401 });
      const id = clean(body.id), next = clean(body.state), subscription = await env.DB.prepare("SELECT id,agency_id AS agencyId,state FROM agency_subscriptions WHERE id=?").bind(id).first<{ id: string; agencyId: string; state: string }>();
      if (!subscription) return Response.json({ error: "Subscription was not found." }, { status: 404 });
      if (!canTransitionSubscription(subscription.state, next)) return Response.json({ error: `Cannot move a subscription from ${subscription.state} to ${next}.` }, { status: 409 });
      const graceEnds = next === "grace" ? new Date(Date.now() + 7 * 86400000).toISOString() : null, suspendedAt = next === "suspended" ? new Date().toISOString() : null, canceledAt = next === "canceled" ? new Date().toISOString() : null;
      await env.DB.prepare("UPDATE agency_subscriptions SET state=?,grace_ends_at=?,suspended_at=?,canceled_at=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(next, graceEnds, suspendedAt, canceledAt, access.context.userId, id).run();
      await event(access.context, subscription.agencyId, id, null, "subscription.state_changed", { from: subscription.state, to: next });
      await writePlatformAudit(access.context, "subscription.state.changed", "agency_subscription", id, { from: subscription.state, to: next });
      return Response.json({ state: next });
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
        env.DB.prepare("UPDATE agency_subscriptions SET state='active',grace_ends_at=NULL,suspended_at=NULL,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state<>'canceled'").bind(access.context.userId, invoice.subscriptionId),
      ]);
      await event(access.context, invoice.agencyId, invoice.subscriptionId, id, "invoice.paid", { method, reference });
      await writePlatformAudit(access.context, "billing.invoice.paid", "billing_invoice", id, { method, reference });
      return Response.json({ paid: true });
    }

    return Response.json({ error: "Unsupported platform action." }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}
