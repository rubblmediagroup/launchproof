import { describe, expect, it } from 'vitest';
import { calculateReleaseDecision } from '@launchproof/scoring';
import { defaultPolicy } from '@launchproof/policies';
import { getControl } from '@launchproof/standards';
describe('hard gates', () => {
  it('critical finding overrides a high numeric control average', () => {
    const controls = ['LP-01', 'LP-02', 'LP-03', 'LP-04', 'LP-06'].map((id) => ({
      control: getControl(id),
      outcome: 'PASS' as const,
      evidenceIds: [],
      findingIds: [],
      rationale: 'ok',
    }));
    const finding: any = {
      id: 'f',
      ruleId: 'X',
      title: 'critical',
      domain: 'security',
      severity: 'critical',
      confidence: 1,
      status: 'open',
      evidenceIds: [],
      affectedComponents: [],
      graphPaths: [],
      explanation: '',
      impact: '',
      remediation: '',
      analyzer: { id: 'x', version: '1' },
    };
    expect(calculateReleaseDecision(controls, [], [finding], defaultPolicy).status).toBe('BLOCKED');
  });
});
