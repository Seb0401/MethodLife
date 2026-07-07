import { describe, expect, it } from "vitest";
import { isMethodActive } from "./method";
import { DEFAULT_KANBAN_COLUMNS } from "./board";

describe("isMethodActive", () => {
  it("enables only kanban and simple in the current phase", () => {
    expect(isMethodActive("kanban")).toBe(true);
    expect(isMethodActive("simple")).toBe(true);
    expect(isMethodActive("scrum")).toBe(false);
    expect(isMethodActive("fdd")).toBe(false);
  });
});

describe("DEFAULT_KANBAN_COLUMNS", () => {
  it("has three columns in order with a WIP limit only on the middle one", () => {
    expect(DEFAULT_KANBAN_COLUMNS.map((c) => c.key)).toEqual(["todo", "doing", "done"]);
    expect(DEFAULT_KANBAN_COLUMNS.map((c) => c.position)).toEqual([0, 1, 2]);
    expect(DEFAULT_KANBAN_COLUMNS.find((c) => c.key === "doing")?.wipLimit).toBe(3);
    expect(DEFAULT_KANBAN_COLUMNS.find((c) => c.key === "todo")?.wipLimit).toBeUndefined();
  });
});
