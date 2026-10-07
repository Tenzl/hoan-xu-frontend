import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] || 'e2e';
if (!['e2e', 'csp-development', 'csp-production', 'csp'].includes(mode)) throw new Error('Unknown browser test mode');
if (mode === 'csp') {
  for (const runtime of ['csp-development', 'csp-production']) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), runtime], { cwd: root, stdio: 'inherit', env: process.env });
    if (result.status !== 0) process.exit(result.status || 1);
  }
  process.exit(0);
}
const run = `${mode}-${Date.now()}-${process.pid}`;
const runDir = path.join(root, 'tests/results', run);
const workspace = path.join(runDir, 'workspace');
fs.mkdirSync(workspace, { recursive: true });
for (const name of ['src', 'public', 'package.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts']) {
  const source = path.join(root, name);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(workspace, name), { recursive: true });
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
const server = net.createServer();
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const development = mode === 'csp-development';
const env = { ...process.env, NEXT_DIST_DIR: '.next', E2E_WORKSPACE: workspace, E2E_OUTPUT_DIR: path.join(runDir, 'artifacts'), E2E_PORT: String(port), CSP_RUNTIME: mode.startsWith('csp-') ? (development ? 'development' : 'production') : '' };
if (!development) {
  const build = spawnSync(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build'], { cwd: workspace, env, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status || 1);
}
const test = spawnSync(process.execPath, [path.join(root, 'node_modules/@playwright/test/cli.js'), 'test', '--config', path.join(root, mode === 'e2e' ? 'tests/playwright.config.ts' : 'tests/csp.config.ts'), ...process.argv.slice(3)], { cwd: root, env, stdio: 'inherit' });
console.log(`Browser test artifacts: ${runDir}`);
process.exit(test.status || (test.error ? 1 : 0));
