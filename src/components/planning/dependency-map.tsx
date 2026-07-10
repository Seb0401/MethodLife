"use client";

import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { es } from "@/lib/i18n/es";

export type MapNode = { id: string; label: string; kind: "goal" | "project"; coupled?: boolean };
export type MapEdge = {
  id: string;
  source: string;
  target: string;
  kind: "belongs" | "depends_on" | "conflicts";
};

const goalStyle = {
  background: "#eef2ff",
  border: "1px solid #6366f1",
  borderRadius: 8,
  fontSize: 12,
  padding: 6,
};
const projectStyle = {
  background: "#f8fafc",
  border: "1px solid #94a3b8",
  borderRadius: 8,
  fontSize: 12,
  padding: 6,
};
const coupledStyle = { ...projectStyle, border: "2px solid #ef4444", background: "#fef2f2" };
const edgeColor: Record<MapEdge["kind"], string> = {
  belongs: "#9ca3af",
  depends_on: "#3b82f6",
  conflicts: "#ef4444",
};

// Interactive dependency map (RF10.1): goals on top, their projects below, with
// belongs / depends-on / conflict edges. Coupled projects (RF10.2) are outlined.
export function DependencyMap({ nodes, edges }: { nodes: MapNode[]; edges: MapEdge[] }) {
  const goals = nodes.filter((n) => n.kind === "goal");
  const projects = nodes.filter((n) => n.kind === "project");

  const rfNodes: Node[] = [
    ...goals.map((n, i) => ({
      id: n.id,
      position: { x: i * 220, y: 0 },
      data: { label: n.label },
      style: goalStyle,
    })),
    ...projects.map((n, i) => ({
      id: n.id,
      position: { x: i * 220, y: 200 },
      data: { label: n.label },
      style: n.coupled ? coupledStyle : projectStyle,
    })),
  ];

  const rfEdges: Edge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: es.map.edges[e.kind],
    animated: e.kind === "conflicts",
    style: { stroke: edgeColor[e.kind] },
    labelStyle: { fontSize: 10 },
  }));

  return (
    <div className="h-[480px] w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
