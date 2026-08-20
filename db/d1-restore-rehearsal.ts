export const REQUIRED_D1_RESTORE_VALIDATIONS = [
  "rowCountsVerified",
  "foreignKeysVerified",
  "tenantOwnershipVerified",
  "objectManifestVerified",
  "sampledPrivateObjectsVerified",
  "healthCheckPassed",
] as const;

export const D1_RESTORE_REHEARSAL_ATTACK_COMMAND = "node --test tests/cross-tenant-attacks.test.mjs";

type Evidence = Record<string, any>;
type ValidationOptions = {
  fileExists?: (path: string) => boolean;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function validDate(value: unknown) {
  return hasText(value) && !Number.isNaN(Date.parse(String(value)));
}

function validSha(value: unknown) {
  return hasText(value) && /^[0-9a-f]{7,40}$/i.test(String(value));
}

function requireText(errors: string[], path: string, value: unknown) {
  if (!hasText(value)) errors.push(`${path} is required.`);
}

function requireTrue(errors: string[], path: string, value: unknown) {
  if (value !== true) errors.push(`${path} must be true.`);
}

function requireDate(errors: string[], path: string, value: unknown) {
  if (!validDate(value)) errors.push(`${path} must be an ISO-8601 timestamp.`);
}

function requireEvidenceRef(errors: string[], path: string, value: unknown, options: ValidationOptions) {
  requireText(errors, path, value);
  if (!hasText(value) || !options.fileExists) return;
  if (!options.fileExists(String(value).trim())) errors.push(`${path} must point to an existing evidence file inside the rehearsal bundle.`);
}

export function validateD1RestoreRehearsalEvidence(evidence: Evidence, options: ValidationOptions = {}) {
  const errors: string[] = [];
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return ["Evidence must be a JSON object."];
  }

  requireText(errors, "rehearsalId", evidence.rehearsalId);
  requireDate(errors, "startedAt", evidence.startedAt);
  requireDate(errors, "completedAt", evidence.completedAt);
  if (!validSha(evidence.appRevision)) errors.push("appRevision must be the tested Git commit SHA.");
  requireTrue(errors, "isolatedEnvironment", evidence.isolatedEnvironment);
  if (evidence.productionBackendVersion !== "production") errors.push("productionBackendVersion must be production.");
  if (evidence.restoreTarget === "production") errors.push("restoreTarget must not be production.");
  requireText(errors, "restoreTarget", evidence.restoreTarget);
  requireText(errors, "sourceDatabase", evidence.sourceDatabase);
  requireText(errors, "restoredDatabaseBinding", evidence.restoredDatabaseBinding);
  requireText(errors, "sourceBookmark", evidence.sourceBookmark);
  requireText(errors, "restoredBookmark", evidence.restoredBookmark);
  requireText(errors, "snapshotId", evidence.snapshotId);

  if (typeof evidence.rpoHours !== "number" || evidence.rpoHours > 24) errors.push("rpoHours must be a number no greater than the 24 hour MVP target.");
  if (typeof evidence.rtoMinutes !== "number" || evidence.rtoMinutes > 240) errors.push("rtoMinutes must be a number no greater than the 4 hour MVP target.");

  const validations = evidence.validations || {};
  for (const validation of REQUIRED_D1_RESTORE_VALIDATIONS) {
    requireTrue(errors, `validations.${validation}`, validations[validation]);
  }

  const tenantAttackSuite = evidence.tenantAttackSuite || {};
  if (tenantAttackSuite.command !== D1_RESTORE_REHEARSAL_ATTACK_COMMAND) {
    errors.push(`tenantAttackSuite.command must be ${D1_RESTORE_REHEARSAL_ATTACK_COMMAND}.`);
  }
  if (tenantAttackSuite.exitCode !== 0) errors.push("tenantAttackSuite.exitCode must be 0.");
  requireDate(errors, "tenantAttackSuite.completedAt", tenantAttackSuite.completedAt);
  requireEvidenceRef(errors, "tenantAttackSuite.outputRef", tenantAttackSuite.outputRef, options);

  const approval = evidence.approval || {};
  requireText(errors, "approval.recoveryOwner", approval.recoveryOwner);
  requireText(errors, "approval.dataOwner", approval.dataOwner);
  if (approval.decision !== "accepted") errors.push("approval.decision must be accepted.");

  return errors;
}
