const baseUrl = String(process.env.ESTARA_LOCAL_PREVIEW_URL || "http://localhost:3004").replace(/\/+$/, "");

const checks = [
  { path: "/api/workspace", status: 200, includes: ["Prime Property", "Borrowdale Residence"] },
  { path: "/api/settings", status: 200, includes: ["Prime Property", "prime-property"] },
  { path: "/workspace", status: 200, includes: ["Prime Property", "Properties"] },
  {
    path: "/site/prime-property",
    status: 200,
    includes: ["Prime Property", "Borrowdale Residence", "WhatsApp"],
    links: [
      "/site/prime-property/properties",
      "/site/prime-property/sale",
      "/site/prime-property/rent",
      "/site/prime-property/agents",
      "/site/prime-property/services",
      "/site/prime-property/about",
      "/site/prime-property/contact",
    ],
  },
  { path: "/site/prime-property/properties", status: 200, includes: ["Prime Property", "Borrowdale Residence", "Properties"] },
  { path: "/site/prime-property/sale", status: 200, includes: ["Prime Property", "Property for sale"] },
  { path: "/site/prime-property/rent", status: 200, includes: ["Prime Property", "Property to rent"] },
  { path: "/site/prime-property/agents", status: 200, includes: ["Prime Property", "Meet the agency"] },
  { path: "/site/prime-property/services", status: 200, includes: ["Prime Property", "Services"] },
  { path: "/site/prime-property/about", status: 200, includes: ["Prime Property", "Borrowdale Residence"] },
  { path: "/site/prime-property/contact", status: 200, includes: ["Prime Property", "WhatsApp"] },
];

async function verify(check) {
  const url = `${baseUrl}${check.path}`;
  const response = await fetch(url);
  const body = await response.text();
  const missing = check.includes.filter((text) => !body.includes(text));
  const missingLinks = (check.links || []).filter((href) => !body.includes(`href="${href}"`));
  if (response.status !== check.status || missing.length || missingLinks.length) {
    throw new Error(`${check.path} expected ${check.status} with ${check.includes.join(", ")}; got ${response.status}${missing.length ? `, missing ${missing.join(", ")}` : ""}${missingLinks.length ? `, missing links ${missingLinks.join(", ")}` : ""}`);
  }
  return `${check.path} ${response.status}`;
}

async function main() {
  const passed = [];
  for (const check of checks) {
    passed.push(await verify(check));
  }
  console.log(`Local preview smoke passed at ${baseUrl}`);
  for (const line of passed) console.log(`- ${line}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error("Run `npm run dev:migrate` first, then start `npm run dev -- --port 3004` before this smoke check.");
  process.exit(1);
});
