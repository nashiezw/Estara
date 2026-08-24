import assert from"node:assert/strict";
import {readFile}from"node:fs/promises";
import test from"node:test";

const read=file=>readFile(new URL(file,import.meta.url),"utf8");

test("platform agency command page is card-based and delete hides archived tenants",async()=>{
 const[client,route,css]=await Promise.all([read("../app/admin/platform-admin-client.tsx"),read("../app/api/platform/route.ts"),read("../app/admin/platform-admin.css")]);
 assert.match(client,/platform-directory-hero/);
 assert.match(client,/platform-directory-toolbar/);
 assert.match(client,/platform-agency-grid/);
 assert.match(client,/platform-agency-card/);
 assert.match(client,/Manage tenant/);
 assert.match(client,/Confirm/);
 assert.match(route,/WHERE a\.status<>'archived'/);
 assert.match(route,/agency\.archived_for_retention/);
 assert.match(css,/platform-directory-hero/);
 assert.match(css,/platform-agency-grid/);
 assert.match(css,/platform-agency-card/);
 assert.match(css,/platform-manage-panel/);
});
