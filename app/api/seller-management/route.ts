import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { hashSellerToken, sellerEmail, sellerFeedbackSummary, sellerReportCopy, validSellerEmail } from "../../../db/seller-policy";
import { sellerReportPdf } from "../../../db/seller-report-pdf";
import { accessiblePropertyIds, requirePropertyBranchAccess } from "../../../db/access-scope";

const dynamic = "force-dynamic";
const denied = (error: unknown) => error instanceof AuthorizationError
  ? Response.json({ error: error.message }, { status: 403 })
  : Response.json({ error: "Seller workspace could not be updated." }, { status: 500 });

async function context() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const workspace = await requireWorkspace(user);
  await requirePermission(workspace, "seller.manage");
  return { user, workspace };
}

const days: Record<string, number> = { weekly: 7, fortnightly: 14, monthly: 30 };

async function property(agencyId: string, id: string) {
  return env.DB.prepare("SELECT p.id,p.title,p.reference,p.location,a.name agency FROM properties p JOIN agencies a ON a.id=p.agency_id WHERE p.id=? AND p.agency_id=?").bind(id, agencyId).first<any>();
}

async function draft(agencyId: string, propertyId: string, userId: string, periodDays: number) {
  const listing = await property(agencyId, propertyId);
  if (!listing) return null;
  const end = new Date();
  const start = new Date(end.getTime() - periodDays * 864e5);
  const from = start.toISOString();
  const to = end.toISOString();
  const count = async (sql: string) => Number((await env.DB.prepare(sql).bind(agencyId, propertyId, from, to).first<any>())?.count || 0);
  const [views, enquiries, viewings, offers, feedbackRows] = await Promise.all([
    count("SELECT COUNT(*) count FROM public_events WHERE agency_id=? AND property_id=? AND event_type='property_view' AND created_at BETWEEN ? AND ?"),
    count("SELECT COUNT(*) count FROM enquiries WHERE agency_id=? AND property_id=? AND created_at BETWEEN ? AND ?"),
    count("SELECT COUNT(*) count FROM viewings WHERE agency_id=? AND property_id=? AND starts_at BETWEEN ? AND ? AND status IN ('Confirmed','Completed')"),
    count("SELECT COUNT(*) count FROM offers WHERE agency_id=? AND property_id=? AND submitted_at BETWEEN ? AND ? AND status!='withdrawn'"),
    env.DB.prepare("SELECT interest_level interestLevel FROM viewings WHERE agency_id=? AND property_id=? AND starts_at BETWEEN ? AND ? AND status='Completed' AND feedback<>'' AND interest_level IN ('interested','unsure','not_interested')").bind(agencyId, propertyId, from, to).all<any>(),
  ]);
  const copy = sellerReportCopy(listing.title, views, enquiries, viewings);
  const feedbackSummary = sellerFeedbackSummary(feedbackRows.results);
  const momentum = offers ? "Offer activity" : copy.momentum;
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO seller_reports (id,agency_id,property_id,period_start,period_end,views,enquiries,viewings,offers,momentum,summary,feedback_summary,recommended_action,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(id, agencyId, propertyId, from, to, views, enquiries, viewings, offers, momentum, copy.summary, feedbackSummary, copy.recommendedAction, userId).run();
  return { id, propertyId, property: listing.title, periodStart: from, periodEnd: to, views, enquiries, viewings, offers, momentum, summary: copy.summary, feedbackSummary, recommendedAction: copy.recommendedAction, status: "draft" };
}

async function GET() {
  try {
    const current = await context();
    if (!current) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const agencyId = current.workspace.agencyId;
    const queries = [
      "SELECT id,title,location,status,reference ref FROM properties WHERE agency_id=? ORDER BY updated_at DESC",
      "SELECT e.id,e.property_id propertyId,e.contact_id contactId,e.contact_name contact,e.stage,e.status,p.title property FROM enquiries e JOIN properties p ON p.id=e.property_id AND p.agency_id=e.agency_id WHERE e.agency_id=? AND e.contact_id IS NOT NULL AND e.stage NOT IN ('Lost','Closed') ORDER BY e.created_at DESC LIMIT 200",
      "SELECT g.id,g.property_id propertyId,g.email,g.expires_at expiresAt,g.accepted_at acceptedAt,g.revoked_at revokedAt,p.title property FROM seller_access_grants g JOIN properties p ON p.id=g.property_id AND p.agency_id=g.agency_id WHERE g.agency_id=? ORDER BY g.created_at DESC",
      "SELECT r.id,r.property_id propertyId,p.title property,r.period_start periodStart,r.period_end periodEnd,r.views,r.enquiries,r.viewings,r.offers,r.momentum,r.summary,r.feedback_summary feedbackSummary,r.recommended_action recommendedAction,r.status,r.approved_at approvedAt,r.pdf_object_key IS NOT NULL hasPdf FROM seller_reports r JOIN properties p ON p.id=r.property_id AND p.agency_id=r.agency_id WHERE r.agency_id=? ORDER BY r.period_end DESC",
      "SELECT o.id,o.property_id propertyId,o.enquiry_id enquiryId,p.title property,o.amount_minor amountMinor,o.currency,o.status,o.conditions,o.submitted_at submittedAt,c.full_name contact FROM offers o JOIN properties p ON p.id=o.property_id AND p.agency_id=o.agency_id LEFT JOIN contacts c ON c.id=o.contact_id AND c.agency_id=o.agency_id WHERE o.agency_id=? ORDER BY o.submitted_at DESC",
      "SELECT d.id,d.resource_id propertyId,p.title property,d.title,d.category,d.seller_visible sellerVisible,d.approved_at approvedAt FROM documents d JOIN properties p ON p.id=d.resource_id AND p.agency_id=d.agency_id WHERE d.agency_id=? AND d.resource_type='property' AND d.status='active' ORDER BY d.created_at DESC",
      "SELECT s.id,s.property_id propertyId,p.title property,s.frequency,s.recipient_email recipientEmail,s.next_run_at nextRunAt,s.active FROM seller_report_schedules s JOIN properties p ON p.id=s.property_id AND p.agency_id=s.agency_id WHERE s.agency_id=? ORDER BY s.next_run_at",
      "SELECT id,property_id propertyId,report_id reportId,document_id documentId,recipient_email recipientEmail,channel,status,attempts,last_error lastError,sent_at sentAt,created_at createdAt FROM seller_deliveries WHERE agency_id=? ORDER BY created_at DESC LIMIT 50",
      "SELECT m.id,m.property_id propertyId,p.title property,m.type,m.expires_at expiresAt,m.status FROM mandates m JOIN properties p ON p.id=m.property_id AND p.agency_id=m.agency_id WHERE m.agency_id=? ORDER BY m.expires_at",
    ];
    const rows = await Promise.all(queries.map(query => env.DB.prepare(query).bind(agencyId).all<any>()));
    const scope = await accessiblePropertyIds(current.workspace);
    const keys = ["properties", "enquiries", "grants", "reports", "offers", "documents", "schedules", "deliveries", "mandates"];
    return Response.json(Object.fromEntries(keys.map((key, index) => [key, scope ? rows[index].results.filter(row => scope.has(String(index === 0 ? row.id : row.propertyId))) : rows[index].results])));
  } catch (error) {
    return denied(error);
  }
}

async function POST(request: Request) {
  try {
    const current = await context();
    if (!current) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json<any>();
    const agencyId = current.workspace.agencyId;
    const propertyId = String(body.propertyId || "");
    const listing = await property(agencyId, propertyId);
    if (!listing) return Response.json({ error: "Property was not found." }, { status: 404 });
    await requirePropertyBranchAccess(current.workspace, propertyId);

    if (body.action === "invite") {
      const email = sellerEmail(body.email);
      if (!validSellerEmail(email)) return Response.json({ error: "Enter a valid seller email address." }, { status: 400 });
      await env.DB.prepare("UPDATE seller_access_grants SET revoked_at=CURRENT_TIMESTAMP WHERE agency_id=? AND property_id=? AND lower(email)=? AND revoked_at IS NULL").bind(agencyId, propertyId, email).run();
      const id = crypto.randomUUID();
      const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
      const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();
      await env.DB.prepare("INSERT INTO seller_access_grants (id,agency_id,property_id,email,token_hash,expires_at,invited_by) VALUES (?,?,?,?,?,?,?)").bind(id, agencyId, propertyId, email, await hashSellerToken(token), expiresAt, current.user.userId).run();
      await writeAudit(current.workspace, "seller.access.invited", "seller_access_grant", id, { propertyId, email });
      return Response.json({ grant: { id, propertyId, email, property: listing.title, expiresAt, acceptPath: `/seller?token=${encodeURIComponent(token)}` } }, { status: 201 });
    }

    if (body.action === "create_report") {
      const frequency = String(body.frequency || "weekly");
      const report = await draft(agencyId, propertyId, current.user.userId, days[frequency] || 7);
      if (!report) return Response.json({ error: "Property was not found." }, { status: 404 });
      await writeAudit(current.workspace, "seller.report.created", "seller_report", report.id, { propertyId, frequency });
      return Response.json({ report }, { status: 201 });
    }

    if (body.action === "create_offer") {
      const amountMinor = Math.round(Number(body.amount) * 100);
      const currency = String(body.currency || "USD").slice(0, 3).toUpperCase();
      const conditions = String(body.conditions || "").trim().slice(0, 800);
      if (!Number.isFinite(amountMinor) || amountMinor <= 0) return Response.json({ error: "Enter a valid offer amount." }, { status: 400 });
      const enquiryId = String(body.enquiryId || "");
      const enquiry = await env.DB.prepare("SELECT id,contact_id contactId,contact_name contact,assigned_user_id assignedUserId FROM enquiries WHERE id=? AND agency_id=? AND property_id=? AND contact_id IS NOT NULL AND stage NOT IN ('Lost','Closed')").bind(enquiryId, agencyId, propertyId).first<any>();
      if (!enquiry) return Response.json({ error: "Choose an active enquiry for this property before recording the offer." }, { status: 400 });
      const id = crypto.randomUUID();
      const dueAt = new Date(Date.now() + 86400000).toISOString();
      await env.DB.batch([
        env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=CURRENT_TIMESTAMP WHERE agency_id=? AND resource_type='enquiry' AND resource_id=? AND status='open'").bind(agencyId, enquiryId),
        env.DB.prepare("INSERT INTO offers (id,agency_id,property_id,contact_id,enquiry_id,amount_minor,currency,status,conditions,created_by) VALUES (?,?,?,?,?,?,?,'submitted',?,?)").bind(id, agencyId, propertyId, enquiry.contactId, enquiryId, amountMinor, currency, conditions, current.user.userId),
        env.DB.prepare("UPDATE enquiries SET stage='Offer',status='Contacted',contacted_at=COALESCE(contacted_at,CURRENT_TIMESTAMP),next_follow_up_at=? WHERE id=? AND agency_id=? AND property_id=?").bind(dueAt, enquiryId, agencyId, propertyId),
        env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,?,?,? ,?,'high',?,'open',?)").bind(crypto.randomUUID(), agencyId, "offer", id, "offer_follow_up", `Follow up on ${enquiry.contact || "buyer"}'s offer for ${listing.title}`, dueAt, enquiry.assignedUserId || current.user.userId),
        env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), agencyId, enquiry.contactId, current.user.userId, "offer.submitted", `${currency} ${(amountMinor / 100).toLocaleString("en-US")} offer recorded for ${listing.title}`, "offer", id),
      ]);
      await writeAudit(current.workspace, "offer.submitted", "offer", id, { propertyId, enquiryId, contactId: enquiry.contactId, amountMinor, currency });
      return Response.json({ offer: { id, enquiryId, status: "submitted", nextActionDueAt: dueAt } }, { status: 201 });
    }

    if (body.action === "create_schedule") {
      const frequency = String(body.frequency || "");
      const email = sellerEmail(body.email);
      if (!days[frequency] || !validSellerEmail(email)) return Response.json({ error: "Choose a schedule and valid seller email." }, { status: 400 });
      const id = crypto.randomUUID();
      const next = new Date(Date.now() + days[frequency] * 864e5).toISOString();
      await env.DB.prepare("INSERT INTO seller_report_schedules (id,agency_id,property_id,frequency,recipient_email,next_run_at,created_by) VALUES (?,?,?,?,?,?,?) ON CONFLICT(agency_id,property_id,recipient_email) DO UPDATE SET frequency=excluded.frequency,next_run_at=excluded.next_run_at,active=1,updated_at=CURRENT_TIMESTAMP").bind(id, agencyId, propertyId, frequency, email, next, current.user.userId).run();
      await writeAudit(current.workspace, "seller.schedule.saved", "seller_report_schedule", id, { propertyId, frequency, email });
      return Response.json({ scheduled: true, nextRunAt: next }, { status: 201 });
    }

    if (body.action === "process_schedules") {
      const due = await env.DB.prepare("SELECT id,property_id propertyId,frequency FROM seller_report_schedules WHERE agency_id=? AND active=1 AND next_run_at<=CURRENT_TIMESTAMP LIMIT 25").bind(agencyId).all<any>();
      let created = 0;
      for (const schedule of due.results) {
        try { await requirePropertyBranchAccess(current.workspace, schedule.propertyId); } catch { continue; }
        if (await draft(agencyId, schedule.propertyId, current.user.userId, days[schedule.frequency] || 7)) created++;
        await env.DB.prepare("UPDATE seller_report_schedules SET next_run_at=datetime(CURRENT_TIMESTAMP,?),updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(`+${days[schedule.frequency] || 7} days`, schedule.id, agencyId).run();
      }
      await writeAudit(current.workspace, "seller.schedules.processed", "seller_report_schedule", "batch", { created });
      return Response.json({ created });
    }
    return Response.json({ error: "Unsupported seller action." }, { status: 400 });
  } catch (error) {
    return denied(error);
  }
}

