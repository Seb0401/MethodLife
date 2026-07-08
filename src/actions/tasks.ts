"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { isTraceable } from "@/domain/tasks/traceability";
import { statusForColumn } from "@/domain/kanban/status";

const titleSchema = z.string().trim().min(1).max(200);
const prioritySchema = z.enum(["low", "medium", "high"]);

// Only allow internal redirect targets (avoids open-redirect via a form field).
function safePath(raw: FormDataEntryValue | null, fallback: string): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") ? value : fallback;
}

// Quick capture straight into the inbox (RF1.6): no project/goal required.
export async function captureTask(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) backWithError("/inbox", "TASK_TITLE_REQUIRED");

  await prisma.task.create({
    data: { workspaceId: ctx.workspace.id, title: title.data, inbox: true },
  });

  revalidatePath("/inbox");
  redirect("/inbox");
}

// Process an inbox task onto a project and/or goal. Enforces traceability
// (RF7.1): the result must have a project or a goal, otherwise it stays orphan.
export async function processTask(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));

  const task = await prisma.task.findUnique({
    where: { id },
    select: { workspaceId: true, status: true },
  });
  if (!task || task.workspaceId !== ctx.workspace.id) backWithError("/inbox", "NOT_FOUND");

  const projectId = z.uuid().safeParse(formData.get("projectId")).data;
  const goalId = z.uuid().safeParse(formData.get("goalId")).data;
  if (!isTraceable({ projectId: projectId ?? null, goalId: goalId ?? null })) {
    backWithError("/inbox", "TASK_NOT_TRACEABLE");
  }

  if (goalId) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { workspaceId: true },
    });
    if (!goal || goal.workspaceId !== ctx.workspace.id) backWithError("/inbox", "NOT_FOUND");
  }

  // If the target is a Kanban project, drop the card into its first column and
  // record the entry as a transition event (RF3.3).
  let placement: {
    columnId: string;
    status: "todo" | "in_progress" | "done";
    position: number;
  } | null = null;
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        workspaceId: true,
        boards: { select: { columns: { orderBy: { position: "asc" } } } },
      },
    });
    if (!project || project.workspaceId !== ctx.workspace.id) backWithError("/inbox", "NOT_FOUND");
    const columns = project.boards[0]?.columns ?? [];
    if (columns.length > 0) {
      const first = columns[0];
      const count = await prisma.task.count({ where: { columnId: first.id } });
      placement = {
        columnId: first.id,
        status: statusForColumn(first.position, columns.length),
        position: count,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id },
      data: {
        inbox: false,
        projectId: projectId ?? null,
        goalId: goalId ?? null,
        columnId: placement?.columnId ?? null,
        status: placement?.status ?? task.status,
        position: placement?.position ?? 0,
      },
    });
    if (placement) {
      await tx.taskTransition.create({
        data: {
          taskId: id,
          fromColumnId: null,
          toColumnId: placement.columnId,
          fromStatus: null,
          toStatus: placement.status,
          actorId: ctx.user.id,
        },
      });
    }
  });

  revalidatePath("/inbox");
  redirect("/inbox");
}

// Create a card directly on a Kanban board column (RF3.1).
export async function createTaskInColumn(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const columnId = z.uuid().parse(formData.get("columnId"));
  const title = titleSchema.safeParse(formData.get("title"));
  const back = `/proyectos/${projectId}`;
  if (!title.success) backWithError(back, "TASK_TITLE_REQUIRED");
  const priority = prioritySchema.safeParse(formData.get("priority"));

  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    include: {
      board: {
        select: { projectId: true, project: { select: { workspaceId: true, goalId: true } } },
      },
    },
  });
  if (
    !column ||
    column.board.projectId !== projectId ||
    column.board.project.workspaceId !== ctx.workspace.id
  ) {
    backWithError(back, "NOT_FOUND");
  }

  const columnCount = await prisma.boardColumn.count({ where: { boardId: column.boardId } });
  const position = await prisma.task.count({ where: { columnId } });
  const status = statusForColumn(column.position, columnCount);

  await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        workspaceId: ctx.workspace.id,
        projectId,
        goalId: column.board.project.goalId,
        columnId,
        title: title.data,
        priority: priority.success ? priority.data : "medium",
        status,
        position,
      },
    });
    await tx.taskTransition.create({
      data: {
        taskId: created.id,
        fromColumnId: null,
        toColumnId: columnId,
        fromStatus: null,
        toStatus: status,
        actorId: ctx.user.id,
      },
    });
  });

  revalidatePath(back);
  redirect(back);
}

// Add a task to a non-Kanban ("simple") project: a plain list, no board column.
export async function addSimpleTask(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) backWithError(back, "TASK_TITLE_REQUIRED");
  const priority = prioritySchema.safeParse(formData.get("priority"));

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, goalId: true },
  });
  if (!project || project.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");

  await prisma.task.create({
    data: {
      workspaceId: ctx.workspace.id,
      projectId,
      goalId: project.goalId,
      title: title.data,
      priority: priority.success ? priority.data : "medium",
    },
  });
  revalidatePath(back);
  redirect(back);
}

// Set or clear a task's due date (RF1.7). An empty value clears it (removes the
// task from the "Today" view). Dates are calendar-only ("YYYY-MM-DD").
export async function setTaskDueDate(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const back = safePath(formData.get("redirectTo"), "/hoy");
  const raw = formData.get("dueDate");
  const parsed = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .safeParse(typeof raw === "string" ? raw : "");

  const task = await prisma.task.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!task || task.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");

  await prisma.task.update({
    where: { id },
    // `${value}T00:00:00Z` pins the calendar day in UTC (matches @db.Date).
    data: { dueDate: parsed.success ? new Date(`${parsed.data}T00:00:00Z`) : null },
  });
  revalidatePath(back);
  redirect(back);
}

export async function toggleTaskDone(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const back = safePath(formData.get("redirectTo"), "/inbox");
  const done = formData.get("done") === "true";

  const task = await prisma.task.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!task || task.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");

  await prisma.task.update({ where: { id }, data: { status: done ? "done" : "todo" } });
  revalidatePath(back);
  redirect(back);
}

export async function deleteTask(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const back = safePath(formData.get("redirectTo"), "/inbox");

  const task = await prisma.task.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!task || task.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");

  await prisma.task.delete({ where: { id } });
  revalidatePath(back);
  redirect(back);
}
