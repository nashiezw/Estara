# ESTARA Architecture Decision Record

## ADR-001 — Tenant boundary

Every agency-owned row carries `agency_id`. Server code resolves the agency from authenticated membership and includes that ID in every tenant-owned read or mutation. Client-supplied agency IDs are never authoritative. Platform-wide operations use a separate platform-role boundary.

## ADR-002 — Modular monolith

ESTARA ships as one Cloudflare-compatible application with domain policies separated from route handlers. This keeps transactional workflows cohesive while preserving clear seams for future services. Durable relational state uses D1; private binary objects use tenant-prefixed R2 keys.

## ADR-003 — Identity and authorization

The private application uses dispatch-owned Sign in with ChatGPT identity. Membership, subscription state and server-side permissions are checked independently. Custom roles remain agency-owned; platform roles remain globally controlled.

## ADR-004 — Durable background work

Business events are written to an outbox. Immutable automation-rule versions consume those events through idempotent executions with retries, approval gates and dead-letter states. User notifications and external delivery attempts have separate ledgers.

## ADR-005 — Files and public access

Images, documents and generated marketing outputs are private R2 objects with D1 ownership metadata. Agency document access uses high-entropy, hash-at-rest, short-lived, single-use bearer tokens. Public property images are exposed only through tenant-slug and live-listing checks.

## ADR-006 — Financial values and immutable facts

Money is stored as integer minor units. Discounts and totals are calculated with bounded integer arithmetic. Plan versions, marketing templates, marketing copy, automation rules and approved seller reports are immutable or versioned so historical decisions remain reproducible.

## ADR-007 — Observability

Every request receives a correlation ID and a structured completion or failure event without customer payloads. The protected health surface actively probes D1 and R2 and reports background queue states and dead letters.

## ADR-008 — Deployment

Only an exact, tested source revision is packaged, saved and deployed. Production stays owner-only until public-site access, provider and domain decisions are explicitly approved.
