import { describe, expect, it } from 'vitest';
import { enforceAIDataPolicy, validateProviderEndpoint } from '@launchproof/intelligence';
import { policySchema } from '@launchproof/policies';
const input: any = {
  evidence: [],
  findings: [],
  graph: { nodes: [], edges: [] },
  assuranceCases: [],
  prompt: 'x',
  sourceExcerpts: [{ path: 'secret.ts', content: 'sensitive' }],
};
describe('AI data governance', () => {
  it('denies external providers under local-only', () => {
    const policy = policySchema.parse({ version: 1, ai: { dataPolicy: 'local-only' } });
    expect(() =>
      enforceAIDataPolicy(input, policy, {
        id: 'external',
        local: false,
        generate: async () => ({ text: '', referencedEvidenceIds: [] }),
      }),
    ).toThrow(/local-only/);
  });
  it('strips source excerpts under evidence-only', () => {
    const policy = policySchema.parse({ version: 1, ai: { dataPolicy: 'evidence-only' } });
    const out = enforceAIDataPolicy(input, policy, {
      id: 'external',
      local: false,
      generate: async () => ({ text: '', referencedEvidenceIds: [] }),
    });
    expect(out.sourceExcerpts).toBeUndefined();
  });
});

describe('AI endpoint security', () => {
  it('requires HTTPS for external providers by default', () => {
    expect(() => validateProviderEndpoint('http://example.com/v1', { local: false })).toThrow(
      /HTTPS/,
    );
  });
  it('blocks obvious private and loopback targets for external providers', () => {
    expect(() => validateProviderEndpoint('https://127.0.0.1/v1', { local: false })).toThrow(
      /private\/loopback/,
    );
    expect(() =>
      validateProviderEndpoint('https://metadata.google.internal/', { local: false }),
    ).toThrow(/private\/loopback/);
  });
  it('allows loopback HTTP for explicitly local providers', () => {
    expect(validateProviderEndpoint('http://127.0.0.1:11434/v1', { local: true }).hostname).toBe(
      '127.0.0.1',
    );
  });
  it('rejects credentials embedded in endpoint URLs', () => {
    expect(() =>
      validateProviderEndpoint('https://user:pass@example.com/v1', { local: false }),
    ).toThrow(/embedded credentials/);
  });
});
