import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { requireWorkspace } from "../../../db/workspace";
import { ALLOWED_WEBHOOK_EVENTS, replayWebhookDelivery, retryDueWebhooks, rotateWebhookSecret, sendTestWebhook } from "../../../db/webhooks";

const clean = (v: unknown, n = 500) => typeof v === "string" ? v.trim().slice(0, n) : "";
const fail = (e: unknown) => Response.json({ error: e instanceof Error ? e.message : "Webhook operation failed." }, { status: e instanceof AuthorizationError ? 403 : 400 });
function validUrl(value: string) { try { return new URL(value).protocol === "https:"; } catch { return false; } }

async function ctx() {
  const user = await getChatGPTUser();
  if (!user) throw new AuthorizationError("Sign in is required.");
  const workspace = await requireWorkspace(user);
  await requirePermission(workspace, "api.manage");
  return { user, workspace };
}

export async function GET() {
  try {
    const { workspace } = await ctx();
    const [subs, deliveries] = await Promise.all([
      env.DB.prepare("SELECT id,name,url,events,status,created_at createdAt,updated_at updatedAt FROM webhook_subscriptions WHERE agency_id=? ORDER BY created_at DESC").bind(workspace.agencyId).all<any>(),
      env.DB.prepare("SELECT id,subscription_id subscriptionId,event_id eventId,event_type eventType,url,status,response_status responseStatus,response_body responseBody,attempts,next_attempt_at nextAttemptAt,created_at createdAt,delivered_at deliveredAt FROM webhook_deliveries WHERE agency_id=? ORDER BY created_at DESC LIMIT 100").bind(workspace.agencyId).all<any>()
    ]);
    return Response.json({ allowedEvents: ALLOWED_WEBHOOK_EVENTS, subscriptions: subs.results.map(x => ({ ...x, events: JSON.parse(x.events || "[]") })), deliveries: deliveries.results }, { headers: { "cache-control": "private, no-store" } });
  } catch (e) { return fail(e); }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await ctx();
    const b = await request.json(), action = clean(b.action, 30);
    if (action === "retry") return Response.json(await retryDueWebhooks(workspace.agencyId));
    if (action === "replay") return Response.json({ deliveryId: await replayWebhookDelivery(workspace.agencyId, clean(b.deliveryId, 100)) });
    if (action === "rotate_secret") {
      const id = clean(b.id, 100), signingSecret = await rotateWebhookSecret(workspace.agencyId, id);
      await writeAudit(workspace, "webhook.secret_rotated", "webhook_subscription", id);
      return Response.json({ signingSecret, warning: "Copy this signing secret now. The previous secret no longer verifies new deliveries." });
    }
    if (action === "test") return Response.json({ eventId: await sendTestWebhook(workspace.agencyId, clean(b.id, 100)) });
    const name = clean(b.name, 100), url = clean(b.url, 500), events = Array.isArray(b.events) ? [...new Set(b.events.map(String).filter(x => (ALLOWED_WEBHOOK_EVENTS as readonly string[]).includes(x)))] : [];
    if (!name || !validUrl(url) || !events.length) throw new Error("Webhook name, HTTPS URL and at least one supported event are required.");
    const id = crypto.randomUUID(), secret = `whsec_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    await env.DB.prepare("INSERT INTO webhook_subscriptions(id,agency_id,name,url,events,signing_secret,created_by) VALUES(?,?,?,?,?,?,?)").bind(id, workspace.agencyId, name, url, JSON.stringify(events), secret, user.userId).run();
    await writeAudit(workspace, "webhook.created", "webhook_subscription", id, { name, url, events });
    return Response.json({ data: { id, name, url, events, status: "active" }, signingSecret: secret, warning: "Copy this signing secret now. It verifies Estara webhook signatures." }, { status: 201 });
  } catch (e) { return fail(e); }
}

export async function DELETE(request: Request) {
  try {
    const { workspace } = await ctx(), id = new URL(request.url).searchParams.get("id") || "";
    const result = await env.DB.prepare("UPDATE webhook_subscriptions SET status='disabled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status='active'").bind(id, workspace.agencyId).run();
    if (!result.meta.changes) throw new Error("Active webhook was not found.");
    await writeAudit(workspace, "webhook.disabled", "webhook_subscription", id);
    return Response.json({ disabled: true });
  } catch (e) { return fail(e); }
}
