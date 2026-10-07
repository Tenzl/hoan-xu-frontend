import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingTranslations } from '../../scripts/check-i18n.mjs';

test('finds Vietnamese literal calls but ignores dynamic content and non-translatable values', () => {
  assert.deepEqual(missingTranslations('t("Cần lý do"); t("Đã lưu"); t(row.name); t("GET");', { 'Đã lưu': 'Saved' }), ['Cần lý do']);
});
test('recognizes escaped literals, template literals, and translate calls', () => {
  assert.deepEqual(missingTranslations('translate("Cần lý do"); t(`Cần lý do`);', {}), ['Cần lý do']);
});
