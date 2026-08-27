import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { publicPropertyFacts, publicPropertySummaryItems } from "../db/public-property-display.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const base = {
  id: "p1",
  ref: "EST-101",
  title: "Sample listing",
  location: "Avondale, Harare",
  price: "USD 900",
  beds: 0,
  baths: 0,
  toilets: 0,
  parking: 0,
  garages: 0,
  photos: 1,
  size: "",
  buildingSize: "",
  transactionType: "Rent",
  propertyType: "House",
  description: "",
  features: [],
  heroMediaId: null,
  branchId: null,
  branchName: "",
  branchLocation: "",
  branchPhone: "",
  branchWhatsapp: "",
  branchEmail: "",
  branchAddress: "",
  branchOpeningHours: "",
  branchManagerUserId: null,
};

test("public property facts are conditional by listing type", () => {
  const room = { ...base, title: "Room to rent in Belvedere", propertyType: "Room", beds: 1, baths: 1, size: "2,000 sqm" };
  const roomFacts = publicPropertyFacts(room);
  assert.deepEqual(roomFacts.map((fact) => fact.label), ["Accommodation", "Rooms", "Bathrooms", "Listing type"]);
  assert.doesNotMatch(roomFacts.map((fact) => fact.label).join(" "), /Land size/);

  const stand = { ...base, transactionType: "Sale", propertyType: "Vacant stand", size: "1,200 sqm", beds: 4, baths: 2 };
  const standFacts = publicPropertyFacts(stand);
  assert.deepEqual(standFacts.map((fact) => fact.label), ["Land size", "Property type", "Listing type"]);
  assert.doesNotMatch(standFacts.map((fact) => fact.label).join(" "), /Bedrooms|Bathrooms/);

  const commercial = { ...base, propertyType: "Commercial office", buildingSize: "450 sqm", parking: 8 };
  assert.deepEqual(publicPropertyFacts(commercial).map((fact) => fact.label), ["Floor area", "Property type", "Parking", "Listing type"]);
});

test("public property detail uses the shared facts and real property copy", async () => {
  const [page, publicSite, publicData, seo] = await Promise.all([
    read("../app/site/[slug]/properties/[id]/page.tsx"),
    read("../app/site/[slug]/public-website.tsx"),
    read("../db/public-site.ts"),
    read("../db/public-seo.ts"),
  ]);

  assert.match(publicData, /p\.property_type AS propertyType/);
  assert.match(publicData, /p\.building_size AS buildingSize/);
  assert.match(publicData, /p\.toilets,p\.parking,p\.garages/);
  assert.match(publicData, /normalizePublicProperty/);
  assert.match(publicData, /features=Array\.isArray/);

  assert.match(page, /publicPropertyFacts\(property\)/);
  assert.match(page, /publicPropertySummaryItems\(property\)/);
  assert.match(page, /property\.description \|\| publicPropertyFallbackDescription/);
  assert.doesNotMatch(page, /<span>\{property\.beds\}<small>Bedrooms<\/small><\/span>/);
  assert.doesNotMatch(page, /\{property\.size \|\| "Ask"\}<small>Land size<\/small>/);
  assert.doesNotMatch(page, /A well-positioned opportunity/);

  assert.match(publicSite, /publicPropertyFacts\(property\)\.slice\(0, 3\)/);
  assert.match(publicSite, /\{property\.ref\} · \{property\.propertyType\}/);
  assert.match(seo, /publicPropertyFacts\(property\)\.slice\(0, 3\)/);
});

test("public property detail has mobile viewport repair rules", async () => {
  const css = await read("../app/public-templates.css");

  assert.match(css, /PUBLIC PROPERTY DETAIL MOBILE REPAIR/);
  assert.match(css, /\.public-property\{overflow-x:hidden\}/);
  assert.match(css, /@media\(max-width:920px\).*\.public-property[^{}]*\{[^}]*width:100%![\s\S]*overflow-x:hidden!important/);
  assert.match(css, /public-property-photo\{[^}]*aspect-ratio:4\/3!important/);
  assert.match(css, /public-property-summary\{[^}]*width:min\(100% - 32px,680px\)!important/);
  assert.match(css, /public-actions\{[^}]*grid-template-columns:1fr 1fr!important/);
  assert.match(css, /@media\(max-width:520px\).*position:sticky!important;bottom:0!important/s);
});

test("public property summaries combine facts, features and reference", () => {
  const property = { ...base, beds: 2, baths: 1, features: ["Borehole", "Solar backup"] };
  const items = publicPropertySummaryItems(property);
  assert.ok(items.includes("2 bedrooms"));
  assert.ok(items.includes("Borehole"));
  assert.ok(items.includes("Reference EST-101"));
});
