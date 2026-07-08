// Markdown export of a board's flow metrics (RNF6). Pure and testable: it takes
// already-computed metrics plus the Spanish labels/values (supplied at the
// boundary, so the domain imports no i18n). Numbers use locale-neutral formats
// (hours with one decimal, ISO dates) — only the labels are translated.
import type { FlowMetrics } from "./metrics";

export type ReportLabels = {
  title: string;
  project: string;
  method: string;
  generated: string;
  summary: string;
  completed: string;
  avgLead: string;
  avgCycle: string;
  throughput: string;
  day: string;
  count: string;
  na: string;
};

function hours(ms: number | null, na: string): string {
  return ms == null ? na : `${(ms / 3_600_000).toFixed(1)} h`;
}

function isoDay(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

export function flowMetricsToMarkdown(input: {
  projectName: string;
  methodName: string;
  generatedAt: Date;
  metrics: FlowMetrics;
  labels: ReportLabels;
}): string {
  const { projectName, methodName, generatedAt, metrics, labels } = input;

  const lines = [
    `# ${labels.title}`,
    "",
    `- **${labels.project}:** ${projectName}`,
    `- **${labels.method}:** ${methodName}`,
    `- **${labels.generated}:** ${isoDay(generatedAt.getTime())}`,
    "",
    `## ${labels.summary}`,
    "",
    `| ${labels.completed} | ${labels.avgLead} | ${labels.avgCycle} |`,
    "| --- | --- | --- |",
    `| ${metrics.completedCount} | ${hours(metrics.avgLeadTimeMs, labels.na)} | ${hours(
      metrics.avgCycleTimeMs,
      labels.na,
    )} |`,
    "",
    `## ${labels.throughput}`,
    "",
    `| ${labels.day} | ${labels.count} |`,
    "| --- | --- |",
    ...metrics.throughput.map((b) => `| ${isoDay(b.day)} | ${b.count} |`),
    "",
  ];

  return lines.join("\n");
}
