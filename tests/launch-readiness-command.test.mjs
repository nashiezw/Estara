import assert from"node:assert/strict";
import{spawnSync}from"node:child_process";
import{readFile}from"node:fs/promises";
import test from"node:test";

test("launch readiness command fails while checklist launch gates remain open",async()=>{
  const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
  assert.equal(pkg.scripts["launch:readiness"],"node scripts/launch-readiness.mjs");
  const result=spawnSync(process.execPath,["scripts/launch-readiness.mjs"],{cwd:new URL("..",import.meta.url),encoding:"utf8"});
  assert.notEqual(result.status,0);
  assert.match(result.stdout,/Launch readiness:/);
  assert.match(result.stdout,/Public-launch blocking rows:/);
  assert.match(result.stdout,/PRODUCTION-READINESS-TODO\.md/);
  assert.doesNotMatch(result.stdout,/React Native\/Expo mobile app/);
  assert.match(result.stderr,/Not ready for public production launch/);

  const all=spawnSync(process.execPath,["scripts/launch-readiness.mjs","--all"],{cwd:new URL("..",import.meta.url),encoding:"utf8"});
  assert.notEqual(all.status,0);
  assert.match(all.stdout,/All unfinished rows:/);
  assert.match(all.stdout,/React Native\/Expo mobile app/);
  assert.match(all.stderr,/Not ready for full roadmap completion/);
});
