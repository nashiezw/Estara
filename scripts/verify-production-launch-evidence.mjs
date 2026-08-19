import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import {
  REQUIRED_LAUNCH_EVIDENCE_GATES,
  validateProductionLaunchEvidence,
} from "../db/production-launch-evidence.ts";

const evidencePath = process.argv[2];

if (!evidencePath || evidencePath === "--help") {
  console.log("Usage: npm run launch:evidence -- docs/evidence/production-launch.json");
  console.log(`Required gates: ${REQUIRED_LAUNCH_EVIDENCE_GATES.join(", ")}`);
  process.exit(evidencePath === "--help" ? 0 : 1);
}

let evidence;
try {
  evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
} catch (error) {
  console.error(`Could not read production launch evidence JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const evidenceRoot = resolve(dirname(evidencePath));
const errors = validateProductionLaunchEvidence(evidence, {
  evidenceRoot,
  fileExists(ref) {
    const target = resolve(evidenceRoot, ref);
    const pathFromRoot = relative(evidenceRoot, target);
    return Boolean(pathFromRoot) && !pathFromRoot.startsWith("..") && !pathFromRoot.includes(":") && existsSync(target);
  },
});
if (errors.length) {
  console.error("Production launch evidence is incomplete:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production launch evidence passed.");
