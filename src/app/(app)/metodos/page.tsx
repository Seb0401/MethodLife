import { METHOD_LIBRARY } from "@/domain/methods/library";
import { MethodComparator } from "@/components/methods/method-comparator";
import { es } from "@/lib/i18n/es";

export default function MethodsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.methods.title}</h1>
        <p className="text-sm text-neutral-500">{es.methods.subtitle}</p>
      </header>

      <MethodComparator />

      <div className="flex flex-col gap-3">
        {METHOD_LIBRARY.map((m) => (
          <article
            key={m.key}
            className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{m.name}</h2>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
                {m.family}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  m.executable
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800"
                }`}
              >
                {m.executable ? es.methods.executable : es.methods.reference}
              </span>
            </div>
            <p className="text-sm">{m.summary}</p>
            <p className="text-xs text-neutral-500">
              {es.methods.bestFor}: {m.bestFor}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
