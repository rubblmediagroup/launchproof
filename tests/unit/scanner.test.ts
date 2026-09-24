import { describe, expect, it } from 'vitest';
import {
  GitleaksAdapter,
  OsvAdapter,
  ScannerOutputAnalyzer,
  SemgrepAdapter,
  TrivyAdapter,
} from '@launchproof/integrations';
import type { AnalyzerContext } from '@launchproof/core';

const context: AnalyzerContext = {
  snapshot: {
    root: '/tmp/repo',
    repository: 'repo',
    branch: 'main',
    commit: 'abc',
    files: new Map(),
  },
  provenance: {
    repository: 'repo',
    branch: 'main',
    commit: 'abc',
    analyzedAt: '2026-09-15T00:00:00Z',
    launchProofVersion: '0.2.0',
    policyVersion: '1',
  },
};

describe('scanner adapters', () => {
  it('normalizes Semgrep without changing the scanner rule identity', () => {
    const output = new SemgrepAdapter().normalize(
      {
        scanner: 'semgrep',
        format: 'semgrep-json',
        content: JSON.stringify({
          results: [
            {
              check_id: 'typescript.lang.security.audit',
              path: 'app/route.ts',
              start: { line: 7 },
              extra: {
                severity: 'ERROR',
                message: 'Unsafe operation',
                metadata: { launchproof_control: 'LP-07', cwe: ['CWE-89'] },
              },
            },
          ],
        }),
      },
      context,
    );
    expect(output.evidence[0]?.kind).toBe('scanner.semgrep');
    expect(output.findings[0]?.ruleId).toBe('LP-07');
    expect(output.findings[0]?.severity).toBe('high');
  });

  it('never copies the Gitleaks secret value into normalized evidence', () => {
    const secret = 'do-not-copy-me';
    const output = new GitleaksAdapter().normalize(
      {
        scanner: 'gitleaks',
        format: 'gitleaks-json',
        content: JSON.stringify([
          {
            RuleID: 'generic-api-key',
            Description: 'Generic key',
            File: '.env',
            StartLine: 1,
            Secret: secret,
            Fingerprint: 'fp',
          },
        ]),
      },
      context,
    );
    expect(JSON.stringify(output)).not.toContain(secret);
    expect(output.findings[0]?.ruleId).toBe('LP-06');
  });

  it('normalizes OSV and Trivy dependency findings as LP-08 evidence', () => {
    const osv = new OsvAdapter().normalize(
      {
        scanner: 'osv',
        format: 'osv-json',
        content: JSON.stringify({
          results: [
            {
              packages: [
                {
                  package: { name: 'demo', version: '1.0.0' },
                  vulnerabilities: [{ id: 'OSV-1', database_specific: { severity: 'HIGH' } }],
                },
              ],
            },
          ],
        }),
      },
      context,
    );
    const trivy = new TrivyAdapter().normalize(
      {
        scanner: 'trivy',
        format: 'trivy-json',
        content: JSON.stringify({
          Results: [
            {
              Target: 'package-lock.json',
              Vulnerabilities: [
                {
                  VulnerabilityID: 'CVE-1',
                  PkgName: 'demo',
                  InstalledVersion: '1.0.0',
                  Severity: 'CRITICAL',
                },
              ],
            },
          ],
        }),
      },
      context,
    );
    expect(osv.findings[0]?.ruleId).toBe('LP-08');
    expect(trivy.findings[0]?.severity).toBe('critical');
  });

  it('records scanner import provenance even when the scanner reports zero findings', () => {
    const output = new ScannerOutputAnalyzer({
      scanner: 'gitleaks',
      format: 'gitleaks-json',
      content: '[]',
      scannerVersion: '8.0.0',
    }).analyze(context);
    expect(output.evidence.find((item) => item.kind === 'scanner.result-import')).toBeDefined();
    expect(output.findings).toHaveLength(0);
  });
});
