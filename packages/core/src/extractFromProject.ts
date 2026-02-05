import path from "node:path";
import { getSourceFiles } from "./scanner/fileWalker";
import { readTextFile } from "./scanner/readFile";
import { extractClassNameOccurrencesFromCode, type ClassNameOccurrence } from "./scanner/classNameExtractor";
import { computeTokenCounts, sortTokenCounts, type TokenCountsResult } from "./analysis/tokenCounts";
import { computeArbitraryValueStats, type ArbitraryValueStats } from "./analysis/arbitraryValues";
import { computeSpacingScaleReport, type SpacingScaleReport } from "./analysis/spacingScale";

export interface ExtractProjectOptions {
  projectRoot: string;
  includeClassAttr?: boolean;
  maxFiles?: number; // safety valve for huge repos; optional
}

export interface ExtractProjectResult {
  meta: {
    projectRoot: string;
    extractedAt: string;
    fileCount: number;
    occurrenceCount: number;
  };
  tokenCounts: TokenCountsResult;
  arbitraryValues: ArbitraryValueStats;
  spacingScale: SpacingScaleReport;
}

export async function extractFromProject(opts: ExtractProjectOptions): Promise<ExtractProjectResult> {
  const projectRoot = path.resolve(opts.projectRoot);
  const files = await getSourceFiles(projectRoot);

  const limitedFiles = typeof opts.maxFiles === "number"
    ? files.slice(0, opts.maxFiles)
    : files;

  const occurrences: ClassNameOccurrence[] = [];

  for (const filePath of limitedFiles) {
    const code = await readTextFile(filePath);
    if (!code) continue;

    const occ = extractClassNameOccurrencesFromCode(code, filePath, {
      includeClassAttr: opts.includeClassAttr ?? false
    });

    occurrences.push(...occ);
  }

  const tokenCounts = sortTokenCounts(computeTokenCounts(occurrences));
  const arbitraryValues = computeArbitraryValueStats(tokenCounts);
  const spacingScale = computeSpacingScaleReport(tokenCounts);

  return {
    meta: {
      projectRoot,
      extractedAt: new Date().toISOString(),
      fileCount: limitedFiles.length,
      occurrenceCount: occurrences.length
    },
    tokenCounts,
    arbitraryValues,
    spacingScale
  };
}
