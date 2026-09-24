import path from 'node:path';
import { DockerEphemeralRunner } from '../packages/integrations/src/index.ts';

const image = process.argv[2] ?? process.env.RUNNER_IMAGE;
if (!image || !/^sha256:[a-f0-9]{64}$/i.test(image)) {
  console.error('A Docker image ID pinned as sha256:<64 hex> is required.');
  process.exit(3);
}

const root = path.resolve('scenarios/production-reference');
const runner = new DockerEphemeralRunner({
  allowedImages: [image],
  requirePinnedImage: true,
  memoryMb: 256,
  cpus: 0.5,
  pidsLimit: 64,
});
const result = await runner.execute({
  snapshot: {
    root,
    repository: 'production-reference',
    branch: 'working-tree',
    commit: 'WORKTREE',
    files: new Map<string, string>(),
  },
  command: 'node',
  args: ['-e', "process.stdout.write('launchproof-isolated-ok')"],
  purpose: 'Release-candidate isolated runner proof',
  timeoutMs: 15_000,
  network: 'none',
  image,
  authorizationToken: 'release-candidate-explicit-authorization',
});

if (result.exitCode !== 0 || result.timedOut || result.stdout !== 'launchproof-isolated-ok') {
  console.error(JSON.stringify(result, null, 2));
  process.exit(2);
}
console.log(
  `PASS: isolated runner completed with network=none using pinned image ${image.slice(0, 20)}…`,
);
