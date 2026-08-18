# ESTARA End-to-End Delivery Checklist

This is the authoritative implementation checklist for the ESTARA master specification. An item is marked complete only when its full user journey works, persists, is authorized server-side, works on mobile, handles errors, and has appropriate tests.

## Status legend

- `[x]` Completed and deployed
- `[-]` Partially implemented; not definition-of-done
- `[ ]` Not implemented

## 0. Product governance

- [x] Existing workspace assessed before implementation
- [x] Greenfield modular-monolith direction established
- [x] Product deployed privately for iterative testing
- [x] Authoritative implementation checklist created
- [ ] Specification traceability tests for all 123 sections
- [ ] Architecture decision records
- [ ] Canonical domain glossary
- [ ] Production service-provider decisions

## 1. Foundation

- [-] Platform settings: metadata exists, but identity is still partly hard-coded
- [x] Authenticated private workspace using platform-provided identity
- [x] Server-resolved tenant workspace
- [x] Agency membership table
- [x] Tenant isolation on implemented property/enquiry APIs
- [x] Automated cross-tenant attack test suite
- [x] Permission catalogue and server-side RBAC policies
- [x] System and tenant-owned custom agency roles
- [x] Super Admin console
- [x] Support and finance platform roles
- [x] Plans, immutable versioned entitlements and server-enforced limits
- [x] Trials, subscriptions, grace periods and suspension
- [-] Billing invoices, manual receipts and coupons; payment provider pending selection
- [-] Audit log covers implemented protected changes
- [x] Public intake rate limiting, abuse controls and global security headers

## 2. Agency onboarding and branding

- [x] Guided account and agency onboarding
- [x] Agency details and business activities
- [x] Logo upload to private object storage
- [-] Agency colour tokens persist; typography and full output application pending
- [x] Team invitation and membership acceptance
- [x] Website template selection
- [x] Subdomain selection
- [ ] Own-domain onboarding
- [x] Completion screen and first-property handoff
- [x] Agency-branded workspace screens
- [x] Persisted agency branding used across all implemented public outputs

## 3. Property

- [x] Tenant-owned property persistence
- [x] Core property fields
- [x] Full property field set from specification
- [x] Configurable country/property features
- [x] Canonical contact-to-owner relationship
- [x] Mandate relationship
- [ ] Branch and listing-agent assignment
- [x] Property media metadata
- [x] Real camera/file uploads to private object storage
- [ ] Image validation, compression and thumbnails
- [x] Mobile-first property capture interface
- [ ] Guided photo categories
- [ ] Device-local offline draft
- [ ] Resumable upload queue and retry states
- [x] Listing completeness calculation
- [x] Activation command with server validation
- [x] Activation channel selection and durable results
- [x] Complete status transition state machine
- [x] Downstream reactions for under offer, sold, let, withdrawn and expired
- [x] Property activity timeline
- [x] Property verification checklist

## 4. Agency website and domains

- [-] Public agency website implemented and privately deployed; public access approval pending
- [-] Home, properties, sale, rent, services, about and contact pages; public agent profiles pending
- [x] Template-driven website settings
- [x] Published-property read model
- [x] Public property detail page
- [x] Call, WhatsApp, enquire, viewing and share actions
- [x] Similar properties
- [-] Tenant slug routing and preview URLs; real subdomain routing pending
- [ ] Custom-domain ownership token
- [ ] DNS verification lifecycle
- [ ] Automated TLS activation
- [ ] Unknown-host fail-closed behavior
- [-] Dynamic metadata and bounded revalidation; explicit mutation invalidation pending

## 5. Marketing Studio

- [x] Interactive production Marketing Studio
- [x] Branded creative preview
- [x] WhatsApp copy/share interaction
- [x] Versioned structured templates
- [x] WhatsApp card and dedicated status assets
- [x] Facebook 1:1 and 4:5 assets
- [x] Instagram post and story assets
- [x] Flyer
- [x] Real PDF brochure
- [x] Fact-bound social caption and full listing description
- [x] Shareable link and QR code
- [x] Rendering jobs, retries and failure states
- [x] Marketing copy constrained to verified property facts
- [x] Agent review and approval before publication
- [x] Analytics based only on measurable events

## 6. Contacts and enquiries

- [x] Canonical contact table
- [x] Contact roles: buyer, tenant, seller, landlord, investor and developer
- [x] Phone/email normalization
- [-] Safe contact deduplication and conflict detection; manual merge pending
- [x] Contact requirements
- [-] Contact activity history persists; timeline interface pending
- [x] Tenant-owned enquiry persistence
- [x] Manual enquiry capture linked to a property
- [x] Fast enquiry form with phone and next follow-up
- [-] Website enquiry submission implemented; public access enablement pending
- [x] Contact create-or-update during enquiry intake
- [x] Responsible-agent assignment
- [x] Thirty-minute response deadline
- [x] Configurable response SLA
- [x] Overdue escalation rules
- [x] Enquiry stages and transitions
- [-] Enquiry list, search and filters; Kanban pending
- [x] Contact action creates next-day follow-up
- [x] Manager unresolved-enquiry visibility
- [x] Enquiry notifications
- [x] Enquiry acceptance and cross-tenant tests

