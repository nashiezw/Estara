import { env } from "cloudflare:workers";
import { calculatePilotPeriod } from "./workspace-metric-calculations.js";

async function periodMetrics(agencyId: string, start: string, end: string) {
  const [enquiries, followUps, viewings, offers, wonDeals, sellerReports] = await Promise.all([
    env.DB.prepare("SELECT created_at AS createdAt,contacted_at AS contactedAt,source FROM enquiries WHERE agency_id=? AND created_at>=? AND created_at<?").bind(agencyId, start, end).all<any>(),
    env.DB.prepare("SELECT completed_at AS completedAt FROM next_actions WHERE agency_id=? AND action_type IN ('respond','follow_up') AND created_at>=? AND created_at<?").bind(agencyId, start, end).all<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count,COUNT(DISTINCT enquiry_id) AS converted FROM viewings WHERE agency_id=? AND created_at>=? AND created_at<?").bind(agencyId, start, end).first<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count,COUNT(DISTINCT enquiry_id) AS converted FROM offers WHERE agency_id=? AND enquiry_id IS NOT NULL AND submitted_at>=? AND submitted_at<? AND status!='withdrawn'").bind(agencyId, start, end).first<any>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM deals WHERE agency_id=? AND status='won' AND updated_at>=? AND updated_at<?").bind(agencyId, start, end).first<any>(),
    env.DB.prepare("SELECT created_at AS createdAt,approved_at AS approvedAt FROM seller_reports WHERE agency_id=? AND created_at>=? AND created_at<?").bind(agencyId, start, end).all<any>(),
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
  });
}

export async function pilotScorecard(agencyId: string, now = new Date()) {
  const end = now.toISOString();
  const currentStart = new Date(now.getTime() - 30 * 86400000).toISOString();
  const baselineStart = new Date(now.getTime() - 60 * 86400000).toISOString();
  const [current, baseline] = await Promise.all([
    periodMetrics(agencyId, currentStart, end),
    periodMetrics(agencyId, baselineStart, currentStart),
  ]);
  return {
    generatedAt: end,
    currentPeriod: { startsAt: currentStart, endsAt: end, ...current },
    baselinePeriod: { startsAt: baselineStart, endsAt: currentStart, ...baseline },
  };
}
