# ESTARA Recovery Runbook

## Scope and objectives

This runbook covers D1 structured data, R2 private objects and the exact application revision. Until automated encrypted backup custody is configured with the selected production provider, the recovery gate remains open and this document must not be treated as proof that backups exist.

Target recovery point: 24 hours for MVP. Target recovery time: 4 hours. Tighter targets require provider capabilities and rehearsal evidence.

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
3. Restore D1, then reconcile R2 objects against the snapshot manifest.
4. Deploy the matching tested application revision.
5. Validate authentication, membership resolution, one read/write journey per core domain, background queues and the protected health surface.
6. Re-enable writes gradually and monitor errors, latency, queue depth and dead letters.

## Drill evidence required

Record date, operators, snapshot ID, source revision, restore target, start/end times, achieved RPO/RTO, validation results, exceptions and follow-up owner. The checklist item becomes complete only after a real encrypted backup configuration and a successful isolated restore drill.
