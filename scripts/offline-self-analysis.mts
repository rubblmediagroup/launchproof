import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { createRepositorySnapshot, TypeScriptNextAnalyzer } from '@launchproof/analyzers';
import { analyzeSnapshot, type LaunchProofPolicyShape } from '@launchproof/core';

// Dependency-light mirror of the committed .launchproof.yml for environments
// where Zod/YAML cannot be installed. The canonical policy remains .launchproof.yml.
const policy: LaunchProofPolicyShape = {
  version: 1,
  analysis: { excludePaths: ['scenarios', '.offline-dist', '.offline-dist2', '.offline-runtime'] },
  assurance: { requiredDomains: ['security', 'architecture', 'testing', 'production'] },
  security: {
    failOnSeverity: 'high',
    requireNoDetectedSecrets: true,
    requireAuthorizationForProtectedRoutes: true,
    requireRateLimitForPublicMutation: false,
  },
  tenancy: { required: false, requireRls: false },
  testing: { requireTestFiles: true, requireVerifiedTests: false },
  production: {
    requireReleaseProvenance: true,
    requireSecurityHeaders: true,
    requireObservability: false,
  },
  releaseGates: {
    blockOnFailedAssuranceCase: true,
    blockOnCriticalFinding: true,
    minimumScore: 80,
    minimumCoverage: 50,
  },
  ai: { dataPolicy: 'local-only', allowedProviders: [] },
  verification: { enabled: false, commands: [] },
};

const root = path.resolve('.');
const snapshot = await createRepositorySnapshot(
  root,
  { repository: 'launchproof', branch: 'main', commit: 'WORKTREE' },
  { excludePaths: policy.analysis?.excludePaths ?? [] },
);
const report = await analyzeSnapshot(snapshot, policy, [new TypeScriptNextAnalyzer()]);
await mkdir(path.join(root, '.launchproof'), { recursive: true });
await writeFile(
  path.join(root, '.launchproof', 'self-report.json'),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    {
      status: report.release.status,
      score: report.release.score,
      coverage: report.release.coverage,
      evidence: report.evidence.length,
      findings: report.findings.length,
      nodes: report.graph.nodes.length,
      cases: report.assuranceCases.map((item) => ({ id: item.id, state: item.state })),
    },
    null,
    2,
  ),
);
if (report.findings.some((finding) => finding.severity === 'critical')) process.exitCode = 2;
