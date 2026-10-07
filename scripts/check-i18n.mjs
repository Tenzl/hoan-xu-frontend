import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export function missingTranslations(source, catalog) {
  const missing = new Set();
  const file = ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['t', 'translate'].includes(node.expression.text)) {
      const value = node.arguments[0];
      if (value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) && /[À-ỹĐđ]/u.test(value.text) && !catalog[value.text]) missing.add(value.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...missing].sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/en.json'), 'utf8'));
  const errors = [];
  for (const file of fs.readdirSync(path.join(root, 'src'), { recursive: true })) {
    if (!/\.tsx?$/.test(file) || file.endsWith('.d.ts')) continue;
    for (const key of missingTranslations(fs.readFileSync(path.join(root, 'src', file), 'utf8'), catalog)) errors.push(`${file}: ${key}`);
  }
  if (errors.length) { console.error('Missing English translations:\n' + errors.join('\n')); process.exitCode = 1; }
  else console.log('All literal translation keys have English entries.');
}
