"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { es } from "@/lib/i18n/es";
import { PROJECT_METHODS, isMethodActive } from "@/domain/projects/method";
import { DEFAULT_KANBAN_COLUMNS } from "@/domain/projects/board";

const nameSchema = z.string().trim().min(1).max(120);

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

  await prisma.project.create({
    data: {
      workspaceId: ctx.workspace.id,
      areaId,
      goalId,
      name: name.data,
      description: description.success ? description.data : undefined,
      method,
      // Kanban and Scrum projects ship with a ready board: Kanban uses it as its
      // main board (1.5); Scrum reuses it as the sprint board (2.4).
      boards:
        method === "kanban" || method === "scrum"
          ? {
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
            }
          : undefined,
    },
  });

  revalidatePath("/proyectos");
  redirect("/proyectos");
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
