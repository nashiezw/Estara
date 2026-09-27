import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { requireWorkspace } from "../../../../db/workspace";
import { AuthorizationError, requirePermission, writeAudit } from "../../../../db/authorization";
import { canTransition } from "../../../../db/contact-policy";
import { VERIFICATION_ITEMS, activationReady, propertyPhotoRequirement, propertyPublishReadiness } from "../../../../db/property-policy";
import { requireEnquiryBranchAccess, requirePropertyBranchAccess } from "../../../../db/access-scope";
import { invalidatePublicSite } from "../../../../db/public-cache";

function guardedEnquiryAudit(workspace: any, action: string, enquiryId: string, detail: Record<string, unknown>, token: string) {
  return env.DB.prepare("INSERT INTO audit_logs(id,agency_id,actor_user_id,action,resource_type,resource_id,detail) SELECT ?,?,?,?,'enquiry',?,? WHERE EXISTS(SELECT 1 FROM enquiries WHERE id=? AND agency_id=? AND mutation_token=?)")
    .bind(crypto.randomUUID(), workspace.agencyId, workspace.userId, action, enquiryId, JSON.stringify(detail), enquiryId, workspace.agencyId, token);
}

async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const workspace = await requireWorkspace(user);
    const body = await request.json() as Record<string, any>;
    if (!body.resourceId) return Response.json({ error: "Resource is required." }, { status: 400 });

    if (body.action === "activate_property") {
      await requirePermission(workspace, "property.publish");
      const property = await env.DB.prepare("SELECT *, (SELECT COUNT(*) FROM media_assets m WHERE m.agency_id=properties.agency_id AND m.property_id=properties.id AND m.kind='property_photo') AS actual_photos FROM properties WHERE id=? AND agency_id=?")
        .bind(body.resourceId, workspace.agencyId).first<any>();
      if (!property) return Response.json({ error: "Property was not found." }, { status: 404 });
      await requirePropertyBranchAccess(workspace, body.resourceId);
      const facts = {
        title: property.title,
        transactionType: property.transaction_type,
        propertyType: property.property_type,
        priceMinor: property.price_minor,
        currency: property.currency,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        country: property.country,
        city: property.city,
        suburb: property.suburb,
        address: property.address,
        description: property.description,
        ownerContactId: property.owner_contact_id,
        listingAgentId: property.listing_agent_id,
        mandateId: property.mandate_id,
        photoCount: property.actual_photos,
        landSize: property.land_size,
      };
      const publish = propertyPublishReadiness(facts);
      const verified = await env.DB.prepare("SELECT item_key AS itemKey FROM property_verification_items WHERE agency_id=? AND property_id=? AND verified=1")
        .bind(workspace.agencyId, body.resourceId).all<any>();
      const autoVerified = VERIFICATION_ITEMS.filter(item => item === "ownership" ? Boolean(property.owner_contact_id) : item === "mandate" ? Boolean(property.mandate_id) : item === "price" ? Number(property.price_minor) > 0 : item === "address" ? Boolean(property.address && property.city && property.suburb) : item === "description" ? String(property.description || "").trim().length >= 40 : item === "photos" ? Number(property.actual_photos) >= propertyPhotoRequirement(facts) : false);
      const readiness = activationReady(facts, [...new Set([...verified.results.map(item => item.itemKey), ...autoVerified])]);
      if (!publish.ready) return Response.json({ error: `Add before publishing: ${publish.missing.join(", ")}.`, publish, readiness }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE properties SET status='Available',updated_at=CURRENT_TIMESTAMP WHERE id=? AND agency_id=?").bind(body.resourceId, workspace.agencyId),
        env.DB.prepare("INSERT INTO property_status_events(id,agency_id,property_id,from_status,to_status,reason,actor_user_id) VALUES(?,?,?,?,'Available','Listing published',?)").bind(crypto.randomUUID(), workspace.agencyId, body.resourceId, property.status, user.userId),
      ]);
      await writeAudit(workspace, "property.published", "property", body.resourceId, { verifiedReady: readiness.ready, complianceMissing: readiness.completeness.missing });
      await invalidatePublicSite(workspace.agencyId, body.resourceId);
      return Response.json({ status: "Available", publish, readiness });
    }

    if (body.action === "contact_enquiry") {
      await requirePermission(workspace, "enquiry.contact");
      const enquiry = await env.DB.prepare("SELECT stage,contact_id AS contactId,contact_name AS name,assigned_user_id AS assignedUserId,contacted_at AS contactedAt FROM enquiries WHERE id=? AND agency_id=?")
        .bind(body.resourceId, workspace.agencyId).first<any>();
      if (!enquiry) return Response.json({ error: "Enquiry was not found." }, { status: 404 });
      await requireEnquiryBranchAccess(workspace, body.resourceId);
      if (enquiry.contactedAt) return Response.json({ error: "Contact has already been recorded for this enquiry." }, { status: 409 });

      const now = new Date().toISOString();
      const followUp = new Date(Date.now() + 864e5).toISOString();
      const token = crypto.randomUUID();
      const owner = enquiry.assignedUserId || user.userId;
      const statements: any[] = [
        env.DB.prepare("UPDATE enquiries SET status='Contacted',stage=CASE WHEN stage='New' THEN 'Contacted' ELSE stage END,contacted_at=?,next_follow_up_at=?,mutation_token=? WHERE id=? AND agency_id=? AND contacted_at IS NULL")
          .bind(now, followUp, token, body.resourceId, workspace.agencyId),
        env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=? WHERE agency_id=? AND resource_type='enquiry' AND resource_id=? AND action_type='respond' AND status='open' AND EXISTS(SELECT 1 FROM enquiries WHERE id=? AND agency_id=? AND mutation_token=?)")
          .bind(now, workspace.agencyId, body.resourceId, body.resourceId, workspace.agencyId, token),
        env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) SELECT ?,?,'enquiry',?,'follow_up','Follow up after initial contact','normal',?,'open',? WHERE EXISTS(SELECT 1 FROM enquiries WHERE id=? AND agency_id=? AND mutation_token=?)")
          .bind(crypto.randomUUID(), workspace.agencyId, body.resourceId, followUp, owner, body.resourceId, workspace.agencyId, token),
      ];
      if (enquiry.contactId) statements.push(
        env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) SELECT ?,?,?,?,?,?,'enquiry',? WHERE EXISTS(SELECT 1 FROM enquiries WHERE id=? AND agency_id=? AND mutation_token=?)")
          .bind(crypto.randomUUID(), workspace.agencyId, enquiry.contactId, user.userId, "enquiry.contacted", `Initial contact recorded with ${enquiry.name}`, body.resourceId, body.resourceId, workspace.agencyId, token),
      );
      statements.push(guardedEnquiryAudit(workspace, "enquiry.contacted", body.resourceId, {}, token));
      const result = await env.DB.batch(statements);
      if (!result[0]?.meta.changes) return Response.json({ error: "This enquiry changed while contact was being recorded. Refresh and try again." }, { status: 409 });
      return Response.json({ status: "Contacted", stage: enquiry.stage === "New" ? "Contacted" : enquiry.stage, nextAction: "Follow up tomorrow", nextFollowUpAt: followUp });
    }

    if (body.action === "transition_enquiry") {
      await requirePermission(workspace, "enquiry.contact");
      const current = await env.DB.prepare("SELECT stage,contact_id AS contactId,contact_name AS name,assigned_user_id AS assignedUserId FROM enquiries WHERE id=? AND agency_id=?")
        .bind(body.resourceId, workspace.agencyId).first<any>();
      if (!current) return Response.json({ error: "Enquiry was not found." }, { status: 404 });
      await requireEnquiryBranchAccess(workspace, body.resourceId);
      const next = String(body.stage || "");
      if (!canTransition(current.stage, next)) return Response.json({ error: `Cannot move an enquiry from ${current.stage} to ${next}.` }, { status: 409 });

      const terminal = ["Closed", "Won", "Lost"].includes(next);
      const firstContact = current.stage === "New" && next === "Contacted";
      const status = terminal ? next : "Contacted";
      const now = new Date().toISOString();
      const followUp = firstContact ? new Date(Date.now() + 864e5).toISOString() : null;
      const token = crypto.randomUUID();
      const owner = current.assignedUserId || user.userId;
      const statements: any[] = [
        env.DB.prepare("UPDATE enquiries SET stage=?,status=?,contacted_at=CASE WHEN ?=1 THEN COALESCE(contacted_at,?) ELSE contacted_at END,next_follow_up_at=CASE WHEN ?=1 THEN ? WHEN ?=1 THEN NULL ELSE next_follow_up_at END,mutation_token=? WHERE id=? AND agency_id=? AND stage=?")
          .bind(next, status, firstContact ? 1 : 0, now, firstContact ? 1 : 0, followUp, terminal ? 1 : 0, token, body.resourceId, workspace.agencyId, current.stage),
      ];
      if (firstContact) {
        statements.push(
          env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=? WHERE agency_id=? AND resource_type='enquiry' AND resource_id=? AND action_type='respond' AND status='open' AND EXISTS(SELECT 1 FROM enquiries WHERE id=? AND agency_id=? AND mutation_token=?)")
            .bind(now, workspace.agencyId, body.resourceId, body.resourceId, workspace.agencyId, token),
          env.DB.prepare("INSERT INTO next_actions(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id) SELECT ?,?,'enquiry',?,'follow_up','Follow up after initial contact','normal',?,'open',? WHERE EXISTS(SELECT 1 FROM enquiries WHERE id=? AND agency_id=? AND mutation_token=?)")
            .bind(crypto.randomUUID(), workspace.agencyId, body.resourceId, followUp, owner, body.resourceId, workspace.agencyId, token),
        );
      }
      if (terminal) statements.push(
        env.DB.prepare("UPDATE next_actions SET status='complete',completed_at=? WHERE agency_id=? AND resource_type='enquiry' AND resource_id=? AND status='open' AND EXISTS(SELECT 1 FROM enquiries WHERE id=? AND agency_id=? AND mutation_token=?)")
          .bind(now, workspace.agencyId, body.resourceId, body.resourceId, workspace.agencyId, token),
      );
      if (current.contactId) statements.push(
        env.DB.prepare("INSERT INTO contact_activities(id,agency_id,contact_id,actor_user_id,activity_type,summary,resource_type,resource_id) SELECT ?,?,?,?,?,?,'enquiry',? WHERE EXISTS(SELECT 1 FROM enquiries WHERE id=? AND agency_id=? AND mutation_token=?)")
          .bind(crypto.randomUUID(), workspace.agencyId, current.contactId, user.userId, "enquiry.stage_changed", `Enquiry moved from ${current.stage} to ${next}`, body.resourceId, body.resourceId, workspace.agencyId, token),
      );
      statements.push(guardedEnquiryAudit(workspace, "enquiry.stage_changed", body.resourceId, { from: current.stage, to: next }, token));
      const result = await env.DB.batch(statements);
      if (!result[0]?.meta.changes) return Response.json({ error: "This enquiry changed while its stage was being updated. Refresh and try again." }, { status: 409 });
      return Response.json({ stage: next, status, nextFollowUpAt: followUp });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthorizationError) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ error: "Action failed." }, { status: 500 });
  }
}

export { POST };
