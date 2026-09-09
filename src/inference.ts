/**
 * Bounded-inference publisher primitives (v0).
 *
 * What this module does:
 * - Stable request identity: retries of the same operation reuse the same
 *   inference request id; a fresh operation mints a fresh id. Same id +
 *   changed payload is a conflict (enforced gateway-side).
 * - DPoP proof signing (RFC 9449 §4.1) with the publisher's own key via the
 *   maintained `jose` library. Fresh `jti` per HTTP attempt; the request id
 *   stays stable across retries of one operation.
 * - Restricted executor: the executor URL is fixed at construction. There is
 *   deliberately NO per-call destination/URL/header override — publisher
 *   code cannot bypass enforcement through an SDK option.
 * - Explicit error mapping for budget, expiry, conflict, and uncertain
 *   accounting outcomes. Uncertain is surfaced, never zeroed.
 *
 * What this module does NOT do: pick models, set allowances, or resolve
 * credentials. Allowances live in owner-approved grants; the raw access
 * credential is issued gateway-side and held by the publisher app.
 */
import { createHash, randomUUID } from "node:crypto";
import { SignJWT, type JWK } from "jose";

export type BoundedExecutorOptions = {
  /** Fixed inference-service URL (e.g. the gateway execution endpoint). */
  executorUrl: string;
  /** Opaque access credential issued for one approved grant. */
  credential: string;
};

export type DpopSignInput = {
  privateJwk: JWK;
  htm: string;
  htu: string;
};

export type BoundedExecutionBody = {
  /** Stable inference request id for this operation (see requestIdForOperation). */
  requestId: string;
  /** Canonical sha256 of the exact request the grant admitted. */
  canonicalHash: string;
  /** Model-call payload WITHOUT any destination (fixed by the executor). */
  payload: Record<string, unknown>;
};

export type BoundedExecutionResult =
  | { ok: true; receipt: unknown }
  | {
      ok: false;
      code:
        | "BUDGET_EXHAUSTED"
        | "GRANT_NOT_ACTIVE"
        | "CONFLICT"
        | "UNAUTHORIZED"
        | "UPSTREAM_UNCERTAIN"
        | "EXECUTOR_ERROR";
      message: string;
      status: number;
    };

/** Fresh operation identity (e.g. one publisher turn step). */
export function createOperationId(): string {
  return `iop_${randomUUID().replace(/-/g, "")}`;
}

/**
 * Stable request id per (operation, canonical request). Retries reuse it;
 * a changed payload MUST use a new operation (gateway rejects mismatches).
 */
export function requestIdForOperation(operationId: string, canonicalHash: string): string {
  return `ireq_${createHash("sha256").update(`${operationId}:${canonicalHash}`, "utf8").digest("hex").slice(0, 32)}`;
}

/** Sign one DPoP proof. Callers mint a fresh jti per HTTP attempt. */
export async function signDpopProof(input: DpopSignInput & { jti?: string }): Promise<string> {
  return new SignJWT({ htm: input.htm, htu: input.htu, jti: input.jti ?? `jti_${randomUUID().replace(/-/g, "")}` })
    .setProtectedHeader({ typ: "dpop+jwt", alg: "ES256", jwk: publicPart(input.privateJwk) })
    .setIssuedAt()
    .sign(await josePrivateKey(input.privateJwk));
}

function publicPart(jwk: JWK): JWK {
  const { d, ...pub } = jwk as JWK & { d?: unknown };
  void d;
  return pub;
}

async function josePrivateKey(jwk: JWK): Promise<CryptoKey> {
  const { importJWK } = await import("jose");
  return (await importJWK(jwk, "ES256")) as unknown as CryptoKey;
}

export function executorHtu(executorUrl: string): string {
  return executorUrl.split(/[?#]/)[0];
}

export class BoundedExecutor {
  private readonly executorUrl: string;
  private readonly credential: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BoundedExecutorOptions & { fetchImpl?: typeof fetch }) {
    if (!options.executorUrl || !options.credential) {
      throw new Error("executorUrl and credential are required");
    }
    this.executorUrl = executorHtu(options.executorUrl);
    this.credential = options.credential;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /**
   * Execute one admitted operation. Retries of the SAME body reuse
   * body.requestId with a FRESH proof jti per attempt. There is no way to
   * override the destination: it is fixed at construction.
   */
  async execute(input: {
    privateJwk: JWK;
    body: BoundedExecutionBody;
    timeoutMs?: number;
  }): Promise<BoundedExecutionResult> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), input.timeoutMs ?? 110_000);
    try {
      const proof = await signDpopProof({
        privateJwk: input.privateJwk,
        htm: "POST",
        htu: this.executorUrl,
      });
      const res = await this.fetchImpl(this.executorUrl, {
        method: "POST",
        headers: {
          Authorization: `DPoP ${this.credential}`,
          DPoP: proof,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId: input.body.requestId, canonicalHash: input.body.canonicalHash, payload: input.body.payload }),
        signal: ctrl.signal,
      });
      if (res.ok) {
        return { ok: true, receipt: (await res.json().catch(() => null)) as unknown };
      }
      const text = await res.text().catch(() => "");
      const message = text.slice(0, 200);
      if (res.status === 402 || res.status === 429) {
        const code = /budget|allowance|funds|quota/i.test(message) ? "BUDGET_EXHAUSTED" : "EXECUTOR_ERROR";
        return { ok: false, code, message, status: res.status };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, code: "UNAUTHORIZED", message, status: res.status };
      }
      if (res.status === 409) {
        return { ok: false, code: "CONFLICT", message, status: res.status };
      }
      if (res.status === 502 || res.status === 504) {
        return { ok: false, code: "UPSTREAM_UNCERTAIN", message, status: res.status };
      }
      if (res.status === 410) {
        return { ok: false, code: "GRANT_NOT_ACTIVE", message, status: res.status };
      }
      return { ok: false, code: "EXECUTOR_ERROR", message, status: res.status };
    } finally {
      clearTimeout(timer);
    }
  }
}
