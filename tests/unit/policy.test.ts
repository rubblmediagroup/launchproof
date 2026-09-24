import { describe, expect, it } from 'vitest';
import { policySchema } from '@launchproof/policies';
describe('policy validation', () => {
  it('rejects unknown configuration keys', () => {
    expect(() => policySchema.parse({ version: 1, magic: true })).toThrow();
  });
  it('rejects an unknown AI data policy', () => {
    expect(() =>
      policySchema.parse({ version: 1, ai: { dataPolicy: 'send-everything' } }),
    ).toThrow();
  });
});

describe('verification policy hardening', () => {
  it('rejects duplicate verification command ids', () => {
    expect(() =>
      policySchema.parse({
        version: 1,
        verification: {
          enabled: true,
          commands: [
            { id: 'tests', command: 'npm', args: ['test'], purpose: 'tests' },
            {
              id: 'tests',
              command: 'npm',
              args: ['run', 'test:security'],
              purpose: 'security tests',
            },
          ],
        },
      }),
    ).toThrow(/duplicate verification command id/i);
  });
});
