import fs from 'node:fs';
import path from 'node:path';

const source = new URL('../src/lib/en.json', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(source, 'utf8'));
for (const [key, value] of Object.entries(catalog)) {
  if (!key || typeof value !== 'string' || !value.trim()) throw new Error('Invalid translation: ' + key);
}
if (process.env.BACKEND_REPO_DIR) {
  const destination = path.join(path.resolve(process.env.BACKEND_REPO_DIR), 'internal', 'api', 'en.json');
  if (!fs.existsSync(path.dirname(destination))) throw new Error('BACKEND_REPO_DIR must point to a backend checkout.');
  fs.copyFileSync(source, destination);
  console.log('Validated translations and synchronized the backend catalog.');
} else {
  console.log('Validated translations. Set BACKEND_REPO_DIR to synchronize a backend checkout.');
}
