import { readFileSync } from 'node:fs';

function readReport(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const [referencePath, regressionPath, sentenPath] = process.argv.slice(2);
if (!referencePath || !regressionPath || !sentenPath) {
  console.error(
    'Usage: node scripts/assert-release-scenarios.mjs <reference.json> <regression.json> <senten.json>',
  );
  process.exit(3);
}

const reference = readReport(referencePath);
const regression = readReport(regressionPath);
const senten = readReport(sentenPath);

const failures = [];
if (['BLOCKED', 'INCOMPLETE'].includes(reference.release?.status)) {
  failures.push(`production reference unexpectedly ended as ${reference.release?.status}`);
}
if (regression.release?.status !== 'BLOCKED') {
  failures.push(
    `missing-tenant-authorization must be BLOCKED; received ${regression.release?.status ?? 'UNKNOWN'}`,
  );
}
const regressionText = [
  ...(regression.release?.blockers ?? []),
  ...(regression.release?.conditions ?? []),
  ...(regression.release?.explanation ?? []),
]
  .join(' ')
  .toLowerCase();
if (!regressionText.includes('tenant') && !regressionText.includes('authorization')) {
  failures.push('regression report does not explain the tenant/authorization release failure');
}

const sentenKinds = new Set((senten.evidence ?? []).map((item) => item.kind));
if (!sentenKinds.has('platform.senten')) {
  failures.push('Senten scenario was not structurally detected');
}
if (!sentenKinds.has('senten.architecture-declaration')) {
  failures.push('Senten intended architecture was not imported');
}
if (!sentenKinds.has('senten.evidence-import')) {
  failures.push('Senten evidence interchange envelope was not imported');
}
if (
  (senten.evidence ?? []).some(
    (item) => item.kind?.startsWith('imported.') && item.certainty === 'VERIFIED',
  )
) {
  failures.push('external Senten evidence was incorrectly promoted to LaunchProof VERIFIED');
}
const intendedNodes = (senten.graph?.nodes ?? []).filter(
  (node) => node.metadata?.intended === true,
);
if (intendedNodes.length === 0) {
  failures.push('Senten scenario produced no intended architecture nodes');
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(2);
}

console.log(
  `PASS: reference=${reference.release.status} (${reference.release.score}/100), regression=${regression.release.status} (${regression.release.score}/100), senten-intended=${intendedNodes.length}`,
);
