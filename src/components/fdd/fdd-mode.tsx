import { prisma } from "@/lib/prisma";
import { loadMachine } from "@/lib/formal/load-machine";
import { FEATURE_MACHINE_KEY } from "@/domain/formal/machines";
import { nextTransitions } from "@/domain/formal/machine";
import { weightedProgressPercent, doneCount, type FeatureStatus } from "@/domain/fdd/progress";
import { weeklyCompletion } from "@/domain/fdd/weekly";
import {
  createFeatureSet,
  createFeature,
  transitionFeature,
  addFeatureTask,
  deleteFeature,
  deleteFeatureSet,
} from "@/actions/fdd";
import { FddProgressChart } from "@/components/fdd/fdd-progress-chart";
import { SubmitButton, TextInput, Select } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

const statusStyles: Record<FeatureStatus, string> = {
  design: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  design_reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  build: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  build_reviewed: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  done: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export async function FddMode({
  projectId,
  goalId,
  workspaceId,
}: {
  projectId: string;
  goalId: string;
  workspaceId: string;
}) {
  const [sets, doneEvents, members, machine] = await Promise.all([
    prisma.featureSet.findMany({
      where: { goalId },
      orderBy: { position: "asc" },
      include: {
        features: {
          orderBy: { position: "asc" },
          include: {
            tasks: {
              select: { id: true, title: true, status: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    }),
    prisma.featureStatusEvent.findMany({
      where: { toStatus: "done", feature: { featureSet: { goalId } } },
      select: { featureId: true, at: true },
      orderBy: { at: "asc" },
    }),
    prisma.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true } }),
    loadMachine(FEATURE_MACHINE_KEY),
  ]);

  const profiles = await prisma.profile.findMany({
    where: { userId: { in: members.map((m) => m.userId) } },
    select: { userId: true, displayName: true },
  });
  const nameOf = new Map(profiles.map((p) => [p.userId, p.displayName]));

  const allFeatures = sets.flatMap((s) => s.features);
  const statuses = allFeatures.map((f) => f.status as FeatureStatus);
  const percent = weightedProgressPercent(statuses);

  // First date each feature reached done (events already ordered ascending).
  const firstDone = new Map<string, Date>();
  for (const e of doneEvents) if (!firstDone.has(e.featureId)) firstDone.set(e.featureId, e.at);
  const series = weeklyCompletion([...firstDone.values()], allFeatures.length, new Date(), 8);

  const eventLabels = es.fdd.events;

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{es.fdd.title}</h2>
          <span className="text-sm text-neutral-500">
            {es.fdd.doneOf
              .replace("{done}", String(doneCount(statuses)))
              .replace("{total}", String(allFeatures.length))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-sm font-medium">{percent}%</span>
        </div>
        <span className="text-xs text-neutral-500">{es.fdd.progress}</span>
      </header>

      {allFeatures.length > 0 && (
        <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <h3 className="text-sm font-semibold">{es.fdd.chartTitle}</h3>
          <FddProgressChart series={series} />
        </div>
      )}

      {sets.length === 0 ? (
        <p className="text-sm text-neutral-500">{es.fdd.emptySets}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sets.map((set) => (
            <div
              key={set.id}
              className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <header className="flex items-center gap-2">
                <h3 className="font-semibold">{set.name}</h3>
                <form action={deleteFeatureSet} className="ml-auto">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="id" value={set.id} />
                  <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
                    {es.fdd.deleteSet}
                  </button>
                </form>
              </header>

              {set.features.length === 0 ? (
                <p className="text-sm text-neutral-500">{es.fdd.emptyFeatures}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {set.features.map((f) => {
                    const events = machine
                      ? nextTransitions(machine, f.status).map((t) => t.event)
                      : [];
                    return (
                      <li
                        key={f.id}
                        className="flex flex-col gap-2 rounded-md border border-neutral-100 p-2 dark:border-neutral-800"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{f.title}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[f.status as FeatureStatus]}`}
                          >
                            {es.fdd.statuses[f.status as FeatureStatus]}
                          </span>
                          {f.estimate != null && (
                            <span className="text-xs text-neutral-400">
                              {es.fdd.estimate}: {f.estimate}
                            </span>
                          )}
                          {f.ownerId && (
                            <span className="text-xs text-neutral-400">
                              {nameOf.get(f.ownerId) ?? f.ownerId}
                            </span>
                          )}
                          <form action={deleteFeature} className="ml-auto">
                            <input type="hidden" name="projectId" value={projectId} />
                            <input type="hidden" name="id" value={f.id} />
                            <button
                              type="submit"
                              className="text-xs text-neutral-300 hover:text-red-600"
                            >
                              {es.fdd.deleteFeature}
                            </button>
                          </form>
                        </div>

                        {events.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {events.map((event) => (
                              <form key={event} action={transitionFeature}>
                                <input type="hidden" name="projectId" value={projectId} />
                                <input type="hidden" name="id" value={f.id} />
                                <input type="hidden" name="event" value={event} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                                >
                                  {eventLabels[event as keyof typeof eventLabels] ?? event}
                                </button>
                              </form>
                            ))}
                          </div>
                        )}

                        {f.tasks.length > 0 && (
                          <ul className="flex flex-col gap-0.5 pl-2 text-xs text-neutral-500">
                            {f.tasks.map((t) => (
                              <li key={t.id}>
                                <span className={t.status === "done" ? "line-through" : ""}>
                                  {t.status === "done" ? "☑ " : "• "}
                                  {t.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <form action={addFeatureTask} className="flex gap-1">
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="featureId" value={f.id} />
                          <TextInput
                            name="title"
                            placeholder={es.fdd.taskPlaceholder}
                            required
                            maxLength={200}
                            className="flex-1 text-xs"
                          />
                          <SubmitButton variant="subtle">{es.fdd.addTask}</SubmitButton>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form action={createFeature} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="featureSetId" value={set.id} />
                <TextInput
                  name="title"
                  placeholder={es.fdd.featureTitle}
                  required
                  maxLength={200}
                  className="flex-1"
                />
                <TextInput
                  name="estimate"
                  type="number"
                  min={1}
                  max={999}
                  placeholder={es.fdd.estimate}
                  className="w-20"
                />
                {members.length > 1 && (
                  <Select name="ownerId" defaultValue="">
                    <option value="">{es.fdd.noOwner}</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {nameOf.get(m.userId) ?? m.userId}
                      </option>
                    ))}
                  </Select>
                )}
                <SubmitButton variant="subtle">{es.fdd.addFeature}</SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}

      <form
        action={createFeatureSet}
        className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="goalId" value={goalId} />
        <TextInput
          name="name"
          placeholder={es.fdd.setName}
          required
          maxLength={120}
          className="flex-1"
        />
        <SubmitButton>{es.fdd.createSet}</SubmitButton>
      </form>
    </section>
  );
}
