import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../src/lib/shopee-share.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { shopeeShareURL, shopeeRedirectURL } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('share links use the current web origin and preserve the affiliate code', () => {
  assert.equal(shopeeShareURL('https://s.shopee.vn/70KiDYrZuK', 'https://payback.vn'), 'https://payback.vn/shopee/70KiDYrZuK');
  assert.equal(shopeeShareURL('https://s.shopee.vn/aBc123', 'http://localhost:3000'), 'http://localhost:3000/shopee/aBc123');
});

test('nonstandard affiliate URLs stay intact, including tracking parameters', () => {
  for (const url of ['https://s.shopee.vn/abc?tracking=1', 'https://s.shopee.vn/abc#tracking', 'https://vn.shp.ee/abc', 'https://shopee.vn/product/1/2', 'http://s.shopee.vn/abc', 'https://s.shopee.vn/ab-c', 'https://s.shopee.vn/abc/', 'https://s.shopee.vn.evil.invalid/abc', 'https://user@s.shopee.vn/abc', 'https://s.shopee.vn:443/abc', 'https://s.shopee.vn/%61bc']) {
    assert.equal(shopeeShareURL(url, 'https://payback.vn'), url);
  }
});

test('redirects use only the fixed Shopee host and reject malformed paths', () => {
  assert.equal(shopeeRedirectURL('/shopee/70KiDYrZuK'), 'https://s.shopee.vn/70KiDYrZuK');
  for (const path of ['/shopee', '/shopee/', '/shopee/a/b', '/shopee/a-b', '/shopee/%2Fevil', '/shopee/https://evil.invalid', '/shopee/a\n', '/shopee//evil.invalid', '/shopee/abc/', '/shopee/abc?url=https://evil.invalid']) {
    assert.equal(shopeeRedirectURL(path), null, path);
  }
});
