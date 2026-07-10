"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { Prisma } from "@prisma/client";
import { es } from "@/lib/i18n/es";
import { PROJECT_METHODS, isMethodActive } from "@/domain/projects/method";
import { DEFAULT_KANBAN_COLUMNS } from "@/domain/projects/board";
import { recommendMethod, type SelectorAnswers } from "@/domain/selector/recommend";

const nameSchema = z.string().trim().min(1).max(120);

// Reads the optional method-selector questionnaire (RF9.1). Returns null when the
// user did not use it, so no decision is recorded.
function parseSelectorAnswers(formData: FormData): SelectorAnswers | null {
  if (formData.get("selectorUsed") !== "true") return null;
  const workMode = z.enum(["continuous", "deliverables"]).safeParse(formData.get("workMode"));
  const people = z.coerce.number().int().min(1).max(50).safeParse(formData.get("people"));
  if (!workMode.success || !people.success) return null;
  return {
    hasDeadline: formData.get("hasDeadline") === "on",
    workMode: workMode.data,
    isLargeLongTerm: formData.get("isLargeLongTerm") === "on",
    people: people.data,
    stableRequirements: formData.get("stableRequirements") === "on",
  };
}

// Kanban and Scrum projects ship with a ready board (1.5 / 2.4).
function boardSeed() {
  return {
    create: {
      name: es.projects.defaultBoardName,
      columns: {
        create: DEFAULT_KANBAN_COLUMNS.map((c) => ({
          name: es.projects.columns[c.key],
          position: c.position,
          wipLimit: c.wipLimit ?? null,
        })),
      },
    },
  };
}

export async function createProject(formData: FormData) {
  const ctx = await getWorkspaceContext();

  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError("/proyectos", "PROJECT_NAME_REQUIRED");

  const areaParsed = z.uuid().safeParse(formData.get("areaId"));
  if (!areaParsed.success) backWithError("/proyectos", "PROJECT_AREA_REQUIRED");
  const areaId = areaParsed.data;

  const method = z.enum(PROJECT_METHODS).parse(formData.get("method"));
  if (!isMethodActive(method)) backWithError("/proyectos", "METHOD_NOT_AVAILABLE");

  const area = await prisma.lifeArea.findUnique({
    where: { id: areaId },
    select: { workspaceId: true },
  });
  if (!area || area.workspaceId !== ctx.workspace.id)
    backWithError("/proyectos", "PROJECT_AREA_REQUIRED");

  const goalParsed = z.uuid().safeParse(formData.get("goalId"));
  let goalId: string | undefined;
  if (goalParsed.success) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalParsed.data },
      select: { workspaceId: true, areaId: true },
    });
    if (!goal || goal.workspaceId !== ctx.workspace.id || goal.areaId !== areaId) {
      backWithError("/proyectos", "PROJECT_GOAL_MISMATCH");
    }
    goalId = goalParsed.data;
  }

  const description = z
    .string()
    .trim()
    .min(1)
    .optional()
    .safeParse(formData.get("description") || undefined);

  const answers = parseSelectorAnswers(formData);

  const created = await prisma.project.create({
    data: {
      workspaceId: ctx.workspace.id,
      areaId,
      goalId,
      name: name.data,
      description: description.success ? description.data : undefined,
      method,
      boards: method === "kanban" || method === "scrum" ? boardSeed() : undefined,
    },
    select: { id: true },
  });

  // Record the selection decision when the questionnaire was used (RF9.5).
  if (answers) {
    const recommendation = recommendMethod(answers);
    await prisma.methodDecision.create({
      data: {
        projectId: created.id,
        answers: answers as unknown as Prisma.InputJsonValue,
        recommended: recommendation.method,
        chosen: method,
      },
    });
  }

  revalidatePath("/proyectos");
  redirect("/proyectos");
}

// Change a project's method later (RF9.5) and record it as a new decision, so the
// history shows the switch. Creates a board if switching to a board-based method
// and none exists yet; never deletes an existing board.
export async function changeProjectMethod(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const projectId = z.uuid().parse(formData.get("projectId"));
  const back = `/proyectos/${projectId}`;
  const method = z.enum(PROJECT_METHODS).parse(formData.get("method"));
  if (!isMethodActive(method)) backWithError(back, "METHOD_NOT_AVAILABLE");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, method: true, boards: { select: { id: true }, take: 1 } },
  });
  if (!project || project.workspaceId !== ctx.workspace.id) backWithError(back, "NOT_FOUND");
  if (project.method === method) redirect(back);

  const needsBoard = (method === "kanban" || method === "scrum") && project.boards.length === 0;
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { method, boards: needsBoard ? boardSeed() : undefined },
    });
    await tx.methodDecision.create({
      data: {
        projectId,
        answers: {} as Prisma.InputJsonValue,
        recommended: project.method,
        chosen: method,
      },
    });
  });
  revalidatePath(back);
  redirect(back);
}

export async function deleteProject(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const project = await prisma.project.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!project || project.workspaceId !== ctx.workspace.id)
    backWithError("/proyectos", "NOT_FOUND");

  await prisma.project.delete({ where: { id } });
  revalidatePath("/proyectos");
  redirect("/proyectos");
}
