import { describe, expect, it } from 'vitest';
import { evaluateControls } from '@launchproof/assurance';
import { defaultPolicy } from '@launchproof/policies';

describe('Build Standard evaluation', () => {
  it('always returns exactly LP-01 through LP-20', () => {
    const controls = evaluateControls([], [], { nodes: [], edges: [] }, defaultPolicy);
    expect(controls).toHaveLength(20);
    expect(controls.map((item) => item.control.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => `LP-${String(i + 1).padStart(2, '0')}`),
    );
  });
  it('does not silently pass missing evidence', () => {
    const controls = evaluateControls([], [], { nodes: [], edges: [] }, defaultPolicy);
    expect(
      controls.filter((item) => item.outcome === 'PASS').map((item) => item.control.id),
    ).toEqual(['LP-18', 'LP-19']);
    expect(controls.find((item) => item.control.id === 'LP-06')?.outcome).toBe('UNKNOWN');
    expect(controls.find((item) => item.control.id === 'LP-03')?.outcome).toBe('UNKNOWN');
  });
});
