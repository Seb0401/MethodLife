import { createHabit } from "@/actions/habits";
import { SubmitButton, TextInput, Select } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

type Member = { userId: string; name: string };

// Register a habit (RF5.1) with its immutable verification proof (RF5.5) and an
// optional team witness (RF5.4). Server-rendered: no conditional interactivity.
export function HabitForm({ witnesses }: { witnesses: Member[] }) {
  return (
    <form
      action={createHabit}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <h2 className="text-lg font-semibold">{es.habits.newTitle}</h2>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-[2] flex-col gap-1 text-sm">
          <span className="text-neutral-500">{es.habits.name}</span>
          <TextInput name="name" placeholder={es.habits.namePlaceholder} required maxLength={120} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-neutral-500">{es.habits.severity}</span>
          <Select name="severity" defaultValue="medium">
            <option value="low">{es.habits.severities.low}</option>
            <option value="medium">{es.habits.severities.medium}</option>
            <option value="high">{es.habits.severities.high}</option>
          </Select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">{es.habits.trigger}</span>
        <TextInput name="triggerText" placeholder={es.habits.triggerPlaceholder} maxLength={200} />
      </label>

      <fieldset className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
        <legend className="px-1 text-xs font-medium text-neutral-500">
          {es.habits.verificationTitle}
        </legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-neutral-500">{es.habits.windowDays}</span>
            <TextInput
              name="windowDays"
              type="number"
              min={1}
              max={90}
              defaultValue={14}
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-neutral-500">{es.habits.tolerance}</span>
            <TextInput name="tolerance" type="number" min={0} max={89} defaultValue={2} required />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-neutral-500">{es.habits.analysisDays}</span>
            <TextInput
              name="analysisDays"
              type="number"
              min={0}
              max={90}
              defaultValue={7}
              required
            />
          </label>
        </div>
        <p className="text-[11px] text-neutral-400">{es.habits.verificationHint}</p>
      </fieldset>

      {witnesses.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">{es.habits.witness}</span>
          <Select name="witnessId" defaultValue="">
            <option value="">{es.habits.noWitness}</option>
            {witnesses.map((w) => (
              <option key={w.userId} value={w.userId}>
                {w.name}
              </option>
            ))}
          </Select>
        </label>
      )}

      <div>
        <SubmitButton>{es.habits.create}</SubmitButton>
      </div>
    </form>
  );
}
