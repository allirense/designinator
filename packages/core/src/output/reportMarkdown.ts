import type { ExtractProjectResult } from "../extractFromProject";
import { buildReportModel } from "./reportModel";

function pct(n: number) { return `${Math.round(n * 1000) / 10}%`; }

function fmtPx(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

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

  const spacingScale = (() => {
    if (m.spacingScale.totalCount === 0) {
      return [
        "## Spacing scale",
        "",
        "(no spacing values found)",
        ""
      ].join("\n");
    }

    const best = m.spacingScale.best;
    const proposed = best?.scalePx?.length
      ? best.scalePx.map((v) => fmtPx(v)).join(", ")
      : "(none)";

    const candidates = m.spacingScale.candidateScores.length === 0
      ? ["(no candidates scored)"]
      : m.spacingScale.candidateScores.map((c) => {
          return `- ${c.name}: **${pct(c.exactMatchRate)}** exact; avg distance **${fmtPx(c.averageDistance)}px**`;
        });

    const nonConforming = m.spacingScale.nonConforming.length === 0
      ? ["(none)"]
      : m.spacingScale.nonConforming.map((item) => {
          return `- \`${item.utility}\` (${fmtPx(item.px)}px) — **${item.count}** uses → \`${item.suggestedReplacement}\` (${fmtPx(item.nearestPx)}px), cost ${fmtPx(item.distance)}px`;
        });

    const ignored = m.spacingScale.ignoredUtilities > 0
      ? [`Ignored spacing utilities (non-numeric): **${m.spacingScale.ignoredUtilities}**`]
      : [];

    return [
      "## Spacing scale",
      "",
      `Proposed scale (px): ${proposed}`,
      "",
      "Candidate scores:",
      ...candidates,
      "",
      "Non-conforming utilities:",
      ...nonConforming,
      "",
      ...ignored,
      ""
    ].join("\n");
  })();

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

  return header + sprawl + arbitrary + spacingScale + sections + notes;
}
