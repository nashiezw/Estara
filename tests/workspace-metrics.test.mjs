import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateActivation, calculatePrincipalMetrics, metricMedian, responseMinutes } from "../db/workspace-metric-calculations.js";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("agency activation is derived from six durable milestones and a seven day window", async () => {
  const [metricsSource, calculations, route, workspace] = await Promise.all([
    read("../db/workspace-metrics.ts"),
    read("../db/workspace-metric-calculations.js"),
    read("../app/api/workspace/route.ts"),
    read("../app/estara-app.tsx"),
  ]);
  const metrics = `${metricsSource}\n${calculations}`;
  for (const source of [
    "LIMIT 1 OFFSET 2",
    "marketing_outputs",
    "status='Available'",
    "MIN(created_at) AS reachedAt FROM enquiries",
    "action_type IN ('respond','follow_up')",
    "windowDays: 7",
    "activatedWithin7Days",
  ]) assert.ok(metrics.includes(source), `missing activation evidence: ${source}`);
  assert.match(route, /workspaceMetrics\(w\.agencyId/);
  assert.match(route, /\.\.\.insights/);
  assert.match(workspace, /Agency activation/);
});

test("activation and response calculations produce exact business outcomes", () => {
  const steps = ["properties", "team", "published", "marketing", "enquiry", "followUp"].map((key, index) => ({
    key,
    label: key,
    target: 1,
    reachedAt: `2026-09-0${index + 2}T08:00:00.000Z`,
  }));
  const activation = calculateActivation("2026-09-01T08:00:00.000Z", steps);
  assert.equal(activation.activated, true);
  assert.equal(activation.activatedWithin7Days, true);
  assert.equal(activation.activationDays, 6);
  assert.equal(activation.progress, 100);
  assert.equal(metricMedian([18, 2, 9, 5]), 7);
  assert.equal(responseMinutes({ createdAt: "2026-09-01 08:00:00", contactedAt: "2026-09-01 08:18:00" }), 18);
  assert.equal(responseMinutes({ createdAt: "2026-09-01 08:18:00", contactedAt: "2026-09-01 08:00:00" }), null);
});

test("principal metrics attribute unanswered enquiries and overdue work per agent", () => {
  const principal = calculatePrincipalMetrics({
    enquiries: [
      { assignedUserId: "agent-a", createdAt: "2026-09-01T08:00:00Z", contactedAt: "2026-09-01T08:10:00Z", source: "WhatsApp" },
      { assignedUserId: "agent-a", createdAt: "2026-09-01T09:00:00Z", contactedAt: null, source: "Website" },
      { assignedUserId: "agent-b", createdAt: "2026-09-01T10:00:00Z", contactedAt: "2026-09-01T10:20:00Z", source: "Referral" },
    ],
    members: [
      { userId: "agent-a", email: "a@example.com", role: "agent" },
      { userId: "agent-b", email: "b@example.com", role: "agent" },
    ],
    overdueActions: [{ assignedUserId: "agent-a", count: 3 }],
    counts: { viewings: 4, offers: 2, wonDeals: 1, quietListings: 5, expiringMandates: 2 },
  });
  assert.deepEqual({ enquiries: principal.enquiries, answered: principal.answered, unanswered: principal.unanswered, answerRate: principal.answerRate }, { enquiries: 3, answered: 2, unanswered: 1, answerRate: 67 });
  assert.equal(principal.medianResponseMinutes, 15);
  assert.equal(principal.whatsappEnquiries, 1);
  assert.equal(principal.overdueActions, 3);
  assert.deepEqual(principal.agents.map(agent => [agent.userId, agent.unanswered, agent.overdueActions]), [["agent-a", 1, 3], ["agent-b", 0, 0]]);
});

test("principal accountability uses real response, action and agent evidence", async () => {
  const [metricsSource, calculations, workspace] = await Promise.all([
    read("../db/workspace-metrics.ts"),
    read("../db/workspace-metric-calculations.js"),
    read("../app/estara-app.tsx"),
  ]);
  const metrics = `${metricsSource}\n${calculations}`;
  assert.match(metrics, /contacted_at AS contactedAt/);
  assert.match(metrics, /medianResponseMinutes/);
  assert.match(metrics, /overdueActions/);
  assert.match(metrics, /quietListings/);
  assert.match(metrics, /expiringMandates/);
  assert.match(metrics, /assigned_user_id AS assignedUserId/);
  assert.match(metrics, /agency_id=\?/g);
  assert.match(workspace, /Unanswered · 30 days/);
  assert.match(workspace, /Median response/);
  assert.match(workspace, /Overdue follow-ups/);
  assert.match(workspace, /Listings without activity/);
  assert.match(workspace, /Team accountability/);
  assert.match(workspace, /business\.agents\.map/);
});
