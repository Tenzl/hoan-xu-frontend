import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../../src/lib/invalidation.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { affectedQuery } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("batch orders and weekly prizes refresh the correct shared and private views", () => {
  for (const key of [["/wallet"],["leaderboards","week"],["/admin/users/id"],["page","/admin/users?kind=legacy"]]) assert.equal(affectedQuery("/admin/users/id/orders/batch",key),true);
  for (const key of [["/admin/gifts"],["/leaderboard-prizes/current"],["/me/leaderboard-awards","user"],["/admin/leaderboard-prizes/id/awards"],["notification-popover"]]) assert.equal(affectedQuery("/admin/leaderboard-awards/id/deliver",key),true);
  assert.equal(affectedQuery("/admin/leaderboard-prizes",["/product-checks"]),false);
});

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

test("legacy manual orders refresh wallets and rankings and renames refresh customer and order names", () => {
  const base = "/admin/users/customer";
  for (const key of [["/wallet"], ["page", `${base}/orders?page=1`], [base, "admin"], ["leaderboards", "all"], ["/admin/dashboard"]]) {
    assert.equal(affectedQuery(`${base}/orders`, key), true);
  }
  for (const key of [[base, "admin"], ["page", "/admin/users?kind=legacy"], ["page", "/admin/orders?page=1"], ["leaderboards", "all"]]) {
    assert.equal(affectedQuery(`${base}/name`, key), true);
  }
  assert.equal(affectedQuery(`${base}/orders`, ["/product-checks", "customer", "url"]), false);
});

test("admin changes refresh queues, audit and independent account views", () => {
  for (const path of ["/admin/orders/id/events", "/admin/withdrawals/id/events", "/admin/gifts/id"]) {
    assert.equal(affectedQuery(path, ["/admin/work-queues", "staff"]), true);
    assert.equal(affectedQuery(path, ["page", "/admin/audit-logs?page=1"]), true);
  }
  for (const action of ["permissions", "reset-password", "status"]) {
    const path = `/admin/internal-accounts/id/${action}`;
    for (const key of [["/me"], ["page", "/admin/internal-accounts?page=1"], ["/admin/audit-logs"]]) assert.equal(affectedQuery(path, key), true);
    assert.equal(affectedQuery(path, ["/product-checks"]), false);
  }
});
