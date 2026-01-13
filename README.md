# ⚡ Behold, The Designinator!

Designinator extracts the *implicit* design system hiding in an existing **React + Tailwind** codebase. It scans your frontend source, counts Tailwind utility classes, and outputs a shareable report so teams can see what tokens they’re already using (and where things have started to sprawl).

This is **pre-1.0** and intentionally scoped. It’s a “mirror,” not an opinionated lint tool.

## What it does

- Scans `.ts` / `.tsx` files in a project directory
- Extracts Tailwind utilities from `className`
  - Supports common class combiners: `clsx`, `classnames`, `classNames`, `cn` (string literals / static branches)
- Categorizes utilities into token domains (color, spacing, typography, radius, shadow, etc.)
- Outputs:
  - `tokens.json` (raw counts)
  - `report.html` (default, minimal styling)
  - `report.md` (optional)

## What it does not do (yet)

- No runtime evaluation (counts reflect **presence in code**, not runtime frequency)
- No CSS generation
- No design tool export (Figma, etc.)
- No component library extraction (planned exploration, but not v0)

## Quick start (local)

> Designinator is currently set up for local usage from this repo.

### Requirements
- Node.js
- pnpm

### Install & build
```bash
pnpm install
pnpm build
```

### Run on the included demo project

```
pnpm extract ./examples/demo-app -o ./output-demo
```

## Usage

### Extract tokens and report

```
pnpm extract <path-to-project> -o <output-dir>
```

Example:
```
pnpm extract ./my-react-app ./my-react-app/designinator-output
```

### Report format

HTML (default):
```
pnpm extract ./my-react-app -o ./my-react-app/designinator-output
```

Markdown:
```
pnpm extract ./my-app -o ./out --format md
```

## Output files

### tokens.json

A structured dump of token counts grouped by domain and group (e.g., color.background, typography.fontSize), including:
- count — number of occurrences
- files — number of unique files where the utility appears

### report.html

A human readable summary that can be opened in the browser. Includes:
- top utilities per group
- basic "sprawl" warnings when there are many unique values

### report.md

A human readable summary in markdown. Includes:
- top utilities per group
- basic "sprawl" warnings when there are many unique values

## Scope Limitations

Designinator currently extracts static class strings from:
- ✅ `className="..."`
- ✅ `className={'...'}`
- ✅ template literals with no expressions
- ✅ `className={clsx(...)} / classnames(...) / cn(...)` (string literals and common patterns)

Designinator intentionally ignores patterns it cannot confidently resolve:
- ❌ variables that contain classes
- ❌ arbitrary string concatenation
- ❌ template literals with expressions (such as `\p-4 ${x}`)

This is a deliberate choice for v0: correctness and clarity over guessing.

## Development

Run tests:
```
pnpm --filter @designinator/core test
```

Build all:
```
pnpm build
```

## Contributing

Small, focused contributions are welcome — especially:
- Extraction compatibility improvements
- New categorization fixtures and tests
- Improvements to report UX

If you're planning a larger feature, please open an issue first to discuss.

## License

MIT
