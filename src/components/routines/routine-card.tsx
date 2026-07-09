import Link from "next/link";
import type {
  Routine,
  RoutineVersion,
  RoutineRequirement,
  RoutineEvaluation,
} from "@prisma/client";
import {
  addRequirement,
  deleteRequirement,
  evaluateRequirement,
  deleteRoutine,
} from "@/actions/routines";
import { CloseVersionForm } from "@/components/routines/close-version-form";
import {
  compliancePercent,
  consolidateResults,
  type EvaluationResult,
} from "@/domain/routines/evaluation";
import { SubmitButton, TextInput } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

type EvalRow = Pick<RoutineEvaluation, "evaluatorId" | "date" | "result">;
type ReqWithEvals = RoutineRequirement & { evaluations: EvalRow[] };
type VersionWithReqs = RoutineVersion & { requirements: ReqWithEvals[] };
type RoutineWithVersions = Routine & { versions: VersionWithReqs[] };

function todayKey(): string {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

// Per-requirement consolidated stats (RF8.6): compliance across evaluated days
// and today's consolidated result, plus the current user's own vote today.
function reqStats(evaluations: EvalRow[], today: string, userId: string) {
  const byDay = new Map<string, EvaluationResult[]>();
  let mine: EvaluationResult | undefined;
  for (const e of evaluations) {
    const key = e.date.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(e.result);
    byDay.set(key, list);
    if (key === today && e.evaluatorId === userId) mine = e.result;
  }
  const consolidatedDays = [...byDay.values()].map(consolidateResults);
  return {
    percent: compliancePercent(consolidatedDays),
    today: byDay.has(today) ? consolidateResults(byDay.get(today) as EvaluationResult[]) : null,
    mine,
  };
}

export function RoutineCard({
  routine,
  currentUserId,
}: {
  routine: RoutineWithVersions;
  currentUserId: string;
}) {
  const today = todayKey();

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{routine.name}</h2>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
          {es.routines.kinds[routine.prototypeKind]}
        </span>
        <Link
          href={`/rutinas/${routine.id}/informe`}
          prefetch={false}
          className="ml-auto text-xs text-neutral-500 hover:underline"
        >
          {es.routines.downloadReport}
        </Link>
        <form action={deleteRoutine}>
          <input type="hidden" name="id" value={routine.id} />
          <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
            {es.routines.deleteRoutine}
          </button>
        </form>
      </header>

      <div className="flex flex-col gap-4">
        {routine.versions.map((version) => {
          const isOpen = version.closedAt === null;
          return (
            <div
              key={version.id}
              className="flex flex-col gap-2 rounded-md border border-neutral-100 p-3 dark:border-neutral-800"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">
                  {es.routines.version} {version.number}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isOpen
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800"
                  }`}
                >
                  {isOpen ? es.routines.open : es.routines.closed}
                </span>
                {version.decision && (
                  <span className="text-xs text-neutral-500">
                    {es.routines.decisionLabel}: {es.routines.decisions[version.decision]}
                  </span>
                )}
              </div>

              {version.requirements.length === 0 ? (
                <p className="text-sm text-neutral-500">{es.routines.noRequirements}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {version.requirements.map((req) => {
                    const stats = reqStats(req.evaluations, today, currentUserId);
                    return (
                      <li
                        key={req.id}
                        className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2 text-sm dark:border-neutral-800"
                      >
                        <span>{req.text}</span>
                        {req.inheritedFrom && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {es.routines.inherited}
                          </span>
                        )}
                        <span className="text-xs text-neutral-400">
                          {es.routines.compliance}: {stats.percent}%
                        </span>

                        {isOpen ? (
                          <div className="ml-auto flex items-center gap-1">
                            {(["met", "not_met"] as const).map((r) => (
                              <form key={r} action={evaluateRequirement}>
                                <input type="hidden" name="requirementId" value={req.id} />
                                <button
                                  type="submit"
                                  name="result"
                                  value={r}
                                  className={`rounded-md border px-2 py-1 text-xs ${
                                    stats.mine === r
                                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                                      : "border-neutral-300 dark:border-neutral-700"
                                  }`}
                                >
                                  {es.routines.results[r]}
                                </button>
                              </form>
                            ))}
                            <span className="text-xs text-neutral-400">
                              {stats.today
                                ? `${es.routines.consolidated}: ${es.routines.results[stats.today]}`
                                : es.routines.noConsolidation}
                            </span>
                            <form action={deleteRequirement}>
                              <input type="hidden" name="id" value={req.id} />
                              <button
                                type="submit"
                                className="text-xs text-neutral-300 hover:text-red-600"
                              >
                                ✕
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              {isOpen && (
                <>
                  <form action={addRequirement} className="flex gap-1">
                    <input type="hidden" name="versionId" value={version.id} />
                    <TextInput
                      name="text"
                      placeholder={es.routines.requirementPlaceholder}
                      required
                      maxLength={200}
                      className="flex-1 text-sm"
                    />
                    <SubmitButton variant="subtle">{es.routines.addRequirement}</SubmitButton>
                  </form>
                  <CloseVersionForm
                    versionId={version.id}
                    requirements={version.requirements.map((r) => ({ id: r.id, text: r.text }))}
                  />
                </>
              )}

              {!isOpen && version.justification && (
                <p className="text-xs text-neutral-500">{version.justification}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
