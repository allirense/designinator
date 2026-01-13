import { describe, it, expect } from "vitest";
import { extractClassNameOccurrencesFromCode } from "../scanner/classNameExtractor";
import { computeTokenCounts } from "./tokenCounts";

describe("computeTokenCounts", () => {
  it("counts utilities by domain/group and tracks file distribution", () => {
    const codeA = `
      export function A() {
        return (
          <div className="text-sm bg-white px-4 border border-gray-200">
            <button className="text-gray-900 hover:text-red-500 px-4 py-1.5 rounded-md" />
          </div>
        );
      }
    `;

    const codeB = `
      export function B() {
        return (
          <div className="text-sm bg-white px-2 border border-gray-200 shadow-md">
            <button className="text-gray-900 px-2 py-1.5 rounded-md" />
          </div>
        );
      }
    `;

    const occA = extractClassNameOccurrencesFromCode(codeA, "/fake/A.tsx");
    const occB = extractClassNameOccurrencesFromCode(codeB, "/fake/B.tsx");

    const result = computeTokenCounts([...occA, ...occB]);

    // sanity
    expect(result.meta.occurrenceCount).toBeGreaterThan(0);
    expect(result.meta.tokenCount).toBeGreaterThan(0);
    expect(result.meta.uniqueUtilities).toBeGreaterThan(0);

    // spot checks: bg-white is color/background and appears in both files
    const bgWhite =
      result.domains["color"]?.groups["background"]?.values["bg-white"];
    expect(bgWhite).toBeTruthy();
    expect(bgWhite?.count).toBe(2);
    expect(bgWhite?.files).toBe(2);

    // text-sm is typography/fontSize and appears in both files
    const textSm =
      result.domains["typography"]?.groups["fontSize"]?.values["text-sm"];
    expect(textSm?.count).toBe(2);
    expect(textSm?.files).toBe(2);

    // border (width) appears in both files
    const borderWidth =
      result.domains["border"]?.groups["width"]?.values["border"];
    expect(borderWidth?.count).toBe(2);
    expect(borderWidth?.files).toBe(2);

    // border-gray-200 is color/border and appears in both files
    const borderColor =
      result.domains["color"]?.groups["border"]?.values["border-gray-200"];
    expect(borderColor?.count).toBe(2);
    expect(borderColor?.files).toBe(2);

    // hover:text-red-500 becomes utility text-red-500 (color/text) only in file A
    const textRed500 =
      result.domains["color"]?.groups["text"]?.values["text-red-500"];
    expect(textRed500?.count).toBe(1);
    expect(textRed500?.files).toBe(1);

    // shadow-md only in file B
    const shadowMd =
      result.domains["shadow"]?.groups["shadow"]?.values["shadow-md"];
    expect(shadowMd?.count).toBe(1);
    expect(shadowMd?.files).toBe(1);
  });
});
