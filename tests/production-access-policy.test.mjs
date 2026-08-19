import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
import test from"node:test";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("production access policy keeps public launch gated by explicit evidence",async()=>{
  const[policy,todo,checklist]=await Promise.all([
    read("../docs/PRODUCTION-ACCESS-POLICY.md"),
    read("../docs/PRODUCTION-READINESS-TODO.md"),
    read("../docs/DELIVERY-CHECKLIST.md"),
  ]);
  for(const phrase of[
    "owner-only/private",
    "explicitly approves public access",
    "committed, pushed and saved as a Sites version",
    "provider readiness contract",
    "active TLS",
    "unknown-host fail-closed",
    "Low-data mode byte-reduction",
    "payment settlement",
    "Product owner signs off",
  ])assert.match(policy,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"));
  assert.match(todo,/Production access policy documented; public-site access level still needs product-owner approval and live deployment evidence/);
  assert.match(checklist,/production access policy documented; private\/owner-only access remains required until public launch approval/);
});
