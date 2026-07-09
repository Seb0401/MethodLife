"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { evaluateInvariants } from "@/lib/formal/evaluate";
import { parseRule } from "@/domain/formal/invariant";

const BACK = "/invariantes";
const nameSchema = z.string().trim().min(1).max(120);

// Create a workspace invariant (RF6.2). Only the WIP-ceiling and area-floor
// rules are offered in the UI; the DSL/evaluator also supports column ceilings.
export async function createInvariant(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError(BACK, "INVARIANT_NAME_REQUIRED");

  const type = z.enum(["wip_max", "area_min_per_week"]).safeParse(formData.get("type"));
  if (!type.success) backWithError(BACK, "INVARIANT_INVALID_RULE");

  let rule: unknown;
  if (type.data === "wip_max") {
    const max = z.coerce.number().int().min(0).max(999).safeParse(formData.get("max"));
    if (!max.success) backWithError(BACK, "INVARIANT_INVALID_RULE");
    rule = { type: "wip_max", max: max.data };
  } else {
    const areaId = z.uuid().safeParse(formData.get("areaId"));
    const min = z.coerce.number().int().min(0).max(999).safeParse(formData.get("min"));
    if (!areaId.success || !min.success) backWithError(BACK, "INVARIANT_INVALID_RULE");
    // The area must belong to this workspace.
    const area = await prisma.lifeArea.findFirst({
      where: { id: areaId.data, workspaceId: ctx.workspace.id },
      select: { id: true },
    });
    if (!area) backWithError(BACK, "NOT_FOUND");
    rule = { type: "area_min_per_week", areaId: areaId.data, min: min.data };
  }

  // Defensive: never persist a rule the evaluator would not accept.
  if (!parseRule(rule)) backWithError(BACK, "INVARIANT_INVALID_RULE");

  await prisma.invariant.create({
    data: {
      workspaceId: ctx.workspace.id,
      ownerId: ctx.user.id,
      name: name.data,
      rule: rule as Prisma.InputJsonValue,
    },
  });

  // Reflect reality immediately: a rule already breached shows as violated.
  await evaluateInvariants(ctx.workspace.id, "invariant_created");
  revalidatePath(BACK);
  redirect(BACK);
}

async function requireInvariant(id: string, workspaceId: string) {
  const invariant = await prisma.invariant.findUnique({
    where: { id },
    select: { workspaceId: true, enabled: true },
  });
  if (!invariant || invariant.workspaceId !== workspaceId) backWithError(BACK, "NOT_FOUND");
  return invariant;
}

// Pause or resume an invariant. A paused one is skipped by the evaluator;
// resuming re-checks it right away.
export async function toggleInvariant(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const invariant = await requireInvariant(id, ctx.workspace.id);

  const enabled = !invariant.enabled;
  await prisma.invariant.update({ where: { id }, data: { enabled } });
  if (enabled) await evaluateInvariants(ctx.workspace.id, "invariant_enabled");
  revalidatePath(BACK);
  redirect(BACK);
}

// Delete an invariant and its recorded violations (cascade).
export async function deleteInvariant(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  await requireInvariant(id, ctx.workspace.id);
  await prisma.invariant.delete({ where: { id } });
  revalidatePath(BACK);
  redirect(BACK);
}
