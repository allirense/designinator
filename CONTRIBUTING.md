# Contributing to Designinator

Thanks for your interest in contributing to Designinator. Designinator is **pre-1.0** and intentionally scoped: it extracts design-token signals from **React + Tailwind** codebases with a bias toward correctness over guessing.

Small, focused contributions are very welcome.

---

## Ground rules

- Keep changes small and reviewable.
- Add and adjust features and tests alongside any behavior changes.
- If you want to add a larger feature or refactor, please open an issue first so we can align.

---

## Getting set up

### Requirements
- Node.js
- pnpm

### Install
```
bash
pnpm install
pnpm build
```

### Run locally with example
```
pnpm extract ./examples/demo-app -o ./output-demo
```

---

## Running Tests

Core tests live in packages/core.
```
pnpm --filter @designinator/core test
```

---

## What to work on

### Extractor compatibility improvements

- additional patterns for `clsx / classnames / cn`
- safe extraction from common JSX/TSX patterns

### Categorization improvements

- add fixtures in `packages/core/src/fixtures/categorization.fixtures.json`
- update categorization logic and tests

### Report improvements

- readability tweaks
- better sprawl signals
- surface sprawl determination
- improved HTML/markdown parity via the shared report model

---

## Scope and Limitations

Designinator avoids guessing in v0:
- It does not attempt to resolve variables containing class strings
- It does not evaluate runtime conditions
- Counts represent presence in code, not runtime frequency
- Counts are calculated deterministically, not using ML or AI.

If you're proposing a change that increases guessing, please open an issue first to discuss.

---

## Submitting a PR

1. Create a branch
2. Make your change
3. Run:
```
pnpm build
pnpm --filter @designinator/core test
```
4. Open a PR with:
- what you changed
- why you changed it
- any related examples

---

## Filing bugs

When reporting a bug, please include:
- a minimal `className={...}` snippet that fails
- expected behavior vs. actual behavior
- any relevant output (such as `tokens.json` or report section)
