#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzeRepository, formatReport, toSarif } from './index.js';

const CLI_VERSION = '1.0.0-rc.1';
const args = process.argv.slice(2);
if (args.includes('--version') || args.includes('-v')) {
  console.log(CLI_VERSION);
  process.exit(0);
}
const command = args.shift() ?? 'analyze';
const target = !args[0]?.startsWith('--') ? (args.shift() ?? '.') : '.';
function values(flag: string) {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++)
    if (args[i] === flag && args[i + 1]) result.push(args[i + 1]!);
  return result;
}
function value(flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
function has(flag: string) {
  return args.includes(flag);
}

async function writeStructured(file: string, data: unknown) {
  await mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}

async function main() {
  if (command === 'report') {
    const file = target === '.' ? '.launchproof/report.json' : target;
    const report = JSON.parse(await readFile(file, 'utf8'));
    const format = value('--format') ?? 'summary';
    console.log(
      format === 'json'
        ? JSON.stringify(report, null, 2)
        : format === 'sarif'
          ? JSON.stringify(toSarif(report), null, 2)
          : formatReport(report),
    );
    return;
  }
  if (!['analyze', 'verify'].includes(command))
    throw new Error(
      'Usage: launchproof analyze [path] [--json file] [--sarif file] [--scanner format:file] | verify [path] [--allow-execution --runner-image sha256:<id>] | report [file] [--format summary|json|sarif]',
    );
  const scannerResults = values('--scanner').map((spec) => {
    const split = spec.indexOf(':');
    if (split < 1) throw new Error('--scanner expects format:path');
    return { format: spec.slice(0, split), path: spec.slice(split + 1) };
  });
  const report = await analyzeRepository(target, {
    scannerResults,
    authorizeDynamicVerification: command === 'verify' && has('--allow-execution'),
    allowedRunnerImages: values('--runner-image'),
    requirePinnedRunnerImage: true,
  });
  const jsonFile = value('--json');
  if (jsonFile) await writeStructured(jsonFile, report);
  const sarifFile = value('--sarif');
  if (sarifFile) await writeStructured(sarifFile, toSarif(report));
  console.log(formatReport(report));
  if (command === 'verify') {
    if (report.release.status === 'BLOCKED' || report.release.status === 'INCOMPLETE')
      process.exitCode = 2;
    else if (
      report.release.status === 'REVIEW_REQUIRED' ||
      report.release.status === 'READY_WITH_CONDITIONS'
    )
      process.exitCode = 1;
  }
}
main().catch((error) => {
  console.error(`LaunchProof error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 3;
});
