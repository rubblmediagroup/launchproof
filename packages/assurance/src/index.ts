import type {
  ApplicationGraph,
  AssuranceCase,
  ControlOutcome,
  ControlResult,
  Evidence,
  Finding,
  LaunchProofPolicyShape,
} from '@launchproof/contracts';
import { buildStandard } from '@launchproof/standards';

interface Facts {
  kinds: Set<string>;
  evidence: Evidence[];
  findings: Finding[];
  graph: ApplicationGraph;
}
const has = (facts: Facts, ...kinds: string[]) => kinds.every((kind) => facts.kinds.has(kind));
const any = (facts: Facts, ...kinds: string[]) => kinds.some((kind) => facts.kinds.has(kind));
const openFinding = (facts: Facts, controlId: string, severity?: Finding['severity']) =>
  facts.findings.some(
    (item) =>
      item.ruleId === controlId &&
      item.status === 'open' &&
      (!severity || item.severity === severity),
  );
const verified = (facts: Facts, id: string) =>
  facts.evidence.some(
    (item) =>
      item.certainty === 'VERIFIED' &&
      item.kind === `verification.${id}` &&
      typeof item.data === 'object' &&
      item.data !== null &&
      Number((item.data as any).exitCode) === 0,
  );

const controlEvidenceKinds: Record<string, string[]> = {
  'LP-01': ['security.input-validation'],
  'LP-02': ['security.authentication-indicator'],
  'LP-03': ['security.authorization-indicator'],
  'LP-04': [
    'security.tenant-scope',
    'security.rls-enabled',
    'security.rls-policy',
    'testing.security-test',
    'verification.tenant-isolation',
  ],
  'LP-05': ['security.authorization-indicator', 'security.rls-policy'],
  'LP-06': [
    'security.secret',
    'security.secret-scan-complete',
    'scanner.gitleaks',
    'scanner.trivy-secret',
    'configuration.environment-read',
  ],
  'LP-07': ['data.table-reference', 'data.supabase', 'scanner.semgrep'],
  'LP-08': ['repository.package-manifest', 'dependency.lockfile', 'scanner.osv', 'scanner.trivy'],
  'LP-09': ['quality.error-handling'],
  'LP-10': ['production.logging', 'production.observability'],
  'LP-11': ['security.rate-limit'],
  'LP-12': ['testing.test-file', 'testing.security-test', 'verification.tests'],
  'LP-13': [
    'production.next-config',
    'production.security-headers',
    'production.container-config',
    'production.ci-workflow',
  ],
  'LP-14': ['production.observability', 'production.logging', 'production.health-check'],
  'LP-15': ['accessibility.semantic-markup', 'verification.accessibility'],
  'LP-16': ['analysis.provenance', 'production.ci-workflow'],
  'LP-17': ['analysis.provenance'],
  'LP-18': ['analysis.provenance'],
  'LP-19': ['ai.provider-usage'],
  'LP-20': ['analysis.provenance', 'verification.authorization-missing'],
};

function result(
  id: string,
  outcome: ControlOutcome,
  evidence: Evidence[],
  findings: Finding[],
  rationale: string,
  coverage?: number,
): ControlResult {
  const control = buildStandard.find((item) => item.id === id);
  if (!control) throw new Error(`Missing control ${id}`);
  const relatedEvidence = evidence.filter((item) => controlEvidenceKinds[id]?.includes(item.kind));
  const relatedFindings = findings.filter((item) => item.ruleId === id);
  return {
    control,
    outcome,
    evidenceIds: relatedEvidence.map((item) => item.id),
    findingIds: relatedFindings.map((item) => item.id),
    rationale,
    ...(coverage !== undefined ? { coverage } : {}),
  };
}

