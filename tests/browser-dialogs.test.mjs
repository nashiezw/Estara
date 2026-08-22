import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

async function tsxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && path.endsWith(".tsx") ? [path] : [];
  }));
  return nested.flat();
}

test("app surfaces avoid browser modal dialogs for production actions", async () => {
  const files = await tsxFiles("app");
  const sources = await Promise.all(files.map(async file => [file, await readFile(file, "utf8")]));
  const offenders = sources.filter(([, source]) => /\b(prompt|confirm|alert)\(/.test(source)).map(([file]) => file);
  assert.deepEqual(offenders, []);
});

test("sensitive destructive actions use inline review panels", async () => {
  const [roles, developer, documents, workspace, admin] = await Promise.all([
    readFile("app/roles/roles-client.tsx", "utf8"),
    readFile("app/developer/developer-client.tsx", "utf8"),
    readFile("app/documents/documents-client.tsx", "utf8"),
    readFile("app/estara-app.tsx", "utf8"),
    readFile("app/admin/platform-admin-client.tsx", "utf8"),
  ]);
  assert.match(roles, /role-delete-review/);
  assert.match(developer, /credential-revoke-review/);
  assert.match(documents, /document-remove-review/);
  assert.match(workspace, /Close and keep draft/);
  assert.match(admin, /role="alert"/);
});
