// Default Kanban board layout created with a new kanban project (prepares 1.5).
// Only the structure lives here; the Spanish column names come from es.ts so
// the domain stays dependency-free.
export type DefaultColumn = { key: "todo" | "doing" | "done"; position: number; wipLimit?: number };

export const DEFAULT_KANBAN_COLUMNS: readonly DefaultColumn[] = [
  { key: "todo", position: 0 },
  { key: "doing", position: 1, wipLimit: 3 },
  { key: "done", position: 2 },
] as const;
