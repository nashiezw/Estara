import { env } from "cloudflare:workers";
import { logApiRequest, requireApiCredential } from "../../../../../db/api-auth";
import { processAutomationEvents, publishDomainEvent } from "../../../../../db/automation";
import { canCompleteViewing, canTransitionViewing, validViewingFeedback, viewingFollowUp } from "../../../../../db/viewing-policy";
import { apiAudit, clean } from "../../../../../db/public-api";

const route = "/api/v1/viewings/:id";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let credential: any;
  try {
    credential = await requireApiCredential(request, "viewings:write");
    const { id } = await params;
    const body = await request.json<any>();
    const row = await env.DB.prepare("SELECT id,status,feedback,interest_level interestLevel,property_id propertyId,contact_id contactId,assigned_user_id assignedUserId,starts_at startsAt FROM viewings WHERE id=? AND agency_id=?").bind(id, credential.agencyId).first<any>();
    if (!row) throw new Error("Viewing was not found.");

    const status = clean(body.status, 30);
    const hasFeedback = body.feedback !== undefined || body.interestLevel !== undefined;
    const effectiveStatus = status || row.status;
    if (status && !canTransitionViewing(row.status, status)) throw new Error(`Cannot move a viewing from ${row.status} to ${status}.`);
    if (status === "Completed" && !canCompleteViewing(row.startsAt)) throw new Error("A viewing cannot be completed before its scheduled start time.");
    const feedback = hasFeedback ? clean(body.feedback, 1000) : "";
    const interest = hasFeedback ? clean(body.interestLevel, 30) : "";
    if (hasFeedback && !validViewingFeedback(effectiveStatus, feedback, interest)) throw new Error(effectiveStatus === "Completed" ? "Feedback and interestLevel are required." : "Complete the viewing before recording feedback.");

    const statements = [];
    if (status) {
      statements.push(env.DB.prepare("UPDATE viewings SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(status, id, credential.agencyId));
      if (status === "Completed") statements.push(
        env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id=? AND resource_type='viewing' AND resource_id=? AND action_type='viewing_reminder' AND status='open'").bind(credential.agencyId, id),
        env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'viewing',?,'capture_feedback','Record buyer feedback after viewing','high',CURRENT_TIMESTAMP,'open',?)").bind(crypto.randomUUID(), credential.agencyId, id, row.assignedUserId),
      );
      if (status === "Cancelled" || status === "No-show") statements.push(env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id=? AND resource_type='viewing' AND resource_id=? AND status='open'").bind(credential.agencyId, id));
      if (row.contactId) statements.push(env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) VALUES(?,?,?,?,?,?,'viewing',?)").bind(crypto.randomUUID(), credential.agencyId, row.contactId, `api:${credential.id}`, "viewing.status_changed", `Viewing moved from ${row.status} to ${status}`, id));
    }

    let followUp: ReturnType<typeof viewingFollowUp> | null = null;
    const feedbackChanged = hasFeedback && (row.feedback !== feedback || row.interestLevel !== interest);
    if (hasFeedback) {
      followUp = viewingFollowUp(interest);
      const due = new Date(Date.now() + 864e5).toISOString();
      statements.push(
        env.DB.prepare("UPDATE viewings SET feedback=?,interest_level=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(feedback, interest, id, credential.agencyId),
        env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id=? AND resource_type='viewing' AND resource_id=? AND action_type='capture_feedback' AND status='open'").bind(credential.agencyId, id),
        env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) SELECT ?,?,'viewing',?,?,?,'normal',?,'open',? WHERE NOT EXISTS (SELECT 1 FROM next_actions WHERE agency_id=? AND resource_type='viewing' AND resource_id=? AND action_type=? AND status='open')").bind(crypto.randomUUID(), credential.agencyId, id, followUp.actionType, followUp.reason, due, row.assignedUserId, credential.agencyId, id, followUp.actionType),
      );
      if (row.contactId && feedbackChanged) statements.push(env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) VALUES(?,?,?,?,?,?,'viewing',?)").bind(crypto.randomUUID(), credential.agencyId, row.contactId, `api:${credential.id}`, "viewing.feedback", feedback, id));
    }
    if (!statements.length) throw new Error("Provide a status or viewing feedback update.");
    await env.DB.batch(statements);

    if (status) await publishDomainEvent(credential.agencyId, `viewing.${status.toLowerCase().replace(/[^a-z]+/g, "_")}`, "viewing", id, { assignedUserId: row.assignedUserId, propertyId: row.propertyId, resourceType: "viewing", resourceId: id, status, source: "Public API" });
    if (feedbackChanged) await publishDomainEvent(credential.agencyId, "viewing.feedback_recorded", "viewing", id, { assignedUserId: row.assignedUserId, propertyId: row.propertyId, resourceType: "viewing", resourceId: id, interestLevel: interest, source: "Public API" });
    try { await processAutomationEvents(credential.agencyId, `api:${credential.id}`); } catch {}
    await apiAudit(credential, "api.viewing.updated", "viewing", id, { from: row.status, status: effectiveStatus, feedbackRecorded: hasFeedback });
    await logApiRequest(credential, route, "PATCH", 200);
    return Response.json({ data: { id, status: effectiveStatus, feedbackRecorded: hasFeedback, nextAction: followUp?.reason || null } });
  } catch (error) {
    if (credential) await logApiRequest(credential, route, "PATCH", 400);
    return Response.json({ error: error instanceof Error ? error.message : "API request failed." }, { status: 400 });
  }
}
