// Method recommendation engine (RF9.2). Explicit, rule-based (no ML): each
// questionnaire answer contributes points to one method and yields a reason.
// Pure — the UI and the server both call it; the server stores the result.

export type Method = "scrum" | "kanban" | "fdd" | "simple";

export type SelectorAnswers = {
  hasDeadline: boolean;
  workMode: "continuous" | "deliverables";
  isLargeLongTerm: boolean;
  people: number;
  stableRequirements: boolean;
};

// A single criterion's contribution: which answer, which method it favoured, and
// how strongly. The UI turns `key` into a Spanish sentence.
export type Reason = { key: SelectorCriterion; favors: Method; weight: number };
export type SelectorCriterion =
  "deadline" | "workMode" | "largeLongTerm" | "people" | "requirements";

export type Recommendation = {
  method: Method;
  scores: Record<Method, number>;
  reasons: Reason[];
};

// Deterministic tie-break when two methods score equally.
const TIE_ORDER: Method[] = ["scrum", "kanban", "fdd", "simple"];

export function recommendMethod(answers: SelectorAnswers): Recommendation {
  const scores: Record<Method, number> = { scrum: 0, kanban: 0, fdd: 0, simple: 0 };
  const reasons: Reason[] = [];

  const add = (method: Method, weight: number, key: SelectorCriterion) => {
    scores[method] += weight;
    reasons.push({ key, favors: method, weight });
  };

  // A deadline suits time-boxed sprints; open-ended work suits continuous flow.
  add(answers.hasDeadline ? "scrum" : "kanban", 1, "deadline");

  // Delivering in increments suits Scrum; a steady stream suits Kanban.
  add(answers.workMode === "deliverables" ? "scrum" : "kanban", 1, "workMode");

  // A big long-term goal is worth decomposing into features (FDD).
  if (answers.isLargeLongTerm) add("fdd", 2, "largeLongTerm");
  else add("simple", 1, "largeLongTerm");

  // Several people need roles/ceremonies (Scrum); a solo flow fits Kanban.
  add(answers.people >= 3 ? "scrum" : answers.people === 1 ? "kanban" : "scrum", 1, "people");

  // Stable requirements allow up-front design (FDD); volatile ones need to adapt.
  add(answers.stableRequirements ? "fdd" : "kanban", 1, "requirements");

  const method = TIE_ORDER.reduce((best, m) => (scores[m] > scores[best] ? m : best), TIE_ORDER[0]);

  return { method, scores, reasons };
}
