import { describe, it, expect } from "vitest";
import fixtures from "./fixtures/categorization.fixtures.json";
import { parseTailwindToken, categorizeUtility } from "./categorize";

type Fixture = {
  raw: string;
  utility: string;
  domain: string;
  group: string;
};

describe("categorization fixtures", () => {
  it("parses variants/important/negative correctly and categorizes utility", () => {
    for (const f of fixtures as Fixture[]) {
      const parsed = parseTailwindToken(f.raw);

      // utility should match fixture expectation
      expect(parsed.utility).toBe(f.utility);

      const category = categorizeUtility(parsed.utility);
      expect({ domain: category.domain, group: category.group }, `raw=${f.raw} utility=${parsed.utility}`).toEqual({ domain: f.domain, group: f.group });
    }
  });

  it("disambiguates text-* correctly", () => {
    expect(categorizeUtility("text-gray-900")).toEqual({ domain: "color", group: "text" });
    expect(categorizeUtility("text-sm")).toEqual({ domain: "typography", group: "fontSize" });
    expect(categorizeUtility("text-center")).toEqual({ domain: "typography", group: "alignment" });
  });

  it("treats border-* widths vs colors correctly", () => {
    expect(categorizeUtility("border-2")).toEqual({ domain: "border", group: "width" });
    expect(categorizeUtility("border-gray-200")).toEqual({ domain: "color", group: "border" });
    expect(categorizeUtility("border-dashed")).toEqual({ domain: "border", group: "style" });
  });

  it("marks negatives in parsing (example)", () => {
    const parsed = parseTailwindToken("-mt-2");
    expect(parsed.negative).toBe(true);
    expect(parsed.utility).toBe("mt-2");
  });

  it("keeps prefixes (example)", () => {
    const parsed = parseTailwindToken("md:hover:!bg-blue-700");
    expect(parsed.prefixes).toEqual(["md", "hover"]);
    expect(parsed.important).toBe(true);
    expect(parsed.utility).toBe("bg-blue-700");
  });
});