## 7. Next actions and automation

- [x] Persistent NextAction model
- [x] System-created response and follow-up actions
- [x] Today, overdue and upcoming action views
- [x] Complete/reassign/reschedule actions
- [x] Resource-specific action policies
- [x] Domain event outbox
- [x] Versioned automation rules
- [x] Trigger, condition and action engine
- [x] Idempotent automation executions
- [x] Retry and dead-letter handling
- [x] Human approval gates for sensitive actions

## 8. Viewings

- [x] Live viewing schedule
- [x] Persistent viewing records
- [x] Request, confirm, complete, cancel and no-show transitions
- [-] Online viewing requests implemented; public access enablement pending
- [x] Conflict checks
- [-] Persistent viewing reminders; notification delivery pending
- [x] After-viewing feedback workflow
- [x] Alternative-property suggestion handoff
- [x] Offer workflow handoff
- [x] Next-action generation

## 9. Seller experience

- [x] Seller portal backed by live tenant-owned data
- [x] Seller portal identity and invitation
- [x] Explicit property-level access grants
- [x] Revocation and access audit
- [-] Real listing views, enquiries and viewings; offers pending
- [ ] Approved seller documents
- [ ] Mandates and expiry reminders
- [ ] Property momentum rules
- [-] Weekly seller report drafts implemented; fortnightly/monthly schedules pending
- [x] Agency review and approval
- [-] Secure branded portal report implemented; PDF pending
- [ ] Seller notification delivery tracking

## 10. MVP hardening and launch

- [x] Global tenant-safe search
- [x] In-app notification centre
- [-] Email and push delivery ledger implemented; provider delivery pending selection
- [ ] Low-data mode with measured reductions
- [ ] Accessible keyboard/touch journeys
- [ ] Loading, success, error and retry states everywhere
- [ ] Unsaved-work protection and draft recovery
- [x] Private document storage and expiring single-use access URLs
- [-] File type, size and magic-byte validation; external malware scanning provider pending
- [-] Tenant-scoped audit trail and searchable audit UI; remaining domain mutations pending coverage audit
- [ ] Structured logs and error monitoring
- [ ] Queue, API, storage and database monitoring
- [ ] Automated encrypted backups
- [ ] Point-in-time recovery where supported
- [ ] Restore drill and recovery runbook
- [ ] Security review and penetration testing
- [ ] Cross-tenant automated suite
- [ ] Mobile and slow-network performance budgets
- [ ] Five-minute sales demo acceptance test
- [ ] Daily-value demo acceptance test
- [ ] New-agency final product test
- [ ] First sellable MVP launch approval

## 11. Phase 2

- [ ] Buyer and tenant requirements
- [ ] Explainable matching
- [ ] Reverse matching
- [ ] Lost-opportunity recovery
- [ ] Branded shortlists
- [ ] Offers
- [ ] Deals and configurable stages
- [ ] Deal next actions
- [ ] Decimal-safe commissions and splits
- [ ] Documents and fine-grained access
- [ ] Branches and branch-scoped permissions
- [ ] React Native/Expo mobile app
- [ ] Advanced business reports
- [ ] Authorized data exports

## 12. Phase 3 — Property management

- [ ] Managed-property relationships
- [ ] Landlords without duplicate contacts
- [ ] Tenants without duplicate contacts
- [ ] Leases
- [ ] Rent schedules
- [ ] Manual and provider payments
- [ ] Payment allocation and reconciliation
- [ ] Receipts
- [ ] Deposits
- [ ] Arrears and reminders
- [ ] Expenses
- [ ] Landlord statements and immutable finalization
- [ ] Landlord portal
- [ ] Tenant portal
- [ ] Maintenance requests, approvals and contractors
- [ ] Inspections and private media
- [ ] Lease renewal and vacancy automation
- [ ] Diaspora-owner experience

## 13. Phase 4

- [ ] Governed AI description and caption assistance
- [ ] Lead and report summaries
- [ ] Authorized Ask ESTARA interface
- [ ] Advanced automation builder
- [ ] Official WhatsApp integration, if approved and feasible
- [ ] Property portal integrations
- [ ] Accounting integrations
- [ ] Public API and scoped credentials
- [ ] Development module
- [ ] Enterprise permissions and white labelling

## Final completion gate

- [ ] A brand-new agency can start with only its name, logo, phone number and one property
- [ ] It can publish a professional agency website and live property listing
- [ ] It can generate professional marketing material and a real WhatsApp share
- [ ] A customer can submit an enquiry that creates/updates one contact and starts the response timer
- [ ] An agent can respond, create a follow-up, book and complete a viewing
- [ ] A seller can securely see an approved report built from real activity
- [ ] Permissions, mobile UX, cross-tenant isolation, audit, backups and monitoring all pass
- [ ] No incomplete or simulated feature is reported as complete
