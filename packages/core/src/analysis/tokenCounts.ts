import { parseTailwindToken, categorizeUtility, type Category } from "../categorize";
import type { ClassNameOccurrence } from "../scanner/classNameExtractor";

export interface TokenUsage {
  utility: string;   // normalized utility, e.g. "bg-blue-600" (no variants, no "!", no leading "-")
  count: number;     // total occurrences across all files
  files: number;     // number of unique files where it appears
}

export interface TokenGroupCounts {
  total: number; // total class tokens in this group (sum of counts)
  values: Record<string, TokenUsage>; // key = utility
}

export interface TokenDomainCounts {
  total: number; // sum of totals across groups
  groups: Record<string, TokenGroupCounts>; // key = group
}

export interface TokenCountsResult {
  meta: {
    occurrenceCount: number; // number of className occurrences analyzed
    tokenCount: number;      // number of individual class tokens processed
    uniqueUtilities: number;
  };
  domains: Record<string, TokenDomainCounts>; // key = domain
}

/**
 * Split a raw className string into individual tokens.
 * v0: whitespace split only.
 */
export function splitClassName(rawClassName: string): string[] {
  return rawClassName
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ensureDomain(result: TokenCountsResult, domain: string): TokenDomainCounts {
  if (!result.domains[domain]) {
    result.domains[domain] = { total: 0, groups: {} };
  }
  return result.domains[domain]!;
}

function ensureGroup(domainCounts: TokenDomainCounts, group: string): TokenGroupCounts {
  if (!domainCounts.groups[group]) {
    domainCounts.groups[group] = { total: 0, values: {} };
  }
  return domainCounts.groups[group]!;
}

function addUsage(
  groupCounts: TokenGroupCounts,
  utility: string,
  filePath: string
) {
  const existing = groupCounts.values[utility];
  if (!existing) {
    groupCounts.values[utility] = { utility, count: 1, files: 1 };
    // We need to track which files this utility appeared in.
    // Do it via a hidden Set map outside of JSON result (see below).
    return;
  }
  existing.count += 1;
}

/**
 * Compute token usage counts from extracted className occurrences.
 *
 * v0 behavior:
 * - Splits className string by whitespace
 * - Parses variants/important/negative and uses *utility* only
 * - Categorizes by utility
 * - Counts occurrences + file distribution
 */
export function computeTokenCounts(occurrences: ClassNameOccurrence[]): TokenCountsResult {
  const result: TokenCountsResult = {
    meta: {
      occurrenceCount: occurrences.length,
      tokenCount: 0,
      uniqueUtilities: 0
    },
    domains: {}
  };

  // Utility -> Set of file paths it appears in (for `files` counts)
  const utilityFiles = new Map<string, Set<string>>();

  // Utility -> {domain, group} (first-seen). Should be stable with our categorizer.
  const utilityCategory = new Map<string, Category>();

  for (const occ of occurrences) {
    const rawTokens = splitClassName(occ.rawClassName);

    for (const rawToken of rawTokens) {
      result.meta.tokenCount += 1;

      const parsed = parseTailwindToken(rawToken);
      const utility = parsed.utility;

      // skip empties after parsing
      if (!utility) continue;

      const category = categorizeUtility(utility);
      utilityCategory.set(utility, category);

      // Track unique files
      const set = utilityFiles.get(utility) ?? new Set<string>();
      set.add(occ.filePath);
      utilityFiles.set(utility, set);

      const domainCounts = ensureDomain(result, category.domain);
      const groupCounts = ensureGroup(domainCounts, category.group);

      // increment totals
      domainCounts.total += 1;
      groupCounts.total += 1;

      // increment utility counts
      addUsage(groupCounts, utility, occ.filePath);
    }
  }

  // Fill in file counts + uniqueUtilities
  let unique = 0;
  for (const [utility, filesSet] of utilityFiles.entries()) {
    unique += 1;
    const category = utilityCategory.get(utility);
    if (!category) continue;

    const domainCounts = result.domains[category.domain];
    if (!domainCounts) continue;

    const groupCounts = domainCounts.groups[category.group];
    if (!groupCounts) continue;

    const usage = groupCounts.values[utility];
    if (!usage) continue;

    usage.files = filesSet.size;
  }

  result.meta.uniqueUtilities = unique;
  return result;
}

/**
 * Utility: convert the nested counts into a stable, report-friendly sorted view.
 * (Optional, but nice for JSON output so diffs are readable.)
 */
export function sortTokenCounts(result: TokenCountsResult): TokenCountsResult {
  // Deep clone-ish, preserving structure while sorting keys.
  const sorted: TokenCountsResult = {
    meta: result.meta,
    domains: {}
  };

  const domainNames = Object.keys(result.domains).sort();
  for (const domain of domainNames) {
    const d = result.domains[domain]!;
    const groupNames = Object.keys(d.groups).sort();

    const newDomain: TokenDomainCounts = { total: d.total, groups: {} };
    for (const group of groupNames) {
      const g = d.groups[group]!;
      const utilities = Object.values(g.values).sort((a, b) => b.count - a.count || a.utility.localeCompare(b.utility));

      const newGroup: TokenGroupCounts = { total: g.total, values: {} };
      for (const u of utilities) {
        newGroup.values[u.utility] = u;
      }
      newDomain.groups[group] = newGroup;
    }
    sorted.domains[domain] = newDomain;
  }

  return sorted;
}
