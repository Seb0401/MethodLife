"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { GOAL_STATUSES, GOAL_TITLE_MAX, canTransitionGoal } from "@/domain/goals/goal";

const titleSchema = z.string().trim().min(1).max(GOAL_TITLE_MAX);

async function areaInWorkspace(areaId: string, workspaceId: string) {
  const area = await prisma.lifeArea.findUnique({
    where: { id: areaId },
    select: { workspaceId: true },
  });
  return !!area && area.workspaceId === workspaceId;
}

export async function createGoal(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const areaId = z.uuid().parse(formData.get("areaId"));
  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) backWithError("/areas", "GOAL_TITLE_REQUIRED");
  if (!(await areaInWorkspace(areaId, ctx.workspace.id))) backWithError("/areas", "NOT_FOUND");

  const description = z
    .string()
    .trim()
    .min(1)
    .optional()
    .safeParse(formData.get("description") || undefined);
  const rawDate = formData.get("targetDate");
  const targetDate = rawDate ? new Date(String(rawDate)) : undefined;

  await prisma.goal.create({
    data: {
      workspaceId: ctx.workspace.id,
      areaId,
      title: title.data,
      description: description.success ? description.data : undefined,
      targetDate: targetDate && !Number.isNaN(targetDate.getTime()) ? targetDate : undefined,
    },
  });

  revalidatePath("/areas");
  redirect("/areas");
}

export async function setGoalStatus(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const to = z.enum(GOAL_STATUSES).parse(formData.get("status"));

  const goal = await prisma.goal.findUnique({
    where: { id },
    select: { workspaceId: true, status: true },
  });
  if (!goal || goal.workspaceId !== ctx.workspace.id) backWithError("/areas", "NOT_FOUND");
  if (!canTransitionGoal(goal.status, to)) backWithError("/areas", "GOAL_INVALID_STATUS");

  await prisma.goal.update({ where: { id }, data: { status: to } });
  revalidatePath("/areas");
  redirect("/areas");
}

export async function deleteGoal(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const goal = await prisma.goal.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!goal || goal.workspaceId !== ctx.workspace.id) backWithError("/areas", "NOT_FOUND");

  await prisma.goal.delete({ where: { id } });
  revalidatePath("/areas");
  redirect("/areas");
}
