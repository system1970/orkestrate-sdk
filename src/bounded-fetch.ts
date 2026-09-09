/**
 * Bounded model-call transport (v0): a fetch implementation for AI SDK
 * provider clients that routes every model HTTP call through the fixed
 * gateway executor as a separately admitted execution.
 *
 * - Destination is fixed at construction (`executorUrl`). The incoming
 *   request URL is IGNORED, so publisher code cannot redirect calls.
 * - Each fetch call mints a FRESH inference request id and a FRESH DPoP
 *   proof jti. Disable provider-level retries (e.g. `maxRetries: 0`):
 *   a retried HTTP call is a new execution, never an idempotent replay.
 * - Bodies pass through untouched; the executor allowlists and enforces
 *   model/tools/bounds server-side against the approved grant.
 */
import { SignJWT, type JWK } from "jose";
import { randomUUID } from "node:crypto";

function mintRequestId(): string {
  return `ireq_${randomUUID().replace(/-/g, "")}`;
}

export type BoundedFetchOptions = {
  executorUrl: string;
  credential: string;
  privateJwk: JWK;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function executorHtu(executorUrl: string): string {
  return executorUrl.split(/[?#]/)[0];
}

export function createBoundedFetch(options: BoundedFetchOptions): typeof fetch {
  if (!options.executorUrl || !options.credential || !options.privateJwk) {
    throw new Error("executorUrl, credential, and privateJwk are required");
  }
  const url = executorHtu(options.executorUrl);
  const inner = options.fetchImpl ?? fetch;
  return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const body = await request.text();
    // Fresh inference request id per fetch call: the executor keys admission
    // idempotency on it, so retries MUST be disabled provider-side
    // (maxRetries: 0) — a retried call is a new execution, never a replay.
    const requestId = mintRequestId();
    const proof = await new SignJWT({ htm: request.method, htu: url, jti: requestId })
      .setProtectedHeader({ typ: "dpop+jwt", alg: "ES256", jwk: publicPart(options.privateJwk) })
      .setIssuedAt()
      .sign(await importPrivateKey(options.privateJwk));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), options.timeoutMs ?? 110_000);
    try {
      return await inner(url, {
        method: "POST",
        headers: {
          Authorization: `DPoP ${options.credential}`,
          DPoP: proof,
          "Content-Type": "application/json",
          "X-Orkestrate-Request-Id": requestId,
        },
        body: body || undefined,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }) as typeof fetch;
}

function publicPart(jwk: JWK): JWK {
  const { d, ...pub } = jwk as JWK & { d?: unknown };
  void d;
  return pub;
}

async function importPrivateKey(jwk: JWK): Promise<CryptoKey> {
  const { importJWK } = await import("jose");
  return (await importJWK(jwk, "ES256")) as unknown as CryptoKey;
}
