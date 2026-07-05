import { es } from "@/lib/i18n/es";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold">{es.app.name}</h1>
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
        {children}
      </div>
    </main>
  );
}
