import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { productionProviderDecision } from "../db/production-providers.ts";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("subscription checkout has durable payment methods, review-gated manual proof and signed Stripe activation", async () => {
  const [migration, schema, agencyRoute, platformRoute, billingProofRoute, stripeRoute, client, adminClient, entitlements, worker] = await Promise.all([
    read("../drizzle/0037_subscription_payment_system.sql"),
    read("../db/schema.ts"),
    read("../app/api/subscription/route.ts"),
    read("../app/api/platform/route.ts"),
    read("../app/api/platform/billing-proof/route.ts"),
    read("../app/api/subscription/stripe-webhook/route.ts"),
    read("../app/subscription/subscription-client.tsx"),
    read("../app/admin/platform-admin-client.tsx"),
    read("../db/entitlements.ts"),
    read("../worker/index.ts"),
  ]);

  assert.equal(productionProviderDecision("online_payments")?.provider, "Stripe Checkout, Billing and Customer Portal");
  assert.match(migration, /CREATE TABLE billing_payment_methods/);
  assert.match(migration, /CREATE TABLE billing_payment_requests/);
  assert.match(migration, /CREATE TABLE billing_webhook_events/);
  assert.match(schema, /billingPaymentMethods/);
  assert.match(schema, /billingPaymentRequests/);
  assert.match(schema, /billingWebhookEvents/);

  assert.match(agencyRoute, /create_manual_payment/);
  assert.match(agencyRoute, /submit_manual_proof/);
  assert.match(agencyRoute, /proofTypes/);
  assert.match(agencyRoute, /maxProofBytes=12\*1024\*1024/);
  assert.match(agencyRoute, /amountPaidMinor=money\(form\.get\("amountPaid"\)\)/);
  assert.match(agencyRoute, /amountPaidMinor<=0/);
  assert.match(agencyRoute, /state='pending_manual_review'/);
  assert.match(agencyRoute, /notifyAgency\(ctx\.workspace\.agencyId,"Trial started"/);
  assert.match(agencyRoute, /pendingState=\["active","trialing","free"\]\.includes\(subscription\.state\)\?subscription\.state:"pending_payment"/);
  assert.doesNotMatch(agencyRoute, /UPDATE agency_subscriptions SET plan_version_id=\?,state='pending_payment'/);
  assert.match(agencyRoute, /cancelFailedStripeRequest/);
  assert.match(agencyRoute, /payment\.stripe_checkout_failed/);
  assert.match(agencyRoute, /cancel_subscription/);
  assert.match(agencyRoute, /subscription\.cancelled_by_agency/);
  assert.doesNotMatch(agencyRoute, /submit_manual_proof[\s\S]{0,900}state='active'/);

  assert.match(platformRoute, /review_manual_payment/);
  assert.match(platformRoute, /proof_object_key AS proofObjectKey/);
  assert.match(platformRoute, /status='approved'/);
  assert.match(platformRoute, /state='active'/);
  assert.match(platformRoute, /WHERE id=\? AND status='open'/);
  assert.match(platformRoute, /billing\.manual_payment\.approved/);
  assert.match(platformRoute, /notifyAgency\(requestRow\.agencyId, "Payment approved"/);
  assert.match(platformRoute, /Payment proof needs resubmission/);
  assert.match(platformRoute, /Payment proof rejected/);
  assert.match(billingProofRoute, /requirePlatformUser\(user, \["super_admin", "finance"\]\)/);
  assert.match(billingProofRoute, /bucket\.get\(row\.objectKey\)/);

  assert.match(stripeRoute, /STRIPE_WEBHOOK_SECRET/);
  assert.match(stripeRoute, /stripe-signature/);
  assert.match(stripeRoute, /safeEqualHex/);
  assert.match(stripeRoute, /billing_webhook_events/);
  assert.match(stripeRoute, /duplicate:true/);
  assert.match(stripeRoute, /checkout\.session\.completed/);
  assert.match(stripeRoute, /checkout\.session\.expired/);
  assert.match(stripeRoute, /payment_intent\.payment_failed/);
  assert.match(stripeRoute, /invoice\.payment_failed/);
  assert.match(stripeRoute, /charge\.refunded/);
  assert.match(stripeRoute, /closeStripeRequest/);
  assert.match(stripeRoute, /recordStripeRefund/);
  assert.match(stripeRoute, /payment\.stripe_expired/);
  assert.match(stripeRoute, /payment\.stripe_failed/);
  assert.match(stripeRoute, /payment\.stripe_refunded/);
  assert.match(stripeRoute, /status='refunded'/);
  assert.match(stripeRoute, /payment_status==="paid"/);

  assert.match(client, /Submit proof for review/);
  assert.match(client, /Create payment request/);
  assert.match(client, /Start free plan/);
  assert.match(client, /Cancel subscription/);
  assert.doesNotMatch(client, /STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/);
  assert.match(adminClient, /Open proof/);
  assert.match(adminClient, /\/api\/platform\/billing-proof/);
  assert.match(entitlements, /processSubscriptionLifecycle/);
  assert.match(entitlements, /subscription\.trial_expired/);
  assert.match(entitlements, /subscription\.expired/);
  assert.match(entitlements, /subscription\.suspended/);
  assert.match(entitlements, /lifecycleNotify/);
  assert.match(worker, /processSubscriptionLifecycle\("system-scheduler"\)/);
  assert.match(worker, /subscriptions\.lifecycle_scheduled/);
});
