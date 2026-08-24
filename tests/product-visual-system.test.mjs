import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("homepage, auth, guided onboarding and workspace share the product visual system", async () => {
  const [css, authCss, authShell, workspace, readiness] = await Promise.all([
    read("../app/globals.css"),
    read("../app/auth.css"),
    read("../app/auth-shell.tsx"),
    read("../app/estara-app.tsx"),
    read("../docs/PRODUCTION_READINESS.md"),
  ]);

  for (const selector of [".estara-home", ".guided-onboarding", ".shell"]) {
    assert.match(css, new RegExp(selector.replace(".", "\\.")), `${selector} should be bound to shared product styling`);
  }
  assert.match(authCss, /\.auth-shell/);
  for (const selector of ["home-hero h1", "guided-step h1", "heading h1"]) {
    assert.match(css, new RegExp(selector), `${selector} should share product heading treatment`);
  }
  assert.match(authCss, /auth-brand h1/);
  for (const selector of ["home-command", "guided-card", "panel"]) {
    assert.match(css, new RegExp(selector), `${selector} should share product surface treatment`);
  }
  assert.match(authCss, /auth-card/);
  assert.match(authShell, /auth-shell/);
  assert.match(workspace, /GuidedOnboarding/);
  assert.match(workspace, /className=\{`shell typography-\$\{brand\.typography\}/);
  assert.match(readiness, /visual system foundation now unifies homepage, auth, guided onboarding and workspace shell/);
});

test("shared action buttons keep readable padding and copy spacing", async () => {
  const [css, managementCss] = await Promise.all([
    read("../app/globals.css"),
    read("../app/management/management.css"),
  ]);

  assert.match(css, /padding-block:max\(10px,\s*\.72em\)/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, />:where\(p,small,span,div\)\+:where\(button,a\.pm-primary,a\.pm-secondary/);
  assert.match(managementCss, /\.pm-panel>p\{margin:0 0 16px/);
  assert.match(managementCss, /\.pm-panel>\.pm-primary,\.pm-panel>\.pm-secondary\{width:max-content/);
});
