import { describe, it, expect } from "vitest";
import { extractClassNameOccurrencesFromCode } from "../scanner/classNameExtractor";
import { computeTokenCounts } from "./tokenCounts";
import { computeArbitraryValueStats } from "./arbitraryValues";

describe("computeArbitraryValueStats", () => {
  it("counts arbitrary utilities and flags replaceable scale matches", () => {
    const code = `
      export function A() {
        return (
          <div className="text-[14px] leading-[1.5] p-[16px] bg-[#1f2937] text-[14px]" />
        );
      }
    `;

    const occ = extractClassNameOccurrencesFromCode(code, "/fake/A.tsx");
    const tokenCounts = computeTokenCounts(occ);
    const stats = computeArbitraryValueStats(tokenCounts);

    expect(stats.total).toBe(4);
    expect(stats.usedOnce).toBe(3);
    expect(stats.usedTwice).toBe(1);
    expect(stats.replaceable).toBe(3);
    expect(stats.items).toHaveLength(4);
    expect(stats.items.find((i) => i.utility === "text-[14px]")?.replaceableWith).toBe("text-sm");
    expect(stats.items.find((i) => i.utility === "leading-[1.5]")?.replaceableWith).toBe("leading-normal");
    expect(stats.items.find((i) => i.utility === "p-[16px]")?.replaceableWith).toBe("p-4");
  });
});
