import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("workspace is private while demo is intentional and public", async () => {
  const [workspace, demo, error, home] = await Promise.all([
    read("app/workspace/page.tsx"),
    read("app/demo/page.tsx"),
    read("app/error.tsx"),
    read("app/page.tsx"),
  ]);
  assert.match(workspace, /requireChatGPTUser\("\/workspace"\)/);
  assert.match(demo, /sample data only/i);
  assert.match(demo, /Start your real workspace/);
  assert.doesNotMatch(error, /href="\/workspace"/);
  assert.match(error, /href="\/login"/);
  assert.match(home, /href="\/demo"/);
});

test("marketing studio supports editable design workflow and durable renders", async () => {
  const [client, route, renderer] = await Promise.all([
    read("app/marketing-studio/studio-client.tsx"),
    read("app/api/marketing/route.ts"),
    read("db/marketing-render.ts"),
  ]);
  for (const marker of [
    "designOptions",
    "Save edits",
    "Approve copy",
    "Download",
    "Share",
    "navigator.share",
    "Render approved outputs",
  ]) assert.match(client, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(route, /update_copy/);
  assert.match(route, /photoUrl/);
  assert.match(route, /design/);
  assert.match(renderer, /design==="bold"/);
  assert.match(renderer, /<image href/);
});
