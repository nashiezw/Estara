import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("contact, branch and seller clients refresh from current server state", async () => {
  const [contacts, branches, seller, workspace] = await Promise.all([
    read("../app/contacts/contacts-client.tsx"),
    read("../app/branches/branches-client.tsx"),
    read("../app/seller-operations.tsx"),
    read("../app/estara-app.tsx"),
  ]);

  assert.match(contacts, /const load = useCallback\(async \(id: string\)/);
  assert.match(contacts, /useEffect\(\(\) => \{ if \(selected\) load\(selected\); \}, \[load, selected\]\)/);
  assert.match(branches, /\[branchProperties, mode, selected\]/);
  assert.match(branches, /aria-label=\{`Assign \$\{property\.title\} to \$\{selected\.name\}`\}/);
  assert.match(seller, /const load = useCallback/);
  assert.match(seller, /\[load, notify\]/);
  assert.match(workspace, /const notify=useCallback/);
  assert.match(workspace, /const loadWorkspace=useCallback/);
});

test("branch selection is keyboard operable", async () => {
  const branches = await read("../app/branches/branches-client.tsx");
  assert.match(branches, /<button type="button" className="branch-card-select" aria-pressed=/);
  assert.match(branches, /onClick=\{\(\) => setSelectedId\(branch\.id\)\}/);
});

test("property capture defaults new mandates and preserves existing mandate values", async () => {
  const workspace = await read("../app/estara-app.tsx");
  assert.match(workspace, /mandateType:source\.mandateType\|\|"Open"/);
  assert.match(workspace, /mandateExpiresAt:property\?source\.mandateExpiresAt\|\|"":future\(\)/);
});

test("marketing editor effects track current canvas and upload identities", async () => {
  const studio = await read("../app/marketing-studio/studio-client.tsx");
  assert.match(studio, /\[docHeight, docWidth\]/);
  assert.match(studio, /\}, \[agencyId, uploadKey\]\)/);
  assert.match(studio, /\}, \[activeCopy\]\)/);
  assert.match(studio, /const initializeDocument = useEffectEvent/);
  assert.match(studio, /const onStudioKey = useEffectEvent/);
  assert.match(studio, /window\.addEventListener\("keydown", onKey\)/);
  assert.doesNotMatch(studio, /selectedIds\.join/);
});

test("platform admin public previews cannot control the opener tab", async () => {
  const admin = await read("../app/admin/platform-admin-client.tsx");
  assert.match(admin, /target="_blank" rel="noreferrer">View public site/);
});

test("team refresh and viewing dismissal remain stable and keyboard accessible", async () => {
  const workspace = await read("../app/estara-app.tsx");
  assert.match(workspace, /const load=useCallback\(\(\)=>fetch\("\/api\/team\/invitations"/);
  assert.match(workspace, /catch\(\(\)=>notify\("Team could not be loaded\."\)\),\[notify\]\);useEffect\(\(\)=>\{load\(\)\},\[load\]\)/);
  assert.match(workspace, /function ViewingModal[\s\S]*?className="backdrop" role="button" tabIndex=\{0\} onKeyDown=\{e=>e\.key==="Escape"&&close\(\)\}/);
});

test("billing receipt entry does not steal focus when expanded", async () => {
  const admin = await read("../app/admin/platform-admin-client.tsx");
  assert.doesNotMatch(admin, /autoFocus/);
  assert.doesNotMatch(admin, /showPageStrip/);
});

test("custom-domain DNS controls are keyboard and label accessible", async () => {
  const domains = await read("../app/domains/domains-client.tsx");
  assert.match(domains, /button type="button" className="copyable" aria-label="Copy TXT record name"/);
  assert.match(domains, /button type="button" className="copyable" aria-label="Copy CNAME target"/);
  assert.match(domains, /htmlFor=\{`observed-txt-\$\{id\}`\}/);
  assert.match(domains, /id=\{`observed-cname-\$\{id\}`\}/);
});
