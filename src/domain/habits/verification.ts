// Verification proof for a default habit (RF5.5): a measurable condition over a
// trailing window with a tolerance (e.g. "12 of the last 14 days done"). Fixed
// for the whole habit version — renegotiating opens a new version (M8). Pure
// logic; the server evaluates it before allowing the verification → overcome move.

export type VerificationCondition = "done";

export type VerificationRule = {
  condition: VerificationCondition;
  windowDays: number;
  tolerance: number;
};

// Attempting to change a verification rule mid-cycle is rejected (RF5.5).
export const VERIFICATION_RULE_IMMUTABLE = "VERIFICATION_RULE_IMMUTABLE";
// The verification window does not yet meet the rule.
export const VERIFICATION_NOT_MET = "VERIFICATION_NOT_MET";

const MAX_WINDOW = 90;

export function isValidVerificationRule(r: VerificationRule): boolean {
  return (
    r.condition === "done" &&
    Number.isInteger(r.windowDays) &&
    r.windowDays >= 1 &&
    r.windowDays <= MAX_WINDOW &&
    Number.isInteger(r.tolerance) &&
    r.tolerance >= 0 &&
    r.tolerance < r.windowDays
  );
}

// Parses untrusted JSON (the stored verification_rule column or form input) into
// a valid rule, or null.
export function parseVerificationRule(raw: unknown): VerificationRule | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.windowDays !== "number" || typeof r.tolerance !== "number") return null;
  const candidate: VerificationRule = {
    condition: "done",
    windowDays: r.windowDays,
    tolerance: r.tolerance,
  };
  return isValidVerificationRule(candidate) ? candidate : null;
}

// Minimum number of "done" days required to pass the proof.
export function requiredDays(rule: VerificationRule): number {
  return rule.windowDays - rule.tolerance;
}

export type CheckinLike = { date: Date; result: "done" | "occurrence" | "skipped" };

// UTC calendar-day key (matches @db.Date storage).
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type VerificationProgress = {
  passed: boolean;
  doneCount: number;
  required: number;
  windowDays: number;
};

// Counts distinct "done" days inside the trailing window ending today and
// compares against the tolerance-adjusted requirement (RF5.5).
export function evaluateVerification(
  rule: VerificationRule,
  checkins: CheckinLike[],
  today: Date,
): VerificationProgress {
  const windowKeys = new Set<string>();
  for (let i = 0; i < rule.windowDays; i++) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i),
    );
    windowKeys.add(dayKey(d));
  }

  const doneDays = new Set<string>();
  for (const c of checkins) {
    const k = dayKey(c.date);
    if (c.result === "done" && windowKeys.has(k)) doneDays.add(k);
  }

  const doneCount = doneDays.size;
  const required = requiredDays(rule);
  return { passed: doneCount >= required, doneCount, required, windowDays: rule.windowDays };
}
