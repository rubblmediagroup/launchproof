import { createHash } from 'node:crypto';
import type {
  AnalysisProvenance,
  Certainty,
  Evidence,
  SourceLocation,
} from '@launchproof/contracts';
export function stableId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 16)}`;
}
export function createEvidence<T>(input: {
  kind: string;
  certainty: Certainty;
  title: string;
  description: string;
  analyzer: { id: string; version: string };
  provenance: AnalysisProvenance;
  source?: SourceLocation;
  data: T;
}): Evidence<T> {
  const id = stableId(
    'ev',
    input.kind,
    input.source?.path ?? '',
    String(input.source?.line ?? ''),
    JSON.stringify(input.data),
  );
  return { ...input, id };
}
export function evidenceByKind(evidence: Evidence[], kind: string): Evidence[] {
  return evidence.filter((e) => e.kind === kind);
}