async function PATCH(request: Request) {
  try {
    const current = await context();
    if (!current) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json<any>();
    const id = String(body.id || "");
    const action = String(body.action || "");
    const agencyId = current.workspace.agencyId;
    const linked = await env.DB.prepare("SELECT COALESCE((SELECT property_id FROM seller_reports WHERE id=? AND agency_id=?),(SELECT resource_id FROM documents WHERE id=? AND agency_id=?),(SELECT property_id FROM offers WHERE id=? AND agency_id=?),(SELECT property_id FROM seller_access_grants WHERE id=? AND agency_id=?)) propertyId").bind(id, agencyId, id, agencyId, id, agencyId, id, agencyId).first<any>();
    if (linked?.propertyId) await requirePropertyBranchAccess(current.workspace, linked.propertyId);

    if (action === "approve_report") {
      const report = await env.DB.prepare("SELECT r.*,p.title,p.reference,p.location,a.name agency FROM seller_reports r JOIN properties p ON p.id=r.property_id AND p.agency_id=r.agency_id JOIN agencies a ON a.id=r.agency_id WHERE r.id=? AND r.agency_id=? AND r.status='draft'").bind(id, agencyId).first<any>();
      if (!report) return Response.json({ error: "Draft report was not found." }, { status: 404 });
      const approvedAt = new Date().toISOString();
      const pdf = sellerReportPdf({ agency: report.agency, property: report.title, reference: report.reference, location: report.location, periodStart: report.period_start, periodEnd: report.period_end, views: report.views, enquiries: report.enquiries, viewings: report.viewings, offers: report.offers, momentum: report.momentum, summary: report.summary, feedbackSummary: report.feedback_summary, recommendedAction: report.recommended_action, approvedAt });
      const key = `tenants/${agencyId}/seller-reports/${id}.pdf`;
      await env.MEDIA.put(key, pdf, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { agencyId, reportId: id } });
      await env.DB.prepare("UPDATE seller_reports SET status='approved',approved_by=?,approved_at=?,pdf_object_key=?,pdf_byte_size=? WHERE id=? AND agency_id=? AND status='draft'").bind(current.user.userId, approvedAt, key, pdf.byteLength, id, agencyId).run();
      const recipients = await env.DB.prepare("SELECT DISTINCT email FROM seller_access_grants WHERE agency_id=? AND property_id=? AND revoked_at IS NULL").bind(agencyId, report.property_id).all<any>();
      for (const recipient of recipients.results) await env.DB.batch([
        env.DB.prepare("INSERT INTO seller_deliveries (id,agency_id,property_id,report_id,recipient_email,channel,status,provider,attempts,sent_at) VALUES (?,?,?,?,?,'portal','sent','estara-portal',1,CURRENT_TIMESTAMP)").bind(crypto.randomUUID(), agencyId, report.property_id, id, recipient.email),
        env.DB.prepare("INSERT INTO seller_deliveries (id,agency_id,property_id,report_id,recipient_email,channel,status,provider,attempts,last_error) VALUES (?,?,?,?,?,'email','queued','pending-provider',0,'Awaiting configured email provider')").bind(crypto.randomUUID(), agencyId, report.property_id, id, recipient.email),
      ]);
      await writeAudit(current.workspace, "seller.report.approved", "seller_report", id, { pdfBytes: pdf.byteLength, recipients: recipients.results.length });
      return Response.json({ approved: true, hasPdf: true });
    }

    if (action === "approve_document") {
      const result = await env.DB.prepare("UPDATE documents SET seller_visible=1,approved_by=?,approved_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND resource_type='property' AND status='active'").bind(current.user.userId, id, agencyId).run();
      if (!result.meta.changes) return Response.json({ error: "Property document was not found." }, { status: 404 });
      const document = await env.DB.prepare("SELECT resource_id propertyId FROM documents WHERE id=? AND agency_id=?").bind(id, agencyId).first<any>();
      await env.DB.prepare("INSERT INTO seller_deliveries (id,agency_id,property_id,document_id,recipient_email,channel,status,provider,attempts,sent_at) SELECT lower(hex(randomblob(16))),agency_id,property_id,?,email,'portal','sent','estara-portal',1,CURRENT_TIMESTAMP FROM seller_access_grants WHERE agency_id=? AND property_id=? AND revoked_at IS NULL").bind(id, agencyId, document.propertyId).run();
      await writeAudit(current.workspace, "seller.document.approved", "document", id);
      return Response.json({ approved: true });
    }

    if (action === "offer_status") {
      const status = String(body.status || "");
      if (!["accepted", "rejected", "withdrawn"].includes(status)) return Response.json({ error: "Invalid offer status." }, { status: 400 });
      const result = await env.DB.prepare("UPDATE offers SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status='submitted'").bind(status, id, agencyId).run();
      if (!result.meta.changes) return Response.json({ error: "Submitted offer was not found." }, { status: 404 });
      await writeAudit(current.workspace, "offer.status_changed", "offer", id, { status });
      return Response.json({ updated: true });
    }

    if (action === "revoke_access") {
      const result = await env.DB.prepare("UPDATE seller_access_grants SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND revoked_at IS NULL").bind(id, agencyId).run();
      if (!result.meta.changes) return Response.json({ error: "Active seller access was not found." }, { status: 404 });
      await writeAudit(current.workspace, "seller.access.revoked", "seller_access_grant", id);
      return Response.json({ revoked: true });
    }
    return Response.json({ error: "Unsupported seller action." }, { status: 400 });
  } catch (error) {
    return denied(error);
  }
}

export { GET, PATCH, POST, dynamic };
