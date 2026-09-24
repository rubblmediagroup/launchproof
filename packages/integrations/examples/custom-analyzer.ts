import type { Analyzer } from '@launchproof/contracts';

/** Minimal community analyzer example: emits no claims until it has deterministic evidence. */
export const exampleAnalyzer: Analyzer = {
  id: 'example-community-analyzer',
  version: '0.1.0',
  analyze() {
    return { evidence: [], findings: [] };
  },
};
