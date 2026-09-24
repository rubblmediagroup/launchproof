import { describe, expect, it } from 'vitest';
import { ApplicationGraphBuilder } from '@launchproof/graph';
describe('graph provenance', () => {
  it('refuses edges whose endpoints do not exist', () => {
    const b = new ApplicationGraphBuilder();
    expect(() =>
      b.addEdge({ id: 'e', from: 'a', to: 'b', type: 'CALLS', evidenceIds: ['ev1'] }),
    ).toThrow(/missing node/);
  });
});
