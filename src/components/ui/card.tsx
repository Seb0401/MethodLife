import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

// Surface container for grouped content. `interactive` adds a hover lift for
// cards that are links or click targets (e.g. project cards).
export function Card({
  className,
  interactive = false,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-card border border-border bg-surface",
        interactive &&
          "transition-colors transition-shadow hover:border-border-strong hover:bg-elevated hover:shadow-lg hover:shadow-black/20",
        className,
      )}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("flex flex-col gap-1 p-5 pb-3", className)} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 {...props} className={cn("text-base font-semibold text-foreground", className)} />;
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("p-5 pt-0", className)} />;
}
