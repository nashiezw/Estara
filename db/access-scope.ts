import { env } from "cloudflare:workers";
import type { WorkspaceContext } from "./workspace";
import { AuthorizationError } from "./authorization";

type Membership = { role: string; branchScopeEnabled: number };

async function membership(workspace: WorkspaceContext) {
  return env.DB.prepare("SELECT role,branch_scope_enabled AS branchScopeEnabled FROM agency_memberships WHERE agency_id=? AND user_id=? LIMIT 1")
    .bind(workspace.agencyId, workspace.userId).first<Membership>();
}

export async function accessiblePropertyIds(workspace: WorkspaceContext): Promise<Set<string> | null> {
  const member = await membership(workspace);
  if (!member) throw new AuthorizationError();
  if (["principal", "admin"].includes(member.role) || !member.branchScopeEnabled) return null;
  const rows = await env.DB.prepare(`SELECT p.id FROM properties p
    JOIN branch_memberships bm ON bm.agency_id=p.agency_id AND bm.branch_id=p.branch_id AND bm.user_id=?
    WHERE p.agency_id=?`).bind(workspace.userId, workspace.agencyId).all<{ id: string }>();
  return new Set(rows.results.map(row => row.id));
}

export async function requireBranchAccess(workspace: WorkspaceContext, branchId: string | null | undefined) {
  const member = await membership(workspace);
  if (!member) throw new AuthorizationError();
  if (["principal", "admin"].includes(member.role) || !member.branchScopeEnabled) return;
  if (!branchId) throw new AuthorizationError("This record is outside your assigned branches.");
  const allowed = await env.DB.prepare("SELECT 1 FROM branch_memberships WHERE agency_id=? AND user_id=? AND branch_id=? LIMIT 1")
    .bind(workspace.agencyId, workspace.userId, branchId).first();
  if (!allowed) throw new AuthorizationError("This record is outside your assigned branches.");
}

export async function requirePropertyBranchAccess(workspace: WorkspaceContext, propertyId: string) {
  const property = await env.DB.prepare("SELECT branch_id AS branchId FROM properties WHERE id=? AND agency_id=? LIMIT 1")
    .bind(propertyId, workspace.agencyId).first<{ branchId: string | null }>();
  if (!property) throw new AuthorizationError("The linked property was not found.");
  await requireBranchAccess(workspace, property.branchId);
}

export async function requireDealBranchAccess(workspace: WorkspaceContext, dealId: string) {
  const row = await env.DB.prepare("SELECT property_id AS propertyId FROM deals WHERE id=? AND agency_id=? LIMIT 1")
    .bind(dealId, workspace.agencyId).first<{ propertyId: string }>();
  if (!row) throw new AuthorizationError("Deal was not found.");
  await requirePropertyBranchAccess(workspace, row.propertyId);
}

export async function requireEnquiryBranchAccess(workspace: WorkspaceContext, enquiryId: string) {
  const row = await env.DB.prepare("SELECT property_id AS propertyId FROM enquiries WHERE id=? AND agency_id=? LIMIT 1")
    .bind(enquiryId, workspace.agencyId).first<{ propertyId: string | null }>();
  if (!row) throw new AuthorizationError("Enquiry was not found.");
  if (!row.propertyId) throw new AuthorizationError("This enquiry is outside your assigned branches.");
  await requirePropertyBranchAccess(workspace, row.propertyId);
}

export async function canReadDocument(workspace: WorkspaceContext, documentId: string) {
  const row = await env.DB.prepare(`SELECT d.id,d.access_mode AS accessMode,m.role,m.branch_scope_enabled AS branchScopeEnabled,p.branch_id AS branchId
    FROM documents d JOIN agency_memberships m ON m.agency_id=d.agency_id AND m.user_id=?
    LEFT JOIN properties p ON d.resource_type='property' AND p.id=d.resource_id AND p.agency_id=d.agency_id
    WHERE d.id=? AND d.agency_id=? AND d.status='active' LIMIT 1`)
    .bind(workspace.userId, documentId, workspace.agencyId).first<{ id: string; accessMode: string; role: string; branchScopeEnabled: number; branchId: string | null }>();
  if (!row) return false;
  if (["principal", "admin"].includes(row.role)) return true;
  if (row.branchScopeEnabled && row.branchId) {
    const branch = await env.DB.prepare("SELECT 1 FROM branch_memberships WHERE agency_id=? AND user_id=? AND branch_id=? LIMIT 1")
      .bind(workspace.agencyId, workspace.userId, row.branchId).first();
    if (!branch) return false;
  }
  if (row.accessMode === "agency") return true;
  return Boolean(await env.DB.prepare(`SELECT 1 FROM document_permissions dp
    WHERE dp.agency_id=? AND dp.document_id=? AND dp.capability IN ('read','manage') AND (
      (dp.subject_type='user' AND dp.subject_id=?) OR
      (dp.subject_type='role' AND dp.subject_id=?) OR
      (dp.subject_type='branch' AND EXISTS(SELECT 1 FROM branch_memberships bm WHERE bm.agency_id=dp.agency_id AND bm.user_id=? AND bm.branch_id=dp.subject_id))
    ) LIMIT 1`).bind(workspace.agencyId, documentId, workspace.userId, row.role, workspace.userId).first());
}

export async function requireDocumentRead(workspace: WorkspaceContext, documentId: string) {
  if (!await canReadDocument(workspace, documentId)) throw new AuthorizationError("You do not have access to this document.");
}
