// Markdown export of a routine's history (RNF6 / roadmap 4.6). Pure; labels
// injected. The route computes per-requirement compliance and passes it in.

export type RoutineReportInput = {
  routineName: string;
  kindLabel: string;
  generatedAt: Date;
  versions: {
    number: number;
    closed: boolean;
    decisionLabel: string | null;
    justification: string | null;
    requirements: { text: string; inherited: boolean; compliancePercent: number }[];
  }[];
  labels: {
    title: string;
    generated: string;
    kind: string;
    version: string;
    open: string;
    closed: string;
    decision: string;
    compliance: string;
    inherited: string;
    none: string;
  };
};

export function routineReportToMarkdown(input: RoutineReportInput): string {
  const { labels } = input;
  const lines: string[] = [];

  lines.push(`# ${labels.title}: ${input.routineName}`);
  lines.push("");
  lines.push(`_${labels.kind}: ${input.kindLabel}_`);
  lines.push(`_${labels.generated}: ${input.generatedAt.toISOString().slice(0, 10)}_`);
  lines.push("");

  for (const v of input.versions) {
    const state = v.closed ? labels.closed : labels.open;
    lines.push(`## ${labels.version} ${v.number} — ${state}`);
    if (v.decisionLabel) lines.push(`**${labels.decision}:** ${v.decisionLabel}`);
    if (v.justification) lines.push(`> ${v.justification}`);
    lines.push("");
    if (v.requirements.length === 0) {
      lines.push(labels.none);
    } else {
      for (const r of v.requirements) {
        const tag = r.inherited ? ` _(${labels.inherited})_` : "";
        lines.push(`- ${r.text}${tag} — ${labels.compliance}: ${r.compliancePercent}%`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
