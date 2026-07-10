import { describe, it, expect } from "vitest";
import { coupledProjectIds, detectTemporalCoupling, type ProjectSlot } from "./coupling";
import { isFlowValid, validateFlow } from "./flow-validation";

const p = (id: string, areaId: string, status: ProjectSlot["status"] = "active"): ProjectSlot => ({
  id,
  name: id,
  areaId,
  areaName: `area-${areaId}`,
  status,
});

describe("temporal coupling (RF10.2)", () => {
  it("flags 2+ active projects in the same area", () => {
    const groups = detectTemporalCoupling([p("a", "1"), p("b", "1"), p("c", "2")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].projects.map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect([...coupledProjectIds(groups)].sort()).toEqual(["a", "b"]);
  });

  it("ignores paused/archived projects", () => {
    const groups = detectTemporalCoupling([p("a", "1"), p("b", "1", "paused")]);
    expect(groups).toHaveLength(0);
  });
});

describe("flow validation (RF10.4)", () => {
  it("flags nodes missing an incoming or outgoing edge", () => {
    const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const edges = [{ source: "a", target: "b" }]; // c isolated; a no-in; b no-out
    const issues = validateFlow(nodes, edges);
    expect(issues.find((i) => i.nodeId === "a")?.missingIn).toBe(true);
    expect(issues.find((i) => i.nodeId === "b")?.missingOut).toBe(true);
    expect(issues.find((i) => i.nodeId === "c")).toEqual({
      nodeId: "c",
      missingIn: true,
      missingOut: true,
    });
    expect(isFlowValid(nodes, edges)).toBe(false);
  });

  it("accepts a cycle where every node has in and out", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "a" },
    ];
    expect(isFlowValid(nodes, edges)).toBe(true);
  });

  it("treats a trivial graph as valid", () => {
    expect(isFlowValid([{ id: "a" }], [])).toBe(true);
    expect(isFlowValid([], [])).toBe(true);
  });
});
