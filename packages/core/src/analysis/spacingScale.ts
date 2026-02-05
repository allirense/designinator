import type { TokenCountsResult, TokenUsage } from "./tokenCounts";

export interface SpacingScaleScore {
  name: string;
  scalePx: number[];
  exactMatchRate: number;
  averageDistance: number;
  totalCount: number;
  exactCount: number;
}

export interface SpacingNonConformingItem {
  utility: string;
  count: number;
  px: number;
  nearestPx: number;
  distance: number;
  suggestedReplacement: string;
}

export interface SpacingScaleReport {
  totalCount: number;
  uniqueUtilities: number;
  ignoredUtilities: number;
  candidateScores: SpacingScaleScore[];
  best: SpacingScaleScore | null;
  nonConforming: SpacingNonConformingItem[];
}

interface ParsedSpacingUtility {
  prefix: string;
  px: number;
}

interface SpacingValueUsage extends ParsedSpacingUtility {
  utility: string;
  count: number;
}

const TAILWIND_SPACING_SCALE_PX: Array<[number, string]> = [
  [0, "0"],
  [1, "px"],
  [2, "0.5"],
  [4, "1"],
  [6, "1.5"],
  [8, "2"],
  [10, "2.5"],
  [12, "3"],
  [14, "3.5"],
  [16, "4"],
  [20, "5"],
  [24, "6"],
  [28, "7"],
  [32, "8"],
  [36, "9"],
  [40, "10"],
  [44, "11"],
  [48, "12"],
  [56, "14"],
  [64, "16"],
  [80, "20"],
  [96, "24"],
  [112, "28"],
  [128, "32"],
  [144, "36"],
  [160, "40"],
  [176, "44"],
  [192, "48"],
  [208, "52"],
  [224, "56"],
  [240, "60"],
  [256, "64"],
  [288, "72"],
  [320, "80"],
  [384, "96"]
];

const POWERS_OF_TWO_ISH_SCALE = [
  0, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384
];

const SPACING_PREFIX_RE = /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(.+)$/;

