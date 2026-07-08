"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { moveTask } from "@/actions/kanban";
import { createTaskInColumn, deleteTask, setTaskDueDate } from "@/actions/tasks";
import { addColumn, renameColumn, setColumnWip, deleteColumn } from "@/actions/kanban";
import { isDueToday, isOverdue } from "@/domain/tasks/today";
import { es } from "@/lib/i18n/es";

type Priority = "low" | "medium" | "high";
export type BoardTask = { id: string; title: string; priority: Priority; dueDate: string | null };
export type BoardColumn = { id: string; name: string; wipLimit: number | null; tasks: BoardTask[] };

type DueFilter = "" | "overdue" | "today" | "none";
type PriorityFilter = "" | Priority;

// "kanban" is the full board; "sprint" reuses it for the sprint board (RF2.4),
// hiding column management and card creation — cards arrive via sprint planning.
export type BoardVariant = "kanban" | "sprint";

const priorityStyles: Record<Priority, string> = {
  low: "text-neutral-400",
  medium: "text-amber-500",
  high: "text-red-500",
};

// A calendar-date string ("YYYY-MM-DD") as UTC midnight, matching @db.Date.
function parseDue(due: string): Date {
  return new Date(`${due}T00:00:00Z`);
}

function dueLabel(due: string): string {
  const d = parseDue(due);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function taskMatches(
  task: BoardTask,
  priority: PriorityFilter,
  due: DueFilter,
  now: Date,
): boolean {
  if (priority && task.priority !== priority) return false;
  if (due === "none") return task.dueDate === null;
  if (due === "overdue") return task.dueDate !== null && isOverdue(parseDue(task.dueDate), now);
  if (due === "today") return task.dueDate !== null && isDueToday(parseDue(task.dueDate), now);
  return true;
}

function Card({ task, projectId }: { task: BoardTask; projectId: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const overdue = task.dueDate !== null && isOverdue(parseDue(task.dueDate), new Date());
  const back = `/proyectos/${projectId}`;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className="group flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-2 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="flex-1 cursor-grab text-left active:cursor-grabbing"
          aria-label={task.title}
        >
          <span className={`mr-1 ${priorityStyles[task.priority]}`}>●</span>
          {task.title}
        </button>
        <div className="flex items-center gap-1">
          <DueDatePopover taskId={task.id} back={back} value={task.dueDate} />
          <form action={deleteTask}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="redirectTo" value={back} />
            <button
              type="submit"
              className="text-xs text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
              aria-label={es.tasks.delete}
            >
              ✕
            </button>
          </form>
        </div>
      </div>
      {task.dueDate && (
        <span className={`text-[11px] ${overdue ? "text-red-600" : "text-neutral-400"}`}>
          {dueLabel(task.dueDate)}
          {overdue ? ` · ${es.tasks.overdue}` : ""}
        </span>
      )}
    </div>
  );
}

function DueDatePopover({
  taskId,
  back,
  value,
}: {
  taskId: string;
  back: string;
  value: string | null;
}) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none text-xs text-neutral-300 hover:text-neutral-600">
        📅
      </summary>
      <div className="absolute right-0 z-10 mt-1 flex w-44 flex-col gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <form action={setTaskDueDate} className="flex flex-col gap-1">
          <input type="hidden" name="id" value={taskId} />
          <input type="hidden" name="redirectTo" value={back} />
          <input
            type="date"
            name="dueDate"
            defaultValue={value ?? ""}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            {es.tasks.setDue}
          </button>
        </form>
        {value && (
          <form action={setTaskDueDate}>
            <input type="hidden" name="id" value={taskId} />
            <input type="hidden" name="redirectTo" value={back} />
            <input type="hidden" name="dueDate" value="" />
            <button
              type="submit"
              className="w-full text-left text-xs text-neutral-400 hover:text-red-600"
            >
              {es.tasks.clearDue}
            </button>
          </form>
        )}
      </div>
    </details>
  );
}

function ColumnSettings({ projectId, col }: { projectId: string; col: BoardColumn }) {
  return (
    <details className="relative text-sm">
      <summary className="cursor-pointer list-none text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
        ⋯
      </summary>
      <div className="absolute right-0 z-10 mt-1 flex w-56 flex-col gap-2 rounded-md border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        <form action={renameColumn} className="flex flex-col gap-1">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="columnId" value={col.id} />
          <input
            name="name"
            defaultValue={col.name}
            required
            maxLength={60}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            {es.kanban.renameColumn}
          </button>
        </form>
        <form action={setColumnWip} className="flex items-end gap-1">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="columnId" value={col.id} />
          <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
            {es.kanban.wipLabel}
            <input
              name="wipLimit"
              type="number"
              min={1}
              max={999}
              defaultValue={col.wipLimit ?? ""}
              placeholder={es.kanban.wipNone}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            {es.kanban.setWip}
          </button>
        </form>
        <form action={deleteColumn}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="columnId" value={col.id} />
          <button
            type="submit"
            className="w-full rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:text-red-300"
          >
            {es.kanban.deleteColumn}
          </button>
        </form>
      </div>
    </details>
  );
}

