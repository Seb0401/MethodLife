"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FlowMetrics } from "@/domain/kanban/metrics";
import { es } from "@/lib/i18n/es";

const t = es.kanban.metrics;

// Coarse duration formatting for the summary cards (e.g. "2d 3h", "45min").
function formatDuration(ms: number | null): string {
  if (ms == null) return t.na;
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}${t.units.m}`;
  const totalHours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (totalHours < 24) {
    return min ? `${totalHours}${t.units.h} ${min}${t.units.m}` : `${totalHours}${t.units.h}`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours ? `${days}${t.units.d} ${hours}${t.units.h}` : `${days}${t.units.d}`;
}

// Buckets are UTC start-of-day epochs (see domain/kanban/metrics); read them in
// UTC so the label matches the day the metric was bucketed into.
function dayLabel(day: number): string {
  const d = new Date(day);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-[11px] leading-tight text-neutral-400">{hint}</span>}
    </div>
  );
}

export function MetricsPanel({ metrics }: { metrics: FlowMetrics }) {
  const data = metrics.throughput.map((b) => ({ label: dayLabel(b.day), count: b.count }));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="text-xs text-neutral-500">{t.subtitle}</p>
      </header>

      {metrics.completedCount === 0 ? (
        <p className="text-sm text-neutral-500">{t.empty}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label={t.completed} value={String(metrics.completedCount)} />
            <StatCard
              label={t.leadTime}
              value={formatDuration(metrics.avgLeadTimeMs)}
              hint={t.leadHint}
            />
            <StatCard
              label={t.cycleTime}
              value={formatDuration(metrics.avgCycleTimeMs)}
              hint={t.cycleHint}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-neutral-500">{t.throughputTitle}</span>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    opacity={0.5}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="currentColor"
                    opacity={0.5}
                  />
                  <Tooltip
                    cursor={{ fill: "currentColor", opacity: 0.05 }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => [String(value), t.throughputAxis]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
