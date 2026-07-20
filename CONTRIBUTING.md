# Contributing

## Prerequisites

- Node.js >= 18
- pnpm

## Setup

```bash
pnpm install
pnpm run build
```

## Tests

```bash
pnpm test
```

## Typecheck

```bash
pnpm typecheck
```

## Before submitting a PR

1. Run `pnpm typecheck` — no errors
2. Run `pnpm test` — all passing
3. Run `pnpm build` — compiles clean

## Releasing

Maintainers publish to npm:

```bash
# bump version in package.json
pnpm run build
npm publish
```
