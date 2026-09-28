import { env } from "cloudflare:workers";
import { calculateActivation, calculatePrincipalMetrics } from "./workspace-metric-calculations.js";

type TimestampRow = { reachedAt?: string | null };
type EnquiryMetricRow = {
  assignedUserId?: string | null;
  createdAt: string;
  contactedAt?: string | null;
  status: string;
  source: string;
};

export async function workspaceMetrics(agencyId: string, role: string) {
  const [
    agency,
    thirdProperty,
    secondMember,
    firstPublished,
    firstMarketing,
    firstEnquiry,
    firstFollowUp,
  ] = await Promise.all([
    env.DB.prepare("SELECT created_at AS createdAt FROM agencies WHERE id=?").bind(agencyId).first<any>(),
    env.DB.prepare("SELECT created_at AS reachedAt FROM properties WHERE agency_id=? ORDER BY created_at,id LIMIT 1 OFFSET 2").bind(agencyId).first<TimestampRow>(),
    env.DB.prepare("SELECT created_at AS reachedAt FROM agency_memberships WHERE agency_id=? ORDER BY created_at,id LIMIT 1 OFFSET 1").bind(agencyId).first<TimestampRow>(),
    env.DB.prepare("SELECT MIN(COALESCE(updated_at,created_at)) AS reachedAt FROM properties WHERE agency_id=? AND status='Available'").bind(agencyId).first<TimestampRow>(),
    env.DB.prepare("SELECT MIN(created_at) AS reachedAt FROM marketing_outputs WHERE agency_id=?").bind(agencyId).first<TimestampRow>(),
    env.DB.prepare("SELECT MIN(created_at) AS reachedAt FROM enquiries WHERE agency_id=?").bind(agencyId).first<TimestampRow>(),
    env.DB.prepare("SELECT MIN(completed_at) AS reachedAt FROM next_actions WHERE agency_id=? AND status='complete' AND action_type IN ('respond','follow_up')").bind(agencyId).first<TimestampRow>(),
  ]);

  const steps = [
    { key: "properties", label: "Add 3 properties", target: 3, reachedAt: thirdProperty?.reachedAt || null },
    { key: "team", label: "Add 2 team members", target: 2, reachedAt: secondMember?.reachedAt || null },
    { key: "published", label: "Publish a listing", target: 1, reachedAt: firstPublished?.reachedAt || null },
    { key: "marketing", label: "Create a marketing output", target: 1, reachedAt: firstMarketing?.reachedAt || null },
    { key: "enquiry", label: "Capture an enquiry", target: 1, reachedAt: firstEnquiry?.reachedAt || null },
    { key: "followUp", label: "Complete a response or follow-up", target: 1, reachedAt: firstFollowUp?.reachedAt || null },
  ];
  const createdAt = agency?.createdAt || null;
  const activation = calculateActivation(createdAt, steps);

  if (!["principal", "admin"].includes(role)) return { activation, principalMetrics: null };

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [enquiries, members, openActions, viewings, offers, deals, quietListings, expiringMandates] = await Promise.all([
    env.DB.prepare("SELECT assigned_user_id AS assignedUserId,created_at AS createdAt,contacted_at AS contactedAt,status,source FROM enquiries WHERE agency_id=? AND datetime(created_at)>=datetime(?)").bind(agencyId, since).all<EnquiryMetricRow>(),
    env.DB.prepare("SELECT user_id AS userId,email,role FROM agency_memberships WHERE agency_id=? ORDER BY created_at").bind(agencyId).all<any>(),
    env.DB.prepare("SELECT assigned_user_id AS assignedUserId,COUNT(*) AS count FROM next_actions WHERE agency_id=? AND status='open' AND datetime(due_at)<CURRENT_TIMESTAMP GROUP BY assigned_user_id").bind(agencyId).all<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM viewings WHERE agency_id=? AND datetime(created_at)>=datetime(?)").bind(agencyId, since).first<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM offers WHERE agency_id=? AND datetime(created_at)>=datetime(?)").bind(agencyId, since).first<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM deals WHERE agency_id=? AND status='won' AND datetime(updated_at)>=datetime(?)").bind(agencyId, since).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM properties p WHERE p.agency_id=? AND p.status='Available'
      AND NOT EXISTS(SELECT 1 FROM enquiries e WHERE e.agency_id=p.agency_id AND e.property_id=p.id AND datetime(e.created_at)>=datetime(?))
      AND NOT EXISTS(SELECT 1 FROM viewings v WHERE v.agency_id=p.agency_id AND v.property_id=p.id AND datetime(v.created_at)>=datetime(?))
      AND NOT EXISTS(SELECT 1 FROM public_events pe WHERE pe.agency_id=p.agency_id AND pe.property_id=p.id AND datetime(pe.created_at)>=datetime(?))`).bind(agencyId, since, since, since).first<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM mandates WHERE agency_id=? AND status='active' AND datetime(expires_at) BETWEEN CURRENT_TIMESTAMP AND datetime('now','+30 days')").bind(agencyId).first<any>(),
  ]);

  return {
    activation,
    principalMetrics: calculatePrincipalMetrics({
      enquiries: enquiries.results,
      members: members.results,
      overdueActions: openActions.results,
      counts: {
        viewings: viewings?.count,
        offers: offers?.count,
        wonDeals: deals?.count,
        quietListings: quietListings?.count,
        expiringMandates: expiringMandates?.count,
      },
    }),
  };
}
