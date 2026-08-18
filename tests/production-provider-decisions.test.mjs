import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PRODUCTION_PROVIDER_DECISIONS,
  REQUIRED_PRODUCTION_PROVIDER_ENV,
  productionProviderDecision,
  productionProvidersReady,
} from "../db/production-providers.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("production provider decisions cover every launch-blocking service area", () => {
  assert.deepEqual(
    PRODUCTION_PROVIDER_DECISIONS.map((decision) => decision.area),
    [
      "hosting_dns_tls_storage",
      "transactional_email",
      "web_push",
      "error_retention_alerting",
      "online_payments",
    ]
  );
  for (const decision of PRODUCTION_PROVIDER_DECISIONS) {
    assert.equal(decision.status, "selected_pending_activation");
    assert.ok(decision.provider.length > 3);
    assert.ok(decision.requiredEnv.length >= 3);
    assert.ok(decision.activationEvidence.length >= 3);
  }
});

test("provider env contract is documented and remains all-or-nothing for launch", async () => {
  const [example, doc, todo, checklist] = await Promise.all([
    read("../.env.example"),
    read("../docs/PRODUCTION-PROVIDER-DECISIONS.md"),
    read("../docs/PRODUCTION-READINESS-TODO.md"),
    read("../docs/DELIVERY-CHECKLIST.md"),
  ]);

  for (const name of REQUIRED_PRODUCTION_PROVIDER_ENV) {
    assert.match(example, new RegExp(`^${name}=`, "m"), `${name} missing from .env.example`);
    assert.match(doc, new RegExp(`\\b${name}\\b`), `${name} missing from provider docs`);
  }

  assert.equal(productionProvidersReady({}), false);
  assert.equal(
    productionProvidersReady(Object.fromEntries(REQUIRED_PRODUCTION_PROVIDER_ENV.map((name) => [name, "configured"]))),
    true
  );
  assert.equal(productionProviderDecision("online_payments")?.provider, "Stripe Checkout, Billing and Customer Portal");
  assert.match(todo, /Production provider decisions are documented/);
  assert.match(checklist, /Production service-provider decisions documented/);
});
