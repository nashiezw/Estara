# ESTARA Production Access Policy

This policy controls when ESTARA may move from private testing to public access. It is not launch approval by itself; it defines the evidence required before approval can be granted.

## Default Access

- Production deployments remain owner-only/private until the product owner explicitly approves public access.
- Public agency websites, public property pages, enquiry intake, viewing requests, seller links and shortlists may be exercised through controlled test links before public launch.
- Unknown hostnames and unverified custom domains must fail closed and must not become authoritative routes.

## Required Evidence Before Public Access

1. Source revision is committed, pushed and saved as a Sites version from the exact validated commit.
2. Production deployment succeeds from that saved version.
3. Production runtime environment variables satisfy the provider readiness contract without exposing secret values.
4. App/root hosts, the `*.estara.co.zw/*` hosted-tenant Worker route, wildcard TLS for first-level tenant subdomains and approved custom domains are attached to the production provider with active TLS.
5. Landing page, workspace, public agency website, public property page, enquiry intake, viewing request, seller portal and shortlist links are smoke-tested against the production URL.
6. Public intake rate limits, first-level tenant slug resolution (`{tenant}.estara.co.zw`), reserved system subdomains and unknown-host fail-closed behavior are verified in production.
7. Low-data mode byte-reduction measurements are captured from hosted production assets.
8. External error retention, alerting, email/push delivery, malware scanning and payment settlement smoke tests are complete.
9. Independent external penetration testing has no unresolved launch-blocking finding.
10. Product owner signs off the first sellable MVP launch.

## Approval Record

Record public-access approval in the release notes with:

- Approved production URL, hosted tenant URL pattern and custom domains.
- Sites project ID, saved version ID, deployment ID and commit SHA.
- Approval timestamp, approver name and rollback owner.
- Links or references for provider smoke tests, mobile audit, low-data measurements, restore rehearsal and penetration-test closure.

## Rollback

- Keep the last known-good private deployment available for rollback.
- If public launch smoke tests fail, immediately return access to owner-only/private and preserve logs.
- If tenant isolation, payment settlement, malware scanning or provider secrets are suspected compromised, pause public intake until the incident commander and data owner approve restoration.
