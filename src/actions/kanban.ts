"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { WIP_LIMIT_REACHED, wipReached } from "@/domain/kanban/wip";
import { statusForColumn } from "@/domain/kanban/status";
import { canComplete, DOD_NOT_CONFIRMED } from "@/domain/formal/dod";
import { evaluateInvariants } from "@/lib/formal/evaluate";

const moveSchema = z.object({
  taskId: z.uuid(),
  toColumnId: z.uuid(),
  toIndex: z.number().int().min(0),
});

export type MoveResult = { ok: true } | { ok: false; error: string };

// Server is the authority for the move (design rule 1): it enforces the WIP
// limit (RF3.2) and records the column change as a transition event (RF3.3),
// both inside one transaction. Returns a typed result so the board can roll
// back its optimistic update.
export async function moveTask(input: z.infer<typeof moveSchema>): Promise<MoveResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "GENERIC" };
  const { taskId, toColumnId, toIndex } = parsed.data;

  let ctx;
  try {
    ctx = await getWorkspaceContext();
  } catch {
    return { ok: false, error: "NOT_FOUND" };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      workspaceId: true,
      columnId: true,
      status: true,
      projectId: true,
      definitionOfDone: true,
    },
  });
  if (!task || task.workspaceId !== ctx.workspace.id) return { ok: false, error: "NOT_FOUND" };

  const destCol = await prisma.boardColumn.findUnique({
    where: { id: toColumnId },
    include: {
      board: {
        select: {
          projectId: true,
          project: { select: { workspaceId: true } },
          columns: { select: { id: true } },
        },
      },
    },
  });
  if (
    !destCol ||
    destCol.board.project.workspaceId !== ctx.workspace.id ||
    task.projectId !== destCol.board.projectId
  ) {
    return { ok: false, error: "NOT_FOUND" };
  }

  const movingFromDest = task.columnId === toColumnId;
  const destCount = await prisma.task.count({ where: { columnId: toColumnId } });
  const countExcludingTask = movingFromDest ? destCount - 1 : destCount;
  if (wipReached(destCol.wipLimit, countExcludingTask)) {
    return { ok: false, error: WIP_LIMIT_REACHED };
  }

  const columnChanged = task.columnId !== toColumnId;
  const status = statusForColumn(destCol.position, destCol.board.columns.length);

  // Definition-of-done gate (RF6.1): a card can't land in a "done" column while
  // its postconditions are unconfirmed.
  if (columnChanged && status === "done" && !canComplete(task.definitionOfDone)) {
    return { ok: false, error: DOD_NOT_CONFIRMED };
  }

  // Rebuild contiguous positions in the destination column with the task at toIndex.
  const siblings = await prisma.task.findMany({
    where: { columnId: toColumnId, id: { not: taskId } },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  const ordered = siblings.map((s) => s.id);
  ordered.splice(Math.min(Math.max(toIndex, 0), ordered.length), 0, taskId);

  const sourceColumnId = task.columnId;
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < ordered.length; i++) {
      await tx.task.update({
        where: { id: ordered[i] },
        data:
          ordered[i] === taskId ? { position: i, columnId: toColumnId, status } : { position: i },
      });
    }
    if (columnChanged && sourceColumnId) {
      const src = await tx.task.findMany({
        where: { columnId: sourceColumnId },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      for (let i = 0; i < src.length; i++) {
        await tx.task.update({ where: { id: src[i].id }, data: { position: i } });
      }
    }
    if (columnChanged) {
      await tx.taskTransition.create({
        data: {
          taskId,
          fromColumnId: sourceColumnId,
          toColumnId,
          fromStatus: task.status,
          toStatus: status,
          actorId: ctx.user.id,
        },
      });
    }
  });

  // After the state change, re-check the workspace invariants (RF6.3): a WIP
  // ceiling breach records exactly one violation carrying this event.
  if (columnChanged) {
    await evaluateInvariants(ctx.workspace.id, "task_moved");
  }

  revalidatePath(`/proyectos/${destCol.board.projectId}`);
  return { ok: true };
}

// --- Column configuration (RF3.1) -----------------------------------------

const columnNameSchema = z.string().trim().min(1).max(60);

async function boardForProject(projectId: string, workspaceId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, boards: { select: { id: true }, take: 1 } },
  });
  if (!project || project.workspaceId !== workspaceId) return null;
  return project.boards[0] ?? null;
}

export async function addColumn(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const name = columnNameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError(back, "COLUMN_NAME_REQUIRED");

  const board = await boardForProject(projectId, ctx.workspace.id);
  if (!board) backWithError(back, "NOT_FOUND");

  const position = await prisma.boardColumn.count({ where: { boardId: board.id } });
  await prisma.boardColumn.create({ data: { boardId: board.id, name: name.data, position } });
  revalidatePath(back);
  redirect(back);
}

async function assertColumnInProject(
  columnId: string,
  projectId: string,
  workspaceId: string,
  back: string,
) {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    include: { board: { select: { projectId: true, project: { select: { workspaceId: true } } } } },
  });
  if (
    !column ||
    column.board.projectId !== projectId ||
    column.board.project.workspaceId !== workspaceId
  ) {
    backWithError(back, "NOT_FOUND");
  }
  return column;
}

export async function renameColumn(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const columnId = z.uuid().parse(formData.get("columnId"));
  const back = `/proyectos/${projectId}`;
  const name = columnNameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError(back, "COLUMN_NAME_REQUIRED");
  await assertColumnInProject(columnId, projectId, ctx.workspace.id, back);

  await prisma.boardColumn.update({ where: { id: columnId }, data: { name: name.data } });
  revalidatePath(back);
  redirect(back);
}

export async function setColumnWip(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const columnId = z.uuid().parse(formData.get("columnId"));
  const back = `/proyectos/${projectId}`;
  await assertColumnInProject(columnId, projectId, ctx.workspace.id, back);

  const parsed = z.coerce.number().int().min(1).max(999).safeParse(formData.get("wipLimit"));
  const wipLimit = parsed.success ? parsed.data : null;
  await prisma.boardColumn.update({ where: { id: columnId }, data: { wipLimit } });
  revalidatePath(back);
  redirect(back);
}

export async function deleteColumn(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const columnId = z.uuid().parse(formData.get("columnId"));
  const back = `/proyectos/${projectId}`;
  const column = await assertColumnInProject(columnId, projectId, ctx.workspace.id, back);

  const [tasks, total] = await Promise.all([
    prisma.task.count({ where: { columnId } }),
    prisma.boardColumn.count({ where: { boardId: column.boardId } }),
  ]);
  if (tasks > 0) backWithError(back, "COLUMN_HAS_TASKS");
  if (total <= 1) backWithError(back, "COLUMN_LAST_ONE");

  await prisma.$transaction(async (tx) => {
    await tx.boardColumn.delete({ where: { id: columnId } });
    const rest = await tx.boardColumn.findMany({
      where: { boardId: column.boardId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < rest.length; i++) {
      await tx.boardColumn.update({ where: { id: rest[i].id }, data: { position: i } });
    }
  });
  revalidatePath(back);
  redirect(back);
}
