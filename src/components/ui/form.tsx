// Small server-rendered form primitives shared by the module pages.
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}

const fieldClasses =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground " +
  "placeholder:text-faint outline-none transition-colors " +
  "focus:border-accent focus:ring-2 focus:ring-accent/40";

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(fieldClasses, className)} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(fieldClasses, className)} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select {...props} className={cn(fieldClasses, className)} />;
}

const buttonVariants = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-sm shadow-accent/30",
  subtle: "border border-border text-muted hover:bg-elevated hover:text-foreground",
  danger: "border border-red-900 text-red-300 hover:bg-red-950/60",
} as const;

export function SubmitButton({
  children,
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof buttonVariants;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        buttonVariants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
