# ESTARA Project Status

Last updated: 2026-08-20

## Overall Status

Stage: private MVP moving toward production readiness.

Production readiness: not launch-ready yet.

Why: the repository has many core MVP workflows and strong automated checks, but public launch still depends on live provider setup, domain/TLS evidence, restore rehearsal, external penetration testing, mobile audit, billing evidence and product-owner approval.

## Completed

- Core Cloudflare/Vinext app structure exists.
- D1 schema and Drizzle migrations cover the main MVP and several future-phase areas.
- Tenant isolation, RBAC, branch scoping and audit patterns are implemented.
- Properties, media, activation, enquiries, next actions, viewings, marketing, seller reports and public websites exist.
- Public website templates, content controls, editable website images and public agent profile data have been added/improved.
- standalone ESTARA email/password authentication foundation now exists: registration, login, logout, email verification tokens, password reset tokens, secure session cookies and auth pages.
- Public standalone-auth mutations now leave durable audit evidence without exposing submitted emails or tokens in plain text.
- Homepage has been redesigned around the ESTARA operating-system promise, Today's Business and Enter Once. Use Everywhere.
- Guided owner onboarding now captures agency identity, brand colours, services, website template, public address and routes the owner into first-property capture.
- Public agency and property pages now include stronger SEO metadata, social preview metadata and JSON-LD structured data.
- Public template visual-regression guards now check that templates keep distinct layouts, media-led hero structures and footer treatments.
- Public websites now include keyboard skip links, labelled primary navigation and stable main-content focus targets.
- Public websites now use the premium footer system with brand CTA, navigation, services and contact sections across templates.
- Launch performance checks now measure compressed production delivery budgets while retaining raw asset sanity limits.
- Super Admin now has a fuller platform command centre with risk queue, launch-control signals, agency intelligence, platform settings, revenue desk, operator access and evidence/audit surfaces.
- Production evidence and readiness scripts exist.
- Latest verified checks:
  - `npm run build` passed on 2026-08-20 after public website and auth hardening work.
  - `npm run build` passed on 2026-08-20 after the Super Admin command-centre redesign.
  - `node --test tests\*.test.mjs` passed on 2026-08-20 with 172/172 tests passing.
  - `node --test tests\standalone-auth.test.mjs tests\website-templates.test.mjs tests\public-site-content.test.mjs` passed on 2026-08-20.
  - `node --test tests\rendered-html.test.mjs` passed on 2026-08-20 after the homepage redesign.

## Current Focus

1. Browser/device QA the redesigned Super Admin command centre when the browser connector is available.
2. Continue raising public website templates to distinct, premium layouts.
3. QA guided onboarding and first-property activation with a clean agency.
4. Connect live email delivery for standalone auth.
5. Close production gates with real owner/provider evidence.

## Blocked By Owner

- Production hosting/project ownership and Git remote/deployment evidence.
- Provider accounts for email, storage/security, monitoring, push and billing.
- DNS/domain access.
- Stripe/live payment setup if online payments are in the launch plan.
- External penetration test arrangement.
- Final launch/access approval.

## Remaining Launch Work

- Live email-provider secrets and smoke test for standalone auth emails.
- Clean-agency onboarding and first-property acceptance test.
- Production provider activation.
- Domain/TLS activation.
- D1 restore rehearsal.
- Penetration test and remediation.
- Hosted low-data measurement.
- Real-device mobile audit.
- Owner approval.

## P2 Polish

- Visual unification across app modules.
- Better empty states and owner-facing guidance.
- Visual regression checks for templates.
- Accessibility and SEO review.
- Performance and low-data polish.

## Future Phase

- Native mobile app.
- Official WhatsApp integration.
- Advanced matching, deals and commissions.
- Full property-management expansion.
- Multi-country rollout.

## Next Recommended Step

Polish the guided onboarding and first-property journey so the redesigned homepage is immediately proven by the product experience.