export function evaluateControls(
  evidence: Evidence[],
  findings: Finding[],
  graph: ApplicationGraph,
  policy: LaunchProofPolicyShape,
): ControlResult[] {
  const facts: Facts = {
    kinds: new Set(evidence.map((item) => item.kind)),
    evidence,
    findings,
    graph,
  };
  return buildStandard.map((control) => {
    switch (control.id) {
      case 'LP-01':
        return result(
          control.id,
          has(facts, 'security.input-validation') ? 'PASS' : 'UNKNOWN',
          evidence,
          findings,
          has(facts, 'security.input-validation')
            ? 'Schema/input validation operations were detected.'
            : 'No supported trust-boundary validation evidence was detected.',
        );
      case 'LP-02':
        return result(
          control.id,
          has(facts, 'security.authentication-indicator') ? 'PASS' : 'UNKNOWN',
          evidence,
          findings,
          has(facts, 'security.authentication-indicator')
            ? 'Authentication boundaries were detected.'
            : 'Authentication coverage remains unknown.',
        );
      case 'LP-03': {
        const routes = graph.nodes.filter((node) => node.type === 'Route');
        const routeAuthz = new Set(
          graph.edges
            .filter(
              (edge) =>
                edge.type === 'AUTHORIZED_BY' && routes.some((route) => route.id === edge.from),
            )
            .map((edge) => edge.from),
        );
        const known = routes.length
          ? routeAuthz.size / routes.length
          : has(facts, 'security.authorization-indicator')
            ? 1
            : 0;
        const outcome: ControlOutcome = openFinding(facts, 'LP-03')
          ? 'FAIL'
          : known === 1 && known > 0
            ? 'PASS'
            : known > 0
              ? 'PARTIAL'
              : 'UNKNOWN';
        return result(
          control.id,
          outcome,
          evidence,
          findings,
          openFinding(facts, 'LP-03')
            ? 'At least one mutation route lacks a detected authorization boundary.'
            : known === 1 && known > 0
              ? 'Detected routes have authorization relationships.'
              : known > 0
                ? 'Authorization evidence covers only part of the detected route graph.'
                : 'Authorization coverage is unknown.',
          Math.round(known * 100),
        );
      }
      case 'LP-04': {
        const tenant = has(facts, 'security.tenant-scope');
        const rls = any(facts, 'security.rls-enabled', 'security.rls-policy');
        const runtime = verified(facts, 'tenant-isolation');
        const requiredRls = policy.tenancy.requireRls ?? policy.tenancy.required;
        const complete = tenant && (!requiredRls || rls);
        return result(
          control.id,
          runtime && complete ? 'PASS' : complete ? 'PASS' : tenant || rls ? 'PARTIAL' : 'UNKNOWN',
          evidence,
          findings,
          runtime
            ? 'Tenant isolation has supporting static evidence and a successful isolated deterministic verification.'
            : complete
              ? 'Tenant scoping and required database isolation evidence were detected; runtime verification remains separate.'
              : tenant || rls
                ? 'Only part of the tenant-isolation evidence chain was detected.'
                : 'Tenant isolation evidence was not detected.',
        );
      }
      case 'LP-05':
        return result(
          control.id,
          has(facts, 'security.authorization-indicator') &&
            any(facts, 'security.rls-policy', 'security.rls-enabled')
            ? 'PARTIAL'
            : has(facts, 'security.authorization-indicator')
              ? 'PARTIAL'
              : 'UNKNOWN',
          evidence,
          findings,
          'Least privilege cannot be fully proven statically; authorization/RLS evidence provides partial support.',
        );
      case 'LP-06': {
        const secretFinding = openFinding(facts, 'LP-06');
        return result(
          control.id,
          secretFinding ? 'FAIL' : has(facts, 'security.secret-scan-complete') ? 'PASS' : 'UNKNOWN',
          evidence,
          findings,
          secretFinding
            ? 'Potential secret exposure evidence is open.'
            : has(facts, 'security.secret-scan-complete')
              ? 'The built-in bounded secret-signature scan completed with no supported match; this is evidence of detector coverage, not proof of absence.'
              : 'No supported secret-scan completion evidence exists for this snapshot.',
        );
      }
      case 'LP-07':
        return result(
          control.id,
          any(facts, 'data.table-reference', 'data.supabase') && !openFinding(facts, 'LP-07')
            ? 'PARTIAL'
            : openFinding(facts, 'LP-07')
              ? 'FAIL'
              : 'UNKNOWN',
          evidence,
          findings,
          openFinding(facts, 'LP-07')
            ? 'Scanner evidence identifies an unsafe data-access pattern.'
            : any(facts, 'data.table-reference', 'data.supabase')
              ? 'Data access was mapped, but safe parameterization and scoping are not completely verified.'
              : 'No supported data-access evidence was detected.',
        );
      case 'LP-08': {
        const lock = has(facts, 'dependency.lockfile');
        const vuln = openFinding(facts, 'LP-08');
        const scanner = any(facts, 'scanner.osv', 'scanner.trivy');
        return result(
          control.id,
          vuln ? 'FAIL' : lock && scanner ? 'PASS' : lock ? 'PARTIAL' : 'UNKNOWN',
          evidence,
          findings,
          vuln
            ? 'Dependency scanner evidence contains an open vulnerability.'
            : lock && scanner
              ? 'A lockfile and normalized dependency scanner evidence are present.'
              : lock
                ? 'A lockfile is present; advisory scanning evidence was not supplied.'
                : 'Dependency integrity evidence is incomplete.',
        );
      }
      case 'LP-09':
        return result(
          control.id,
          has(facts, 'quality.error-handling') ? 'PARTIAL' : 'UNKNOWN',
          evidence,
          findings,
          has(facts, 'quality.error-handling')
            ? 'Explicit error handling was detected; disclosure safety requires deeper/runtime evidence.'
            : 'Error-safety evidence was not detected.',
        );
      case 'LP-10':
        return result(
          control.id,
          any(facts, 'production.logging', 'production.observability') ? 'PARTIAL' : 'UNKNOWN',
          evidence,
          findings,
          any(facts, 'production.logging', 'production.observability')
            ? 'Logging/observability evidence was detected; security event completeness is not verified.'
            : 'Auditability evidence was not detected.',
        );
      case 'LP-11':
        return result(
          control.id,
          openFinding(facts, 'LP-11')
            ? 'FAIL'
            : has(facts, 'security.rate-limit')
              ? 'PASS'
              : 'UNKNOWN',
          evidence,
          findings,
          openFinding(facts, 'LP-11')
            ? 'A mutation route lacks a detected abuse-control boundary.'
            : has(facts, 'security.rate-limit')
              ? 'Rate-limit evidence was detected.'
              : 'Abuse-resistance coverage is unknown.',
        );
      case 'LP-12': {
        const tests = has(facts, 'testing.test-file');
        const runtime = verified(facts, 'tests');
        return result(
          control.id,
          runtime ? 'PASS' : tests ? 'PARTIAL' : 'UNKNOWN',
          evidence,
          findings,
          runtime
            ? 'Tests completed successfully inside the configured isolated runner.'
            : tests
              ? 'Test files exist, but discovery alone does not prove they execute or pass.'
              : 'No test files were discovered.',
        );
      }
      case 'LP-13': {
        const signals = [
          'production.next-config',
          'production.security-headers',
          'production.container-config',
          'production.ci-workflow',
        ].filter((kind) => facts.kinds.has(kind));
        return result(
          control.id,
          signals.length >= 3 ? 'PASS' : signals.length ? 'PARTIAL' : 'UNKNOWN',
          evidence,
          findings,
          signals.length >= 3
            ? 'Multiple production-configuration evidence sources were detected.'
            : signals.length
              ? 'Some production configuration evidence is present.'
              : 'Production configuration evidence was not detected.',
          Math.min(100, signals.length * 25),
        );
      }
      case 'LP-14':
        return result(
          control.id,
          has(facts, 'production.observability') && has(facts, 'production.health-check')
            ? 'PASS'
            : any(
                  facts,
                  'production.observability',
                  'production.logging',
                  'production.health-check',
                )
              ? 'PARTIAL'
              : 'UNKNOWN',
          evidence,
          findings,
          has(facts, 'production.observability') && has(facts, 'production.health-check')
            ? 'Observability and health-check indicators were detected.'
            : any(
                  facts,
                  'production.observability',
                  'production.logging',
                  'production.health-check',
                )
              ? 'Some observability evidence was detected.'
              : 'Observability evidence was not detected.',
        );
      case 'LP-15':
        return result(
          control.id,
          verified(facts, 'accessibility')
            ? 'PASS'
            : has(facts, 'accessibility.semantic-markup')
              ? 'PARTIAL'
              : 'UNKNOWN',
          evidence,
          findings,
          verified(facts, 'accessibility')
            ? 'Accessibility checks completed successfully in the isolated runner.'
            : has(facts, 'accessibility.semantic-markup')
              ? 'Accessible markup indicators were detected, but browser-level accessibility verification has not run.'
              : 'Accessibility evidence was not detected.',
        );
      case 'LP-16':
        return result(
          control.id,
          has(facts, 'analysis.provenance') ? 'PASS' : 'FAIL',
          evidence,
          findings,
          has(facts, 'analysis.provenance')
            ? 'Repository, commit, policy, LaunchProof version, and analyzer identities are recorded.'
            : 'Release provenance is missing.',
        );
      case 'LP-17': {
        const orphanCases = 0;
        return result(
          control.id,
          has(facts, 'analysis.provenance') && orphanCases === 0 ? 'PASS' : 'UNKNOWN',
          evidence,
          findings,
          'Control and Assurance Case results are constructed from structured evidence identifiers.',
        );
      }
      case 'LP-18':
        return result(
          control.id,
          'PASS',
          evidence,
          findings,
          'Core evidence, control, Assurance Case, scoring, and release gates do not consume LLM output.',
        );
      case 'LP-19':
        return result(
          control.id,
          has(facts, 'ai.provider-usage') ? 'PARTIAL' : 'PASS',
          evidence,
          findings,
          has(facts, 'ai.provider-usage')
            ? `AI usage exists; configured data policy is ${policy.ai.dataPolicy} and provider enforcement must remain active.`
            : 'No application AI-provider usage was detected; LaunchProof intelligence remains optional and governed.',
        );
      case 'LP-20':
        return result(
          control.id,
          has(facts, 'analysis.provenance') ? 'PASS' : 'FAIL',
          evidence,
          findings,
          'Unsupported evidence maps to UNKNOWN/PARTIAL and invalid policy/analysis state fails closed.',
        );
      default:
        return result(
          control.id,
          'UNKNOWN',
          evidence,
          findings,
          'No deterministic evaluator is registered for this control.',
        );
    }
  });
}

