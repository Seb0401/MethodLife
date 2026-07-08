"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { Prisma } from "@prisma/client";
import { isValidEstimate, moveInOrder, nextBacklogPosition } from "@/domain/scrum/backlog";
import { canAssignToSprint, canTransitionSprint, isValidSprintRange } from "@/domain/scrum/sprint";
import { statusForColumn } from "@/domain/kanban/status";

const titleSchema = z.string().trim().min(1).max(200);
const nameSchema = z.string().trim().min(1).max(120);
const prioritySchema = z.enum(["low", "medium", "high"]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Parses a "YYYY-MM-DD" form value into a UTC-midnight Date (matches @db.Date).
function parseDate(raw: FormDataEntryValue | null): Date | null {
  const parsed = dateSchema.safeParse(typeof raw === "string" ? raw : "");
  return parsed.success ? new Date(`${parsed.data}T00:00:00Z`) : null;
}

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

// First column (todo) of a Scrum project's board, or null if it has none.
async function firstBoardColumn(projectId: string) {
  const board = await prisma.board.findFirst({
    where: { projectId },
    select: { columns: { orderBy: { position: "asc" }, select: { id: true, position: true } } },
  });
  const columns = board?.columns ?? [];
  return columns.length > 0 ? { column: columns[0], count: columns.length } : null;
}

// Places sprint tasks (not yet on the board) into the first column, recording an
// entry transition each — the sprint board's starting state and burndown seed (RF2.6).
async function placeOnBoard(
  tx: Prisma.TransactionClient,
  taskIds: string[],
  column: { id: string; position: number },
  columnCount: number,
  actorId: string,
) {
  const status = statusForColumn(column.position, columnCount);
  let position = await tx.task.count({ where: { columnId: column.id } });
  for (const taskId of taskIds) {
    await tx.task.update({
      where: { id: taskId },
      data: { columnId: column.id, status, position },
    });
    await tx.taskTransition.create({
      data: {
        taskId,
        fromColumnId: null,
        toColumnId: column.id,
        fromStatus: null,
        toStatus: status,
        actorId,
      },
    });
    position++;
  }
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

// Create a sprint for a Scrum project (RF2.2): starts in `planned` with a date
// range validated in the domain.
export async function createSprint(formData: FormData) {
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError(back, "SPRINT_NAME_REQUIRED");

  await requireScrumProject(projectId, back);

  const startsAt = parseDate(formData.get("startsAt"));
  const endsAt = parseDate(formData.get("endsAt"));
  if (!startsAt || !endsAt || !isValidSprintRange(startsAt, endsAt)) {
    backWithError(back, "SPRINT_INVALID_RANGE");
  }

  await prisma.sprint.create({
    data: { projectId, name: name.data, startsAt, endsAt },
  });
  revalidatePath(back);
  redirect(back);
}

// Plan a backlog task into a sprint (RF2.3). Rejected if the sprint is closed
// (RF2.2). Planning only sets scope; the sprint board (2.4) places the card.
export async function assignToSprint(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const taskId = z.uuid().parse(formData.get("taskId"));
  const sprintId = z.uuid().parse(formData.get("sprintId"));

  const [task, sprint] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId }, select: { workspaceId: true } }),
    prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { projectId: true, status: true },
    }),
  ]);
  if (!task || task.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");
  if (!sprint || sprint.projectId !== projectId) backWithError(back, "NOT_FOUND");
  if (!canAssignToSprint(sprint.status)) backWithError(back, "SPRINT_CLOSED");

  // If the sprint is already running, the task also lands on the board now.
  const board = sprint.status === "active" ? await firstBoardColumn(projectId) : null;
  const inSprint = await prisma.task.findMany({ where: { sprintId }, select: { position: true } });
  const position = nextBacklogPosition(inSprint.map((t) => t.position));

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data: { sprintId, position } });
    if (board) await placeOnBoard(tx, [taskId], board.column, board.count, ctx.user.id);
  });
  revalidatePath(back);
  redirect(back);
}

// Return a task from its sprint to the backlog (allowed while the sprint is open).
export async function removeFromSprint(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const taskId = z.uuid().parse(formData.get("taskId"));

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { workspaceId: true, sprint: { select: { status: true } } },
  });
  if (!task || task.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");
  if (task.sprint && !canAssignToSprint(task.sprint.status)) backWithError(back, "SPRINT_CLOSED");

  const backlog = await prisma.task.findMany({
    where: { projectId, sprintId: null },
    select: { position: true },
  });
  await prisma.task.update({
    where: { id: taskId },
    data: {
      sprintId: null,
      columnId: null,
      position: nextBacklogPosition(backlog.map((t) => t.position)),
    },
  });
  revalidatePath(back);
  redirect(back);
}

// Start a planned sprint (planned → active, RF2.2 lifecycle). Its planned tasks
// are dropped onto the board's first column so the sprint board (RF2.4) opens
// with the committed scope.
export async function startSprint(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const sprintId = z.uuid().parse(formData.get("sprintId"));

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, method: true },
  });
  if (!project || project.workspaceId !== ctx.workspace.id || project.method !== "scrum") {
    backWithError(back, "NOT_FOUND");
  }
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { projectId: true, status: true },
  });
  if (!sprint || sprint.projectId !== projectId) backWithError(back, "NOT_FOUND");
  if (!canTransitionSprint(sprint.status, "active")) backWithError(back, "SPRINT_INVALID_STATUS");

  const board = await firstBoardColumn(projectId);
  const unplaced = await prisma.task.findMany({
    where: { sprintId, columnId: null },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.sprint.update({ where: { id: sprintId }, data: { status: "active" } });
    if (board) {
      await placeOnBoard(
        tx,
        unplaced.map((t) => t.id),
        board.column,
        board.count,
        ctx.user.id,
      );
    }
  });
  revalidatePath(back);
  redirect(back);
}
