import { Compass } from "lucide-react";
import { METHOD_LIBRARY } from "@/domain/methods/library";
import { MethodComparator } from "@/components/methods/method-comparator";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { es } from "@/lib/i18n/es";

export default function MethodsPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={es.methods.title}
        subtitle={es.methods.subtitle}
        icon={<Compass className="size-5" />}
      />

      <MethodComparator />

      <div className="grid gap-3 sm:grid-cols-2">
        {METHOD_LIBRARY.map((m) => (
          <Card key={m.key} className="flex flex-col gap-1.5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{m.name}</h2>
              <Badge>{m.family}</Badge>
              <Badge variant={m.executable ? "success" : "neutral"}>
                {m.executable ? es.methods.executable : es.methods.reference}
              </Badge>
            </div>
            <p className="text-sm text-foreground">{m.summary}</p>
            <p className="text-xs text-muted">
              {es.methods.bestFor}: {m.bestFor}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
