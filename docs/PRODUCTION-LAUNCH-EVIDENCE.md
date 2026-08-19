# Production Launch Evidence Register

This register is the working to-do list for converting the remaining public-launch blockers into auditable evidence. Do not mark a gate complete in `docs/PRODUCTION-READINESS-TODO.md` or `docs/DELIVERY-CHECKLIST.md` until its evidence is attached or linked here and `npm run launch:evidence -- docs/evidence/production-launch.json` passes.

## Current Deployment Blocker

- Sites project `appgprj_6a83d143555c81918509011b784f3fdf` could not be resolved by the configured Sites connector during the readiness pass.
- The repository has no configured Git remote, so the required pushed commit SHA cannot be supplied for a Sites version.
- Production deployment, domain attachment, TLS activation and hosted low-data measurements remain blocked until the Sites project is restored or recreated and a Git remote is configured.

## Required Launch Evidence

| Gate | Evidence required before completion |
| --- | --- |
| Provider activation | Live provider accounts, production secrets, webhook endpoints, smoke-test logs and protected `/health` provider-readiness output for Resend, Firebase Cloud Messaging, Stripe, Cloudflare WAF malware scanning, Sentry and Cloudflare log retention. |
| Domain and TLS | Hosting-provider domain attachment, DNS verification, certificate activation screenshot or API response, unknown-host fail-closed check and public route smoke test. |
| D1 restore rehearsal | Isolated D1 Time Travel restore evidence, restored-environment URL or binding, tenant attack suite output and signed recovery decision. |
| External penetration test | Independent tester scope, report, remediation notes and explicit closure of all launch-blocking findings. |
| Public access approval | Product-owner approval naming the production URL, commit SHA, intended access level and launch date. |
| Billing settlement | Stripe live-mode invoice, payment, settlement, refund and failed-payment evidence plus finance sign-off. |
| Low-data hosted measurement | `docs/evidence/low-data-production.json` validated by `npm run low-data:verify -- docs/evidence/low-data-production.json`. |
| Mobile device audit | Completed Android and iOS audit using `docs/MOBILE-JOURNEY-AUDIT.md`, with device models, browser versions, issues found and retest evidence. |
| First sellable MVP approval | Product-owner sign-off that the landing-to-workspace, onboarding, property capture, public site, enquiry, viewing, seller, billing, admin and recovery journeys are acceptable for the first sellable release. |

## Evidence Bundle

Save the production launch evidence bundle as `docs/evidence/production-launch.json`. It must include the deployed HTTPS URL, deployed commit SHA, capture timestamp, deployment proof, provider activation proof, domain/TLS proof, D1 restore rehearsal proof, penetration-test closure, public-access approval, billing settlement proof, low-data evidence, mobile audit proof and final MVP approval.

## Verification Commands

```bash
npm test
npm run launch:readiness
npm run launch:readiness -- --all
npm run launch:evidence -- docs/evidence/production-launch.json
npm run low-data:verify -- docs/evidence/low-data-production.json
```

`npm run launch:readiness` must fail until every public-launch gate above has real production evidence.
