"use client";

import { useState } from "react";
import { createInvariant } from "@/actions/invariants";
import { Select, SubmitButton, TextInput } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

type Area = { id: string; name: string };
type RuleType = "wip_max" | "area_min_per_week";

// Create form for a workspace invariant. The rule type switches which fields
// apply; the server action validates the final shape against the DSL.
export function InvariantForm({ areas }: { areas: Area[] }) {
  const [type, setType] = useState<RuleType>("wip_max");
  const canUseArea = areas.length > 0;

  return (
    <form
      action={createInvariant}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <h2 className="text-lg font-semibold">{es.invariants.newTitle}</h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">{es.invariants.name}</span>
        <TextInput
          name="name"
          placeholder={es.invariants.namePlaceholder}
          required
          maxLength={120}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">{es.invariants.type}</span>
        <Select name="type" value={type} onChange={(e) => setType(e.target.value as RuleType)}>
          <option value="wip_max">{es.invariants.types.wip_max}</option>
          {canUseArea && (
            <option value="area_min_per_week">{es.invariants.types.area_min_per_week}</option>
          )}
        </Select>
      </label>

      {type === "wip_max" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">{es.invariants.max}</span>
          <TextInput name="max" type="number" min={0} max={999} defaultValue={3} required />
        </label>
      ) : (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-neutral-500">{es.invariants.area}</span>
            <Select name="areaId" required>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">{es.invariants.min}</span>
            <TextInput name="min" type="number" min={0} max={999} defaultValue={1} required />
          </label>
        </div>
      )}

      <div>
        <SubmitButton>{es.invariants.create}</SubmitButton>
      </div>
    </form>
  );
}
