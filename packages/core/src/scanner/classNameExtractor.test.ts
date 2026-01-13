import { describe, it, expect } from "vitest";
import { extractClassNameOccurrencesFromCode } from "./classNameExtractor";

describe("classNameExtractor (v1 compatibility)", () => {
  it("extracts static className strings + strings inside clsx/cn patterns", () => {
    const code = `
      import { clsx } from "clsx";
      const cn = (...args: any[]) => args;

      export function A({ active, error }: any) {
        return (
          <div className="text-sm bg-white px-4">
            <button className={'text-gray-900 hover:text-red-500'} />
            <span className={\`rounded-md shadow\`} />

            <div className={clsx(
              "p-2",
              active && "bg-blue-600 text-white",
              error ? "border border-red-500" : "border border-gray-200",
              ["mt-2", active && "opacity-90"],
              { "ring-2 ring-blue-500": active, "shadow-md": true }
            )} />

            <div className={cn("py-2", active && "px-4")} />

            <div className={\`p-4 \${active ? "bg-green-500" : "bg-red-500"}\`} />
          </div>
        );
      }
    `;

    const res = extractClassNameOccurrencesFromCode(code, "/fake/App.tsx");
    const strs = res.map((r) => r.rawClassName);

    // v0 literals
    expect(strs).toContain("text-sm bg-white px-4");
    expect(strs).toContain("text-gray-900 hover:text-red-500");
    expect(strs).toContain("rounded-md shadow");

    // clsx/cn extracted literals
    expect(strs).toContain("p-2");
    expect(strs).toContain("bg-blue-600 text-white");
    expect(strs).toContain("border border-red-500");
    expect(strs).toContain("border border-gray-200");
    expect(strs).toContain("mt-2");
    expect(strs).toContain("opacity-90");
    expect(strs).toContain("ring-2 ring-blue-500");
    expect(strs).toContain("shadow-md");
    expect(strs).toContain("py-2");
    expect(strs).toContain("px-4");

    // template literal with expressions should still be ignored in v1
    expect(strs.some((s) => s.includes("bg-green-500"))).toBe(false);
    expect(strs.some((s) => s.includes("bg-red-500"))).toBe(false);
  });
});