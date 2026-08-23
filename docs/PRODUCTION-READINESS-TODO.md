# ESTARA Production Readiness To-Do

This list tracks the remaining work to move ESTARA from private, tested MVP to public production launch. Items marked complete have automated evidence or explicit implementation evidence in the repository.

## Completed in this workspace

- [x] Build and automated test suite are green.
- [x] Landing page, private workspace, public agency website, public property page, enquiry intake, viewing request, marketing studio, seller portal and seller report surfaces exist.
- [x] Server-side tenant isolation, RBAC, branch scoping and cross-tenant attack tests are in place.
- [x] Public enquiry intake creates or updates one contact, creates an enquiry, starts the response timer and creates next actions.
- [x] Viewing lifecycle includes request, confirmation, completion, feedback, conflicts, reminders and next actions.
- [x] Seller reporting is based on live measurable activity and generates a real PDF after agency approval.
- [x] Low-data mode, loading/error/retry states, non-disclosing not-found states and security headers are covered by tests.
- [x] New-agency acceptance test covers the final product path from agency setup through property activation, enquiry, follow-up, viewing and seller reporting.
- [x] Master specification traceability gate exists so the 123-section source document remains visible to release work.
- [x] Platform identity defaults, metadata, first-level tenant-domain suffix and public powered-by wording are centralized.
- [x] Platform logo and browser icon uploads now propagate through landing, auth, workspace and Super Admin surfaces instead of falling back to the letter mark when an asset exists.
- [x] Agency colour and typography settings persist and are applied across implemented workspace, public website, Marketing Studio SVG and PDF outputs.
- [x] Agency settings now separate the public/wordmark logo from the compact agency icon, and both uploads persist as tenant-scoped private media.
- [x] Website template selection now previews each template as a realistic mini public website, and Marketing Studio supports editable design, text, image, badge, icon, logo and alignment controls.
- [x] Workspace website settings now show a larger selected-template preview with header, hero, listings, service chips and footer cues before saving the template.
- [x] Public website reads now normalize invalid legacy template and typography keys, and local preview seeding uses a real public website template instead of a Marketing Studio design key.
- [x] Team profile editing now links directly to the public agents page so owners can review how public profile changes appear.
- [x] Owner setup copy now explains how agency identity, colours, services, website style, public address and first-property capture connect to the public website, enquiries and marketing flow.
- [x] Key empty states now point users to concrete next actions for first-property capture, branch setup, verified backups, contact capture and governed integrations.
- [x] Local preview seeding now uses one deterministic agency and `prime-property` website slug so the workspace website preview route has a stable target during end-to-end checks.
- [x] `npm run dev:migrate` now prepares the local D1 preview database with the committed migrations before local workspace/public-site smoke checks.
- [x] `npm run dev:smoke` now verifies the local workspace, settings, seeded `prime-property` public website preview routes and public home-page navigation links return expected content.
- [x] App-facing product labels across landing, workspace, admin, billing, seller, invite, health, integrations and secondary tool screens read centralized platform identity instead of source-fixed copy.
- [x] `npm run launch:readiness` reports public-launch blockers, while `npm run launch:readiness -- --all` reports every unfinished roadmap row.
- [x] Production launch evidence register lists every remaining public-launch gate, required proof and current deployment blocker.
- [x] A machine-verifiable launch evidence bundle gate is implemented as `npm run launch:evidence -- docs/evidence/production-launch.json`.
- [x] Host-based first-level tenant-subdomain routing for `{tenant}.estara.co.zw` and active custom-domain routing are implemented with unknown production hosts failing closed.
- [x] Domains and website workspace page now presents the default agency website as a premium mobile-ready card, with open/copy actions and clean default website URL handling.
- [x] D1 restore rehearsal evidence verifier is implemented as `npm run d1:restore:verify -- docs/evidence/d1-restore-rehearsal.json`.
- [x] Cloudflare Worker error capture is wired through Sentry with release tagging and no default PII once production Sentry secrets are configured.
- [x] Deal-stage moves and platform billing receipt capture use inline review forms instead of browser popup prompts, with guard tests covering the regression.
- [x] Remaining destructive/recovery UI actions use inline review or page-level error states instead of browser prompt, confirm or alert dialogs.
- [x] Private workspace tool back links route to the authenticated workspace instead of the public landing page, with a regression guard covering the linked tools.
- [x] The local visual system foundation now unifies homepage, auth, guided onboarding and workspace shell tokens, radius, headings and card treatment.
- [x] Super Admin and workspace mobile shell polish now keeps navigation, buttons, loading feedback and form copy readable on narrow screens.
- [x] Website content and image editing now includes page-by-page public review links so owners can inspect each public page from settings.

## Must Complete Before Public Launch

- [-] Production provider decisions are documented for email, push, malware scanning, external error retention, alerting and online payments, and protected health reports missing provider configuration without exposing secret values; account provisioning, live secrets, webhooks and smoke tests remain pending.
- [-] Custom-domain ownership token, DNS verification, first-level hosted-tenant routing and unknown-host fail-closed routing are implemented; complete real provider domain attachment, wildcard tenant route evidence and TLS activation.
- [ ] Run an isolated D1 restore rehearsal and repeat the tenant attack suite against the restored environment.
- [ ] Commission independent external penetration testing and resolve all launch-blocking findings.
- [-] Production access policy documented; public-site access level still needs product-owner approval and live deployment evidence.
- [-] Production billing/payment settlement workflow documented; live Stripe settlement, refund, failed-payment and finance sign-off evidence still pending. Do not claim provider payments complete until verified.
- [-] Low-data production measurement verifier and evidence format are implemented; verify byte-reduction measurements on real hosted assets before public launch.
- [ ] Complete a manual mobile journey audit on representative low-end Android and iOS devices.
- [ ] Complete first sellable MVP launch approval by the product owner.

## Phase Follow-Ups

- [ ] Build the React Native/Expo mobile app.
- [ ] Add official WhatsApp integration only if approved and feasible through official channels.
- [ ] Expand custom-country configuration after the Zimbabwe-first MVP proves the core operating model.
