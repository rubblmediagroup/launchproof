import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createRepositorySnapshot, TypeScriptNextAnalyzer } from '@launchproof/analyzers';
import { analyzeSnapshot } from '@launchproof/core';
import { loadPolicy } from '@launchproof/policies';
async function report(name: string) {
  const root = path.resolve('scenarios', name);
  return analyzeSnapshot(
    await createRepositorySnapshot(root, {
      repository: name,
      branch: 'test',
      commit: `test-${name}`,
    }),
    await loadPolicy(path.join(root, '.launchproof.yml')),
    [new TypeScriptNextAnalyzer()],
  );
}
describe('real deterministic scenario analysis', () => {
  it('discovers architecture and supports tenant assurance in reference scenario', async () => {
    const r = await report('production-reference');
    expect(r.evidence.some((e) => e.kind === 'architecture.route')).toBe(true);
    expect(r.evidence.some((e) => e.kind === 'security.rls-policy')).toBe(true);
    expect(r.evidence.some((e) => e.kind === 'security.secret-scan-complete')).toBe(true);
    expect(r.assuranceCases.find((c) => c.id === 'AC-TENANT-001')?.state).toBe('SUPPORTED');
    expect(r.release.status).not.toBe('BLOCKED');
  });
  it('blocks the controlled missing-authorization regression', async () => {
    const r = await report('missing-tenant-authorization');
    expect(r.assuranceCases.find((c) => c.id === 'AC-TENANT-001')?.state).toBe('PARTIAL');
    expect(r.release.status).toBe('BLOCKED');
    expect(r.release.blockers.some((b) => b.includes('tenant-isolation'))).toBe(true);
  });
});
