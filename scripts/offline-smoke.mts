import path from 'node:path';
import { createRepositorySnapshot, TypeScriptNextAnalyzer } from '@launchproof/analyzers';
import { analyzeSnapshot, type LaunchProofPolicyShape } from '@launchproof/core';
const policy: LaunchProofPolicyShape = {
  version: 1,
  assurance: { requiredDomains: ['security', 'architecture', 'testing', 'production'] },
  security: { failOnSeverity: 'high', requireNoDetectedSecrets: true },
  tenancy: { required: true },
  testing: { requireTestFiles: true },
  production: { requireReleaseProvenance: true },
  releaseGates: { blockOnFailedAssuranceCase: true, blockOnCriticalFinding: true },
  ai: { dataPolicy: 'local-only' },
};
for (const name of ['production-reference', 'missing-tenant-authorization']) {
  const root = path.resolve('scenarios', name);
  const snap = await createRepositorySnapshot(root, {
    repository: name,
    branch: 'offline-smoke',
    commit: `fixture-${name}`,
  });
  const report = await analyzeSnapshot(snap, policy, [new TypeScriptNextAnalyzer()]);
  const tenant = report.assuranceCases.find((c) => c.id === 'AC-TENANT-001');
  console.log(
    JSON.stringify(
      {
        scenario: name,
        status: report.release.status,
        score: report.release.score,
        evidence: report.evidence.length,
        nodes: report.graph.nodes.length,
        tenant: tenant?.state,
        blockers: report.release.blockers,
      },
      null,
      2,
    ),
  );
  if (name === 'production-reference' && tenant?.state !== 'SUPPORTED') process.exitCode = 10;
  if (name === 'missing-tenant-authorization' && report.release.status !== 'BLOCKED')
    process.exitCode = 11;
}
