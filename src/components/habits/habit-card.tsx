import type { Habit, HabitCheckin, HabitTransition } from "@prisma/client";
import { checkinHabit, transitionHabit, validateCheckin } from "@/actions/habits";
import { parseVerificationRule, evaluateVerification } from "@/domain/habits/verification";
import { analysisComplete, analysisDaysLeft } from "@/domain/habits/analysis";
import { es } from "@/lib/i18n/es";

type HabitWithHistory = Habit & { checkins: HabitCheckin[]; transitions: HabitTransition[] };

const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" });

const statusStyles: Record<Habit["status"], string> = {
  detected: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  analysis: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  correction: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  verification: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  overcome: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export function HabitCard({
  habit,
  nextEvents,
  witnessName,
  isWitness,
}: {
  habit: HabitWithHistory;
  nextEvents: string[];
  witnessName?: string;
  isWitness: boolean;
}) {
  const today = todayUtc();
  const rule = parseVerificationRule(habit.verificationRule);
  const progress = rule ? evaluateVerification(rule, habit.checkins, today) : null;
  const todayKey = today.toISOString().slice(0, 10);
  const todayCheckin = habit.checkins.find((c) => c.date.toISOString().slice(0, 10) === todayKey);

  // Baseline phase countdown (RF5.3), measured from the move into "analysis".
  const analysisStart = habit.transitions.filter((t) => t.toStatus === "analysis").at(-1)?.at;
  const analysisLeft = analysisStart
    ? analysisDaysLeft(analysisStart, habit.analysisDays, today)
    : habit.analysisDays;
  const analysisReady = analysisStart
    ? analysisComplete(analysisStart, habit.analysisDays, today)
    : false;

  const eventLabels = es.habits.events;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{habit.name}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[habit.status]}`}>
          {es.habits.statuses[habit.status]}
        </span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
          {es.habits.severities[habit.severity]}
        </span>
        {witnessName && (
          <span className="text-xs text-neutral-400">
            {es.habits.witness}: {witnessName}
          </span>
        )}
      </header>

      {habit.triggerText && (
        <p className="text-sm text-neutral-500">
          {es.habits.triggerLabel}: {habit.triggerText}
        </p>
      )}

      {/* Immutable verification proof (RF5.5) */}
      {rule && (
        <p className="text-sm">
          {es.habits.ruleSummary
            .replace("{done}", String(progress?.doneCount ?? 0))
            .replace("{required}", String(progress?.required ?? 0))
            .replace("{window}", String(rule.windowDays))}
          {progress && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                progress.passed
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
              }`}
            >
              {progress.passed ? es.habits.verificationPassed : es.habits.verificationPending}
            </span>
          )}
        </p>
      )}

      {habit.status === "analysis" && (
        <p className="text-sm text-blue-600 dark:text-blue-300">
          {analysisReady
            ? es.habits.analysisDone
            : es.habits.analysisLeft.replace("{n}", String(analysisLeft))}
        </p>
      )}

      {/* Today's check-in (RF5.4) */}
      {habit.status !== "overcome" && (
        <form action={checkinHabit} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={habit.id} />
          <span className="text-sm font-medium">{es.habits.checkinTitle}:</span>
          <input
            name="note"
            placeholder={es.habits.note}
            maxLength={200}
            className="min-w-32 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          {(["done", "occurrence", "skipped"] as const).map((r) => (
            <button
              key={r}
              type="submit"
              name="result"
              value={r}
              className={`rounded-md border px-2 py-1 text-xs ${
                todayCheckin?.result === r
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {es.habits.results[r]}
            </button>
          ))}
        </form>
      )}

      {/* Lifecycle transitions driven by the engine (RF5.2/6.5) */}
      {nextEvents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextEvents.map((event) => (
            <form key={event} action={transitionHabit}>
              <input type="hidden" name="id" value={habit.id} />
              <input type="hidden" name="event" value={event} />
              <button
                type="submit"
                className={`rounded-md border px-2 py-1 text-xs ${
                  event === "relapse"
                    ? "border-red-300 text-red-700 dark:border-red-900 dark:text-red-300"
                    : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {eventLabels[event as keyof typeof eventLabels] ?? event}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* History (RF5.7) */}
      <details className="text-sm">
        <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
          {es.habits.historyTitle}
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-neutral-500">{es.habits.checkinsTitle}</p>
            {habit.checkins.length === 0 ? (
              <p className="text-xs text-neutral-400">{es.habits.noCheckins}</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {habit.checkins.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-neutral-500">{dateFmt.format(c.date)}</span>
                    <span>{es.habits.results[c.result]}</span>
                    {c.validatedBy ? (
                      <span className="text-green-600">✓ {es.habits.validated}</span>
                    ) : (
                      isWitness && (
                        <form action={validateCheckin} className="inline">
                          <input type="hidden" name="checkinId" value={c.id} />
                          <button type="submit" className="text-neutral-400 hover:text-green-600">
                            {es.habits.validate}
                          </button>
                        </form>
                      )
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">{es.habits.transitionsTitle}</p>
            {habit.transitions.length === 0 ? (
              <p className="text-xs text-neutral-400">{es.habits.noTransitions}</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {habit.transitions.map((t) => (
                  <li key={t.id} className="text-xs text-neutral-500">
                    {t.fromStatus ? `${es.habits.statuses[t.fromStatus]} → ` : ""}
                    {es.habits.statuses[t.toStatus]}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
