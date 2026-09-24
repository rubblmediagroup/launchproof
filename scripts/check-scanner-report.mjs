import { readFile } from 'node:fs/promises';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/check-scanner-report.mjs <report.json>');
  process.exit(2);
}

const text = await readFile(file, 'utf8');
if (text.includes('LP_FAKE_SECRET_MUST_NOT_SURVIVE')) {
  console.error('Scanner report leaked a synthetic secret value.');
  process.exit(1);
}
const report = JSON.parse(text);
const analyzerIds = new Set((report.evidence ?? []).map((item) => item.analyzer?.id));
for (const id of ['scanner-semgrep', 'scanner-gitleaks', 'scanner-osv', 'scanner-trivy']) {
  if (!analyzerIds.has(id)) {
    console.error(`Missing normalized evidence from ${id}`);
    process.exit(1);
  }
}
const openFindings = (report.findings ?? []).filter((item) => item.status === 'open');
if (openFindings.length < 4) {
  console.error(`Expected scanner findings; received ${openFindings.length}`);
  process.exit(1);
}
console.log(
  `Scanner contract report OK: ${openFindings.length} open findings, secret value redacted.`,
);
