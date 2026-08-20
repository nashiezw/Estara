# D1 Restore Rehearsal Evidence

The public launch gate requires a real isolated Cloudflare D1 Time Travel restore and a repeat of the tenant attack suite against the restored binding. Do not run the rehearsal against production.

## Required Run

1. Confirm the source database reports `version: production` with `wrangler d1 info <DATABASE>`.
2. Capture the current Time Travel bookmark with `wrangler d1 time-travel info <DATABASE>`.
3. Restore the selected bookmark or timestamp into an isolated recovery database or isolated environment binding.
4. Deploy or bind the exact tested application revision to the restored database.
5. Validate row counts, foreign keys, tenant ownership, object manifest checksums, sampled private object retrieval and the protected health surface.
6. Run the restored-environment tenant attack suite:

```bash
node --test tests/cross-tenant-attacks.test.mjs
```

7. Save the suite output and operator decision in the evidence bundle.

## Evidence File

Save the rehearsal proof as `docs/evidence/d1-restore-rehearsal.json` and verify it before adding it to the final production launch bundle:

```bash
npm run d1:restore:verify -- docs/evidence/d1-restore-rehearsal.json
```

Example shape:

```json
{
  "rehearsalId": "d1-restore-2026-08-19",
  "startedAt": "2026-08-19T08:00:00.000Z",
  "completedAt": "2026-08-19T08:42:00.000Z",
  "appRevision": "0123456789abcdef",
  "isolatedEnvironment": true,
  "productionBackendVersion": "production",
  "restoreTarget": "estara-recovery-2026-08-19",
  "sourceDatabase": "estara-prod",
  "restoredDatabaseBinding": "ESTARA_RECOVERY_D1",
  "sourceBookmark": "00000000-0000-0000-0000-000000000000",
  "restoredBookmark": "11111111-1111-1111-1111-111111111111",
  "snapshotId": "snapshot-2026-08-19",
  "rpoHours": 1,
  "rtoMinutes": 42,
  "validations": {
    "rowCountsVerified": true,
    "foreignKeysVerified": true,
    "tenantOwnershipVerified": true,
    "objectManifestVerified": true,
    "sampledPrivateObjectsVerified": true,
    "healthCheckPassed": true
  },
  "tenantAttackSuite": {
    "command": "node --test tests/cross-tenant-attacks.test.mjs",
    "exitCode": 0,
    "completedAt": "2026-08-19T08:39:00.000Z",
    "outputRef": "d1-restore-tenant-attacks.txt"
  },
  "approval": {
    "recoveryOwner": "Recovery Owner",
    "dataOwner": "Data Owner",
    "decision": "accepted"
  }
}
```

Local evidence references are resolved relative to the JSON file and must stay inside the same evidence bundle directory.
