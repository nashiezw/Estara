import { readFileSync } from "node:fs";

const includeAll = process.argv.includes("--all");
const files = ["docs/PRODUCTION-READINESS-TODO.md", "docs/DELIVERY-CHECKLIST.md"];
const launchTerms = /launch|production|provider|public|payment|domain|subdomain|TLS|restore|rehearsal|penetration|mobile|notification|approval/i;

function rowsFor(file) {
  let section = "";
  return readFileSync(file, "utf8").split(/\r?\n/).flatMap((line, index) => {
    const heading = /^##\s+(.+)/.exec(line);
    if (heading) section = heading[1].trim();
    const text = line.trim();
    return /^- \[( |-|x)\]/.test(text) ? [{ file, line: index + 1, section, text }] : [];
  });
}

const rows = files.flatMap(rowsFor);
const unfinished = rows.filter((row) => /^\- \[( |-)\]/.test(row.text));
const completed = rows.filter((row) => row.text.startsWith("- [x]"));
const publicLaunchRows = unfinished.filter((row) =>
  row.section === "Must Complete Before Public Launch" ||
  (row.file.endsWith("DELIVERY-CHECKLIST.md") && launchTerms.test(row.text) && !/^(11\.|12\.|13\.)/.test(row.section))
);
const rowsToReport = includeAll ? unfinished : publicLaunchRows;

console.log(`Launch readiness: ${completed.length} complete, ${unfinished.filter((row) => row.text.startsWith("- [-]")).length} partial, ${unfinished.filter((row) => row.text.startsWith("- [ ]")).length} open checklist rows.`);
if (rowsToReport.length) {
  console.log(includeAll ? "\nAll unfinished rows:" : "\nPublic-launch blocking rows:");
  for (const row of rowsToReport) console.log(`- ${row.file}:${row.line} [${row.section}] ${row.text}`);
}

if (rowsToReport.length) {
  console.error(includeAll ? "\nNot ready for full roadmap completion. Resolve every unfinished row first." : "\nNot ready for public production launch. Resolve every public-launch gate first.");
  process.exitCode = 1;
}
