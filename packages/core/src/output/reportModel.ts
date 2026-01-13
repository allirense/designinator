import type { ExtractProjectResult } from "../extractFromProject";
import type { TokenGroupCounts, TokenUsage } from "../analysis/tokenCounts";
import { warn } from "node:console";

export type ReportFormat = "html" | "md";

export type SprawlStatus = "ok" | "warn";

const WARN_DEFAULTS ={
    COLOR_TEXT: 12,
    COLOR_BG: 12,
    PADDING: 12,
    MARGIN: 12,
    RADIUS: 6,
    SHADOW: 6,
    FONT_SIZE: 10,
    FONT_WEIGHT: 6,
}

export interface SprawlRule {
  id: string;
  label: string;
  domain: string;
  group: string;
  warnAt: number;
}

export interface SprawlSignal {
  id: string;
  label: string;
  domain: string;
  group: string;
  unique: number;
  total: number;
  warnAt: number;
  status: SprawlStatus;
}

export interface ReportItem extends TokenUsage {
  percentOfGroup: number; // 0..1
}

export interface ReportSection {
  title: string;
  domain: string;
  group: string;
  total: number;
  unique: number;
  items: ReportItem[];
}

export interface ReportModel {
  title: string;
  meta: ExtractProjectResult["meta"];
  totals: {
    tokenCount: number;
    uniqueUtilities: number;
    occurrenceCount: number;
    fileCount: number;
  };
  sprawl: SprawlSignal[];
  sections: ReportSection[];
  notes: string[];
}

function getGroup(result: ExtractProjectResult, domain: string, group: string): TokenGroupCounts | undefined {
  return result.tokenCounts.domains?.[domain]?.groups?.[group];
}

function topN(group: TokenGroupCounts | undefined, n: number): TokenUsage[] {
  if (!group) return [];
  return Object.values(group.values)
    .sort((a, b) => b.count - a.count || a.utility.localeCompare(b.utility))
    .slice(0, n);
}

function uniqueCount(group: TokenGroupCounts | undefined): number {
  if (!group) return 0;
  return Object.keys(group.values).length;
}

export interface ReportModelOptions {
  title?: string;
  topN?: number;
  sprawlRules?: SprawlRule[];
}

export function defaultSprawlRules(): SprawlRule[] {
  return [
    { id: "colorText", label: "Text colors", domain: "color", group: "text", warnAt: WARN_DEFAULTS.COLOR_TEXT },
    { id: "colorBg", label: "Background colors", domain: "color", group: "background", warnAt: WARN_DEFAULTS.COLOR_BG },
    { id: "padding", label: "Padding utilities", domain: "spacing", group: "padding", warnAt: WARN_DEFAULTS.PADDING },
    { id: "margin", label: "Margin utilities", domain: "spacing", group: "margin", warnAt: WARN_DEFAULTS.MARGIN },
    { id: "radius", label: "Radius utilities", domain: "radius", group: "radius", warnAt: WARN_DEFAULTS.RADIUS },
    { id: "shadow", label: "Shadow utilities", domain: "shadow", group: "shadow", warnAt: WARN_DEFAULTS.SHADOW },
    { id: "fontSize", label: "Font sizes", domain: "typography", group: "fontSize", warnAt: WARN_DEFAULTS.FONT_SIZE },
    { id: "fontWeight", label: "Font weights", domain: "typography", group: "fontWeight", warnAt: WARN_DEFAULTS.FONT_WEIGHT },
  ];
}

export function defaultSectionsOrder(): Array<Pick<ReportSection, "title"|"domain"|"group">> {
  return [
    { title: "Color · Text", domain: "color", group: "text" },
    { title: "Color · Background", domain: "color", group: "background" },
    { title: "Color · Border", domain: "color", group: "border" },
    { title: "Color · Other (ring/outline/fill/stroke)", domain: "color", group: "other" },

    { title: "Typography · Font size", domain: "typography", group: "fontSize" },
    { title: "Typography · Font weight", domain: "typography", group: "fontWeight" },
    { title: "Typography · Line height", domain: "typography", group: "lineHeight" },
    { title: "Typography · Letter spacing", domain: "typography", group: "letterSpacing" },
    { title: "Typography · Text transform", domain: "typography", group: "textTransform" },
    { title: "Typography · Alignment", domain: "typography", group: "alignment" },

    { title: "Spacing · Padding", domain: "spacing", group: "padding" },
    { title: "Spacing · Margin", domain: "spacing", group: "margin" },
    { title: "Spacing · Gap", domain: "spacing", group: "gap" },
    { title: "Spacing · Space-between", domain: "spacing", group: "space" },

    { title: "Radius", domain: "radius", group: "radius" },
    { title: "Shadow", domain: "shadow", group: "shadow" },

    { title: "Border · Width", domain: "border", group: "width" },
    { title: "Border · Style", domain: "border", group: "style" },

    { title: "Opacity", domain: "opacity", group: "opacity" },
    { title: "Z-index", domain: "zIndex", group: "zIndex" },

    { title: "Other · Layout (tracked)", domain: "other", group: "layout" },
    { title: "Other · Sizing (tracked)", domain: "other", group: "sizing" },
    { title: "Other · Effects (tracked)", domain: "other", group: "effect" },
    { title: "Other · Arbitrary properties (tracked)", domain: "other", group: "arbitraryProperty" },
  ];
}

export function buildReportModel(result: ExtractProjectResult, opts: ReportModelOptions = {}): ReportModel {
  const title = opts.title ?? "Designinator Report";
  const top = opts.topN ?? 12;
  const sprawlRules = opts.sprawlRules ?? defaultSprawlRules();

  const sprawl: SprawlSignal[] = sprawlRules.map((r) => {
    const g = getGroup(result, r.domain, r.group);
    const unique = uniqueCount(g);
    const total = g?.total ?? 0;
    return {
      ...r,
      unique,
      total,
      status: unique >= r.warnAt ? "warn" : "ok",
    };
  });

  const sections: ReportSection[] = defaultSectionsOrder().map(({ title, domain, group }) => {
    const g = getGroup(result, domain, group);
    const total = g?.total ?? 0;
    const unique = uniqueCount(g);

    const items = topN(g, top).map((u) => ({
      ...u,
      percentOfGroup: total > 0 ? u.count / total : 0,
    }));

    return { title, domain, group, total, unique, items };
  });

  return {
    title,
    meta: result.meta,
    totals: {
      tokenCount: result.tokenCounts.meta.tokenCount,
      uniqueUtilities: result.tokenCounts.meta.uniqueUtilities,
      occurrenceCount: result.meta.occurrenceCount,
      fileCount: result.meta.fileCount,
    },
    sprawl,
    sections,
    notes: [
      "v0 counts only static className strings (no variables).",
      "Percentages are within each group.",
    ],
  };
}