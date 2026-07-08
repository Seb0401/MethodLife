import { describe, expect, it } from "vitest";
import { matchesFilter, normalizeText, type FilterableTask } from "./filter";

const base: FilterableTask = {
  title: "Diseñar el logo",
  description: "Versión en SVG",
  areaId: "area-1",
  status: "todo",
  priority: "high",
};

describe("normalizeText", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeText("DISEÑO Rápido")).toBe("diseno rapido");
  });
});

describe("matchesFilter", () => {
  it("matches everything with an empty filter", () => {
    expect(matchesFilter(base, {})).toBe(true);
  });

  it("matches text against title and description, accent-insensitive", () => {
    expect(matchesFilter(base, { text: "diseñar" })).toBe(true);
    expect(matchesFilter(base, { text: "disenar" })).toBe(true);
    expect(matchesFilter(base, { text: "svg" })).toBe(true);
    expect(matchesFilter(base, { text: "nope" })).toBe(false);
  });

  it("filters by status, priority and area", () => {
    expect(matchesFilter(base, { status: "todo" })).toBe(true);
    expect(matchesFilter(base, { status: "done" })).toBe(false);
    expect(matchesFilter(base, { priority: "high" })).toBe(true);
    expect(matchesFilter(base, { priority: "low" })).toBe(false);
    expect(matchesFilter(base, { areaId: "area-1" })).toBe(true);
    expect(matchesFilter(base, { areaId: "area-2" })).toBe(false);
  });

  it("requires all provided filters to match (AND semantics)", () => {
    expect(matchesFilter(base, { text: "logo", priority: "high", status: "todo" })).toBe(true);
    expect(matchesFilter(base, { text: "logo", priority: "low" })).toBe(false);
  });

  it("handles a null description", () => {
    expect(matchesFilter({ ...base, description: null }, { text: "logo" })).toBe(true);
    expect(matchesFilter({ ...base, description: null }, { text: "svg" })).toBe(false);
  });
});
