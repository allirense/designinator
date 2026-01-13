export type Domain =
  | "color"
  | "typography"
  | "spacing"
  | "radius"
  | "shadow"
  | "border"
  | "opacity"
  | "zIndex"
  | "other";

export type Group =
  | "text"
  | "background"
  | "border"
  | "other"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "textTransform"
  | "alignment"
  | "padding"
  | "margin"
  | "gap"
  | "space"
  | "radius"
  | "shadow"
  | "width"
  | "style"
  | "opacity"
  | "zIndex"
  | "layout"
  | "sizing"
  | "effect"
  | "arbitraryProperty";

export interface ParsedToken {
  raw: string;
  prefixes: string[];
  utility: string;
  important: boolean;
  negative: boolean;
}

export interface Category {
  domain: Domain;
  group: Group;
}

const TEXT_SIZE_KEYS = new Set([
  "xs","sm","base","lg","xl",
  "2xl","3xl","4xl","5xl","6xl","7xl","8xl","9xl"
]);

const TEXT_ALIGN_KEYS = new Set(["left", "center", "right", "justify"]);

const FONT_WEIGHT_KEYS = new Set([
  "thin","extralight","light","normal","medium","semibold","bold","extrabold","black"
]);

const TEXT_TRANSFORM_KEYS = new Set(["uppercase","lowercase","capitalize","normal-case"]);

const BORDER_STYLE_KEYS = new Set(["solid","dashed","dotted","double","hidden","none"]);

// Split on ":" but keep bracketed segments intact (best-effort for v0).
function splitVariants(raw: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let bracketDepth = 0;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "[") bracketDepth++;
    if (ch === "]" && bracketDepth > 0) bracketDepth--;

    if (ch === ":" && bracketDepth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.filter(Boolean);
}

export function parseTailwindToken(rawToken: string): ParsedToken {
  let raw = rawToken.trim();
  let important = false;
  let negative = false;

  if (raw.startsWith("!")) {
    important = true;
    raw = raw.slice(1);
  }

  const parts = splitVariants(raw);
    let utility = parts[parts.length - 1] ?? "";

    // Handle important on the utility segment (e.g. md:hover:!bg-blue-700)
    if (utility.startsWith("!")) {
    important = true;
    utility = utility.slice(1);
    }

    // Handle negative after important (e.g. !-mt-2) and also plain -mt-2
    if (utility.startsWith("-")) {
    negative = true;
    utility = utility.slice(1);
    }


  return {
    raw: rawToken,
    prefixes: parts.slice(0, -1),
    utility,
    important,
    negative
  };
}

function isBracketOnlyUtility(u: string) {
  return u.startsWith("[") && u.endsWith("]");
}

// Disambiguate text-* into fontSize vs alignment vs color
function categorizeTextUtility(u: string): Category {
  // alignment: text-left / text-center / ...
  if (u.startsWith("text-")) {
    const tail = u.slice("text-".length);
    if (TEXT_ALIGN_KEYS.has(tail)) return { domain: "typography", group: "alignment" };

    // fontSize: text-sm, text-2xl, text-[13px]
    if (TEXT_SIZE_KEYS.has(tail)) return { domain: "typography", group: "fontSize" };
    if (tail.startsWith("[") && tail.endsWith("]")) {
        const inner = tail.slice(1, -1).trim();

        // Heuristic: treat as font size if it looks like a length or a font-size function.
        // Examples: [13px], [1.125rem], [clamp(...)], [var(--text-size)]
        const looksLikeFontSize =
            /(\d)(px|rem|em|vh|vw|%|ch|ex|pt)$/.test(inner) ||
            inner.startsWith("clamp(") ||
            inner.startsWith("min(") ||
            inner.startsWith("max(") ||
            inner.startsWith("calc(") ||
            inner.startsWith("var(");

        return looksLikeFontSize
            ? { domain: "typography", group: "fontSize" }
            : { domain: "color", group: "text" };
    }

    // otherwise treat as color
    return { domain: "color", group: "text" };
  }

  // fallback (shouldn't happen)
  return { domain: "other", group: "layout" };
}

export function categorizeUtility(utility: string): Category {
  const u = utility;

  // Bracket-only arbitrary properties
  if (isBracketOnlyUtility(u)) return { domain: "other", group: "arbitraryProperty" };

  // Opacity (legacy forms first)
  if (u.startsWith("text-opacity-") || u.startsWith("bg-opacity-") || u.startsWith("opacity-")) {
    return { domain: "opacity", group: "opacity" };
  }

  // Z-index
  if (u.startsWith("z-")) return { domain: "zIndex", group: "zIndex" };

  // Shadow
  if (u === "shadow" || u.startsWith("shadow-")) return { domain: "shadow", group: "shadow" };

  // Radius
  if (u === "rounded" || u.startsWith("rounded-")) return { domain: "radius", group: "radius" };

  // Spacing
  if (/^(p|px|py|pt|pr|pb|pl)-/.test(u) || u === "p-0") return { domain: "spacing", group: "padding" };
  if (/^(m|mx|my|mt|mr|mb|ml)-/.test(u) || u === "m-0") return { domain: "spacing", group: "margin" };
  if (/^(gap|gap-x|gap-y)-/.test(u)) return { domain: "spacing", group: "gap" };
  if (/^(space-x|space-y)-/.test(u)) return { domain: "spacing", group: "space" };

  // Border (width vs style vs color)
  if (u === "border" || /^border-(\d+|0|x|y|t|r|b|l)(-\d+)?$/.test(u)) {
    return { domain: "border", group: "width" };
  }
  if (u.startsWith("border-")) {
    const tail = u.slice("border-".length);
    if (BORDER_STYLE_KEYS.has(tail)) return { domain: "border", group: "style" };

    // If it didn't match width/style, treat as border color
    return { domain: "color", group: "border" };
  }

  // Color — background
  if (u.startsWith("bg-")) return { domain: "color", group: "background" };

  // Color — “other” (ring/outline/fill/stroke)
  if (u.startsWith("ring-") || u.startsWith("outline-") || u.startsWith("fill-") || u.startsWith("stroke-")) {
    // NOTE: ring-2 would be width-ish; v0 keeps it simple. Upgrade later.
    return { domain: "color", group: "other" };
  }

  // Typography
  if (u.startsWith("text-")) return categorizeTextUtility(u);
  if (u.startsWith("font-")) {
    const tail = u.slice("font-".length);
    if (FONT_WEIGHT_KEYS.has(tail)) return { domain: "typography", group: "fontWeight" };
  }
  if (u.startsWith("leading-")) return { domain: "typography", group: "lineHeight" };
  if (u.startsWith("tracking-")) return { domain: "typography", group: "letterSpacing" };
  if (TEXT_TRANSFORM_KEYS.has(u)) return { domain: "typography", group: "textTransform" };

  // “Other” buckets (tracked, not tokenized)
  if (["flex","inline-flex","grid","items-center","justify-between"].includes(u)) return { domain: "other", group: "layout" };
  if (u.startsWith("w-") || u.startsWith("h-") || u.startsWith("min-w-") || u.startsWith("min-h-")) return { domain: "other", group: "sizing" };
  if (u.startsWith("transition") || u.startsWith("duration-") || u.startsWith("ease-") || u.startsWith("animate-")) return { domain: "other", group: "effect" };

  return { domain: "other", group: "layout" };
}
