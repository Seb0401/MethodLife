"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { nextVersionNumber } from "@/domain/routines/version";

const BACK = "/rutinas";
const nameSchema = z.string().trim().min(1).max(120);
const textSchema = z.string().trim().min(1).max(200);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BACKDATE_DAYS = 90;

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

// Register a routine (RF8.1) and open its first version (RF8.2).
export async function createRoutine(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError(BACK, "ROUTINE_NAME_REQUIRED");
  const prototypeKind = z.enum(["throwaway", "evolutionary"]).parse(formData.get("prototypeKind"));

  await prisma.routine.create({
    data: {
      workspaceId: ctx.workspace.id,
      ownerId: ctx.user.id,
      name: name.data,
      prototypeKind,
      versions: { create: { number: 1 } },
    },
  });
  revalidatePath(BACK);
  redirect(BACK);
}

// Loads a version with its routine's workspace + open state.
async function requireVersion(id: string, workspaceId: string) {
  const version = await prisma.routineVersion.findUnique({
    where: { id },
    select: {
      id: true,
      closedAt: true,
      routineId: true,
      routine: { select: { workspaceId: true } },
    },
  });
  if (!version || version.routine.workspaceId !== workspaceId) backWithError(BACK, "NOT_FOUND");
  return version;
}

// Add a requirement to validate in the open version (RF8.2).
export async function addRequirement(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const versionId = z.uuid().parse(formData.get("versionId"));
  const text = textSchema.safeParse(formData.get("text"));
  if (!text.success) backWithError(BACK, "ROUTINE_REQ_TEXT_REQUIRED");

  const version = await requireVersion(versionId, ctx.workspace.id);
  if (version.closedAt) backWithError(BACK, "ROUTINE_VERSION_CLOSED");

  const position = await prisma.routineRequirement.count({ where: { versionId } });
  await prisma.routineRequirement.create({ data: { versionId, text: text.data, position } });
  revalidatePath(BACK);
  redirect(BACK);
}

// Loads a requirement with its version's open state and workspace.
async function requireRequirement(id: string, workspaceId: string) {
  const req = await prisma.routineRequirement.findUnique({
    where: { id },
    select: {
      id: true,
      versionId: true,
      version: { select: { closedAt: true, routine: { select: { workspaceId: true } } } },
    },
  });
  if (!req || req.version.routine.workspaceId !== workspaceId) backWithError(BACK, "NOT_FOUND");
  return req;
}

export async function deleteRequirement(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const req = await requireRequirement(id, ctx.workspace.id);
  if (req.version.closedAt) backWithError(BACK, "ROUTINE_VERSION_CLOSED");
  await prisma.routineRequirement.delete({ where: { id } });
  revalidatePath(BACK);
  redirect(BACK);
}

// Record one evaluator's daily result for a requirement (RF8.3). Any workspace
// member may evaluate; several members' results consolidate later (RF8.6).
export async function evaluateRequirement(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const requirementId = z.uuid().parse(formData.get("requirementId"));
  const result = z.enum(["met", "not_met"]).safeParse(formData.get("result"));
  if (!result.success) backWithError(BACK, "EVALUATION_INVALID");

  const req = await requireRequirement(requirementId, ctx.workspace.id);
  if (req.version.closedAt) backWithError(BACK, "ROUTINE_VERSION_CLOSED");

  const today = todayUtc();
  let date = today;
  const dateParsed = dateSchema.safeParse(formData.get("date"));
  if (dateParsed.success) {
    const candidate = new Date(`${dateParsed.data}T00:00:00Z`);
    if (candidate > today || candidate < new Date(today.getTime() - MAX_BACKDATE_DAYS * DAY_MS)) {
      backWithError(BACK, "EVALUATION_INVALID");
    }
    date = candidate;
  }

  const noteRaw = formData.get("note");
  const note =
    typeof noteRaw === "string" && noteRaw.trim().length > 0 ? noteRaw.trim().slice(0, 200) : null;

  await prisma.routineEvaluation.upsert({
    where: {
      requirementId_evaluatorId_date: { requirementId, evaluatorId: ctx.user.id, date },
    },
    create: { requirementId, evaluatorId: ctx.user.id, date, result: result.data, note },
    update: { result: result.data, note },
  });
  revalidatePath(BACK);
  redirect(BACK);
}

// Close a version with a justified decision (RF8.4). "evolve" opens version N+1
// inheriting the selected requirements, each marked with its source (RF8.4/8.5).
export async function closeVersion(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const versionId = z.uuid().parse(formData.get("versionId"));
  const decision = z.enum(["evolve", "discard", "approve"]).parse(formData.get("decision"));
  const justification = z.string().trim().min(1).max(500).safeParse(formData.get("justification"));
  if (!justification.success) backWithError(BACK, "ROUTINE_JUSTIFICATION_REQUIRED");

  const version = await requireVersion(versionId, ctx.workspace.id);
  if (version.closedAt) backWithError(BACK, "ROUTINE_VERSION_CLOSED");

  // For an evolve, resolve which of THIS version's requirements to carry over.
  let inherited: { id: string; text: string; position: number }[] = [];
  if (decision === "evolve") {
    const ids = formData
      .getAll("inherit")
      .filter((v): v is string => typeof v === "string")
      .filter((v) => z.uuid().safeParse(v).success);
    if (ids.length > 0) {
      inherited = await prisma.routineRequirement.findMany({
        where: { id: { in: ids }, versionId },
        select: { id: true, text: true, position: true },
        orderBy: { position: "asc" },
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.routineVersion.update({
      where: { id: versionId },
      data: { closedAt: new Date(), decision, justification: justification.data },
    });

    if (decision === "evolve") {
      const numbers = await tx.routineVersion.findMany({
        where: { routineId: version.routineId },
        select: { number: true },
      });
      const created = await tx.routineVersion.create({
        data: {
          routineId: version.routineId,
          number: nextVersionNumber(numbers.map((n) => n.number)),
        },
      });
      for (const req of inherited) {
        await tx.routineRequirement.create({
          data: {
            versionId: created.id,
            text: req.text,
            inheritedFrom: req.id,
            position: req.position,
          },
        });
      }
    }
  });
  revalidatePath(BACK);
  redirect(BACK);
}

export async function deleteRoutine(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const routine = await prisma.routine.findUnique({
    where: { id },
    select: { workspaceId: true },
  });
  if (!routine || routine.workspaceId !== ctx.workspace.id) backWithError(BACK, "NOT_FOUND");
  await prisma.routine.delete({ where: { id } });
  revalidatePath(BACK);
  redirect(BACK);
}
