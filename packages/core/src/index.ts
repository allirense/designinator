export interface ExtractOptions {
  projectPath: string;
  outDir: string;
}

export async function extractDesignSystem(opts: ExtractOptions) {
  return {
    meta: {
      projectPath: opts.projectPath,
      outDir: opts.outDir,
      extractedAt: new Date().toISOString(),
    },
    tokens: {},
    components: [],
  };
}

export * from "./categorize";
export * from "./extractFromProject";
export * from "./analysis/tokenCounts";
export * from "./analysis/arbitraryValues";
export * from "./analysis/spacingScale";
export * from "./scanner/classNameExtractor";
export * from "./output/reportModel"
export * from "./output/reportMarkdown";
export * from "./output/reportHtml";
