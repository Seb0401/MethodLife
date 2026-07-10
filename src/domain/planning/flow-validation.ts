// Minimal personal-flow graph validation (RF10.4): every flow node must have at
// least one incoming and one outgoing edge. Pure — used by the flow editor.

export type FlowNodeRef = { id: string };
export type FlowEdgeRef = { source: string; target: string };

export type FlowIssue = { nodeId: string; missingIn: boolean; missingOut: boolean };

export function validateFlow(nodes: FlowNodeRef[], edges: FlowEdgeRef[]): FlowIssue[] {
  const hasIn = new Set(edges.map((e) => e.target));
  const hasOut = new Set(edges.map((e) => e.source));

  const issues: FlowIssue[] = [];
  for (const node of nodes) {
    const missingIn = !hasIn.has(node.id);
    const missingOut = !hasOut.has(node.id);
    if (missingIn || missingOut) issues.push({ nodeId: node.id, missingIn, missingOut });
  }
  return issues;
}

export function isFlowValid(nodes: FlowNodeRef[], edges: FlowEdgeRef[]): boolean {
  // A single isolated node or an empty graph has nothing meaningful to validate.
  if (nodes.length <= 1) return true;
  return validateFlow(nodes, edges).length === 0;
}