function Column({
  col,
  projectId,
  visibleTasks,
  variant,
}: {
  col: BoardColumn;
  projectId: string;
  visibleTasks: BoardTask[];
  variant: BoardVariant;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const count = col.tasks.length;
  const full = col.wipLimit != null && count >= col.wipLimit;

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
      <header className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold">{col.name}</h3>
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs ${
            full
              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
              : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800"
          }`}
        >
          {count}
          {col.wipLimit != null ? `/${col.wipLimit}` : ""}
        </span>
        {variant === "kanban" && (
          <div className="ml-auto">
            <ColumnSettings projectId={projectId} col={col} />
          </div>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={`flex min-h-16 flex-col gap-2 rounded-md p-1 transition ${
          isOver ? "bg-blue-50 dark:bg-blue-950/40" : ""
        }`}
      >
        {visibleTasks.map((task) => (
          <Card key={task.id} task={task} projectId={projectId} />
        ))}
      </div>

      {variant === "kanban" && (
        <form action={createTaskInColumn} className="flex flex-col gap-1 px-1">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="columnId" value={col.id} />
          <input
            name="title"
            placeholder={es.tasks.newCard}
            maxLength={200}
            required
            className="rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <div className="flex gap-1">
            <select
              name="priority"
              defaultValue="medium"
              className="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="low">{es.tasks.priorities.low}</option>
              <option value="medium">{es.tasks.priorities.medium}</option>
              <option value="high">{es.tasks.priorities.high}</option>
            </select>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
            >
              {es.tasks.add}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function KanbanBoard({
  projectId,
  columns,
  variant = "kanban",
}: {
  projectId: string;
  columns: BoardColumn[];
  variant?: BoardVariant;
}) {
  const [cols, setCols] = useState(columns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("");
  const [dueFilter, setDueFilter] = useState<DueFilter>("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const router = useRouter();
  // The parent remounts this component (via a data-derived `key`) whenever the
  // server sends fresh data, so local state starts from the server truth. An
  // optimistic move never changes the props, so it never triggers a remount.

  // Realtime (RF12.4): subscribe to task changes and refresh when a teammate
  // touches a card on THIS board. Realtime honours RLS, so we only receive
  // events for our own workspaces; we scope further to this board's columns.
  const columnKey = columns.map((c) => c.id).join(",");
  useEffect(() => {
    const columnIds = new Set(columnKey.split(","));
    const supabase = createClient();
    const channel = supabase
      .channel(`board:${columnIds.values().next().value}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        const row = (payload.new ?? payload.old) as { column_id?: string | null };
        if (row?.column_id && columnIds.has(row.column_id)) router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [columnKey, router]);

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    setActiveId(null);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;

    const source = cols.find((c) => c.tasks.some((t) => t.id === taskId));
    const dest = cols.find((c) => c.id === overId);
    if (!source || !dest || source.id === dest.id) return;

    const task = source.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const snapshot = cols;
    const toIndex = dest.tasks.length;
    setError(null);
    setCols((prev) =>
      prev.map((c) => {
        if (c.id === source.id) return { ...c, tasks: c.tasks.filter((t) => t.id !== taskId) };
        if (c.id === dest.id) return { ...c, tasks: [...c.tasks, task] };
        return c;
      }),
    );

    const res = await moveTask({ taskId, toColumnId: dest.id, toIndex });
    if (!res.ok) {
      setCols(snapshot);
      setError(
        es.actionErrors[res.error as keyof typeof es.actionErrors] ?? es.actionErrors.GENERIC,
      );
    }
  }

  const activeTask = activeId
    ? (cols.flatMap((c) => c.tasks).find((t) => t.id === activeId) ?? null)
    : null;

  const now = new Date();
  const filtering = priorityFilter !== "" || dueFilter !== "";
  const selectClass =
    "rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          className={selectClass}
          aria-label={es.kanban.filter.priority}
        >
          <option value="">{es.kanban.filter.anyPriority}</option>
          <option value="high">{es.tasks.priorities.high}</option>
          <option value="medium">{es.tasks.priorities.medium}</option>
          <option value="low">{es.tasks.priorities.low}</option>
        </select>
        <select
          value={dueFilter}
          onChange={(e) => setDueFilter(e.target.value as DueFilter)}
          className={selectClass}
          aria-label={es.kanban.filter.due}
        >
          <option value="">{es.kanban.filter.anyDue}</option>
          <option value="overdue">{es.kanban.filter.overdue}</option>
          <option value="today">{es.kanban.filter.today}</option>
          <option value="none">{es.kanban.filter.none}</option>
        </select>
        {filtering && (
          <button
            type="button"
            onClick={() => {
              setPriorityFilter("");
              setDueFilter("");
            }}
            className="text-xs text-neutral-500 hover:underline"
          >
            {es.kanban.filter.cleared}
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {cols.map((col) => (
            <Column
              key={col.id}
              col={col}
              projectId={projectId}
              variant={variant}
              visibleTasks={col.tasks.filter((t) => taskMatches(t, priorityFilter, dueFilter, now))}
            />
          ))}

          {variant === "kanban" && (
            <form
              action={addColumn}
              className="flex h-fit w-56 shrink-0 flex-col gap-1 rounded-lg border border-dashed border-neutral-300 p-2 dark:border-neutral-700"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <input
                name="name"
                placeholder={es.kanban.columnName}
                required
                maxLength={60}
                className="rounded-md border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
              >
                {es.kanban.addColumn}
              </button>
            </form>
          )}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rounded-md border border-neutral-300 bg-white p-2 text-sm shadow-lg dark:border-neutral-600 dark:bg-neutral-900">
              <span className={`mr-1 ${priorityStyles[activeTask.priority]}`}>●</span>
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
