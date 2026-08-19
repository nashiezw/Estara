import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
import test from"node:test";
import{productionProviderDecision}from"../db/production-providers.ts";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("payment settlement workflow is documented but remains pending live evidence",async()=>{
  const[workflow,todo,checklist]=await Promise.all([
    read("../docs/PAYMENT-SETTLEMENT-WORKFLOW.md"),
    read("../docs/PRODUCTION-READINESS-TODO.md"),
    read("../docs/DELIVERY-CHECKLIST.md"),
  ]);
  assert.equal(productionProviderDecision("online_payments")?.provider,"Stripe Checkout, Billing and Customer Portal");
  for(const phrase of[
    "Stripe Checkout, Billing and Customer Portal",
    "agency_subscriptions",
    "billing_invoices",
    "billing_events",
    "STRIPE_WEBHOOK_SECRET",
    "Signed webhooks",
    "integer minor units",
    "replayed webhook IDs",
    "refund",
    "failed-payment",
    "Finance approver",
  ])assert.match(workflow,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"));
  assert.match(todo,/Production billing\/payment settlement workflow documented; live Stripe settlement, refund, failed-payment and finance sign-off evidence still pending/);
  assert.match(checklist,/Stripe payment provider selected and settlement workflow documented, live activation and settlement verification pending/);
});
