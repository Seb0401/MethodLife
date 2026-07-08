import { prisma } from "@/lib/prisma";
import {
  computeFlowMetrics,
  type FlowMetrics,
  type TransitionInput,
} from "@/domain/kanban/metrics";

// Reads a project's transition log and reduces it to flow metrics (RF3.4/3.5).
// Shared by the project page and the Markdown report route so the derivation
// lives in one place.
export async function loadFlowMetrics(projectId: string): Promise<FlowMetrics> {
  const transitions = await prisma.taskTransition.findMany({
    where: { task: { projectId } },
    select: { taskId: true, toStatus: true, at: true },
  });

  const byTask = new Map<string, TransitionInput[]>();
  for (const tr of transitions) {
    const list = byTask.get(tr.taskId) ?? [];
    list.push({ toStatus: tr.toStatus, at: tr.at.getTime() });
    byTask.set(tr.taskId, list);
  }

  return computeFlowMetrics(
    [...byTask.entries()].map(([taskId, transitions]) => ({ taskId, transitions })),
    { days: 14, now: Date.now() },
  );
}
