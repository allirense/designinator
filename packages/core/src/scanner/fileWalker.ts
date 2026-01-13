import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";

export interface FileWalkerOptions {
  extensions?: string[]; // default: ["ts","tsx"]
  ignore?: string[];
}

export async function getSourceFiles(
  projectRoot: string,
  opts: FileWalkerOptions = {}
): Promise<string[]> {
  const absRoot = path.resolve(projectRoot);

  if (!fs.existsSync(absRoot)) {
    throw new Error(`Project root does not exist: ${absRoot}`);
  }

  const exts = opts.extensions ?? ["ts", "tsx"];

  const ignore = opts.ignore ?? [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/build/**",
    "**/out/**",
    "**/.turbo/**",
    "**/.git/**",
    "**/coverage/**",
    "**/storybook/**"
  ];

  const patterns = exts.map((ext) => `**/*.${ext}`);

  const files = await glob(patterns, {
    cwd: absRoot,
    ignore,
    nodir: true,
    absolute: true
  });

  return Array.from(new Set(files)).sort();
}
