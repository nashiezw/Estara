import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculatePilotPeriod } from "../db/workspace-metric-calculations.js";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("pilot period calculations expose exact adoption and outcome measures", () => {
  const result = calculatePilotPeriod({
    enquiries: [
      { createdAt: "2026-09-01T08:00:00Z", contactedAt: "2026-09-01T08:10:00Z", source: "WhatsApp" },
      { createdAt: "2026-09-01T09:00:00Z", contactedAt: "2026-09-01T09:20:00Z", source: "Website" },
      { createdAt: "2026-09-01T10:00:00Z", contactedAt: null, source: "WhatsApp" },
      { createdAt: "2026-09-01T11:00:00Z", contactedAt: "2026-09-01T11:30:00Z", source: "Referral" },
    ],
    followUps: [{ completedAt: "2026-09-02" }, { completedAt: "2026-09-03" }, { completedAt: null }],
    viewings: 5,
    viewingConversions: 2,
    offers: 4,
    offerConversions: 1,
    wonDeals: 1,
    sellerReports: [{ createdAt: "2026-09-01T08:00:00Z", approvedAt: "2026-09-01T09:00:00Z" }],
  });
  assert.deepEqual({ answerRate: result.answerRate, medianResponseMinutes: result.medianResponseMinutes, followUpCompletionRate: result.followUpCompletionRate }, { answerRate: 75, medianResponseMinutes: 20, followUpCompletionRate: 67 });
  assert.equal(result.enquiryToViewingRate, 50);
  assert.equal(result.enquiryToOfferRate, 25);
  assert.equal(result.viewings, 5);
  assert.equal(result.offers, 4);
  assert.equal(result.enquiriesWithViewing, 2);
  assert.equal(result.enquiriesWithOffer, 1);
  assert.equal(result.whatsappShare, 50);
  assert.equal(result.medianSellerReportApprovalMinutes, 60);
});

test("pilot scorecard is principal-only, tenant-scoped and exportable", async () => {
  const [query, route, client, plan] = await Promise.all([read("../db/pilot-scorecard.ts"), read("../app/api/pilot-scorecard/route.ts"), read("../app/reports/reports-client.tsx"), read("../docs/PILOT-OPERATING-PLAN.md")]);
  assert.match(query, /agency_id=\?/g);
  assert.match(query, /baselineStart/);
  assert.match(query, /COUNT\(DISTINCT enquiry_id\) AS converted/);
  assert.match(query, /COUNT\(DISTINCT enquiry_id\) AS converted FROM offers/);
  assert.match(query, /submitted_at>=\? AND submitted_at<\?/);
  assert.match(route, /\["principal", "admin"\]/);
  assert.match(route, /export\.manage/);
  assert.match(route, /pilot_scorecard\.exported/);
  assert.match(route, /safeCsv/);
  assert.match(client, /Current 30 days against baseline/);
  assert.match(client, /Export scorecard CSV/);
  assert.match(plan, /3-5 agencies/);
  assert.match(plan, /60-90 days/);
  assert.match(plan, /No unresolved severity-one/);
});
