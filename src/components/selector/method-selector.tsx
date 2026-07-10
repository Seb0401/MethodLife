"use client";

import { useState } from "react";
import { recommendMethod, type Method, type SelectorAnswers } from "@/domain/selector/recommend";
import { PROJECT_METHODS, isMethodActive } from "@/domain/projects/method";
import { Select } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

const DEFAULTS: SelectorAnswers = {
  hasDeadline: false,
  workMode: "continuous",
  isLargeLongTerm: false,
  people: 1,
  stableRequirements: false,
};

// Optional questionnaire (RF9.1) that recommends a method live (RF9.2) and
// pre-selects it, while leaving the method dropdown user-overridable. The named
// inputs are submitted with the create form; `selectorUsed` tells the server to
// record a decision.
export function MethodSelector({ defaultMethod = "kanban" as Method }) {
  const [used, setUsed] = useState(false);
  const [answers, setAnswers] = useState<SelectorAnswers>(DEFAULTS);
  const [method, setMethod] = useState<Method>(defaultMethod);

  const rec = used ? recommendMethod(answers) : null;

  function patch(next: Partial<SelectorAnswers>) {
    const merged = { ...answers, ...next };
    setAnswers(merged);
    setUsed(true);
    setMethod(recommendMethod(merged).method);
  }

  const checkbox = (
    key: "hasDeadline" | "isLargeLongTerm" | "stableRequirements",
    label: string,
  ) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={key}
        checked={answers[key]}
        onChange={(e) => patch({ [key]: e.target.checked } as Partial<SelectorAnswers>)}
      />
      {label}
    </label>
  );

  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <input type="hidden" name="selectorUsed" value={used ? "true" : "false"} />
      <p className="text-sm font-medium">{es.selector.title}</p>
      <p className="text-xs text-neutral-500">{es.selector.hint}</p>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {checkbox("hasDeadline", es.selector.questions.deadline)}
        {checkbox("isLargeLongTerm", es.selector.questions.largeLongTerm)}
        {checkbox("stableRequirements", es.selector.questions.requirements)}
        <label className="flex items-center gap-2 text-sm">
          {es.selector.questions.workMode}
          <Select
            name="workMode"
            value={answers.workMode}
            onChange={(e) => patch({ workMode: e.target.value as SelectorAnswers["workMode"] })}
            className="text-xs"
          >
            <option value="continuous">{es.selector.questions.workModeOptions.continuous}</option>
            <option value="deliverables">
              {es.selector.questions.workModeOptions.deliverables}
            </option>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {es.selector.questions.people}
          <input
            type="number"
            name="people"
            min={1}
            max={50}
            value={answers.people}
            onChange={(e) => patch({ people: Number(e.target.value) || 1 })}
            className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
      </div>

      {rec && (
        <div className="rounded-md bg-neutral-50 p-2 text-xs dark:bg-neutral-900">
          <p className="font-medium">
            {es.selector.recommended}: {es.projects.methods[rec.method]}
          </p>
          <ul className="mt-1 flex flex-col gap-0.5 text-neutral-500">
            {rec.reasons.map((r) => (
              <li key={r.key}>
                {es.selector.criteria[r.key]} → {es.selector.favors} {es.projects.methods[r.favors]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">{es.projects.method}</span>
        <Select name="method" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
          {PROJECT_METHODS.map((m) => (
            <option key={m} value={m} disabled={!isMethodActive(m)}>
              {es.projects.methods[m]}
              {isMethodActive(m) ? "" : ` ${es.projects.methodSoon}`}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
