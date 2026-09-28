import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { safeCsv } from "../../../db/deal-policy";
import { pilotScorecard } from "../../../db/pilot-scorecard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const workspace = await requireWorkspace(user);
    await requirePermission(workspace, "report.read");
    const membership = await env.DB.prepare("SELECT role FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(workspace.agencyId, workspace.userId).first<{ role: string }>();
    if (!membership || !["principal", "admin"].includes(membership.role)) return Response.json({ error: "Pilot scorecards are available to principals and administrators." }, { status: 403 });
    const scorecard = await pilotScorecard(workspace.agencyId);
    if (new URL(request.url).searchParams.get("export") === "csv") {
      await requirePermission(workspace, "export.manage");
      const rows = [
        ["metric", "baseline", "current"],
        ["periodStartsAt", scorecard.baselinePeriod.startsAt, scorecard.currentPeriod.startsAt],
        ["periodEndsAt", scorecard.baselinePeriod.endsAt, scorecard.currentPeriod.endsAt],
        ...Object.keys(scorecard.currentPeriod).filter(key => !["startsAt", "endsAt"].includes(key)).map(key => [key, (scorecard.baselinePeriod as any)[key], (scorecard.currentPeriod as any)[key]]),
        ["weeklyStartsAt", scorecard.adoption.priorWeek.startsAt, scorecard.adoption.currentWeek.startsAt],
        ["weeklyEndsAt", scorecard.adoption.priorWeek.endsAt, scorecard.adoption.currentWeek.endsAt],
        ["weeklyActiveUsers", scorecard.adoption.priorWeek.activeUsers, scorecard.adoption.currentWeek.activeUsers],
        ["weeklyEligibleUsers", scorecard.adoption.priorWeek.eligibleUsers, scorecard.adoption.currentWeek.eligibleUsers],
        ["weeklyActiveRate", scorecard.adoption.priorWeek.activeRate, scorecard.adoption.currentWeek.activeRate],
      ];
      await writeAudit(workspace, "pilot_scorecard.exported", "agency", workspace.agencyId, { generatedAt: scorecard.generatedAt });
      return new Response(rows.map(row => row.map(safeCsv).join(",")).join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=estara-pilot-scorecard.csv", "cache-control": "private, no-store" } });
    }
    return Response.json(scorecard, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pilot scorecard could not be loaded." }, { status: error instanceof AuthorizationError ? 403 : 500 });
  }
}
