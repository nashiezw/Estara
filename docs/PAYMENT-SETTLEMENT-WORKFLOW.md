# ESTARA Payment Settlement Workflow

This workflow defines how online payments become launch-ready. It does not prove Stripe is live; it defines the production evidence required before the payment gate can close.

## Scope

- Provider: Stripe Checkout, Billing and Customer Portal.
- Internal ledger: `agency_subscriptions`, `billing_invoices` and `billing_events`.
- Finance owner must confirm live settlement, failed-payment and refund handling before launch approval.

## Activation Evidence

1. Stripe live products and prices exist for every published ESTARA plan.
2. `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_GROWTH` are installed in the production secret store.
3. Checkout creates a hosted subscription session for the selected plan and agency.
4. Customer Portal opens for payment method changes and cancellation flows.
5. Signed webhooks update local subscription, invoice and payment states without accepting unsigned or replayed events.
6. `billing_events` records the Stripe event ID, event type, provider object ID, agency ID, subscription ID and invoice ID where applicable.
7. A live paid invoice is reconciled against Stripe balance transactions and bank settlement reporting.
8. Failed payment, refund and cancellation paths are tested and signed off by finance.

## Reconciliation Rules

- Amounts remain integer minor units in the ESTARA ledger.
- A Stripe event may be processed once; replayed webhook IDs must be ignored or recorded as idempotent duplicates.
- Local invoices are paid only after verified provider evidence is received.
- Manual receipts remain available for offline payments, but must include a receipt reference and actor audit trail.
- If Stripe settlement differs from local invoice totals, mark the payment exception for finance review and do not auto-close the invoice.

## Launch Sign-Off

Record the following before marking the payment checklist item complete:

- Stripe account mode, product IDs, price IDs and webhook endpoint ID.
- Test agency, test invoice, provider payment intent or subscription ID and Stripe event IDs.
- Gross amount, fees, net settlement amount, settlement date and bank/accounting reference.
- Evidence for failed-payment, refund and cancellation handling.
- Finance approver, approval timestamp and unresolved exceptions.
