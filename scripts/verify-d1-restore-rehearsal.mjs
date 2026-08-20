import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import {
  D1_RESTORE_REHEARSAL_ATTACK_COMMAND,
  REQUIRED_D1_RESTORE_VALIDATIONS,
  validateD1RestoreRehearsalEvidence,
} from "../db/d1-restore-rehearsal.ts";

const evidencePath = process.argv[2];

if (!evidencePath || evidencePath === "--help") {
  console.log("Usage: npm run d1:restore:verify -- docs/evidence/d1-restore-rehearsal.json");
  console.log(`Required restored-environment attack command: ${D1_RESTORE_REHEARSAL_ATTACK_COMMAND}`);
  console.log(`Required validations: ${REQUIRED_D1_RESTORE_VALIDATIONS.join(", ")}`);
  process.exit(evidencePath === "--help" ? 0 : 1);
}

let evidence;
try {
  evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
} catch (error) {
  console.error(`Could not read D1 restore rehearsal evidence JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const evidenceRoot = resolve(dirname(evidencePath));
const errors = validateD1RestoreRehearsalEvidence(evidence, {
  fileExists(ref) {
    const target = resolve(evidenceRoot, ref);
    const pathFromRoot = relative(evidenceRoot, target);
    return Boolean(pathFromRoot) && !pathFromRoot.startsWith("..") && !pathFromRoot.includes(":") && existsSync(target);
  },
});

if (errors.length) {
  console.error("D1 restore rehearsal evidence is incomplete:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("D1 restore rehearsal evidence passed.");