function ids(evidence: Evidence[], kinds: string[]) {
  return evidence.filter((item) => kinds.includes(item.kind)).map((item) => item.id);
}
function control(controls: ControlResult[], id: string) {
  const item = controls.find((candidate) => candidate.control.id === id);
  if (!item) throw new Error(`Missing control result ${id}`);
  return item;
}
function state(input: {
  failed?: boolean;
  supported: boolean;
  partial: boolean;
  verified?: boolean;
}): AssuranceCase['state'] {
  if (input.failed) return 'FAILED';
  if (input.verified && input.supported) return 'VERIFIED';
  if (input.supported) return 'SUPPORTED';
  if (input.partial) return 'PARTIAL';
  return 'UNKNOWN';
}

export function buildAssuranceCases(
  evidence: Evidence[],
  controls: ControlResult[],
  findings: Finding[],
  graph: ApplicationGraph,
  policy: LaunchProofPolicyShape,
): AssuranceCase[] {
  const kinds = new Set(evidence.map((item) => item.kind));
  const runtimeTenant = evidence
    .filter(
      (item) =>
        item.kind === 'verification.tenant-isolation' &&
        item.certainty === 'VERIFIED' &&
        Number((item.data as any)?.exitCode) === 0,
    )
    .map((item) => item.id);
  const runtimeTests = evidence
    .filter(
      (item) =>
        item.kind === 'verification.tests' &&
        item.certainty === 'VERIFIED' &&
        Number((item.data as any)?.exitCode) === 0,
    )
    .map((item) => item.id);
  const tenantStatic =
    kinds.has('security.tenant-scope') &&
    kinds.has('security.authorization-indicator') &&
    (!policy.tenancy.requireRls ||
      kinds.has('security.rls-policy') ||
      kinds.has('security.rls-enabled'));
  const authStatic =
    kinds.has('security.authentication-indicator') &&
    kinds.has('security.authorization-indicator') &&
    !findings.some((item) => item.ruleId === 'LP-03' && item.status === 'open');
  const secretFailed = findings.some((item) => item.ruleId === 'LP-06' && item.status === 'open');
  const dependencyFailed = findings.some(
    (item) =>
      item.ruleId === 'LP-08' &&
      item.status === 'open' &&
      ['high', 'critical'].includes(item.severity),
  );
  const productionControls = ['LP-13', 'LP-14', 'LP-16'].map((id) => control(controls, id));
  const productionSupported =
    productionControls.every((item) => ['PASS', 'PARTIAL'].includes(item.outcome)) &&
    control(controls, 'LP-16').outcome === 'PASS';
  const routeCount = graph.nodes.filter((node) => node.type === 'Route').length;

  return [
    {
      id: 'AC-AUTHZ-001',
      claim: 'Protected application operations establish identity and enforce authorization.',
      state: state({
        supported: authStatic,
        partial:
          kinds.has('security.authentication-indicator') ||
          kinds.has('security.authorization-indicator'),
        failed: findings.some((item) => item.ruleId === 'LP-03' && item.status === 'open'),
      }),
      controlIds: ['LP-02', 'LP-03'],
      evidenceIds: ids(evidence, [
        'security.authentication-indicator',
        'security.authorization-indicator',
      ]),
      requiredEvidenceKinds: [
        'security.authentication-indicator',
        'security.authorization-indicator',
      ],
      rationale: [
        control(controls, 'LP-02').rationale,
        control(controls, 'LP-03').rationale,
        `System Map contains ${routeCount} detected route(s). Static support is not runtime verification.`,
      ],
    },
    {
      id: 'AC-TENANT-001',
      claim:
        'Users cannot cross tenant/workspace data boundaries on protected tenant-scoped paths.',
      state: state({
        supported: tenantStatic,
        partial:
          kinds.has('security.tenant-scope') ||
          kinds.has('security.rls-policy') ||
          kinds.has('security.authorization-indicator'),
        verified: runtimeTenant.length > 0,
        failed: policy.tenancy.required && control(controls, 'LP-04').outcome === 'FAIL',
      }),
      controlIds: ['LP-03', 'LP-04', 'LP-12'],
      evidenceIds: ids(evidence, [
        'security.authorization-indicator',
        'security.tenant-scope',
        'security.rls-enabled',
        'security.rls-policy',
        'testing.security-test',
        'verification.tenant-isolation',
      ]),
      verificationEvidenceIds: runtimeTenant,
      requiredEvidenceKinds: ['security.authorization-indicator', 'security.tenant-scope'],
      rationale: [
        control(controls, 'LP-04').rationale,
        runtimeTenant.length
          ? 'A deterministic isolated cross-tenant verification succeeded.'
          : 'VERIFIED requires successful deterministic cross-tenant execution in the isolated runner.',
      ],
    },
    {
      id: 'AC-SECRETS-001',
      claim:
        'No supported committed-secret or client-exposure finding is open in the inspected snapshot.',
      state: secretFailed ? 'FAILED' : 'SUPPORTED',
      controlIds: ['LP-06'],
      evidenceIds: ids(evidence, [
        'security.secret',
        'scanner.gitleaks',
        'scanner.trivy-secret',
        'configuration.environment-read',
      ]),
      rationale: [
        control(controls, 'LP-06').rationale,
        'Supported status means no configured detector reported a match; it does not prove absence of every possible secret.',
      ],
    },
    {
      id: 'AC-DEPS-001',
      claim:
        'Dependency integrity is reproducible and no supplied advisory scanner reports an unresolved high-impact vulnerability.',
      state: dependencyFailed
        ? 'FAILED'
        : control(controls, 'LP-08').outcome === 'PASS'
          ? 'SUPPORTED'
          : control(controls, 'LP-08').outcome === 'PARTIAL'
            ? 'PARTIAL'
            : 'UNKNOWN',
      controlIds: ['LP-08'],
      evidenceIds: ids(evidence, ['dependency.lockfile', 'scanner.osv', 'scanner.trivy']),
      rationale: [control(controls, 'LP-08').rationale],
    },
    {
      id: 'AC-TESTS-001',
      claim: 'Important guarantees have test artifacts and configured test verification succeeds.',
      state: runtimeTests.length
        ? 'VERIFIED'
        : kinds.has('testing.test-file')
          ? 'PARTIAL'
          : 'UNKNOWN',
      controlIds: ['LP-12'],
      evidenceIds: ids(evidence, [
        'testing.test-file',
        'testing.security-test',
        'verification.tests',
      ]),
      verificationEvidenceIds: runtimeTests,
      rationale: [
        control(controls, 'LP-12').rationale,
        runtimeTests.length
          ? 'The isolated test command exited successfully.'
          : 'Discovered test source is not equivalent to a passing test run.',
      ],
    },
    {
      id: 'AC-PRODUCTION-001',
      claim:
        'The release has explicit production configuration, provenance, and operational evidence.',
      state: productionSupported
        ? 'SUPPORTED'
        : productionControls.some((item) => item.outcome !== 'UNKNOWN')
          ? 'PARTIAL'
          : 'UNKNOWN',
      controlIds: ['LP-13', 'LP-14', 'LP-16'],
      evidenceIds: ids(evidence, [
        'production.next-config',
        'production.security-headers',
        'production.container-config',
        'production.ci-workflow',
        'production.observability',
        'production.health-check',
        'analysis.provenance',
      ]),
      rationale: productionControls.map((item) => item.rationale),
    },
    {
      id: 'AC-AI-001',
      claim:
        'AI is optional, untrusted for pass/fail decisions, and repository context is governed before provider transmission.',
      state:
        control(controls, 'LP-18').outcome === 'PASS' &&
        ['PASS', 'PARTIAL'].includes(control(controls, 'LP-19').outcome)
          ? 'SUPPORTED'
          : 'UNKNOWN',
      controlIds: ['LP-18', 'LP-19', 'LP-20'],
      evidenceIds: ids(evidence, ['ai.provider-usage', 'analysis.provenance']),
      rationale: [
        control(controls, 'LP-18').rationale,
        control(controls, 'LP-19').rationale,
        control(controls, 'LP-20').rationale,
      ],
    },
    {
      id: 'AC-PROVENANCE-001',
      claim:
        'The assurance report identifies the exact repository snapshot, policy, LaunchProof version, and analyzers used.',
      state: control(controls, 'LP-16').outcome === 'PASS' ? 'SUPPORTED' : 'FAILED',
      controlIds: ['LP-16', 'LP-17'],
      evidenceIds: ids(evidence, ['analysis.provenance']),
      rationale: [control(controls, 'LP-16').rationale, control(controls, 'LP-17').rationale],
    },
  ];
}
