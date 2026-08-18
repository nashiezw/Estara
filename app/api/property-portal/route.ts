import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
const clean = (v: unknown, n = 600) => typeof v === "string" ? v.trim().slice(0, n) : "", uid = () => crypto.randomUUID();
const digest = async (v: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))].map(x => x.toString(16).padStart(2, "0")).join("");
async function user() { const value = await getChatGPTUser(); if (!value)
    throw new Error("Sign in is required."); return value; }
async function grants(userId: string) { return env.DB.prepare(`SELECT pg.id,pg.agency_id agencyId,pg.managed_property_id managedPropertyId,pg.contact_id contactId,pg.audience,p.id propertyId,p.title property,p.location,mp.landlord_contact_id landlordContactId,a.name agencyName,s.phone agencyPhone,s.whatsapp agencyWhatsapp,s.email agencyEmail FROM property_portal_grants pg JOIN managed_properties mp ON mp.id=pg.managed_property_id AND mp.agency_id=pg.agency_id JOIN properties p ON p.id=mp.property_id AND p.agency_id=pg.agency_id JOIN agencies a ON a.id=pg.agency_id LEFT JOIN agency_settings s ON s.agency_id=pg.agency_id WHERE pg.accepted_user_id=? AND pg.accepted_at IS NOT NULL AND pg.revoked_at IS NULL`).bind(userId).all<any>(); }
export async function GET() { try {
    const u = await user(), access = await grants(u.userId);
    if (!access.results.length)
        return Response.json({ grants: [], properties: [], leases: [], charges: [], payments: [], receipts: [], deposits: [], expenses: [], statements: [], maintenance: [], inspections: [], renewals: [], documents: [], updates: [], inspectionReports: [], inspectionMedia: [], marketing: [], saleActivity: [] });
    const output: any = { grants: access.results, properties: [], leases: [], charges: [], payments: [], receipts: [], deposits: [], expenses: [], statements: [], maintenance: [], inspections: [], renewals: [], documents: [], updates: [], inspectionReports: [], inspectionMedia: [], marketing: [], saleActivity: [] };
    for (const g of access.results) {
        const tenant = g.audience === "tenant";
        const [leases, maintenance, inspections, renewals, statements, expenses] = await Promise.all([env.DB.prepare("SELECT id,starts_at startsAt,ends_at endsAt,rent_minor rentMinor,deposit_minor depositMinor,currency,due_day dueDay,status FROM leases WHERE agency_id=? AND managed_property_id=? AND (?='landlord' OR tenant_contact_id=?) ORDER BY starts_at DESC").bind(g.agencyId, g.managedPropertyId, g.audience, g.contactId).all(), env.DB.prepare("SELECT id,title,description,priority,status,approval_status approvalStatus,approved_minor approvedMinor,scheduled_at scheduledAt,completed_at completedAt,created_at createdAt FROM maintenance_requests WHERE agency_id=? AND managed_property_id=? AND (?='landlord' OR reported_by_contact_id=? OR reported_by_contact_id IS NULL) ORDER BY created_at DESC").bind(g.agencyId, g.managedPropertyId, g.audience, g.contactId).all(), env.DB.prepare("SELECT id,inspection_type inspectionType,scheduled_at scheduledAt,completed_at completedAt,summary,status FROM property_inspections WHERE agency_id=? AND managed_property_id=? ORDER BY scheduled_at DESC").bind(g.agencyId, g.managedPropertyId).all(), env.DB.prepare(`SELECT lr.id,lr.proposed_rent_minor proposedRentMinor,lr.proposed_starts_at proposedStartsAt,lr.proposed_ends_at proposedEndsAt,lr.status FROM lease_renewals lr JOIN leases l ON l.id=lr.lease_id AND l.agency_id=lr.agency_id WHERE lr.agency_id=? AND l.managed_property_id=? AND (?='landlord' OR l.tenant_contact_id=?) ORDER BY lr.created_at DESC`).bind(g.agencyId, g.managedPropertyId, g.audience, g.contactId).all(), tenant ? Promise.resolve({ results: [] }) : env.DB.prepare("SELECT id,period_start periodStart,period_end periodEnd,rent_collected_minor rentCollectedMinor,management_fee_minor managementFeeMinor,expenses_minor expensesMinor,net_payable_minor netPayableMinor,currency,status,finalized_at finalizedAt FROM landlord_statements WHERE agency_id=? AND landlord_contact_id=? ORDER BY finalized_at DESC").bind(g.agencyId, g.contactId).all(), tenant ? Promise.resolve({ results: [] }) : env.DB.prepare("SELECT id,category,description,amount_minor amountMinor,currency,incurred_at incurredAt FROM property_expenses WHERE agency_id=? AND managed_property_id=? ORDER BY incurred_at DESC").bind(g.agencyId, g.managedPropertyId).all()]);
        output.properties.push({ managedPropertyId: g.managedPropertyId, title: g.property, location: g.location, audience: g.audience, agencyName:g.agencyName, agencyPhone:g.agencyPhone, agencyWhatsapp:g.agencyWhatsapp, agencyEmail:g.agencyEmail });
        output.leases.push(...leases.results.map((x: any) => ({ ...x, managedPropertyId: g.managedPropertyId })));
        output.maintenance.push(...maintenance.results.map((x: any) => ({ ...x, managedPropertyId: g.managedPropertyId, audience: g.audience })));
        output.inspections.push(...inspections.results);
        output.renewals.push(...renewals.results);
        output.statements.push(...statements.results);
        output.expenses.push(...expenses.results);
        const [documents,updates,reports,inspectionMedia,marketing,saleActivity]=await Promise.all([env.DB.prepare(`SELECT d.id,d.title,d.category,d.original_name originalName,d.byte_size byteSize,pds.created_at sharedAt FROM portal_document_shares pds JOIN documents d ON d.id=pds.document_id AND d.agency_id=pds.agency_id WHERE pds.agency_id=? AND pds.managed_property_id=? AND (pds.audience='all' OR pds.audience=?) AND d.status='active' ORDER BY pds.created_at DESC`).bind(g.agencyId,g.managedPropertyId,g.audience).all(),env.DB.prepare("SELECT id,title,body,audience,created_at createdAt FROM property_portal_updates WHERE agency_id=? AND managed_property_id=? AND (audience='all' OR audience=?) ORDER BY created_at DESC").bind(g.agencyId,g.managedPropertyId,g.audience).all(),env.DB.prepare(`SELECT ir.id,ir.inspection_id inspectionId,ir.rooms_json rooms,ir.meter_readings_json meterReadings,ir.signatures_json signatures,ir.finalized_at finalizedAt,pi.inspection_type inspectionType,pi.summary FROM inspection_reports ir JOIN property_inspections pi ON pi.id=ir.inspection_id AND pi.agency_id=ir.agency_id WHERE ir.agency_id=? AND pi.managed_property_id=? ORDER BY ir.finalized_at DESC`).bind(g.agencyId,g.managedPropertyId).all(),env.DB.prepare(`SELECT im.id,im.inspection_id inspectionId,im.caption,im.created_at createdAt FROM inspection_media_assets im JOIN property_inspections pi ON pi.id=im.inspection_id AND pi.agency_id=im.agency_id WHERE im.agency_id=? AND pi.managed_property_id=? ORDER BY im.created_at DESC`).bind(g.agencyId,g.managedPropertyId).all(),tenant?Promise.resolve({results:[]}):env.DB.prepare("SELECT mrj.id,mrj.format,mrj.review_status reviewStatus,mrj.completed_at completedAt FROM marketing_render_jobs mrj WHERE mrj.agency_id=? AND mrj.property_id=? AND mrj.status='complete' AND mrj.review_status='approved' ORDER BY mrj.completed_at DESC").bind(g.agencyId,g.propertyId).all(),tenant?Promise.resolve({results:[]}):env.DB.prepare(`SELECT 'offer' kind,id,status,amount_minor amountMinor,currency,submitted_at occurredAt FROM offers WHERE agency_id=? AND property_id=? UNION ALL SELECT 'deal' kind,id,status,value_minor amountMinor,currency,created_at occurredAt FROM deals WHERE agency_id=? AND property_id=? ORDER BY occurredAt DESC`).bind(g.agencyId,g.propertyId,g.agencyId,g.propertyId).all()]);
        output.documents.push(...documents.results);output.updates.push(...updates.results);output.inspectionReports.push(...reports.results.map((x:any)=>({...x,rooms:JSON.parse(x.rooms||"[]"),meterReadings:JSON.parse(x.meterReadings||"[]"),signatures:JSON.parse(x.signatures||"[]")})));output.inspectionMedia.push(...inspectionMedia.results.map((x:any)=>({...x,url:`/api/property-portal/inspection-media?id=${encodeURIComponent(x.id)}`})));output.marketing.push(...marketing.results);output.saleActivity.push(...saleActivity.results);
        if (tenant && leases.results.length) {
            const leaseIds = leases.results.map((x: any) => x.id);
            for (const leaseId of leaseIds) {
                const [charges, payments, receipts, deposits] = await Promise.all([env.DB.prepare("SELECT id,period,due_at dueAt,amount_minor amountMinor,allocated_minor allocatedMinor,status FROM rent_charges WHERE agency_id=? AND lease_id=? ORDER BY due_at DESC").bind(g.agencyId, leaseId).all(), env.DB.prepare("SELECT id,amount_minor amountMinor,unallocated_minor unallocatedMinor,currency,method,received_at receivedAt FROM rent_payments WHERE agency_id=? AND lease_id=? ORDER BY received_at DESC").bind(g.agencyId, leaseId).all(), env.DB.prepare(`SELECT rr.id,rr.receipt_number receiptNumber,rr.amount_minor amountMinor,rr.currency,rr.issued_at issuedAt FROM rent_receipts rr JOIN rent_payments rp ON rp.id=rr.payment_id AND rp.agency_id=rr.agency_id WHERE rr.agency_id=? AND rp.lease_id=? ORDER BY rr.issued_at DESC`).bind(g.agencyId, leaseId).all(), env.DB.prepare("SELECT id,amount_minor amountMinor,currency,status,released_minor releasedMinor,deduction_minor deductionMinor,note FROM tenancy_deposits WHERE agency_id=? AND lease_id=?").bind(g.agencyId, leaseId).all()]);
                output.charges.push(...charges.results);
                output.payments.push(...payments.results);
                output.receipts.push(...receipts.results);
                output.deposits.push(...deposits.results);
            }
        }
    }
    return Response.json(output);
}
catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Portal could not load." }, { status: 401 });
} }
export async function POST(request: Request) { try {
    const u = await user(), b = await request.json(), action = clean(b.action, 30);
    if (action === "accept") {
        const token = clean(b.token, 200), row = await env.DB.prepare("SELECT id,email FROM property_portal_grants WHERE token_hash=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP").bind(await digest(token)).first<{
            id: string;
            email: string;
        }>();
        if (!row)
            throw new Error("This invitation is invalid or expired.");
        if (row.email.toLowerCase() !== u.email.toLowerCase())
            throw new Error("Sign in with the email address that received this invitation.");
        await env.DB.batch([
            env.DB.prepare("UPDATE property_portal_grants SET accepted_user_id=?,accepted_at=CURRENT_TIMESTAMP WHERE id=? AND accepted_at IS NULL").bind(u.userId, row.id),
            env.DB.prepare("INSERT INTO audit_logs(id,agency_id,actor_user_id,action,resource_type,resource_id,detail) SELECT ?,agency_id,?,'property_portal.accepted','property_portal_grant',id,'{}' FROM property_portal_grants WHERE id=?").bind(uid(), u.userId, row.id),
        ]);
        return Response.json({ accepted: true });
    }
    const access = await grants(u.userId);
    if (action === "report_maintenance") {
        const managedPropertyId = clean(b.managedPropertyId, 100), grant = access.results.find((g: any) => g.managedPropertyId === managedPropertyId && g.audience === "tenant");
        if (!grant)
            throw new Error("Tenant access is required.");
        const title = clean(b.title, 120), description = clean(b.description, 1000), priority = clean(b.priority, 20);
        if (!title || !description || !["low", "normal", "high", "urgent"].includes(priority))
            throw new Error("Complete the maintenance report.");
        const lease = await env.DB.prepare("SELECT id FROM leases WHERE agency_id=? AND managed_property_id=? AND tenant_contact_id=? AND status='active' ORDER BY starts_at DESC LIMIT 1").bind(grant.agencyId, managedPropertyId, grant.contactId).first<{
            id: string;
        }>(), recordId = uid();
        await env.DB.batch([
            env.DB.prepare("INSERT INTO maintenance_requests(id,agency_id,managed_property_id,lease_id,reported_by_contact_id,title,description,priority,approval_status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(recordId, grant.agencyId, managedPropertyId, lease?.id || null, grant.contactId, title, description, priority, priority === "urgent" ? "pending" : "not_required", u.userId),
            env.DB.prepare("INSERT INTO audit_logs(id,agency_id,actor_user_id,action,resource_type,resource_id,detail) VALUES(?,?,?,?,?,?,?)").bind(uid(), grant.agencyId, u.userId, "maintenance.reported_from_portal", "maintenance_request", recordId, JSON.stringify({ managedPropertyId, priority })),
        ]);
        return Response.json({ id: recordId }, { status: 201 });
    }
    if (action === "landlord_approval") {
        const id = clean(b.id, 100), row = await env.DB.prepare("SELECT agency_id agencyId,managed_property_id managedPropertyId FROM maintenance_requests WHERE id=?").bind(id).first<any>(), grant = row && access.results.find((g: any) => g.agencyId === row.agencyId && g.managedPropertyId === row.managedPropertyId && g.audience === "landlord");
        if (!grant)
            throw new Error("Landlord access is required.");
        const decision = b.approved ? "approved" : "declined";
        await env.DB.batch([
            env.DB.prepare("UPDATE maintenance_requests SET approval_status=?,status=CASE WHEN ?='approved' THEN 'approved' ELSE 'cancelled' END,approved_minor=CASE WHEN ?='approved' THEN COALESCE(estimated_minor,approved_minor) ELSE approved_minor END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND approval_status='pending'").bind(decision, decision, decision, id, row.agencyId),
            env.DB.prepare("INSERT INTO maintenance_updates(id,agency_id,request_id,actor_user_id,status,note) VALUES(?,?,?,?,?,?)").bind(uid(), row.agencyId, id, u.userId, decision, clean(b.note, 500)),
            env.DB.prepare("INSERT INTO audit_logs(id,agency_id,actor_user_id,action,resource_type,resource_id,detail) VALUES(?,?,?,?,?,?,?)").bind(uid(), row.agencyId, u.userId, "maintenance.landlord_approval", "maintenance_request", id, JSON.stringify({ decision })),
        ]);
        return Response.json({ decision });
    }
    if (action === "renewal_decision") {
        const id = clean(b.id, 100), row = await env.DB.prepare(`SELECT lr.agency_id agencyId,l.managed_property_id managedPropertyId,l.tenant_contact_id contactId FROM lease_renewals lr JOIN leases l ON l.id=lr.lease_id AND l.agency_id=lr.agency_id WHERE lr.id=? AND lr.status='offered'`).bind(id).first<any>(), grant = row && access.results.find((g: any) => g.agencyId === row.agencyId && g.managedPropertyId === row.managedPropertyId && g.contactId === row.contactId && g.audience === "tenant");
        if (!grant)
            throw new Error("Tenant access is required.");
        const status = b.accepted ? "accepted" : "declined";
        await env.DB.batch([
            env.DB.prepare("UPDATE lease_renewals SET status=?,tenant_decision_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND status='offered'").bind(status, id, row.agencyId),
            env.DB.prepare("INSERT INTO audit_logs(id,agency_id,actor_user_id,action,resource_type,resource_id,detail) VALUES(?,?,?,?,?,?,?)").bind(uid(), row.agencyId, u.userId, "lease_renewal.tenant_decision", "lease_renewal", id, JSON.stringify({ status })),
        ]);
        return Response.json({ status });
    }
    throw new Error("Unknown portal action.");
}
catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Portal operation failed." }, { status: 400 });
} }
