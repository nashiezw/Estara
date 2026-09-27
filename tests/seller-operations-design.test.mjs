import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("seller deliveries use structured responsive ledger rows", async () => {
  const [operations, styles] = await Promise.all([
    read("../app/seller-operations.tsx"),
    read("../app/globals.css"),
  ]);
  assert.match(operations, /className="seller-delivery-row"/);
  assert.match(operations, /className="seller-delivery-copy"/);
  assert.match(operations, /seller-delivery-status/);
  assert.match(operations, /deliveryLabel\(delivery\.channel\)/);
  assert.match(styles, /\.seller-delivery-row\{display:grid/);
  assert.match(styles, /\.seller-delivery-copy small\{[^}]*overflow-wrap:anywhere/);
  assert.match(styles, /@media\(max-width:560px\)\{\.seller-delivery-row/);
});
