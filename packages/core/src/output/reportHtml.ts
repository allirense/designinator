import type { ReportModel, ReportSection, SprawlSignal } from "./reportModel";
import { buildReportModel, type ReportModelOptions } from "./reportModel";
import type { ExtractProjectResult } from "../extractFromProject";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return "0.0%";
  return `${(Math.round(n * 1000) / 10).toFixed(1)}%`; // 1 decimal
}

function sectionHtml(title: string, inner: string): string {
  return `
    <section class="card">
      <h2>${escapeHtml(title)}</h2>
      ${inner}
    </section>
  `;
}

function renderSprawlTable(sprawl: SprawlSignal[]): string {
  const rows = sprawl
    .map((s) => {
      const pill =
        s.status === "warn"
          ? `<span class="pill warn">sprawl</span>`
          : `<span class="pill ok">ok</span>`;

      return `
        <tr>
          <td>${escapeHtml(s.label)}</td>
          <td class="num">${s.unique}</td>
          <td class="num">${s.total}</td>
          <td>${pill}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <p class="muted">Quick indicators of inconsistency risk (lots of unique values).</p>
    <table class="table">
      <thead>
        <tr>
          <th>Category</th>
          <th class="num">Unique</th>
          <th class="num">Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function renderSectionList(sec: ReportSection, topN: number): string {
  if (sec.total === 0) return `<p class="muted">(none found)</p>`;

  const items = sec.items.slice(0, topN).map((i) => {
    return `
      <li>
        <code>${escapeHtml(i.utility)}</code>
        <span class="meta"><strong>${i.count}</strong> (${pct(i.percentOfGroup)}) · files: ${i.files}</span>
      </li>
    `;
  });

  return `<ol class="list">${items.join("")}</ol>`;
}

function renderNotes(notes: string[]): string {
  const lis = notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
  return `<ul class="notes">${lis}</ul>`;
}

function baseStyles(): string {
  // Minimal & self-contained; no external assets.
  return `
    :root { color-scheme: light dark; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      margin: 0; padding: 24px;
      background: #0b0f19;
      color: #e5e7eb;
    }
    a { color: inherit; }
    .wrap { max-width: 980px; margin: 0 auto; }
    header { margin-bottom: 18px; }
    h1 { font-size: 22px; margin: 0 0 6px 0; }
    .meta { color: #9ca3af; font-size: 13px; line-height: 1.4; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    @media (min-width: 860px) { .grid { grid-template-columns: 1fr 1fr; } }

    .card {
      background: #0f172a;
      border: 1px solid rgba(148,163,184,.22);
      border-radius: 14px;
      padding: 14px 14px;
      box-shadow: 0 1px 0 rgba(255,255,255,.06);
    }
    h2 { font-size: 16px; margin: 0 0 10px 0; }
    .meta div { margin-bottom: 8px; }
    .muted { color: #9ca3af; margin-top: 0; }
    .list { margin: 0; padding-left: 18px; }
    .list li { margin: 6px 0; font-size: 13px }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      background: rgba(148,163,184,.12);
      border: 1px solid rgba(148,163,184,.18);
      padding: 2px 6px;
      border-radius: 8px;
    }
    .table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 12px; }
    .table th, .table td { padding: 10px 10px; border-bottom: 1px solid rgba(148,163,184,.18); }
    .table th { text-align: left; color: #cbd5e1; font-weight: 600; font-size: 13px; }
    .table td { font-size: 13px; }
    table th.num, table td.num { text-align: right; font-variant-numeric: tabular-nums; }

    .pill { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(148,163,184,.25); }
    .pill.ok { color: #86efac; background: rgba(34,197,94,.12); border-color: rgba(34,197,94,.22); }
    .pill.warn { color: #fca5a5; background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.22); }

    .footer { margin-top: 14px; color: #9ca3af; font-size: 13px; }
    .kpi { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .kpi .chip {
      background: rgba(148,163,184,.10);
      border: 1px solid rgba(148,163,184,.18);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 13px;
      color: #cbd5e1;
    }
    .notes { margin: 0; padding-left: 18px; color: #cbd5e1; font-size: 13px; }
    .notes li { margin: 6px 0; }
  `;
}

function renderKpis(m: ReportModel): string {
  return `
    <div class="kpi">
      <div class="chip">Files scanned: <strong>${m.totals.fileCount}</strong></div>
      <div class="chip">className occurrences: <strong>${m.totals.occurrenceCount}</strong></div>
      <div class="chip">Class tokens processed: <strong>${m.totals.tokenCount}</strong></div>
      <div class="chip">Unique utilities: <strong>${m.totals.uniqueUtilities}</strong></div>
    </div>
  `;
}

export function generateReportHtml(
  extractResult: ExtractProjectResult,
  opts: ReportModelOptions = {}
): string {
  const m = buildReportModel(extractResult, opts);
  const topN = opts.topN ?? 12;

  const sprawlSection = sectionHtml("Sprawl signals", renderSprawlTable(m.sprawl));

  const sectionsHtml = m.sections
    .map((sec) => sectionHtml(sec.title, renderSectionList(sec, topN)))
    .join("\n");

  const notesSection = sectionHtml("Notes", renderNotes(m.notes));

  const style = baseStyles();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(m.title)}</title>
  <style>${style}</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${escapeHtml(m.title)}</h1>
      <div class="meta">
        <div>Project: <code>${escapeHtml(m.meta.projectRoot)}</code></div>
        <div>Extracted: <code>${escapeHtml(m.meta.extractedAt)}</code></div>
      </div>
      ${renderKpis(m)}
    </header>

    <div class="grid">
      ${sprawlSection}
      ${sectionsHtml}
      ${notesSection}
    </div>

    <p class="footer">
      Generated by Designinator.
    </p>
  </div>
</body>
</html>`;
}