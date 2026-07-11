import { Logo } from "@/components/brand/logo";
import { es } from "@/lib/i18n/es";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo className="size-12" />
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{es.app.name}</h1>
          <p className="max-w-xs text-sm text-muted">{es.app.tagline}</p>
        </div>
      </div>
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6">
        {children}
      </div>
    </main>
  );
}
