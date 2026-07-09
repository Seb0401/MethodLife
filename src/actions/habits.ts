"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type HabitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { backWithError } from "@/lib/forms";
import { loadMachine } from "@/lib/formal/load-machine";
import { HABIT_MACHINE_KEY } from "@/domain/formal/machines";
import { applyEvent, INVALID_TRANSITION } from "@/domain/formal/machine";
import {
  evaluateVerification,
  isValidVerificationRule,
  parseVerificationRule,
  type VerificationRule,
} from "@/domain/habits/verification";

const BACK = "/habitos";
const nameSchema = z.string().trim().min(1).max(120);
const severitySchema = z.enum(["low", "medium", "high"]);
const resultSchema = z.enum(["done", "occurrence", "skipped"]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BACKDATE_DAYS = 90;

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

// Register a default habit to correct (RF5.1) with an immutable verification
// proof (RF5.5). It starts in `detected`; creation is logged as the first
// transition (RF5.7). A team witness (RF5.4) may be assigned.
export async function createHabit(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) backWithError(BACK, "HABIT_NAME_REQUIRED");

  const severity = severitySchema.safeParse(formData.get("severity"));
  const windowDays = z.coerce.number().int().safeParse(formData.get("windowDays"));
  const tolerance = z.coerce.number().int().safeParse(formData.get("tolerance"));
  const analysisDays = z.coerce
    .number()
    .int()
    .min(0)
    .max(90)
    .safeParse(formData.get("analysisDays"));
  if (!windowDays.success || !tolerance.success || !analysisDays.success) {
    backWithError(BACK, "HABIT_INVALID_RULE");
  }
  const rule: VerificationRule = {
    condition: "done",
    windowDays: windowDays.data,
    tolerance: tolerance.data,
  };
  if (!isValidVerificationRule(rule)) backWithError(BACK, "HABIT_INVALID_RULE");

  const triggerRaw = formData.get("triggerText");
  const triggerText =
    typeof triggerRaw === "string" && triggerRaw.trim().length > 0
      ? triggerRaw.trim().slice(0, 200)
      : null;

  // Optional witness: must be another member of this (team) workspace.
  let witnessId: string | null = null;
  const witnessParsed = z.uuid().safeParse(formData.get("witnessId"));
  if (witnessParsed.success && witnessParsed.data !== ctx.user.id) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspace.id, userId: witnessParsed.data } },
      select: { userId: true },
    });
    if (member) witnessId = witnessParsed.data;
  }

  await prisma.$transaction(async (tx) => {
    const habit = await tx.habit.create({
      data: {
        workspaceId: ctx.workspace.id,
        ownerId: ctx.user.id,
        name: name.data,
        triggerText,
        severity: severity.success ? severity.data : "medium",
        analysisDays: analysisDays.data,
        verificationRule: rule as unknown as Prisma.InputJsonValue,
        witnessId,
      },
    });
    await tx.habitTransition.create({
      data: {
        habitId: habit.id,
        fromStatus: null,
        toStatus: "detected",
        reason: "created",
        actorId: ctx.user.id,
      },
    });
  });

  revalidatePath(BACK);
  redirect(BACK);
}

async function requireOwnHabit(id: string, workspaceId: string) {
  const habit = await prisma.habit.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      verificationRule: true,
      witnessId: true,
    },
  });
  if (!habit || habit.workspaceId !== workspaceId) backWithError(BACK, "NOT_FOUND");
  return habit;
}

