# ESTARA Production Provider Decisions

This document records the selected production providers and the evidence required before provider-dependent checklist rows can be marked complete. These decisions are based on the current ESTARA architecture and official provider documentation reviewed on 2026-08-18.

## Status

- Current state: providers selected and required configuration variables defined in source.
- Launch gate: pending account provisioning, live secrets, webhooks, domain attachment, TLS activation, production scanning rules, payment settlement verification and alert routing.
- Completion rule: do not mark a provider-dependent checklist item complete until the activation evidence below exists in the production environment.

## Decision Matrix

| Area | Selected provider | Why this fits ESTARA | Required activation evidence |
| --- | --- | --- | --- |
| Hosting, DNS, TLS, storage and upload-edge scanning | Cloudflare Workers, Custom Domains, D1, R2, Queues and WAF malicious uploads detection | The app is already Cloudflare-compatible, uses D1/R2 bindings, and needs exact-host routing plus automatic certificate management. Cloudflare WAF malicious upload detection can inspect uploads before app processing when the required Enterprise add-on is active. | Production Worker deployed, app and tenant hostnames attached as Custom Domains, certificates active, production D1/R2 bindings connected, R2 object-create notifications feeding the scan queue, WAF rules blocking malicious uploads. |
| Transactional email | Resend | Simple HTTPS API, sender-domain verification, idempotency support and webhooks fit the existing notification-delivery ledger. | Sending domain verified, `RESEND_API_KEY` and webhook secret installed, delivery/bounce/complaint webhooks updating the ledger. |
| Web push | Firebase Cloud Messaging | FCM supports browser Push API workflows over HTTPS and can cover web push before a native app exists. | Production HTTPS service worker registered, consent-gated token capture implemented, server credentials installed, delivery outcomes recorded. |
| Error retention and alerting | Sentry for Cloudflare plus Cloudflare platform logs | Sentry has Cloudflare setup guidance for errors, tracing and logs; Cloudflare logs keep platform-level request evidence close to the runtime. | `SENTRY_DSN` and release metadata installed, protected errors retained outside D1, alert routes tested for launch-blocking events. |
| Online payments | Stripe Checkout, Billing and Customer Portal | Checkout supports hosted subscription flows; Billing webhooks can drive existing subscription and invoice state without storing card data. | Live products/prices created, Checkout and Customer Portal sessions work, signed webhooks update subscriptions and invoices, finance signs off settlement/refund/failed-payment reconciliation. |

## Required Environment Contract

The source-level contract lives in `db/production-providers.ts`. `.env.example` intentionally declares only variable names, not secrets.

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `MEDIA_BUCKET`
- `BACKUP_BUCKET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_WEBHOOK_SECRET`
- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY`
- `NEXT_PUBLIC_FCM_VAPID_KEY`
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_GROWTH`

## Provider Source Notes

- Cloudflare Workers Custom Domains can attach hostnames to a Worker and issue certificates on the target zone.
- Cloudflare R2 event notifications can publish object-create events to Queues for asynchronous processing.
- Cloudflare WAF malicious uploads detection provides upload malware signals that must be enforced through WAF custom or rate-limiting rules and requires the paid Enterprise add-on.
- Resend sends email through an authenticated HTTPS API and supports idempotency keys.
- Firebase Cloud Messaging for web uses service workers and HTTPS origins.
- Sentry documents Cloudflare setup for error monitoring, tracing and logs.
- Stripe Checkout supports hosted one-time and subscription payments, and subscription integrations rely on Checkout sessions, customer portal sessions and webhook-driven provisioning.

## Remaining Work

- Provision provider accounts and production projects.
- Install production secrets through the hosting provider secret store.
- Add webhook endpoints or extend existing notification, subscription and scan queues where needed.
- Run live smoke tests for email, push, upload scanning, alerting and payment settlement.
- Attach production domains and verify certificates.
- Update the delivery checklist only after the evidence is recorded.
