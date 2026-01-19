import type { ExtractProjectResult } from "../extractFromProject";
import { buildReportModel } from "./reportModel";

function pct(n: number) { return `${Math.round(n * 1000) / 10}%`; }

export function generateReportMarkdown(result: ExtractProjectResult): string {
  const m = buildReportModel(result);

  const header = [
    `# ${m.title}`,
    "",
    `Project: \`${m.meta.projectRoot}\``,
    `Extracted: \`${m.meta.extractedAt}\``,
    "",
    `- Files scanned: **${m.totals.fileCount}**`,
    `- className occurrences: **${m.totals.occurrenceCount}**`,
    `- Class tokens processed: **${m.totals.tokenCount}**`,
    `- Unique utilities: **${m.totals.uniqueUtilities}**`,
    ""
  ].join("\n");

  const sprawl = [
    "## Sprawl signals",
    "",
    "These are quick indicators of inconsistency risk (lots of unique values).",
    "",
    ...m.sprawl.map(s =>
      `- ${s.label}: **${s.unique}** unique, **${s.total}** total${s.status === "warn" ? " ⚠️" : ""}`
    ),
    ""
  ].join("\n");

  const arbitraryItems =
    m.arbitraryValues.items.length === 0
      ? ["(none found)"]
      : m.arbitraryValues.items.map((i) => {
          const replaceable = i.replaceableWith ? `; replace with \`${i.replaceableWith}\`` : "";
          return `- \`${i.utility}\` — **${i.count}**${i.count === 1 ? " use" : " uses"}${replaceable}`;
        });

  const arbitrary = [
    "## Arbitrary values",
    "",
    `Total detected: **${m.arbitraryValues.total}**`,
    "",
    ...arbitraryItems,
    ""
  ].join("\n");

  const sections = m.sections.map(sec => {
    const lines =
      sec.total === 0
        ? ["(none found)"]
        : sec.items.map(i =>
            `- \`${i.utility}\` — **${i.count}** (${pct(i.percentOfGroup)}), files: ${i.files}`
          );

    return ["## " + sec.title, "", ...lines, ""].join("\n");
  }).join("");

  const notes = ["## Notes", "", ...m.notes.map(n => `- ${n}`), ""].join("\n");

  return header + sprawl + arbitrary + sections + notes;
}
