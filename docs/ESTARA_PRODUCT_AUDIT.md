# ESTARA Product Audit

Last updated: 2026-08-20

## What ESTARA Is

ESTARA is a Zimbabwe-first real estate business operating system. The sellable product should help an agency look professional, market faster, lose fewer clients and run daily work from one connected place.

The product promise is not simply "store records." ESTARA should turn information into the next useful action: respond to this enquiry, complete this property, confirm this viewing, update this seller, renew this mandate, or protect this revenue.

## Current Product Architecture

ESTARA is currently a modular monolith running on a Cloudflare-compatible Vinext/React app. The repository has private workspace screens, public agency websites, property pages, public enquiry intake, seller portals, marketing output generation, domain management, backups, health checks, admin/control-plane features, and a large policy/test layer.

The first sellable MVP should stay focused on:

- Foundation: identity, memberships, tenant isolation, RBAC, platform settings, entitlements and subscriptions.
- Agency: onboarding, branding, team, branches and website setup.
- Property: property records, media, completeness, activation and owner relationships.
- Online presence: agency websites, templates, public property pages, subdomains and custom domains.
- Marketing: reusable property data, social/WhatsApp/brochure outputs and reviewable copy.
- Conversion: contacts, enquiries, response timers, next actions, follow-ups and viewings.
- Seller: seller access, seller reports, property momentum and mandates.

## Repository Architecture

- `app/`: routes, private workspace UI, public website pages, API routes and feature clients.
- `db/`: schema, tenant policies, permissions, public-site reads, provider checks, automation, marketing rendering and business rules.
- `drizzle/`: D1 migrations.
- `tests/`: broad Node test suite covering security, tenancy, launch evidence, public sites, policies and critical workflows.
- `docs/`: architecture decisions, production evidence, provider decisions, access policy, recovery and launch readiness.
- `worker/`: Cloudflare worker entry, asset fetch and image transform surface.

## Existing User Roles

Workspace roles are defined in `db/permission-policy.ts`:

- `principal`: full agency permissions.
- `admin`: full agency permissions.
- `agent`: property, enquiry, matching, deal, report, export, property management, development, action, viewing and document permissions.
- `marketing`: property read/publish/media, development read, action/viewing/document read.
- `viewer`: read-oriented access across properties, enquiries, matching, deals, reports, property management, developments, actions, viewings and documents.

Platform users are separate from agency users and live behind a platform/control-plane boundary.

## Implemented Functionality

- Platform identity defaults and settings.
- Agency creation/preview seed path through `requireWorkspace`.
- Agency memberships, invitations, custom roles and agent profile data.
- RBAC and branch-scoped access checks.
- Properties with completeness, activation checks, status events and media.
- Public agency websites with selectable templates, colours, typography, editable content and editable website image slots.
- Public property pages with public media serving and SEO metadata.
- Public enquiry/viewing intake that creates contacts, enquiries, response due times and next actions.
- Contacts, enquiries, follow-ups and viewing lifecycle.
- Seller grants, seller portal and approved seller report PDFs.
- Marketing render jobs and outputs.
- Custom domain ownership/DNS status model.
- Provider-readiness documentation and health checks.
- Backups, recovery drill verification and launch evidence gates.
- A substantial automated test suite.

## Partially Implemented Functionality

- Public website templates exist and are improving, but each template still needs visual QA across all pages and real agency-content editing workflows tested by a non-developer.
- Standalone ESTARA email/password authentication now has first-pass registration, login, logout, verification-token, reset-token, session-cookie and auth-page foundations. Live provider email delivery and smoke testing are still required before public launch.
- Onboarding exists through settings/workspace paths, but the desired guided first-run sequence is not yet a polished end-to-end product journey.
- Provider integrations are documented and partially guarded, but live provider activation and smoke tests are pending.
- Custom domains have ownership/DNS lifecycle code, but production provider attachment and TLS evidence remain pending.
- Billing has plan/subscription/invoice structures, but live settlement/refund/failed-payment evidence is pending.
- Automation has an outbox, rules, retries and approvals, but production background execution/provider reliability still needs live validation.
- Mobile and low-data readiness have tests/docs, but real device and hosted asset measurements remain pending.

## Missing MVP Functionality

