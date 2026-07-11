"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ActivityBucket } from "@/lib/dashboard/summary";
import { es } from "@/lib/i18n/es";

const t = es.dashboard.activity;

export function ActivityChart({ data }: { data: ActivityBucket[] }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            opacity={0.4}
          />
          <Tooltip
            cursor={{ fill: "currentColor", opacity: 0.05 }}
            contentStyle={{
              background: "#1c1c21",
              border: "1px solid #27272a",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [
              String(value),
              name === "tasksDone" ? t.tasksDone : t.checkins,
            ]}
          />
          <Bar dataKey="tasksDone" fill="#6366f1" radius={[3, 3, 0, 0]} />
          <Bar dataKey="checkins" fill="#a78bfa" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
