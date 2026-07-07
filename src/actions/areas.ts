"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { AREA_NAME_MAX, nextPosition } from "@/domain/areas/area";

const nameSchema = z.string().trim().min(1).max(AREA_NAME_MAX);
const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .optional();

async function assertAreaInWorkspace(areaId: string, workspaceId: string) {
  const area = await prisma.lifeArea.findUnique({
    where: { id: areaId },
    select: { workspaceId: true },
  });
  if (!area || area.workspaceId !== workspaceId) backWithError("/areas", "NOT_FOUND");
}

export async function createArea(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError("/areas", "AREA_NAME_REQUIRED");
  const color = colorSchema.safeParse(formData.get("color") || undefined);

  const existing = await prisma.lifeArea.findMany({
    where: { workspaceId: ctx.workspace.id },
    select: { position: true },
  });

  await prisma.lifeArea.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: name.data,
      color: color.success ? color.data : undefined,
      position: nextPosition(existing.map((a) => a.position)),
    },
  });

  revalidatePath("/areas");
  redirect("/areas");
}

export async function renameArea(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError("/areas", "AREA_NAME_REQUIRED");
  await assertAreaInWorkspace(id, ctx.workspace.id);

  await prisma.lifeArea.update({ where: { id }, data: { name: name.data } });
  revalidatePath("/areas");
  redirect("/areas");
}

export async function deleteArea(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  await assertAreaInWorkspace(id, ctx.workspace.id);

  const [goals, projects] = await Promise.all([
    prisma.goal.count({ where: { areaId: id } }),
    prisma.project.count({ where: { areaId: id } }),
  ]);
  if (goals > 0 || projects > 0) backWithError("/areas", "AREA_HAS_CONTENT");

  await prisma.lifeArea.delete({ where: { id } });
  revalidatePath("/areas");
  redirect("/areas");
}
