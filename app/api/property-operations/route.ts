import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { requireWorkspace } from "../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../db/authorization";
import { requirePropertyBranchAccess, accessiblePropertyIds } from "../../../db/access-scope";
import { minor, leaseDates } from "../../../db/property-management-policy";
import { explainMatch } from "../../../db/matching-policy";
import { factualCopy } from "../../../db/marketing-render";
import { activationReady } from "../../../db/property-policy";
const clean = (v: unknown, n = 500) => typeof v === "string" ? v.trim().slice(0, n) : "", uid = () => crypto.randomUUID();
const hash = async (v: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))].map(x => x.toString(16).padStart(2, "0")).join("");
async function ctx() {
    const user = await getChatGPTUser();
    if (!user)
        throw new AuthorizationError("Sign in is required.");
    const workspace = await requireWorkspace(user);
    await requirePermission(workspace, "property_management.manage");
    return { user, workspace };
}
async function managed(workspace: Awaited<ReturnType<typeof requireWorkspace>>, managedPropertyId: string) {
    const row = await env.DB.prepare("SELECT property_id propertyId,landlord_contact_id landlordContactId FROM managed_properties WHERE id=? AND agency_id=?").bind(managedPropertyId, workspace.agencyId).first<{
        propertyId: string;
        landlordContactId: string;
    }>();
    if (!row)
        throw new Error("Managed property was not found.");
    await requirePropertyBranchAccess(workspace, row.propertyId);
    return row;
}
const fail = (e: unknown) => e instanceof AuthorizationError ? Response.json({ error: e.message }, { status: 403 }) : Response.json({ error: e instanceof Error ? e.message : "Operation failed." }, { status: 400 });
export async function GET() {
    try {
        const { workspace } = await ctx(), a = workspace.agencyId, scope = await accessiblePropertyIds(workspace), [requests, contractors, inspections, renewals, grants] = await Promise.all([env.DB.prepare(`SELECT mr.*,mp.property_id propertyId,p.title property,c.full_name contractor FROM maintenance_requests mr JOIN managed_properties mp ON mp.id=mr.managed_property_id AND mp.agency_id=mr.agency_id JOIN properties p ON p.id=mp.property_id AND p.agency_id=mr.agency_id LEFT JOIN contractors ct ON ct.id=mr.contractor_id AND ct.agency_id=mr.agency_id LEFT JOIN contacts c ON c.id=ct.contact_id AND c.agency_id=mr.agency_id WHERE mr.agency_id=? ORDER BY mr.created_at DESC`).bind(a).all(), env.DB.prepare("SELECT ct.id,ct.contact_id contactId,c.full_name fullName,ct.trade,ct.active,ct.notes FROM contractors ct JOIN contacts c ON c.id=ct.contact_id AND c.agency_id=ct.agency_id WHERE ct.agency_id=? ORDER BY c.full_name").bind(a).all(), env.DB.prepare(`SELECT pi.*,mp.property_id propertyId,p.title property FROM property_inspections pi JOIN managed_properties mp ON mp.id=pi.managed_property_id AND mp.agency_id=pi.agency_id JOIN properties p ON p.id=mp.property_id AND p.agency_id=pi.agency_id WHERE pi.agency_id=? ORDER BY pi.scheduled_at`).bind(a).all(), env.DB.prepare(`SELECT lr.*,mp.property_id propertyId,p.title property FROM lease_renewals lr JOIN leases l ON l.id=lr.lease_id AND l.agency_id=lr.agency_id JOIN managed_properties mp ON mp.id=l.managed_property_id AND mp.agency_id=l.agency_id JOIN properties p ON p.id=mp.property_id AND p.agency_id=l.agency_id WHERE lr.agency_id=? ORDER BY lr.proposed_starts_at`).bind(a).all(), env.DB.prepare(`SELECT pg.id,pg.audience,pg.email,pg.expires_at expiresAt,pg.accepted_at acceptedAt,pg.revoked_at revokedAt,mp.property_id propertyId,p.title property FROM property_portal_grants pg JOIN managed_properties mp ON mp.id=pg.managed_property_id AND mp.agency_id=pg.agency_id JOIN properties p ON p.id=mp.property_id AND p.agency_id=pg.agency_id WHERE pg.agency_id=? ORDER BY pg.created_at DESC`).bind(a).all()]), filter = (rows: any[]) => scope ? rows.filter(row => scope.has(row.propertyId)) : rows;
        return Response.json({ requests: filter(requests.results as any[]), contractors: contractors.results, inspections: filter(inspections.results as any[]), renewals: filter(renewals.results as any[]), grants: filter(grants.results as any[]) });
    }
    catch (e) {
        return fail(e);
    }
}
export async function POST(request: Request) {
    try {
        const { user, workspace } = await ctx(), a = workspace.agencyId, b = await request.json(), action = clean(b.action, 40);
        if (action === "invite_portal") {
            const managedPropertyId = clean(b.managedPropertyId, 100), audience = clean(b.audience, 20);
            if (!["landlord", "tenant"].includes(audience))
                throw new Error("Choose landlord or tenant access.");
            const mp = await managed(workspace, managedPropertyId);
            let contactId = mp.landlordContactId;
            if (audience === "tenant") {
                const active = await env.DB.prepare("SELECT tenant_contact_id contactId FROM leases WHERE agency_id=? AND managed_property_id=? AND status='active' ORDER BY starts_at DESC LIMIT 1").bind(a, managedPropertyId).first<{
                    contactId: string;
                }>();
                if (!active)
                    throw new Error("An active tenant lease is required.");
                contactId = active.contactId;
            }
            const contact = await env.DB.prepare("SELECT email_normalized email FROM contacts WHERE id=? AND agency_id=?").bind(contactId, a).first<{
                email: string;
            }>();
            if (!contact?.email)
                throw new Error("This contact needs an email address before portal access can be invited.");
            const token = crypto.randomUUID() + crypto.randomUUID(), grantId = uid(), expires = new Date(Date.now() + 7 * 864e5).toISOString();
            await env.DB.prepare("INSERT INTO property_portal_grants(id,agency_id,managed_property_id,contact_id,audience,email,token_hash,expires_at,invited_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(grantId, a, managedPropertyId, contactId, audience, contact.email, await hash(token), expires, user.userId).run();
            await writeAudit(workspace, "property_portal.invited", "property_portal_grant", grantId, { audience, managedPropertyId });
            return Response.json({ id: grantId, invitePath: `/property-portal?token=${encodeURIComponent(token)}`, expiresAt: expires }, { status: 201 });
        }
        if (action === "contractor") {
            const contactId = clean(b.contactId, 100), trade = clean(b.trade, 80);
            if (!contactId || !trade || !await env.DB.prepare("SELECT 1 FROM contacts WHERE id=? AND agency_id=?").bind(contactId, a).first())
                throw new Error("Choose an agency contact and trade.");
            const recordId = uid();
            await env.DB.prepare("INSERT INTO contractors(id,agency_id,contact_id,trade,notes,created_by) VALUES(?,?,?,?,?,?)").bind(recordId, a, contactId, trade, clean(b.notes), user.userId).run();
            await writeAudit(workspace, "contractor.created", "contractor", recordId, { contactId, trade });
            return Response.json({ id: recordId }, { status: 201 });
        }
        if (action === "maintenance") {
            const managedPropertyId = clean(b.managedPropertyId, 100);
            await managed(workspace, managedPropertyId);
            const title = clean(b.title, 120), description = clean(b.description, 1000), priority = clean(b.priority, 20), category = clean(b.category, 60) || "general", assignedUserId = clean(b.assignedUserId, 100) || user.userId;
            if (!title || !description || !["low", "normal", "high", "urgent"].includes(priority))
                throw new Error("Title, description and priority are required.");
            const recordId = uid();
            if (!await env.DB.prepare("SELECT 1 FROM agency_memberships WHERE agency_id=? AND user_id=?").bind(a, assignedUserId).first())
                throw new Error("Assigned staff member is outside this agency.");
            await env.DB.prepare("INSERT INTO maintenance_requests(id,agency_id,managed_property_id,category,title,description,priority,assigned_user_id,approval_status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(recordId, a, managedPropertyId, category, title, description, priority, assignedUserId, priority === "urgent" ? "pending" : "not_required", user.userId).run();
            await writeAudit(workspace, "maintenance.reported", "maintenance_request", recordId, { managedPropertyId, priority });
            return Response.json({ id: recordId }, { status: 201 });
        }
        if (action === "maintenance_update") {
            const recordId = clean(b.id, 100), row = await env.DB.prepare("SELECT mr.managed_property_id managedPropertyId,mp.property_id propertyId FROM maintenance_requests mr JOIN managed_properties mp ON mp.id=mr.managed_property_id AND mp.agency_id=mr.agency_id WHERE mr.id=? AND mr.agency_id=?").bind(recordId, a).first<{
                managedPropertyId: string;
                propertyId: string;
            }>();
            if (!row)
                throw new Error("Maintenance request was not found.");
            await requirePropertyBranchAccess(workspace, row.propertyId);
            const status = clean(b.status, 30), allowed = ["reported", "triaged", "awaiting_approval", "approved", "scheduled", "in_progress", "completed", "cancelled"];
            if (!allowed.includes(status))
                throw new Error("Invalid maintenance status.");
            const contractorId = clean(b.contractorId, 100), approved = Number(b.approved || 0) > 0 ? minor(b.approved) : null, estimated = Number(b.estimated || 0) > 0 ? minor(b.estimated) : null, actual = Number(b.actual || 0) > 0 ? minor(b.actual) : null, scheduledAt = clean(b.scheduledAt, 40) || null;
            if (contractorId && !await env.DB.prepare("SELECT 1 FROM contractors WHERE id=? AND agency_id=?").bind(contractorId, a).first())
                throw new Error("Contractor was not found.");
            await env.DB.batch([env.DB.prepare("UPDATE maintenance_requests SET status=?,contractor_id=COALESCE(?,contractor_id),estimated_minor=COALESCE(?,estimated_minor),approved_minor=COALESCE(?,approved_minor),actual_minor=COALESCE(?,actual_minor),scheduled_at=COALESCE(?,scheduled_at),approval_status=CASE WHEN ?='approved' THEN 'approved' WHEN ?='awaiting_approval' THEN 'pending' ELSE approval_status END,completed_at=CASE WHEN ?='completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(status, contractorId || null, estimated, approved, actual, scheduledAt, status, status, status, recordId, a), env.DB.prepare("INSERT INTO maintenance_updates(id,agency_id,request_id,actor_user_id,status,note,private_to_agency) VALUES(?,?,?,?,?,?,?)").bind(uid(), a, recordId, user.userId, status, clean(b.note, 1000), b.privateToAgency ? 1 : 0)]);
            await writeAudit(workspace, "maintenance.updated", "maintenance_request", recordId, { status, approved });
            return Response.json({ status });
        }
        if (action === "inspection") {
            const managedPropertyId = clean(b.managedPropertyId, 100);
            await managed(workspace, managedPropertyId);
            const scheduled = new Date(clean(b.scheduledAt, 40));
            if (!Number.isFinite(scheduled.getTime()))
                throw new Error("Choose a valid inspection time.");
            const recordId = uid();
            await env.DB.prepare("INSERT INTO property_inspections(id,agency_id,managed_property_id,lease_id,inspection_type,scheduled_at,private_media_prefix,assigned_user_id,created_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(recordId, a, managedPropertyId, clean(b.leaseId, 100) || null, clean(b.inspectionType, 40) || "routine", scheduled.toISOString(), `tenants/${a}/inspections/${recordId}/`, clean(b.assignedUserId, 100) || user.userId, user.userId).run();
            await writeAudit(workspace, "inspection.scheduled", "property_inspection", recordId, { managedPropertyId });
            return Response.json({ id: recordId }, { status: 201 });
        }
        if (action === "renewal") {
            const leaseId = clean(b.leaseId, 100), lease = await env.DB.prepare("SELECT l.ends_at endsAt,mp.property_id propertyId FROM leases l JOIN managed_properties mp ON mp.id=l.managed_property_id AND mp.agency_id=l.agency_id WHERE l.id=? AND l.agency_id=?").bind(leaseId, a).first<{
                endsAt: string;
                propertyId: string;
            }>();
            if (!lease)
                throw new Error("Lease was not found.");
            await requirePropertyBranchAccess(workspace, lease.propertyId);
            const dates = leaseDates(b.startsAt, b.endsAt), rent = minor(b.rent), recordId = uid();
            await env.DB.prepare("INSERT INTO lease_renewals(id,agency_id,lease_id,proposed_rent_minor,proposed_starts_at,proposed_ends_at,status,created_by) VALUES(?,?,?,?,?,?,'offered',?)").bind(recordId, a, leaseId, rent, dates.startsAt, dates.endsAt, user.userId).run();
            await writeAudit(workspace, "lease_renewal.offered", "lease_renewal", recordId, { leaseId });
            return Response.json({ id: recordId }, { status: 201 });
        }
        if (action === "finalize_inspection") {
            const inspectionId = clean(b.inspectionId, 100), row = await env.DB.prepare("SELECT pi.id,pi.managed_property_id managedPropertyId,mp.property_id propertyId FROM property_inspections pi JOIN managed_properties mp ON mp.id=pi.managed_property_id AND mp.agency_id=pi.agency_id WHERE pi.id=? AND pi.agency_id=? AND pi.status='scheduled'").bind(inspectionId, a).first<any>();
            if (!row)
                throw new Error("Scheduled inspection was not found.");
            await requirePropertyBranchAccess(workspace, row.propertyId);
            const rooms = Array.isArray(b.rooms) ? b.rooms.slice(0, 40).map((x: any) => ({ room: clean(x.room, 80), condition: clean(x.condition, 40), notes: clean(x.notes, 400) })).filter((x: any) => x.room && x.condition) : [], meters = Array.isArray(b.meters) ? b.meters.slice(0, 20).map((x: any) => ({ type: clean(x.type, 40), reading: clean(x.reading, 80) })).filter((x: any) => x.type && x.reading) : [], signatures = Array.isArray(b.signatures) ? b.signatures.slice(0, 5).map((x: any) => ({ role: clean(x.role, 30), name: clean(x.name, 100), signedAt: new Date().toISOString() })).filter((x: any) => x.role && x.name) : [];
            if (!rooms.length || !signatures.length)
                throw new Error("At least one room condition and signature are required.");
            const reportId = uid(), summary = clean(b.summary, 1500), snapshot = JSON.stringify({ version: 1, inspectionId, rooms, meters, signatures, summary, finalizedAt: new Date().toISOString() });
            await env.DB.batch([env.DB.prepare("INSERT INTO inspection_reports(id,agency_id,inspection_id,rooms_json,meter_readings_json,signatures_json,snapshot,finalized_by) VALUES(?,?,?,?,?,?,?,?)").bind(reportId, a, inspectionId, JSON.stringify(rooms), JSON.stringify(meters), JSON.stringify(signatures), snapshot, user.userId), env.DB.prepare("UPDATE property_inspections SET status='completed',summary=?,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(summary, inspectionId, a)]);
            await writeAudit(workspace, "inspection.report_finalized", "inspection_report", reportId, { inspectionId });
            return Response.json({ id: reportId }, { status: 201 });
        }
        if (action === "portal_update") {
            const managedPropertyId = clean(b.managedPropertyId, 100), audience = clean(b.audience, 20) || "all", title = clean(b.title, 120), body = clean(b.body, 1200);
            await managed(workspace, managedPropertyId);
            if (!["all", "landlord", "tenant"].includes(audience) || !title || !body)
                throw new Error("Complete the portal update.");
            const recordId = uid();
            await env.DB.prepare("INSERT INTO property_portal_updates(id,agency_id,managed_property_id,audience,title,body,created_by) VALUES(?,?,?,?,?,?,?)").bind(recordId, a, managedPropertyId, audience, title, body, user.userId).run();
            await writeAudit(workspace, "property_portal.update_published", "property_portal_update", recordId, { managedPropertyId, audience });
            return Response.json({ id: recordId }, { status: 201 });
        }
        if (action === "share_document") {
            const managedPropertyId = clean(b.managedPropertyId, 100), documentId = clean(b.documentId, 100), audience = clean(b.audience, 20), mp = await managed(workspace, managedPropertyId);
            if (!["landlord", "tenant", "all"].includes(audience))
                throw new Error("Choose a portal audience.");
            const document = await env.DB.prepare("SELECT id FROM documents WHERE id=? AND agency_id=? AND status='active' AND resource_type='property' AND resource_id=?").bind(documentId, a, mp.propertyId).first();
            if (!document)
                throw new Error("Choose an active document linked to this property.");
            const recordId = uid();
            await env.DB.prepare("INSERT INTO portal_document_shares(id,agency_id,managed_property_id,document_id,audience,shared_by) VALUES(?,?,?,?,?,?)").bind(recordId, a, managedPropertyId, documentId, audience, user.userId).run();
            await writeAudit(workspace, "property_portal.document_shared", "portal_document_share", recordId, { documentId, audience });
            return Response.json({ id: recordId }, { status: 201 });
        }
        if (action === "market_vacancy") {
            const leaseId = clean(b.leaseId, 100), rent = minor(b.rent), row = await env.DB.prepare("SELECT l.managed_property_id managedPropertyId,mp.property_id propertyId FROM leases l JOIN managed_properties mp ON mp.id=l.managed_property_id AND mp.agency_id=l.agency_id WHERE l.id=? AND l.agency_id=?").bind(leaseId, a).first<any>();
            if (!row)
                throw new Error("Lease was not found.");
            await requirePropertyBranchAccess(workspace, row.propertyId);
            const candidate=await env.DB.prepare("SELECT id,reference,title,location,price_minor priceMinor,currency,transaction_type transactionType,property_type propertyType,bedrooms,bathrooms,land_size landSize,building_size buildingSize,country,city,suburb,address,description,features,owner_contact_id ownerContactId,listing_agent_id listingAgentId,mandate_id mandateId,photo_count photoCount FROM properties WHERE id=? AND agency_id=?").bind(row.propertyId,a).first<any>(),verified=await env.DB.prepare("SELECT item_key itemKey FROM property_verification_items WHERE agency_id=? AND property_id=? AND verified=1").bind(a,row.propertyId).all<any>(),readiness=activationReady({...candidate,priceMinor:rent,transactionType:"Rent"},verified.results.map(x=>x.itemKey));
            if(!readiness.ready)throw new Error(`This property must be re-verified before vacancy activation: ${[...readiness.completeness.missing,...readiness.missingVerification].join(", ")}.`);
            await env.DB.prepare("UPDATE properties SET transaction_type='Rent',price_minor=?,price_label=?,status='Available',updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(rent, `US$${(rent / 100).toLocaleString()} / month`, row.propertyId, a).run();
            const property={...candidate,priceMinor:rent,transactionType:"Rent"}, copy = factualCopy({ ...property, features: JSON.parse(property.features || "[]") }), previous = await env.DB.prepare("SELECT MAX(version) version FROM marketing_copy_versions WHERE agency_id=? AND property_id=?").bind(a, row.propertyId).first<any>(), copyId = uid();
            await env.DB.prepare("INSERT INTO marketing_copy_versions(id,agency_id,property_id,version,headline,listing_description,social_caption,facts_snapshot,status,created_by) VALUES(?,?,?,?,?,?,?,?,'draft',?)").bind(copyId, a, row.propertyId, Number(previous?.version || 0) + 1, copy.headline, copy.listingDescription, copy.socialCaption, JSON.stringify(property), user.userId).run();
            const requirements = await env.DB.prepare("SELECT * FROM property_requirements WHERE agency_id=? AND transaction_type='Rent' AND status IN ('active','paused')").bind(a).all<any>();
            let matches = 0;
            for (const requirement of requirements.results) {
                const parse = (v: any) => { try {
                    return JSON.parse(v || "[]");
                }
                catch {
                    return [];
                } }, match = explainMatch({ transactionType: requirement.transaction_type, propertyTypes: parse(requirement.property_types), locations: parse(requirement.locations), minPriceMinor: requirement.min_price_minor, maxPriceMinor: requirement.max_price_minor, minBedrooms: requirement.min_bedrooms, minBathrooms: requirement.min_bathrooms, features: parse(requirement.features) }, { ...property, status: "Available", features: parse(property.features) });
                if (match.score >= 40) {
                    await env.DB.prepare("INSERT INTO property_matches(id,agency_id,requirement_id,property_id,score,explanation) VALUES(?,?,?,?,?,?) ON CONFLICT(requirement_id,property_id) DO UPDATE SET score=excluded.score,explanation=excluded.explanation,updated_at=CURRENT_TIMESTAMP").bind(uid(), a, requirement.id, row.propertyId, match.score, JSON.stringify(match.reasons)).run();
                    matches++;
                }
            }
            await env.DB.batch([["refresh_photos", "Request updated vacancy photos"], ["approve_marketing", "Review and approve generated rental marketing"], ...[matches ? ["contact_matched_tenants", `Contact ${matches} matched waiting tenant${matches === 1 ? "" : "s"}`] : ["review_demand", "No waiting tenant matched; review rental demand"]]].map(([type, reason]) => env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) VALUES(?,?,'property',?,?,?,'high',CURRENT_TIMESTAMP,'open',?)").bind(uid(), a, row.propertyId, type, reason, user.userId)));
            await writeAudit(workspace, "vacancy.marketing_activated", "property", row.propertyId, { leaseId, rent, marketingCopyId: copyId, matches });
            return Response.json({ propertyId: row.propertyId, status: "Available", marketingCopyId: copyId, matches });
        }
        if (action === "revoke_portal") {
            const grantId = clean(b.id, 100), row = await env.DB.prepare("SELECT pg.id,mp.property_id propertyId FROM property_portal_grants pg JOIN managed_properties mp ON mp.id=pg.managed_property_id AND mp.agency_id=pg.agency_id WHERE pg.id=? AND pg.agency_id=? AND pg.revoked_at IS NULL").bind(grantId, a).first<any>();
            if (!row)
                throw new Error("Portal grant was not found.");
            await requirePropertyBranchAccess(workspace, row.propertyId);
            await env.DB.prepare("UPDATE property_portal_grants SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=? AND revoked_at IS NULL").bind(grantId, a).run();
            await writeAudit(workspace, "property_portal.revoked", "property_portal_grant", grantId, {});
            return Response.json({ revoked: true });
        }
        return Response.json({ error: "Unknown property operation." }, { status: 400 });
    }
    catch (e) {
        return fail(e);
    }
}
