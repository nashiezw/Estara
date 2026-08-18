import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { PlatformAuthorizationError, requirePlatformUser } from "../../../db/platform-auth";
import { runDueBackups } from "../../../db/backup";
import { runLeaseLifecycleAutomation } from "../../../db/lease-automation";
import { getPlatformIdentity } from "../../../db/platform-settings";
const dynamic = "force-dynamic";
const bucket = () => { const b = env.MEDIA; if (!b)
    throw new Error("R2 binding unavailable"); return b; };
async function GET() { const started = Date.now(); try {
    const user = await getChatGPTUser();
    if (!user)
        return Response.json({ error: "Sign in is required." }, { status: 401 });
    await requirePlatformUser(user,["super_admin","support"]);
    const platform = await getPlatformIdentity(), backupRun = await runDueBackups(), leaseLifecycle = await runLeaseLifecycleAutomation();
    const databaseStarted = Date.now(), database = await env.DB.prepare("SELECT 1 AS healthy").first(), databaseMs = Date.now() - databaseStarted, storageStarted = Date.now(), probeKey = `health/probes/${crypto.randomUUID()}.txt`;
    await bucket().put(probeKey, "ok", { httpMetadata: { contentType: "text/plain" } });
    const probe = await bucket().head(probeKey);
    await bucket().delete(probeKey);
    const storageMs = Date.now() - storageStarted, [events, automations, deliveries, renders, counts] = await Promise.all([env.DB.prepare("SELECT status,COUNT(*) AS count FROM domain_events GROUP BY status").all(), env.DB.prepare("SELECT status,COUNT(*) AS count FROM automation_executions GROUP BY status").all(), env.DB.prepare("SELECT status,COUNT(*) AS count FROM notification_deliveries GROUP BY status").all(), env.DB.prepare("SELECT status,COUNT(*) AS count FROM marketing_render_jobs GROUP BY status").all(), env.DB.prepare("SELECT (SELECT COUNT(*) FROM agencies) AS agencies,(SELECT COUNT(*) FROM properties) AS properties,(SELECT COUNT(*) FROM documents WHERE status='active') AS documents").first()]);
    const deadLetters = [...events.results, ...automations.results, ...deliveries.results, ...renders.results].filter(x => ["failed", "dead_letter"].includes(x.status)).reduce((n, x) => n + Number(x.count), 0), status = database?.healthy === 1 && probe && deadLetters === 0 ? "healthy" : database?.healthy === 1 && probe ? "degraded" : "unhealthy";
    return Response.json({ status, checkedAt: new Date().toISOString(), platform: { shortName: platform.shortName }, latencyMs: { total: Date.now() - started, database: databaseMs, storage: storageMs }, services: { database: database?.healthy === 1 ? "operational" : "failed", storage: probe ? "operational" : "failed", backups: backupRun.some(x => x.status === "failed") ? "degraded" : "operational" }, queues: { events: events.results, automations: automations.results, deliveries: deliveries.results, renders: renders.results, deadLetters }, backups: { processed: backupRun.length, results: backupRun }, leaseLifecycle, usage: counts }, { status: status === "unhealthy" ? 503 : 200, headers: { "cache-control": "private, no-store" } });
}
catch (error) {
    if (error instanceof PlatformAuthorizationError)
        return Response.json({ error: error.message }, { status: 403 });
    console.error(JSON.stringify({ event: "health.check.failed", error: error instanceof Error ? error.name : "UnknownError", timestamp: new Date().toISOString() }));
    return Response.json({ status: "unhealthy", checkedAt: new Date().toISOString(), error: "A service check failed." }, { status: 503 });
} }
export { GET, dynamic };
