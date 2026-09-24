import { describe, expect, it } from 'vitest';
import { ApplicationGraphBuilder, compareIntendedAndObservedArchitecture } from '@launchproof/graph';
describe('graph provenance', () => {
  it('refuses edges whose endpoints do not exist', () => {
    const b = new ApplicationGraphBuilder();
    expect(() =>
      b.addEdge({ id: 'e', from: 'a', to: 'b', type: 'CALLS', evidenceIds: ['ev1'] }),
    ).toThrow(/missing node/);
  });
});


describe('intended versus observed architecture', () => {
  it('classifies matched, unobserved and undeclared nodes deterministically', () => {
    const graph = {
      nodes: [
        { id: 'i1', type: 'Module' as const, label: 'Auth', evidenceIds: ['e1'], metadata: { intended: true } },
        { id: 'i2', type: 'Module' as const, label: 'Billing', evidenceIds: ['e2'], metadata: { intended: true } },
        { id: 'o1', type: 'Module' as const, label: 'Auth', evidenceIds: ['e3'], metadata: {} },
        { id: 'o2', type: 'Service' as const, label: 'Email', evidenceIds: ['e4'], metadata: {} },
      ],
      edges: [],
    };
    const diff = compareIntendedAndObservedArchitecture(graph);
    expect(diff.hasIntendedArchitecture).toBe(true);
    expect(diff.counts.MATCHED).toBe(1);
    expect(diff.counts.UNOBSERVED).toBe(1);
    expect(diff.counts.UNDECLARED).toBe(1);
    expect(diff.counts.UNKNOWN).toBe(0);
  });

  it('uses UNKNOWN when no intended architecture exists', () => {
    const graph = {
      nodes: [
        { id: 'o1', type: 'Route' as const, label: '/api', evidenceIds: ['e1'], metadata: {} },
      ],
      edges: [],
    };
    const diff = compareIntendedAndObservedArchitecture(graph);
    expect(diff.hasIntendedArchitecture).toBe(false);
    expect(diff.counts.UNKNOWN).toBe(1);
  });
});
