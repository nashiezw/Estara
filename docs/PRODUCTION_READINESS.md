# ESTARA Production Readiness

Last updated: 2026-08-20

Use this as the master human checklist. Existing evidence gates remain in `docs/PRODUCTION-READINESS-TODO.md`, `docs/PRODUCTION-LAUNCH-EVIDENCE.md` and `docs/DELIVERY-CHECKLIST.md`.

Status markers:

- `[x]` validated in repository evidence.
- `[-]` partially complete or implemented but waiting for live evidence.
- `[ ]` not complete.

## P0 — Critical Before Public Launch

- [x] Tenant-owned private data carries `agency_id`.
- [x] Server routes generally resolve agency access from authenticated membership rather than trusting frontend agency IDs.
- [x] RBAC permission checks exist through `db/authorization.ts` and `db/permission-policy.ts`.
- [x] Branch scoping exists for properties, enquiries, deals and documents.
- [x] Public property reads only expose available properties for the public agency.
- [x] Public enquiry intake creates contact/enquiry/next-action records with response due times.
- [x] Public media is served through tenant slug and listing checks.
- [x] Private marketing outputs and seller reports use authenticated access.
- [x] Money fields use integer minor units in schema/policies reviewed.
- [-] Production provider accounts, live secrets, webhooks and smoke tests are not complete.
- [-] Custom-domain lifecycle exists, but provider attachment and TLS evidence are pending.
- [ ] Isolated D1 restore rehearsal and tenant attack retest remain pending.
- [ ] Independent penetration testing remains pending.
- [ ] Final product-owner public access approval remains pending.

## P1 — Required For First Sellable MVP

- [x] Homepage has a product-led redesign around ESTARA as an operating system, Today's Business and Enter Once. Use Everywhere.
- [-] Public website templates and footer have been improved, but need visual QA across every template/page/device.
- [-] Agency website images/content can be edited in settings, but owner usability still needs end-to-end testing.
- [-] Agency/team profile data and public agent cards exist, but profile editing needs non-technical QA.
- [-] Guided first-run onboarding exists and sends owners into first-property capture, but clean-agency user QA is still pending.
- [-] Standalone ESTARA email/password auth has user, password hash, session, verification, reset and audited public mutation foundations; live email-provider delivery still needs production secrets and smoke testing.
- [x] Property capture, media, completeness and activation checks exist.
- [x] Marketing generation surfaces and outputs exist.
- [x] Contacts/enquiries/follow-up/viewings exist.
- [x] Seller grants, seller portal and seller report PDFs exist.
- [-] Billing structures exist, but live Stripe settlement/refund/failed-payment evidence is pending.
- [-] Super Admin now includes a command centre, platform settings, agency intelligence, revenue desk, operator access and evidence surfaces; final browser/device QA remains pending.
- [-] Notifications/outbox automation and auth email delivery paths exist, but live provider evidence is pending.
- [-] Low-data verifier exists, but hosted production measurement is pending.
- [ ] Manual mobile journey audit on representative Android and iOS devices remains pending.

## P2 — Important Polish

- [-] Shared visual system foundation now unifies homepage, auth, guided onboarding and workspace shell; remaining module-by-module screenshot/device QA is pending.
- [-] Add visual regression coverage for website templates and key public pages; automated template-structure guards now exist, screenshot/device QA remains pending.
- [-] Improve empty states so every major blank page points to the next action; first-run onboarding, branches, backups, contacts and integrations now point to concrete next actions, broader screenshot/device QA remains pending.
- [x] Owner-facing setup copy now explains how identity, colours, services, website style, public address and first-property capture shape the public site, enquiries and marketing flow.
- [-] SEO metadata, OpenGraph, Twitter cards and JSON-LD structured data now exist on public agency/property pages; final production crawl/share QA remains pending.
- [-] Accessibility foundations now include public-site skip links, labelled navigation and focus targets; manual keyboard, screen-reader, contrast and touch-target QA remains pending.
- [-] Review performance/bundle weight for mobile and low-data conditions; automated compressed asset budgets now pass, hosted/mobile measurements remain pending.

## P3 — Future Phase

- [ ] Native mobile app.
- [ ] Official WhatsApp integration.
- [ ] Advanced matching/reverse matching.
- [ ] Expanded deals/commissions beyond MVP.
- [ ] Full landlord/tenant/rent/maintenance/portal expansion.
- [ ] Multi-country commercial rollout after the Zimbabwe-first MVP proves demand.

## Developer Tasks

- Continue homepage visual QA while onboarding and public templates evolve.
- Complete design-system pass.
- Complete launch auth decision implementation.
- QA guided onboarding with a clean agency and complete first-property activation.
- Keep all tenant, RBAC, public media and upload tests green.
- Add missing visual tests where practical.
- Update this checklist after meaningful implementation.

## Owner Tasks

- Choose launch identity model.
- Provide production provider accounts and non-secret configuration values.
- Add secrets in the deployment secret store.
- Verify production domain/DNS/TLS.
- Approve public access level and launch date.
- Arrange penetration testing.
- Complete real-device mobile audit.
- Sign off first sellable MVP.

## Verification Commands

```bash
npm run build
node --test tests/*.test.mjs
npm run launch:readiness
npm run launch:readiness -- --all
npm run launch:evidence -- docs/evidence/production-launch.json
npm run d1:restore:verify -- docs/evidence/d1-restore-rehearsal.json
npm run low-data:verify -- docs/evidence/low-data-production.json
```

Do not mark launch gates complete until real evidence exists.
