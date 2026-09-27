import { processAutomationEvents, publishDomainEvent } from "../../../db/automation";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { canCompleteViewing, canTransitionViewing, reminderTime, validViewingFeedback, validViewingWindow, viewingFollowUp } from "../../../db/viewing-policy";
import { accessiblePropertyIds, requirePropertyBranchAccess } from "../../../db/access-scope";

const clean = (value: unknown, length = 500) => typeof value === "string" ? value.trim().slice(0, length) : "";

async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const workspace = await requireWorkspace(user);
    await requirePermission(workspace, "viewing.read");
    const rows = await env.DB.prepare(`SELECT v.id,v.property_id AS propertyId,p.title AS property,v.enquiry_id AS enquiryId,v.contact_id AS contactId,COALESCE(c.full_name,e.contact_name,'Client') AS contact,v.assigned_user_id AS assignedUserId,m.email AS assignedEmail,v.starts_at AS startsAt,v.ends_at AS endsAt,v.status,v.notes,v.feedback,v.interest_level AS interestLevel,v.reminder_at AS reminderAt FROM viewings v JOIN properties p ON p.id=v.property_id AND p.agency_id=v.agency_id LEFT JOIN enquiries e ON e.id=v.enquiry_id AND e.agency_id=v.agency_id LEFT JOIN contacts c ON c.id=v.contact_id AND c.agency_id=v.agency_id LEFT JOIN agency_memberships m ON m.user_id=v.assigned_user_id AND m.agency_id=v.agency_id WHERE v.agency_id=? ORDER BY v.starts_at`).bind(workspace.agencyId).all<any>();
    const scope = await accessiblePropertyIds(workspace);
    return Response.json({ viewings: scope ? rows.results.filter(row => scope.has(row.propertyId)) : rows.results });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Viewings could not be loaded." }, { status: 500 });
  }
}

