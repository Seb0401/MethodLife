"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { saveFlow } from "@/actions/flows";
import { validateFlow } from "@/domain/planning/flow-validation";
import { es } from "@/lib/i18n/es";

type StoredNode = { id: string; position: { x: number; y: number }; data: { label: string } };
type StoredEdge = { id: string; source: string; target: string };
export type StoredGraph = { nodes: StoredNode[]; edges: StoredEdge[] };

function EditorInner({ id, name, initial }: { id: string; name: string; initial: StoredGraph }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges as Edge[]);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback((c: Connection) => setEdges((e) => addEdge(c, e)), [setEdges]);

  function addNode() {
    const text = label.trim() || es.map.nodeLabel;
    const nid = crypto.randomUUID();
    setNodes((ns) => [
      ...ns,
      {
        id: nid,
        position: { x: 60 + ((ns.length * 40) % 320), y: 40 + ((ns.length * 50) % 240) },
        data: { label: text },
      },
    ]);
    setLabel("");
  }

  async function save() {
    setSaving(true);
    const fd = new FormData();
    fd.set("id", id);
    fd.set(
      "graph",
      JSON.stringify({
        nodes: nodes.map((n) => ({
          id: n.id,
          position: n.position,
          data: { label: String((n.data as { label?: string })?.label ?? "") },
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      }),
    );
    await saveFlow(fd);
    setSaving(false);
  }

  async function exportPng() {
    if (!wrapperRef.current) return;
    const dataUrl = await toPng(wrapperRef.current, {
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.download = `${name}.png`;
    a.href = dataUrl;
    a.click();
  }

  const issues = validateFlow(
    nodes.map((n) => ({ id: n.id })),
    edges.map((e) => ({ source: e.source, target: e.target })),
  );
  const nodeLabel = (nid: string) =>
    String((nodes.find((n) => n.id === nid)?.data as { label?: string })?.label ?? nid);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={es.map.nodeLabel}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={addNode}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          {es.map.addNode}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {es.map.save}
        </button>
        <button
          type="button"
          onClick={exportPng}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          {es.map.exportPng}
        </button>
        <span className="text-xs text-neutral-400">{es.map.selectDelete}</span>
      </div>

      <div
        ref={wrapperRef}
        className="h-[420px] w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="text-xs">
        <span className="font-medium">{es.map.validTitle}: </span>
        {issues.length === 0 ? (
          <span className="text-green-600">{es.map.valid}</span>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5 text-red-600">
            {issues.map((i) => (
              <li key={i.nodeId}>
                {es.map.invalidNode.replace(
                  "{what}",
                  [i.missingIn ? es.map.missingIn : null, i.missingOut ? es.map.missingOut : null]
                    .filter(Boolean)
                    .join(" / "),
                )}
                : {nodeLabel(i.nodeId)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-neutral-400">{es.map.connectHint}</p>
    </div>
  );
}

export function FlowEditor(props: { id: string; name: string; initial: StoredGraph }) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}
