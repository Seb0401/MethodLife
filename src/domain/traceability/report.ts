// Markdown export of the traceability matrix (RNF6 / roadmap 4.6). Pure: the
// route gathers the data and this builds the document. Labels are injected so
// the domain stays free of i18n.

export type LinkType = "depends_on" | "refines" | "conflicts";

export type MatrixReportInput = {
  goals: { id: string; title: string; dead: boolean }[];
  projects: { id: string; name: string }[];
  counts: Record<string, number>; // `${goalId}|${projectId}` → count
  orphanCount: number;
  links: { from: string; to: string; type: LinkType }[];
  generatedAt: Date;
  labels: {
    title: string;
    generated: string;
    goal: string;
    total: string;
    deadTitle: string;
    deadMark: string;
    orphanTitle: string;
    linksTitle: string;
    linkTypes: Record<LinkType, string>;
    none: string;
  };
};

function cell(counts: Record<string, number>, goalId: string, projectId: string): number {
  return counts[`${goalId}|${projectId}`] ?? 0;
}

export function traceabilityMatrixToMarkdown(input: MatrixReportInput): string {
  const { goals, projects, counts, labels } = input;
  const lines: string[] = [];

  lines.push(`# ${labels.title}`);
  lines.push("");
  lines.push(`_${labels.generated}: ${input.generatedAt.toISOString().slice(0, 10)}_`);
  lines.push("");

  // Matrix table.
  const header = [labels.goal, ...projects.map((p) => p.name), labels.total];
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);
  for (const g of goals) {
    const total = projects.reduce((sum, p) => sum + cell(counts, g.id, p.id), 0);
    const title = g.dead ? `${g.title} ${labels.deadMark}` : g.title;
    const row = [title, ...projects.map((p) => String(cell(counts, g.id, p.id))), String(total)];
    lines.push(`| ${row.join(" | ")} |`);
  }
  lines.push("");

  // Dead goals.
  lines.push(`## ${labels.deadTitle}`);
  const dead = goals.filter((g) => g.dead);
  if (dead.length === 0) lines.push(labels.none);
  else for (const g of dead) lines.push(`- ${g.title}`);
  lines.push("");

  // Orphan work.
  lines.push(`## ${labels.orphanTitle}`);
  lines.push(String(input.orphanCount));
  lines.push("");

  // Goal relations.
  lines.push(`## ${labels.linksTitle}`);
  if (input.links.length === 0) lines.push(labels.none);
  else
    for (const l of input.links) {
      lines.push(`- ${l.from} ${labels.linkTypes[l.type]} ${l.to}`);
    }

  return lines.join("\n");
}
