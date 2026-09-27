import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("public positioning leads with agency outcomes instead of software categories", async () => {
  const [home, defaults, seo, messageHouse] = await Promise.all([
    read("../app/page.tsx"),
    read("../db/platform-defaults.ts"),
    read("../db/public-seo.ts"),
    read("../docs/POSITIONING-MESSAGE-HOUSE.md"),
  ]);
  assert.match(home, /gives your agency its own front door/);
  for (const pillar of ["Own your agency brand", "Nothing goes cold", "One property, zero retyping"]) assert.match(home, new RegExp(pillar));
  const publicPitch = [home.match(/<section className="home-hero"[\s\S]*?<\/section>/)?.[0] || "", defaults, seo].join("\n");
  assert.doesNotMatch(publicPitch, /real estate operating system|\bCRM\b|\bSaaS\b/i);
  assert.match(defaults, /agency website, property marketing and follow-up/);
  assert.match(messageHouse, /Thirty-second introduction/);
  assert.match(messageHouse, /Five-minute demo narrative/);
  assert.match(messageHouse, /Do not publish a customer quote/);
});

test("pilot distribution artifacts make listening, selection and proof consent explicit", async () => {
  const [listening, plan, proof] = await Promise.all([
    read("../docs/AGENCY-LISTENING-TOUR.md"),
    read("../docs/PILOT-OPERATING-PLAN.md"),
    read("../docs/PILOT-PROOF-PACK.md"),
  ]);
  assert.match(listening, /five conversations/i);
  assert.match(listening, /exact problem phrases/i);
  assert.match(listening, /Do not ask whether they "like" ESTARA/);
  assert.match(plan, /Score each willing agency from 0-2/);
  assert.match(plan, /Select for committed behavior and measurable workflow/);
  assert.match(proof, /raw counts beside every percentage/i);
  assert.match(proof, /approves the final text and every identifiable asset in writing/i);
});
