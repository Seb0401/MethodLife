import { es } from "@/lib/i18n/es";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">{es.app.name}</h1>
      <p className="max-w-md text-center text-lg text-neutral-500">{es.app.tagline}</p>
      <span className="rounded-full border border-neutral-300 px-4 py-1 text-sm text-neutral-500 dark:border-neutral-700">
        {es.home.status}
      </span>
    </main>
  );
}
