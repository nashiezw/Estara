import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("seller deliveries use structured responsive ledger rows", async () => {
  const [operations, styles, route] = await Promise.all([
    read("../app/seller-operations.tsx"),
    read("../app/globals.css"),
    read("../app/api/seller-management/route.ts"),
  ]);
  assert.match(operations, /className="seller-delivery-row"/);
  assert.match(operations, /className="seller-delivery-copy"/);
  assert.match(operations, /seller-delivery-status/);
  assert.match(operations, /deliveryLabel\(delivery\.channel\)/);
  assert.match(operations, /delivery\.reportPeriodStart/);
  assert.match(operations, /delivery\.sentAt \|\| delivery\.createdAt/);
  assert.match(route, /r\.period_start reportPeriodStart,r\.period_end reportPeriodEnd/);
  assert.match(route, /LEFT JOIN seller_reports r ON r\.id=d\.report_id AND r\.agency_id=d\.agency_id/);
  assert.match(styles, /\.seller-delivery-row\{display:grid/);
  assert.match(styles, /\.seller-delivery-copy \.seller-delivery-meta/);
  assert.match(styles, /\.seller-delivery-copy small\{[^}]*overflow-wrap:anywhere/);
  assert.match(styles, /@media\(max-width:560px\)\{\.seller-delivery-row/);
});
