#!/usr/bin/env node

import { Command } from "commander";
import { extract } from "./commands/extract";

const program = new Command();

program
  .name("designinator")
  .description("Extract design tokens and component candidates from React + Tailwind codebases")
  .version("0.0.1");

program
  .command("extract")
  .argument("[path]", "Path to project root", ".")
  .option("-o, --out <dir>", "Output directory", "design-system")
  .option("-f, --format <format>", "Report format: html | md", "html")
  .action((p: string, opts: { out?: string; format?: string }) => {
    extract(p, opts).catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
  });

program.parse();
