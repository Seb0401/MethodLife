import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "text-foreground",
  accent: "text-accent-hover",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-red-400",
} as const;

// Compact metric tile: a big number with a label, used in dashboard headers.
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof tones;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-faint">{label}</span>
        {icon && <span className={tones[tone]}>{icon}</span>}
      </div>
      <span className={cn("text-3xl font-bold tabular-nums", tones[tone])}>{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
