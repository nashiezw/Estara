const baseUrl = String(process.env.ESTARA_LOCAL_PREVIEW_URL || "http://localhost:3004").replace(/\/+$/, "");

const checks = [
  { path: "/api/workspace", status: 200, includes: ["Prime Property", "Borrowdale Residence"] },
  { path: "/api/settings", status: 200, includes: ["Prime Property", "prime-property"] },
  { path: "/workspace", status: 200, includes: ["Prime Property", "Properties"] },
  { path: "/site/prime-property", status: 200, includes: ["Prime Property", "Borrowdale Residence", "WhatsApp"] },
  { path: "/site/prime-property/properties", status: 200, includes: ["Prime Property", "Borrowdale Residence", "Properties"] },
  { path: "/site/prime-property/about", status: 200, includes: ["Prime Property", "Borrowdale Residence"] },
  { path: "/site/prime-property/contact", status: 200, includes: ["Prime Property", "WhatsApp"] },
];

async function verify(check) {
  const url = `${baseUrl}${check.path}`;
  const response = await fetch(url);
  const body = await response.text();
  const missing = check.includes.filter((text) => !body.includes(text));
  if (response.status !== check.status || missing.length) {
    throw new Error(`${check.path} expected ${check.status} with ${check.includes.join(", ")}; got ${response.status}${missing.length ? `, missing ${missing.join(", ")}` : ""}`);
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
