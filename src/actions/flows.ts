"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";

const BACK = "/mapa";
const nameSchema = z.string().trim().min(1).max(120);

// Minimal shape of a saved diagram: React Flow nodes and edges.
const graphSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().max(64),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.object({ label: z.string().max(120) }),
      }),
    )
    .max(200),
  edges: z
    .array(
      z.object({ id: z.string().max(80), source: z.string().max(64), target: z.string().max(64) }),
    )
    .max(400),
});

// Create an empty personal flow diagram (RF10.3) and open it.
export async function createFlow(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError(BACK, "FLOW_NAME_REQUIRED");

  const flow = await prisma.flowDiagram.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: name.data,
      graph: { nodes: [], edges: [] } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  revalidatePath(BACK);
  redirect(`${BACK}?flow=${flow.id}`);
}

async function requireFlow(id: string, workspaceId: string) {
  const flow = await prisma.flowDiagram.findUnique({
    where: { id },
    select: { workspaceId: true },
  });
  if (!flow || flow.workspaceId !== workspaceId) backWithError(BACK, "NOT_FOUND");
  return flow;
}

// Persist the diagram's nodes/edges (RF10.3). Called programmatically from the
// editor with the serialized graph.
export async function saveFlow(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  await requireFlow(id, ctx.workspace.id);

  const raw = formData.get("graph");
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof raw === "string" ? raw : "");
  } catch {
    backWithError(BACK, "FLOW_INVALID_GRAPH");
  }
  const graph = graphSchema.safeParse(parsed);
  if (!graph.success) backWithError(BACK, "FLOW_INVALID_GRAPH");

  await prisma.flowDiagram.update({
    where: { id },
    data: { graph: graph.data as unknown as Prisma.InputJsonValue },
  });
  revalidatePath(BACK);
}

export async function deleteFlow(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  await requireFlow(id, ctx.workspace.id);
  await prisma.flowDiagram.delete({ where: { id } });
  revalidatePath(BACK);
  redirect(BACK);
}
