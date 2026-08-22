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
- [x] Platform identity defaults, metadata, tenant-domain suffix and public powered-by wording are centralized.
- [x] Agency colour and typography settings persist and are applied across implemented workspace, public website, Marketing Studio SVG and PDF outputs.
- [x] Website template selection now previews each template as a realistic mini public website, and Marketing Studio supports editable design, text, image, badge, icon, logo and alignment controls.
- [x] App-facing product labels across landing, workspace, admin, billing, seller, invite, health, integrations and secondary tool screens read centralized platform identity instead of source-fixed copy.
- [x] `npm run launch:readiness` reports public-launch blockers, while `npm run launch:readiness -- --all` reports every unfinished roadmap row.
- [x] Production launch evidence register lists every remaining public-launch gate, required proof and current deployment blocker.
- [x] A machine-verifiable launch evidence bundle gate is implemented as `npm run launch:evidence -- docs/evidence/production-launch.json`.
- [x] Host-based tenant-subdomain and active custom-domain routing are implemented with unknown production hosts failing closed.
- [x] D1 restore rehearsal evidence verifier is implemented as `npm run d1:restore:verify -- docs/evidence/d1-restore-rehearsal.json`.
- [x] Cloudflare Worker error capture is wired through Sentry with release tagging and no default PII once production Sentry secrets are configured.

## Must Complete Before Public Launch

- [-] Production provider decisions are documented for email, push, malware scanning, external error retention, alerting and online payments, and protected health reports missing provider configuration without exposing secret values; account provisioning, live secrets, webhooks and smoke tests remain pending.
- [-] Custom-domain ownership token, DNS verification and unknown-host fail-closed routing are implemented; complete real provider domain attachment and TLS activation.
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
