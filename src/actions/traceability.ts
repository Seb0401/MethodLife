"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { wouldCreateCycle } from "@/domain/traceability/graph";

const BACK = "/trazabilidad";
const linkTypeSchema = z.enum(["depends_on", "refines", "conflicts"]);

// Declare a relation between two goals (RF7.4). A `depends_on` edge that would
// close a cycle is rejected (server is the authority for the invariant).
export async function addGoalLink(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const fromGoalId = z.uuid().parse(formData.get("fromGoalId"));
  const toGoalId = z.uuid().parse(formData.get("toGoalId"));
  const type = linkTypeSchema.parse(formData.get("type"));
  if (fromGoalId === toGoalId) backWithError(BACK, "GOAL_LINK_INVALID");

  // Both goals must belong to the current workspace.
  const goals = await prisma.goal.findMany({
    where: { id: { in: [fromGoalId, toGoalId] }, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (goals.length !== 2) backWithError(BACK, "NOT_FOUND");

  if (type === "depends_on") {
    const edges = await prisma.goalLink.findMany({
      where: { type: "depends_on", fromGoal: { workspaceId: ctx.workspace.id } },
      select: { fromGoalId: true, toGoalId: true },
    });
    if (
      wouldCreateCycle(
        edges.map((e) => ({ from: e.fromGoalId, to: e.toGoalId })),
        fromGoalId,
        toGoalId,
      )
    ) {
      backWithError(BACK, "GOAL_LINK_CYCLE");
    }
  }

  try {
    await prisma.goalLink.create({ data: { fromGoalId, toGoalId, type } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      backWithError(BACK, "GOAL_LINK_EXISTS");
    }
    throw error;
  }
  revalidatePath(BACK);
  redirect(BACK);
}

export async function deleteGoalLink(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));

  const link = await prisma.goalLink.findUnique({
    where: { id },
    select: { fromGoal: { select: { workspaceId: true } } },
  });
  if (!link || link.fromGoal.workspaceId !== ctx.workspace.id) backWithError(BACK, "NOT_FOUND");

  await prisma.goalLink.delete({ where: { id } });
  revalidatePath(BACK);
  redirect(BACK);
}
