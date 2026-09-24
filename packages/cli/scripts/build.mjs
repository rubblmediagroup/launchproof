import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const fromHere = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const dist = fromHere('../dist/');
await rm(dist, { recursive: true, force: true });

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  legalComments: 'external',
  logLevel: 'info',
};

await build({
  ...common,
  entryPoints: [fromHere('../src/bin.ts')],
  outfile: fromHere('../dist/bin.js'),
  banner: { js: '#!/usr/bin/env node' },
});
