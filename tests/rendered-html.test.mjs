import assert from "node:assert/strict";
import test from "node:test";
import { withWorkerRuntime } from "./helpers/worker-runtime.mjs";

test("server-renders the ESTARA landing and public auth entry points", () => withWorkerRuntime(async runtime => {
  const headers = { accept: "text/html", "x-forwarded-host": "estara.co.zw" };
  const [landing, login] = await Promise.all([
    runtime.dispatchFetch("https://estara.co.zw/", { headers }),
    runtime.dispatchFetch("https://estara.co.zw/login", { headers }),
  ]);
  for (const response of [landing, login]) {
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  }
  const landingHtml = await landing.text();
  const loginHtml = await login.text();
  assert.match(landingHtml, /<title>ESTARA/);
  assert.match(landingHtml, /gives your agency its own front door/i);
  assert.match(landingHtml, /Nothing goes cold/i);
  assert.match(landingHtml, /Zimbabwe-first/);
  assert.match(landingHtml, /Start your agency setup/);
  assert.match(loginHtml, /Secure login/);
  assert.match(loginHtml, /Email/);
  assert.match(loginHtml, /Password/);
  assert.doesNotMatch(landingHtml + loginHtml, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
}));
