// Maps a board column (by its position) to the coarse task status used for
// metrics (RF3.4/3.5). The first column is backlog (todo), the last is done,
// anything in between is work in progress. Cycle time counts from the first
// in_progress transition; lead time from task creation to done.
export type TaskStatus = "todo" | "in_progress" | "done";

export function statusForColumn(position: number, columnCount: number): TaskStatus {
  if (columnCount <= 1 || position <= 0) return "todo";
  if (position >= columnCount - 1) return "done";
  return "in_progress";
}