- Guided onboarding that proves the homepage promise by taking an agency to a first live property.
- Full authentication experience if ESTARA launches outside ChatGPT identity.
- Guided onboarding from account creation to first property and live website.
- Owner-ready setup paths for production provider accounts, DNS, secrets and final approval.
- Live email provider, payment provider, monitoring/alerting and hosted-domain verification.
- Final first-sellable-MVP acceptance test in a clean production-like environment.

## Future Phase Functionality

These should not block the first sellable MVP unless already required by a customer contract:

- Native mobile app.
- Advanced matching/reverse matching.
- Deep offers/deals/commission expansion beyond the MVP path.
- Full landlord/tenant/rent/arrears/statements/maintenance product expansion.
- Official WhatsApp integration.
- Broad country/currency expansion beyond the current configurable foundation.

## Current UX Problems

- The public website templates have improved, but the product still needs systematic page-by-page visual QA for desktop and mobile.
- Several app screens use different visual systems, which makes ESTARA feel less unified than the product vision.
- The homepage now carries the operating-system positioning; onboarding must now prove it.
- Empty/loading/error states exist in important areas, but every critical workflow should be audited as a real user.
- Agency setup and website content editing need to feel obvious to a non-technical agency owner.

## Homepage Problems

- The homepage now leads with "Run your real estate agency from one place."
- It shows "Today's Business" and "Enter Once. Use Everywhere." as product proof.
- Demo counts are labelled as workspace preview content.
- Further visual QA should happen after the full onboarding path is polished.

## Auth Problems

- The current repository still keeps ChatGPT/local-preview compatibility for development.
- Standalone ESTARA auth has been started and routes through `/register`, `/login`, `/verify-email`, `/forgot-password` and `/reset-password`.
- Production auth email delivery depends on `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; without those, public registration and password reset fail closed.

## Onboarding Problems

- Agency settings, branding, website template selection, team invitations and public-site content controls exist, but the desired guided onboarding sequence is not yet the primary first-run experience.
- The first success moment should be "add your first property", then activate it, view the public site, create marketing and receive an enquiry.

## Multi-Tenant Risks

- The repository has strong server-side tenancy patterns and cross-tenant tests.
- Remaining risk is regression: every new query, upload, public route and API route must continue resolving tenant ownership server-side.
- Public media and documents are especially sensitive and must keep tenant/property/listing checks.

## Security Risks

- Production provider secrets, storage, email, billing, monitoring and deployment evidence are still pending.
- Independent penetration testing has not been completed.
- Live restore rehearsal against an isolated environment remains pending.
- Standalone auth, if introduced, will need password hashing, secure cookies, verification tokens, reset tokens, brute-force controls and rate limiting.

## Architectural Risks

- The app is broad for an MVP; launch work can drift into future phases.
- Some runtime compatibility patterns are Cloudflare-specific, so production setup must match the intended host.
- Documentation names are currently split between existing launch docs and the new master docs. This file and `PRODUCTION_READINESS.md` should become the starting point for future sessions.

## Production Blockers

- Live production provider accounts/secrets/webhooks/smoke tests.
- Domain attachment and TLS evidence.
- Isolated D1 restore rehearsal and retest.
- Independent penetration test and closure of blockers.
- Product-owner public access approval.
- Live billing settlement evidence.
- Hosted low-data measurement evidence.
- Manual mobile journey audit.
- Final first-sellable-MVP owner approval.

## Technical Debt

- Unify app visual language across homepage, auth/onboarding and workspace.
- Keep reducing hard-coded platform/country/currency assumptions where settings already exist.
- Continue splitting route handlers from domain policies when workflows grow.
- Add visual regression checks for public templates.
- Expand owner-facing documentation whenever setup changes.

## Recommended Homepage Strategy

Lead with: "Run your real estate agency from one place."

Show:

- Today's Business: what needs attention today.
- Enter Once. Use Everywhere: one property becomes listing, website page, WhatsApp/social creative, brochure, enquiry, viewing and seller report.
- Four commercial promises: look professional, market faster, lose fewer clients, run from one place.
- A realistic product preview using clearly labelled demo content.
- Direct CTAs: start setup, book demo or sign in.

## Recommended Implementation Order

1. Keep production docs current and use them before future work.
2. Polish guided agency onboarding to first property activation.
3. Create a shared design system pass for onboarding and key workspace surfaces.
4. Connect and smoke test live auth email delivery.
5. Continue visual QA on homepage and public templates.
6. Run critical MVP flows end-to-end in a clean agency.
7. Complete owner/provider production setup gates.
8. Perform mobile, low-data, security and launch approval checks.
