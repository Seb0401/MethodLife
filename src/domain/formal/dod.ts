// Definition of Done for a task (RF6.1): structured natural-language pre- and
// postconditions. A task carrying postconditions cannot be marked complete until
// every one is confirmed (P2). Pure logic; the server persists it as JSON on
// tasks.definition_of_done and enforces `canComplete` on the move-to-done path.

export type Postcondition = { text: string; done: boolean };

export type DefinitionOfDone = {
  preconditions: string[];
  postconditions: Postcondition[];
};

export const DOD_NOT_CONFIRMED = "DOD_NOT_CONFIRMED";

const MAX_ITEMS = 20;
const MAX_LEN = 200;

function cleanLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, MAX_ITEMS)
    .map((l) => l.slice(0, MAX_LEN));
}

// Builds a fresh definition from two blocks of newline-separated text. All
// postconditions start unconfirmed.
export function buildDod(preconditionsText: string, postconditionsText: string): DefinitionOfDone {
  return {
    preconditions: cleanLines(preconditionsText),
    postconditions: cleanLines(postconditionsText).map((text) => ({ text, done: false })),
  };
}

// A definition with no content at all — treated as "no DoD" by the caller.
export function isEmptyDod(dod: DefinitionOfDone): boolean {
  return dod.preconditions.length === 0 && dod.postconditions.length === 0;
}

// Parses untrusted JSON (the stored column) into a definition, or null if absent
// or malformed.
export function parseDod(raw: unknown): DefinitionOfDone | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const pre = Array.isArray(r.preconditions) ? r.preconditions : [];
  const post = Array.isArray(r.postconditions) ? r.postconditions : [];
  const preconditions = pre.filter((x): x is string => typeof x === "string");
  const postconditions: Postcondition[] = post
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .filter((x) => typeof x.text === "string")
    .map((x) => ({ text: x.text as string, done: x.done === true }));
  if (preconditions.length === 0 && postconditions.length === 0) return null;
  return { preconditions, postconditions };
}

// All postconditions confirmed (a definition without postconditions is complete —
// preconditions are informational).
export function isComplete(dod: DefinitionOfDone): boolean {
  return dod.postconditions.every((p) => p.done);
}

// The gate for marking a task done (RF6.1). No DoD → free to complete; otherwise
// every postcondition must be confirmed.
export function canComplete(raw: unknown): boolean {
  const dod = parseDod(raw);
  return dod === null || isComplete(dod);
}

// Number of postconditions still unconfirmed (for the card badge).
export function pendingCount(dod: DefinitionOfDone): number {
  return dod.postconditions.filter((p) => !p.done).length;
}

// Flips the confirmation of the postcondition at `index`, returning a new
// definition (immutable update). Out-of-range indexes are a no-op.
export function togglePostcondition(dod: DefinitionOfDone, index: number): DefinitionOfDone {
  if (index < 0 || index >= dod.postconditions.length) return dod;
  return {
    preconditions: dod.preconditions,
    postconditions: dod.postconditions.map((p, i) => (i === index ? { ...p, done: !p.done } : p)),
  };
}
