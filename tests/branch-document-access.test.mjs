import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path,"utf8");

test("branch scope is explicit, tenant-bound and enforced on property records",()=>{
  const migration=read("drizzle/0018_branch_document_acl.sql"),scope=read("db/access-scope.ts"),property=read("app/api/properties/[id]/route.ts"),branches=read("app/api/branches/route.ts");
  assert.match(migration,/branch_scope_enabled INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration,/UNIQUE INDEX idx_branch_memberships_unique ON branch_memberships\(agency_id, branch_id, user_id\)/);
  assert.match(scope,/agency_id=\? AND user_id=\? AND branch_id=\?/);
  assert.match(property,/requireBranchAccess\(workspace,property\.branch_id\)/);
  assert.match(branches,/b\.id=\? AND b\.agency_id=\? AND m\.user_id=\?/);
});

test("restricted documents require tenant-scoped user, role, or branch grants",()=>{
  const migration=read("drizzle/0018_branch_document_acl.sql"),scope=read("db/access-scope.ts"),route=read("app/api/documents/route.ts");
  assert.match(migration,/access_mode TEXT NOT NULL DEFAULT 'agency'/);
  assert.match(migration,/UNIQUE INDEX idx_document_permissions_unique/);
  assert.match(scope,/dp\.agency_id=\? AND dp\.document_id=\?/);
  assert.match(scope,/dp\.subject_type='user'/);
  assert.match(scope,/dp\.subject_type='role'/);
  assert.match(scope,/dp\.subject_type='branch'/);
  assert.match(route,/requireDocumentRead\(c\.workspace,id\)/);
  assert.match(route,/document\.access\.granted/);
  assert.match(route,/INSERT OR IGNORE INTO document_permissions/);
});
