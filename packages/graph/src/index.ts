import type { ApplicationGraph, GraphEdge, GraphNode } from '@launchproof/contracts';
export class ApplicationGraphBuilder {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  addNode(node: GraphNode) {
    const current = this.nodes.get(node.id);
    this.nodes.set(
      node.id,
      current
        ? { ...current, evidenceIds: [...new Set([...current.evidenceIds, ...node.evidenceIds])] }
        : node,
    );
    return this;
  }
  addEdge(edge: GraphEdge) {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to))
      throw new Error(`Graph edge references missing node: ${edge.from} -> ${edge.to}`);
    this.edges.set(edge.id, edge);
    return this;
  }
  build(): ApplicationGraph {
    return { nodes: [...this.nodes.values()], edges: [...this.edges.values()] };
  }
}
export function findPaths(
  graph: ApplicationGraph,
  from: string,
  to: string,
  maxDepth = 8,
): string[][] {
  const out: string[][] = [];
  const adjacency = new Map<string, string[]>();
  for (const e of graph.edges) adjacency.set(e.from, [...(adjacency.get(e.from) ?? []), e.to]);
  const walk = (n: string, path: string[]) => {
    if (path.length > maxDepth) return;
    if (n === to) {
      out.push(path);
      return;
    }
    for (const next of adjacency.get(n) ?? [])
      if (!path.includes(next)) walk(next, [...path, next]);
  };
  walk(from, [from]);
  return out;
}

export * from './architecture-diff.js';
