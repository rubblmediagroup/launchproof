import { describe, expect, it } from 'vitest';
import { compareReports, type AnalysisReport } from '@launchproof/core';

function report(
  id: string,
  outcome: 'PASS' | 'FAIL',
  state: 'SUPPORTED' | 'FAILED',
  score: number,
): AnalysisReport {
  return {
    id,
    provenance: {
      repository: 'r',
      branch: 'b',
      commit: id,
      analyzedAt: 'x',
      launchProofVersion: '0.2.0',
      policyVersion: '1',
    },
    evidence: [
      {
        id: `ev_${id.padEnd(16, '0').slice(0, 16)}`,
        kind: id === 'a' ? 'x' : 'y',
        certainty: 'DETECTED',
        title: 'x',
        description: 'x',
        analyzer: { id: 'x', version: '1' },
        provenance: {
          repository: 'r',
          branch: 'b',
          commit: id,
          analyzedAt: 'x',
          launchProofVersion: '0.2.0',
          policyVersion: '1',
        },
        data: {},
      },
    ],
    findings: [],
    graph: { nodes: [], edges: [] },
    controls: [
      {
        control: {
          id: 'LP-03',
          title: 'Authorization',
          domain: 'security',
          description: '',
          version: '0.1',
        },
        outcome,
        evidenceIds: [],
        findingIds: [],
        rationale: '',
      },
    ],
    assuranceCases: [
      { id: 'AC', claim: 'c', state, controlIds: ['LP-03'], evidenceIds: [], rationale: [] },
    ],
    release: {
      score,
      status: outcome === 'FAIL' ? 'BLOCKED' : 'READY',
      domainScores: [],
      blockers: [],
      conditions: [],
      explanation: [],
    },
    limitations: [],
  };
}

describe('before/after comparison', () => {
  it('reports changed controls, assurance cases and evidence kinds', () => {
    const diff = compareReports(
      report('a', 'PASS', 'SUPPORTED', 90),
      report('b', 'FAIL', 'FAILED', 50),
    );
    expect(diff.changedControls).toHaveLength(1);
    expect(diff.changedAssuranceCases).toHaveLength(1);
    expect(diff.addedEvidenceKinds).toEqual(['y']);
    expect(diff.removedEvidenceKinds).toEqual(['x']);
  });
});
