// Auto-generated sprint summary in Markdown (RF2.5 / RNF6). Pure and testable:
// it takes the closing data plus Spanish labels supplied at the boundary, so the
// domain imports no i18n. Dates use ISO; only labels are translated.

export type SummaryItem = { title: string; estimate: number | null };

export type SprintSummaryLabels = {
  title: string;
  sprint: string;
  dates: string;
  velocity: string;
  completed: string;
  incomplete: string;
  points: string;
  none: string;
};

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function itemList(items: SummaryItem[], pointsLabel: string, none: string): string[] {
  if (items.length === 0) return [`- ${none}`];
  return items.map((i) => `- ${i.title} (${i.estimate ?? 0} ${pointsLabel})`);
}

export function sprintSummaryToMarkdown(input: {
  sprintName: string;
  startsAt: Date;
  endsAt: Date;
  velocity: number;
  completed: SummaryItem[];
  incomplete: SummaryItem[];
  labels: SprintSummaryLabels;
}): string {
  const { sprintName, startsAt, endsAt, velocity, completed, incomplete, labels } = input;

  return [
    `# ${labels.title}`,
    "",
    `- **${labels.sprint}:** ${sprintName}`,
    `- **${labels.dates}:** ${isoDay(startsAt)} – ${isoDay(endsAt)}`,
    `- **${labels.velocity}:** ${velocity} ${labels.points}`,
    "",
    `## ${labels.completed} (${completed.length})`,
    "",
    ...itemList(completed, labels.points, labels.none),
    "",
    `## ${labels.incomplete} (${incomplete.length})`,
    "",
    ...itemList(incomplete, labels.points, labels.none),
    "",
  ].join("\n");
}
