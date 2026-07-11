import { cn } from "@/lib/cn";
import { es } from "@/lib/i18n/es";

// The MethodLife mark: an ascending path linking three nodes inside a rounded
// indigo→violet tile. It reads as "progress guided by method", echoing the
// dependency graphs and state machines the app is built around.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      role="img"
      aria-label={es.app.name}
      fill="none"
    >
      <defs>
        <linearGradient id="ml-logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#ml-logo-g)" />
      <path
        d="M7 22 L13 15 L19 19 L25 10"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="22" r="1.9" fill="white" />
      <circle cx="19" cy="19" r="1.9" fill="white" />
      <circle cx="25" cy="10" r="2.7" fill="white" />
    </svg>
  );
}

// Logo + wordmark, for the sidebar and auth screens.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo className="size-7" />
      <span className="text-lg font-bold tracking-tight text-foreground">{es.app.name}</span>
    </span>
  );
}