const pxToKey = new Map<number, string>(
  TAILWIND_SPACING_SCALE_PX.map(([px, key]) => [px, key])
);

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function parseLengthToPx(value: string): number | null {
  const match = value.match(/^(-?\d*\.?\d+)(px|rem)$/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const unit = match[2];
  return unit === "rem" ? n * 16 : n;
}

function parseNumber(value: string): number | null {
  if (!/^-?\d*\.?\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseSpacingUtility(utility: string): ParsedSpacingUtility | null {
  const match = SPACING_PREFIX_RE.exec(utility);
  if (!match) return null;
  const prefix = match[1];
  let raw = match[2];
  if (!raw) return null;
  if (raw === "auto") return null;

  if (raw.startsWith("[") && raw.endsWith("]")) {
    raw = raw.slice(1, -1).trim();
    if (!raw) return null;
    if (raw === "px") return { prefix, px: 1 };
    const lenPx = parseLengthToPx(raw);
    if (lenPx === null) return null;
    return { prefix, px: round(Math.abs(lenPx)) };
  }

  if (raw === "px") return { prefix, px: 1 };

  const n = parseNumber(raw);
  if (n === null) return null;
  return { prefix, px: round(Math.abs(n * 4)) };
}

function collectSpacingUtilities(result: TokenCountsResult): TokenUsage[] {
  const groups = result.domains.spacing?.groups;
  if (!groups) return [];

  const values: TokenUsage[] = [];
  const groupNames = ["padding", "margin", "gap", "space"];
  for (const group of groupNames) {
    const items = Object.values(groups[group]?.values ?? {});
    values.push(...items);
  }
  return values;
}

function buildGridScale(step: number, maxPx: number): number[] {
  const scale: number[] = [];
  let current = 0;
  const cappedMax = Math.max(0, maxPx);
  while (current < cappedMax) {
    scale.push(round(current));
    current += step;
  }
  scale.push(round(current));
  return scale;
}

function buildPowersScale(maxPx: number): number[] {
  const scale = [...POWERS_OF_TWO_ISH_SCALE];
  let last = scale[scale.length - 1] ?? 0;
  while (last < maxPx) {
    last *= 2;
    scale.push(last);
  }
  return scale;
}

function nearestDistance(px: number, scale: number[]): { nearest: number; distance: number } {
  let best = scale[0] ?? 0;
  let bestDistance = Math.abs(px - best);
  for (const v of scale) {
    const dist = Math.abs(px - v);
    if (dist < bestDistance) {
      best = v;
      bestDistance = dist;
    }
  }
  return { nearest: round(best), distance: round(bestDistance) };
}

function scoreScale(values: SpacingValueUsage[], scale: number[], name: string): SpacingScaleScore {
  const scaleSet = new Set(scale.map(round));
  let totalCount = 0;
  let exactCount = 0;
  let nonMatchingCount = 0;
  let distanceSum = 0;

  for (const v of values) {
    totalCount += v.count;
    if (scaleSet.has(round(v.px))) {
      exactCount += v.count;
      continue;
    }
    const { distance } = nearestDistance(v.px, scale);
    nonMatchingCount += v.count;
    distanceSum += distance * v.count;
  }

  return {
    name,
    scalePx: scale.map(round),
    exactMatchRate: totalCount > 0 ? exactCount / totalCount : 0,
    averageDistance: nonMatchingCount > 0 ? distanceSum / nonMatchingCount : 0,
    totalCount,
    exactCount
  };
}

function suggestReplacement(prefix: string, px: number): string {
  const key = pxToKey.get(px);
  if (key) return `${prefix}-${key}`;
  return `${prefix}-[${px}px]`;
}

export function computeSpacingScaleReport(result: TokenCountsResult): SpacingScaleReport {
  const utilities = collectSpacingUtilities(result);
  const values: SpacingValueUsage[] = [];
  let ignoredUtilities = 0;

  for (const usage of utilities) {
    const parsed = parseSpacingUtility(usage.utility);
    if (!parsed) {
      ignoredUtilities += 1;
      continue;
    }
    values.push({
      utility: usage.utility,
      count: usage.count,
      prefix: parsed.prefix,
      px: parsed.px
    });
  }

  const totalCount = values.reduce((sum, v) => sum + v.count, 0);
  const uniqueUtilities = values.length;

  if (values.length === 0) {
    return {
      totalCount,
      uniqueUtilities,
      ignoredUtilities,
      candidateScores: [],
      best: null,
      nonConforming: []
    };
  }

  const maxPx = Math.max(...values.map((v) => v.px));
  const candidates = [
    scoreScale(values, buildPowersScale(maxPx), "powers-of-two-ish"),
    scoreScale(values, buildGridScale(4, maxPx), "4px grid"),
    scoreScale(values, buildGridScale(8, maxPx), "8px grid")
  ];

  const best = [...candidates].sort((a, b) => {
    if (b.exactMatchRate !== a.exactMatchRate) {
      return b.exactMatchRate - a.exactMatchRate;
    }
    return a.averageDistance - b.averageDistance;
  })[0] ?? null;

  const nonConforming: SpacingNonConformingItem[] = [];
  if (best) {
    const scaleSet = new Set(best.scalePx.map(round));
    for (const v of values) {
      if (scaleSet.has(round(v.px))) continue;
      const { nearest, distance } = nearestDistance(v.px, best.scalePx);
      nonConforming.push({
        utility: v.utility,
        count: v.count,
        px: round(v.px),
        nearestPx: round(nearest),
        distance,
        suggestedReplacement: suggestReplacement(v.prefix, round(nearest))
      });
    }
  }

  nonConforming.sort((a, b) => b.distance - a.distance || b.count - a.count || a.utility.localeCompare(b.utility));

  return {
    totalCount,
    uniqueUtilities,
    ignoredUtilities,
    candidateScores: candidates,
    best,
    nonConforming
  };
}
