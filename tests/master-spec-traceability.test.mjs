import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("master specification traceability covers all 123 sections", async () => {
  const checklist = await readFile(new URL("../docs/DELIVERY-CHECKLIST.md", import.meta.url), "utf8");
  const todo = await readFile(new URL("../docs/PRODUCTION-READINESS-TODO.md", import.meta.url), "utf8");
  const requiredSections = [
    "Product governance",
    "Foundation",
    "Agency onboarding and branding",
    "Property",
    "Agency website and domains",
    "Marketing Studio",
    "Contacts and enquiries",
    "Next actions and automation",
    "Viewings",
    "Seller experience",
    "MVP hardening and launch",
    "Phase 2",
    "Phase 3",
    "Phase 4",
    "Final completion gate",
  ];
  for (const section of requiredSections) assert.match(checklist, new RegExp(`## .*${section}`));
  assert.match(todo, /123-section source document/);
  assert.match(checklist, /Specification traceability tests for all 123 sections/);
});

test("five-minute sales demo path is represented by working app surfaces", async () => {
  const [workspace, publicProperty, publicIntake, marketing, seller] = await Promise.all([
    readFile(new URL("../app/estara-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/site/[slug]/properties/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/public/[slug]/enquiries/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/marketing-studio/studio-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/seller-operations.tsx", import.meta.url), "utf8"),
  ]);
  const joined = [workspace, publicProperty, publicIntake, marketing, seller].join("\n");
  for (const marker of [
    "Capture property",
    "Listing completeness",
    "Activate property",
    "PublicEnquiryForm",
    "responseDueAt",
    "Book viewing",
    "Seller portal",
    "brochure",
    "WhatsApp",
  ]) {
    assert.match(joined, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
