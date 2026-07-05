import { es } from "@/lib/i18n/es";

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-neutral-500">{es.modulePlaceholder.body}</p>
    </div>
  );
}
