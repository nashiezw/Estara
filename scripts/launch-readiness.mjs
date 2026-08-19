import { readFileSync } from "node:fs";

const files = ["docs/PRODUCTION-READINESS-TODO.md", "docs/DELIVERY-CHECKLIST.md"];
const rows = files.flatMap((file) =>
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line, index) => ({ file, line: index + 1, text: line.trim() }))
    .filter((row) => /^- \[( |-|x)\]/.test(row.text))
);

const open = rows.filter((row) => row.text.startsWith("- [ ]"));
const partial = rows.filter((row) => row.text.startsWith("- [-]"));
const completed = rows.filter((row) => row.text.startsWith("- [x]"));
const blockers = rows.filter((row) => /^\- \[( |-)\]/.test(row.text) && /launch|production|provider|public|payment|TLS|restore|rehearsal|penetration|mobile|approval|WhatsApp/i.test(row.text));

console.log(`Launch readiness: ${completed.length} complete, ${partial.length} partial, ${open.length} open checklist rows.`);
if (blockers.length) {
  console.log("\nLaunch-blocking rows:");
  for (const row of blockers) console.log(`- ${row.file}:${row.line} ${row.text}`);
}

if (open.length || partial.length) {
  console.error("\nNot ready for public production launch. Resolve every open and partial gate first.");
  process.exitCode = 1;
}
