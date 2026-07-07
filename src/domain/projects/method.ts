// Project methods (M9). The column stores every method, but only some are
// wired up in the current roadmap phase (ROADMAP Fase 1 note on 1.3).
export const PROJECT_METHODS = ["scrum", "kanban", "fdd", "simple"] as const;
export type ProjectMethod = (typeof PROJECT_METHODS)[number];

// Methods with a working board/flow today. scrum arrives in Fase 2, fdd in Fase 4.
export const ACTIVE_METHODS: readonly ProjectMethod[] = ["kanban", "simple"] as const;

export function isMethodActive(method: ProjectMethod): boolean {
  return ACTIVE_METHODS.includes(method);
}
