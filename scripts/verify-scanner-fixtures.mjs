import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outDir = resolve('.launchproof', 'scanner-fixture-verification');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const report = join(outDir, 'scanner-report.json');

const npm = process.platform === 'win32'
  ? { command: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', 'npm.cmd'] }
  : { command: 'npm', args: [] };

const args = [
  ...npm.args,
  'run', 'cli', '--',
  'analyze', 'scenarios/production-reference',
  '--scanner', 'semgrep-json:tests/fixtures/scanners/semgrep.json',
  '--scanner', 'gitleaks-json:tests/fixtures/scanners/gitleaks.json',
  '--scanner', 'osv-json:tests/fixtures/scanners/osv.json',
  '--scanner', 'trivy-json:tests/fixtures/scanners/trivy.json',
  '--json', report,
];

const result = spawnSync(npm.command, args, {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
  env: process.env,
});
if (result.error) throw result.error;
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);

const node = spawnSync(process.execPath, ['scripts/check-scanner-report.mjs', report], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
if (node.error) throw node.error;
process.exit(node.status ?? 1);
