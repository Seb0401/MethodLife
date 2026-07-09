import { describe, it, expect } from "vitest";
import { traceabilityMatrixToMarkdown, type MatrixReportInput } from "./report";
import { routineReportToMarkdown, type RoutineReportInput } from "../routines/report";

const matrixLabels: MatrixReportInput["labels"] = {
  title: "Trazabilidad",
  generated: "Generado",
  goal: "Meta",
  total: "Total",
  deadTitle: "Metas muertas",
  deadMark: "(muerta)",
  orphanTitle: "Sin meta",
  linksTitle: "Relaciones",
  linkTypes: { depends_on: "depende de", refines: "refina", conflicts: "conflicto" },
  none: "Ninguna",
};

describe("traceabilityMatrixToMarkdown (RNF6)", () => {
  it("renders a table row per goal with per-project counts and a total", () => {
    const md = traceabilityMatrixToMarkdown({
      goals: [
        { id: "g1", title: "Meta 1", dead: false },
        { id: "g2", title: "Meta 2", dead: true },
      ],
      projects: [
        { id: "p1", name: "Proy A" },
        { id: "p2", name: "Proy B" },
      ],
      counts: { "g1|p1": 3, "g1|p2": 1 },
      orphanCount: 2,
      links: [{ from: "Meta 1", to: "Meta 2", type: "depends_on" }],
      generatedAt: new Date("2026-07-09T12:00:00Z"),
      labels: matrixLabels,
    });

    expect(md).toContain("| Meta | Proy A | Proy B | Total |");
    expect(md).toContain("| Meta 1 | 3 | 1 | 4 |");
    expect(md).toContain("Meta 2 (muerta)");
    expect(md).toContain("Meta 1 depende de Meta 2");
    expect(md).toContain("## Sin meta\n2");
  });

  it("shows the empty label when there are no dead goals or links", () => {
    const md = traceabilityMatrixToMarkdown({
      goals: [{ id: "g1", title: "M", dead: false }],
      projects: [{ id: "p1", name: "P" }],
      counts: {},
      orphanCount: 0,
      links: [],
      generatedAt: new Date("2026-07-09T00:00:00Z"),
      labels: matrixLabels,
    });
    expect(md).toContain("Ninguna");
  });
});

const routineLabels: RoutineReportInput["labels"] = {
  title: "Informe de rutina",
  generated: "Generado",
  kind: "Tipo",
  version: "Versión",
  open: "Abierta",
  closed: "Cerrada",
  decision: "Decisión",
  compliance: "Cumplimiento",
  inherited: "heredado",
  none: "Sin requisitos",
};

describe("routineReportToMarkdown (RNF6)", () => {
  it("renders each version with its requirements and compliance", () => {
    const md = routineReportToMarkdown({
      routineName: "Rutina de mañana",
      kindLabel: "Evolutivo",
      generatedAt: new Date("2026-07-09T12:00:00Z"),
      versions: [
        {
          number: 1,
          closed: true,
          decisionLabel: "Evolucionar",
          justification: "Funcionó parcialmente",
          requirements: [{ text: "Despertar 6:30", inherited: false, compliancePercent: 80 }],
        },
        {
          number: 2,
          closed: false,
          decisionLabel: null,
          justification: null,
          requirements: [{ text: "Despertar 6:30", inherited: true, compliancePercent: 0 }],
        },
      ],
      labels: routineLabels,
    });

    expect(md).toContain("# Informe de rutina: Rutina de mañana");
    expect(md).toContain("## Versión 1 — Cerrada");
    expect(md).toContain("**Decisión:** Evolucionar");
    expect(md).toContain("> Funcionó parcialmente");
    expect(md).toContain("Despertar 6:30 — Cumplimiento: 80%");
    expect(md).toContain("## Versión 2 — Abierta");
    expect(md).toContain("_(heredado)_");
  });
});
