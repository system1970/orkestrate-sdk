# SDK (`@orkestrate/sdk`)

Publisher SDK for the gateway. Bun only.

Commands (run from here): `bun install`, `bun run build`, `bun run test`.

Primitives (`src/`): `auth` verifies, `protocol` parses, `model` builds the caller BYOM model,
`errors` responds. `handler` is the Next.js wrapper, `cli` the install helper.
Gateway-only: no inbox, no client.

Read `../orkestrate/AGENTS.md` first.
