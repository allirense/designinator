import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";

export interface ClassNameOccurrence {
  filePath: string;
  loc?: { line: number; column: number }; // 1-based column
  rawClassName: string;
}

export interface ClassNameExtractorOptions {
  includeClassAttr?: boolean;
  /**
   * Treat these function names as class combiners (clsx, cn, classnames, etc.)
   * Default: ["clsx","classnames","classNames","cn"]
   */
  classCombinerNames?: string[];
}

function getAttrName(attrName: t.JSXIdentifier | t.JSXNamespacedName): string | null {
  if (t.isJSXIdentifier(attrName)) return attrName.name;
  if (t.isJSXNamespacedName(attrName)) return `${attrName.namespace.name}:${attrName.name.name}`;
  return null;
}

function splitVariants(raw: string): string[] {
  // not used here; kept in categorize module
  return raw.split(":");
}

function getStaticStringFromExpression(expr: t.Expression): string | null {
  if (t.isStringLiteral(expr)) return expr.value;

  // Template literal with NO expressions: `foo bar`
  if (t.isTemplateLiteral(expr) && expr.expressions.length === 0) {
    return expr.quasis.map((q) => q.value.cooked ?? "").join("");
  }

  return null;
}

function isCombinerCallee(callee: t.Expression | t.V8IntrinsicIdentifier, names: Set<string>): boolean {
  // clsx(...)
  if (t.isIdentifier(callee)) return names.has(callee.name);

  // utils.cn(...) or something.cn(...)
  if (t.isMemberExpression(callee) && !callee.computed) {
    const prop = callee.property;
    if (t.isIdentifier(prop)) return names.has(prop.name);
  }

  return false;
}

/**
 * Collect any *static class strings* contained in an expression.
 * v1: supports the common patterns used by clsx/classnames/cn.
 */
function collectStaticClassStrings(expr: t.Expression, combinerNames: Set<string>): string[] {
  // "a b"
  if (t.isStringLiteral(expr)) return [expr.value];

  // `a b` (no ${})
  if (t.isTemplateLiteral(expr) && expr.expressions.length === 0) {
    return [expr.quasis.map((q) => q.value.cooked ?? "").join("")];
  }

  // cond ? "a" : "b"
  if (t.isConditionalExpression(expr)) {
    const out: string[] = [];
    out.push(...collectStaticClassStrings(expr.consequent, combinerNames));
    out.push(...collectStaticClassStrings(expr.alternate, combinerNames));
    return out;
  }

  // cond && "a"   OR   cond || "a"
  if (t.isLogicalExpression(expr)) {
    const out: string[] = [];
    out.push(...collectStaticClassStrings(expr.left as t.Expression, combinerNames));
    out.push(...collectStaticClassStrings(expr.right as t.Expression, combinerNames));
    return out;
  }

  // ["a", cond && "b"]
  if (t.isArrayExpression(expr)) {
    const out: string[] = [];
    for (const el of expr.elements) {
      if (!el) continue;
      if (t.isSpreadElement(el)) continue;
      out.push(...collectStaticClassStrings(el as t.Expression, combinerNames));
    }
    return out;
  }

  // { "a": cond, "b c": other } => keys are classes
  if (t.isObjectExpression(expr)) {
    const out: string[] = [];
    for (const prop of expr.properties) {
      if (t.isObjectProperty(prop)) {
        const k = prop.key;
        if (t.isStringLiteral(k)) out.push(k.value);
        else if (t.isIdentifier(k)) out.push(k.name); // less common, but cheap
      }
    }
    return out;
  }

  // clsx("a", cond && "b")
  if (t.isCallExpression(expr) && isCombinerCallee(expr.callee as any, combinerNames)) {
    const out: string[] = [];
    for (const arg of expr.arguments) {
      if (t.isSpreadElement(arg)) continue;
      // arguments are (Expression | JSXNamespacedName) in Babel types, but in practice they’re Expressions
      if (t.isExpression(arg as any)) {
        out.push(...collectStaticClassStrings(arg as t.Expression, combinerNames));
      }
    }
    return out;
  }

  // Anything else: ignore in v1 (variables, binary +, etc.)
  return [];
}

export function extractClassNameOccurrencesFromCode(
  code: string,
  filePath: string,
  opts: ClassNameExtractorOptions = {}
): ClassNameOccurrence[] {
  const occurrences: ClassNameOccurrence[] = [];
  const includeClassAttr = opts.includeClassAttr ?? false;

  const combinerNames = new Set(
    opts.classCombinerNames ?? ["clsx", "classnames", "classNames", "cn"]
  );

  let ast: t.File;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "importMeta",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "decorators-legacy"
      ],
      errorRecovery: true
    });
  } catch {
    return occurrences;
  }

  traverse(ast, {
    JSXAttribute(path: NodePath<t.JSXAttribute>) {
      const name = path.node.name ? getAttrName(path.node.name) : null;
      if (!name) return;

      const isTarget =
        name === "className" || (includeClassAttr && name === "class");

      if (!isTarget) return;

      const valueNode = path.node.value;
      if (!valueNode) return;

      const loc = path.node.loc
        ? { line: path.node.loc.start.line, column: path.node.loc.start.column + 1 }
        : undefined;

      // className="..."
      if (t.isStringLiteral(valueNode)) {
        const rawClassName = valueNode.value.trim();
        if (!rawClassName) return;
        occurrences.push({ filePath, loc, rawClassName });
        return;
      }

      // className={...}
      if (t.isJSXExpressionContainer(valueNode)) {
        const expr = valueNode.expression;
        if (t.isJSXEmptyExpression(expr)) return;

        // v0 static string / static template
        if (t.isExpression(expr)) {
          const direct = getStaticStringFromExpression(expr);
          if (direct && direct.trim()) {
            occurrences.push({ filePath, loc, rawClassName: direct });
            return;
          }

          // v1: extract strings inside clsx/classnames/cn and common patterns
          const strings = collectStaticClassStrings(expr, combinerNames)
            .map((s) => s.trim())
            .filter(Boolean);

          // Push each extracted string as its own occurrence.
          // This is intentional: it keeps counting simple and errs on the side of inclusion.
          for (const s of strings) {
            occurrences.push({ filePath, loc, rawClassName: s });
          }
        }
      }
    }
  });

  return occurrences;
}