import { readFileSync } from 'node:fs';

function readReport(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const [referencePath, regressionPath] = process.argv.slice(2);
if (!referencePath || !regressionPath) {
  console.error(
    'Usage: node scripts/assert-release-scenarios.mjs <reference.json> <regression.json>',
  );
  process.exit(3);
}

const reference = readReport(referencePath);
const regression = readReport(regressionPath);

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

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(2);
}

console.log(
  `PASS: reference=${reference.release.status} (${reference.release.score}/100), regression=${regression.release.status} (${regression.release.score}/100)`,
);
