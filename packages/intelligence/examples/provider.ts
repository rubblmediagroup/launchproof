import type { IntelligenceProvider } from '@launchproof/contracts';

/** Community provider example. Providers explain existing artifacts; they never mutate controls. */
export const exampleProvider: IntelligenceProvider = {
  id: 'community-local-example',
  local: true,
  async generate(input) {
    return { text: `Evidence count: ${input.evidence.length}`, referencedEvidenceIds: [] };
  },
};
