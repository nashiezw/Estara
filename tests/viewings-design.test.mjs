import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [workspace, styles] = await Promise.all([
  readFile(new URL("../app/estara-app.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
]);

test("completed viewing feedback is structured, scannable and mobile safe", () => {
  assert.match(workspace, /className="viewing-feedback"/);
  assert.match(workspace, /className={`viewing-sentiment \${v\.interestLevel}`}/);
  assert.match(workspace, />Viewing feedback</);
  assert.match(styles, /\.viewing-feedback\{display:grid/);
  assert.match(styles, /\.viewing-sentiment\.not_interested/);
  assert.match(styles, /@media\(max-width:560px\)\{\.viewing-feedback/);
});
