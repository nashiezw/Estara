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
- [-] System agency roles implemented; custom roles pending
- [ ] Super Admin console
- [ ] Support and finance platform roles
- [ ] Plans, versioned entitlements and limits
- [ ] Trials, subscriptions, grace periods and suspension
- [ ] Billing invoices, receipts, coupons and payment providers
- [-] Audit log covers implemented protected changes
- [ ] Rate limiting, security headers and abuse controls

## 2. Agency onboarding and branding

- [x] Guided account and agency onboarding
- [x] Agency details and business activities
- [ ] Logo upload to private object storage
- [-] Agency colour tokens persist; typography and full output application pending
- [x] Team invitation and membership acceptance
- [x] Website template selection
- [x] Subdomain selection
- [ ] Own-domain onboarding
- [x] Completion screen and first-property handoff
- [x] Agency-branded workspace screens
- [ ] Persisted agency branding used across all public outputs

## 3. Property

- [-] Tenant-owned property persistence
- [-] Core property fields
- [ ] Full property field set from specification
- [ ] Configurable country/property features
- [ ] Canonical contact-to-owner relationship
- [ ] Mandate relationship
- [ ] Branch and listing-agent assignment
- [ ] Property media metadata
- [ ] Real camera/file uploads to private object storage
- [ ] Image validation, compression and thumbnails
- [-] Mobile-first property capture interface
- [ ] Guided photo categories
- [ ] Device-local offline draft
- [ ] Resumable upload queue and retry states
- [-] Listing completeness calculation
- [-] Activation command with server validation
- [ ] Activation channel selection and durable results
- [ ] Complete status transition state machine
- [ ] Downstream reactions for under offer, sold, let, withdrawn and expired
- [ ] Property activity timeline
- [ ] Property verification checklist

## 4. Agency website and domains

- [ ] Public agency website
- [ ] Home, properties, sale, rent, agents, services, about and contact pages
- [ ] Template-driven website settings
- [ ] Published-property read model
- [ ] Public property detail page
- [ ] Call, WhatsApp, enquire, viewing and share actions
- [ ] Similar properties
- [ ] Tenant subdomain routing
- [ ] Custom-domain ownership token
- [ ] DNS verification lifecycle
- [ ] Automated TLS activation
- [ ] Unknown-host fail-closed behavior
- [ ] SEO, caching and invalidation

## 5. Marketing Studio

- [-] Interactive Marketing Studio prototype
- [-] Branded creative preview
- [-] WhatsApp copy/share interaction
- [ ] Versioned structured templates
- [ ] WhatsApp card and status asset
- [ ] Facebook 1:1 and 4:5 assets
- [ ] Instagram post and story assets
- [ ] Flyer
- [ ] Real PDF brochure
- [ ] Social caption and listing description
- [ ] Shareable link and QR code
- [ ] Rendering jobs, retries and failure states
- [ ] AI copy constrained to verified property facts
- [ ] Agent review and approval before publication
- [ ] Analytics based only on measurable events

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
- [ ] Public website enquiry submission
- [x] Contact create-or-update during enquiry intake
- [x] Responsible-agent assignment
- [x] Thirty-minute response deadline
- [x] Configurable response SLA
- [-] Overdue visibility and high-priority response actions; notification escalation pending
- [x] Enquiry stages and transitions
- [-] Enquiry list, search and filters; Kanban pending
- [x] Contact action creates next-day follow-up
- [x] Manager unresolved-enquiry visibility
- [ ] Enquiry notifications
- [x] Enquiry acceptance and cross-tenant tests

## 7. Next actions and automation

- [-] Persistent NextAction model
- [-] System-created response and follow-up actions
- [ ] Today, overdue and upcoming action views
- [ ] Complete/reassign/reschedule actions
- [ ] Resource-specific action policies
- [ ] Domain event outbox
- [ ] Versioned automation rules
- [ ] Trigger, condition and action engine
- [ ] Idempotent automation executions
- [ ] Retry and dead-letter handling
- [ ] Human approval gates for sensitive actions

## 8. Viewings

- [-] Viewing/schedule presentation prototype
- [ ] Persistent viewing records
- [ ] Request, confirm, complete, cancel and no-show transitions
- [ ] Online viewing requests
- [ ] Conflict checks
- [ ] Notifications and reminders
- [ ] After-viewing feedback workflow
- [ ] Alternative-property suggestion handoff
- [ ] Offer workflow handoff
- [ ] Next-action generation

## 9. Seller experience

- [-] Seller portal presentation prototype
- [ ] Seller portal identity and invitation
- [ ] Explicit property-level access grants
- [ ] Revocation and access audit
- [ ] Real listing views, enquiries, viewings and offers
- [ ] Approved seller documents
- [ ] Mandates and expiry reminders
- [ ] Property momentum rules
- [ ] Weekly/fortnightly/monthly seller report drafts
- [ ] Agency review and approval
- [ ] Branded report PDF and secure portal report
- [ ] Seller notification delivery tracking

## 10. MVP hardening and launch

- [ ] Global tenant-safe search
- [ ] In-app notification centre
- [ ] Email and push delivery infrastructure
- [ ] Low-data mode with measured reductions
- [ ] Accessible keyboard/touch journeys
- [ ] Loading, success, error and retry states everywhere
- [ ] Unsaved-work protection and draft recovery
- [ ] Private document storage and signed URLs
- [ ] File validation and malware scanning
- [ ] Full audit coverage
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
