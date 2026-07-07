// Small server-rendered form primitives shared by the module pages.
import type { ComponentProps } from "react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
      {message}
    </p>
  );
}

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
    />
  );
}

export function TextArea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
    />
  );
}

const buttonVariants = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-300",
  subtle:
    "border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900",
  danger:
    "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/60",
} as const;

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: keyof typeof buttonVariants;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={`rounded-md px-3 py-2 text-sm font-medium ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
