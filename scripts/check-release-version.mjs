import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const rootPackage = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const expected = rootPackage.version;
const problems = [];

async function packageFiles(dir) {
  const out = [];
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    out.push(path.join(dir, entry.name, 'package.json'));
  }
  return out;
}

for (const file of [...(await packageFiles('apps')), ...(await packageFiles('packages'))]) {
  const pkg = JSON.parse(await readFile(path.join(root, file), 'utf8'));
  if (pkg.version !== expected) problems.push(`${file}: version ${pkg.version} != ${expected}`);
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const [name, version] of Object.entries(pkg[field] ?? {})) {
      if (name.startsWith('@launchproof/') && version !== expected) {
        problems.push(`${file}: ${field} ${name}@${version} != ${expected}`);
      }
    }
  }
}

const tauri = JSON.parse(
  await readFile(path.join(root, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8'),
);
if (tauri.version !== expected)
  problems.push(`apps/desktop/src-tauri/tauri.conf.json: version ${tauri.version} != ${expected}`);

const cargo = await readFile(path.join(root, 'apps/desktop/src-tauri/Cargo.toml'), 'utf8');
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (cargoVersion !== expected)
  problems.push(
    `apps/desktop/src-tauri/Cargo.toml: version ${cargoVersion ?? 'missing'} != ${expected}`,
  );

const contracts = await readFile(path.join(root, 'packages/contracts/src/index.ts'), 'utf8');
if (!contracts.includes(`LAUNCHPROOF_VERSION = '${expected}'`))
  problems.push(
    'packages/contracts/src/index.ts: LAUNCHPROOF_VERSION does not match package version',
  );

if (problems.length) {
  console.error('LaunchProof release version consistency failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`LaunchProof version consistency OK: ${expected}`);
