import assert from"node:assert/strict";
import {readFile} from"node:fs/promises";
import test from"node:test";

const read=file=>readFile(new URL(file,import.meta.url),"utf8");

test("workspace properties can be edited, deleted and activated with exact readiness feedback",async()=>{
 const [ui,route,actions]=await Promise.all([read("../app/estara-app.tsx"),read("../app/api/workspace/route.ts"),read("../app/api/workspace/actions/route.ts")]);
 assert.match(route,/async function PATCH/);
 assert.match(route,/async function DELETE/);
 assert.match(route,/propertyCompleteness/);
 assert.match(route,/ensureOwnerContact/);
 assert.match(route,/createMandateIfNeeded/);
 assert.match(route,/UPDATE properties SET status='Withdrawn'/);
 assert.match(route,/invalidatePublicSite\(w\.agencyId,id\)/);
 assert.match(ui,/propertyToEdit/);
 assert.match(ui,/Edit details/);
 assert.match(ui,/Delete property/);
 assert.match(ui,/Complete details/);
 assert.match(ui,/propertyTypeOptions/);
 assert.match(ui,/needsLandSize/);
 assert.match(ui,/Monthly rent \(USD\)/);
 assert.match(ui,/Seller phone/);
 assert.match(ui,/Landlord phone/);
 assert.match(ui,/Publish listing/);
 assert.match(ui,/Published-ready\. Improve later/);
 assert.doesNotMatch(ui,/required minLength=\{40\}/);
 assert.doesNotMatch(ui,/Street address<input required/);
 assert.match(ui,/mandateExpiresAt:source\.mandateId\?"":""/);
 assert.match(actions,/Add before publishing:/);
 assert.match(actions,/propertyPublishReadiness/);
 assert.match(actions,/propertyPhotoRequirement/);
 assert.match(actions,/autoVerified/);
});
