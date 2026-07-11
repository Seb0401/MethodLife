import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = {
  neutral: "bg-elevated text-muted border-border",
  accent: "bg-accent-subtle text-accent-hover border-accent-muted",
  success: "bg-emerald-950/60 text-emerald-300 border-emerald-900",
  warning: "bg-amber-950/60 text-amber-300 border-amber-900",
  danger: "bg-red-950/60 text-red-300 border-red-900",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export function Badge({
  variant = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
    />
  );
}
