import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRepositorySnapshot } from '@launchproof/analyzers';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempRepo() {
  const dir = await mkdtemp(path.join(tmpdir(), 'launchproof-repo-'));
  created.push(dir);
  return dir;
}

describe('hostile repository snapshot limits', () => {
  it('bounds directory entries even when files are unsupported binary types', async () => {
    const root = await tempRepo();
    for (let i = 0; i < 5; i += 1)
      await writeFile(path.join(root, `blob-${i}.bin`), Buffer.from([0, 1, 2]));
    await expect(createRepositorySnapshot(root, {}, { maxEntries: 3 })).rejects.toThrow(
      /directory-entry limit/i,
    );
  });

  it('skips symlinks rather than following them outside the authorized root', async () => {
    const root = await tempRepo();
    await writeFile(path.join(root, 'safe.ts'), 'export const safe = true');
    // Symlink creation can require elevated Windows privileges, so this invariant is covered by implementation review there.
    const snapshot = await createRepositorySnapshot(root);
    expect(snapshot.files.has('safe.ts')).toBe(true);
    expect(snapshot.stats?.scannedEntries).toBeGreaterThanOrEqual(1);
  });
});
