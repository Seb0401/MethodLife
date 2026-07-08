// Global search & filtering (RF1.8, RF3.6). Pure matching logic so both the
// global search page and the board filter share one source of truth and are
// unit-tested. The server resolves each task's area (via project/goal) before
// filtering, since tasks link to an area only indirectly.
import type { TaskStatus } from "../kanban/status";

export type TaskPriority = "low" | "medium" | "high";

// Optional filters; an absent field means "don't filter by it".
export type TaskFilter = {
  text?: string;
  areaId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
};

export type FilterableTask = {
  title: string;
  description: string | null;
  areaId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
};

// Lowercase and strip accents (the combining marks left by NFD) so "diseño"
// matches "diseno"/"DISEÑO".
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function matchesFilter(task: FilterableTask, filter: TaskFilter): boolean {
  if (filter.status && task.status !== filter.status) return false;
  if (filter.priority && task.priority !== filter.priority) return false;
  if (filter.areaId && task.areaId !== filter.areaId) return false;

  const text = filter.text?.trim();
  if (text) {
    const needle = normalizeText(text);
    const haystack = normalizeText(`${task.title} ${task.description ?? ""}`);
    if (!haystack.includes(needle)) return false;
  }

  return true;
}
