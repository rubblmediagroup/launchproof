import type {
  AssuranceCase,
  AssuranceDomain,
  ControlResult,
  DomainScore,
  Finding,
  LaunchProofPolicyShape,
  ReleaseDecision,
  Severity,
} from '@launchproof/contracts';

const outcomeScore = { PASS: 100, PARTIAL: 55, UNKNOWN: 0, FAIL: 0 } as const;
const severityRank: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
const casePenalty: Record<AssuranceCase['state'], number> = {
  VERIFIED: 0,
  SUPPORTED: 2,
  PARTIAL: 8,
  UNKNOWN: 10,
  UNSUPPORTED: 15,
  FAILED: 25,
};

function weightedControlAverage(controls: ControlResult[]): { score: number; coverage: number } {
  const totalWeight = controls.reduce((sum, item) => sum + (item.control.weight ?? 1), 0);
  const evaluatedWeight = controls
    .filter((item) => item.outcome !== 'UNKNOWN')
    .reduce((sum, item) => sum + (item.control.weight ?? 1), 0);
  const weighted = controls.reduce(
    (sum, item) => sum + outcomeScore[item.outcome] * (item.control.weight ?? 1),
    0,
  );
  return {
    score: totalWeight ? Math.round(weighted / totalWeight) : 0,
    coverage: totalWeight ? Math.round((evaluatedWeight / totalWeight) * 100) : 0,
  };
}

export function calculateReleaseDecision(
  controls: ControlResult[],
  cases: AssuranceCase[],
  findings: Finding[],
  policy: LaunchProofPolicyShape,
): ReleaseDecision {
  const domains = [...new Set(controls.map((item) => item.control.domain))] as AssuranceDomain[];
  const domainScores: DomainScore[] = domains.map((domain) => {
    const scoped = controls.filter((item) => item.control.domain === domain);
    const weighted = weightedControlAverage(scoped);
    return { domain, score: weighted.score, coverage: weighted.coverage };
  });
  const overall = weightedControlAverage(controls);
  const blockers: string[] = [];
  const conditions: string[] = [];

  if (
    policy.releaseGates.blockOnCriticalFinding &&
    findings.some((item) => item.status === 'open' && item.severity === 'critical')
  )
    blockers.push('Open critical finding.');
  const threshold = severityRank[policy.security.failOnSeverity];
  if (findings.some((item) => item.status === 'open' && severityRank[item.severity] >= threshold))
    blockers.push(
      `Open finding meets policy failure threshold (${policy.security.failOnSeverity}).`,
    );
  if (
    policy.security.requireNoDetectedSecrets &&
    findings.some((item) => item.ruleId === 'LP-06' && item.status === 'open')
  )
    blockers.push('Detected secret exposure violates policy.');
  if (
    policy.security.requireAuthorizationForProtectedRoutes &&
    controls.find((item) => item.control.id === 'LP-03')?.outcome === 'FAIL'
  )
    blockers.push('Authorization control failed for a detected protected/mutation path.');
  if (
    policy.security.requireRateLimitForPublicMutation &&
    controls.find((item) => item.control.id === 'LP-11')?.outcome === 'FAIL'
  )
    blockers.push('Required abuse resistance is missing on a mutation path.');

  if (policy.tenancy.required) {
    const tenant = cases.find((item) => item.id === 'AC-TENANT-001');
    if (!tenant || !['SUPPORTED', 'VERIFIED'].includes(tenant.state))
      blockers.push('Required tenant-isolation assurance is not sufficiently supported.');
    else if (tenant.state !== 'VERIFIED')
      conditions.push('Tenant isolation is supported but not runtime-verified.');
  }
  if (
    policy.releaseGates.blockOnFailedAssuranceCase &&
    cases.some((item) => item.state === 'FAILED')
  )
    blockers.push('One or more Assurance Cases failed.');

  if (policy.testing.requireTestFiles) {
    const test = controls.find((item) => item.control.id === 'LP-12');
    if (!test || test.outcome === 'UNKNOWN')
      blockers.push('Policy requires test files but none were discovered.');
  }
  if (
    policy.testing.requireVerifiedTests &&
    cases.find((item) => item.id === 'AC-TESTS-001')?.state !== 'VERIFIED'
  )
    blockers.push('Policy requires tests to be deterministically verified in an isolated runner.');
  if (
    policy.production.requireSecurityHeaders &&
    !controls.find((item) => item.control.id === 'LP-13')?.evidenceIds.length
  )
    conditions.push('Required production security-header evidence is incomplete.');
  if (
    policy.production.requireObservability &&
    !['PASS', 'PARTIAL'].includes(
      controls.find((item) => item.control.id === 'LP-14')?.outcome ?? 'UNKNOWN',
    )
  )
    blockers.push('Policy requires production observability evidence.');

  for (const domain of policy.assurance.requiredDomains) {
    const score = domainScores.find((item) => item.domain === domain);
    if (!score || score.coverage === 0)
      blockers.push(`Required domain ${domain} has no evaluated control coverage.`);
    else if (score.coverage < (policy.releaseGates.minimumCoverage ?? 50))
      conditions.push(
        `Required domain ${domain} coverage (${score.coverage}%) is below policy target (${policy.releaseGates.minimumCoverage ?? 50}%).`,
      );
  }

  const assurancePenalty = Math.min(
    25,
    Math.round(
      cases.reduce((sum, item) => sum + casePenalty[item.state], 0) / Math.max(cases.length, 1),
    ),
  );
  const severityPenalty = findings
    .filter((item) => item.status === 'open')
    .reduce((sum, item) => sum + [0, 1, 3, 7, 15][severityRank[item.severity]]!, 0);
  const score = Math.max(
    0,
    Math.min(100, overall.score - assurancePenalty - Math.min(20, severityPenalty)),
  );
  const minimumScore = policy.releaseGates.minimumScore ?? 80;
  const minimumCoverage = policy.releaseGates.minimumCoverage ?? 50;
  if (overall.coverage < minimumCoverage)
    conditions.push(
      `Overall evidence/control coverage (${overall.coverage}%) is below policy target (${minimumCoverage}%).`,
    );

  let status: ReleaseDecision['status'];
  if (blockers.length) status = 'BLOCKED';
  else if (overall.coverage === 0) status = 'INCOMPLETE';
  else if (score >= minimumScore && overall.coverage >= minimumCoverage)
    status = conditions.length ? 'READY_WITH_CONDITIONS' : 'READY';
  else if (score >= Math.max(50, minimumScore - 20)) status = 'REVIEW_REQUIRED';
  else status = 'INCOMPLETE';

  return {
    score,
    status,
    domainScores,
    coverage: overall.coverage,
    blockers: [...new Set(blockers)],
    conditions: [...new Set(conditions)],
    explanation: [
      `Deterministic score derived from ${controls.length} versioned controls using control weights, evidence coverage, open-finding severity, and Assurance Case states.`,
      `Overall evaluated control coverage: ${overall.coverage}%. Assurance-state penalty: ${assurancePenalty}. Finding penalty: ${Math.min(20, severityPenalty)}.`,
      'UNKNOWN contributes zero rather than passing implicitly. Hard release gates override numeric averages.',
    ],
  };
}
