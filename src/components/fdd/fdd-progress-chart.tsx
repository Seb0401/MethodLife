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
import type { WeeklyPoint } from "@/domain/fdd/weekly";
import { es } from "@/lib/i18n/es";

function label(weekEnd: string): string {
  const d = new Date(`${weekEnd}T00:00:00Z`);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

// Weekly cumulative completion (RF4.4).
export function FddProgressChart({ series }: { series: WeeklyPoint[] }) {
  const data = series.map((p) => ({ label: label(p.weekEnd), [es.fdd.chartAxis]: p.percent }));

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-neutral-500">{es.fdd.chartSubtitle}</span>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
            <YAxis
              domain={[0, 100]}
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
              dataKey={es.fdd.chartAxis}
              stroke="#16a34a"
              dot={{ r: 2 }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
