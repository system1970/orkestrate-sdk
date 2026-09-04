# @orkestrate/sdk

The official SDK for building Orkestrate publisher agents.

[![npm version](https://img.shields.io/npm/v/@orkestrate/sdk)](https://www.npmjs.com/package/@orkestrate/sdk)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![CI](https://github.com/system1970/orkestrate-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/system1970/orkestrate-sdk/actions/workflows/ci.yml)

---

## What is Orkestrate?

[Orkestrate](https://orkestrate.space) is an AI agent gateway. Coding tools like Cursor, Claude Code, and VS Code connect to it via MCP and discover agents published by companies like yours. Callers bring their own model (BYOM) — you just handle the turn.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://mermaid.ink/svg/c2VxdWVuY2VEaWFncmFtCiAgICBwYXJ0aWNpcGFudCBDb2RlciBhcyBDb2RpbmcgdG9vbCAoQ3Vyc29yLCBldGMuKQogICAgcGFydGljaXBhbnQgR1cgYXMgT3JrZXN0cmF0ZSBHYXRld2F5IChvcmtlc3RyYXRlLnNwYWNlKQogICAgcGFydGljaXBhbnQgQWdlbnQgYXMgWW91ciBQdWJsaXNoZXIgQWdlbnQKICAgIHBhcnRpY2lwYW50IExMTSBhcyBMTE0gKGNhbGxlcidzIEFQSSBrZXkpCgogICAgQ29kZXItPj5HVzogTUNQIHJlcXVlc3QgKEJZT00gY29uZmlnKQogICAgR1ctPj5HVzogQXV0aCwgcm91dGluZywgc2Vzc2lvbiBtYW5hZ2VtZW50CiAgICBHVy0-PkFnZW50OiBQT1NUIC9hcGkvb3JrZXN0cmF0ZSAocHJveHkgdG9rZW4sIG5vIGtleSkKICAgIEFnZW50LT4-QWdlbnQ6IHZlcmlmeVJlcXVlc3QoKSBwYXJzZVJlcXVlc3QoKSBidWlsZE1vZGVsKCkKICAgIEFnZW50LT4-R1c6IFBPU1QgL2FwaS9wcm94eS9sbG0gKHNpZ25lZCB0b2tlbiArIHJlcXVlc3QpCiAgICBHVy0-PkxMTTogZm9yd2FyZCB3aXRoIGNhbGxlcidzIHJlYWwga2V5CiAgICBMTE0tLT4-R1c6IHJlc3BvbnNlCiAgICBHVy0tPj5BZ2VudDogcmVzcG9uc2UKICAgIEFnZW50LS0-PkdXOiB7IHJlcGx5OiAiLi4uIiB9CiAgICBHVy0tPj5Db2RlcjogTUNQIHJlc3BvbnNl?theme=dark">
  <img alt="Orkestrate architecture diagram" src="https://mermaid.ink/svg/c2VxdWVuY2VEaWFncmFtCiAgICBwYXJ0aWNpcGFudCBDb2RlciBhcyBDb2RpbmcgdG9vbCAoQ3Vyc29yLCBldGMuKQogICAgcGFydGljaXBhbnQgR1cgYXMgT3JrZXN0cmF0ZSBHYXRld2F5IChvcmtlc3RyYXRlLnNwYWNlKQogICAgcGFydGljaXBhbnQgQWdlbnQgYXMgWW91ciBQdWJsaXNoZXIgQWdlbnQKICAgIHBhcnRpY2lwYW50IExMTSBhcyBMTE0gKGNhbGxlcidzIEFQSSBrZXkpCgogICAgQ29kZXItPj5HVzogTUNQIHJlcXVlc3QgKEJZT00gY29uZmlnKQogICAgR1ctPj5HVzogQXV0aCwgcm91dGluZywgc2Vzc2lvbiBtYW5hZ2VtZW50CiAgICBHVy0-PkFnZW50OiBQT1NUIC9hcGkvb3JrZXN0cmF0ZSAocHJveHkgdG9rZW4sIG5vIGtleSkKICAgIEFnZW50LT4-QWdlbnQ6IHZlcmlmeVJlcXVlc3QoKSBwYXJzZVJlcXVlc3QoKSBidWlsZE1vZGVsKCkKICAgIEFnZW50LT4-R1c6IFBPU1QgL2FwaS9wcm94eS9sbG0gKHNpZ25lZCB0b2tlbiArIHJlcXVlc3QpCiAgICBHVy0-PkxMTTogZm9yd2FyZCB3aXRoIGNhbGxlcidzIHJlYWwga2V5CiAgICBMTE0tLT4-R1c6IHJlc3BvbnNlCiAgICBHVy0tPj5BZ2VudDogcmVzcG9uc2UKICAgIEFnZW50LS0-PkdXOiB7IHJlcGx5OiAiLi4uIiB9CiAgICBHVy0tPj5Db2RlcjogTUNQIHJlc3BvbnNl">
</picture>

<details>
<summary>Diagram source (Mermaid)</summary>

```mermaid
sequenceDiagram
    participant Coder as Coding tool (Cursor, etc.)
    participant GW as Orkestrate Gateway (orkestrate.space)
    participant Agent as Your Publisher Agent
    participant LLM as LLM (caller's API key)

    Coder->>GW: MCP request (BYOM config)
    GW->>GW: Auth, routing, session management
    GW->>Agent: POST /api/orkestrate (proxy token, no key)
    Agent->>Agent: verifyRequest() parseRequest() buildModel()
    Agent->>GW: POST /api/proxy/llm (signed token + request)
    GW->>LLM: forward with caller's real key
    LLM-->>GW: response
    GW-->>Agent: response
    Agent-->>GW: { reply: "..." }
    GW-->>Coder: MCP response
```

</details>

You deploy a single HTTP endpoint. The gateway handles everything else: caller auth, session management, rate limits, turn tracking. Your job is one function: receive a message, run your agent, return a reply.

## Why use this SDK?

- **Caller's API key never reaches your server.** LLM calls are proxied through the gateway with scoped tokens. No key logging, no exfiltration.
- **No session infrastructure to build.** Gateway mints session ids, enforces TTLs, stores history.
- **One import, any framework.** Primitives for bare-bones handlers, convenience wrapper for AI SDK users.
- **BYOM works out of the box.** OpenAI, Anthropic, Google, or any OpenAI-compatible provider.

## Install

```bash
npm install @orkestrate/sdk ai
# pnpm: pnpm add @orkestrate/sdk ai
# bun:  bun add @orkestrate/sdk ai
```

`ai` (Vercel AI SDK `^7.0.0`) is a peer dependency. `@orkestrate/sdk` gives you `verifyRequest`, `parseRequest`, `buildModel`, `createOrkestrateHandler` and the three provider adapters (`@ai-sdk/openai/anthropic/google`). `ai` gives you `generateText`, `streamText`, `tool` and `LanguageModel` — the thing `buildModel` returns and `generateText` consumes. Keep them as peers so you control the `ai` version and avoid duplicate installs (same reason `ai` itself keeps `zod` as a peer).

If you only use `verifyRequest` + `parseRequest` (no `buildModel`/`createOrkestrateHandler`), you can ignore the `ai` peer warning.

## Quick start

### Primitives (any framework)

```ts
import { verifyRequest, parseRequest, buildModel, respond } from "@orkestrate/sdk";

async function handler(request: Request) {
  await verifyRequest(request, process.env.ORKESTRATE_SECRET!);
  const { action, sessionId, message, modelConfig, messages } =
    await parseRequest(request);

  switch (action) {
    case "ping":
    case "end_session":
      return respond.ok();
    case "start_session":
    case "send_message": {
      const model = buildModel(modelConfig!);
      const reply = await runAgent({ message: message!, model, sessionId, messages: messages! });
      return respond.reply(reply);
    }
  }
}
```

### AI SDK convenience wrapper

```ts
import { createOrkestrateHandler } from "@orkestrate/sdk";
import { generateText } from "ai";

export const { GET, POST } = createOrkestrateHandler({
  secret: process.env.ORKESTRATE_SECRET!,
  async onTurn({ message, model, messages, callerId }) {
    const result = await generateText({ model, messages });
    return { reply: result.text };
  },
});
```

### Complete working example (Next.js)

```ts
// app/api/orkestrate/route.ts  ← must match gateway's path
import { createOrkestrateHandler } from "@orkestrate/sdk";
import { generateText } from "ai";

export const { GET, POST } = createOrkestrateHandler({
  secret: process.env.ORKESTRATE_SECRET!,

  async onTurn({ message, model, messages, callerId }) {
    const { text } = await generateText({
      model,
      messages,
      system: "You are a helpful product agent.",
    });
    return { reply: text };
  },
});
```

Deploy this to Vercel, register your domain at [orkestrate.space](https://orkestrate.space), and you're live. The gateway calls `https://<your-domain>/api/orkestrate`.

### Inbox delivery (push work orders)

Send structured, machine-actionable decisions, questions, and alerts directly into a user's Orkestrate Inbox:

```ts
import { Orkestrate } from "@orkestrate/sdk";

const orkestrate = new Orkestrate({ secret: process.env.ORKESTRATE_SECRET });

await orkestrate.inbox.send({
  to: "user@orkestrate.space",
  from: "billing@yourproduct.com",
  type: "decision",
  title: "Annual subscription renewal due",
  description: "3 inactive seats detected. Trim to save $70/mo.",
  options: [
    { id: "keep", label: "Keep current plan ($199/mo)" },
    { id: "trim", label: "Trim unused seats ($129/mo)", recommended: true }
  ],
  callbackUrl: "https://yourproduct.com/api/orkestrate/webhook"
});
```

## API

### `verifyRequest(request, secret)`

Authenticates the gateway request via `Authorization: Bearer <secret>`.  
Throws `OrkestrateError("UNAUTHORIZED")` on failure. Async — uses Web Crypto
(SHA-256 hash-then-compare), so it runs on Node.js, the Next.js Edge Runtime,
and Cloudflare Workers:

### `parseRequest(request)`

Decodes gateway headers + body into a typed `ParsedRequest`:

| Field | Source | Description |
|-------|--------|-------------|
| `action` | `X-Orkestrate-Action` | `start_session` / `send_message` / `end_session` / `ping` |
| `sessionId` | `X-Orkestrate-Session-Id` | Gateway-minted session id |
| `callerId` | `X-Orkestrate-Caller-Id` | Opaque caller identifier (optional) |
| `modelConfig` | `X-Orkestrate-Model` | Base64url JSON — provider, model, baseURL?, gatewayUrl, token |
| `message` | body | Latest user message text |
| `messages` | body | Full conversation history |

### `buildModel(config)`

Constructs an AI SDK `LanguageModel` from the caller's BYOM config.

Supports: `openai` · `anthropic` · `google` · `custom` (OpenAI-compatible)

### `respond`

| Method | Returns |
|--------|---------|
| `respond.ok(extra?)` | `{ ok: true }` — ping, end_session |
| `respond.reply(text)` | `{ reply: "..." }` — agent response |
| `respond.error(code, message, status?)` | `{ error: { code, message } }` — typed error |

### `createOrkestrateHandler(options)`

Convenience wrapper for AI SDK users. Returns `{ GET, POST }` handlers.

Options: `{ secret, onTurn: (ctx: TurnContext) => TurnResult, onClose?: (ctx: CloseContext) => void }`

## Wire protocol

| Header | When |
|--------|------|
| `Authorization: Bearer <secret>` | all POST requests |
| `X-Orkestrate-Action` | `start_session` / `send_message` / `end_session` / `ping` |
| `X-Orkestrate-Session-Id` | open / send / close |
| `X-Orkestrate-Model` | open / send — base64url JSON |
| `X-Orkestrate-Caller-Id` | optional — opaque caller identity |

## Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Bad or missing `Authorization` |
| `BAD_REQUEST` | 400 | Missing header, invalid body, bad model config |
| `MODEL_ERROR` | 400 | `buildModel` rejected the config |
| `SESSION_NOT_FOUND` | 500 | Session id does not exist |
| `SESSION_EXPIRED` | 500 | Session idle or hard TTL |
| `SESSION_STALE` | 500 | Session data is stale |
| `CONFLICT` | 500 | Concurrent operation on the same session |
| `LIMIT_EXCEEDED` | 500 | Turn or rate limit hit |
| `INTERNAL` | 500 | `onTurn` threw or returned empty reply |

## Limitations

| Limitation | Details |
|------------|---------|
| **No streaming** | V1 is text-turn only. SSE streaming is planned. |
| **`custom` provider** | Assumes OpenAI-compatible `/chat/completions` API. Works with Ollama, vLLM, etc. |
| **Bundle size** | Includes `@ai-sdk/openai`, `@ai-sdk/anthropic`, and `@ai-sdk/google` regardless of which provider you use. |

## What the gateway handles (not in this SDK)

The gateway — not this SDK — manages session storage, conversation history persistence, rate limiting, idle timeout, absolute TTL, concurrent session limits, and caller authentication. You just handle turns.

## Learn more

- [orkestrate.space](https://orkestrate.space) — the gateway
- [Documentation](https://orkestrate.space/docs) — caller & publisher guides

## License

MIT
