import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../../src/lib/invalidation.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { affectedQuery } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("notification writes refresh notification pages without refreshing product or wallet", () => {
  assert.equal(affectedQuery("/notification-read-batches", ["notification-popover", "customer"]), true);
  assert.equal(affectedQuery("/notifications/123", ["page", "/notifications?page=2", "customer"]), true);
  assert.equal(affectedQuery("/notifications/123", ["/product-checks", "customer", "url"]), false);
  assert.equal(affectedQuery("/notifications/123", ["/wallet"]), false);
});

test("financial writes refresh account history and ranking but retain product previews", () => {
  for (const key of [["/wallet"], ["page", "/me/purchases?status=pending"], ["leaderboards", "month"], ["my-leaderboard", "month"]]) {
    assert.equal(affectedQuery("/withdrawals", key), true);
  }
  assert.equal(affectedQuery("/withdrawals", ["/product-checks", "customer", "url"]), false);
  assert.equal(affectedQuery("/affiliate-links", ["page", "/me/purchases?page=2"]), true);
  assert.equal(affectedQuery("/affiliate-links", ["/notifications"]), false);
});
