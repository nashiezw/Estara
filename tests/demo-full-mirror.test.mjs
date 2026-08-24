import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("demo route mirrors the platform workspace with safe local sample workflows", async () => {
  const [client, styles] = await Promise.all([
    readFile("app/demo/demo-client.tsx", "utf8"),
    readFile("app/demo/demo.css", "utf8"),
  ]);

  for (const marker of [
    "Demo Workspace - Sample Data",
    "Safe sample data only",
    "Reset demo data",
    "No production records, payments, emails or external writes",
    "freshDemo",
    "setModule",
    "navigator.clipboard",
    "transitionEnquiry",
    "bookViewing",
    "completeAction",
    "toggleIntegration",
    "Start your real workspace",
  ]) {
    assert.match(client, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const moduleLabel of [
    "Today",
    "Properties",
    "Enquiries",
    "Contacts",
    "Viewings",
    "Actions",
    "Marketing",
    "Seller portal",
    "Reports",
    "Website",
    "Team",
    "Branches",
    "Integrations",
    "Automations",
    "Subscription",
    "Settings",
  ]) {
    assert.match(client, new RegExp(`label: "${moduleLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }

  for (const realWorkspaceClass of [
    "shell demo-mirror-shell",
    "workspace-menu-open",
    "page",
    "heading",
    "panel",
    "money",
    "stats",
    "stat",
    "columns",
    "property-list",
    "detail",
    "lead",
    "module-links",
    "mobile-nav",
  ]) {
    assert.match(client, new RegExp(realWorkspaceClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(client, /fetch\(/);
  assert.doesNotMatch(client, /\/api\//);
  assert.match(styles, /demo-mirror-shell/);
  assert.match(styles, /@media\(max-width:900px\)/);
  assert.match(styles, /@media\(max-width:680px\)/);
});