async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const workspace = await requireWorkspace(user);
    await requirePermission(workspace, "viewing.manage");
    const body = await request.json<any>();
    const propertyId = clean(body.propertyId, 100);
    const enquiryId = clean(body.enquiryId, 100);
    let contactId = clean(body.contactId, 100);
    const assignedUserId = clean(body.assignedUserId, 100) || user.userId;
    const startsAt = clean(body.startsAt, 40);
    const endsAt = clean(body.endsAt, 40);
    const notes = clean(body.notes);
    if (!propertyId || !validViewingWindow(startsAt, endsAt)) return Response.json({ error: "Choose a valid property and viewing time." }, { status: 400 });
    let linkedEnquiry: { contactId?: string; propertyId?: string; stage?: string } | null = null;

    const [listing, assignee] = await Promise.all([
      env.DB.prepare("SELECT id FROM properties WHERE id=? AND agency_id=?").bind(propertyId, workspace.agencyId).first(),
      env.DB.prepare("SELECT 1 FROM agency_memberships WHERE user_id=? AND agency_id=?").bind(assignedUserId, workspace.agencyId).first(),
    ]);
    if (!listing || !assignee) return Response.json({ error: "Property or assigned agent is outside this agency." }, { status: 400 });
    if (enquiryId) {
      linkedEnquiry = await env.DB.prepare("SELECT property_id propertyId,contact_id contactId,stage FROM enquiries WHERE id=? AND agency_id=?").bind(enquiryId, workspace.agencyId).first<any>();
      if (!linkedEnquiry || (linkedEnquiry.propertyId && linkedEnquiry.propertyId !== propertyId) || (contactId && linkedEnquiry.contactId && linkedEnquiry.contactId !== contactId)) return Response.json({ error: "The enquiry does not belong to this property or client." }, { status: 400 });
      if (["Won", "Lost", "Closed"].includes(linkedEnquiry.stage || "")) return Response.json({ error: "Reopen the enquiry before booking another viewing." }, { status: 409 });
      contactId ||= linkedEnquiry.contactId || "";
    }
    if (contactId && !await env.DB.prepare("SELECT id FROM contacts WHERE id=? AND agency_id=?").bind(contactId, workspace.agencyId).first()) return Response.json({ error: "Client is outside this agency." }, { status: 400 });

    await requirePropertyBranchAccess(workspace, propertyId);
    const start = new Date(Date.parse(startsAt)).toISOString();
    const end = new Date(Date.parse(endsAt)).toISOString();
    const conflict = await env.DB.prepare("SELECT id FROM viewings WHERE agency_id=? AND status IN ('Requested','Confirmed') AND starts_at<? AND ends_at>? AND (property_id=? OR assigned_user_id=?) LIMIT 1").bind(workspace.agencyId, end, start, propertyId, assignedUserId).first();
    if (conflict) return Response.json({ error: "The property or assigned agent already has a viewing at that time." }, { status: 409 });

    const id = crypto.randomUUID();
    const reminder = reminderTime(start);
    const due = Date.parse(reminder) > Date.now() ? reminder : new Date().toISOString();
    const statements = [
      env.DB.prepare("INSERT INTO viewings(id,agency_id,property_id,enquiry_id,contact_id,assigned_user_id,starts_at,ends_at,status,notes,reminder_at,created_by) VALUES(?,?,?,?,?,?,?,?,'Requested',?,?,?)").bind(id, workspace.agencyId, propertyId, enquiryId || null, contactId || null, assignedUserId, start, end, notes, reminder, user.userId),
      env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'viewing',?,'viewing_reminder','Prepare for scheduled viewing','normal',?,'open',?)").bind(crypto.randomUUID(), workspace.agencyId, id, due, assignedUserId),
    ];
    if (linkedEnquiry) {
      statements.push(env.DB.prepare("UPDATE enquiries SET stage=CASE WHEN stage IN ('New','Contacted','Qualified') THEN 'Viewing' ELSE stage END,status='Contacted',contacted_at=COALESCE(contacted_at,CURRENT_TIMESTAMP) WHERE id=? AND agency_id=?").bind(enquiryId, workspace.agencyId));
      statements.push(env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id=? AND resource_type='enquiry' AND resource_id=? AND action_type IN ('respond','follow_up') AND status='open'").bind(workspace.agencyId, enquiryId));
    }
    if (contactId) statements.push(env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) VALUES(?,?,?,?,?,'Viewing requested','viewing',?)").bind(crypto.randomUUID(), workspace.agencyId, contactId, user.userId, "viewing.requested", id));
    await env.DB.batch(statements);
    await publishDomainEvent(workspace.agencyId, "viewing.requested", "viewing", id, { assignedUserId, property: propertyId, resourceType: "viewing", resourceId: id, startsAt: start });
    try { await processAutomationEvents(workspace.agencyId, user.userId); } catch {}
    await writeAudit(workspace, "viewing.requested", "viewing", id, { propertyId, enquiryId: enquiryId || null, startsAt: start });
    return Response.json({ viewing: { id, propertyId, enquiryId, contactId, assignedUserId, startsAt: start, endsAt: end, status: "Requested", notes, reminderAt: reminder } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Viewing could not be created." }, { status: 500 });
  }
}

async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const workspace = await requireWorkspace(user);
    await requirePermission(workspace, "viewing.manage");
    const body = await request.json<any>();
    const id = clean(body.id, 100);
    const operation = clean(body.operation, 30);
    const viewing = await env.DB.prepare("SELECT status,feedback,interest_level AS interestLevel,contact_id AS contactId,assigned_user_id AS assignedUserId,property_id AS propertyId,starts_at AS startsAt FROM viewings WHERE id=? AND agency_id=?").bind(id, workspace.agencyId).first<any>();
    if (!viewing) return Response.json({ error: "Viewing was not found." }, { status: 404 });
    await requirePropertyBranchAccess(workspace, viewing.propertyId);

    if (operation === "transition") {
      const status = clean(body.status, 30);
      if (!canTransitionViewing(viewing.status, status)) return Response.json({ error: `Cannot move a viewing from ${viewing.status} to ${status}.` }, { status: 409 });
      if (status === "Completed" && !canCompleteViewing(viewing.startsAt)) return Response.json({ error: "A viewing cannot be completed before its scheduled start time." }, { status: 409 });
      const statements = [env.DB.prepare("UPDATE viewings SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(status, id, workspace.agencyId)];
      if (status === "Completed") statements.push(
        env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id=? AND resource_type='viewing' AND resource_id=? AND action_type='viewing_reminder' AND status='open'").bind(workspace.agencyId, id),
        env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'viewing',?,'capture_feedback','Record buyer feedback after viewing','high',CURRENT_TIMESTAMP,'open',?)").bind(crypto.randomUUID(), workspace.agencyId, id, viewing.assignedUserId),
      );
      if (status === "Cancelled" || status === "No-show") statements.push(env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id=? AND resource_type='viewing' AND resource_id=? AND status='open'").bind(workspace.agencyId, id));
      if (viewing.contactId) statements.push(env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) VALUES(?,?,?,?,?,?,'viewing',?)").bind(crypto.randomUUID(), workspace.agencyId, viewing.contactId, user.userId, "viewing.status_changed", `Viewing moved from ${viewing.status} to ${status}`, id));
      await env.DB.batch(statements);
      await publishDomainEvent(workspace.agencyId, `viewing.${status.toLowerCase().replace(/[^a-z]+/g, "_")}`, "viewing", id, { assignedUserId: viewing.assignedUserId, propertyId: viewing.propertyId, resourceType: "viewing", resourceId: id, status });
      try { await processAutomationEvents(workspace.agencyId, user.userId); } catch {}
      await writeAudit(workspace, "viewing.status_changed", "viewing", id, { from: viewing.status, to: status });
      return Response.json({ status });
    }

    if (operation === "feedback") {
      const feedback = clean(body.feedback, 1000);
      const interest = clean(body.interestLevel, 30);
      if (!validViewingFeedback(viewing.status, feedback, interest)) return Response.json({ error: viewing.status === "Completed" ? "Feedback and interest level are required." : "Complete the viewing before recording feedback." }, { status: viewing.status === "Completed" ? 400 : 409 });
      const followUp = viewingFollowUp(interest);
      const due = new Date(Date.now() + 864e5).toISOString();
      const statements = [
        env.DB.prepare("UPDATE viewings SET feedback=?,interest_level=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(feedback, interest, id, workspace.agencyId),
        env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id=? AND resource_type='viewing' AND resource_id=? AND action_type='capture_feedback' AND status='open'").bind(workspace.agencyId, id),
        env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) SELECT ?,?,'viewing',?,?,?,'normal',?,'open',? WHERE NOT EXISTS (SELECT 1 FROM next_actions WHERE agency_id=? AND resource_type='viewing' AND resource_id=? AND action_type=? AND status='open')").bind(crypto.randomUUID(), workspace.agencyId, id, followUp.actionType, followUp.reason, due, viewing.assignedUserId, workspace.agencyId, id, followUp.actionType),
      ];
      const changed = viewing.feedback !== feedback || viewing.interestLevel !== interest;
      if (viewing.contactId && changed) statements.push(env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) VALUES(?,?,?,?,?,?,'viewing',?)").bind(crypto.randomUUID(), workspace.agencyId, viewing.contactId, user.userId, "viewing.feedback", feedback, id));
      await env.DB.batch(statements);
      if (changed) {
        await publishDomainEvent(workspace.agencyId, "viewing.feedback_recorded", "viewing", id, { assignedUserId: viewing.assignedUserId, propertyId: viewing.propertyId, resourceType: "viewing", resourceId: id, interestLevel: interest });
        try { await processAutomationEvents(workspace.agencyId, user.userId); } catch {}
        await writeAudit(workspace, "viewing.feedback_recorded", "viewing", id, { interest });
      }
      return Response.json({ feedback: true, nextAction: followUp.reason });
    }
    return Response.json({ error: "Unknown viewing operation." }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Viewing could not be updated." }, { status: 500 });
  }
}

export { GET, PATCH, POST };
