import test from "node:test";import assert from "node:assert/strict";import { roleHasPermission } from "../db/permission-policy.ts";
test("principal has all implemented permissions",()=>{for(const p of ["agency.settings.manage","team.manage","property.read","property.create","property.publish","enquiry.read","enquiry.create","enquiry.contact","audit.read"])assert.equal(roleHasPermission("principal",p),true)});
test("viewer cannot mutate records",()=>{for(const p of ["agency.settings.manage","team.manage","property.create","property.publish","enquiry.create","enquiry.contact"])assert.equal(roleHasPermission("viewer",p),false)});
test("unknown roles fail closed",()=>assert.equal(roleHasPermission("client-supplied-owner","property.read"),false));
