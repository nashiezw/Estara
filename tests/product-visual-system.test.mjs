import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("homepage, auth, guided onboarding and workspace share the product visual system", async () => {
  const [css, authShell, workspace, readiness] = await Promise.all([
    read("../app/globals.css"),
    read("../app/auth-shell.tsx"),
    read("../app/estara-app.tsx"),
    read("../docs/PRODUCTION_READINESS.md"),
  ]);

  assert.match(css, /ESTARA product visual system/);
  for (const token of [
    "--estara-ink",
    "--estara-paper",
    "--estara-forest",
    "--estara-gold",
    "--estara-radius",
    "--estara-card-shadow",
    "--estara-heading",
  ]) {
    assert.match(css, new RegExp(token), `${token} should be part of the shared visual foundation`);
  }

  for (const selector of [".estara-home", ".auth-shell", ".guided-onboarding", ".shell"]) {
    assert.match(css, new RegExp(selector.replace(".", "\\.")), `${selector} should be bound to shared product styling`);
  }

  assert.match(css, /home-hero h1[\s\S]*auth-brand h1[\s\S]*guided-step h1[\s\S]*heading h1/);
  assert.match(css, /home-command[\s\S]*auth-card[\s\S]*guided-card[\s\S]*panel/);
  assert.match(authShell, /auth-shell/);
  assert.match(workspace, /GuidedOnboarding/);
  assert.match(workspace, /className=\{`shell typography-\$\{brand\.typography\}/);
  assert.match(readiness, /visual system foundation now unifies homepage, auth, guided onboarding and workspace shell/);
});
