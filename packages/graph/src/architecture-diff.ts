import type { ApplicationGraph, GraphNodeType } from '@launchproof/contracts';

export type ArchitectureDiffState =
  | 'MATCHED'
  | 'UNOBSERVED'
  | 'UNDECLARED'
  | 'VIOLATION'
  | 'UNKNOWN';

export interface ArchitectureDiffEntry {
  state: ArchitectureDiffState;
  type: GraphNodeType;
  label: string;
  intendedNodeId?: string;
  observedNodeId?: string;
  evidenceIds: string[];
}

export interface ArchitectureDiff {
  hasIntendedArchitecture: boolean;
  entries: ArchitectureDiffEntry[];
  counts: Record<ArchitectureDiffState, number>;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function key(type: GraphNodeType, label: string): string {
  return `${type}:${normalize(label)}`;
}

export function compareIntendedAndObservedArchitecture(graph: ApplicationGraph): ArchitectureDiff {
  const intended = graph.nodes.filter((node) => node.metadata?.intended === true);
  const observed = graph.nodes.filter((node) => node.metadata?.intended !== true);
  const observedByKey = new Map(observed.map((node) => [key(node.type, node.label), node]));
  const matchedObserved = new Set<string>();
  const entries: ArchitectureDiffEntry[] = [];

  for (const node of intended) {
    const match = observedByKey.get(key(node.type, node.label));
    const violation = graph.edges.some(
      (edge) =>
        edge.type === 'VIOLATES' &&
        (edge.from === node.id || edge.to === node.id) &&
        edge.metadata?.intended !== true,
    );

    if (violation) {
      entries.push({
        state: 'VIOLATION',
        type: node.type,
        label: node.label,
        intendedNodeId: node.id,
        observedNodeId: match?.id,
        evidenceIds: [...new Set([...node.evidenceIds, ...(match?.evidenceIds ?? [])])],
      });
      if (match) matchedObserved.add(match.id);
      continue;
    }

    if (match) {
      matchedObserved.add(match.id);
      entries.push({
        state: 'MATCHED',
        type: node.type,
        label: node.label,
        intendedNodeId: node.id,
        observedNodeId: match.id,
        evidenceIds: [...new Set([...node.evidenceIds, ...match.evidenceIds])],
      });
    } else {
      entries.push({
        state: 'UNOBSERVED',
        type: node.type,
        label: node.label,
        intendedNodeId: node.id,
        evidenceIds: [...node.evidenceIds],
      });
    }
  }

  if (intended.length) {
    for (const node of observed) {
      if (matchedObserved.has(node.id)) continue;
      entries.push({
        state: 'UNDECLARED',
        type: node.type,
        label: node.label,
        observedNodeId: node.id,
        evidenceIds: [...node.evidenceIds],
      });
    }
  } else {
    for (const node of observed) {
      entries.push({
        state: 'UNKNOWN',
        type: node.type,
        label: node.label,
        observedNodeId: node.id,
        evidenceIds: [...node.evidenceIds],
      });
    }
  }

  const counts: Record<ArchitectureDiffState, number> = {
    MATCHED: 0,
    UNOBSERVED: 0,
    UNDECLARED: 0,
    VIOLATION: 0,
    UNKNOWN: 0,
  };
  for (const entry of entries) counts[entry.state] += 1;

  return {
    hasIntendedArchitecture: intended.length > 0,
    entries,
    counts,
  };
}
