import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("mobile journey audit criteria document the remaining real-device gate", async () => {
  const doc = await read("../docs/MOBILE-JOURNEY-AUDIT.md");
  for (const phrase of [
    "Low-end Android phone",
    "iPhone",
    "Slow 3G",
    "Offline or interrupted network",
    "Landing page to private workspace",
    "Mobile property capture",
    "Public agency website",
    "Evidence To Record",
    "real-device execution",
  ]) {
    assert.match(doc, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("implemented mobile journeys expose the controls required by the audit", async () => {
  const [workspace, publicClient, reliability] = await Promise.all([
    read("../app/estara-app.tsx"),
    read("../app/site/[slug]/public-client.tsx"),
    read("../app/reliability.css"),
  ]);
  const all = `${workspace}\n${publicClient}\n${reliability}`;

  for (const [label, pattern] of [
    ["mobile workspace logo", /className="mobile-logo"/],
    ["mobile navigation", /className="mobile-nav"/],
    ["mobile overflow navigation", /className="mobile-more-menu"/],
    ["mobile settings access", /nav\.slice\(4\)\.map/],
    ["mobile add-property action", /className="fab"/],
    ["low-data toggle", /aria-label="Toggle low-data mode"/],
    ["pressed state for low-data", /aria-pressed=\{lowData\}/],
    ["camera capture", /capture="environment"/],
    ["cross-reload draft protection", /beforeunload/],
    ["persisted property draft", /estara-property-draft/],
    ["numeric mobile keyboard", /inputMode="numeric"/],
    ["decimal mobile keyboard", /inputMode="decimal"/],
    ["phone mobile keyboard", /inputMode="tel"/],
    ["public enquiry form", /PublicEnquiryForm/],
    ["public viewing request", /Request a viewing/],
    ["public retry alert", /role="alert"/],
    ["date-time mobile input", /type="datetime-local"/],
    ["keyboard focus styling", /:focus-visible/],
    ["reduced-motion styling", /prefers-reduced-motion/],
  ]) {
    assert.match(all, pattern, `missing ${label}`);
  }
});

test("delivery checklist keeps mobile audit status honest", async () => {
  const checklist = await read("../docs/DELIVERY-CHECKLIST.md");
  assert.match(
    checklist,
    /\[-\] Focus-visible, reduced-motion, labelled capture, mobile input improvements and mobile journey audit criteria complete; real Android\/iOS device audit pending/
  );
});
