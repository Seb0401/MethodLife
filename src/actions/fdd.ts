"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type FeatureStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { loadMachine } from "@/lib/formal/load-machine";
import { FEATURE_MACHINE_KEY } from "@/domain/formal/machines";
import { applyEvent, INVALID_TRANSITION } from "@/domain/formal/machine";

const nameSchema = z.string().trim().min(1).max(120);
const titleSchema = z.string().trim().min(1).max(200);

function backTo(projectId: string): string {
  return `/proyectos/${projectId}`;
}

// Create a feature set under a goal (RF4.1).
export async function createFeatureSet(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = backTo(projectId);
  const goalId = z.uuid().parse(formData.get("goalId"));
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError(back, "FEATURE_SET_NAME_REQUIRED");

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { workspaceId: true },
  });
  if (!goal || goal.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");

  const position = await prisma.featureSet.count({ where: { goalId } });
  await prisma.featureSet.create({ data: { goalId, name: name.data, position } });
  revalidatePath(back);
  redirect(back);
}

// Loads a feature set, ensuring it belongs to the current workspace via its goal.
async function requireFeatureSet(id: string, workspaceId: string, back: string) {
  const set = await prisma.featureSet.findUnique({
    where: { id },
    select: { id: true, goalId: true, goal: { select: { workspaceId: true } } },
  });
  if (!set || set.goal.workspaceId !== workspaceId) backWithError(back, "NOT_FOUND");
  return set;
}

// Add a feature to a set (RF4.2). Starts in `design`; the initial state is logged
// as the first status event (RF4.4 weekly progress derives from these).
export async function createFeature(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = backTo(projectId);
  const featureSetId = z.uuid().parse(formData.get("featureSetId"));
  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) backWithError(back, "FEATURE_TITLE_REQUIRED");

  await requireFeatureSet(featureSetId, ctx.workspace.id, back);

  const estimateParsed = z.coerce
    .number()
    .int()
    .min(1)
    .max(999)
    .safeParse(formData.get("estimate"));
  const estimate = estimateParsed.success ? estimateParsed.data : null;

  // Optional owner must be a member of this workspace.
  let ownerId: string | null = null;
  const ownerParsed = z.uuid().safeParse(formData.get("ownerId"));
  if (ownerParsed.success) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspace.id, userId: ownerParsed.data } },
      select: { userId: true },
    });
    if (member) ownerId = ownerParsed.data;
  }

  const position = await prisma.feature.count({ where: { featureSetId } });
  await prisma.$transaction(async (tx) => {
    const feature = await tx.feature.create({
      data: { featureSetId, title: title.data, estimate, ownerId, position },
    });
    await tx.featureStatusEvent.create({
      data: { featureId: feature.id, fromStatus: null, toStatus: "design", actorId: ctx.user.id },
    });
  });
  revalidatePath(back);
  redirect(back);
}

// Loads a feature, ensuring workspace ownership via feature_set -> goal.
async function requireFeature(id: string, workspaceId: string, back: string) {
  const feature = await prisma.feature.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      featureSet: { select: { goalId: true, goal: { select: { workspaceId: true } } } },
    },
  });
  if (!feature || feature.featureSet.goal.workspaceId !== workspaceId) {
    backWithError(back, "NOT_FOUND");
  }
  return feature;
}

// Advance a feature through its lifecycle via the data-driven engine (RF4.2/6.5)
// and record the transition as an event (RF4.4).
export async function transitionFeature(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = backTo(projectId);
  const id = z.uuid().parse(formData.get("id"));
  const event = z.string().trim().min(1).max(40).parse(formData.get("event"));

  const feature = await requireFeature(id, ctx.workspace.id, back);
  const machine = await loadMachine(FEATURE_MACHINE_KEY);
  if (!machine) backWithError(back, "GENERIC");

  const next = applyEvent(machine, feature.status, event);
  if (!next.ok) {
    backWithError(
      back,
      next.error.code === INVALID_TRANSITION ? "FEATURE_INVALID_TRANSITION" : "GENERIC",
    );
  }

  const toStatus = next.value as FeatureStatus;
  await prisma.$transaction(async (tx) => {
    await tx.feature.update({ where: { id }, data: { status: toStatus } });
    await tx.featureStatusEvent.create({
      data: { featureId: id, fromStatus: feature.status, toStatus, actorId: ctx.user.id },
    });
  });
  revalidatePath(back);
  redirect(back);
}

// A feature can spawn tasks in the core (RF4.5). The task inherits the goal, so
// it stays traceable, and links back to the feature.
export async function addFeatureTask(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = backTo(projectId);
  const featureId = z.uuid().parse(formData.get("featureId"));
  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) backWithError(back, "TASK_TITLE_REQUIRED");

  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    select: { featureSet: { select: { goalId: true, goal: { select: { workspaceId: true } } } } },
  });
  if (!feature || feature.featureSet.goal.workspaceId !== ctx.workspace.id) {
    backWithError(back, "NOT_FOUND");
  }

  await prisma.task.create({
    data: {
      workspaceId: ctx.workspace.id,
      goalId: feature.featureSet.goalId,
      featureId,
      projectId,
      title: title.data,
    },
  });
  revalidatePath(back);
  redirect(back);
}

export async function deleteFeature(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = backTo(projectId);
  const id = z.uuid().parse(formData.get("id"));
  await requireFeature(id, ctx.workspace.id, back);
  await prisma.feature.delete({ where: { id } });
  revalidatePath(back);
  redirect(back);
}

export async function deleteFeatureSet(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = backTo(projectId);
  const id = z.uuid().parse(formData.get("id"));
  await requireFeatureSet(id, ctx.workspace.id, back);
  await prisma.featureSet.delete({ where: { id } });
  revalidatePath(back);
  redirect(back);
}
