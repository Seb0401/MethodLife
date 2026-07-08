"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BurndownPoint } from "@/domain/scrum/burndown";
import { es } from "@/lib/i18n/es";

function dayLabel(day: number): string {
  const d = new Date(day);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export function BurndownChart({ series }: { series: BurndownPoint[] }) {
  const data = series.map((p) => ({
    label: dayLabel(p.day),
    [es.scrum.burndownRemaining]: p.remaining,
    [es.scrum.burndownIdeal]: p.ideal,
  }));

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{es.scrum.burndownSubtitle}</span>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              stroke="currentColor"
              opacity={0.5}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              labelStyle={{ color: "inherit" }}
              wrapperStyle={{ outline: "none" }}
            />
            <Line
              type="monotone"
              dataKey={es.scrum.burndownIdeal}
              stroke="#9ca3af"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey={es.scrum.burndownRemaining}
              stroke="#3b82f6"
              dot={{ r: 2 }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
