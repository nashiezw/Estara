# ESTARA internal security review — 18 August 2026

## Scope

This review covers the deployed web application, D1 data layer, private R2 objects, identity and authorization boundaries, public intake, portal grants, API credentials, exports, automation, backups and browser response protections. It is an internal engineering review, not an independent third-party certification.

## Evidence executed

- Complete production build and automated suite, including cross-agency read and mutation attacks, branch-scope attacks, portal token isolation, document/media isolation, scoped API credentials, idempotency, automation approval and backup cryptography.
- Production dependency advisory query using the npm registry on 18 August 2026: zero known vulnerabilities in production dependencies.
- Adversarial policy tests for spreadsheet formula injection, unsafe identity values, malformed media, invalid lifecycle transitions, unknown permissions, unapproved outputs and tenant-crossing identifiers.
- Rendered-response test for CSP, frame denial, MIME sniffing denial and request correlation IDs.
- Source review confirms secrets are hashed or encrypted, SQL values are bound, private objects use tenant-prefixed keys, public reads use explicit allowlisted columns, and write routes authenticate and authorize.

## Findings

No critical or high-severity defect was found in the reviewed scope. Provider credentials are absent by design, so provider-dependent AI, official WhatsApp, email/push delivery and online payment cannot create an unreviewed data path. Remaining risks are tracked openly in the delivery checklist.

## Residual gates

- Commission an independent external penetration test before public launch approval.
- Repeat dependency and attack-suite checks for every production release.
- Complete an isolated D1 restore rehearsal and verify the restored tenant attack suite.
- Configure external error retention/alerting and malware scanning providers after provider approval.

## Point-in-time recovery

Cloudflare documents D1 Time Travel as always enabled on the production storage backend, with minute-level recovery for seven or thirty days depending on plan. ESTARA does not perform a production restore automatically because that operation overwrites the database. Provider-level restore access and an isolated rehearsal remain explicit launch gates.
