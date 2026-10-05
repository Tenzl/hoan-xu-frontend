import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = new URL('../src/lib/en.json', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(source, 'utf8'));
for (const [key, value] of Object.entries(catalog)) {
  if (!key || typeof value !== 'string' || !value.trim()) throw new Error('Invalid translation: ' + key);
}
const backend = process.env.BACKEND_REPO_DIR
  ? path.resolve(process.env.BACKEND_REPO_DIR)
  : fileURLToPath(new URL('../../backend/', import.meta.url));
const destination = path.join(backend, 'internal', 'api', 'en.json');
if (process.env.BACKEND_REPO_DIR || fs.existsSync(destination)) {
  if (!fs.existsSync(path.dirname(destination))) throw new Error('BACKEND_REPO_DIR must point to a backend checkout.');
  fs.copyFileSync(source, destination);
  console.log('Validated translations and synchronized the backend catalog.');
} else {
  console.log('Validated translations. Set BACKEND_REPO_DIR to synchronize a backend checkout.');
}
