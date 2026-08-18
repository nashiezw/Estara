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

## Must Complete Before Public Launch

- [-] Production provider decisions are documented for email, push, malware scanning, external error retention, alerting and online payments; account provisioning, live secrets, webhooks and smoke tests remain pending.
- [ ] Complete the remaining UI copy branding sweep so default product labels can be changed without source edits.
- [-] Custom-domain ownership token, DNS verification and unknown-host fail-closed routing are implemented; complete real provider domain attachment and TLS activation.
- [ ] Run an isolated D1 restore rehearsal and repeat the tenant attack suite against the restored environment.
- [ ] Commission independent external penetration testing and resolve all launch-blocking findings.
- [ ] Approve public-site access level and production access policy.
- [ ] Confirm production billing/payment provider settlement workflow; do not claim provider payments complete until verified.
- [ ] Verify production byte-reduction measurements for low-data mode on real hosted assets.
- [ ] Complete a manual mobile journey audit on representative low-end Android and iOS devices.
- [ ] Complete first sellable MVP launch approval by the product owner.

## Phase Follow-Ups

- [ ] Build the React Native/Expo mobile app.
- [ ] Add official WhatsApp integration only if approved and feasible through official channels.
- [ ] Expand custom-country configuration after the Zimbabwe-first MVP proves the core operating model.
