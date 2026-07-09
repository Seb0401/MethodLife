"use client";

import { useState } from "react";
import { closeVersion } from "@/actions/routines";
import { Select, SubmitButton, TextArea } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

type Requirement = { id: string; text: string };
type Decision = "evolve" | "discard" | "approve";

// Close-version form (RF8.4). For an "evolve" decision it reveals the current
// requirements as checkboxes to carry into the next version.
export function CloseVersionForm({
  versionId,
  requirements,
}: {
  versionId: string;
  requirements: Requirement[];
}) {
  const [decision, setDecision] = useState<Decision>("evolve");

  return (
    <form
      action={closeVersion}
      className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
    >
      <p className="font-medium">{es.routines.closeTitle}</p>
      <input type="hidden" name="versionId" value={versionId} />

      <label className="flex flex-col gap-1">
        <span className="text-neutral-500">{es.routines.decision}</span>
        <Select
          name="decision"
          value={decision}
          onChange={(e) => setDecision(e.target.value as Decision)}
        >
          <option value="evolve">{es.routines.decisions.evolve}</option>
          <option value="discard">{es.routines.decisions.discard}</option>
          <option value="approve">{es.routines.decisions.approve}</option>
        </Select>
      </label>

      {decision === "evolve" && requirements.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-neutral-500">{es.routines.inheritLabel}</legend>
          {requirements.map((r) => (
            <label key={r.id} className="flex items-center gap-2">
              <input type="checkbox" name="inherit" value={r.id} defaultChecked />
              <span>{r.text}</span>
            </label>
          ))}
        </fieldset>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-neutral-500">{es.routines.justification}</span>
        <TextArea
          name="justification"
          rows={2}
          required
          maxLength={500}
          placeholder={es.routines.justificationPlaceholder}
        />
      </label>

      <div>
        <SubmitButton variant="subtle">{es.routines.closeVersion}</SubmitButton>
      </div>
    </form>
  );
}
