# ESTARA Recovery Runbook

## Scope and objectives

This runbook covers D1 structured data, R2 private objects and the exact application revision. ESTARA now creates daily tenant-isolated AES-256-GCM snapshots in private object storage, records SHA-256 integrity data and retains snapshots for 35 days. The recovery gate remains open until an isolated D1 restore rehearsal is completed.

Target recovery point: 24 hours for MVP. Target recovery time: 4 hours. Tighter targets require provider capabilities and rehearsal evidence.

## Point-in-time recovery policy

Cloudflare D1 Time Travel is the selected point-in-time recovery capability for structured data where the database uses the D1 production storage backend. Before launch, run `wrangler d1 info <DATABASE>` and confirm `version: production`; alpha databases do not satisfy this gate.

D1 Time Travel can retrieve bookmarks and restore by bookmark or timestamp through `wrangler d1 time-travel info` and `wrangler d1 time-travel restore`. The retention window is plan-dependent: 7 days on the free plan and 30 days on the paid Workers plan.

Treat every Time Travel restore as a destructive in-place operation. Record the current bookmark before restoring, preserve the previous bookmark returned by the restore command, and rehearse only against an isolated recovery environment until launch approval explicitly authorizes production recovery.

## Incident declaration

1. Restrict risky writes by suspending affected agencies or temporarily disabling the failing workflow.
2. Record incident start, detecting operator, request IDs, affected agencies, affected resource types and last known healthy time.
3. Check the protected `/health` surface and separate database, storage, queue and dead-letter failures.
4. Preserve logs and current state. Never overwrite production with an unverified snapshot.

## Restore preparation

1. Select the newest encrypted snapshot earlier than the corruption time and verify its provider checksum and immutable retention record.
2. Restore first into an isolated recovery environment.
3. Apply the exact application revision and all migrations recorded with the snapshot.
4. Verify row counts, foreign keys, tenant ownership, object-manifest checksums and sampled document/media retrieval.
5. Run the complete automated suite, especially cross-tenant attacks, against the restored database.

## Production recovery

1. Obtain two-person approval from the incident commander and data owner.
2. Take a final forensic snapshot of the impaired system.
3. Restore D1 using the approved Time Travel bookmark or timestamp, then reconcile R2 objects against the snapshot manifest.
4. Deploy the matching tested application revision.
5. Validate authentication, membership resolution, one read/write journey per core domain, background queues and the protected health surface.
6. Re-enable writes gradually and monitor errors, latency, queue depth and dead letters.

## Drill evidence required

Use the protected Backups workspace to create a fresh snapshot and run the non-destructive recovery drill. The drill retrieves the tenant-prefixed object, verifies its SHA-256 checksum, decrypts it in memory, validates the agency manifest and counts every table and record. ESTARA writes `backup.restore_drill.completed` to the tenant audit trail.

Record date, operators, snapshot ID, source revision, restore target, start/end times, achieved RPO/RTO, validation results, exceptions and follow-up owner. The full recovery checklist item becomes complete only after the same verified manifest is restored into an isolated D1 environment and the full cross-tenant suite passes there.

Before moving the D1 rehearsal launch gate, save the isolated restore proof as `docs/evidence/d1-restore-rehearsal.json` and run:

```bash
npm run d1:restore:verify -- docs/evidence/d1-restore-rehearsal.json
```
