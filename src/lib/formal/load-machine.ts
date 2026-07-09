import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { parseMachine, type StateMachineDef } from "@/domain/formal/machine";

// Loads and parses a data-driven state machine by key (RF6.5). The engine reads
// these rows to decide transitions; cached per request so a page and its actions
// share one fetch.
export const loadMachine = cache(async (key: string): Promise<StateMachineDef | null> => {
  const row = await prisma.stateMachine.findUnique({ where: { key } });
  if (!row) return null;
  return parseMachine(row.key, row.states, row.transitions);
});
