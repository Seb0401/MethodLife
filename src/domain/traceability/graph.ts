// Goal dependency graph checks (RF7.4). Pure: the server passes the existing
// `depends_on` edges and asks whether a new one would close a cycle.

export type GoalEdge = { from: string; to: string };

// Depth-first reachability: is `target` reachable from `start`?
export function hasPath(edges: GoalEdge[], start: string, target: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    const list = adjacency.get(e.from) ?? [];
    list.push(e.to);
    adjacency.set(e.from, list);
  }

  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop() as string;
    if (node === target) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of adjacency.get(node) ?? []) stack.push(next);
  }
  return false;
}

// Adding from → to closes a cycle if it is a self-loop, or if `from` is already
// reachable from `to` (so to → … → from → to).
export function wouldCreateCycle(edges: GoalEdge[], from: string, to: string): boolean {
  if (from === to) return true;
  return hasPath(edges, to, from);
}
