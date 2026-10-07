import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../../src/lib/shopee-input.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { normalizeShopeeInput, isShopeeURL } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('app shares normalize to one reviewed HTTPS Shopee URL', () => {
  for (const url of ['https://vn.shp.ee/C1Q8E6JS', 'https://s.shopee.vn/abc', 'https://shopee.vn/product/123/456']) {
    assert.equal(isShopeeURL(url), true);
    assert.deepEqual(normalizeShopeeInput(`Mua món này: ${url} 😍`), { url });
    assert.deepEqual(normalizeShopeeInput(`(${url}).`), { url });
  }
});
test('ambiguous or unsafe shares cannot become creation requests', () => {
  for (const url of ['https://vn.shp.ee.evil.invalid/abc', 'http://vn.shp.ee/abc', 'https://user@vn.shp.ee/abc', 'https://vn.shp.ee:443/abc', 'https://shope.ee/abc', 'https://127.0.0.1/abc']) assert.equal(isShopeeURL(url), false, url);
  assert.ok(normalizeShopeeInput('https://vn.shp.ee/a https://vn.shp.ee/b').error);
  assert.ok(normalizeShopeeInput('https://evil.invalid/a https://vn.shp.ee/b').error);
  assert.ok(normalizeShopeeInput('không có link').error);
  assert.ok(normalizeShopeeInput('https://vn.shp.ee/' + 'a'.repeat(2048)).error);
});
