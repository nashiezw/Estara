import { env } from "cloudflare:workers";
import { calculatePilotAdoption, calculatePilotPeriod } from "./workspace-metric-calculations.js";

async function periodMetrics(agencyId: string, start: string, end: string) {
  const [enquiries, followUps, viewings, offers, wonDeals, sellerReports, mandateCoverage] = await Promise.all([
    env.DB.prepare("SELECT created_at AS createdAt,contacted_at AS contactedAt,source FROM enquiries WHERE agency_id=? AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)").bind(agencyId, start, end).all<any>(),
    env.DB.prepare("SELECT completed_at AS completedAt FROM next_actions WHERE agency_id=? AND action_type IN ('respond','follow_up') AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)").bind(agencyId, start, end).all<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count,COUNT(DISTINCT enquiry_id) AS converted FROM viewings WHERE agency_id=? AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)").bind(agencyId, start, end).first<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count,COUNT(DISTINCT enquiry_id) AS converted FROM offers WHERE agency_id=? AND enquiry_id IS NOT NULL AND datetime(submitted_at)>=datetime(?) AND datetime(submitted_at)<datetime(?) AND status!='withdrawn'").bind(agencyId, start, end).first<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM deals WHERE agency_id=? AND status='won' AND datetime(updated_at)>=datetime(?) AND datetime(updated_at)<datetime(?)").bind(agencyId, start, end).first<any>(),
    env.DB.prepare("SELECT created_at AS createdAt,approved_at AS approvedAt FROM seller_reports WHERE agency_id=? AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)").bind(agencyId, start, end).all<any>(),
    env.DB.prepare(`SELECT COUNT(DISTINCT m.property_id) AS active,COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM seller_reports r WHERE r.agency_id=m.agency_id AND r.property_id=m.property_id AND r.status='approved' AND datetime(r.approved_at)>=datetime(?) AND datetime(r.approved_at)<datetime(?)) THEN m.property_id END) AS reported FROM mandates m JOIN properties p ON p.id=m.property_id AND p.agency_id=m.agency_id WHERE m.agency_id=? AND p.transaction_type='Sale' AND datetime(m.starts_at)<datetime(?) AND datetime(m.expires_at)>=datetime(?)`).bind(start, end, agencyId, end, start).first<any>(),
  ]);
  return calculatePilotPeriod({
    enquiries: enquiries.results,
    followUps: followUps.results,
    viewings: Number(viewings?.count || 0),
    viewingConversions: Number(viewings?.converted || 0),
    offers: Number(offers?.count || 0),
    offerConversions: Number(offers?.converted || 0),
    wonDeals: Number(wonDeals?.count || 0),
    sellerReports: sellerReports.results,
    activeSalesMandates: Number(mandateCoverage?.active || 0),
    salesMandatesReported: Number(mandateCoverage?.reported || 0),
  });
}

async function adoptionMetrics(agencyId: string, start: string, end: string) {
  const row = await env.DB.prepare(`SELECT COUNT(DISTINCT m.user_id) AS eligibleUsers,COUNT(DISTINCT CASE WHEN datetime(l.created_at)>=datetime(?) AND datetime(l.created_at)<datetime(?) THEN m.user_id END) AS activeUsers FROM agency_memberships m LEFT JOIN audit_logs l ON l.agency_id=m.agency_id AND l.actor_user_id=m.user_id WHERE m.agency_id=? AND datetime(m.created_at)<datetime(?)`).bind(start, end, agencyId, end).first<any>();
  return calculatePilotAdoption(row?.eligibleUsers, row?.activeUsers);
}

export async function pilotScorecard(agencyId: string, now = new Date()) {
  const end = now.toISOString();
  const currentStart = new Date(now.getTime() - 30 * 86400000).toISOString();
  const baselineStart = new Date(now.getTime() - 60 * 86400000).toISOString();
  const currentWeekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const priorWeekStart = new Date(now.getTime() - 14 * 86400000).toISOString();
  const [current, baseline, currentWeek, priorWeek] = await Promise.all([
    periodMetrics(agencyId, currentStart, end),
    periodMetrics(agencyId, baselineStart, currentStart),
    adoptionMetrics(agencyId, currentWeekStart, end),
    adoptionMetrics(agencyId, priorWeekStart, currentWeekStart),
  ]);
  return {
    generatedAt: end,
    currentPeriod: { startsAt: currentStart, endsAt: end, ...current },
    baselinePeriod: { startsAt: baselineStart, endsAt: currentStart, ...baseline },
    adoption: {
      definition: "A team member with at least one agency audit event during the seven-day window.",
      currentWeek: { startsAt: currentWeekStart, endsAt: end, ...currentWeek },
      priorWeek: { startsAt: priorWeekStart, endsAt: currentWeekStart, ...priorWeek },
    },
  };
}
