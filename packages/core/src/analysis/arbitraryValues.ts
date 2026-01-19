import type { TokenCountsResult } from "./tokenCounts";

export interface ArbitraryValueStats {
  total: number;
  usedOnce: number;
  usedTwice: number;
  replaceable: number;
  items: ArbitraryValueItem[];
}

export interface ArbitraryValueItem {
  utility: string;
  count: number;
  replaceableWith?: string;
}

interface UtilityUsage {
  utility: string;
  count: number;
  domain: string;
  group: string;
}

const SPACING_SCALE_PX: Array<[number, string]> = [
  [0, "0"],
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

const FONT_SIZE_SCALE_PX: Array<[number, string]> = [
  [12, "text-xs"],
  [14, "text-sm"],
  [16, "text-base"],
  [18, "text-lg"],
  [20, "text-xl"],
  [24, "text-2xl"],
  [30, "text-3xl"],
  [36, "text-4xl"],
  [48, "text-5xl"],
  [60, "text-6xl"],
  [72, "text-7xl"],
  [96, "text-8xl"],
  [128, "text-9xl"]
];

const LINE_HEIGHT_SCALE: Array<[number, string]> = [
  [1, "leading-none"],
  [1.25, "leading-tight"],
  [1.375, "leading-snug"],
  [1.5, "leading-normal"],
  [1.625, "leading-relaxed"],
  [2, "leading-loose"]
];

const RADIUS_SCALE_PX: Array<[number, string]> = [
  [0, "rounded-none"],
  [2, "rounded-sm"],
  [4, "rounded"],
  [6, "rounded-md"],
  [8, "rounded-lg"],
  [12, "rounded-xl"],
  [16, "rounded-2xl"],
  [24, "rounded-3xl"],
  [9999, "rounded-full"]
];

function flattenUtilities(result: TokenCountsResult): UtilityUsage[] {
  const items: UtilityUsage[] = [];
  for (const [domain, domainCounts] of Object.entries(result.domains)) {
    for (const [group, groupCounts] of Object.entries(domainCounts.groups)) {
      for (const usage of Object.values(groupCounts.values)) {
        items.push({
          utility: usage.utility,
          count: usage.count,
          domain,
          group
        });
      }
    }
  }
  return items;
}

function isArbitraryUtility(utility: string): boolean {
  if (utility.startsWith("[") && utility.endsWith("]")) return true;
  return /-\[.+\]$/.test(utility);
}

function extractArbitraryValue(utility: string): string | null {
  if (!isArbitraryUtility(utility)) return null;
  if (utility.startsWith("[") && utility.endsWith("]")) {
    return utility.slice(1, -1).trim();
  }
  const idx = utility.lastIndexOf("-[");
  if (idx === -1 || !utility.endsWith("]")) return null;
  return utility.slice(idx + 2, -1).trim();
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

function scaleMatch(value: string, group: string, utility: string): string | null {
  if (!value) return null;

  if (group === "fontSize") {
    const px = parseLengthToPx(value);
    if (px === null) return null;
    const match = FONT_SIZE_SCALE_PX.find(([n]) => n === Math.round(px * 1000) / 1000);
    return match ? match[1] : null;
  }

  if (group === "lineHeight") {
    const n = parseNumber(value);
    if (n === null) return null;
    const match = LINE_HEIGHT_SCALE.find(([val]) => val === Math.round(n * 1000) / 1000);
    return match ? match[1] : null;
  }

  if (group === "radius") {
    const px = parseLengthToPx(value);
    if (px === null) return null;
    const match = RADIUS_SCALE_PX.find(([n]) => n === Math.round(px * 1000) / 1000);
    return match ? match[1] : null;
  }

  if (group === "padding" || group === "margin" || group === "gap" || group === "space") {
    const px = parseLengthToPx(value);
    if (px === null) return null;
    const match = SPACING_SCALE_PX.find(([n]) => n === Math.round(px * 1000) / 1000);
    if (!match) return null;
    const key = match[1];
    const prefixMatch = utility.match(/^(.*)-\[/);
    if (!prefixMatch) return null;
    return `${prefixMatch[1]}-${key}`;
  }

  return null;
}

export function computeArbitraryValueStats(result: TokenCountsResult): ArbitraryValueStats {
  const stats: ArbitraryValueStats = {
    total: 0,
    usedOnce: 0,
    usedTwice: 0,
    replaceable: 0,
    items: []
  };

  const items = flattenUtilities(result);
  for (const item of items) {
    if (!isArbitraryUtility(item.utility)) continue;
    stats.total += 1;
    if (item.count === 1) stats.usedOnce += 1;
    if (item.count === 2) stats.usedTwice += 1;

    const value = extractArbitraryValue(item.utility);
    const replaceableWith = value ? scaleMatch(value, item.group, item.utility) : null;
    if (replaceableWith) stats.replaceable += 1;

    stats.items.push({
      utility: item.utility,
      count: item.count,
      replaceableWith: replaceableWith ?? undefined
    });
  }

  stats.items.sort((a, b) => a.count - b.count || a.utility.localeCompare(b.utility));
  return stats;
}
