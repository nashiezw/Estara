import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { sellerFeedbackSummary } from "../db/seller-policy.ts";
import { validViewingFeedback, viewingFollowUp } from "../db/viewing-policy.ts";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("seller feedback summaries are deterministic, anonymized and bounded to known sentiment", () => {
  assert.equal(sellerFeedbackSummary([]), "No buyer feedback was recorded during this reporting period.");
  assert.equal(sellerFeedbackSummary([
    { interestLevel: "interested" },
    { interestLevel: "interested" },
    { interestLevel: "unsure" },
    { interestLevel: "unexpected" },
  ]), "Anonymized feedback from 3 completed viewings: 2 interested, 1 unsure.");
});

test("viewing feedback is accepted only after completion and maps to a concrete next action", () => {
  assert.equal(validViewingFeedback("Confirmed", "Ready to proceed", "interested"), false);
  assert.equal(validViewingFeedback("Completed", "", "interested"), false);
  assert.equal(validViewingFeedback("Completed", "Ready to proceed", "unknown"), false);
  assert.equal(validViewingFeedback("Completed", "Ready to proceed", "interested"), true);
  assert.deepEqual(viewingFollowUp("interested"), { actionType: "prepare_offer", reason: "Discuss and prepare an offer" });
  assert.deepEqual(viewingFollowUp("unsure"), { actionType: "resolve_objections", reason: "Clarify buyer concerns and agree the next step" });
  assert.deepEqual(viewingFollowUp("not_interested"), { actionType: "suggest_alternatives", reason: "Share suitable alternative properties" });
});

test("feedback follow-up SQL supplies every next-action column in both APIs", async () => {
  const sources = await Promise.all([
    read("../app/api/viewings/route.ts"),
    read("../app/api/v1/viewings/[id]/route.ts"),
  ]);

  for (const source of sources) {
    assert.match(source, /INSERT INTO next_actions\(id,agency_id,resource_type,resource_id,action_type,reason,priority,due_at,status,assigned_user_id\)/);
    assert.match(source, /'normal',\?,'open',\?/);
    assert.match(source, /NOT EXISTS \(SELECT 1 FROM next_actions/);
  }
  assert.match(sources[0], /WHERE \$\{ownsFeedback\} AND NOT EXISTS/);
});

test("workspace and public viewing APIs preserve the complete-feedback-follow-up lifecycle", async () => {
  const [workspace, collection, item] = await Promise.all([
    read("../app/api/viewings/route.ts"),
    read("../app/api/v1/viewings/route.ts"),
    read("../app/api/v1/viewings/[id]/route.ts"),
  ]);
  for (const source of [workspace, item]) {
    assert.match(source, /canCompleteViewing/);
    assert.match(source, /cannot be completed before its scheduled start time/);
    assert.match(source, /action_type='viewing_reminder' AND status='open'/);
    assert.match(source, /validViewingFeedback/);
    assert.match(source, /action_type='capture_feedback'/);
    assert.match(source, /WHERE [^\n]*NOT EXISTS \(SELECT 1 FROM next_actions/);
    assert.match(source, /viewing\.feedback_recorded/);
    assert.match(source, /processAutomationEvents/);
  }
  for (const source of [workspace, collection]) {
    assert.match(source, /The enquiry does not belong to this property or client/);
    assert.match(source, /contacts WHERE id=\? AND agency_id=\?/);
    assert.match(source, /'viewing_reminder'/);
  }
  assert.match(collection, /agency_memberships WHERE agency_id=\? AND user_id=\?/);
  assert.doesNotMatch(collection, /assignedUserId=.*\|\|"api"/);
});

test("migration retires reminders left open by terminal viewings", async () => {
  const migration = await read("../drizzle/0041_complete_stale_viewing_reminders.sql");
  assert.match(migration, /viewings\.agency_id = next_actions\.agency_id/);
  assert.match(migration, /viewings\.status IN \('Completed', 'Cancelled', 'No-show'\)/);
});

test("approved seller reports snapshot aggregate feedback for portal and PDF use", async () => {
  const [migration, management, portal, client, pdf] = await Promise.all([
    read("../drizzle/0040_seller_feedback_summary.sql"),
    read("../app/api/seller-management/route.ts"),
    read("../app/api/seller-portal/route.ts"),
    read("../app/seller/seller-portal-client.tsx"),
    read("../db/seller-report-pdf.ts"),
  ]);
  assert.match(migration, /feedback_summary.*DEFAULT ''.*NOT NULL/);
  assert.match(management, /sellerFeedbackSummary\(feedbackRows\.results\)/);
  assert.match(management, /feedback_summary/);
  assert.match(management, /feedbackSummary: report\.feedback_summary/);
  assert.match(portal, /feedback_summary feedbackSummary/);
  assert.match(portal, /status IN \('Confirmed','Completed'\)/);
  assert.match(client, /ANONYMIZED VIEWING FEEDBACK/);
  assert.match(client, /Viewings confirmed or completed/);
  assert.doesNotMatch(client, /"Confirmed viewings"/);
  assert.match(pdf, /VIEWING FEEDBACK/);
});
