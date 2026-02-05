import { describe, it, expect } from "vitest";
import { extractClassNameOccurrencesFromCode } from "../scanner/classNameExtractor";
import { computeTokenCounts } from "./tokenCounts";
import { computeSpacingScaleReport } from "./spacingScale";

describe("computeSpacingScaleReport", () => {
  it("picks the best-fitting scale and reports non-conforming utilities", () => {
    const code = `
      export function A() {
        return (
          <div className="p-4 m-5 gap-6 space-x-2 p-[1.125rem]" />
        );
      }
    `;

    const occ = extractClassNameOccurrencesFromCode(code, "/fake/A.tsx");
    const tokenCounts = computeTokenCounts(occ);
    const report = computeSpacingScaleReport(tokenCounts);

    expect(report.totalCount).toBe(5);
    expect(report.uniqueUtilities).toBe(5);
    expect(report.ignoredUtilities).toBe(0);
    expect(report.best?.name).toBe("4px grid");

    expect(report.nonConforming).toHaveLength(1);
    const item = report.nonConforming[0];
    expect(item.utility).toBe("p-[1.125rem]");
    expect(item.px).toBe(18);
    expect(item.nearestPx).toBe(16);
    expect(item.distance).toBe(2);
    expect(item.suggestedReplacement).toBe("p-4");
  });

  it("ignores non-numeric spacing utilities", () => {
    const code = `
      export function B() {
        return (
          <div className="m-auto text-sm" />
        );
      }
    `;

    const occ = extractClassNameOccurrencesFromCode(code, "/fake/B.tsx");
    const tokenCounts = computeTokenCounts(occ);
    const report = computeSpacingScaleReport(tokenCounts);

    expect(report.totalCount).toBe(0);
    expect(report.uniqueUtilities).toBe(0);
    expect(report.ignoredUtilities).toBe(1);
    expect(report.best).toBeNull();
    expect(report.nonConforming).toHaveLength(0);
  });
});
