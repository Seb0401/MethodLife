"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { isValidEstimate, moveInOrder, nextBacklogPosition } from "@/domain/scrum/backlog";

const titleSchema = z.string().trim().min(1).max(200);
const prioritySchema = z.enum(["low", "medium", "high"]);

// Loads a Scrum project the current user may access, or bounces with an error.
async function requireScrumProject(projectId: string, back: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, goalId: true, method: true },
  });
  const ctx = await getWorkspaceContext();
  if (!project || project.workspaceId !== ctx.workspace.id || project.method !== "scrum") {
    backWithError(back, "NOT_FOUND");
  }
  return { project, workspaceId: ctx.workspace.id };
}

// Add an item to a project's backlog (RF2.1): a task with no sprint yet,
// estimated in story points and placed at the end of the priority order.
export async function addBacklogItem(formData: FormData) {
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) backWithError(back, "TASK_TITLE_REQUIRED");

  const { project, workspaceId } = await requireScrumProject(projectId, back);
  const priority = prioritySchema.safeParse(formData.get("priority"));

  const estimateRaw = z.coerce.number().int().safeParse(formData.get("estimate"));
  const estimate =
    estimateRaw.success && isValidEstimate(estimateRaw.data) ? estimateRaw.data : null;

  const backlog = await prisma.task.findMany({
    where: { projectId, sprintId: null },
    select: { position: true },
  });
  const position = nextBacklogPosition(backlog.map((t) => t.position));

  await prisma.task.create({
    data: {
      workspaceId,
      projectId,
      goalId: project.goalId,
      title: title.data,
      priority: priority.success ? priority.data : "medium",
      estimate,
      position,
    },
  });
  revalidatePath(back);
  redirect(back);
}

// Set or clear a backlog item's story-point estimate. An empty value clears it;
// a value off the scale is rejected (RF2.1).
export async function setBacklogEstimate(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;

  const task = await prisma.task.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!task || task.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");

  const raw = formData.get("estimate");
  let estimate: number | null = null;
  if (typeof raw === "string" && raw !== "") {
    const parsed = z.coerce.number().int().safeParse(raw);
    if (!parsed.success || !isValidEstimate(parsed.data)) {
      backWithError(back, "BACKLOG_INVALID_ESTIMATE");
    }
    estimate = parsed.data;
  }

  await prisma.task.update({ where: { id }, data: { estimate } });
  revalidatePath(back);
  redirect(back);
}

// Reorder a backlog item one step up or down in the priority order (RF2.1).
export async function moveBacklogItem(formData: FormData) {
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const id = z.uuid().parse(formData.get("id"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));

  await requireScrumProject(projectId, back);

  const backlog = await prisma.task.findMany({
    where: { projectId, sprintId: null },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const ordered = moveInOrder(
    backlog.map((t) => t.id),
    id,
    direction,
  );

  // Persist the new order as contiguous positions in one transaction.
  await prisma.$transaction(
    ordered.map((taskId, index) =>
      prisma.task.update({ where: { id: taskId }, data: { position: index } }),
    ),
  );
  revalidatePath(back);
  redirect(back);
}
