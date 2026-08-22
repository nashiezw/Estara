import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const privateTools = [
  "app/audit/audit-client.tsx",
  "app/backups/backups-client.tsx",
  "app/branches/branches-client.tsx",
  "app/contacts/contacts-client.tsx",
  "app/documents/documents-client.tsx",
  "app/pipeline/pipeline-client.tsx",
  "app/search/search-client.tsx",
];

test("private workspace tools return to the workspace, not the public homepage", async () => {
  const offenders = [];
  for (const file of privateTools) {
    const source = await readFile(file, "utf8");
    assert.match(source, /href="\/workspace"/, `${file} should link back to workspace`);
    if (/Back to workspace|Workspace/.test(source) && /href="\/"/.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});
