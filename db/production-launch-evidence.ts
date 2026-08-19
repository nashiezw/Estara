import { PRODUCTION_PROVIDER_DECISIONS } from "./production-providers.ts";

export const REQUIRED_LAUNCH_JOURNEYS = [
  "landing-to-workspace",
  "onboarding",
  "property-capture",
  "public-site",
  "enquiry",
  "viewing",
  "seller",
  "billing",
  "admin",
  "recovery",
] as const;

export const REQUIRED_LAUNCH_EVIDENCE_GATES = [
  "deployment",
  "providers",
  "domainTls",
  "d1Restore",
  "penetrationTest",
  "publicAccessApproval",
  "billingSettlement",
  "lowData",
  "mobileAudit",
  "mvpApproval",
] as const;

type Evidence = Record<string, any>;
type ValidationOptions = {
  evidenceRoot?: string;
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

function validHttpsUrl(value: unknown) {
  try {
    return new URL(String(value)).protocol === "https:";
  } catch {
    return false;
  }
}

function requireTrue(errors: string[], path: string, value: unknown) {
  if (value !== true) errors.push(`${path} must be true.`);
}

function requireText(errors: string[], path: string, value: unknown) {
  if (!hasText(value)) errors.push(`${path} is required.`);
}

function isExternalRef(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function requireEvidenceRef(errors: string[], path: string, value: unknown, options: ValidationOptions) {
  requireText(errors, path, value);
  if (!hasText(value) || !options.fileExists) return;
  const text = String(value).trim();
  if (!isExternalRef(text) && !options.fileExists(text)) errors.push(`${path} must point to an existing evidence file or external URL.`);
}

export function validateProductionLaunchEvidence(evidence: Evidence, options: ValidationOptions = {}) {
  const errors: string[] = [];
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return ["Evidence must be a JSON object."];
  }

  if (!validHttpsUrl(evidence.productionUrl)) errors.push("productionUrl must be a valid HTTPS URL.");
  if (!validSha(evidence.commitSha)) errors.push("commitSha must be the deployed Git commit SHA.");
  if (!validDate(evidence.capturedAt)) errors.push("capturedAt must be an ISO-8601 timestamp.");

  const deployment = evidence.deployment || {};
  requireText(errors, "deployment.sitesProjectId", deployment.sitesProjectId);
  if (!validHttpsUrl(deployment.deploymentUrl)) errors.push("deployment.deploymentUrl must be a valid HTTPS URL.");
  if (deployment.commitSha !== evidence.commitSha) errors.push("deployment.commitSha must match top-level commitSha.");
  requireTrue(errors, "deployment.ready", deployment.ready);

  const providers = Array.isArray(evidence.providers) ? evidence.providers : [];
  for (const decision of PRODUCTION_PROVIDER_DECISIONS) {
    const provider = providers.find((row) => row?.area === decision.area);
    if (!provider) {
      errors.push(`providers must include ${decision.area}.`);
      continue;
    }
    requireTrue(errors, `providers.${decision.area}.configuredEnv`, provider.configuredEnv);
    requireTrue(errors, `providers.${decision.area}.healthReady`, provider.healthReady);
    requireTrue(errors, `providers.${decision.area}.smokeTestPassed`, provider.smokeTestPassed);
    if (!Array.isArray(provider.activationEvidenceRefs) || provider.activationEvidenceRefs.length < decision.activationEvidence.length) {
      errors.push(`providers.${decision.area}.activationEvidenceRefs must cover every required activation proof.`);
    } else {
      provider.activationEvidenceRefs.forEach((ref: unknown, index: number) =>
        requireEvidenceRef(errors, `providers.${decision.area}.activationEvidenceRefs.${index}`, ref, options)
      );
    }
  }

  const domainTls = evidence.domainTls || {};
  for (const field of ["domainAttached", "dnsVerified", "tlsActive", "unknownHostFailClosed", "publicRouteSmokeTestPassed"]) {
    requireTrue(errors, `domainTls.${field}`, domainTls[field]);
  }

  const d1Restore = evidence.d1Restore || {};
  requireTrue(errors, "d1Restore.isolatedEnvironment", d1Restore.isolatedEnvironment);
  requireTrue(errors, "d1Restore.timeTravelRestoreVerified", d1Restore.timeTravelRestoreVerified);
  requireTrue(errors, "d1Restore.tenantAttackSuitePassed", d1Restore.tenantAttackSuitePassed);
  requireEvidenceRef(errors, "d1Restore.evidenceRef", d1Restore.evidenceRef, options);

  const penetrationTest = evidence.penetrationTest || {};
  requireTrue(errors, "penetrationTest.independentTester", penetrationTest.independentTester);
  if (penetrationTest.launchBlockingFindingsOpen !== 0) errors.push("penetrationTest.launchBlockingFindingsOpen must be 0.");
  requireEvidenceRef(errors, "penetrationTest.reportRef", penetrationTest.reportRef, options);

  const publicAccessApproval = evidence.publicAccessApproval || {};
  requireText(errors, "publicAccessApproval.productOwner", publicAccessApproval.productOwner);
  if (!validDate(publicAccessApproval.approvedAt)) errors.push("publicAccessApproval.approvedAt must be an ISO-8601 timestamp.");
  if (publicAccessApproval.accessLevel !== "public") errors.push("publicAccessApproval.accessLevel must be public.");

  const billingSettlement = evidence.billingSettlement || {};
  for (const field of ["liveMode", "paidInvoiceVerified", "settlementReconciled", "refundVerified", "failedPaymentVerified"]) {
    requireTrue(errors, `billingSettlement.${field}`, billingSettlement[field]);
  }
  requireText(errors, "billingSettlement.financeSignoff", billingSettlement.financeSignoff);

  const lowData = evidence.lowData || {};
  requireTrue(errors, "lowData.verifierPassed", lowData.verifierPassed);
  requireEvidenceRef(errors, "lowData.evidenceFile", lowData.evidenceFile, options);

  const mobileAudit = evidence.mobileAudit || {};
  requireTrue(errors, "mobileAudit.androidPassed", mobileAudit.androidPassed);
  requireTrue(errors, "mobileAudit.iosPassed", mobileAudit.iosPassed);
  requireEvidenceRef(errors, "mobileAudit.auditRef", mobileAudit.auditRef, options);

  const mvpApproval = evidence.mvpApproval || {};
  requireText(errors, "mvpApproval.productOwner", mvpApproval.productOwner);
  if (!validDate(mvpApproval.approvedAt)) errors.push("mvpApproval.approvedAt must be an ISO-8601 timestamp.");
  const journeys = new Set(Array.isArray(mvpApproval.journeysApproved) ? mvpApproval.journeysApproved : []);
  for (const journey of REQUIRED_LAUNCH_JOURNEYS) {
    if (!journeys.has(journey)) errors.push(`mvpApproval.journeysApproved must include ${journey}.`);
  }

  return errors;
}
