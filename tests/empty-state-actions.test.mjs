import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("major blank states point users to a concrete next action", () => {
  const branches = read("app/branches/branches-client.tsx");
  const backups = read("app/backups/backups-client.tsx");
  const contacts = read("app/contacts/contacts-client.tsx");
  const integrations = read("app/integrations/integrations-client.tsx");
  const branchCss = read("app/branches/branches.css");
  const toolsCss = read("app/workspace-tools.css");
  const contactsCss = read("app/contacts/contacts.css");
  const managementCss = read("app/management/management.css");

  assert.match(branches, /Create the agency's first branch/);
  assert.match(branches, /href="#branch-create"/);
  assert.match(branches, /id="branch-create"/);
  assert.match(backups, /Create first verified snapshot/);
  assert.match(backups, /Create one now to prove encryption, integrity checks and recovery evidence before launch/);
  assert.match(contacts, /Every contact starts from real work/);
  assert.match(contacts, /Open capture tools/);
  assert.match(contacts, /Respond to an enquiry, book a viewing or send an approved seller update/);
  assert.match(integrations, /Create a pending bridge on the left/);
  assert.match(integrations, /Approve a connection first, then use Export now/);
  assert.match(branchCss, /\.branch-empty/);
  assert.match(toolsCss, /\.doc-empty/);
  assert.match(contactsCss, /\.contact-empty a/);
  assert.match(managementCss, /\.pm-empty strong/);
});
