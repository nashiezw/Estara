import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("new enquiries return the complete owner and relationship contract", async () => {
  const route = await read("../app/api/workspace/route.ts");

  assert.match(route, /SELECT user_id AS userId,email,role FROM agency_memberships/);
  assert.match(route, /assignedEmail:assignee\.email/);
  assert.match(route, /propertyId:property\.id,contactId/);
});

test("enquiry and viewing defaults follow the signed-in user", async () => {
  const workspace = await read("../app/estara-app.tsx");

  assert.match(workspace, /<RecordEnquiry[^>]+currentUser=\{currentUser\}/);
  assert.match(workspace, /<ViewingModal[^>]+currentUser=\{currentUser\}/);
  assert.match(workspace, /function RecordEnquiry\(\{properties,members,currentUser,close,save\}/);
  assert.match(workspace, /function ViewingModal\(\{properties,leads,members,currentUser,close,save\}/);
  assert.doesNotMatch(workspace, /assignedUserId:String\(members\[0\]\?\.userId/);
});

test("recording contact refreshes stage and action accountability", async () => {
  const workspace = await read("../app/estara-app.tsx");

  assert.match(workspace, /await Promise\.all\(\[loadWorkspace\(\),loadOps\(\)\]\)/);
  assert.match(workspace, /status:"Contacted",stage:"Contacted",time:"Contacted"/);
});

test("booking a linked viewing advances the enquiry and retires stale work", async () => {
  const [route, workspace] = await Promise.all([
    read("../app/api/viewings/route.ts"),
    read("../app/estara-app.tsx"),
  ]);

  assert.match(route, /stage IN \('New','Contacted','Qualified'\) THEN 'Viewing'/);
  assert.doesNotMatch(route, /UPDATE enquiries SET[^"\n]+updated_at/);
  assert.match(route, /action_type IN \('respond','follow_up'\)/);
  assert.match(route, /Reopen the enquiry before booking another viewing/);
  assert.match(route, /enquiryId: enquiryId \|\| null/);
  assert.match(workspace, /await Promise\.all\(\[loadOps\(\),loadWorkspace\(\)\]\)/);
});
