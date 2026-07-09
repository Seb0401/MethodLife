import { describe, expect, it } from "vitest";
import { classifyTransition } from "./activity";

describe("classifyTransition", () => {
  it("classifies a card entering the board as created", () => {
    expect(classifyTransition({ fromColumnId: null, toStatus: "todo" })).toBe("created");
    // Even entering straight into a done column counts as created (it has no origin).
    expect(classifyTransition({ fromColumnId: null, toStatus: "done" })).toBe("created");
  });

  it("classifies a move into done as completed", () => {
    expect(classifyTransition({ fromColumnId: "col-1", toStatus: "done" })).toBe("completed");
  });

  it("classifies any other move as moved", () => {
    expect(classifyTransition({ fromColumnId: "col-1", toStatus: "in_progress" })).toBe("moved");
    expect(classifyTransition({ fromColumnId: "col-2", toStatus: "todo" })).toBe("moved");
  });
});