// Advance a habit through its lifecycle via the data-driven engine (RF5.2/6.5):
// the event decides the next state. `verify_passed` is gated by the proof
// (RF5.5); `relapse` returns to correction keeping all history (RF5.6).
export async function transitionHabit(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const event = z.string().trim().min(1).max(40).parse(formData.get("event"));
  const reasonRaw = formData.get("reason");
  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim().length > 0
      ? reasonRaw.trim().slice(0, 200)
      : null;

  const habit = await requireOwnHabit(id, ctx.workspace.id);
  const machine = await loadMachine(HABIT_MACHINE_KEY);
  if (!machine) backWithError(BACK, "GENERIC");

  const next = applyEvent(machine, habit.status, event);
  if (!next.ok) {
    backWithError(
      BACK,
      next.error.code === INVALID_TRANSITION ? "HABIT_INVALID_TRANSITION" : "GENERIC",
    );
  }

  // Passing verification requires the proof to actually hold (RF5.5).
  if (event === "verify_passed") {
    const rule = parseVerificationRule(habit.verificationRule);
    if (!rule) backWithError(BACK, "HABIT_INVALID_RULE");
    const checkins = await prisma.habitCheckin.findMany({
      where: { habitId: id },
      select: { date: true, result: true },
    });
    const progress = evaluateVerification(rule, checkins, todayUtc());
    if (!progress.passed) backWithError(BACK, "VERIFICATION_NOT_MET");
  }

  // The engine works on plain strings; the machine's states are exactly the
  // HabitStatus enum values, so the validated target is safe to narrow.
  const toStatus = next.value as HabitStatus;
  await prisma.$transaction(async (tx) => {
    await tx.habit.update({ where: { id }, data: { status: toStatus } });
    await tx.habitTransition.create({
      data: {
        habitId: id,
        fromStatus: habit.status,
        toStatus,
        reason,
        actorId: ctx.user.id,
      },
    });
  });

  revalidatePath(BACK);
  redirect(BACK);
}

// Record a daily check-in (RF5.4): done / occurrence / skipped, optional note,
// optionally back-dated. One row per calendar day (re-recording replaces it).
export async function checkinHabit(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const result = resultSchema.safeParse(formData.get("result"));
  if (!result.success) backWithError(BACK, "CHECKIN_INVALID");

  const noteRaw = formData.get("note");
  const note =
    typeof noteRaw === "string" && noteRaw.trim().length > 0 ? noteRaw.trim().slice(0, 200) : null;

  const today = todayUtc();
  let date = today;
  const dateParsed = dateSchema.safeParse(formData.get("date"));
  if (dateParsed.success) {
    const candidate = new Date(`${dateParsed.data}T00:00:00Z`);
    // Only the recent past up to today — no future check-ins.
    if (candidate > today || candidate < new Date(today.getTime() - MAX_BACKDATE_DAYS * DAY_MS)) {
      backWithError(BACK, "CHECKIN_INVALID");
    }
    date = candidate;
  }

  await requireOwnHabit(id, ctx.workspace.id);

  await prisma.habitCheckin.upsert({
    where: { habitId_date: { habitId: id, date } },
    create: { habitId: id, date, result: result.data, note },
    update: { result: result.data, note, validatedBy: null },
  });

  revalidatePath(BACK);
  redirect(BACK);
}

// A team witness validates a check-in (RF5.4): stamps it with their id.
export async function validateCheckin(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const checkinId = z.uuid().parse(formData.get("checkinId"));

  const checkin = await prisma.habitCheckin.findUnique({
    where: { id: checkinId },
    select: { id: true, habit: { select: { workspaceId: true, witnessId: true } } },
  });
  if (!checkin || checkin.habit.workspaceId !== ctx.workspace.id) backWithError(BACK, "NOT_FOUND");
  if (checkin.habit.witnessId !== ctx.user.id) backWithError(BACK, "HABIT_NOT_WITNESS");

  await prisma.habitCheckin.update({
    where: { id: checkinId },
    data: { validatedBy: ctx.user.id },
  });
  revalidatePath(BACK);
  redirect(BACK);
}

// Attempting to change the verification rule mid-cycle is always rejected
// (RF5.5). Renegotiation happens by opening a new habit version (M8, later).
export async function renegotiateVerificationRule(formData: FormData) {
  const ctx = await getWorkspaceContext();
  const id = z.uuid().parse(formData.get("id"));
  const habit = await requireOwnHabit(id, ctx.workspace.id);
  if (habit.status !== "overcome") backWithError(BACK, "VERIFICATION_RULE_IMMUTABLE");
  // Once overcome the cycle is closed; versioned renegotiation lands with M8.
  backWithError(BACK, "VERIFICATION_RULE_IMMUTABLE");
}
