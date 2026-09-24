import { readFileSync } from 'node:fs';

const [reportPath] = process.argv.slice(2);
if (!reportPath) {
  console.error('Usage: node scripts/assert-scanner-fixtures.mjs <report.json>');
  process.exit(3);
}
const raw = readFileSync(reportPath, 'utf8');
const report = JSON.parse(raw);
const failures = [];
const evidence = report.evidence ?? [];
const findings = report.findings ?? [];
const kinds = new Set(evidence.map((item) => item.kind));
for (const kind of ['scanner.semgrep', 'scanner.gitleaks', 'scanner.osv', 'scanner.trivy']) {
  if (!kinds.has(kind)) failures.push(`missing normalized evidence kind: ${kind}`);
}
const receipts = evidence.filter((item) => item.kind === 'scanner.result-import');
if (receipts.length < 4) failures.push(`expected four scanner import receipts; received ${receipts.length}`);
if (!findings.some((item) => item.ruleId === 'LP-06'))
  failures.push('Gitleaks fixture did not normalize to LP-06');
if (!findings.some((item) => item.ruleId === 'LP-08'))
  failures.push('dependency vulnerability fixtures did not normalize to LP-08');
if (raw.includes('LP_TEST_SECRET_DO_NOT_RETAIN'))
  failures.push('scanner normalization retained the fixture secret value');
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(2);
}
console.log(`PASS: scanner fixtures normalized; evidence=${evidence.length}, findings=${findings.length}, receipts=${receipts.length}`);
