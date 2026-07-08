import { describe, expect, it } from "vitest";
import { flowMetricsToMarkdown, type ReportLabels } from "./report";
import type { FlowMetrics } from "./metrics";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BASE = Date.UTC(2026, 0, 5); // 2026-01-05

const labels: ReportLabels = {
  title: "Reporte de flujo",
  project: "Proyecto",
  method: "Método",
  generated: "Generado",
  summary: "Resumen",
  completed: "Completadas",
  avgLead: "Lead medio",
  avgCycle: "Cycle medio",
  throughput: "Throughput",
  day: "Día",
  count: "Completadas",
  na: "—",
};

describe("flowMetricsToMarkdown", () => {
  it("renders a full report with a hand-checked table", () => {
    const metrics: FlowMetrics = {
      completedCount: 2,
      avgLeadTimeMs: 4 * HOUR_MS,
      avgCycleTimeMs: 2.5 * HOUR_MS,
      throughput: [
        { day: BASE - DAY_MS, count: 0 },
        { day: BASE, count: 2 },
      ],
    };

    const md = flowMetricsToMarkdown({
      projectName: "Demo",
      methodName: "Kanban",
      generatedAt: new Date("2026-01-06T10:00:00Z"),
      metrics,
      labels,
    });

    expect(md).toContain("# Reporte de flujo");
    expect(md).toContain("- **Proyecto:** Demo");
    expect(md).toContain("- **Método:** Kanban");
    expect(md).toContain("- **Generado:** 2026-01-06");
    expect(md).toContain("| Completadas | Lead medio | Cycle medio |");
    expect(md).toContain("| 2 | 4.0 h | 2.5 h |");
    expect(md).toContain("| 2026-01-05 | 2 |");
    expect(md).toContain("| 2026-01-04 | 0 |");
  });

  it("shows the n/a placeholder when there are no completed tasks", () => {
    const metrics: FlowMetrics = {
      completedCount: 0,
      avgLeadTimeMs: null,
      avgCycleTimeMs: null,
      throughput: [{ day: BASE, count: 0 }],
    };
    const md = flowMetricsToMarkdown({
      projectName: "Vacío",
      methodName: "Kanban",
      generatedAt: new Date(BASE),
      metrics,
      labels,
    });
    expect(md).toContain("| 0 | — | — |");
  });
});
