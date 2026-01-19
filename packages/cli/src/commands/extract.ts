import fs from "node:fs";
import path from "node:path";
import {
  extractFromProject,
  generateReportMarkdown,
  generateReportHtml
} from "@designinator/core";

export async function extract(
  projectPath: string,
  options: { out?: string; format?: string }
) {
  const outDir = options.out ?? "design-system";
  const format = (options.format ?? "html").toLowerCase();

  const absOutDir = path.isAbsolute(outDir)
    ? outDir
    : path.resolve(process.cwd(), outDir);

  fs.mkdirSync(absOutDir, { recursive: true });

  const result = await extractFromProject({
    projectRoot: projectPath,
    includeClassAttr: false
  });

  const tokensFile = path.join(absOutDir, "tokens.json");
  fs.writeFileSync(tokensFile, JSON.stringify(result, null, 2), "utf8");

  if (format === "md" || format === "markdown") {
    const reportFile = path.join(absOutDir, "report.md");
    fs.writeFileSync(reportFile, generateReportMarkdown(result), "utf8");
    console.log(`✅ Wrote ${reportFile}`);
  } else if (format === "html") {
    const reportFile = path.join(absOutDir, "report.html");
    fs.writeFileSync(reportFile, generateReportHtml(result), "utf8");
    console.log(`✅ Wrote ${reportFile}`);
  } else {
    throw new Error(`Unknown format "${options.format}". Use "html" or "md".`);
  }

  console.log(`✅ Wrote ${tokensFile}`);
  console.log(`   Files scanned: ${result.meta.fileCount}`);
  console.log(`   className occurrences: ${result.meta.occurrenceCount}`);
  console.log(`   tokens processed: ${result.tokenCounts.meta.tokenCount}`);
  console.log(`   unique utilities: ${result.tokenCounts.meta.uniqueUtilities}`);
  console.log(`   ${result.arbitraryValues.total} arbitrary values detected`);
}
