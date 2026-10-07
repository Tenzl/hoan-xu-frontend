import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../../src/lib/legacy-orders.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { parseLegacyOrders, legacyOrderExample } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const now = Date.parse("2026-10-07T00:00:00+07:00");
test("JSON sample is valid, totals Xu, and normalizes optional notes", () => {
  const p = parseLegacyOrders(legacyOrderExample, now); assert.equal(p.issues.length, 0); assert.equal(p.total, 20000); assert.equal(p.orders.length, 2);
});
test("invalid dates, missing zones, fractions, extra fields and batch bounds identify errors", () => {
  const good = JSON.parse(legacyOrderExample)[0];
  for (const [field, value] of [["cashback", 0], ["cashback", 1.1], ["cashback", "12"], ["orderedAt", "2026-10-01T12:00:00"], ["orderedAt", "2026-02-30T12:00:00+07:00"], ["orderedAt", "2099-01-01T00:00:00Z"], ["productName", " "], ["note", null], ["note", "x".repeat(501)], ["userId", "other"]]) {
    const p = parseLegacyOrders(JSON.stringify([good, { ...good, [field]: value }]), now); assert.ok(p.issues.some(i => i.index === 2 && i.field === field), `${field}: ${value}`);
  }
  for (const value of ["{", "{}", "[]", JSON.stringify(Array(101).fill(good))]) assert.ok(parseLegacyOrders(value, now).issues.length);
  assert.equal(parseLegacyOrders(JSON.stringify(Array(100).fill(good)), now).issues.length, 0);
});
